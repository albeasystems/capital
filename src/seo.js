// One place that knows how every page presents itself to a crawler: <head> data, JSON-LD, sitemap,
// robots and the llms.txt files. The prerender script and the components both read from here.
import { content, PAGE_IDS } from './content/index.js';
import { LANGS, HREFLANG, LOCALES, LEGAL_LANGS, ORIGIN, PUBLISHER, SITE_NAME, CONTACT, APP_STORE, APP_ID, BASE, url, href } from './site.js';

const LEGAL = ['privacy', 'terms', 'support'];
const have = (l) => !!content[l];
export const activeLangs = () => LANGS.filter(have);

/** Every page of the site as a route record. */
export function routes() {
  const out = [];
  for (const lang of activeLangs()) {
    out.push({ lang, page: 'home', route: `${lang}/` });
    for (const id of PAGE_IDS) out.push({ lang, page: 'calc', id, route: `${lang}/${content[lang].pages[id].slug}/` });
    if (LEGAL_LANGS.includes(lang)) for (const id of LEGAL) out.push({ lang, page: 'legal', id, route: `${lang}/${id}/` });
  }
  return out;
}

/** The same page in each language that really has it, for hreflang. */
export function alternates(r) {
  const out = [];
  for (const l of activeLangs()) {
    if (r.page === 'home') out.push([l, `${l}/`]);
    else if (r.page === 'calc') out.push([l, `${l}/${content[l].pages[r.id].slug}/`]);
    else if (LEGAL_LANGS.includes(l)) out.push([l, `${l}/${r.id}/`]);
  }
  return out;
}

export function pageMeta(r) {
  const c = content[r.lang];
  if (r.page === 'home') return c.home.meta;
  if (r.page === 'calc') return c.pages[r.id].meta;
  const d = c.legal[r.id];
  return { title: `${d.title} | ${SITE_NAME}`, description: d.description };
}

const faqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

const publisher = {
  '@type': 'Organization', '@id': `${url('')}#publisher`, name: PUBLISHER, email: CONTACT,
  contactPoint: { '@type': 'ContactPoint', email: CONTACT, contactType: 'customer support' },
};

const app = (lang) => {
  const c = content[lang];
  return {
    '@type': ['SoftwareApplication', 'MobileApplication'],
    '@id': `${url('')}#app`,
    name: SITE_NAME,
    description: c.home.meta.description,
    operatingSystem: 'iOS 17 or later',
    applicationCategory: 'FinanceApplication',
    inLanguage: LANGS.map((l) => HREFLANG[l]),
    // Free to download. The in-app purchases are not priced here: the Pro product has no price yet.
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    downloadUrl: APP_STORE,
    installUrl: APP_STORE,
    image: url('media/icon-256.png'),
    screenshot: ['inputs', 'results', 'real', 'donut', 'insights'].map((f) => url(`media/views/${lang}/${f}.webp`)),
    featureList: ['Real APR with fees and insurance', 'French, linear and American amortization', 'Early repayment simulator', 'Deposits with tax and inflation', 'Side-by-side comparison', 'PDF report (Capital Pro)'],
    publisher: { '@id': `${url('')}#publisher` },
  };
};

