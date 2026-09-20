const https = require('https');

const LOCATION = {
    name: 'Kupwara, J&K',
    latitude: 34.52856,
    longitude: 74.26396
};

function iconForConditionId(id) {
    if (id >= 200 && id < 300) return { icon: '⛈️' };
    if (id >= 300 && id < 400) return { icon: '🌦️' };
    if (id >= 500 && id < 600) return { icon: '🌧️' };
    if (id >= 600 && id < 700) return { icon: '🌨️' };
    if (id >= 700 && id < 800) return { icon: '🌫️' };
    if (id === 800) return { icon: '☀️' };
    if (id === 801) return { icon: '🌤️' };
    if (id === 802) return { icon: '⛅' };
    if (id >= 803) return { icon: '☁️' };
    return { icon: '🌡️' };
}

function titleCase(str) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache = { data: null, fetchedAt: 0 };

function apiGet(path) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.openweathermap.org${path}`, (res) => {
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
                    reject(new Error(`openweathermap request failed: ${res.statusCode} ${body}`));
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
        `/data/2.5/weather?lat=${LOCATION.latitude}&lon=${LOCATION.longitude}`
        + `&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );

    const conditionId = data.weather && data.weather[0] ? data.weather[0].id : null;
    const description = data.weather && data.weather[0] ? data.weather[0].description : 'Unknown';
    const { icon } = iconForConditionId(conditionId);

    const result = {
        location: LOCATION.name,
        temperature: Math.round(data.main.temp),
        condition: titleCase(description),
        icon,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6) // m/s -> km/h
    };

    cache = { data: result, fetchedAt: now };
    return result;
}

module.exports = { getWeather };
