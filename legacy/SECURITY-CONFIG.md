# TropicsTracker.net Security Configuration Guide

## 🔒 API Key Security

### **CRITICAL: API keys have been removed from source code**

The following API keys need to be configured securely:

### 1. Environment Variables (Recommended)

Set these environment variables on your server:

```bash
# For Apache/PHP
export WEATHERAPI_KEY="your_actual_weatherapi_key_here"

# Or add to .env file (NOT committed to git)
echo "WEATHERAPI_KEY=your_actual_weatherapi_key_here" >> .env
```

### 2. Server Configuration

**Apache .htaccess method:**
```apache
SetEnv WEATHERAPI_KEY "your_actual_weatherapi_key_here"
```

**PHP-FPM pool configuration:**
```ini
env[WEATHERAPI_KEY] = your_actual_weatherapi_key_here
```

### 3. Client-side API Keys (config.js)

For client-side maps and APIs, update `config.js` with your actual keys:

```javascript
MAPBOX_ACCESS_TOKEN: 'pk.your_actual_mapbox_token_here',
GOOGLE_MAPS_API_KEY: 'your_actual_google_maps_key_here'
```

**⚠️ Note:** Client-side keys will be visible to users. Use domain restrictions on these keys.

## 🛡️ Security Best Practices

### 1. Domain Restrictions

**Mapbox Token:**
- Go to Mapbox Studio → Access Tokens
- Add URL restrictions: `https://yourdomain.com/*`

**Google Maps API:**
- Go to Google Cloud Console → APIs & Services → Credentials
- Add HTTP referrer restrictions: `https://yourdomain.com/*`

**WeatherAPI Key:**
- Keep server-side only (environment variable)
- Monitor usage in WeatherAPI dashboard

### 2. CORS Configuration

Update your production proxy to restrict CORS:

```php
// Replace wildcard CORS with specific domain
header('Access-Control-Allow-Origin: https://yourdomain.com');
```

### 3. Rate Limiting

The production proxy includes rate limiting:
- 60 requests per minute per IP
- Adjust in `api-proxy-production.php` line 48

### 4. File Security

**Hide sensitive files (.htaccess):**
```apache
<FilesMatch "\.(env|log|md)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>
```

## 🔧 Configuration Files

### Required API Keys

1. **WeatherAPI** (Required for weather data)
   - Sign up: https://www.weatherapi.com/
   - Free tier: 1M calls/month
   - Add to environment: `WEATHERAPI_KEY`

2. **Mapbox** (Required for satellite maps)
   - Sign up: https://account.mapbox.com/
   - Free tier: 50k map views/month
   - Add to config.js: `MAPBOX_ACCESS_TOKEN`

3. **Google Maps** (Optional for additional map features)
   - Sign up: https://cloud.google.com/maps-platform/
   - Add to config.js: `GOOGLE_MAPS_API_KEY`

### Free APIs (No key required)

- NOAA/NHC Hurricane Data
- NWS Weather Alerts
- HURDAT2 Historical Data

## 🧪 Testing Configuration

Use `health-check.php` to verify API configuration:

```bash
curl https://yourdomain.com/health-check.php
```

Check for:
- ✅ Environment variables loaded
- ✅ API endpoints responding
- ✅ Proper CORS headers

## 🚨 Security Checklist

- [ ] API keys removed from source code
- [ ] Environment variables configured
- [ ] Domain restrictions enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Sensitive files hidden
- [ ] HTTPS enabled
- [ ] Security headers added

## 📱 Emergency Response

If API keys are compromised:

1. **Immediately revoke** old keys in provider dashboards
2. **Generate new keys** with domain restrictions
3. **Update environment variables** on server
4. **Monitor usage** for unauthorized activity
5. **Review access logs** for suspicious activity

## 🔍 Monitoring

Regular security checks:

1. **API Usage Monitoring**
   - Check WeatherAPI dashboard monthly
   - Monitor Mapbox usage statistics
   - Review server access logs

2. **Security Headers**
   - Use https://securityheaders.com/
   - Verify CORS configuration
   - Check for leaked credentials

3. **Dependency Updates**
   - Update Leaflet and other libraries
   - Monitor security advisories
   - Keep server software updated

Remember: **Security is ongoing** - review and update regularly!