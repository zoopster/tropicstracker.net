<?php
/**
 * TropicsTracker.net Unified API Proxy
 * Adaptive proxy that works in both development and production
 * Combines features from all previous versions with environment detection
 */

// Environment Detection
$is_development = (
    in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', 'localhost:8000', '127.0.0.1:8000']) ||
    preg_match('/\.local$/', $_SERVER['HTTP_HOST'] ?? '') ||
    getenv('APP_ENV') === 'development' ||
    getenv('DEBUG') === 'true'
);

// Environment-specific error reporting
if ($is_development) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/php_errors.log');
}

// Configuration based on environment
$CONFIG = [
    'cors_origins' => $is_development ? ['*'] : [
        'https://tropicstracker.net',
        'https://www.tropicstracker.net',
        getenv('CORS_ORIGIN') ?: 'https://tropicstracker.net'
    ],
    'rate_limit_enabled' => !$is_development,
    'rate_limit_requests' => 60,
    'rate_limit_window' => 60,
    'input_validation_strict' => !$is_development,
    'security_headers_full' => !$is_development,
    'debug_logging' => $is_development,
    'cache_enabled' => true,
    'cache_expiry' => 300
];

// CORS Configuration
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($CONFIG['cors_origins'][0] === '*') {
    header('Access-Control-Allow-Origin: *');
} elseif (in_array($origin, $CONFIG['cors_origins'])) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: null');
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Security Headers (environment-dependent)
if ($CONFIG['security_headers_full']) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

header('Content-Type: application/json; charset=utf-8');
header('X-Environment: ' . ($is_development ? 'development' : 'production'));

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Method validation
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondWithError('Method not allowed', 405);
}

// Directory setup
$CACHE_DIR = __DIR__ . '/cache/';
$LOG_DIR = __DIR__ . '/logs/';

createDirectories($CACHE_DIR, $LOG_DIR);

// Input validation and sanitization
$endpoint = validateEndpoint($_GET['endpoint'] ?? '');
$params = validateParams($_GET, $CONFIG['input_validation_strict']);

// Rate limiting (production only)
if ($CONFIG['rate_limit_enabled']) {
    if (!checkRateLimit($_SERVER['REMOTE_ADDR'], $CONFIG['rate_limit_requests'], $CONFIG['rate_limit_window'])) {
        respondWithError('Rate limit exceeded', 429, [
            'retry_after' => $CONFIG['rate_limit_window'],
            'limit' => $CONFIG['rate_limit_requests']
        ]);
    }
}

// API endpoints
$API_ENDPOINTS = [
    'nhc-storms' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'nhc-sample' => 'https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json',
    'nws-alerts' => 'https://api.weather.gov/alerts/active',
    'hurdat2' => 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.txt',
    'weatherapi' => 'https://api.weatherapi.com/v1/current.json',
    // Weather imagery endpoints
    'goes-satellite' => 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR',
    'nexrad-radar' => 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer',
    'wind-data' => 'https://earth.nullschool.net/api/v1/winds/current',
    'pressure-data' => 'https://earth.nullschool.net/api/v1/pressure/current',
    'sea-temp-data' => 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.png'
];

// Cache handling
$cache_key = generateCacheKey($endpoint, $params);
$cache_file = $CACHE_DIR . $cache_key . '.json';

if ($CONFIG['cache_enabled'] && file_exists($cache_file) && 
    (time() - filemtime($cache_file)) < $CONFIG['cache_expiry']) {
    header('X-Cache: HIT');
    header('X-Cache-Age: ' . (time() - filemtime($cache_file)));
    echo file_get_contents($cache_file);
    exit;
}

header('X-Cache: MISS');

// Build API URL or get metadata for weather imagery
$api_url_or_data = buildApiUrl($endpoint, $params, $API_ENDPOINTS);

// Check if weather imagery endpoint returned metadata directly
if (is_array($api_url_or_data)) {
    // Weather imagery endpoints return metadata directly
    $processed_response = $api_url_or_data;
} else {
    // Standard endpoints return URL for API request
    $response_data = makeApiRequest($api_url_or_data, $endpoint, $is_development);
    $processed_response = processResponse($endpoint, $response_data);
}

