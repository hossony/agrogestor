/**
 * Testes de interface (frontend) com Playwright sobre a versão web exportada.
 * Antes: npx expo export --platform web   (gera dist/)
 * Rodar: npm run test:e2e
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIST = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.ttf': 'font/ttf' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = path === '/' ? '/index.html' : path;
  try {
    const body = await readFile(join(DIST, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(200, { 'content-type': 'text/html' }).end(await readFile(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(0, r));
const URL = `http://localhost:${server.address().port}`;

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`not ok - ${name}\n  ${String(e?.message ?? e).split('\n').slice(0, 6).join('\n  ')}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch();
const errors = [];

async function newPage(viewport = { width: 1366, height: 860 }, context) {
  const ctx = context ?? (await browser.newContext({ viewport }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(URL);
  await p.getByText('Entrar', { exact: true }).first().waitFor();
  return p;
}
const visible = (p, text, exact = false) => p.getByText(text, { exact }).first().isVisible();

async function register(p, name, user, pass, confirm = pass) {
  await p.getByRole('tab', { name: 'Criar conta' }).click();
  await p.getByLabel('Seu nome').fill(name);
  await p.getByLabel('Usuário').fill(user);
  await p.getByLabel('Senha', { exact: true }).fill(pass);
  await p.getByLabel('Confirme a senha').fill(confirm);
  await p.getByRole('button', { name: 'Criar conta' }).click();
}
async function login(p, user, pass) {
  await p.getByLabel('Usuário').fill(user);
  await p.getByLabel('Senha', { exact: true }).fill(pass);
  await p.getByRole('button', { name: 'Entrar' }).click();
}
async function createSave(p, { map, mode = 'Novo fazendeiro', farm, mapName }) {
  await p.getByRole('radio', { name: map }).click();
  if (mapName) await p.getByLabel('Nome do mapa').fill(mapName);
  await p.getByText('Continuar').click();
  await p.getByRole('radio', { name: mode }).click();
  await p.getByText('Continuar').click();
  await p.getByLabel('Nome da fazenda').fill(farm);
  await p.getByText('Continuar').click();
  await p.getByText('Criar save e começar').click();
  await p.getByLabel('Pular tutorial').click();
  await p.waitForTimeout(400);
}
async function goto(p, label) {
  await p.getByText(label, { exact: true }).first().click();
  await p.waitForTimeout(500);
}

await test('login recusa conta que não existe', async () => {
  const p = await newPage();
  await login(p, 'ninguem', 'qualquer1');
  await p.getByText('Usuário ou senha incorretos').waitFor({ timeout: 3000 });
  await p.context().close();
});

await test('cadastro valida senha e confirmação', async () => {
  const p = await newPage();
  await register(p, 'Ana', 'ana', '123', '123');
  await p.getByText('pelo menos 6 caracteres').waitFor({ timeout: 3000 });
  await p.getByLabel('Senha', { exact: true }).fill('segredo1');
  await p.getByLabel('Confirme a senha').fill('outra123');
  await p.getByRole('button', { name: 'Criar conta' }).click();
  await p.getByText('As senhas não conferem').waitFor({ timeout: 3000 });
  await p.context().close();
});

const ctxA = await browser.newContext({ viewport: { width: 1366, height: 860 } });

await test('cadastro abre o assistente de novo save e Riverbend carrega a fazenda inicial', async () => {
  const p = await newPage(undefined, ctxA);
  await register(p, 'Ana Souza', 'ana.souza', 'segredo1');
  await p.getByText('Passo 1 de 4').waitFor();
  await createSave(p, { map: 'Riverbend Springs', farm: 'Rancho Ana' });
  assert(await visible(p, 'Rancho Ana'), 'nome da fazenda no painel');
  assert(await visible(p, 'Caixa estimado'), 'caixa estimado no painel');
  assert(await visible(p, '$ 100.000'), 'dinheiro inicial');
  await goto(p, 'Talhões');
  for (const n of [1, 2, 3, 4, 5]) assert(await visible(p, `Lote ${n}`, true), `Lote ${n}`);
  assert(await visible(p, 'Informe a área'), 'aviso de área a informar');
  await goto(p, 'Frota');
  assert(await visible(p, 'Massey Ferguson MF 8570'), 'colheitadeira inicial');
  assert(await visible(p, 'Challenger MT635'), 'trator inicial');
  await goto(p, 'Animais');
  assert(await visible(p, 'Pasto das vacas'), 'vacas iniciais');
  await goto(p, 'Avisos');
  assert(await visible(p, 'Colher trigo'), 'aviso de colheita do trigo');
  await p.close();
});

await test('dados e sessão continuam depois de recarregar', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await p.getByText('Rancho Ana').first().waitFor({ timeout: 6000 });
  await p.close();
});

await test('Hutan Pantai traz 3 arrozais prontos e máquinas de arroz', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await p.getByText('Trocar de save').click();
  await p.getByText('Novo save').click();
  await createSave(p, { map: 'Hutan Pantai', farm: 'Sawah Ana' });
  await goto(p, 'Safras');
  assert((await p.getByText('Arroz', { exact: true }).count()) >= 3, '3 lavouras de arroz');
  await goto(p, 'Frota');
  assert(await visible(p, 'Iseki HJ6130'), 'colheitadeira de arroz');
  await p.close();
});

await test('Gerente de fazenda começa sem terra e com o dinheiro escolhido', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await p.getByText('Trocar de save').click();
  await p.getByText('Novo save').click();
  await p.getByRole('radio', { name: 'Zielonka' }).click();
  await p.getByText('Continuar').click();
  await p.getByRole('radio', { name: 'Gerente de fazenda' }).click();
  await p.getByText('Continuar').click();
  await p.getByLabel('Nome da fazenda').fill('Gerente Ana');
  await p.getByLabel('Dinheiro inicial').fill('2500000');
  await p.getByText('Continuar').click();
  assert(await visible(p, 'Neste modo o jogo não dá terra'), 'resumo sem fazenda inicial');
  await p.getByText('Criar save e começar').click();
  await p.getByLabel('Pular tutorial').click();
  assert(await visible(p, '$ 2.500.000'), 'dinheiro escolhido');
  await goto(p, 'Talhões');
  assert(await visible(p, 'Nenhum talhão cadastrado'), 'sem talhões');
  await p.close();
});

await test('mapa de mod começa vazio e exige o nome do mapa', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await p.getByText('Trocar de save').click();
  await p.getByText('Novo save').click();
  await p.getByRole('radio', { name: 'Outro mapa ou mod' }).click();
  await p.getByText('Continuar').click();
  assert(await visible(p, 'Digite o nome do mapa'), 'validação do nome do mapa');
  await p.getByLabel('Nome do mapa').fill('Mapa Brasil');
  await p.getByText('Continuar').click();
  await p.getByRole('radio', { name: 'Novo fazendeiro' }).click();
  await p.getByText('Continuar').click();
  await p.getByLabel('Nome da fazenda').fill('Mod Ana');
  await p.getByText('Continuar').click();
  await p.getByText('Criar save e começar').click();
  await p.getByLabel('Pular tutorial').click();
  await goto(p, 'Frota');
  assert(!(await visible(p, 'Massey Ferguson MF 8570')), 'sem máquinas no mapa de mod');
  await p.close();
});

await test('lista de saves: 4 saves, renomear e excluir', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await p.getByText('Trocar de save').click();
  await p.getByText('Seus saves').waitFor();
  assert((await p.getByLabel(/^Abrir save /).count()) === 4, '4 saves');
  await p.getByLabel('Excluir Mod Ana').click();
  await p.getByText('Excluir save', { exact: true }).click();
  await p.waitForTimeout(400);
  assert((await p.getByLabel(/^Abrir save /).count()) === 3, '3 saves depois de excluir');
  await p.getByLabel('Renomear Gerente Ana').click();
  await p.locator('input').last().fill('Carreira difícil');
  await p.getByText('Salvar', { exact: true }).click();
  await p.getByText('Carreira difícil').waitFor({ timeout: 3000 });
  await p.getByLabel('Abrir save Rancho Ana').click();
  await p.getByText('Caixa estimado').waitFor();
  await p.close();
});

await test('sair e entrar de novo volta ao último save; outra conta não vê os saves', async () => {
  const p = await ctxA.newPage();
  await p.goto(URL);
  await goto(p, 'Ajustes');
  await p.getByText('Sair da conta').click();
  await register(p, 'Beto', 'beto', 'senhaBeto1');
  await p.getByText('Passo 1 de 4').waitFor();
  await p.getByText('Cancelar').click();
  assert(await visible(p, 'Nenhum save ainda'), 'Beto sem saves');
  await p.getByLabel('Sair da conta').click();
  await login(p, 'ANA.SOUZA', 'segredo1');
  await p.getByText('Rancho Ana').first().waitFor({ timeout: 5000 });
  await p.close();
});

await test('celular: cadastro e save de Zielonka com lotes 45 e 46', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await newPage(undefined, ctx);
  await register(p, 'Caio', 'caio', 'segredo9');
  await createSave(p, { map: 'Zielonka', farm: 'Zagroda' });
  await p.getByText('Mais', { exact: true }).click();
  await p.getByText('Talhões', { exact: true }).click();
  await p.waitForTimeout(500);
  assert(await visible(p, 'Lote 45'), 'lote 45');
  assert(await visible(p, 'Lote 46'), 'lote 46');
  await p.screenshot({ path: 'tests/e2e-mobile.png' });
  await ctx.close();
});

await ctxA.close();
await browser.close();
server.close();

const relevant = errors.filter((e) => !/favicon/i.test(e));
if (relevant.length) {
  failures.push('erros no console');
  console.log('not ok - erros no console:\n  ' + relevant.slice(0, 8).join('\n  '));
}
console.log(`\n${passed} passaram, ${failures.length} falharam`);
process.exit(failures.length ? 1 : 0);
