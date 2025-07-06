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
            'https://www.nhc.noaa.gov/CurrentStorms.json',
            'https://www.nhc.noaa.gov/gis/forecast/archive/wsp_120hr5km_latest.zip',
            'https://www.nhc.noaa.gov/gis/forecast/archive/al_active.zip'
        ];

        const responses = await Promise.allSettled(
            endpoints.map(url => this.fetchWithRetry(url))
        );

        const storms = [];
        
        for (const response of responses) {
            if (response.status === 'fulfilled' && response.value.ok) {
                try {
                    const data = await response.value.json();
                    if (data.activeStorms) {
                        storms.push(...this.parseNHCStorms(data.activeStorms));
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
        const url = `${this.config.WEATHER_APIS.OPENWEATHER_BASE_URL}onecall?lat=25&lon=-75&appid=${this.config.WEATHER_APIS.OPENWEATHER_API_KEY}&exclude=minutely,hourly,daily`;
        
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        return this.parseOpenWeatherMapData(data);
    }

    /**
     * Fetch storms from RapidAPI
     */
    async fetchRapidAPIStorms() {
        const url = 'https://weatherapi-com.p.rapidapi.com/current.json';
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.config.WEATHER_APIS.RAPIDAPI_KEY,
                'X-RapidAPI-Host': this.config.WEATHER_APIS.RAPIDAPI_HOST
            }
        };

        const response = await this.fetchWithRetry(url, options);
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