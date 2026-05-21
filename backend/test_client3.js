const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000/');
ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'init',
        language: 'c',
        sourceCode: `#include <stdio.h>\n\nint main() {\n    int num1, num2;\n    printf("Enter 1st number: "); fflush(stdout); \n    scanf("%d", &num1);\n    printf("Enter 2nd number: "); fflush(stdout);\n    scanf("%d", &num2);\n    printf("Result is: %d\\n", num1 + num2); fflush(stdout);\n    return 0;\n}`
    }));
});
ws.on('message', (data) => console.log('RCV:', data.toString()));
ws.on('error', (err) => console.error(err));
