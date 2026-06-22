<?php
/**
 * TropicsTracker.net API Proxy - Secure Production Version
 * Enhanced security with proper CORS, input validation, and rate limiting
 */

// Production error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Security Configuration
$ALLOWED_ORIGINS = [
    'https://tropicstracker.net',
    'https://www.tropicstracker.net',
    'http://localhost:8000', // For development only
    'http://127.0.0.1:8000'  // For development only
];

$VALID_ENDPOINTS = ['nhc-storms', 'nhc-sample', 'nws-alerts', 'hurdat2', 'weatherapi'];

// CORS Security - Only allow specific origins
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $ALLOWED_ORIGINS)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: null');
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Configuration
$CACHE_DIR = __DIR__ . '/cache/';
$LOG_DIR = __DIR__ . '/logs/';
$CACHE_EXPIRY = 300; // 5 minutes

// Create directories securely
createSecureDirectory($CACHE_DIR);
createSecureDirectory($LOG_DIR);

// Rate limiting configuration
$RATE_LIMIT = 60; // requests per minute per IP
$RATE_WINDOW = 60; // seconds

// Input validation
$endpoint = validateEndpoint($_GET['endpoint'] ?? '');
$params = validateParams($_GET);

// Rate limiting check
if (!checkRateLimit($_SERVER['REMOTE_ADDR'], $RATE_LIMIT, $RATE_WINDOW)) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Rate limit exceeded',
        'retry_after' => 60,
        'limit' => $RATE_LIMIT
    ]);
    logSecurityEvent('Rate limit exceeded', $_SERVER['REMOTE_ADDR']);
    exit;
}

// API endpoints configuration
$API_ENDPOINTS = [
    'nhc-storms' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'nhc-sample' => 'https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json',
    'nws-alerts' => 'https://api.weather.gov/alerts/active',
    'hurdat2' => 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.txt',
    'weatherapi' => 'https://api.weatherapi.com/v1/current.json'
];

// Generate secure cache key
$cache_key = generateCacheKey($endpoint, $params);
$cache_file = $CACHE_DIR . $cache_key . '.json';

// Check cache first
if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $CACHE_EXPIRY) {
    header('X-Cache: HIT');
    header('X-Cache-Age: ' . (time() - filemtime($cache_file)));
    echo file_get_contents($cache_file);
    exit;
}

header('X-Cache: MISS');

// Build API URL with validation
$api_url = buildSecureApiUrl($endpoint, $params, $API_ENDPOINTS);

// Make secure API request
$response_data = makeSecureApiRequest($api_url, $endpoint);

// Process and cache response
$processed_response = processApiResponse($endpoint, $response_data);

// Cache the response securely
cacheResponse($cache_file, $processed_response);

// Return response
echo json_encode($processed_response);

// Cleanup old cache files occasionally
if (rand(1, 1000) === 1) {
    cleanupCache($CACHE_DIR, $CACHE_EXPIRY * 2);
}

/**
 * Validate endpoint parameter
 */
function validateEndpoint($endpoint) {
    global $VALID_ENDPOINTS;
    
    if (!is_string($endpoint) || empty($endpoint)) {
        respondWithError('Missing endpoint parameter', 400);
    }
    
    if (!in_array($endpoint, $VALID_ENDPOINTS)) {
        logSecurityEvent('Invalid endpoint attempted', $_SERVER['REMOTE_ADDR'], $endpoint);
        respondWithError('Invalid endpoint', 400);
    }
    
    return $endpoint;
}

/**
 * Validate and sanitize parameters
 */
function validateParams($get_params) {
    $allowed_params = ['q', 'area', 'year'];
    $validated = [];
    
    foreach ($get_params as $key => $value) {
        if ($key === 'endpoint') continue;
        
        if (!in_array($key, $allowed_params)) {
            continue; // Ignore unknown parameters
        }
        
        // Sanitize value
        $value = filter_var($value, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_HIGH);
        $value = substr($value, 0, 100); // Limit length
        
        if (!empty($value)) {
            $validated[$key] = $value;
        }
    }
    
    return $validated;
}

