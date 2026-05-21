const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000/');
ws.on('open', () => {
    console.log("Connected...");
    ws.send(JSON.stringify({
        type: 'init',
        language: 'c',
        sourceCode: '#include <stdio.h>\nint main() { printf("Hello C\\n"); return 0; }'
    }));
});
ws.on('message', (data) => console.log('RCV:', data.toString()));
ws.on('error', (err) => console.error(err));
ws.on('close', () => console.log('Closed'));
