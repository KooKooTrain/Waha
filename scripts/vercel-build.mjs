// Builds Waha for Vercel using the Build Output API (https://vercel.com/docs/build-output-api).
// The client goes up as static files. The Express API gets bundled into one function, which also
// pulls in the shared engine, so the same code answers on Vercel as on localhost.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const out = '.vercel/output';
rmSync(out, { recursive: true, force: true });

execSync('npm run build -w client', { stdio: 'inherit' });
cpSync('client/dist', `${out}/static`, { recursive: true });

const fn = `${out}/functions/api.func`;
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: ['server/src/app.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: `${fn}/index.js`,
  // Vercel's Node launcher wants module.exports to be the (req, res) handler, which an Express app is.
  footer: { js: 'module.exports = module.exports.default;' },
  logLevel: 'info',
});
writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs' }));

writeFileSync(`${out}/config.json`, JSON.stringify({
  version: 3,
  routes: [
    { src: '/api/(.*)', dest: '/api' },
    { handle: 'filesystem' },
    // Client-side routes like /map and /privacy all load the app shell.
    { src: '/(.*)', dest: '/index.html' },
  ],
}, null, 2));

console.log('Vercel output ready in .vercel/output');
