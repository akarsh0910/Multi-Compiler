const { spawn } = require('child_process');
const uuid = 'test_csharp';
const uniqueDir = require('path').join(__dirname, 'backend', 'temp', uuid);

const child = spawn('dotnet', ['run', '--project', uniqueDir]);

child.stdout.on('data', data => console.log('STDOUT:', data.toString()));
child.stderr.on('data', data => console.error('STDERR:', data.toString()));
child.on('error', err => console.error('ERROR:', err));
child.on('close', code => console.log('CLOSE:', code));
