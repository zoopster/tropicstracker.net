/**
 * TropicsTracker.net Weather Data Integration Module
 * Handles real-time weather data fetching from multiple APIs
 */

class WeatherDataManager {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.activeRequests = new Map();
        this.retryCount = new Map();
        this.noaaClient = new NOAAApiClient(config);
    }

    /**
     * Fetch active tropical systems from NOAA NHC
     */
    async fetchActiveStorms() {
        const cacheKey = 'active-storms';
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.UPDATE_INTERVALS.ACTIVE_STORMS) {
                return cached.data;
            }
        }

        try {
            // Primary: Use NOAA API client
            const stormData = await this.noaaClient.fetchActiveStorms();

            // Cache the results
            this.cache.set(cacheKey, {
                data: stormData,
                timestamp: Date.now()
            });

            return stormData;
        } catch (error) {
            console.error('Error fetching active storms:', error);
            return this.getFallbackStormData();
        }
    }

    /**
     * Fetch data from National Hurricane Center
     */
    async fetchNHCData() {
        const endpoints = [
            'api-proxy-unified.php?endpoint=nhc-storms',
            'api-proxy-unified.php?endpoint=nhc-sample'
        ];

        const responses = await Promise.allSettled(
            endpoints.map(url => this.fetchWithRetry(url))
        );

        const storms = [];
        
        for (const response of responses) {
            if (response.status === 'fulfilled' && response.value.ok) {
                try {
                    const data = await response.value.json();
                    if (data.storms) {
                        storms.push(...data.storms);
                    }
                } catch (e) {
                    console.warn('Failed to parse NHC data:', e);
                }
            }
        }

        return storms;
    }

    /**
     * Fetch storm data from alternate sources
     */
    async fetchAlternateStormData() {
        const storms = [];
        
        // Try OpenWeatherMap
        if (this.config.WEATHER_APIS.OPENWEATHER_API_KEY !== 'your_openweather_api_key_here') {
            try {
                const owmData = await this.fetchOpenWeatherMapStorms();
                storms.push(...owmData);
            } catch (error) {
                console.warn('OpenWeatherMap fetch failed:', error);
            }
        }

        // Try RapidAPI
        if (this.config.WEATHER_APIS.RAPIDAPI_KEY !== 'your_rapidapi_key_here') {
            try {
                const rapidData = await this.fetchRapidAPIStorms();
                storms.push(...rapidData);
            } catch (error) {
                console.warn('RapidAPI fetch failed:', error);
            }
        }

        return storms;
    }

    /**
     * Fetch storms from OpenWeatherMap
     */
    async fetchOpenWeatherMapStorms() {
        const url = `api-proxy-unified.php?endpoint=weatherapi&q=25,-75`;
        
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        return this.parseOpenWeatherMapData(data);
    }

    /**
     * Fetch storms from RapidAPI
     */
    async fetchRapidAPIStorms() {
        const url = 'api-proxy-unified.php?endpoint=weatherapi&q=25,-75';

        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        return this.parseRapidAPIData(data);
    }

    /**
     * Fetch forecast models data
     */
    async fetchForecastModels(stormId) {
        const cacheKey = `forecast-models-${stormId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.UPDATE_INTERVALS.FORECAST_MODELS) {
                return cached.data;
            }
        }

        try {
            const modelData = await this.fetchModelData(stormId);
            
            this.cache.set(cacheKey, {
                data: modelData,
                timestamp: Date.now()
            });

            return modelData;
        } catch (error) {
            console.error('Error fetching forecast models:', error);
            return this.getFallbackModelData();
        }
    }

    /**
     * Fetch model data from various sources
     */
    async fetchModelData(stormId) {
        const models = [];
        
        // Fetch from different model sources
        const modelSources = [
            this.fetchGFSModel(stormId),
            this.fetchECMWFModel(stormId),
            this.fetchHWRFModel(stormId),
            this.fetchHMONModel(stormId)
        ];

        const results = await Promise.allSettled(modelSources);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                models.push(result.value);
            }
        });

        return models;
    }

    /**
     * Fetch satellite imagery layers
     */
    async fetchSatelliteImagery(layer, bounds) {
        const cacheKey = `satellite-${layer}-${bounds.join('-')}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.UPDATE_INTERVALS.SATELLITE_IMAGERY) {
                return cached.data;
            }
        }

        try {
            let imageData;
            
            switch (layer) {
                case 'satellite':
                    imageData = await this.fetchSatelliteLayer(bounds);
                    break;
                case 'radar':
                    imageData = await this.fetchRadarLayer(bounds);
                    break;
                case 'wind':
                    imageData = await this.fetchWindLayer(bounds);
                    break;
                case 'pressure':
                    imageData = await this.fetchPressureLayer(bounds);
                    break;
                case 'sst':
                    imageData = await this.fetchSeaTempLayer(bounds);
                    break;
                default:
                    throw new Error(`Unknown layer: ${layer}`);
            }

            this.cache.set(cacheKey, {
                data: imageData,
                timestamp: Date.now()
            });

            return imageData;
        } catch (error) {
            console.error(`Error fetching ${layer} imagery:`, error);
            return null;
        }
    }

    /**
     * Fetch weather alerts
     */
    async fetchWeatherAlerts(region = 'all') {
        const cacheKey = `alerts-${region}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.UPDATE_INTERVALS.ACTIVE_STORMS) {
                return cached.data;
            }
        }

        try {
            const alertsData = await this.noaaClient.fetchWeatherAlerts(region);
            
            this.cache.set(cacheKey, {
                data: alertsData,
                timestamp: Date.now()
            });

            return alertsData;
        } catch (error) {
            console.error('Error fetching weather alerts:', error);
            return [];
        }
    }

    /**
     * Utility function for HTTP requests with retry logic
     */
    async fetchWithRetry(url, options = {}, retries = 3) {
        const requestKey = `${url}-${JSON.stringify(options)}`;
        
        // Prevent duplicate requests
        if (this.activeRequests.has(requestKey)) {
            return this.activeRequests.get(requestKey);
        }

        const requestPromise = this.performRequest(url, options, retries);
        this.activeRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            this.activeRequests.delete(requestKey);
            return result;
        } catch (error) {
            this.activeRequests.delete(requestKey);
            throw error;
        }
    }

    async performRequest(url, options, retries) {
        const timeout = this.config.APP_CONFIG.REQUEST_TIMEOUT;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                console.warn(`Request attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt === retries) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.APP_CONFIG.RETRY_DELAY * (attempt + 1))
                );
            }
        }
    }

    /**
     * Parse NHC storm data
     */
    parseNHCStorms(storms) {
        return storms.map(storm => ({
            id: storm.id,
            name: storm.name,
            basin: storm.basin,
            classification: this.classifyStorm(storm.windSpeed),
            windSpeed: storm.windSpeed,
            pressure: storm.pressure,
            coordinates: [storm.lat, storm.lon],
            movement: {
                speed: storm.movementSpeed,
                direction: storm.movementDirection
            },
            lastUpdate: storm.lastUpdate,
            forecastTrack: storm.forecastTrack || [],
            intensity: storm.intensity,
            size: storm.size
        }));
    }

    /**
     * Classify storm based on wind speed
     */
    classifyStorm(windSpeed) {
        const categories = this.config.STORM_CATEGORIES;
        
        for (const [key, category] of Object.entries(categories)) {
            if (windSpeed >= category.minWind && windSpeed <= category.maxWind) {
                return {
                    code: key,
                    name: category.name,
                    color: category.color
                };
            }
        }
        
        return categories.TD;
    }

    /**
     * Get fallback storm data when APIs fail
     */
    getFallbackStormData() {
        return [
            {
                id: 'demo-storm-1',
                name: 'Demo Storm Alpha',
                basin: 'atlantic',
                classification: this.classifyStorm(85),
                windSpeed: 85,
                pressure: 975,
                coordinates: [25.4, -76.2],
                movement: { speed: 12, direction: 'NNW' },
                lastUpdate: new Date().toISOString(),
                forecastTrack: [
                    [25.4, -76.2], [26.1, -76.8], [26.8, -77.4]
                ]
            }
        ];
    }

    /**
     * Get fallback model data
     */
    getFallbackModelData() {
        return Object.keys(this.config.FORECAST_MODELS).map(key => ({
            name: key,
            accuracy: this.config.FORECAST_MODELS[key].accuracy,
            lastUpdate: new Date().toISOString(),
            track: []
        }));
    }

    /**
     * Fetch GOES satellite imagery layer
     */
    async fetchSatelliteLayer(bounds) {
        try {
            // Use NOAA's GOES-16/18 satellite imagery
            const endpoint = 'goes-satellite';
            const url = `api-proxy-unified.php?endpoint=${endpoint}&bounds=${bounds.join(',')}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            // Return tile layer configuration for GOES imagery
            return {
                type: 'tile',
                url: data.tileUrl || this.getFallbackSatelliteUrl(),
                attribution: 'NOAA GOES-16/18 Satellite',
                opacity: 0.7,
                bounds: bounds,
                timestamp: data.timestamp || new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching satellite layer:', error);
            return this.getFallbackSatelliteLayer(bounds);
        }
    }

    /**
     * Fetch NEXRAD radar imagery layer
     */
    async fetchRadarLayer(bounds) {
        try {
            // Use NOAA's NEXRAD radar network
            const endpoint = 'nexrad-radar';
            const url = `api-proxy-unified.php?endpoint=${endpoint}&bounds=${bounds.join(',')}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            return {
                type: 'tile',
                url: data.tileUrl || this.getFallbackRadarUrl(),
                attribution: 'NOAA NEXRAD Radar',
                opacity: 0.6,
                bounds: bounds,
                timestamp: data.timestamp || new Date().toISOString(),
                colorMap: data.colorMap || this.getRadarColorMap()
            };
        } catch (error) {
            console.error('Error fetching radar layer:', error);
            return this.getFallbackRadarLayer(bounds);
        }
    }

    /**
     * Fetch wind speed and direction layer
     */
    async fetchWindLayer(bounds) {
        try {
            // Use GFS wind data from NOAA
            const endpoint = 'wind-data';
            const url = `api-proxy-unified.php?endpoint=${endpoint}&bounds=${bounds.join(',')}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            return {
                type: 'vector',
                url: data.vectorUrl || this.getFallbackWindUrl(),
                attribution: 'NOAA GFS Wind Data',
                opacity: 0.8,
                bounds: bounds,
                timestamp: data.timestamp || new Date().toISOString(),
                windScale: data.windScale || this.getWindScale(),
                particleCount: 5000
            };
        } catch (error) {
            console.error('Error fetching wind layer:', error);
            return this.getFallbackWindLayer(bounds);
        }
    }

    /**
     * Fetch atmospheric pressure layer
     */
    async fetchPressureLayer(bounds) {
        try {
            // Use GFS pressure data from NOAA
            const endpoint = 'pressure-data';
            const url = `api-proxy-unified.php?endpoint=${endpoint}&bounds=${bounds.join(',')}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            return {
                type: 'contour',
                url: data.contourUrl || this.getFallbackPressureUrl(),
                attribution: 'NOAA GFS Pressure Data',
                opacity: 0.5,
                bounds: bounds,
                timestamp: data.timestamp || new Date().toISOString(),
                contourLines: data.contourLines || this.getPressureContours(),
                colorMap: data.colorMap || this.getPressureColorMap()
            };
        } catch (error) {
            console.error('Error fetching pressure layer:', error);
            return this.getFallbackPressureLayer(bounds);
        }
    }

    /**
     * Fetch sea surface temperature layer
     */
    async fetchSeaTempLayer(bounds) {
        try {
            // Use RTOFS sea surface temperature data
            const endpoint = 'sea-temp-data';
            const url = `api-proxy-unified.php?endpoint=${endpoint}&bounds=${bounds.join(',')}`;
            
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            return {
                type: 'heatmap',
                url: data.heatmapUrl || this.getFallbackSeaTempUrl(),
                attribution: 'NOAA RTOFS Sea Surface Temperature',
                opacity: 0.6,
                bounds: bounds,
                timestamp: data.timestamp || new Date().toISOString(),
                temperatureScale: data.temperatureScale || this.getSeaTempScale(),
                colorMap: data.colorMap || this.getSeaTempColorMap()
            };
        } catch (error) {
            console.error('Error fetching sea temperature layer:', error);
            return this.getFallbackSeaTempLayer(bounds);
        }
    }

    /**
     * Get fallback satellite layer configuration
     */
    getFallbackSatelliteLayer(bounds) {
        return {
            type: 'tile',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'ESRI World Imagery (Satellite Fallback)',
            opacity: 0.7,
            bounds: bounds,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get fallback radar layer configuration
     */
    getFallbackRadarLayer(bounds) {
        return {
            type: 'tile',
            url: 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/tile/{z}/{y}/{x}',
            attribution: 'NOAA NEXRAD Radar (Fallback)',
            opacity: 0.6,
            bounds: bounds,
            timestamp: new Date().toISOString(),
            colorMap: this.getRadarColorMap()
        };
    }

    /**
     * Get fallback wind layer configuration
     */
    getFallbackWindLayer(bounds) {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return {
            type: 'tile',
            url: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${owmKey}`,
            attribution: 'OpenWeatherMap Wind Data (One Call API 3.0)',
            opacity: 0.8,
            bounds: bounds,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get fallback pressure layer configuration
     */
    getFallbackPressureLayer(bounds) {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return {
            type: 'tile',
            url: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${owmKey}`,
            attribution: 'OpenWeatherMap Pressure Data (One Call API 3.0)',
            opacity: 0.5,
            bounds: bounds,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get fallback sea temperature layer configuration
     */
    getFallbackSeaTempLayer(bounds) {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return {
            type: 'tile',
            url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${owmKey}`,
            attribution: 'OpenWeatherMap Temperature Data (One Call API 3.0)',
            opacity: 0.6,
            bounds: bounds,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get radar color mapping
     */
    getRadarColorMap() {
        return {
            0: '#00000000',    // Transparent (no precipitation)
            5: '#00ff0080',    // Light green (light rain)
            10: '#00ff0080',   // Green (light rain)
            15: '#ffff0080',   // Yellow (moderate rain)
            20: '#ff800080',   // Orange (heavy rain)
            25: '#ff000080',   // Red (very heavy rain)
            30: '#ff00ff80',   // Magenta (extreme rain)
            35: '#ffffff80'    // White (hail/snow)
        };
    }

    /**
     * Get wind scale configuration
     */
    getWindScale() {
        return {
            min: 0,
            max: 200,
            colors: [
                '#3288bd',  // Light blue (0-25 mph)
                '#99d594',  // Light green (25-50 mph)
                '#e6f598',  // Yellow-green (50-75 mph)
                '#fee08b',  // Yellow (75-100 mph)
                '#fc8d59',  // Orange (100-125 mph)
                '#d53e4f'   // Red (125+ mph)
            ]
        };
    }

    /**
     * Get pressure contour lines
     */
    getPressureContours() {
        return {
            interval: 4,  // 4 mb intervals
            minValue: 960,
            maxValue: 1040,
            colors: {
                low: '#ff0000',    // Red for low pressure
                normal: '#00ff00', // Green for normal pressure
                high: '#0000ff'    // Blue for high pressure
            }
        };
    }

    /**
     * Get pressure color mapping
     */
    getPressureColorMap() {
        return {
            960: '#800080',  // Purple (extreme low)
            980: '#ff0000',  // Red (low)
            1000: '#ffff00', // Yellow (normal low)
            1013: '#00ff00', // Green (sea level)
            1020: '#00ffff', // Cyan (normal high)
            1030: '#0000ff', // Blue (high)
            1040: '#000080'  // Navy (extreme high)
        };
    }

    /**
     * Get sea temperature scale
     */
    getSeaTempScale() {
        return {
            min: -2,   // Celsius
            max: 35,   // Celsius
            units: 'C',
            colors: [
                '#000080',  // Navy (freezing)
                '#0000ff',  // Blue (cold)
                '#00ffff',  // Cyan (cool)
                '#00ff00',  // Green (moderate)
                '#ffff00',  // Yellow (warm)
                '#ff8000',  // Orange (hot)
                '#ff0000'   // Red (very hot)
            ]
        };
    }

    /**
     * Get sea temperature color mapping
     */
    getSeaTempColorMap() {
        return {
            '-2': '#000080',  // Navy (freezing)
            '5': '#0000ff',   // Blue (cold)
            '10': '#00ffff',  // Cyan (cool)
            '15': '#00ff00',  // Green (moderate)
            '20': '#ffff00',  // Yellow (warm)
            '25': '#ff8000',  // Orange (hot)
            '30': '#ff0000',  // Red (very hot)
            '35': '#800000'   // Maroon (extreme)
        };
    }

    /**
     * Get fallback URLs for various services
     */
    getFallbackSatelliteUrl() {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    getFallbackRadarUrl() {
        return 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/tile/{z}/{y}/{x}';
    }

    getFallbackWindUrl() {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${owmKey}`;
    }

    getFallbackPressureUrl() {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${owmKey}`;
    }

    getFallbackSeaTempUrl() {
        const owmKey = this.config.WEATHER_APIS?.OPENWEATHER_API_KEY || '9e5cc90e8cd2b34cabc906523a697644';
        return `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${owmKey}`;
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const maxAge = this.config.APP_CONFIG.CACHE_DURATION;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
        
        // Limit cache size
        if (this.cache.size > this.config.APP_CONFIG.MAX_CACHE_SIZE) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = entries.slice(0, entries.length - this.config.APP_CONFIG.MAX_CACHE_SIZE);
            toDelete.forEach(([key]) => this.cache.delete(key));
        }
    }

    /**
     * Start periodic cache cleanup
     */
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, this.config.APP_CONFIG.CACHE_DURATION);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherDataManager;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.WeatherDataManager = WeatherDataManager;
}