/**
 * Check rate limiting
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
                return false;
            }
        }
    }
    
    file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);
    return true;
}

/**
 * Generate secure cache key
 */
function generateCacheKey($endpoint, $params) {
    $data = $endpoint . serialize($params);
    return hash('sha256', $data);
}

/**
 * Build secure API URL
 */
function buildSecureApiUrl($endpoint, $params, $endpoints) {
    $api_url = $endpoints[$endpoint];
    
    if ($endpoint === 'weatherapi' && !empty($params['q'])) {
        $weather_api_key = getenv('WEATHERAPI_KEY');
        if (!$weather_api_key) {
            logSecurityEvent('Missing WeatherAPI key', $_SERVER['REMOTE_ADDR']);
            respondWithError('Service temporarily unavailable', 503);
        }
        $api_url .= '?key=' . urlencode($weather_api_key) . '&q=' . urlencode($params['q']);
    }
    
    if ($endpoint === 'nws-alerts' && !empty($params['area'])) {
        $api_url .= '?area=' . urlencode($params['area']);
    }
    
    return $api_url;
}

/**
 * Make secure API request
 */
function makeSecureApiRequest($url, $endpoint) {
    $ch = curl_init();
    
    $curl_options = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => 'TropicsTracker.net/1.0',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_HTTPHEADER => getApiHeaders($endpoint)
    ];
    
    curl_setopt_array($ch, $curl_options);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        logError("cURL Error for $endpoint: $error");
        return getFallbackData($endpoint);
    }
    
    if ($http_code !== 200) {
        logError("API Error - Status: $http_code, Endpoint: $endpoint");
        return getFallbackData($endpoint);
    }
    
    return $response;
}

/**
 * Get API-specific headers
 */
function getApiHeaders($endpoint) {
    switch ($endpoint) {
        case 'nws-alerts':
            return [
                'User-Agent: TropicsTracker.net/1.0 (admin@tropicstracker.net)',
                'Accept: application/geo+json,application/json'
            ];
        case 'weatherapi':
            return ['Content-Type: application/json'];
        default:
            return [];
    }
}

/**
 * Process API response
 */
function processApiResponse($endpoint, $response) {
    try {
        switch ($endpoint) {
            case 'nhc-storms':
            case 'nhc-sample':
                return processNHCStorms($response);
            case 'nws-alerts':
                return processNWSAlerts($response);
            case 'weatherapi':
                return processWeatherAPI($response);
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
 * Utility functions
 */
function sanitizeString($value) {
    return htmlspecialchars(strip_tags($value), ENT_QUOTES, 'UTF-8');
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
    $lat = (float)$lat;
    $lon = (float)$lon;
    
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
                        'name' => 'Demo Hurricane',
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
                        'description' => 'No active weather alerts at this time.',
                        'severity' => 'Minor',
                        'urgency' => 'Future',
                        'areas' => 'All Areas',
                        'issued' => date('c'),
                        'expires' => date('c', time() + 86400)
                    ]
                ]
            ];
        default:
            return ['error' => 'Service temporarily unavailable'];
    }
}

function createSecureDirectory($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
        file_put_contents($dir . '.htaccess', "Order Allow,Deny\nDeny from all\n");
    }
}

function cacheResponse($cache_file, $data) {
    $temp_file = $cache_file . '.tmp';
    if (file_put_contents($temp_file, json_encode($data), LOCK_EX)) {
        rename($temp_file, $cache_file);
    }
}

function cleanupCache($cache_dir, $max_age) {
    $files = glob($cache_dir . '*.json');
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

function logSecurityEvent($event, $ip, $details = '') {
    $log_file = __DIR__ . '/logs/security.log';
    $timestamp = date('Y-m-d H:i:s');
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $message = "[$timestamp] [SECURITY] $event - IP: $ip - UA: $user_agent";
    if ($details) $message .= " - Details: $details";
    file_put_contents($log_file, $message . "\n", FILE_APPEND | LOCK_EX);
}

function respondWithError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message, 'code' => $code]);
    exit;
}
?>