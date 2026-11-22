// Checks the interface dictionaries i18n/<lang>.json.
// Run: node tools/check-i18n.mjs   (no dependencies, exit code 1 on any problem)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'i18n');
const LANGS = ['en', 'cs', 'pl', 'uk', 'ru', 'de', 'et', 'fi', 'lv', 'lt', 'hu'];
const BASE = 'en';

const problems = [];
const fail = (msg) => problems.push(msg);

// Flatten to { 'a.b.c': string | string[] }. Arrays of strings are plural forms.
function flatten(node, prefix, out) {
  if (Array.isArray(node)) {
    out[prefix] = node;
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? prefix + '.' + k : k, out);
  } else {
    out[prefix] = node;
  }
  return out;
}

// %d, %s, %1$s, %%, {name}, {{name}}
const PH = /%(?:\d+\$)?[ds]|\{\{[^{}]+\}\}|\{[^{}]+\}/g;
const placeholders = (s) => (String(s).match(PH) || []).sort();
const phText = (list) => (list.length ? list.join(' ') : '(none)');

const dicts = {};
for (const lang of LANGS) {
  const file = path.join(dir, lang + '.json');
  if (!fs.existsSync(file)) { fail(`${lang}: file i18n/${lang}.json is missing`); continue; }
  try {
    dicts[lang] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')), '', {});
  } catch (e) {
    fail(`${lang}: invalid JSON (${e.message})`);
  }
}

const base = dicts[BASE];
if (base) {
  const baseKeys = Object.keys(base);
  for (const lang of LANGS) {
    const d = dicts[lang];
    if (!d || lang === BASE) continue;
    const keys = new Set(Object.keys(d));
    for (const k of baseKeys) if (!keys.has(k)) fail(`${lang}: missing key ${k}`);
    for (const k of keys) if (!(k in base)) fail(`${lang}: extra key ${k} (not in ${BASE})`);
  }
  for (const lang of LANGS) {
    const d = dicts[lang];
    if (!d) continue;
    for (const [k, v] of Object.entries(d)) {
      const bv = base[k];
      const vs = Array.isArray(v) ? v : [v];
      for (const [i, s] of vs.entries()) {
        const where = `${lang}: ${k}${Array.isArray(v) ? '[' + i + ']' : ''}`;
        if (typeof s !== 'string') { fail(`${where} is not a string`); continue; }
        if (s.trim() === '') { fail(`${where} is empty`); continue; }
      }
      if (bv === undefined) continue;
      if (Array.isArray(bv) !== Array.isArray(v)) { fail(`${lang}: ${k} is ${Array.isArray(v) ? 'an array' : 'a string'} but ${BASE} is ${Array.isArray(bv) ? 'an array' : 'a string'}`); continue; }
      if (Array.isArray(bv)) {
        if (bv.length !== v.length) fail(`${lang}: ${k} has ${v.length} plural forms, ${BASE} has ${bv.length}`);
        const n = Math.min(bv.length, v.length);
        for (let i = 0; i < n; i++) {
          if (typeof v[i] !== 'string' || typeof bv[i] !== 'string') continue;
          const a = placeholders(bv[i]), b = placeholders(v[i]);
          if (phText(a) !== phText(b)) fail(`${lang}: ${k}[${i}] placeholders differ: ${BASE} ${phText(a)} / ${lang} ${phText(b)}`);
        }
      } else if (typeof v === 'string' && typeof bv === 'string') {
        const a = placeholders(bv), b = placeholders(v);
        if (phText(a) !== phText(b)) fail(`${lang}: ${k} placeholders differ: ${BASE} ${phText(a)} / ${lang} ${phText(b)}`);
      }
    }
  }
}

// provenance file: every key listed, nothing extra
const provFile = path.join(dir, '_provenance.json');
if (fs.existsSync(provFile) && base) {
  const prov = JSON.parse(fs.readFileSync(provFile, 'utf8'));
  for (const k of Object.keys(base)) if (!(k in prov)) fail(`_provenance.json: missing key ${k}`);
  for (const k of Object.keys(prov)) if (!(k in base)) fail(`_provenance.json: extra key ${k}`);
}

const counts = LANGS.map((l) => `${l}=${dicts[l] ? Object.keys(dicts[l]).length : 0}`).join(' ');
const plural = base ? Object.values(base).filter(Array.isArray).length : 0;
if (problems.length) {
  for (const p of problems) console.error('PROBLEM: ' + p);
  console.error(`FAILED: ${problems.length} problem(s). Keys per language: ${counts}`);
  process.exit(1);
}
console.log(`OK: ${LANGS.length} languages, ${Object.keys(base).length} keys each (${plural} plural arrays). Keys per language: ${counts}`);
