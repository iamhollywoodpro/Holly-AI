// Quick syntax check of the metamorphosis status route
const fs = require('fs');
const path = require('path');

const filePath = 'app/api/metamorphosis/status/route.ts';
const content = fs.readFileSync(filePath, 'utf8');

console.log('First 60 lines of metamorphosis/status/route.ts:');
console.log('='.repeat(60));
content.split('\n').slice(0, 60).forEach((line, i) => {
  console.log(`${String(i+1).padStart(3)}: ${line}`);
});
