const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const uuid = 'test_build';
const uniqueDir = path.join(__dirname, 'backend', 'temp', uuid);

fs.mkdirSync(uniqueDir, { recursive: true });

exec(`dotnet new console -n CSharpApp -o "${uniqueDir}"`, () => {
    fs.writeFileSync(path.join(uniqueDir, "Program.cs"), 'using System; class Program { static void Main() { Console.WriteLine("Hello!"); } }');
    exec(`dotnet build "${uniqueDir}" -c Release`, (err, stdout, stderr) => {
        let files = [];
        try { files = fs.readdirSync(path.join(uniqueDir, 'bin', 'Release')); } catch(e){}
        console.log("Release folders:", files.join(', '));
        
        const netDir = path.join(uniqueDir, 'bin', 'Release', files[0] || 'net8.0');
        let exes = [];
        try { exes = fs.readdirSync(netDir).filter(f => f.endsWith('.exe') || f.endsWith('.dll')); } catch (e) {}
        console.log("Built binaries:", exes.join(', '));
    });
});