export function jsonLd(r) {
  const c = content[r.lang];
  const here = url(r.route);
  const meta = pageMeta(r);
  const graph = [];
  if (r.page === 'home') {
    graph.push(
      { '@type': 'WebSite', '@id': `${url('')}#site`, url: url(`${r.lang}/`), name: SITE_NAME, inLanguage: HREFLANG[r.lang], publisher: { '@id': `${url('')}#publisher` } },
      publisher,
      app(r.lang),
      { '@type': 'WebPage', '@id': `${here}#page`, url: here, name: meta.title, description: meta.description, inLanguage: HREFLANG[r.lang], isPartOf: { '@id': `${url('')}#site` }, about: { '@id': `${url('')}#app` } },
      faqSchema(c.home.faq.items),
    );
  } else if (r.page === 'calc') {
    const p = c.pages[r.id];
    graph.push(
      { '@type': 'WebPage', '@id': `${here}#page`, url: here, name: p.h1, description: meta.description, inLanguage: HREFLANG[r.lang], isPartOf: { '@id': `${url('')}#site` }, about: { '@id': `${url('')}#app` }, mainEntity: { '@id': `${here}#tool` } },
      { '@type': 'WebApplication', '@id': `${here}#tool`, name: p.h1, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', url: here,
        inLanguage: HREFLANG[r.lang], offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, isBasedOn: { '@id': `${url('')}#app` }, publisher: { '@id': `${url('')}#publisher` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: url(`${r.lang}/`) },
        { '@type': 'ListItem', position: 2, name: c.ui.nav.calculators, item: url(`${r.lang}/#calculators`) },
        { '@type': 'ListItem', position: 3, name: p.h1, item: here },
      ] },
      faqSchema(p.faq),
    );
  } else {
    graph.push({ '@type': 'WebPage', url: here, name: meta.title, inLanguage: HREFLANG[r.lang], isPartOf: { '@id': `${url('')}#site` } });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function headHtml(r, assets) {
  const m = pageMeta(r);
  const canonical = url(r.route);
  const alts = alternates(r);
  const xdef = alts.find(([l]) => l === 'en') || alts[0];
  const ogLang = have(r.lang) && ['es', 'en'].includes(r.lang) ? r.lang : 'en';
  const og = url(`media/og-${ogLang}.jpg`);
  const ld = JSON.stringify(jsonLd(r)).replace(/</g, '\\u003c');
  return `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(m.title)}</title>
    <meta name="description" content="${esc(m.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonical}" />
    ${alts.map(([l, rt]) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${url(rt)}" />`).join('\n    ')}
    <link rel="alternate" hreflang="x-default" href="${url(xdef[1])}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#fbfbfc" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0b0f17" media="(prefers-color-scheme: dark)" />
    <meta name="apple-itunes-app" content="app-id=${APP_ID}" />
    <meta property="og:type" content="${r.page === 'home' ? 'website' : 'article'}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${esc(m.title)}" />
    <meta property="og:description" content="${esc(m.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="${LOCALES[r.lang]}" />
    ${alts.filter(([l]) => l !== r.lang).map(([l]) => `<meta property="og:locale:alternate" content="${LOCALES[l]}" />`).join('\n    ')}
    <meta property="og:image" content="${og}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(content[ogLang].home.h1.replace('{tin}', '7%').replace('{tae}', '12.75%'))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(m.title)}" />
    <meta name="twitter:description" content="${esc(m.description)}" />
    <meta name="twitter:image" content="${og}" />
    <link rel="icon" type="image/png" href="${href('media/favicon.png')}" />
    <link rel="apple-touch-icon" href="${href('media/icon-256.png')}" />
    ${assets}
    <script type="application/ld+json">${ld}</script>`;
}

// ---- llms.txt: a plain-text map of the site for language models ----

const bullet = (title, route, note) => `- [${title}](${url(route)})${note ? `: ${note}` : ''}`;

const SUMMARY = {
  es: 'Capital es una app para iPhone y iPad que calcula la TAE real de un préstamo sumando comisiones y seguros, simula la amortización anticipada (reducir plazo o cuota, con comisión de cancelación y frente a invertir), compara dos ofertas y calcula depósitos netos de retención e inflación. Tres sistemas de amortización (francés, lineal, americano), informe PDF, nueve idiomas. Gratis con anuncios; quitar anuncios y Capital Pro son compras únicas sin suscripción. Los cálculos se hacen en el dispositivo. Herramienta informativa, no asesoramiento financiero.',
  en: 'Capital is an iPhone and iPad app that works out the real APR of a loan by adding fees and insurance, simulates early repayment (shorten the term or lower the payment, with a cancellation fee and against investing the money), compares two offers and calculates deposits net of tax and inflation. Three amortization systems (French, linear, American), PDF reports, nine languages. Free with ads; removing ads and Capital Pro are one-time purchases with no subscription. Calculations run on the device. Informational tool, not financial advice.',
};

export function llmsTxt(lang) {
  const c = content[lang];
  const L = lang === 'es'
    ? { app: 'La app', calc: 'Calculadoras', legal: 'Legal y soporte', other: 'Otros idiomas', store: 'App Store: descargar Capital' }
    : { app: 'The app', calc: 'Calculators', legal: 'Legal and support', other: 'Other languages', store: 'App Store: download Capital' };
  const lines = [
    `# ${SITE_NAME}`, '', `> ${SUMMARY[lang] || SUMMARY.en}`, '',
    `## ${L.app}`,
    bullet(c.home.meta.title, `${lang}/`, c.home.meta.description),
    `- [${L.store}](${APP_STORE})`, '',
    `## ${L.calc}`,
    ...PAGE_IDS.map((id) => bullet(c.pages[id].h1, `${lang}/${c.pages[id].slug}/`, c.pages[id].answer)), '',
    `## ${L.legal}`,
    ...(LEGAL_LANGS.includes(lang) ? LEGAL.map((id) => bullet(c.legal[id].title, `${lang}/${id}/`)) : []), '',
    `## ${L.other}`,
    ...activeLangs().filter((l) => l !== lang).map((l) => bullet(`${l.toUpperCase()}`, `${l}/`)), '',
  ];
  return lines.join('\n');
}

export function llmsFull() {
  const out = [`# ${SITE_NAME}: full text`, ''];
  for (const lang of ['en', 'es'].filter(have)) {
    const c = content[lang];
    out.push(`## ${lang === 'en' ? 'English' : 'Español'}`, '', SUMMARY[lang], '');
    for (const id of PAGE_IDS) {
      const p = c.pages[id];
      out.push(`### ${p.h1}`, url(`${lang}/${p.slug}/`), '', p.answer, '', p.formula, '', ...p.how.paras.flatMap((t) => [t, '']));
      for (const [q, a] of p.faq) out.push(`**${q}**`, a, '');
    }
    out.push(`### ${c.home.faq.title}`, '');
    for (const [q, a] of c.home.faq.items) out.push(`**${q}**`, a, '');
  }
  return out.join('\n');
}

export function sitemapXml(lastmod) {
  const entries = routes().map((r) => {
    const alts = alternates(r);
    const xdef = alts.find(([l]) => l === 'en') || alts[0];
    return `  <url>
    <loc>${url(r.route)}</loc>
    <lastmod>${lastmod}</lastmod>
${alts.map(([l, rt]) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${url(rt)}" />`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(xdef[1])}" />
    <priority>${r.page === 'home' ? '1.0' : r.page === 'calc' ? '0.8' : '0.3'}</priority>
  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

export function robotsTxt() {
  const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'CCBot'];
  return `User-agent: *
Allow: /

${bots.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n')}

Sitemap: ${url('sitemap.xml')}
`;
}

export { ORIGIN, BASE };
