/**
 * TropicsTracker.net Configuration Template
 * Copy this file to config.js and fill in your API keys
 * NEVER commit config.js to version control!
 */

const CONFIG = {
    // Weather Data APIs
    WEATHER_APIS: {
        // National Hurricane Center (NOAA) - Free, no key required
        NHC_BASE_URL: 'https://www.nhc.noaa.gov/gis/',
        
        // OpenWeatherMap API - Get your free key at https://openweathermap.org/api
        OPENWEATHER_API_KEY: 'your_openweather_api_key_here',
        OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5/',
        
        // WeatherAPI - Get your free key at https://www.weatherapi.com/
        WEATHERAPI_KEY: 'your_weatherapi_key_here',
        WEATHERAPI_HOST: 'https://api.weatherapi.com/v1/',
        
        // Hurricane Database (HURDAT2) - Free
        HURDAT2_URL: 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.html',
        
        // Satellite and Radar Imagery
        MAPBOX_ACCESS_TOKEN: 'your_mapbox_token_here',
        GOOGLE_MAPS_API_KEY: 'your_google_maps_key_here'
    },
    
    // Map Configuration
    MAP_CONFIG: {
        DEFAULT_CENTER: [20.0, -60.0], // Center on Atlantic basin
        DEFAULT_ZOOM: 4,
        MIN_ZOOM: 2,
        MAX_ZOOM: 15,
        
        // Hurricane Basin Definitions
        BASINS: {
            atlantic: {
                name: 'Atlantic Basin',
                bounds: [[5, -100], [50, -10]],
                center: [25, -55],
                season: { start: '06-01', end: '11-30' }
            },
            epac: {
                name: 'Eastern Pacific Basin',
                bounds: [[5, -140], [35, -80]],
                center: [20, -110],
                season: { start: '05-15', end: '11-30' }
            },
            wpac: {
                name: 'Western Pacific Basin',
                bounds: [[-5, 100], [50, 180]],
                center: [20, 140],
                season: { start: '01-01', end: '12-31' }
            },
            nio: {
                name: 'North Indian Ocean',
                bounds: [[0, 40], [30, 100]],
                center: [15, 70],
                season: { start: '04-01', end: '12-31' }
            },
            sio: {
                name: 'South Indian Ocean',
                bounds: [[-40, 20], [0, 115]],
                center: [-20, 67],
                season: { start: '11-01', end: '04-30' }
            },
            spc: {
                name: 'South Pacific',
                bounds: [[-40, 135], [0, 240]],
                center: [-20, 187],
                season: { start: '11-01', end: '04-30' }
            }
        }
    },
    
    // Storm Classification (Saffir-Simpson Scale)
    STORM_CATEGORIES: {
        TD: { name: 'Tropical Depression', minWind: 0, maxWind: 38, color: '#64748b' },
        TS: { name: 'Tropical Storm', minWind: 39, maxWind: 73, color: '#06b6d4' },
        CAT1: { name: 'Category 1 Hurricane', minWind: 74, maxWind: 95, color: '#fbbf24' },
        CAT2: { name: 'Category 2 Hurricane', minWind: 96, maxWind: 110, color: '#f97316' },
        CAT3: { name: 'Category 3 Hurricane', minWind: 111, maxWind: 129, color: '#ef4444' },
        CAT4: { name: 'Category 4 Hurricane', minWind: 130, maxWind: 156, color: '#dc2626' },
        CAT5: { name: 'Category 5 Hurricane', minWind: 157, maxWind: 999, color: '#7c2d12' }
    },
    
    // Forecast Models Configuration
    FORECAST_MODELS: {
        GFS: { name: 'Global Forecast System', accuracy: 85, updateInterval: 6 },
        ECMWF: { name: 'European Centre Model', accuracy: 88, updateInterval: 12 },
        HWRF: { name: 'Hurricane Weather Research', accuracy: 82, updateInterval: 6 },
        HMON: { name: 'Hurricane Multi-scale Ocean', accuracy: 79, updateInterval: 6 },
        NHCOCS: { name: 'NHC Official Consensus', accuracy: 91, updateInterval: 6 },
        SHIPS: { name: 'Statistical Hurricane Intensity', accuracy: 76, updateInterval: 6 }
    },
    
    // Data Update Intervals (in milliseconds)
    UPDATE_INTERVALS: {
        ACTIVE_STORMS: 300000,      // 5 minutes
        SATELLITE_IMAGERY: 600000,   // 10 minutes
        FORECAST_MODELS: 3600000,    // 1 hour
        HISTORICAL_DATA: 86400000    // 24 hours
    },
    
    // Application Configuration
    APP_CONFIG: {
        DEBUG_MODE: false,
        CACHE_DURATION: 300000,     // 5 minutes
        MAX_CACHE_SIZE: 100,
        REQUEST_TIMEOUT: 30000,     // 30 seconds
        RETRY_DELAY: 1000,          // 1 second
        MAX_RETRIES: 3
    }
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}