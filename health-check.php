<?php
/**
 * TropicsTracker.net Health Check Endpoint
 * Monitors system status and API availability
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$health = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'version' => '1.0.0',
    'checks' => []
];

// Check PHP environment (limited info for security)
$health['checks']['php'] = [
    'status' => 'ok',
    'version_major' => substr(phpversion(), 0, 1) // Only major version
];

// Check required extensions
$required_extensions = ['curl', 'json'];
foreach ($required_extensions as $ext) {
    $health['checks']['extensions'][$ext] = extension_loaded($ext) ? 'ok' : 'error';
}

// Check file permissions
$cache_dir = __DIR__ . '/cache/';
$logs_dir = __DIR__ . '/logs/';

$health['checks']['filesystem'] = [
    'cache_dir_exists' => is_dir($cache_dir) ? 'ok' : 'error',
    'cache_dir_writable' => is_writable($cache_dir) ? 'ok' : 'error',
    'logs_dir_exists' => is_dir($logs_dir) ? 'ok' : 'error',
    'logs_dir_writable' => is_writable($logs_dir) ? 'ok' : 'error'
];

// Check API endpoints (quick test)
$api_endpoints = [
    'nhc-storms' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'nws-alerts' => 'https://api.weather.gov/alerts/active',
    'weatherapi' => 'https://api.weatherapi.com/v1/current.json'
];

foreach ($api_endpoints as $name => $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request only
    curl_setopt($ch, CURLOPT_USERAGENT, 'TropicsTracker-HealthCheck/1.0');
    
    $start_time = microtime(true);
    curl_exec($ch);
    $response_time = round((microtime(true) - $start_time) * 1000, 2);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $health['checks']['apis'][$name] = [
        'status' => ($http_code === 200 || $http_code === 403) ? 'ok' : 'error', // 403 is ok for some APIs
        'http_code' => $http_code,
        'response_time_ms' => $response_time,
        'error' => $error ?: null
    ];
}

// Check cache performance
$cache_files = glob($cache_dir . '*.json');
$health['checks']['cache'] = [
    'files_count' => count($cache_files),
    'cache_dir_size' => array_sum(array_map('filesize', $cache_files)),
    'oldest_file_age' => $cache_files ? time() - min(array_map('filemtime', $cache_files)) : 0
];

// Overall health status
$errors = 0;
array_walk_recursive($health['checks'], function($value) use (&$errors) {
    if ($value === 'error') $errors++;
});

if ($errors > 0) {
    $health['status'] = $errors > 3 ? 'unhealthy' : 'degraded';
    http_response_code($errors > 3 ? 503 : 200);
}

// System info limited for security in production
// Add only basic system status
$health['checks']['system'] = ['status' => 'operational'];

echo json_encode($health, JSON_PRETTY_PRINT);
?>