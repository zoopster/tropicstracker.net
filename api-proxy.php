<?php
/**
 * TropicsTracker.net API Proxy
 * Handles API requests to avoid CORS issues and provides caching
 */

// Set JSON response header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuration
$CACHE_DIR = __DIR__ . '/cache/';
$CACHE_EXPIRY = 300; // 5 minutes in seconds

// Create cache directory if it doesn't exist
if (!is_dir($CACHE_DIR)) {
    mkdir($CACHE_DIR, 0755, true);
}

// API endpoints configuration
$API_ENDPOINTS = [
    'nhc-storms' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'nhc-sample' => 'https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json',
    'nws-alerts' => 'https://api.weather.gov/alerts/active',
    'hurdat2' => 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.txt',
    'weatherapi' => 'http://api.weatherapi.com/v1/current.json'
];

// Get request parameters
$endpoint = $_GET['endpoint'] ?? '';
$params = $_GET;
unset($params['endpoint']);

// Validate endpoint
if (!isset($API_ENDPOINTS[$endpoint])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit;
}

// Generate cache key
$cache_key = md5($endpoint . serialize($params));
$cache_file = $CACHE_DIR . $cache_key . '.json';

// Check cache first
if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $CACHE_EXPIRY) {
    echo file_get_contents($cache_file);
    exit;
}

// Build API URL
$api_url = $API_ENDPOINTS[$endpoint];

// Add parameters for specific endpoints
if ($endpoint === 'weatherapi' && !empty($params['q'])) {
    $api_url .= '?key=7217af5f54dd4dd1a40204557250607&q=' . urlencode($params['q']);
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
curl_setopt($ch, CURLOPT_USERAGENT, 'TropicsTracker.net/1.0');

// Set headers for specific APIs
if ($endpoint === 'weatherapi') {
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
}

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Handle errors
if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Request failed: ' . $error]);
    exit;
}

if ($http_code !== 200) {
    http_response_code($http_code);
    echo json_encode(['error' => 'API returned status: ' . $http_code]);
    exit;
}

// Process response based on endpoint
$processed_response = processResponse($endpoint, $response);

// Cache the processed response
file_put_contents($cache_file, json_encode($processed_response));

// Return response
echo json_encode($processed_response);

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
            // Try to decode as JSON, fallback to raw response
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
        return ['error' => 'Invalid JSON response'];
    }
    
    // Handle different possible data structures
    if (isset($data['activeStorms'])) {
        $storms = $data['activeStorms'];
    } elseif (isset($data['storms'])) {
        $storms = $data['storms'];
    } else {
        // Return demo data if no active storms
        return getDemoStormData();
    }
    
    // Normalize storm data
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
        return getDemoAlerts();
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
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        $parts = array_map('trim', explode(',', $line));
        
        // Header line for new storm
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
            // Data line
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
    
    if (!$data) {
        return ['error' => 'Invalid JSON response'];
    }
    
    return $data;
}

/**
 * Classify storm based on wind speed
 */
function classifyStorm($windSpeed) {
    if ($windSpeed < 39) {
        return ['code' => 'TD', 'name' => 'Tropical Depression', 'color' => '#64748b'];
    } elseif ($windSpeed < 74) {
        return ['code' => 'TS', 'name' => 'Tropical Storm', 'color' => '#06b6d4'];
    } elseif ($windSpeed < 96) {
        return ['code' => 'CAT1', 'name' => 'Category 1', 'color' => '#fbbf24'];
    } elseif ($windSpeed < 111) {
        return ['code' => 'CAT2', 'name' => 'Category 2', 'color' => '#f97316'];
    } elseif ($windSpeed < 130) {
        return ['code' => 'CAT3', 'name' => 'Category 3', 'color' => '#ef4444'];
    } elseif ($windSpeed < 157) {
        return ['code' => 'CAT4', 'name' => 'Category 4', 'color' => '#dc2626'];
    } else {
        return ['code' => 'CAT5', 'name' => 'Category 5', 'color' => '#7c2d12'];
    }
}

/**
 * Determine basin based on coordinates
 */
function determineBasin($lat, $lon) {
    // Atlantic Basin
    if ($lat > 0 && $lat < 60 && $lon > -100 && $lon < 0) {
        return 'atlantic';
    }
    // Eastern Pacific
    if ($lat > 0 && $lat < 60 && $lon > -180 && $lon < -80) {
        return 'epac';
    }
    // Western Pacific
    if ($lat > -5 && $lat < 50 && $lon > 100 && $lon < 180) {
        return 'wpac';
    }
    // North Indian Ocean
    if ($lat > 0 && $lat < 35 && $lon > 40 && $lon < 100) {
        return 'nio';
    }
    // South Indian Ocean
    if ($lat > -50 && $lat < 0 && $lon > 20 && $lon < 115) {
        return 'sio';
    }
    // South Pacific
    if ($lat > -50 && $lat < 0 && $lon > 135 && $lon < -120) {
        return 'spc';
    }
    
    return 'atlantic'; // Default
}

/**
 * Get demo storm data
 */
function getDemoStormData() {
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
                'forecastTrack' => [
                    [25.4, -76.2], [26.1, -76.8], [26.8, -77.4], [27.5, -78.0]
                ]
            ],
            [
                'id' => 'demo-al102023',
                'name' => 'Tropical Storm Demo Beta',
                'basin' => 'atlantic',
                'classification' => ['code' => 'TS', 'name' => 'Tropical Storm', 'color' => '#06b6d4'],
                'windSpeed' => 65,
                'pressure' => 995,
                'coordinates' => [18.7, -45.1],
                'movement' => ['speed' => 18, 'direction' => 'W'],
                'lastUpdate' => date('c'),
                'forecastTrack' => [
                    [18.7, -45.1], [19.2, -46.8], [19.7, -48.5]
                ]
            ]
        ]
    ];
}

/**
 * Get demo alerts data
 */
function getDemoAlerts() {
    return [
        'alerts' => [
            [
                'id' => 'demo-alert-1',
                'title' => 'Hurricane Watch - Eastern Seaboard',
                'description' => 'Hurricane conditions possible within 48 hours. Preparations should be rushed to completion.',
                'severity' => 'Moderate',
                'urgency' => 'Expected',
                'areas' => 'Eastern Seaboard',
                'issued' => date('c', time() - 3600),
                'expires' => date('c', time() + 86400)
            ],
            [
                'id' => 'demo-alert-2',
                'title' => 'Storm Surge Warning - Gulf Coast',
                'description' => 'Life-threatening inundation expected. Evacuate immediately if in surge zone.',
                'severity' => 'Severe',
                'urgency' => 'Immediate',
                'areas' => 'Gulf Coast',
                'issued' => date('c', time() - 7200),
                'expires' => date('c', time() + 43200)
            ]
        ]
    ];
}

/**
 * Clean up old cache files
 */
function cleanupCache() {
    global $CACHE_DIR, $CACHE_EXPIRY;
    
    $files = glob($CACHE_DIR . '*.json');
    foreach ($files as $file) {
        if (time() - filemtime($file) > $CACHE_EXPIRY * 2) {
            unlink($file);
        }
    }
}

// Clean up old cache files periodically
if (rand(1, 100) === 1) {
    cleanupCache();
}
?>