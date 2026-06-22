# API Proxy Consolidation Plan

## Current Situation (Confusing!)

We have **3 different API proxy versions**:

### 1. `api-proxy.php` (Development)
- **Lines**: 438
- **Features**: Basic functionality, debug-friendly
- **Security**: Minimal (fixed API keys, basic CORS)
- **Use Case**: Local development and testing

### 2. `api-proxy-production.php` (Production v1)  
- **Lines**: 398
- **Features**: Rate limiting, error logging, caching
- **Security**: Medium (production error handling)
- **Use Case**: Basic production deployment

### 3. `api-proxy-secure.php` (Production v2 - Secure)
- **Lines**: 494  
- **Features**: Full security suite, input validation, restricted CORS
- **Security**: High (comprehensive security measures)
- **Use Case**: Secure production deployment

## 🎯 **RECOMMENDED CONSOLIDATION:**

### Single File Approach (Recommended)

**Create ONE proxy file that adapts based on environment:**

```php
// Environment detection
$is_development = (
    in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1']) ||
    preg_match('/\.local$/', $_SERVER['HTTP_HOST'] ?? '') ||
    getenv('APP_ENV') === 'development'
);

if ($is_development) {
    // Development settings: verbose errors, relaxed security
} else {
    // Production settings: secure headers, strict validation
}
```

### File Structure Recommendation

**Keep:**
- `api-proxy.php` - **Single adaptive proxy** (combination of all three)

**Archive:**
- `api-proxy-production.php` → `archive/api-proxy-production.php`
- `api-proxy-secure.php` → `archive/api-proxy-secure.php`

## 🔧 **Implementation Plan:**

### Step 1: Create Unified Proxy
Merge the best features from all three into `api-proxy.php`:
- Environment detection
- Development mode: relaxed CORS, verbose errors
- Production mode: strict security, input validation, rate limiting

### Step 2: Feature Matrix
```
Feature                    | Development | Production
---------------------------|-------------|------------
CORS Origins              | Wildcard    | Restricted  
Error Display             | Verbose     | Minimal
Rate Limiting             | Disabled    | 60/min
Input Validation          | Basic       | Strict
Security Headers          | Basic       | Full Suite
Debug Logging             | Enabled     | Security Only
```

### Step 3: Configuration
Use environment variables for settings:
```bash
# Development
export APP_ENV=development
export DEBUG=true
export CORS_ORIGIN=*

# Production  
export APP_ENV=production
export DEBUG=false
export CORS_ORIGIN=https://tropicstracker.net
export WEATHERAPI_KEY=your_key_here
```

## 🚀 **Benefits of Consolidation:**

✅ **Single Source of Truth** - One file to maintain
✅ **Environment Adaptive** - Same code works everywhere  
✅ **Easier Deployment** - No file swapping needed
✅ **Consistent Behavior** - Same logic across environments
✅ **Simpler Testing** - Test one file with different configs

## 📋 **Migration Steps:**

1. **Backup current files**
2. **Create unified api-proxy.php** 
3. **Test in development mode**
4. **Test in production mode**
5. **Archive old versions**
6. **Update deployment scripts**

## 🔍 **Testing Checklist:**

### Development Mode:
- [ ] Accepts localhost origins
- [ ] Shows detailed errors
- [ ] No rate limiting
- [ ] Basic input validation

### Production Mode:  
- [ ] Restricted CORS origins
- [ ] Minimal error disclosure
- [ ] Rate limiting active
- [ ] Full input validation
- [ ] Security headers present

Would you like me to implement this consolidation plan?