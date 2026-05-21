const { exec } = require('child_process');
const fs = require('fs');

let processedCode = `#include <stdio.h>\n#include <stdlib.h>\nint main() { if(1) printf("Hello"); else printf("World"); }`;

const includeMatches = [...processedCode.matchAll(/#include\s*[<"][^>"]+[>"]/g)];
if (includeMatches.length > 0) {
    const lastMatch = includeMatches[includeMatches.length - 1];
    const insertPos = lastMatch.index + lastMatch[0].length;
    processedCode = processedCode.slice(0, insertPos) + "\n#define printf(...) (printf(__VA_ARGS__), fflush(stdout))\n" + processedCode.slice(insertPos);
}

fs.writeFileSync("test_macro.c", processedCode);
exec("gcc test_macro.c -o test_macro.exe", (err, stdout, stderr) => {
    if(err) console.error(err, stderr);
    else console.log("Compiled perfectly!");
});
