const ZONES = [
    { label: 'Srinagar / IST', timeZone: 'Asia/Kolkata' },
    { label: 'San Francisco', timeZone: 'America/Los_Angeles' }
];

const BACKGROUNDS = [
    { file: 'skyline_1.mp4' },
    { file: 'skyline_2.mp4' }
];

const ROTATION_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

function formatZoneTime(timeZone) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const date = now.toLocaleDateString('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    return { time, date };
}

function getClocks() {
    return ZONES.map((zone) => ({
        label: zone.label,
        ...formatZoneTime(zone.timeZone)
    }));
}

function getCurrentBackground(baseUrl) {
    const slot = Math.floor(Date.now() / ROTATION_INTERVAL_MS) % BACKGROUNDS.length;
    return `${baseUrl}/assets/${BACKGROUNDS[slot].file}`;
}

module.exports = { getClocks, getCurrentBackground };
