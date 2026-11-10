// Copia a exportação web (dist/) para dentro do projeto desktop.
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'dist');
const to = path.join(__dirname, '..', 'desktop', 'web');
if (!fs.existsSync(from)) {
  console.error('Pasta dist/ não encontrada. Rode "npm run build:web" antes.');
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('Versão web copiada para desktop/web');
