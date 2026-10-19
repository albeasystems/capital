import { LANGS, LANG_NAMES, LEGAL_LANGS, APP_STORE, CONTACT, PUBLISHER, href } from '../site.js';
import { content, PAGE_IDS } from '../content/index.js';

/** The same page in another language, for the language menu and hreflang. */
export function counterpart(r, lang) {
  if (r.page === 'home') return `${lang}/`;
  if (r.page === 'calc') return `${lang}/${content[lang].pages[r.id].slug}/`;
  return LEGAL_LANGS.includes(lang) ? `${lang}/${r.id}/` : `en/${r.id}/`;
}
export const calcRoute = (lang, id) => `${lang}/${content[lang].pages[id].slug}/`;

export function Logo({ lang }) {
  return (
    <a href={href(`${lang}/`)} className="flex items-center gap-3 no-underline" aria-label="Capital">
      <img src={href('media/icon-96.png')} width="34" height="34" alt="" style={{ borderRadius: 8 }} />
      <span className="font-plan text-xl font-bold tracking-tight" style={{ fontVariationSettings: '"wdth" 112' }}>Capital</span>
    </a>
  );
}

function LangMenu({ r, ui }) {
  const langs = LANGS.filter((l) => content[l]);
  return (
    <details className="relative">
      <summary className="flex cursor-pointer items-center gap-2 py-2 text-sm" aria-label={ui.langLabel}>
        <span className="data">{r.lang.toUpperCase()}</span><svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.25 6 8l4-3.75" /></svg>
      </summary>
      <ul className="absolute end-0 z-30 mt-2 min-w-44 list-none p-2" style={{ background: 'var(--paper)', border: '1.5px solid var(--line)' }}>
        {langs.map((l) => (
          <li key={l}>
            <a lang={l} hrefLang={l} href={href(counterpart(r, l))} className="block px-3 py-2 text-sm no-underline hover:underline" aria-current={l === r.lang ? 'true' : undefined}
              style={l === r.lang ? { fontWeight: 650 } : undefined}>{LANG_NAMES[l]}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Nav({ r, ui }) {
  const home = href(`${r.lang}/`);
  const links = [[ui.nav.calculators, `${home}#calculators`], [ui.nav.app, `${home}#app`], [ui.nav.faq, `${home}#faq`]];
  return (
    <header style={{ borderBottom: '1px solid var(--hair)' }}>
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <Logo lang={r.lang} />
        <nav aria-label="Principal" className="flex items-center gap-6">
          <ul className="hidden list-none items-center gap-6 p-0 text-sm md:flex">
            {links.map(([l, h]) => <li key={h}><a href={h} className="no-underline hover:underline">{l}</a></li>)}
          </ul>
          <LangMenu r={r} ui={ui} />
          <a href={APP_STORE} className="stamp !py-2 !px-4 !text-sm" rel="noopener">{ui.stampShort}</a>
        </nav>
      </div>
    </header>
  );
}

/** The title block of the sheet: who, where, legal, and the languages. */
export function Footer({ r, ui }) {
  const f = ui.footer;
  const legal = LEGAL_LANGS.includes(r.lang) ? r.lang : 'en';
  return (
    <footer className="mt-auto" style={{ borderTop: '2px solid var(--line)' }}>
      <div className="wrap py-10">
        <div className="tblock tfoot">
          <div>
            <Logo lang={r.lang} />
            <p className="muted mt-3 text-sm">{f.project}</p>
          </div>
          <div className="text-sm"><span className="cell-label">{f.publisher}</span>{PUBLISHER}<br /><a href={`mailto:${CONTACT}`}>{CONTACT}</a></div>
          <div className="grid gap-1 text-sm"><span className="cell-label">{f.legal}</span>
            <a href={href(`${legal}/privacy/`)}>{f.privacy}</a>
            <a href={href(`${legal}/terms/`)}>{f.terms}</a>
            <a href={href(`${legal}/support/`)}>{f.support}</a>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm"><span className="cell-label col-span-2">{f.languages}</span>
            {LANGS.filter((l) => content[l]).map((l) => <a key={l} lang={l} hrefLang={l} href={href(counterpart(r, l))}>{LANG_NAMES[l]}</a>)}
          </div>
        </div>
        <p className="muted mt-8 text-sm measure">{f.disclaimer}</p>
      </div>
    </footer>
  );
}

export function Shell({ r, children }) {
  const { ui } = content[r.lang];
  return (
    <div className="sheet">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3" style={{ background: 'var(--paper)' }}>{ui.skip}</a>
      <Nav r={r} ui={ui} />
      <main id="main">{children}</main>
      <Footer r={r} ui={ui} />
    </div>
  );
}

export { PAGE_IDS };