// Cache response
if ($CONFIG['cache_enabled']) {
    cacheResponse($cache_file, $processed_response);
}

// Return response
echo json_encode($processed_response);

// Periodic cleanup
if (rand(1, 100) === 1) {
    cleanupFiles($CACHE_DIR, $CONFIG['cache_expiry'] * 2);
}

/**
 * Validate endpoint
 */
function validateEndpoint($endpoint) {
    $valid_endpoints = [
        'nhc-storms', 'nhc-sample', 'nws-alerts', 'hurdat2', 'weatherapi',
        'goes-satellite', 'nexrad-radar', 'wind-data', 'pressure-data', 'sea-temp-data'
    ];
    
    if (!is_string($endpoint) || empty($endpoint)) {
        respondWithError('Missing endpoint parameter', 400);
    }
    
    if (!in_array($endpoint, $valid_endpoints)) {
        logSecurityEvent('Invalid endpoint attempted: ' . $endpoint);
        respondWithError('Invalid endpoint', 400);
    }
    
    return $endpoint;
}

/**
 * Validate and sanitize parameters
 */
function validateParams($get_params, $strict = false) {
    $allowed_params = ['q', 'area', 'year', 'bounds', 'zoom', 'timestamp'];
    $validated = [];
    
    foreach ($get_params as $key => $value) {
        if ($key === 'endpoint') continue;
        
        if ($strict && !in_array($key, $allowed_params)) {
            continue;
        }
        
        // Sanitize value
        $value = filter_var($value, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_HIGH);
        $value = substr($value, 0, 100);
        
        if (!empty($value)) {
            $validated[$key] = $value;
        }
    }
    
    return $validated;
}

/**
 * Rate limiting check
 */
function checkRateLimit($ip, $limit, $window) {
    global $CACHE_DIR;
    
    $rate_file = $CACHE_DIR . 'rate_' . hash('sha256', $ip) . '.json';
    $now = time();
    
    if (!file_exists($rate_file)) {
        $rate_data = ['timestamp' => $now, 'count' => 1];
        file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);
        return true;
    }
    
    $rate_data = json_decode(file_get_contents($rate_file), true);
    
    if (!$rate_data || !isset($rate_data['timestamp'], $rate_data['count'])) {
        $rate_data = ['timestamp' => $now, 'count' => 1];
    } else {
        if ($now - $rate_data['timestamp'] >= $window) {
            $rate_data = ['timestamp' => $now, 'count' => 1];
        } else {
            $rate_data['count']++;
            if ($rate_data['count'] > $limit) {
                logSecurityEvent('Rate limit exceeded for IP: ' . $ip);
                return false;
            }
        }
    }
    
    file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);
    return true;
}

/**
 * Build API URL with parameters
 */
function buildApiUrl($endpoint, $params, $endpoints) {
    $api_url = $endpoints[$endpoint];
    
    if ($endpoint === 'weatherapi' && !empty($params['q'])) {
        $weather_api_key = getenv('WEATHERAPI_KEY');
        if (!$weather_api_key || $weather_api_key === 'your_weatherapi_key_here') {
            if (isset($GLOBALS['is_development']) && $GLOBALS['is_development']) {
                debugLog('WeatherAPI key not configured - using demo data');
                return null; // Will trigger fallback data
            }
            logError('Missing WeatherAPI key');
            return null;
        }
        $api_url .= '?key=' . urlencode($weather_api_key) . '&q=' . urlencode($params['q']);
    }
    
    if ($endpoint === 'nws-alerts' && !empty($params['area'])) {
        $api_url .= '?area=' . urlencode($params['area']);
    }
    
    // Handle weather imagery endpoints - return metadata instead of making HTTP requests
    if (in_array($endpoint, ['goes-satellite', 'nexrad-radar'])) {
        return buildWeatherImageryResponse($endpoint, $params, $api_url);
    }
    
    if (in_array($endpoint, ['wind-data', 'pressure-data', 'sea-temp-data'])) {
        return buildWeatherDataResponse($endpoint, $params, $api_url);
    }
    
    return $api_url;
}

