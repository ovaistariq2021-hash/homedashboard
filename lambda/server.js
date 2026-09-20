const express = require('express');
const path = require('path');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const { skillBuilder } = require('./index');

const app = express();
const skill = skillBuilder.create();
const verifyRequests = process.env.DISABLE_VERIFICATION !== 'true';
const adapter = new ExpressAdapter(skill, verifyRequests, verifyRequests);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.post('/', (req, res, next) => {
    const start = Date.now();
    console.log(`Incoming POST / at ${new Date().toISOString()}`);
    res.on('finish', () => {
        console.log(`Responded ${res.statusCode} after ${Date.now() - start}ms`);
    });
    next();
}, adapter.getRequestHandlers());

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err && err.stack ? err.stack : err);
});

app.get('/', (req, res) => {
    res.status(200).send('Home Dashboard skill endpoint is running.');
});

app.get('/debug', async (req, res) => {
    const { buildDashboard } = require('./dashboard');
    try {
        const { datasource } = await buildDashboard();
        res.json({ publicBaseUrl: process.env.PUBLIC_BASE_URL || null, datasource });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Home Dashboard skill listening on port ${port}`);
});
