// Turns the client build into real HTML for every page, so search engines and AI crawlers read the
// content without running JavaScript. Also writes sitemap, robots, llms files, the root language
// chooser, the legal URLs the released app links to, and the 404 page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssr = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);
const base = process.env.BASE_PATH || '/capital/';

// Asset tags (hashed CSS and JS) come from the page Vite already built.
const built = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const tags = (re) => [...built.matchAll(re)].map((m) => m[0]);
const css = tags(/<link rel="stylesheet"[^>]*>/g);
const js = tags(/<script type="module"[^>]*><\/script>/g);
const preload = tags(/<link rel="modulepreload"[^>]*>/g);
const fonts = fs.readdirSync(path.join(dist, 'assets')).filter((f) => /(archivo-latin-wdth-normal|geist-latin-wght-normal|geist-mono-latin-wght-normal).*\.woff2$/.test(f));
const fontTags = fonts.map((f) => `<link rel="preload" href="${base}assets/${f}" as="font" type="font/woff2" crossorigin />`);
const assets = [...fontTags, ...css, ...preload, ...js].join('\n    ');

const write = (file, text) => {
  const out = path.join(dist, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
};

let count = 0;
for (const r of ssr.routes()) {
  const body = ssr.render(r);
  const c = ssr.content[r.lang];
  const dir = c.dir || 'ltr';
  write(`${r.route}index.html`, `<!doctype html>
<html lang="${r.lang === 'zh' ? 'zh-Hans' : r.lang}" dir="${dir}">
  <head>
    ${ssr.headHtml(r, assets)}
    <script>document.documentElement.classList.add('js')</script>
  </head>
  <body>
    <div id="root" data-lang="${r.lang}" data-page="${r.page}"${r.id ? ` data-id="${r.id}"` : ''}>${body}</div>
  </body>
</html>
`);
  count++;
}

const origin = new URL(ssr.sitemapXml('x').match(/<loc>([^<]+)<\/loc>/)[1]).origin;
const rootUrl = `${origin}${base}`;
const langs = [...new Set(ssr.routes().filter((r) => r.page === 'home').map((r) => r.lang))];
const names = { es: 'Español', en: 'English', fr: 'Français', it: 'Italiano', de: 'Deutsch', pt: 'Português', ar: 'العربية', hi: 'हिन्दी', zh: '简体中文' };
const hreflang = (l) => (l === 'zh' ? 'zh-Hans' : l);

// Root: language chooser with real links; people are redirected by browser language.
write('index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Capital: real APR calculator for iPhone</title>
    <meta name="description" content="Capital works out the real APR of a loan with fees and insurance. Capital calcula la TAE real de un préstamo." />
    <link rel="canonical" href="${rootUrl}" />
    ${langs.map((l) => `<link rel="alternate" hreflang="${hreflang(l)}" href="${rootUrl}${l}/" />`).join('\n    ')}
    <link rel="alternate" hreflang="x-default" href="${rootUrl}" />
    <link rel="icon" type="image/png" href="${base}media/favicon.png" />
    <script>
      var have = ${JSON.stringify(langs)};
      var l = (navigator.languages && navigator.languages[0] || navigator.language || "en").slice(0, 2);
      location.replace(base() + (have.indexOf(l) > -1 ? l : "en") + "/");
      function base() { return ${JSON.stringify(base)}; }
    </script>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1.25rem">
    <h1>Capital</h1>
    <p>Real APR calculator and loan app for iPhone. Calculadora de TAE real y app de préstamos para iPhone.</p>
    <p>${langs.map((l) => `<a href="${l}/" hreflang="${hreflang(l)}">${names[l]}</a>`).join(' · ')}</p>
  </body>
</html>
`);

// The released app (3.1) links /privacy.html, /terms.html and /support.html. They must resolve:
// each one sends the visitor to the legal page in their language (Spanish or English).
for (const p of ['privacy', 'terms', 'support']) {
  write(`${p}.html`, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${p[0].toUpperCase() + p.slice(1)} | Capital</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${rootUrl}en/${p}/" />
    <script>
      var l = (navigator.languages && navigator.languages[0] || navigator.language || "en").slice(0, 2);
      location.replace(${JSON.stringify(base)} + (l === "es" ? "es" : "en") + "/${p}/");
    </script>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1.25rem">
    <p><a href="en/${p}/">English</a> · <a href="es/${p}/">Español</a></p>
  </body>
</html>
`);
}

write('404.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Page not found | Capital</title>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1.25rem">
    <h1>Page not found</h1>
    <p>${langs.map((l) => `<a href="${base}${l}/">Capital ${names[l]}</a>`).join(' · ')}</p>
  </body>
</html>
`);

const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', ssr.sitemapXml(today));
write('robots.txt', ssr.robotsTxt());
write('llms.txt', ssr.llmsTxt('en'));
write('llms-es.txt', ssr.llmsTxt('es'));
write('llms-full.txt', ssr.llmsFull());
console.log(`prerendered ${count} pages + root, legal redirects, 404, sitemap, robots, llms`);
