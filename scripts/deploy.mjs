#!/usr/bin/env node
/**
 * Publica o site na Hostinger por SSH.
 *
 *   npm run deploy            gera o build e publica
 *   npm run deploy -- --sem-build   publica o dist que já existe
 *   npm run deploy -- --testar      só testa a conexão e mostra a pasta do site
 *   npm run deploy -- --voltar      restaura o backup da publicação anterior
 *
 * Dados de acesso (fora do repositório e do OneDrive), em
 * ~/.oonsystems-deploy.json:
 *   { "host": "1.2.3.4", "porta": 65002, "usuario": "u123456789",
 *     "pasta": "domains/oonsystems.com.br/public_html",
 *     "chave": "~/.ssh/hostinger_oonsystems" }
 *
 * No servidor: guarda um backup do site atual (os 5 últimos) e copia o dist
 * novo por cima. Os arquivos antigos de assets ficam 30 dias (quem está com o
 * painel aberto na versão anterior ainda acha as telas). Arquivos que não vêm do dist
 * (ex.: .well-known) continuam lá.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const args = new Set(process.argv.slice(2))
const raiz = resolve(import.meta.dirname, '..')
const arquivoConfig = join(homedir(), '.oonsystems-deploy.json')

function sair(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

function rodar(cmd, params, opcoes = {}) {
  const r = spawnSync(cmd, params, { stdio: 'inherit', cwd: raiz, shell: false, ...opcoes })
  if (r.error) sair(`Não foi possível executar ${cmd}: ${r.error.message}`)
  if (r.status !== 0) sair(`${cmd} terminou com erro (código ${r.status}).`)
}

if (!existsSync(arquivoConfig)) sair(`Crie ${arquivoConfig} com host, porta, usuario e pasta (veja o topo deste script).`)
const cfg = JSON.parse(readFileSync(arquivoConfig, 'utf8'))
for (const campo of ['host', 'usuario', 'pasta']) if (!cfg[campo]) sair(`Falta "${campo}" em ${arquivoConfig}.`)
if (/^\/?$|^\.\.?$/.test(cfg.pasta.trim())) sair('A "pasta" do site não pode ser a raiz.')

const chave = (cfg.chave ?? '~/.ssh/hostinger_oonsystems').replace(/^~/, homedir())
const porta = String(cfg.porta ?? 65002)
const destino = `${cfg.usuario}@${cfg.host}`
const opcoesSsh = ['-i', chave, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20']
const ssh = (script) => rodar('ssh', [...opcoesSsh, '-p', porta, destino, script])
const aspas = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`

// Caminho absoluto: relativo à home do usuário quando não começa com /
const SITE = cfg.pasta.startsWith('/') ? aspas(cfg.pasta) : `"$HOME/"${aspas(cfg.pasta)}`
const TMP = '"$HOME/.deploy-oonsystems"'

if (args.has('--testar')) {
  console.log(`→ Conectando em ${destino} (porta ${porta})...`)
  ssh(`set -e; echo "Conectado como $(whoami) em $(hostname)"; cd ${SITE}; echo "Pasta do site: $(pwd)"; ls -la | head -20`)
  console.log('\n✔ Conexão funcionando.')
  process.exit(0)
}

if (args.has('--voltar')) {
  console.log('→ Restaurando o backup da publicação anterior...')
  ssh(`set -e; ULTIMO=$(ls -1t ${TMP}/backups/site-*.tar.gz 2>/dev/null | head -1); [ -n "$ULTIMO" ] || { echo "Nenhum backup encontrado"; exit 1; }
    echo "Backup: $ULTIMO"; rm -rf ${SITE}/assets; tar -xzf "$ULTIMO" -C ${SITE}; mv "$ULTIMO" "$ULTIMO.restaurado"`)
  console.log('\n✔ Site restaurado. Recarregue com Ctrl+F5.')
  process.exit(0)
}

// 1. Build
if (!args.has('--sem-build')) {
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: raiz, encoding: 'utf8' }).stdout?.trim()
  if (status) console.warn('⚠ Há alterações sem commit: o site vai sair com elas.\n')
  console.log('→ Gerando o build...')
  rmSync(join(raiz, 'dist'), { recursive: true, force: true })
  rodar(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { shell: process.platform === 'win32' })
}
if (!existsSync(join(raiz, 'dist', 'index.html'))) sair('dist/index.html não existe. Rode o build.')
if (!existsSync(join(raiz, 'dist', '.htaccess'))) sair('dist/.htaccess não existe: sem ele as rotas dão 404.')

// 2. Pacote (caminhos relativos: o tar do Git lê "C:" como servidor remoto)
const NOME_PACOTE = 'deploy-dist.tar.gz'
const pacote = join(raiz, NOME_PACOTE)
console.log('→ Compactando o dist...')
rmSync(pacote, { force: true })
rodar('tar', ['-czf', NOME_PACOTE, '-C', 'dist', '.'])

// 3. Envio
console.log(`→ Enviando para ${destino}...`)
ssh(`mkdir -p ${TMP}/backups`)
rodar('scp', [...opcoesSsh, '-P', porta, NOME_PACOTE, `${destino}:.deploy-oonsystems/dist.tar.gz`])

// 4. Troca no servidor (com backup)
console.log('→ Publicando...')
ssh(`set -e
  cd ${SITE}
  STAMP=$(date +%Y%m%d-%H%M%S)
  tar -czf ${TMP}/backups/site-$STAMP.tar.gz -C ${SITE} .
  rm -rf ${TMP}/novo && mkdir -p ${TMP}/novo
  tar -xzf ${TMP}/dist.tar.gz -C ${TMP}/novo
  test -f ${TMP}/novo/index.html
  cp -a ${TMP}/novo/. ${SITE}/
  find ${SITE}/assets -type f -mtime +30 -delete
  rm -rf ${TMP}/novo ${TMP}/dist.tar.gz
  ls -1t ${TMP}/backups/site-*.tar.gz | tail -n +6 | xargs -r rm -f
  echo "Publicado em $(pwd) — backup site-$STAMP.tar.gz"`)
rmSync(pacote, { force: true })

console.log('\n✔ Site publicado. Recarregue com Ctrl+F5.')
console.log('  Para desfazer: npm run deploy -- --voltar')
