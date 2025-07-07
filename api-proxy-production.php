<?php
/**
 * TropicsTracker.net API Proxy - Production Version
 * Handles API requests to avoid CORS issues and provides caching
 * Optimized for production deployment
 */

// Production error reporting (log errors, don't display)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Set JSON response header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuration
$CACHE_DIR = __DIR__ . '/cache/';
$CACHE_EXPIRY = 300; // 5 minutes in seconds
$LOG_DIR = __DIR__ . '/logs/';

// Create directories if they don't exist
if (!is_dir($CACHE_DIR)) {
    mkdir($CACHE_DIR, 0755, true);
}
if (!is_dir($LOG_DIR)) {
    mkdir($LOG_DIR, 0755, true);
}

// API endpoints configuration
$API_ENDPOINTS = [
    'nhc-storms' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'nhc-sample' => 'https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json',
    'nws-alerts' => 'https://api.weather.gov/alerts/active',
    'hurdat2' => 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.txt',
    'weatherapi' => 'https://api.weatherapi.com/v1/current.json'
];

// Rate limiting (simple implementation)
$RATE_LIMIT = 60; // requests per minute per IP
$rate_limit_file = $CACHE_DIR . 'rate_limit_' . md5($_SERVER['REMOTE_ADDR']) . '.json';

if (file_exists($rate_limit_file)) {
    $rate_data = json_decode(file_get_contents($rate_limit_file), true);
    if (time() - $rate_data['timestamp'] < 60) {
        if ($rate_data['count'] >= $RATE_LIMIT) {
            http_response_code(429);
            echo json_encode(['error' => 'Rate limit exceeded']);
            exit;
        }
        $rate_data['count']++;
    } else {
        $rate_data = ['timestamp' => time(), 'count' => 1];
    }
} else {
    $rate_data = ['timestamp' => time(), 'count' => 1];
}
file_put_contents($rate_limit_file, json_encode($rate_data));

// Get request parameters
$endpoint = $_GET['endpoint'] ?? '';
$params = $_GET;
unset($params['endpoint']);

// Validate endpoint
if (!isset($API_ENDPOINTS[$endpoint])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint']);
    logError("Invalid endpoint requested: $endpoint from IP: " . $_SERVER['REMOTE_ADDR']);
    exit;
}

// Generate cache key
$cache_key = md5($endpoint . serialize($params));
$cache_file = $CACHE_DIR . $cache_key . '.json';

// Check cache first
if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $CACHE_EXPIRY) {
    // Set cache hit header
    header('X-Cache: HIT');
    echo file_get_contents($cache_file);
    exit;
}

// Set cache miss header
header('X-Cache: MISS');

// Build API URL
$api_url = $API_ENDPOINTS[$endpoint];

// Add parameters for specific endpoints
if ($endpoint === 'weatherapi' && !empty($params['q'])) {
    $weather_api_key = getenv('WEATHERAPI_KEY') ?: 'your_weatherapi_key_here';
    $api_url .= '?key=' . $weather_api_key . '&q=' . urlencode($params['q']);
}

if ($endpoint === 'nws-alerts' && !empty($params['area'])) {
    $api_url .= '?area=' . urlencode($params['area']);
}

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'TropicsTracker.net/1.0');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

// Set headers for specific APIs
if ($endpoint === 'weatherapi') {
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
} elseif ($endpoint === 'nws-alerts') {
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: TropicsTracker.net/1.0 (admin@tropicstracker.net)',
        'Accept: application/geo+json,application/json'
    ]);
}

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Handle errors
if ($error) {
    logError("cURL Error for $endpoint: $error");
    echo json_encode(getFallbackData($endpoint));
    exit;
}

if ($http_code !== 200) {
    logError("API Error - Status: $http_code, URL: $api_url");
    
    // Return fallback data for failed requests
    echo json_encode(getFallbackData($endpoint));
    exit;
}

// Process response based on endpoint
try {
    $processed_response = processResponse($endpoint, $response);
    
    // Cache the processed response
    file_put_contents($cache_file, json_encode($processed_response));
    
    // Return response
    echo json_encode($processed_response);
} catch (Exception $e) {
    logError("Processing Error for $endpoint: " . $e->getMessage());
    echo json_encode(getFallbackData($endpoint));
}

/**
 * Process API response based on endpoint type
 */
function processResponse($endpoint, $response) {
    switch ($endpoint) {
        case 'nhc-storms':
        case 'nhc-sample':
            return processNHCStorms($response);
        
        case 'nws-alerts':
            return processNWSAlerts($response);
            
        case 'hurdat2':
            return processHurdatData($response);
            
        case 'weatherapi':
            return processWeatherAPI($response);
            
        default:
            $decoded = json_decode($response, true);
            return $decoded !== null ? $decoded : ['raw' => $response];
    }
}

/**
 * Process NHC storm data
 */
function processNHCStorms($response) {
    $data = json_decode($response, true);
    
    if (!$data) {
        return getFallbackData('nhc-storms');
    }
    
    if (isset($data['activeStorms'])) {
        $storms = $data['activeStorms'];
    } elseif (isset($data['storms'])) {
        $storms = $data['storms'];
    } else {
        return getFallbackData('nhc-storms');
    }
    
    $normalized_storms = [];
    foreach ($storms as $storm) {
        $normalized_storms[] = [
            'id' => $storm['id'] ?? 'storm-' . time(),
            'name' => $storm['name'] ?? 'Unknown Storm',
            'basin' => determineBasin($storm['lat'] ?? 25, $storm['lon'] ?? -75),
            'classification' => classifyStorm($storm['windSpeed'] ?? 0),
            'windSpeed' => $storm['windSpeed'] ?? 0,
            'pressure' => $storm['pressure'] ?? 1013,
            'coordinates' => [
                $storm['lat'] ?? 25,
                $storm['lon'] ?? -75
            ],
            'movement' => [
                'speed' => $storm['movementSpeed'] ?? 0,
                'direction' => $storm['movementDirection'] ?? 'N'
            ],
            'lastUpdate' => $storm['lastUpdate'] ?? date('c'),
            'forecastTrack' => $storm['forecastTrack'] ?? []
        ];
    }
    
    return ['storms' => $normalized_storms];
}

