// Exporta o app de gestão (Expo, na raiz do repositório) para web/public/gestao,
// servido em /gestao no mesmo domínio do site. Assim os saves criados lá ficam
// no mesmo navegador e a tela "Minha fazenda" consegue publicá-los.
// Se a exportação falhar, o site continua sendo publicado (só sem /gestao).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(web, '..');
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, EXPO_BASE_URL: '/gestao', CI: '1' } });

try {
  if (!existsSync(join(root, 'app.json'))) throw new Error('app.json do app de gestão não encontrado na raiz do repositório.');
  if (!existsSync(join(root, 'node_modules'))) run('npm ci --no-audit --no-fund', root);
  run('npx expo export --platform web --output-dir dist-gestao', root);
  const to = join(web, 'public', 'gestao');
  rmSync(to, { recursive: true, force: true });
  cpSync(join(root, 'dist-gestao'), to, { recursive: true });
  console.log('App de gestão copiado para web/public/gestao');
} catch (e) {
  console.warn(`[gestao] Não foi possível exportar o app de gestão: ${e.message}`);
  console.warn('[gestao] O site será publicado sem /gestao.');
}
