const express = require('express');
const cors = require('cors');
const { executeCode, runInteractive } = require('./execute');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/execute', async (req, res) => {
    const { language, sourceCode, input } = req.body;

    if (!language || !sourceCode) {
        return res.status(400).json({ error: 'Language and source code are required' });
    }

    try {
        const result = await executeCode(language, sourceCode, input || '');
        res.json(result);
    } catch (error) {
        console.error('Execution Error:', error);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Backend is running' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    let processStarted = false;
    
    ws.on('message', (message) => {
        if (!processStarted) {
            try {
                const config = JSON.parse(message.toString());
                if (config.type === 'init') {
                    processStarted = true;
                    runInteractive(config.language, config.sourceCode, ws);
                }
            } catch (err) {
                try {
                    ws.send(`\x1b[31mInvalid initialization message.\x1b[0m\r\n`);
                    ws.close();
                } catch(e){}
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
