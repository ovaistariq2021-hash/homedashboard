const { getWeather } = require('./weather');
const { getClocks, getCurrentBackground } = require('./clock');

const CLOCK_TICK_MS = 15 * 1000;

async function buildDashboard() {
    const baseUrl = process.env.PUBLIC_BASE_URL;
    const [weather, clocks] = await Promise.all([
        getWeather().catch(() => null),
        Promise.resolve(getClocks())
    ]);

    const datasource = {
        dashboard: {
            backgroundVideo: getCurrentBackground(baseUrl),
            clocks,
            weather: weather
                ? {
                    icon: weather.icon,
                    temperature: `${weather.temperature}°C`,
                    condition: weather.condition,
                    location: weather.location,
                    detail: `Humidity ${weather.humidity}%  •  Wind ${weather.windSpeed} km/h`
                }
                : {
                    icon: '🌡️',
                    temperature: '--',
                    condition: 'Weather unavailable',
                    location: '',
                    detail: ''
                },
            nextPollMs: CLOCK_TICK_MS
        }
    };

    return { datasource };
}

module.exports = { buildDashboard };
