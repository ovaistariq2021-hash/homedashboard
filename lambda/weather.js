const https = require('https');

const LOCATION = {
    name: 'Kupwara, J&K',
    latitude: 34.52856,
    longitude: 74.26396
};

const WEATHER_CODES = {
    0: { label: 'Clear sky', icon: '☀️' },
    1: { label: 'Mostly clear', icon: '🌤️' },
    2: { label: 'Partly cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Fog', icon: '🌫️' },
    48: { label: 'Fog', icon: '🌫️' },
    51: { label: 'Light drizzle', icon: '🌦️' },
    53: { label: 'Drizzle', icon: '🌦️' },
    55: { label: 'Dense drizzle', icon: '🌦️' },
    61: { label: 'Light rain', icon: '🌧️' },
    63: { label: 'Rain', icon: '🌧️' },
    65: { label: 'Heavy rain', icon: '🌧️' },
    66: { label: 'Freezing rain', icon: '🌧️' },
    67: { label: 'Freezing rain', icon: '🌧️' },
    71: { label: 'Light snow', icon: '🌨️' },
    73: { label: 'Snow', icon: '🌨️' },
    75: { label: 'Heavy snow', icon: '🌨️' },
    77: { label: 'Snow grains', icon: '🌨️' },
    80: { label: 'Rain showers', icon: '🌦️' },
    81: { label: 'Rain showers', icon: '🌦️' },
    82: { label: 'Violent showers', icon: '⛈️' },
    85: { label: 'Snow showers', icon: '🌨️' },
    86: { label: 'Snow showers', icon: '🌨️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm', icon: '⛈️' },
    99: { label: 'Thunderstorm', icon: '⛈️' }
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache = { data: null, fetchedAt: 0 };

function apiGet(path) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.open-meteo.com${path}`, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(`open-meteo request failed: ${res.statusCode} ${body}`));
                }
            });
        }).on('error', reject);
    });
}

async function getWeather() {
    const now = Date.now();
    if (cache.data && (now - cache.fetchedAt) < CACHE_TTL_MS) {
        return cache.data;
    }

    const data = await apiGet(
        `/v1/forecast?latitude=${LOCATION.latitude}&longitude=${LOCATION.longitude}`
        + `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FKolkata`
    );

    const current = data.current || {};
    const codeInfo = WEATHER_CODES[current.weather_code] || { label: 'Unknown', icon: '🌡️' };

    const result = {
        location: LOCATION.name,
        temperature: Math.round(current.temperature_2m),
        condition: codeInfo.label,
        icon: codeInfo.icon,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m)
    };

    cache = { data: result, fetchedAt: now };
    return result;
}

module.exports = { getWeather };
