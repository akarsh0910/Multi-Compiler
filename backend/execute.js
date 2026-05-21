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
        } else if (language === 'java') {
            const uniqueDir = path.join(TEMP_DIR, uuid);
            fs.mkdirSync(uniqueDir, { recursive: true });
            
            const classMatch = code.match(/public\s+class\s+([a-zA-Z_$][a-zA-Z\d_$]*)/) || code.match(/class\s+([a-zA-Z_$][a-zA-Z\d_$]*)/);
            const className = classMatch ? classMatch[1] : 'Main';
            
            filePath = path.join(uniqueDir, `${className}.java`);
            
            fs.writeFileSync(filePath, code);
            safeWsSend(ws, `\x1b[33mCompiling...\x1b[0m\r\n`);
            
            exec(`javac "${filePath}"`, (err, stdout, stderr) => {
                if (err) {
                    safeWsSend(ws, `\x1b[31mCompilation Error (Is Java JDK installed?):\x1b[0m\r\n${stderr.replace(/\n/g, '\r\n')}\r\n`);
                    cleanup([uniqueDir]);
                    if (ws.readyState === 1) ws.close();
                    return;
                }
                safeWsSend(ws, `\x1b[32mSuccessfully compiled. Running...\x1b[0m\r\n\r\n`);
                spawnProcess('java', ['-cp', uniqueDir, className], ws, [uniqueDir]);
            });
            return;
        } else if (language === 'csharp' || language === 'c#') {
            const uniqueDir = path.join(TEMP_DIR, uuid);
            fs.mkdirSync(uniqueDir, { recursive: true });
            
            safeWsSend(ws, `\x1b[33mInitializing C# project...\x1b[0m\r\n`);
            
            exec(`dotnet new console -n CSharpApp -o "${uniqueDir}"`, (err, stdout, stderr) => {
                if (err) {
                    safeWsSend(ws, `\x1b[31mFailed to init C# project (Is .NET SDK installed?):\x1b[0m\r\n${stderr.replace(/\n/g, '\r\n')}\r\n`);
                    cleanup([uniqueDir]);
                    if (ws.readyState === 1) ws.close();
                    return;
                }
                
                // Replace generated Program.cs with user code
                fs.writeFileSync(path.join(uniqueDir, "Program.cs"), code);
                
                safeWsSend(ws, `\x1b[33mCompiling (C# takes a few seconds purely for the first run)...\x1b[0m\r\n`);
                
                exec(`dotnet publish "${uniqueDir}" -c Release -o "${path.join(uniqueDir, 'out')}"`, (err2, stdout2, stderr2) => {
                    if (err2) {
                        safeWsSend(ws, `\x1b[31mCompilation Error:\x1b[0m\r\n${stderr2.replace(/\n/g, '\r\n')}\r\n`);
                        cleanup([uniqueDir]);
                        if (ws.readyState === 1) ws.close();
                        return;
                    }
                    
                    safeWsSend(ws, `\x1b[32mSuccessfully compiled. Running...\x1b[0m\r\n\r\n`);
                    const exePath = path.join(uniqueDir, 'out', 'CSharpApp.exe');
                    spawnProcess(exePath, [], ws, [uniqueDir]);
                });
            });
            return;
        } else if (language === 'c' || language === 'c++' || language === 'cpp') {
            const isCpp = language === 'c++' || language === 'cpp';
            const ext = isCpp ? '.cpp' : '.c';
            filePath = path.join(TEMP_DIR, `${uuid}${ext}`);
            executablePath = path.join(TEMP_DIR, `${uuid}.exe`);
            
            // Unbuffer C/C++ stdout dynamically so interactive prompts show up immediately
            let processedCode = code;
            if (processedCode.includes('int main') || processedCode.includes('void main')) {
                if (isCpp) {
                    if (!processedCode.includes('<iostream>')) {
                        processedCode = "#include <iostream>\n" + processedCode;
                    }
                    processedCode = processedCode.replace(/(int\s+main\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/, "$1\n    std::cout << std::unitbuf;\n");
                } else {
                    if (!processedCode.includes('<stdio.h>')) {
                        processedCode = "#include <stdio.h>\n" + processedCode;
                    }
                    
                    // Safely explicitly unbuffer stdout using a C preprocessor macro to avoid AST structural breaks in complex C code
                    const includeMatches = [...processedCode.matchAll(/#include\s*[<"][^>"]+[>"]/g)];
                    if (includeMatches.length > 0) {
                        const lastMatch = includeMatches[includeMatches.length - 1];
                        const insertPos = lastMatch.index + lastMatch[0].length;
                        processedCode = processedCode.slice(0, insertPos) + "\n#define printf(...) (printf(__VA_ARGS__), fflush(stdout))\n" + processedCode.slice(insertPos);
                    } else {
                        processedCode = "#define printf(...) (printf(__VA_ARGS__), fflush(stdout))\n" + processedCode;
                    }
                }
            }
            
            // DEBUG DUMP:
            fs.writeFileSync(path.join(TEMP_DIR, "debug_c_code.c"), processedCode);

            fs.writeFileSync(filePath, processedCode);
            const compiler = isCpp ? 'g++' : 'gcc';
            safeWsSend(ws, `\x1b[33mCompiling...\x1b[0m\r\n`);
            
            exec(`${compiler} "${filePath}" -o "${executablePath}"`, (err, stdout, stderr) => {
                if (err) {
                    safeWsSend(ws, `\x1b[31mCompilation Error:\x1b[0m\r\n${stderr.replace(/\n/g, '\r\n')}\r\n`);
                    cleanup([filePath, executablePath]);
                    if (ws.readyState === 1) ws.close();
                    return;
                }
                safeWsSend(ws, `\x1b[32mSuccessfully compiled. Running...\x1b[0m\r\n\r\n`);
                spawnProcess(executablePath, [], ws, [filePath, executablePath]);
            });
            return;
        } else {
            safeWsSend(ws, `\x1b[31mUnsupported language: ${language}\x1b[0m\r\n`);
            if (ws.readyState === 1) ws.close();
            return;
        }

        fs.writeFileSync(filePath, code);
        safeWsSend(ws, `\x1b[32mRunning ${language} process...\x1b[0m\r\n\r\n`);
        spawnProcess(command, args, ws, [filePath]);

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