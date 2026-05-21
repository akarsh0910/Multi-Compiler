const { executeCode } = require('./execute');
const fs = require('fs');

async function test() {
    try {
        const result = await executeCode('python', 'print("Hello, World!")');
        console.log("Success:", result);
    } catch (e) {
        fs.writeFileSync('error.log', e.message);
    }
}
test();
