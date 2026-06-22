<?php
/**
 * Test script to debug NWS API issues
 */

echo "Testing NWS API directly...\n\n";

// Test direct NWS API call
$nws_url = 'https://api.weather.gov/alerts/active';

echo "Testing URL: $nws_url\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $nws_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_USERAGENT, 'TropicsTracker.net/1.0 (admin@tropicstracker.net)');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: TropicsTracker.net/1.0 (admin@tropicstracker.net)',
    'Accept: application/geo+json,application/json'
]);

// Enable verbose output for debugging
curl_setopt($ch, CURLOPT_VERBOSE, true);
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

// Get verbose output
rewind($verbose);
$verbose_log = stream_get_contents($verbose);
fclose($verbose);

curl_close($ch);

echo "HTTP Status Code: $http_code\n";
echo "cURL Error: " . ($error ?: 'None') . "\n";
echo "Response Length: " . strlen($response) . " bytes\n\n";

if ($verbose_log) {
    echo "cURL Verbose Log:\n";
    echo $verbose_log . "\n";
}

if ($response) {
    echo "Response Preview (first 500 chars):\n";
    echo substr($response, 0, 500) . "\n\n";
    
    // Try to decode JSON
    $data = json_decode($response, true);
    if ($data) {
        echo "JSON parsed successfully!\n";
        echo "Features count: " . (isset($data['features']) ? count($data['features']) : 'N/A') . "\n";
    } else {
        echo "JSON parsing failed. JSON Error: " . json_last_error_msg() . "\n";
    }
} else {
    echo "No response received.\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "Testing via proxy...\n\n";

// Test via our proxy
$proxy_url = 'http://localhost/api-proxy.php?endpoint=nws-alerts';
echo "Testing proxy URL: $proxy_url\n\n";

$proxy_ch = curl_init();
curl_setopt($proxy_ch, CURLOPT_URL, $proxy_url);
curl_setopt($proxy_ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($proxy_ch, CURLOPT_TIMEOUT, 30);

$proxy_response = curl_exec($proxy_ch);
$proxy_http_code = curl_getinfo($proxy_ch, CURLINFO_HTTP_CODE);
$proxy_error = curl_error($proxy_ch);
curl_close($proxy_ch);

echo "Proxy HTTP Status Code: $proxy_http_code\n";
echo "Proxy cURL Error: " . ($proxy_error ?: 'None') . "\n";
echo "Proxy Response Length: " . strlen($proxy_response) . " bytes\n\n";

if ($proxy_response) {
    echo "Proxy Response Preview (first 500 chars):\n";
    echo substr($proxy_response, 0, 500) . "\n\n";
    
    $proxy_data = json_decode($proxy_response, true);
    if ($proxy_data) {
        echo "Proxy JSON parsed successfully!\n";
        if (isset($proxy_data['alerts'])) {
            echo "Alerts count: " . count($proxy_data['alerts']) . "\n";
        } elseif (isset($proxy_data['error'])) {
            echo "Proxy returned error: " . $proxy_data['error'] . "\n";
        }
    } else {
        echo "Proxy JSON parsing failed. JSON Error: " . json_last_error_msg() . "\n";
    }
}

echo "\nTest completed.\n";
?>