/**
 * Make API request with proper headers
 */
function makeApiRequest($url, $endpoint, $debug = false) {
    if (!$url) {
        return null; // Triggers fallback data
    }
    
    $ch = curl_init();
    
    $options = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'TropicsTracker.net/1.0',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_MAXREDIRS => 3
    ];
    
    // Set endpoint-specific headers
    switch ($endpoint) {
        case 'nws-alerts':
            $options[CURLOPT_HTTPHEADER] = [
                'User-Agent: TropicsTracker.net/1.0 (admin@tropicstracker.net)',
                'Accept: application/geo+json,application/json'
            ];
            break;
        case 'weatherapi':
            $options[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
            break;
    }
    
    curl_setopt_array($ch, $options);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        if ($debug) {
            debugLog("cURL Error for $endpoint: $error");
        } else {
            logError("cURL Error for $endpoint: $error");
        }
        return null;
    }
    
    if ($http_code !== 200) {
        if ($debug) {
            debugLog("API Error - Status: $http_code, Endpoint: $endpoint, URL: $url");
        } else {
            logError("API Error - Status: $http_code, Endpoint: $endpoint");
        }
        return null;
    }
    
    return $response;
}

/**
 * Process API response based on endpoint
 */
function processResponse($endpoint, $response) {
    if (!$response) {
        return getFallbackData($endpoint);
    }
    
    try {
        switch ($endpoint) {
            case 'nhc-storms':
            case 'nhc-sample':
                return processNHCStorms($response);
            case 'nws-alerts':
                return processNWSAlerts($response);
            case 'weatherapi':
                return processWeatherAPI($response);
            case 'hurdat2':
                return processHurdatData($response);
            default:
                $decoded = json_decode($response, true);
                return $decoded ?: getFallbackData($endpoint);
        }
    } catch (Exception $e) {
        logError("Processing error for $endpoint: " . $e->getMessage());
        return getFallbackData($endpoint);
    }
}

/**
 * Process NHC storm data
 */
function processNHCStorms($response) {
    $data = json_decode($response, true);
    if (!$data) return getFallbackData('nhc-storms');
    
    $storms = $data['activeStorms'] ?? $data['storms'] ?? [];
    $normalized_storms = [];
    
    foreach ($storms as $storm) {
        $normalized_storms[] = [
            'id' => sanitizeString($storm['id'] ?? 'storm-' . time()),
            'name' => sanitizeString($storm['name'] ?? 'Unknown Storm'),
            'basin' => determineBasin($storm['lat'] ?? 25, $storm['lon'] ?? -75),
            'classification' => classifyStorm($storm['windSpeed'] ?? 0),
            'windSpeed' => (int)($storm['windSpeed'] ?? 0),
            'pressure' => (int)($storm['pressure'] ?? 1013),
            'coordinates' => [
                (float)($storm['lat'] ?? 25),
                (float)($storm['lon'] ?? -75)
            ],
            'movement' => [
                'speed' => (float)($storm['movementSpeed'] ?? 0),
                'direction' => sanitizeString($storm['movementDirection'] ?? 'N')
            ],
            'lastUpdate' => sanitizeString($storm['lastUpdate'] ?? date('c')),
            'forecastTrack' => $storm['forecastTrack'] ?? []
        ];
    }
    
    return ['storms' => $normalized_storms];
}

/**
 * Process NWS alerts
 */
