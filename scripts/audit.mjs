// Mechanical SEO and link audit over the built site. Run after `npm run build`: node scripts/audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = '/capital/';
const ORIGIN = 'https://albeasystems.github.io';
const problems = [];
const warn = (f, m) => problems.push(`${f}: ${m}`);

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(root);
const pages = files.filter((f) => f.endsWith('index.html') && f !== path.join(root, 'index.html'));
const exists = (urlPath) => {
  const rel = urlPath.replace(BASE, '').split('#')[0].split('?')[0];
  const p = path.join(root, rel);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html')));
};

const titles = new Map(), descs = new Map();
const alt = new Map(); // route -> set of hreflang urls
let pageCount = 0, linkCount = 0, imgCount = 0;

for (const f of pages) {
  const rel = path.relative(root, f).replace(/index\.html$/, '');
  const html = fs.readFileSync(f, 'utf8');
  pageCount++;
  const one = (re) => (html.match(re) || [])[1];
  const title = one(/<title>([^<]*)<\/title>/), desc = one(/<meta name="description" content="([^"]*)"/);
  const canon = one(/<link rel="canonical" href="([^"]*)"/);
  if (!title) warn(rel, 'no <title>'); else { if (title.length > 72) warn(rel, `title ${title.length} chars: ${title}`); (titles.get(title) || titles.set(title, []).get(title)).push(rel); }
  if (!desc) warn(rel, 'no meta description'); else { const min = rel.startsWith('zh/') ? 30 : 80; // CJK characters carry about three times the content of Latin ones
    if (desc.length < min || desc.length > 200) warn(rel, `description ${desc.length} chars`); (descs.get(desc) || descs.set(desc, []).get(desc)).push(rel); }
  if (canon !== `${ORIGIN}${BASE}${rel}`) warn(rel, `canonical ${canon}`);
  const h1s = (html.match(/<h1[ >]/g) || []).length;
  if (h1s !== 1) warn(rel, `${h1s} h1 elements`);
  if (!/<html lang="[a-zA-Z-]+" dir="(ltr|rtl)">/.test(html)) warn(rel, 'html lang/dir missing');
  // hreflang
  const hl = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  alt.set(`${ORIGIN}${BASE}${rel}`, new Map(hl));
  if (!hl.some(([l]) => l === 'x-default')) warn(rel, 'no x-default');
  // JSON-LD
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!ld.length) warn(rel, 'no JSON-LD');
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      const types = j['@graph'].flatMap((n) => [n['@type']].flat());
      const faq = j['@graph'].find((n) => n['@type'] === 'FAQPage');
      if (faq) for (const q of faq.mainEntity) if (!html.includes(q.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')) && !html.includes(q.name.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')) && !html.includes(q.name.replace(/'/g, '&#x27;'))) warn(rel, `FAQ question not visible: ${q.name.slice(0, 50)}`);
      if (rel.match(/^[a-z]{2}\/$/) && !types.flat().includes('SoftwareApplication')) warn(rel, 'home without SoftwareApplication');
      if (JSON.stringify(j).includes('aggregateRating')) warn(rel, 'aggregateRating present (no real ratings exist)');
    } catch (e) { warn(rel, `JSON-LD parse error ${e.message}`); }
  }
  // links and images
  for (const m of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const h = m[1]; linkCount++;
    if (/^(https?:|mailto:|#)/.test(h)) continue;
    if (!exists(h)) warn(rel, `broken link ${h}`);
  }
  for (const m of html.matchAll(/<img [^>]*>/g)) {
    imgCount++;
    const tag = m[0];
    const src = (tag.match(/src="([^"]+)"/) || [])[1];
    if (src && src.startsWith(BASE) && !exists(src)) warn(rel, `missing image ${src}`);
    if (!/ alt="/.test(tag)) warn(rel, `img without alt ${src}`);
    if (!/ width="/.test(tag) || !/ height="/.test(tag)) warn(rel, `img without dimensions ${src}`);
  }
  for (const m of html.matchAll(/<source [^>]*srcSet="([^"]+)"/g)) if (m[1].startsWith(BASE) && !exists(m[1])) warn(rel, `missing source ${m[1]}`);
  if (/—/.test(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''))) warn(rel, 'em-dash in visible HTML');
  if (!/<meta property="og:image" content="[^"]+\.jpg"/.test(html)) warn(rel, 'no og:image');
}
for (const [t, r] of titles) if (r.length > 1) warn(r.join(', '), `duplicate title: ${t}`);
for (const [d, r] of descs) if (r.length > 1) warn(r.join(', '), `duplicate description: ${d.slice(0, 60)}`);
// hreflang reciprocity: if A lists B, B lists A
for (const [url, map] of alt) for (const [l, target] of map) {
  if (l === 'x-default') continue;
  const back = alt.get(target);
  if (!back) { warn(url, `hreflang ${l} points to a page that does not exist: ${target}`); continue; }
  if (![...back.values()].includes(url)) warn(url, `hreflang not reciprocal with ${target}`);
}
// sitemap
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length !== pages.length) warn('sitemap.xml', `${locs.length} urls vs ${pages.length} pages`);
for (const l of locs) if (!exists(l.replace(ORIGIN, ''))) warn('sitemap.xml', `lists missing ${l}`);
for (const need of ['robots.txt', 'llms.txt', 'llms-es.txt', 'llms-full.txt', '404.html', 'privacy.html', 'terms.html', 'support.html']) if (!fs.existsSync(path.join(root, need))) warn(need, 'missing');

console.log(`${pageCount} pages, ${linkCount} links, ${imgCount} images, ${locs.length} sitemap urls`);
if (problems.length) { console.log(`${problems.length} problems:\n- ` + problems.slice(0, 60).join('\n- ')); process.exit(1); }
console.log('audit clean');
