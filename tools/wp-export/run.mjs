// Runs one read-only export script on the production WordPress over ssh and saves the JSON.
// Usage: node tools/wp-export/run.mjs <script.php> <out.json>
// Env (required): WP_SSH_HOST (ssh alias of the server), WP_CONTAINER (WordPress container name).
// No server name, address or secret is stored in this repository.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [script, out] = process.argv.slice(2);
if (!process.env.WP_SSH_HOST || !process.env.WP_CONTAINER) { console.error('set WP_SSH_HOST and WP_CONTAINER'); process.exit(2); }
if (!script || !out) { console.error('usage: node run.mjs <script.php> <out.json>'); process.exit(2); }
const host = process.env.WP_SSH_HOST;
const container = process.env.WP_CONTAINER;
const lib = readFileSync(resolve(here, 'lib.php'), 'utf8');
const body = readFileSync(resolve(here, script), 'utf8').replace(/^<\?php\s*/, '');
const r = spawnSync('ssh', [host, `docker exec -i ${container} php`], { input: lib + '\n' + body, maxBuffer: 512 * 1024 * 1024 });
if (r.status !== 0) { console.error(r.stderr.toString()); process.exit(1); }
const txt = r.stdout.toString('utf8');
JSON.parse(txt); // fail loudly if PHP printed notices around the JSON
mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(out, txt);
console.log('saved', out, txt.length, 'bytes');