function processNWSAlerts($response) {
    $data = json_decode($response, true);
    if (!$data || !isset($data['features'])) {
        return getFallbackData('nws-alerts');
    }
    
    $alerts = [];
    foreach ($data['features'] as $feature) {
        $props = $feature['properties'];
        $alerts[] = [
            'id' => sanitizeString($props['id'] ?? 'alert-' . time()),
            'title' => sanitizeString($props['event'] ?? 'Weather Alert'),
            'description' => sanitizeString($props['description'] ?? 'No description available'),
            'severity' => sanitizeString($props['severity'] ?? 'Unknown'),
            'urgency' => sanitizeString($props['urgency'] ?? 'Unknown'),
            'areas' => sanitizeString($props['areaDesc'] ?? 'Unknown Area'),
            'issued' => sanitizeString($props['sent'] ?? date('c')),
            'expires' => sanitizeString($props['expires'] ?? date('c', strtotime('+1 day')))
        ];
    }
    
    return ['alerts' => $alerts];
}

/**
 * Process WeatherAPI response
 */
function processWeatherAPI($response) {
    $data = json_decode($response, true);
    return $data ?: getFallbackData('weatherapi');
}

/**
 * Process HURDAT2 data (simplified for performance)
 */
function processHurdatData($response) {
    $lines = explode("\n", $response);
    $storms = [];
    $current_storm = null;
    $line_count = 0;
    
    foreach ($lines as $line) {
        if (++$line_count > 1000) break; // Limit for performance
        
        $line = trim($line);
        if (empty($line)) continue;
        
        $parts = array_map('trim', explode(',', $line));
        
        if (count($parts) >= 3 && preg_match('/^[A-Z]{2}\d{6}$/', $parts[0])) {
            if ($current_storm) $storms[] = $current_storm;
            $current_storm = [
                'id' => $parts[0],
                'name' => $parts[1],
                'entries' => intval($parts[2]),
                'track' => []
            ];
        } elseif ($current_storm && count($parts) >= 7) {
            $current_storm['track'][] = [
                'date' => $parts[0],
                'time' => $parts[1],
                'lat' => floatval($parts[3]),
                'lon' => floatval($parts[4]),
                'windSpeed' => intval($parts[5]),
                'pressure' => intval($parts[6])
            ];
        }
    }
    
    if ($current_storm) $storms[] = $current_storm;
    return ['storms' => $storms];
}

/**
 * Utility functions
 */
function sanitizeString($value) {
    return htmlspecialchars(strip_tags((string)$value), ENT_QUOTES, 'UTF-8');
}

function classifyStorm($windSpeed) {
    $windSpeed = (int)$windSpeed;
    if ($windSpeed < 39) return ['code' => 'TD', 'name' => 'Tropical Depression', 'color' => '#64748b'];
    if ($windSpeed < 74) return ['code' => 'TS', 'name' => 'Tropical Storm', 'color' => '#06b6d4'];
    if ($windSpeed < 96) return ['code' => 'CAT1', 'name' => 'Category 1', 'color' => '#fbbf24'];
    if ($windSpeed < 111) return ['code' => 'CAT2', 'name' => 'Category 2', 'color' => '#f97316'];
    if ($windSpeed < 130) return ['code' => 'CAT3', 'name' => 'Category 3', 'color' => '#ef4444'];
    if ($windSpeed < 157) return ['code' => 'CAT4', 'name' => 'Category 4', 'color' => '#dc2626'];
    return ['code' => 'CAT5', 'name' => 'Category 5', 'color' => '#7c2d12'];
}

function determineBasin($lat, $lon) {
    $lat = (float)$lat; $lon = (float)$lon;
    if ($lat > 0 && $lat < 60 && $lon > -100 && $lon < 0) return 'atlantic';
    if ($lat > 0 && $lat < 60 && $lon > -180 && $lon < -80) return 'epac';
    if ($lat > -5 && $lat < 50 && $lon > 100 && $lon < 180) return 'wpac';
    return 'atlantic';
}

