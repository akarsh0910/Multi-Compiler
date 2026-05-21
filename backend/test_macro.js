let processedCode = `#include <stdio.h>\n#include <stdlib.h>\nint main() { if(1) printf("Hello"); else printf("World"); }`;
const includeMatches = [...processedCode.matchAll(/#include\s*[<"][^>"]+[>"]/g)];
if (includeMatches.length > 0) {
    const lastMatch = includeMatches[includeMatches.length - 1];
    const insertPos = lastMatch.index + lastMatch[0].length;
    processedCode = processedCode.slice(0, insertPos) + "\n#define printf(...) (printf(__VA_ARGS__), fflush(stdout))\n" + processedCode.slice(insertPos);
}
console.log(processedCode);
