// Turns an owner-verified translation file (data/verified/<slug>_verified_*.md) into data/verified/<slug>.<lang>.html.
// build-snapshot.mjs uses those files in place of the machine translation of that tour. Word for word, no edits.
// Usage: node tools/gen-verified.mjs <md file> <tour slug>
import { readFileSync, writeFileSync } from 'node:fs';
const [file, slug] = process.argv.slice(2);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = readFileSync(file, 'utf8').replace(/\r/g, '');
const parts = text.split(/^\d+\. .*\((\w\w)\)\s*$/m);
for (let i = 1; i < parts.length; i += 2) {
  const lang = parts[i];
  const lines = parts[i + 1].split('\n').map((l) => l.trim()).filter(Boolean);
  lines.shift(); // the block title ("About the tour") is the page's own heading
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.join('')}</ul>`); list = []; } };
  for (const l of lines) {
    if (l.startsWith('•')) {
      const body = l.slice(1).trim();
      const m = /^\d/.test(body) ? body.match(/^(.+?)( \()(.*)$/) : body.match(/^(.{1,30}?)( — )(.*)$/);
      list.push(`<li>${m ? `<strong>${esc(m[1])}</strong>${esc(m[2] + m[3])}` : esc(body)}</li>`);
      continue;
    }
    flush();
    const heading = !/^[„“"]/.test(l) && (l.length < 120 && !/[.!?]$/.test(l));
    out.push(heading ? `<p><strong>${esc(l)}</strong></p>` : `<p>${esc(l)}</p>`);
  }
  flush();
  writeFileSync(`data/verified/${slug}.${lang}.html`, out.join('\n') + '\n');
  console.log(lang, lines.length, 'lines');
}
