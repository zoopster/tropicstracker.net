#!/bin/bash

# TropicsTracker.net Proxy Consolidation Script
# Migrates from 3 separate proxy files to 1 unified adaptive proxy

echo "🔄 TropicsTracker.net Proxy Consolidation"
echo "========================================"

# Create archive directory
mkdir -p archive

echo "📦 Archiving existing proxy files..."

# Archive existing files with timestamps
timestamp=$(date +%Y%m%d_%H%M%S)

if [ -f "api-proxy.php" ]; then
    echo "  - Archiving api-proxy.php"
    cp api-proxy.php "archive/api-proxy-dev_${timestamp}.php"
fi

if [ -f "api-proxy-production.php" ]; then
    echo "  - Archiving api-proxy-production.php"
    cp api-proxy-production.php "archive/api-proxy-production_${timestamp}.php"
fi

if [ -f "api-proxy-secure.php" ]; then
    echo "  - Archiving api-proxy-secure.php"
    cp api-proxy-secure.php "archive/api-proxy-secure_${timestamp}.php"
fi

echo "🚀 Installing unified proxy..."

# Deploy unified proxy as main api-proxy.php
cp api-proxy-unified.php api-proxy.php

echo "✅ Consolidation complete!"
echo ""
echo "📁 File structure after consolidation:"
echo "  ✅ api-proxy.php (unified adaptive proxy)"
echo "  📦 archive/api-proxy-dev_${timestamp}.php"
echo "  📦 archive/api-proxy-production_${timestamp}.php" 
echo "  📦 archive/api-proxy-secure_${timestamp}.php"
echo ""
echo "🔧 Environment Configuration:"
echo ""
echo "For DEVELOPMENT (automatic detection):"
echo "  - Host: localhost, 127.0.0.1, *.local"
echo "  - Features: Relaxed CORS, verbose errors, no rate limiting"
echo ""
echo "For PRODUCTION:"
echo "  - Host: Any other domain"
echo "  - Features: Strict CORS, minimal errors, rate limiting"
echo "  - Required: Set WEATHERAPI_KEY environment variable"
echo ""
echo "🧪 Testing:"
echo "  1. Test development: Open quick-test.html on localhost"
echo "  2. Test production: Deploy to server and test"
echo "  3. Monitor logs: tail -f logs/api_errors.log"
echo ""
echo "🎯 Benefits:"
echo "  ✅ Single file to maintain"
echo "  ✅ Environment adaptive behavior"
echo "  ✅ Consistent API across environments"
echo "  ✅ No more file swapping for deployment"
echo ""
echo "Ready to roll! 🌀"