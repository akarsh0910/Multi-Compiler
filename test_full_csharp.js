const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const uuid = 'test_csharp_' + Date.now();
const uniqueDir = path.join(__dirname, 'backend', 'temp', uuid);

fs.mkdirSync(uniqueDir, { recursive: true });

exec(`dotnet new console -n CSharpApp -o "${uniqueDir}"`, (err, stdout, stderr) => {
    if (err) {
        console.error("Exec error:", err);
        return;
    }
    
    fs.writeFileSync(path.join(uniqueDir, "Program.cs"), 'using System; class Program { static void Main() { Console.WriteLine("Hello from Backend test!"); } }');
    
    console.log("Successfully compiled. Running...");
    const child = spawn('dotnet', ['run', '--project', uniqueDir]);
    
    child.stdout.on('data', d => console.log('STDOUT:', d.toString()));
    child.stderr.on('data', d => console.log('STDERR:', d.toString()));
    child.on('close', code => console.log('EXIT:', code));
});
