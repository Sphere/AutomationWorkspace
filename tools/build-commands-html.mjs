/**
 * COMMANDS.md → COMMANDS.html
 *
 * Generated, not hand-written, so the two can never drift: edit the Markdown and
 * re-run this. Handles only the constructs COMMANDS.md actually uses (headings,
 * tables, fenced code, blockquotes, lists, inline code/bold/links, rules), which
 * keeps it small and predictable.
 *
 *   node tools/build-commands-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'COMMANDS.md');
const OUT = resolve(ROOT, 'COMMANDS.html');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline formatting. Escaping happens first, so these only ever see safe text. */
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

const lines = readFileSync(SRC, 'utf8').split(/\r?\n/);
const out = [];
const toc = [];
let i = 0;

const flushList = (items, ordered) => {
  if (!items.length) return;
  const tag = ordered ? 'ol' : 'ul';
  out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
  items.length = 0;
};

let listItems = [];
let listOrdered = false;

while (i < lines.length) {
  const line = lines[i];

  // ── fenced code ──
  if (/^```/.test(line)) {
    flushList(listItems, listOrdered);
    const lang = line.slice(3).trim() || 'text';
    const body = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
    i++; // closing fence
    const code = esc(body.join('\n'));
    out.push(
      `<div class="code"><div class="code-head"><span class="lang">${esc(lang)}</span>`
      + `<button class="copy" type="button">Copy</button></div>`
      + `<pre><code>${code}</code></pre></div>`,
    );
    continue;
  }

  // ── table ──
  if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
    flushList(listItems, listOrdered);
    const cells = (row) =>
      row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(line);
    i += 2;
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
    out.push(
      '<div class="table-wrap"><table><thead><tr>'
      + head.map((h) => `<th>${inline(h)}</th>`).join('')
      + '</tr></thead><tbody>'
      + rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')
      + '</tbody></table></div>',
    );
    continue;
  }

  // ── heading ──
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    flushList(listItems, listOrdered);
    const level = h[1].length;
    const text = h[2].trim();
    const id = slug(text);
    if (level === 2 || level === 3) toc.push({ level, text, id });
    out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
    i++;
    continue;
  }

  // ── blockquote (callout) ──
  if (/^>\s?/.test(line)) {
    flushList(listItems, listOrdered);
    const body = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
    out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
    continue;
  }

  // ── rule ──
  if (/^---+\s*$/.test(line)) {
    flushList(listItems, listOrdered);
    out.push('<hr>');
    i++;
    continue;
  }

  // ── list items ──
  const ul = line.match(/^[-*]\s+(.*)$/);
  const ol = line.match(/^\d+\.\s+(.*)$/);
  if (ul || ol) {
    const ordered = Boolean(ol);
    if (listItems.length && ordered !== listOrdered) flushList(listItems, listOrdered);
    listOrdered = ordered;
    listItems.push((ul ?? ol)[1]);
    i++;
    continue;
  }

  // ── blank / paragraph ──
  if (!line.trim()) {
    flushList(listItems, listOrdered);
    i++;
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|---+\s*$|\s*\||[-*]\s|\d+\.\s)/.test(lines[i])) {
    para.push(lines[i++]);
  }
  if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
  else i++;
}
flushList(listItems, listOrdered);

const nav = toc
  .map((t) => `<a class="lvl${t.level}" href="#${t.id}">${esc(t.text)}</a>`)
  .join('');

/* Tarento brand: navy anchors ~80%, teal supports ~15%, gold is the single loud
   signal ~5%. Inter for text, JetBrains Mono for code. No logo, by request. */
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aastrika Automation Commands</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{
  --navy:#17283C; --navy-300:#2D3E54; --navy-100:#7E8A9A; --navy-50:#BEC5CE;
  --teal:#1E8F8E; --teal-600:#186E6E; --teal-50:#E3F7F6; --teal-100:#B8ECE9;
  --gold:#F0A500; --gold-700:#9A6800; --gold-50:#FEF6E0;
  --page:#F6F7F9; --surface:#FFFFFF; --border:#D8DEE5;
  --text:#0D1218; --muted:#7C8696;
  --code-bg:#17283C; --code-text:#E8EDF2;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --page:#0F1722; --surface:#17283C; --border:#2D3E54;
    --text:#E8EDF2; --muted:#9BA6B5; --navy:#E8EDF2; --navy-300:#BEC5CE;
    --code-bg:#0B1320; --code-text:#E8EDF2; --teal-50:#12302F; --gold-50:#2E2410;
  }
}
:root[data-theme="dark"]{
  --page:#0F1722; --surface:#17283C; --border:#2D3E54;
  --text:#E8EDF2; --muted:#9BA6B5; --navy:#E8EDF2; --navy-300:#BEC5CE;
  --code-bg:#0B1320; --code-text:#E8EDF2; --teal-50:#12302F; --gold-50:#2E2410;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; background:var(--page); color:var(--text);
  font:400 16px/1.6 Inter,"Open Sans",system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.shell{display:grid; grid-template-columns:260px minmax(0,1fr); gap:32px;
  max-width:1280px; margin:0 auto; padding:0 24px}
/* sidebar */
aside{position:sticky; top:0; align-self:start; height:100vh; overflow-y:auto;
  padding:28px 0 40px; border-right:1px solid var(--border)}
aside h2{font:700 13px/1 Inter; letter-spacing:.08em; text-transform:uppercase;
  color:var(--muted); margin:0 0 12px}
#filter{width:100%; padding:8px 10px; margin-bottom:16px; border:1px solid var(--border);
  border-radius:6px; background:var(--surface); color:var(--text); font:400 14px Inter}
#filter:focus{outline:2px solid var(--teal); outline-offset:2px}
nav{display:flex; flex-direction:column; gap:1px; padding-right:16px}
nav a{color:var(--navy-300); text-decoration:none; padding:5px 10px; border-radius:6px;
  font-size:14px; border-left:2px solid transparent}
nav a.lvl3{padding-left:22px; font-size:13px; color:var(--muted)}
nav a:hover{background:var(--teal-50); color:var(--teal-600)}
nav a.active{border-left-color:var(--teal); color:var(--teal-600); font-weight:600}
nav a[hidden]{display:none}
/* content */
main{padding:28px 0 96px; min-width:0}
h1{font:700 40px/1.2 Inter; color:var(--navy); margin:0 0 8px; letter-spacing:-.02em}
h2{font:600 28px/1.3 Inter; color:var(--navy); margin:56px 0 4px;
  padding-bottom:8px; border-bottom:2px solid var(--teal); scroll-margin-top:20px}
h3{font:600 20px/1.35 Inter; color:var(--navy); margin:32px 0 4px; scroll-margin-top:20px}
h4{font:600 16px/1.4 Inter; color:var(--navy-300); margin:24px 0 4px}
p{margin:12px 0}
a{color:var(--teal-600)}
a:hover{color:var(--gold-700)}
hr{border:0; border-top:1px solid var(--border); margin:40px 0}
ul,ol{margin:12px 0; padding-left:22px}
li{margin:4px 0}
code{font:400 .875em/1.5 "JetBrains Mono",ui-monospace,Consolas,monospace;
  background:var(--teal-50); color:var(--teal-600); padding:2px 5px; border-radius:4px;
  word-break:break-word}
blockquote{margin:20px 0; padding:14px 18px; background:var(--gold-50);
  border-left:4px solid var(--gold); border-radius:0 6px 6px 0}
blockquote code{background:rgba(240,165,0,.16); color:var(--gold-700)}
/* code blocks */
.code{margin:16px 0; border-radius:8px; overflow:hidden; border:1px solid var(--border)}
.code-head{display:flex; justify-content:space-between; align-items:center;
  background:var(--navy-300); padding:6px 12px}
.lang{font:600 11px/1 "JetBrains Mono",monospace; letter-spacing:.08em;
  text-transform:uppercase; color:var(--teal-100)}
.copy{font:600 12px Inter; background:transparent; color:var(--teal-100);
  border:1px solid rgba(184,236,233,.4); border-radius:6px; padding:3px 10px; cursor:pointer;
  min-height:28px}
.copy:hover{background:var(--gold); color:var(--navy); border-color:var(--gold)}
.copy:focus-visible{outline:2px solid var(--teal); outline-offset:2px}
.code pre{margin:0; padding:14px 16px; background:var(--code-bg); overflow-x:auto}
.code code{font:400 13.5px/1.7 "JetBrains Mono",ui-monospace,Consolas,monospace;
  background:none; color:var(--code-text); padding:0}
/* tables */
.table-wrap{overflow-x:auto; margin:16px 0; border:1px solid var(--border); border-radius:8px}
table{border-collapse:collapse; width:100%; background:var(--surface)}
th{background:var(--navy); color:#fff; font:600 14px Inter; text-align:left;
  padding:10px 14px; white-space:nowrap}
td{padding:10px 14px; border-top:1px solid var(--border); font-size:14.5px; vertical-align:top}
tbody tr:nth-child(even){background:var(--page)}
/* theme toggle */
.toggle{position:fixed; right:20px; bottom:20px; z-index:10; width:44px; height:44px;
  border-radius:9999px; border:1px solid var(--border); background:var(--surface);
  color:var(--navy); font-size:18px; cursor:pointer; box-shadow:0 2px 8px rgba(13,18,24,.12)}
.toggle:focus-visible{outline:2px solid var(--teal); outline-offset:2px}
.meta{color:var(--muted); font-size:14px; margin:0 0 4px}
@media (max-width:900px){
  .shell{grid-template-columns:1fr; gap:0}
  aside{position:static; height:auto; border-right:0; border-bottom:1px solid var(--border);
    padding-bottom:16px}
  nav{max-height:240px; overflow-y:auto; padding-right:0}
  h1{font-size:30px} h2{font-size:23px} main{padding-top:20px}
}
@media print{
  aside,.toggle,.copy{display:none}
  .shell{display:block; max-width:none; padding:0}
  .code pre{background:#f4f6f8} .code code{color:#0D1218}
  th{background:#17283C !important; -webkit-print-color-adjust:exact; print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="shell">
  <aside>
    <h2>On this page</h2>
    <input id="filter" type="search" placeholder="Filter sections…" aria-label="Filter sections">
    <nav id="toc">${nav}</nav>
  </aside>
  <main>
${out.join('\n')}
  </main>
</div>
<button class="toggle" type="button" id="theme" title="Toggle light / dark" aria-label="Toggle light or dark theme">◐</button>
<script>
// Copy buttons.
for (const btn of document.querySelectorAll('.copy')) {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.code').querySelector('code').innerText;
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Press Ctrl+C';
      const r = document.createRange();
      r.selectNodeContents(btn.closest('.code').querySelector('code'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
  });
}

// Sidebar filter.
const filter = document.getElementById('filter');
filter.addEventListener('input', () => {
  const q = filter.value.trim().toLowerCase();
  for (const a of document.querySelectorAll('#toc a')) {
    a.hidden = Boolean(q) && !a.textContent.toLowerCase().includes(q);
  }
});

// Highlight the section in view.
const links = new Map([...document.querySelectorAll('#toc a')].map((a) => [a.hash.slice(1), a]));
const seen = new Set();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id);
  }
  let first = null;
  for (const id of links.keys()) if (seen.has(id)) { first = id; break; }
  for (const [id, a] of links) a.classList.toggle('active', id === first);
}, { rootMargin: '-10% 0px -80% 0px' });
for (const id of links.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }

// Theme, remembered per viewer where storage allows.
const themeBtn = document.getElementById('theme');
try {
  const saved = localStorage.getItem('commands-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}
themeBtn.addEventListener('click', () => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const now = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
  const next = now === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('commands-theme', next); } catch {}
});
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
const kb = (html.length / 1024).toFixed(1);
console.log(`✓ ${OUT}`);
console.log(`  ${lines.length} md lines → ${kb}KB html · ${toc.length} sections in the sidebar`);
