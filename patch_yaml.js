const fs = require('fs');
let code = fs.readFileSync('codemagic.yaml', 'utf8');

code = code.replace(/      - name: Generate clean assets[\s\S]*?(?=      - name: Run Expo prebuild)/g, '');

fs.writeFileSync('codemagic.yaml', code);