function getFallbackData($endpoint) {
    switch ($endpoint) {
        case 'nhc-storms':
        case 'nhc-sample':
            return [
                'storms' => [
                    [
                        'id' => 'demo-storm-1',
                        'name' => 'Demo Hurricane Alpha',
                        'basin' => 'atlantic',
                        'classification' => ['code' => 'CAT2', 'name' => 'Category 2', 'color' => '#f97316'],
                        'windSpeed' => 105,
                        'pressure' => 970,
                        'coordinates' => [25.0, -75.0],
                        'movement' => ['speed' => 15, 'direction' => 'NW'],
                        'lastUpdate' => date('c'),
                        'forecastTrack' => [[25.0, -75.0], [26.0, -76.0]]
                    ]
                ]
            ];
        case 'nws-alerts':
            return [
                'alerts' => [
                    [
                        'id' => 'demo-alert-1',
                        'title' => 'System Operating Normally',
                        'description' => 'No active weather alerts at this time. System functioning properly.',
                        'severity' => 'Minor',
                        'urgency' => 'Future',
                        'areas' => 'All Areas',
                        'issued' => date('c'),
                        'expires' => date('c', time() + 86400)
                    ]
                ]
            ];
        case 'goes-satellite':
            return buildWeatherImageryFallback('goes-satellite');
        case 'nexrad-radar':
            return buildWeatherImageryFallback('nexrad-radar');
        case 'wind-data':
            return buildWeatherDataFallback('wind-data');
        case 'pressure-data':
            return buildWeatherDataFallback('pressure-data');
        case 'sea-temp-data':
            return buildWeatherDataFallback('sea-temp-data');
        default:
            return ['error' => 'Service temporarily unavailable'];
    }
}

function generateCacheKey($endpoint, $params) {
    return hash('sha256', $endpoint . serialize($params));
}

function createDirectories($cache_dir, $log_dir) {
    foreach ([$cache_dir, $log_dir] as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
            file_put_contents($dir . '.htaccess', "Order Allow,Deny\nDeny from all\n");
        }
    }
}

function cacheResponse($cache_file, $data) {
    $temp_file = $cache_file . '.tmp';
    if (file_put_contents($temp_file, json_encode($data), LOCK_EX)) {
        rename($temp_file, $cache_file);
    }
}

function cleanupFiles($dir, $max_age) {
    $files = glob($dir . '*.json');
    foreach ($files as $file) {
        if (time() - filemtime($file) > $max_age) {
            unlink($file);
        }
    }
}

function logError($message) {
    $log_file = __DIR__ . '/logs/api_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    file_put_contents($log_file, "[$timestamp] [$ip] $message\n", FILE_APPEND | LOCK_EX);
}

function logSecurityEvent($message) {
    $log_file = __DIR__ . '/logs/security.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    file_put_contents($log_file, "[$timestamp] [SECURITY] $message - IP: $ip - UA: $ua\n", FILE_APPEND | LOCK_EX);
}

function debugLog($message) {
    global $CONFIG;
    if ($CONFIG['debug_logging']) {
        $log_file = __DIR__ . '/logs/debug.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($log_file, "[$timestamp] [DEBUG] $message\n", FILE_APPEND | LOCK_EX);
    }
}

