import { spawn } from 'node:child_process';
import { preview } from 'vite';
import { baseURL } from './helpers.mjs';

let server;
try {
  if (!process.env.OUI_TEST_URL) {
    // Serve the artifact at its deployment path. Build plugins must not override
    // this base (the single-file plugin intentionally emits relative URLs).
    server = await preview({ configFile: false, base: '/oui/', preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
    console.log('Testing built site at ' + baseURL);
  }
  for (const script of ['smoke', 'progression']) {
    const child = spawn(process.execPath, [`tests/${script}.mjs`], { stdio: 'inherit', env: process.env });
    const code = await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
    if (code !== 0) throw new Error(`${script} failed (${code})`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
}
