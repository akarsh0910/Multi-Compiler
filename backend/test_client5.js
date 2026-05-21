const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000/');
ws.on('open', () => {
    let sourceCode = `#include <stdio.h>\n\nint main() {\n    int num1, num2;\n    printf("Enter 1st number: ");\n    scanf("%d", &num1);\n    printf("Enter 2nd number: ");\n    scanf("%d", &num2);\n    printf("Result is: %d\\n", num1 + num2);\n    return 0;\n}`;
    sourceCode = sourceCode.replace(/(printf\s*\([^;]+;\s*)/g, "$1 fflush(stdout); ");
    ws.send(JSON.stringify({
        type: 'init',
        language: 'c',
        sourceCode: sourceCode
    }));
});
ws.on('message', (data) => console.log('RCV:', data.toString()));
ws.on('error', (err) => console.error(err));
