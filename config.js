/**
 * TropicsTracker.net Configuration
 * API Keys and Configuration Settings
 * 
 * IMPORTANT: Replace placeholder values with your actual API keys
 * Never commit real API keys to version control
 */

const CONFIG = {
    // Weather Data APIs
    WEATHER_APIS: {
        // National Hurricane Center (NOAA) - Free, no key required
        NHC_BASE_URL: 'https://www.nhc.noaa.gov/gis/',
        
        // OpenWeatherMap API - Free tier available
        OPENWEATHER_API_KEY: 'your_openweather_api_key_here',
        OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5/',
        
        // RapidAPI Weather Services
        // RAPIDAPI_KEY: 'your_rapidapi_key_here',
        // RAPIDAPI_HOST: 'weatherapi-com.p.rapidapi.com',

        //weatherapi
        WEATHERAPI_KEY: 'your_weatherapi_key_here',
        WEATHERAPI_HOST: 'https://api.weatherapi.com/v1/',
        
        // NOAA Weather Service API - Free
        // NOAA_API_KEY: 'your_noaa_api_key_here', // Optional, increases rate limits
        // NOAA_BASE_URL: 'https://api.weather.gov/',
        
        // Hurricane Database (HURDAT2) - Free
        HURDAT2_URL: 'https://www.aoml.noaa.gov/hrd/hurdat/hurdat2.html',
        
        // Satellite and Radar Imagery
        MAPBOX_ACCESS_TOKEN: 'your_mapbox_access_token_here',
        GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here',
        
        // Real-time Weather Alerts
        // WEATHER_ALERTS_API_KEY: 'your_weather_alerts_key_here'
    },
    
    // Map Configuration
    MAP_CONFIG: {
        DEFAULT_CENTER: [20.0, -60.0], // Center on Atlantic basin
        DEFAULT_ZOOM: 4,
        MIN_ZOOM: 2,
        MAX_ZOOM: 18,
        
        // Basin boundaries
        BASINS: {
            atlantic: {
                name: 'Atlantic Basin',
                bounds: [[0, -100], [60, 0]],
                center: [25, -65],
                zoom: 4
            },
            epac: {
                name: 'Eastern Pacific',
                bounds: [[0, -180], [60, -80]],
                center: [15, -110],
                zoom: 4
            },
            wpac: {
                name: 'Western Pacific',
                bounds: [[-5, 100], [50, 180]],
                center: [20, 140],
                zoom: 4
            },
            nio: {
                name: 'North Indian Ocean',
                bounds: [[0, 40], [35, 100]],
                center: [15, 70],
                zoom: 4
            },
            sio: {
                name: 'South Indian Ocean',
                bounds: [[-50, 20], [0, 115]],
                center: [-20, 70],
                zoom: 4
            },
            spc: {
                name: 'South Pacific',
                bounds: [[-50, 135], [0, -120]],
                center: [-20, 170],
                zoom: 4
            }
        }
    },
    
    // Data Update Intervals (in milliseconds)
    UPDATE_INTERVALS: {
        ACTIVE_STORMS: 300000,    // 5 minutes
        SATELLITE_IMAGERY: 900000, // 15 minutes
        FORECAST_MODELS: 3600000,  // 1 hour
        STORM_HISTORY: 86400000    // 24 hours
    },
    
    // Storm Classification
    STORM_CATEGORIES: {
        TD: { name: 'Tropical Depression', minWind: 0, maxWind: 38, color: '#64748b' },
        TS: { name: 'Tropical Storm', minWind: 39, maxWind: 73, color: '#06b6d4' },
        CAT1: { name: 'Category 1', minWind: 74, maxWind: 95, color: '#fbbf24' },
        CAT2: { name: 'Category 2', minWind: 96, maxWind: 110, color: '#f97316' },
        CAT3: { name: 'Category 3', minWind: 111, maxWind: 129, color: '#ef4444' },
        CAT4: { name: 'Category 4', minWind: 130, maxWind: 156, color: '#dc2626' },
        CAT5: { name: 'Category 5', minWind: 157, maxWind: 999, color: '#7c2d12' }
    },
    
    // Forecast Models
    FORECAST_MODELS: {
        GFS: { name: 'Global Forecast System', provider: 'NOAA', accuracy: 85 },
        ECMWF: { name: 'European Centre Model', provider: 'ECMWF', accuracy: 88 },
        HWRF: { name: 'Hurricane Weather Research', provider: 'NOAA', accuracy: 82 },
        HMON: { name: 'Hurricane Multi-scale Ocean', provider: 'NOAA', accuracy: 79 },
        NHCOCS: { name: 'NHC Official Consensus', provider: 'NHC', accuracy: 91 },
        SHIPS: { name: 'Statistical Hurricane Intensity', provider: 'NHC', accuracy: 76 },
        LGEM: { name: 'Logistic Growth Equation', provider: 'NHC', accuracy: 74 }
    },
    
    // Application Settings
    APP_CONFIG: {
        SITE_NAME: 'TropicsTracker.net',
        VERSION: '1.0.0',
        CONTACT_EMAIL: 'admin@tropicstracker.net',
        GITHUB_REPO: 'https://github.com/yourusername/tropicstracker.net',
        
        // Feature Flags
        ENABLE_NOTIFICATIONS: true,
        ENABLE_HISTORICAL_DATA: true,
        ENABLE_FORECAST_MODELS: true,
        ENABLE_SATELLITE_IMAGERY: true,
        ENABLE_MOBILE_PUSH: false,
        
        // Cache Settings
        CACHE_DURATION: 300000, // 5 minutes
        MAX_CACHE_SIZE: 100, // Maximum cached items
        
        // Performance Settings
        MAX_CONCURRENT_REQUESTS: 5,
        REQUEST_TIMEOUT: 30000, // 30 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // 1 second
    },
    
    // Data Sources Attribution
    DATA_SOURCES: {
        'National Hurricane Center': 'https://www.nhc.noaa.gov/',
        'NOAA Weather Service': 'https://www.weather.gov/',
        'OpenWeatherMap': 'https://openweathermap.org/',
        'European Centre for Medium-Range Weather Forecasts': 'https://www.ecmwf.int/',
        'Joint Typhoon Warning Center': 'https://www.metoc.navy.mil/jtwc/',
        'Météo-France': 'https://www.meteofrance.fr/',
        'Australian Bureau of Meteorology': 'http://www.bom.gov.au/',
        'India Meteorological Department': 'https://mausam.imd.gov.in/'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}