function respondWithError($message, $code = 400, $extra = []) {
    global $is_development;
    
    http_response_code($code);
    $response = ['error' => $message, 'code' => $code];
    
    if ($is_development) {
        $response['debug'] = [
            'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];
    }
    
    if (!empty($extra)) {
        $response = array_merge($response, $extra);
    }
    
    echo json_encode($response);
    exit;
}

/**
 * Build weather imagery response for tile services
 */
function buildWeatherImageryResponse($endpoint, $params, $base_url) {
    $timestamp = date('c');
    
    switch ($endpoint) {
        case 'goes-satellite':
            return [
                'type' => 'tile',
                'tileUrl' => $base_url . '/{z}/{x}/{y}.jpg',
                'attribution' => 'NOAA GOES-16/18 Satellite',
                'opacity' => 0.7,
                'bounds' => parseBounds($params['bounds'] ?? ''),
                'timestamp' => $timestamp,
                'maxZoom' => 10,
                'minZoom' => 3
            ];
        case 'nexrad-radar':
            return [
                'type' => 'tile',
                'tileUrl' => $base_url . '/tile/{z}/{y}/{x}',
                'attribution' => 'NOAA NEXRAD Radar',
                'opacity' => 0.6,
                'bounds' => parseBounds($params['bounds'] ?? ''),
                'timestamp' => $timestamp,
                'maxZoom' => 12,
                'minZoom' => 3,
                'colorMap' => getRadarColorMap()
            ];
        default:
            return ['error' => 'Unknown imagery endpoint'];
    }
}

/**
 * Build weather data response for vector/analysis data
 */
function buildWeatherDataResponse($endpoint, $params, $base_url) {
    $timestamp = date('c');
    
    switch ($endpoint) {
        case 'wind-data':
            return [
                'type' => 'vector',
                'vectorUrl' => $base_url,
                'attribution' => 'earth.nullschool.net Wind Data',
                'opacity' => 0.8,
                'bounds' => parseBounds($params['bounds'] ?? ''),
                'timestamp' => $timestamp,
                'windScale' => getWindScale(),
                'particleCount' => 5000
            ];
        case 'pressure-data':
            return [
                'type' => 'contour',
                'contourUrl' => $base_url,
                'attribution' => 'earth.nullschool.net Pressure Data',
                'opacity' => 0.5,
                'bounds' => parseBounds($params['bounds'] ?? ''),
                'timestamp' => $timestamp,
                'contourLines' => getPressureContours(),
                'colorMap' => getPressureColorMap()
            ];
        case 'sea-temp-data':
            return [
                'type' => 'heatmap',
                'heatmapUrl' => $base_url,
                'attribution' => 'NOAA Sea Surface Temperature',
                'opacity' => 0.6,
                'bounds' => parseBounds($params['bounds'] ?? ''),
                'timestamp' => $timestamp,
                'temperatureScale' => getSeaTempScale(),
                'colorMap' => getSeaTempColorMap()
            ];
        default:
            return ['error' => 'Unknown weather data endpoint'];
    }
}

/**
 * Build fallback responses for weather imagery
 */
function buildWeatherImageryFallback($endpoint) {
    $timestamp = date('c');
    
    switch ($endpoint) {
        case 'goes-satellite':
            return [
                'type' => 'tile',
                'tileUrl' => 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/GEOCOLOR/{z}/{x}/{y}.jpg',
                'attribution' => 'NOAA GOES-16 Satellite (Fallback)',
                'opacity' => 0.7,
                'bounds' => [[-90, -180], [90, 180]],
                'timestamp' => $timestamp,
                'maxZoom' => 10,
                'minZoom' => 3
            ];
        case 'nexrad-radar':
            return [
                'type' => 'tile',
                'tileUrl' => 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/tile/{z}/{y}/{x}',
                'attribution' => 'NOAA NEXRAD Radar (Fallback)',
                'opacity' => 0.6,
                'bounds' => [[-90, -180], [90, 180]],
                'timestamp' => $timestamp,
                'maxZoom' => 12,
                'minZoom' => 3,
                'colorMap' => getRadarColorMap()
            ];
        default:
            return ['error' => 'Unknown imagery endpoint'];
    }
}

/**
 * Build fallback responses for weather data
 */
function buildWeatherDataFallback($endpoint) {
    $timestamp = date('c');
    
    switch ($endpoint) {
        case 'wind-data':
            return [
                'type' => 'vector',
                'vectorUrl' => 'https://earth.nullschool.net/api/v1/winds/current',
                'attribution' => 'earth.nullschool.net Wind Data (Fallback)',
                'opacity' => 0.8,
                'bounds' => [[-90, -180], [90, 180]],
                'timestamp' => $timestamp,
                'windScale' => getWindScale(),
                'particleCount' => 3000
            ];
        case 'pressure-data':
            return [
                'type' => 'contour',
                'contourUrl' => 'https://earth.nullschool.net/api/v1/pressure/current',
                'attribution' => 'earth.nullschool.net Pressure Data (Fallback)',
                'opacity' => 0.5,
                'bounds' => [[-90, -180], [90, 180]],
                'timestamp' => $timestamp,
                'contourLines' => getPressureContours(),
                'colorMap' => getPressureColorMap()
            ];
        case 'sea-temp-data':
            return [
                'type' => 'heatmap',
                'heatmapUrl' => 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.png',
                'attribution' => 'NOAA Sea Surface Temperature (Fallback)',
                'opacity' => 0.6,
                'bounds' => [[-90, -180], [90, 180]],
                'timestamp' => $timestamp,
                'temperatureScale' => getSeaTempScale(),
                'colorMap' => getSeaTempColorMap()
            ];
        default:
            return ['error' => 'Unknown weather data endpoint'];
    }
}

/**
 * Parse bounds parameter
 */
function parseBounds($boundsString) {
    if (empty($boundsString)) {
        return [[-90, -180], [90, 180]]; // Global bounds
    }
    
    $coords = explode(',', $boundsString);
    if (count($coords) === 4) {
        return [
            [floatval($coords[0]), floatval($coords[1])], // SW corner
            [floatval($coords[2]), floatval($coords[3])]  // NE corner
        ];
    }
    
    return [[-90, -180], [90, 180]]; // Default to global
}

/**
 * Weather overlay color maps and scales
 */
function getRadarColorMap() {
    return [
        0 => '#00000000',    // Transparent (no precipitation)
        5 => '#00ff0080',    // Light green (light rain)
        10 => '#00ff0080',   // Green (light rain)
        15 => '#ffff0080',   // Yellow (moderate rain)
        20 => '#ff800080',   // Orange (heavy rain)
        25 => '#ff000080',   // Red (very heavy rain)
        30 => '#ff00ff80',   // Magenta (extreme rain)
        35 => '#ffffff80'    // White (hail/snow)
    ];
}

function getWindScale() {
    return [
        'min' => 0,
        'max' => 200,
        'colors' => [
            '#3288bd',  // Light blue (0-25 mph)
            '#99d594',  // Light green (25-50 mph)
            '#e6f598',  // Yellow-green (50-75 mph)
            '#fee08b',  // Yellow (75-100 mph)
            '#fc8d59',  // Orange (100-125 mph)
            '#d53e4f'   // Red (125+ mph)
        ]
    ];
}

function getPressureContours() {
    return [
        'interval' => 4,  // 4 mb intervals
        'minValue' => 960,
        'maxValue' => 1040,
        'colors' => [
            'low' => '#ff0000',    // Red for low pressure
            'normal' => '#00ff00', // Green for normal pressure
            'high' => '#0000ff'    // Blue for high pressure
        ]
    ];
}

function getPressureColorMap() {
    return [
        960 => '#800080',  // Purple (extreme low)
        980 => '#ff0000',  // Red (low)
        1000 => '#ffff00', // Yellow (normal low)
        1013 => '#00ff00', // Green (sea level)
        1020 => '#00ffff', // Cyan (normal high)
        1030 => '#0000ff', // Blue (high)
        1040 => '#000080'  // Navy (extreme high)
    ];
}

function getSeaTempScale() {
    return [
        'min' => -2,   // Celsius
        'max' => 35,   // Celsius
        'units' => 'C',
        'colors' => [
            '#000080',  // Navy (freezing)
            '#0000ff',  // Blue (cold)
            '#00ffff',  // Cyan (cool)
            '#00ff00',  // Green (moderate)
            '#ffff00',  // Yellow (warm)
            '#ff8000',  // Orange (hot)
            '#ff0000'   // Red (very hot)
        ]
    ];
}

function getSeaTempColorMap() {
    return [
        '-2' => '#000080',  // Navy (freezing)
        '5' => '#0000ff',   // Blue (cold)
        '10' => '#00ffff',  // Cyan (cool)
        '15' => '#00ff00',  // Green (moderate)
        '20' => '#ffff00',  // Yellow (warm)
        '25' => '#ff8000',  // Orange (hot)
        '30' => '#ff0000',  // Red (very hot)
        '35' => '#800000'   // Maroon (extreme)
    ];
}
?>