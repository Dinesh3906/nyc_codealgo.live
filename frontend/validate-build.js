const fs = require('fs');
const path = require('path');

const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');

if (!fs.existsSync(buildIdPath)) {
  console.error('\n======================================================================');
  console.error('FATAL ERROR: Could not find a production build in the \'.next\' directory.');
  console.error('Please run \'npm run build\' before starting the production server.');
  console.error('======================================================================\n');
  process.exit(1);
}

console.log('Frontend build validation passed. BUILD_ID:', fs.readFileSync(buildIdPath, 'utf8').trim());
process.exit(0);
