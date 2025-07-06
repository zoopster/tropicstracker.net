# TropicsTracker.net 🌀

A comprehensive global tropical weather tracking website focused on real-time hurricane, typhoon, and cyclone monitoring across all ocean basins.

## Features

### 🌍 Global Coverage
- **Atlantic Basin**: Gulf of Mexico, Caribbean Sea, North Atlantic
- **Eastern Pacific**: Eastern North Pacific Ocean
- **Western Pacific**: Northwest Pacific Ocean (most active basin)
- **North Indian Ocean**: Bay of Bengal & Arabian Sea
- **South Indian Ocean**: South of equator
- **South Pacific**: South Pacific Ocean

### 🛰️ Real-Time Data
- Live storm tracking with current position and intensity
- Multiple weather radar and satellite imagery layers
- Current weather conditions and sea surface temperatures
- Real-time weather alerts and warnings

### 📊 Forecast Models
- **GFS**: Global Forecast System (NOAA)
- **ECMWF**: European Centre for Medium-Range Weather Forecasts
- **HWRF**: Hurricane Weather Research and Forecasting Model
- **HMON**: Hurricane Multi-scale Ocean Model
- **SHIPS**: Statistical Hurricane Intensity Prediction Scheme
- **LGEM**: Logistic Growth Equation Model

### 📈 Advanced Features
- Spaghetti model visualizations for forecast tracks
- Storm history and archive functionality
- Educational content about tropical cyclones
- Mobile-responsive design
- Real-time notifications and alerts

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/tropicstracker.net.git
cd tropicstracker.net
```

### 2. Configuration
Copy the configuration template and add your API keys:

```bash
cp config.example.js config.js
```

Edit `config.js` and replace placeholder values with your actual API keys:

```javascript
const CONFIG = {
    WEATHER_APIS: {
        OPENWEATHER_API_KEY: 'your_actual_api_key_here',
        RAPIDAPI_KEY: 'your_actual_api_key_here',
        MAPBOX_ACCESS_TOKEN: 'your_actual_token_here',
        // ... other API keys
    }
};
```

### 3. API Keys Required

#### Free APIs (No Key Required)
- **National Hurricane Center (NHC)**: Real-time storm data
- **NOAA Weather Service**: Weather alerts and forecasts

#### Free APIs (Key Required)
- **OpenWeatherMap**: Weather data and forecasts
  - Sign up at: https://openweathermap.org/api
  - Free tier: 1,000 calls/day
  
- **Mapbox**: Map tiles and satellite imagery
  - Sign up at: https://www.mapbox.com/
  - Free tier: 50,000 map loads/month

#### Premium APIs (Optional)
- **RapidAPI**: Enhanced weather data
  - Sign up at: https://rapidapi.com/
  - Various pricing tiers available

### 4. Local Development
Simply open `index.html` in a web browser or serve it using a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (with http-server)
npm install -g http-server
http-server

# Using PHP
php -S localhost:8000
```

Navigate to `http://localhost:8000` in your browser.

## File Structure

```
tropicstracker.net/
├── index.html              # Main website file
├── config.js               # Configuration and API keys
├── weather-data.js         # Weather data integration module
├── noaa-api.js            # NOAA API client
├── README.md              # This file
├── LICENSE                # License file
└── docs/                  # Documentation
    ├── API.md             # API documentation
    └── DEPLOYMENT.md      # Deployment guide
```

## Data Sources

### Primary Sources
- **National Hurricane Center (NHC)**: https://www.nhc.noaa.gov/
- **NOAA Weather Service**: https://www.weather.gov/
- **Joint Typhoon Warning Center (JTWC)**: https://www.metoc.navy.mil/jtwc/

### Regional Centers
- **European Centre for Medium-Range Weather Forecasts**: https://www.ecmwf.int/
- **Japan Meteorological Agency**: https://www.jma.go.jp/
- **Australian Bureau of Meteorology**: http://www.bom.gov.au/
- **India Meteorological Department**: https://mausam.imd.gov.in/
- **Météo-France**: https://www.meteofrance.fr/

### Satellite Imagery
- **GOES-East/West**: NOAA geostationary satellites
- **Himawari**: Japanese weather satellite
- **Meteosat**: European weather satellite

## Features in Detail

### Storm Classification
- **Tropical Depression**: ≤ 38 mph winds
- **Tropical Storm**: 39-73 mph winds
- **Category 1**: 74-95 mph winds
- **Category 2**: 96-110 mph winds
- **Category 3**: 111-129 mph winds (Major Hurricane)
- **Category 4**: 130-156 mph winds (Major Hurricane)
- **Category 5**: ≥ 157 mph winds (Major Hurricane)

### Interactive Map Layers
- **Satellite**: Real-time satellite imagery
- **Radar**: Weather radar composite
- **Wind Speed**: Surface wind analysis
- **Pressure**: Sea level pressure analysis
- **Sea Surface Temperature**: Ocean temperature data

### Educational Content
- Hurricane formation and development
- Saffir-Simpson Hurricane Wind Scale
- Storm surge explanation and safety
- Preparation guidelines and evacuation planning
- Understanding forecast models and uncertainty

## Browser Compatibility

- **Chrome**: 88+ ✅
- **Firefox**: 85+ ✅
- **Safari**: 14+ ✅
- **Edge**: 88+ ✅
- **Mobile**: iOS Safari 14+, Android Chrome 88+ ✅

## Performance

- **Loading Time**: < 3 seconds on 3G connection
- **Data Updates**: Every 5 minutes for active storms
- **Cache**: Intelligent caching reduces API calls
- **Offline**: Basic functionality available offline

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **NOAA National Hurricane Center** for providing free, real-time hurricane data
- **OpenWeatherMap** for weather API services
- **Leaflet** for the interactive mapping library
- **Font Awesome** for icons
- **All the meteorologists** who track these storms and keep us safe

## Disclaimer

This website is for educational and informational purposes only. Always consult official sources like the National Hurricane Center, local National Weather Service offices, and local emergency management for official forecasts, warnings, and evacuation orders.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/tropicstracker.net/issues) page
2. Create a new issue if your problem isn't already reported
3. Contact us at: admin@tropicstracker.net

## Roadmap

- [ ] Push notifications for storm updates
- [ ] Historical storm database integration
- [ ] Advanced spaghetti model visualizations
- [ ] Storm impact predictions
- [ ] Social media integration
- [ ] Mobile app development
- [ ] API for third-party developers

---

**Stay safe and track smart! 🌀**