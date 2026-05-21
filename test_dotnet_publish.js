const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const uuid = 'test_hanging_' + Date.now();
const uniqueDir = path.join(__dirname, 'backend', 'temp', uuid);

fs.mkdirSync(uniqueDir, { recursive: true });

exec(`dotnet new console -n CSharpApp -o "${uniqueDir}"`, (err, stdout, stderr) => {
    if (err) {
        console.error("Init Error:", err);
        return;
    }
    
    fs.writeFileSync(path.join(uniqueDir, "Program.cs"), 'using System; class Program { static void Main() { Console.WriteLine("Hello!"); } }');
    
    console.log("Compiling...");
    const child = spawn('dotnet', ['publish', uniqueDir, '-c', 'Release', '-o', path.join(uniqueDir, 'out')]);
    
    child.stdout.on('data', d => console.log('STDOUT:', d.toString()));
    child.stderr.on('data', d => console.log('STDERR:', d.toString()));
    child.on('close', code => console.log('EXIT:', code));
});