/**
 * Process NWS alerts data
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
            'id' => $props['id'] ?? 'alert-' . time(),
            'title' => $props['event'] ?? 'Weather Alert',
            'description' => $props['description'] ?? 'No description available',
            'severity' => $props['severity'] ?? 'Unknown',
            'urgency' => $props['urgency'] ?? 'Unknown',
            'areas' => $props['areaDesc'] ?? 'Unknown Area',
            'issued' => $props['sent'] ?? date('c'),
            'expires' => $props['expires'] ?? date('c', strtotime('+1 day'))
        ];
    }
    
    return ['alerts' => $alerts];
}

/**
 * Process HURDAT2 data
 */
function processHurdatData($response) {
    $lines = explode("\n", $response);
    $storms = [];
    $current_storm = null;
    $count = 0;
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || ++$count > 1000) break; // Limit processing for performance
        
        $parts = array_map('trim', explode(',', $line));
        
        if (count($parts) >= 3 && preg_match('/^[A-Z]{2}\d{6}$/', $parts[0])) {
            if ($current_storm) {
                $storms[] = $current_storm;
            }
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
                'status' => $parts[2],
                'lat' => floatval($parts[3]),
                'lon' => floatval($parts[4]),
                'windSpeed' => intval($parts[5]),
                'pressure' => intval($parts[6])
            ];
        }
    }
    
    if ($current_storm) {
        $storms[] = $current_storm;
    }
    
    return ['storms' => $storms];
}

/**
 * Process WeatherAPI data
 */
function processWeatherAPI($response) {
    $data = json_decode($response, true);
    return $data ?: getFallbackData('weatherapi');
}

/**
 * Get fallback data for endpoints
 */
function getFallbackData($endpoint) {
    switch ($endpoint) {
        case 'nhc-storms':
        case 'nhc-sample':
            return [
                'storms' => [
                    [
                        'id' => 'demo-al092023',
                        'name' => 'Hurricane Demo Alpha',
                        'basin' => 'atlantic',
                        'classification' => ['code' => 'CAT3', 'name' => 'Category 3', 'color' => '#ef4444'],
                        'windSpeed' => 125,
                        'pressure' => 958,
                        'coordinates' => [25.4, -76.2],
                        'movement' => ['speed' => 12, 'direction' => 'NNW'],
                        'lastUpdate' => date('c'),
                        'forecastTrack' => [[25.4, -76.2], [26.1, -76.8]]
                    ]
                ]
            ];
            
        case 'nws-alerts':
            return [
                'alerts' => [
                    [
                        'id' => 'demo-alert-1',
                        'title' => 'System Status - Normal Operations',
                        'description' => 'All systems operating normally. No active weather alerts at this time.',
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

/**
 * Helper functions
 */
function classifyStorm($windSpeed) {
    if ($windSpeed < 39) return ['code' => 'TD', 'name' => 'Tropical Depression', 'color' => '#64748b'];
    if ($windSpeed < 74) return ['code' => 'TS', 'name' => 'Tropical Storm', 'color' => '#06b6d4'];
    if ($windSpeed < 96) return ['code' => 'CAT1', 'name' => 'Category 1', 'color' => '#fbbf24'];
    if ($windSpeed < 111) return ['code' => 'CAT2', 'name' => 'Category 2', 'color' => '#f97316'];
    if ($windSpeed < 130) return ['code' => 'CAT3', 'name' => 'Category 3', 'color' => '#ef4444'];
    if ($windSpeed < 157) return ['code' => 'CAT4', 'name' => 'Category 4', 'color' => '#dc2626'];
    return ['code' => 'CAT5', 'name' => 'Category 5', 'color' => '#7c2d12'];
}

function determineBasin($lat, $lon) {
    if ($lat > 0 && $lat < 60 && $lon > -100 && $lon < 0) return 'atlantic';
    if ($lat > 0 && $lat < 60 && $lon > -180 && $lon < -80) return 'epac';
    if ($lat > -5 && $lat < 50 && $lon > 100 && $lon < 180) return 'wpac';
    if ($lat > 0 && $lat < 35 && $lon > 40 && $lon < 100) return 'nio';
    if ($lat > -50 && $lat < 0 && $lon > 20 && $lon < 115) return 'sio';
    if ($lat > -50 && $lat < 0 && $lon > 135 && $lon < -120) return 'spc';
    return 'atlantic';
}

function logError($message) {
    $log_file = __DIR__ . '/logs/api_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    file_put_contents($log_file, "[$timestamp] [$ip] $message\n", FILE_APPEND | LOCK_EX);
}

// Clean up old cache files periodically (1% chance)
if (rand(1, 100) === 1) {
    $files = glob($CACHE_DIR . '*.json');
    foreach ($files as $file) {
        if (time() - filemtime($file) > $CACHE_EXPIRY * 2) {
            unlink($file);
        }
    }
}
?>