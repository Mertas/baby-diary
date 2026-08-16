// Проверка версии Node перед запуском dev/start.
// better-sqlite3 — нативный модуль, собранный под конкретный ABI (Node 20 → NODE_MODULE_VERSION 115).
// Запуск под другой мажорной версией даёт непонятную ошибку при старте сервера — ловим её заранее.
const fs = require('fs');
const path = require('path');

const expectedMajor = 20;
let pinned = String(expectedMajor);
try {
  pinned = fs.readFileSync(path.join(__dirname, '..', '.nvmrc'), 'utf8').trim();
} catch { /* нет .nvmrc — используем expectedMajor */ }

const major = Number(process.versions.node.split('.')[0]);
if (major !== expectedMajor) {
  console.error(
    `\n[check-node] Неверная версия Node: ${process.versions.node} (нужна ${expectedMajor}.x, зафиксирована ${pinned}).\n` +
    `better-sqlite3 собран под Node ${expectedMajor} (ABI 115).\n\n` +
    `Исправьте одним из способов:\n` +
    `  1) переключите Node:  nvm use ${pinned}\n` +
    `     затем:             npm rebuild better-sqlite3\n` +
    `  2) или пересоберите модуль под текущий Node:\n` +
    `     node node_modules/prebuild-install/bin.js --directory node_modules/better-sqlite3\n`
  );
  process.exit(1);
}
