const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

let depth = 0;
let lineNum = 0;
let inString = false;
let stringChar = '';
let inTemplate = false;

for (const line of lines) {
    lineNum++;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        // Handle strings
        if (!inTemplate && (char === '"' || char === "'")) {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
            }
            continue;
        }
        
        // Handle template literals
        if (!inString && char === '`') {
            inTemplate = !inTemplate;
            continue;
        }
        
        if (inString || inTemplate) continue;
        
        // Skip single-line comments
        if (char === '/' && line[i+1] === '/') break;
        
        if (char === '{') depth++;
        if (char === '}') depth--;
    }
    
    // Show depth around where it increases (potential unclosed blocks)
    if (lineNum >= 5500 && lineNum <= 5650) {
        console.log(`Line ${lineNum}: depth=${depth} ${line.substring(0, 70)}`);
    }
}

console.log('\nFinal depth:', depth);
