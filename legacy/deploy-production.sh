#!/bin/bash

# TropicsTracker.net Production Deployment Script
# Switches from development to production configuration

echo "🌀 TropicsTracker.net Production Deployment"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "api-proxy-production.php" ]; then
    echo "❌ Error: api-proxy-production.php not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Backup current api-proxy.php if it exists
if [ -f "api-proxy.php" ]; then
    echo "📦 Backing up current api-proxy.php to api-proxy-dev.php"
    cp api-proxy.php api-proxy-dev.php
fi

# Copy production version to main api-proxy.php
echo "🚀 Deploying production API proxy"
cp api-proxy-production.php api-proxy.php

# Create required directories
echo "📁 Creating required directories"
mkdir -p cache logs
chmod 755 cache logs

# Set proper permissions (adjust as needed for your server)
echo "🔒 Setting file permissions"
find . -type f -name "*.php" -exec chmod 644 {} \;
find . -type f -name "*.html" -exec chmod 644 {} \;
find . -type f -name "*.js" -exec chmod 644 {} \;
find . -type f -name ".htaccess" -exec chmod 644 {} \;

# Hide development files in production
echo "🛡️  Securing development files"
if [ -f ".htaccess" ]; then
    # Check if development file restrictions are already in place
    if ! grep -q "test-.*\.php" .htaccess; then
        echo "" >> .htaccess
        echo "# Production security - hide development files" >> .htaccess
        echo "<FilesMatch \"(test-.*\.php|debug-.*\.php|simple-.*\.php|.*-dev\.php|deploy-.*\.sh|TROUBLESHOOTING\.md|DEPLOYMENT\.md)$\">" >> .htaccess
        echo "    Order Allow,Deny" >> .htaccess
        echo "    Deny from all" >> .htaccess
        echo "</FilesMatch>" >> .htaccess
        echo "✅ Added development file restrictions to .htaccess"
    else
        echo "✅ Development file restrictions already in place"
    fi
fi

# Test the deployment
echo "🧪 Testing deployment"
if command -v php &> /dev/null; then
    # Test PHP syntax
    php -l api-proxy.php > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ PHP syntax check passed"
    else
        echo "❌ PHP syntax error in api-proxy.php"
        exit 1
    fi
    
    # Test health check if available
    if [ -f "health-check.php" ]; then
        php -l health-check.php > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ Health check syntax passed"
        else
            echo "❌ PHP syntax error in health-check.php"
        fi
    fi
else
    echo "⚠️  PHP not found in PATH - skipping syntax check"
fi

echo ""
echo "🎉 Production deployment completed!"
echo ""
echo "Next steps:"
echo "1. Test the deployment: Open quick-test.html in browser"
echo "2. Run health check: Visit /health-check.php"
echo "3. Test full application: Visit /index.html"
echo "4. Monitor logs: tail -f logs/api_errors.log"
echo ""
echo "Files deployed:"
echo "- api-proxy.php (production version)"
echo "- health-check.php (system monitoring)"
echo "- .htaccess (Apache configuration)"
echo "- cache/ and logs/ directories created"
echo ""
echo "Backup created:"
echo "- api-proxy-dev.php (original development version)"
echo ""
echo "🚀 Ready for production traffic!"