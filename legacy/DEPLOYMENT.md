# TropicsTracker.net Production Deployment Guide

## Pre-Deployment Checklist

### Server Requirements
- [x] Linux server with Apache 2.4+
- [x] PHP 7.4+ with required extensions:
  - [x] cURL
  - [x] JSON
  - [x] mbstring
  - [x] openssl
- [x] Write permissions for cache and logs directories
- [x] SSL certificate (recommended)

### Domain Setup
- [x] Domain pointing to server IP
- [x] DNS propagated
- [x] SSL certificate installed (optional but recommended)

## Deployment Steps

### 1. Upload Files
Upload all files to your web server's document root:
```bash
# Core files
index.html
config.js
noaa-api.js
weather-data.js
api-proxy-production.php  # Use this as api-proxy.php
health-check.php
.htaccess

# Create required directories
mkdir cache logs
chmod 755 cache logs
```

### 2. Configure Apache
The `.htaccess` file should be automatically loaded. Verify these Apache modules are enabled:
```bash
a2enmod rewrite
a2enmod headers
a2enmod deflate
a2enmod expires
systemctl restart apache2
```

### 3. File Permissions
Set correct permissions:
```bash
# Set ownership (adjust user/group as needed)
chown -R www-data:www-data /path/to/tropicstracker.net/

# Set file permissions
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Ensure cache and logs are writable
chmod 755 cache logs
```

### 4. Production Configuration

#### Option A: Replace development files
```bash
# Replace api-proxy.php with production version
mv api-proxy.php api-proxy-dev.php
mv api-proxy-production.php api-proxy.php
```

#### Option B: Use environment detection
Add this to the top of `api-proxy.php`:
```php
<?php
// Detect environment
$is_production = !in_array($_SERVER['HTTP_HOST'], ['localhost', '127.0.0.1']) && 
                 !preg_match('/\.local$/', $_SERVER['HTTP_HOST']);

if ($is_production) {
    // Production settings
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    // Development settings
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
```

### 5. Security Hardening
Update `.htaccess` to hide development files in production:
```apache
# Uncomment these lines in production
<FilesMatch "(test-.*\.php|debug-.*\.php|simple-.*\.php|TROUBLESHOOTING\.md|DEPLOYMENT\.md)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>
```

## Testing Production Deployment

### 1. Health Check
Visit: `https://yourdomain.com/health-check.php`

Expected response:
```json
{
    "status": "healthy",
    "timestamp": "2025-01-XX...",
    "checks": {
        "php": {"status": "ok"},
        "extensions": {"curl": "ok", "json": "ok"},
        "filesystem": {"cache_dir_writable": "ok"},
        "apis": {"nhc-storms": {"status": "ok"}}
    }
}
```

### 2. API Proxy Test
Visit: `https://yourdomain.com/api-proxy.php?endpoint=nhc-storms`

Should return JSON with storm data or fallback demo data.

### 3. Main Application
Visit: `https://yourdomain.com/`

The map should load and show storm data.

### 4. Performance Test
Check response headers for:
- `X-Cache: HIT` (on subsequent requests)
- `Content-Encoding: gzip`
- `Access-Control-Allow-Origin: *`

## Monitoring

### 1. Log Files
Monitor these log files:
```bash
# API errors
tail -f logs/api_errors.log

# PHP errors
tail -f logs/php_errors.log

# Apache access log
tail -f /var/log/apache2/access.log
```

### 2. Health Check Monitoring
Set up automated monitoring of:
- `https://yourdomain.com/health-check.php`
- Check every 5 minutes
- Alert if status is not "healthy"

### 3. Cache Monitoring
```bash
# Check cache directory size
du -sh cache/

# Count cache files
ls -1 cache/*.json | wc -l

# Check oldest cache file
ls -lt cache/*.json | tail -1
```

## Maintenance

### 1. Cache Management
Cache files are automatically cleaned up, but you can manually clear:
```bash
# Clear all cache
rm -f cache/*.json

# Clear cache older than 1 hour
find cache/ -name "*.json" -mmin +60 -delete
```

### 2. Log Rotation
Set up log rotation for error logs:
```bash
# Add to /etc/logrotate.d/tropicstracker
/path/to/tropicstracker.net/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 3. Updates
For code updates:
1. Test in development first
2. Deploy during low-traffic hours
3. Monitor logs after deployment
4. Have rollback plan ready

## Troubleshooting

### Common Issues

#### 1. "Invalid endpoint" errors
- Check `.htaccess` is working
- Verify PHP is processing the file
- Check file permissions

#### 2. CORS errors
- Verify Apache headers module is enabled
- Check `.htaccess` CORS headers
- Test with browser dev tools

#### 3. Cache not working
- Check cache directory permissions
- Verify disk space
- Check for file locking issues

#### 4. Slow performance
- Enable compression in `.htaccess`
- Check external API response times
- Monitor server resources

### Debug Mode
For troubleshooting, temporarily enable debug mode:
```php
// Add to top of api-proxy.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
```

Remember to disable debug mode in production!

## SSL/HTTPS Setup (Recommended)

### Let's Encrypt (Free)
```bash
# Install certbot
apt install certbot python3-certbot-apache

# Get certificate
certbot --apache -d yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Update .htaccess for HTTPS
Uncomment the HTTPS redirect lines in `.htaccess`:
```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Performance Optimization

### 1. Enable OpCache
Add to php.ini:
```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=4000
opcache.revalidate_freq=2
```

### 2. Tune Apache
Add to apache2.conf:
```apache
# Enable compression
LoadModule deflate_module modules/mod_deflate.so

# Enable expires headers
LoadModule expires_module modules/mod_expires.so
```

### 3. CDN (Optional)
Consider using a CDN like CloudFlare for:
- Global content delivery
- DDoS protection
- SSL termination
- Additional caching

## Backup Strategy

### 1. Code Backup
```bash
# Create daily backup
tar -czf backup-$(date +%Y%m%d).tar.gz \
    --exclude='cache/*' \
    --exclude='logs/*' \
    /path/to/tropicstracker.net/
```

### 2. Database Backup
If you add a database later, include it in backups.

### 3. Configuration Backup
Backup server configuration files:
- Apache vhost configuration
- SSL certificates
- `.htaccess` file

This deployment guide ensures a robust, secure, and performant production installation of TropicsTracker.net.