const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

function safeWsSend(ws, data) {
    if (ws && ws.readyState === 1) { // 1 means OPEN
        try {
            ws.send(data);
        } catch (e) {
            console.error("WebSocket send error:", e.message);
        }
    }
}

function runInteractive(language, code, ws) {
    const uuid = Math.random().toString(36).substring(7);
    let command = '';
    let args = [];
    let filePath = '';
    let executablePath = '';

    language = language.toLowerCase();

    try {
        if (language === 'javascript' || language === 'js') {
            const uniqueDir = path.join(TEMP_DIR, uuid);
            fs.mkdirSync(uniqueDir, { recursive: true });
            filePath = path.join(uniqueDir, `script.js`);
            command = 'node';
            args = [filePath];
            fs.writeFileSync(filePath, code);
            safeWsSend(ws, `\x1b[32mRunning Javascript process...\x1b[0m\r\n\r\n`);
            spawnProcess(command, args, ws, [uniqueDir], uniqueDir);
            return;
        } else if (language === 'python' || language === 'py') {
            const uniqueDir = path.join(TEMP_DIR, uuid);
            fs.mkdirSync(uniqueDir, { recursive: true });
            filePath = path.join(uniqueDir, `script.py`);
            command = 'python';
            args = ['-u', filePath];
            
            // Inject headless Agg backend so matplotlib generates images instead of trying to physically open an interactive GUI window
            let pythonSetupCode = `import sys\ntry:\n    import matplotlib\n    matplotlib.use('Agg')\n    import matplotlib.pyplot\n    def _mock_show(*args, **kwargs):\n        matplotlib.pyplot.savefig('plot.png')\n    matplotlib.pyplot.show = _mock_show\nexcept Exception:\n    pass\n\n`;
            fs.writeFileSync(filePath, pythonSetupCode + code);
            safeWsSend(ws, `\x1b[32mRunning Python process...\x1b[0m\r\n\r\n`);
            spawnProcess(command, args, ws, [uniqueDir], uniqueDir);
            return;
        } else {
            safeWsSend(ws, `\x1b[31mUnsupported language: ${language}\x1b[0m\r\n\x1b[33mSupported languages: Python, JavaScript\x1b[0m\r\n`);
            if (ws.readyState === 1) ws.close();
            return;
        }
    } catch (err) {
        safeWsSend(ws, `\x1b[31mFailed to start process:\x1b[0m\r\n${err.message}\r\n`);
        if (ws.readyState === 1) ws.close();
    }
}

function spawnProcess(command, args, ws, filesToCleanup, cwd = null) {
    let child;
    try {
        child = spawn(command, args, cwd ? { cwd } : {});
    } catch(e) {
        safeWsSend(ws, `\x1b[31mError spawning process: ${e.message}\x1b[0m\r\n`);
        if (ws.readyState === 1) ws.close();
        return;
    }

    child.on('error', (err) => {
        safeWsSend(ws, `\x1b[31mProcess error: ${err.message}\x1b[0m\r\n`);
    });

    child.stdout.on('data', (data) => {
        const output = data.toString().replace(/\n/g, '\r\n');
        safeWsSend(ws, output);
    });

    child.stderr.on('data', (data) => {
        const errStr = data.toString().replace(/\n/g, '\r\n');
        safeWsSend(ws, `\x1b[31m${errStr}\x1b[0m`);
    });

    ws.on('message', (msg) => {
        try {
            if (child.stdin && child.stdin.writable) {
                child.stdin.write(msg);
            }
        } catch(e) {
            console.error("Stdin write error:", e.message);
        }
    });

    child.on('close', (code) => {
        safeWsSend(ws, `\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`);
        
        // Scan for natively generated plot images
        if (cwd && fs.existsSync(cwd)) {
            try {
                const files = fs.readdirSync(cwd);
                files.forEach(file => {
                    if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.svg')) {
                        const imgPath = path.join(cwd, file);
                        const base64 = fs.readFileSync(imgPath).toString('base64');
                        const ext = file.split('.').pop().toLowerCase();
                        safeWsSend(ws, "__CODEXA_IMAGE__:" + file + ":image/" + (ext === 'svg' ? 'svg+xml' : ext) + ":" + base64 + "\n");
                    }
                });
            } catch(e) {}
        }

        cleanup(filesToCleanup);
        if (ws.readyState === 1) ws.close();
    });

    ws.on('close', () => {
        try {
            if (!child.killed) {
                child.kill('SIGKILL');
            }
        } catch(e){}
        cleanup(filesToCleanup);
    });
}

function cleanup(files = []) {
    files.forEach(f => {
        try { 
            if (fs.existsSync(f)) {
                if (fs.lstatSync(f).isDirectory()) {
                    fs.rmSync ? fs.rmSync(f, { recursive: true, force: true }) : fs.rmdirSync(f, { recursive: true });
                } else {
                    fs.unlinkSync(f);
                }
            } 
        } catch (e) {}
    });
}

// Keep executeCode for backward compatibility
async function executeCode() {
    throw new Error('This endpoint has been deprecated in favor of WebSockets.');
}

module.exports = {
    executeCode,
    runInteractive
};