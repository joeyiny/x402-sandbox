const { readFileSync, writeFileSync, chmodSync } = require('fs');
const { join } = require('path');

const distPath = join(__dirname, '../dist/index.js');
const content = readFileSync(distPath, 'utf-8');

if (!content.startsWith('#!/usr/bin/env node')) {
  writeFileSync(distPath, '#!/usr/bin/env node\n' + content);
  chmodSync(distPath, 0o755);
  console.log('✓ Shebang added to dist/index.js');
}
