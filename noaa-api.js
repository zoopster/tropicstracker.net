/**
 * NOAA API Integration Module
 * Handles data fetching from National Hurricane Center and NOAA Weather Service
 */

class NOAAApiClient {
    constructor(config) {
        this.config = config;
        this.baseUrls = {
            nhc: 'https://www.nhc.noaa.gov/',
            nws: 'https://api.weather.gov/',
            gis: 'https://www.nhc.noaa.gov/gis/'
        };
        this.cache = new Map();
    }

    /**
     * Fetch current active storms from NHC
     */
    async fetchActiveStorms() {
        try {
            // Try multiple endpoints for active storm data via PHP proxy
            const endpoints = ['nhc-storms', 'nhc-sample'];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`api-proxy.php?endpoint=${endpoint}`);
                    if (response.ok) {
                        const data = await response.json();
                        return this.parseNHCStormData(data);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch from ${endpoint}:`, error);
                }
            }

            // If all endpoints fail, return demo data
            return this.getDemoStormData();
        } catch (error) {
            console.error('Error fetching active storms:', error);
            return this.getDemoStormData();
        }
    }

    /**
     * Fetch storm forecast data
     */
    async fetchStormForecast(stormId) {
        try {
            const url = `${this.baseUrls.nhc}storm_graphics/AT${stormId}/refresh/AL${stormId}_5day_cone_no_line_and_wind.png`;
            const response = await fetch(url);
            
            if (response.ok) {
                return {
                    coneImageUrl: url,
                    lastUpdated: new Date().toISOString()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching storm forecast:', error);
            return null;
        }
    }

    /**
     * Fetch weather alerts from NWS
     */
    async fetchWeatherAlerts(state = null) {
        try {
            let url = `api-proxy.php?endpoint=nws-alerts`;
            if (state) {
                url += `&area=${state}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return this.parseWeatherAlerts(data);
            }

            return this.getDemoAlerts();
        } catch (error) {
            console.error('Error fetching weather alerts:', error);
            return this.getDemoAlerts();
        }
    }

    /**
     * Fetch hurricane database (HURDAT2) data
     */
    async fetchHurricaneDatabase(year = null) {
        try {
            // HURDAT2 data is typically in CSV format
            const url = `api-proxy.php?endpoint=hurdat2${year ? '&year=' + year : ''}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return data.storms || [];
            }

            return [];
        } catch (error) {
            console.error('Error fetching hurricane database:', error);
            return [];
        }
    }

    /**
     * Fetch tropical cyclone forecast models
     */
    async fetchForecastModels(stormId) {
        try {
            const modelEndpoints = [
                `${this.baseUrls.gis}forecast/archive/al${stormId.toLowerCase()}_5day_cone.zip`,
                `${this.baseUrls.gis}forecast/archive/al${stormId.toLowerCase()}_track.zip`
            ];

            const modelData = [];
            
            for (const endpoint of modelEndpoints) {
                try {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        // Note: This would need additional processing for ZIP files
                        modelData.push({
                            url: endpoint,
                            type: endpoint.includes('cone') ? 'cone' : 'track',
                            lastUpdated: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to fetch model data from ${endpoint}:`, error);
                }
            }

            return modelData;
        } catch (error) {
            console.error('Error fetching forecast models:', error);
            return [];
        }
    }

    /**
     * Parse NHC storm data
     */
    parseNHCStormData(data) {
        // Handle different possible data structures
        if (data.storms && Array.isArray(data.storms)) {
            return data.storms;
        }
        
        if (data.activeStorms && Array.isArray(data.activeStorms)) {
            return data.activeStorms.map(storm => this.normalizeStormData(storm));
        }

        // If no active storms, return demo data
        return this.getDemoStormData();
    }

    /**
     * Normalize storm data to consistent format
     */
    normalizeStormData(storm) {
        return {
            id: storm.id || storm.stormId || `storm-${Date.now()}`,
            name: storm.name || storm.stormName || 'Unknown Storm',
            basin: this.determineBasin(storm.lat || storm.latitude || 25, storm.lon || storm.longitude || -75),
            classification: this.classifyStorm(storm.maxWind || storm.windSpeed || 0),
            windSpeed: storm.maxWind || storm.windSpeed || 0,
            pressure: storm.minPressure || storm.pressure || 1013,
            coordinates: [
                storm.lat || storm.latitude || 25,
                storm.lon || storm.longitude || -75
            ],
            movement: {
                speed: storm.movementSpeed || storm.speed || 0,
                direction: storm.movementDir || storm.direction || 'N'
            },
            lastUpdate: storm.lastUpdate || new Date().toISOString(),
            forecastTrack: storm.forecastTrack || [],
            intensity: storm.intensity || 'Unknown',
            size: storm.size || 'Unknown'
        };
    }

    /**
     * Determine basin based on coordinates
     */
    determineBasin(lat, lon) {
        // Atlantic Basin
        if (lat > 0 && lat < 60 && lon > -100 && lon < 0) {
            return 'atlantic';
        }
        // Eastern Pacific
        if (lat > 0 && lat < 60 && lon > -180 && lon < -80) {
            return 'epac';
        }
        // Western Pacific
        if (lat > -5 && lat < 50 && lon > 100 && lon < 180) {
            return 'wpac';
        }
        // North Indian Ocean
        if (lat > 0 && lat < 35 && lon > 40 && lon < 100) {
            return 'nio';
        }
        // South Indian Ocean
        if (lat > -50 && lat < 0 && lon > 20 && lon < 115) {
            return 'sio';
        }
        // South Pacific
        if (lat > -50 && lat < 0 && lon > 135 && lon < -120) {
            return 'spc';
        }
        
        return 'atlantic'; // Default
    }

    /**
     * Classify storm based on wind speed
     */
    classifyStorm(windSpeed) {
        if (windSpeed < 39) {
            return { code: 'TD', name: 'Tropical Depression', color: '#64748b' };
        } else if (windSpeed < 74) {
            return { code: 'TS', name: 'Tropical Storm', color: '#06b6d4' };
        } else if (windSpeed < 96) {
            return { code: 'CAT1', name: 'Category 1', color: '#fbbf24' };
        } else if (windSpeed < 111) {
            return { code: 'CAT2', name: 'Category 2', color: '#f97316' };
        } else if (windSpeed < 130) {
            return { code: 'CAT3', name: 'Category 3', color: '#ef4444' };
        } else if (windSpeed < 157) {
            return { code: 'CAT4', name: 'Category 4', color: '#dc2626' };
        } else {
            return { code: 'CAT5', name: 'Category 5', color: '#7c2d12' };
        }
    }

    /**
     * Parse weather alerts data
     */
    parseWeatherAlerts(data) {
        if (data.alerts && Array.isArray(data.alerts)) {
            return data.alerts;
        }
        
        if (!data.features || !Array.isArray(data.features)) {
            return this.getDemoAlerts();
        }

        return data.features.map(feature => ({
            id: feature.properties.id,
            title: feature.properties.event,
            description: feature.properties.description,
            severity: feature.properties.severity,
            urgency: feature.properties.urgency,
            areas: feature.properties.areaDesc,
            issued: feature.properties.sent,
            expires: feature.properties.expires,
            coordinates: feature.geometry ? feature.geometry.coordinates : null
        }));
    }

    /**
     * Parse HURDAT2 data
     */
    parseHurdatData(csvData) {
        const lines = csvData.split('\n');
        const storms = [];
        let currentStorm = null;

        for (const line of lines) {
            if (line.trim() === '') continue;

            const parts = line.split(',').map(part => part.trim());
            
            // Header line for a new storm
            if (parts.length >= 3 && parts[0].match(/^[A-Z]{2}\d{6}$/)) {
                if (currentStorm) {
                    storms.push(currentStorm);
                }
                currentStorm = {
                    id: parts[0],
                    name: parts[1],
                    entries: parseInt(parts[2]),
                    track: []
                };
            } else if (currentStorm && parts.length >= 7) {
                // Data line
                currentStorm.track.push({
                    date: parts[0],
                    time: parts[1],
                    status: parts[2],
                    lat: parseFloat(parts[3]),
                    lon: parseFloat(parts[4]),
                    windSpeed: parseInt(parts[5]),
                    pressure: parseInt(parts[6])
                });
            }
        }

        if (currentStorm) {
            storms.push(currentStorm);
        }

        return storms;
    }

    /**
     * Get demo storm data when APIs are unavailable
     */
    getDemoStormData() {
        return [
            {
                id: 'demo-al092023',
                name: 'Hurricane Demo Alpha',
                basin: 'atlantic',
                classification: { code: 'CAT3', name: 'Category 3', color: '#ef4444' },
                windSpeed: 125,
                pressure: 958,
                coordinates: [25.4, -76.2],
                movement: { speed: 12, direction: 'NNW' },
                lastUpdate: new Date().toISOString(),
                forecastTrack: [
                    [25.4, -76.2], [26.1, -76.8], [26.8, -77.4], [27.5, -78.0]
                ],
                intensity: 'Major Hurricane',
                size: 'Large'
            },
            {
                id: 'demo-al102023',
                name: 'Tropical Storm Demo Beta',
                basin: 'atlantic',
                classification: { code: 'TS', name: 'Tropical Storm', color: '#06b6d4' },
                windSpeed: 65,
                pressure: 995,
                coordinates: [18.7, -45.1],
                movement: { speed: 18, direction: 'W' },
                lastUpdate: new Date().toISOString(),
                forecastTrack: [
                    [18.7, -45.1], [19.2, -46.8], [19.7, -48.5]
                ],
                intensity: 'Tropical Storm',
                size: 'Medium'
            }
        ];
    }

    /**
     * Get demo alerts data
     */
    getDemoAlerts() {
        return [
            {
                id: 'demo-alert-1',
                title: 'Hurricane Watch - Eastern Seaboard',
                description: 'Hurricane conditions possible within 48 hours. Preparations should be rushed to completion.',
                severity: 'Moderate',
                urgency: 'Expected',
                areas: 'Eastern Seaboard',
                issued: new Date(Date.now() - 3600000).toISOString(),
                expires: new Date(Date.now() + 86400000).toISOString()
            },
            {
                id: 'demo-alert-2',
                title: 'Storm Surge Warning - Gulf Coast',
                description: 'Life-threatening inundation expected. Evacuate immediately if in surge zone.',
                severity: 'Severe',
                urgency: 'Immediate',
                areas: 'Gulf Coast',
                issued: new Date(Date.now() - 7200000).toISOString(),
                expires: new Date(Date.now() + 43200000).toISOString()
            }
        ];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NOAAApiClient;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.NOAAApiClient = NOAAApiClient;
}