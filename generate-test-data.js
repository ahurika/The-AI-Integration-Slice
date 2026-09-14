const fs = require('fs');
fs.writeFileSync('test-success.txt', 'This is a test note to prove structured extraction works.');
fs.writeFileSync('test-fail.txt', 'Make this fail validation by returning a broken JSON schema.');
console.log('Created test files.');
