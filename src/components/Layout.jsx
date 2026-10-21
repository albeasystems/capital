import { useEffect, useRef } from 'react';
import { LANGS, LANG_NAMES, HREFLANG, LEGAL_LANGS, APP_STORE, CONTACT, PUBLISHER, href } from '../site.js';
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
      <img src={href('media/icon-96.png')} width="34" height="34" alt="" style={{ borderRadius: 9 }} />
      <span className="text-xl font-bold tracking-tight">Capital</span>
    </a>
  );
}

/** Remembered by the root page (the language chooser), which sends returning visitors to this language. */
export const LANG_KEY = 'capital-lang';

const Globe = () => (
  <svg className="globe" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2.2 2.1 3.3 4.6 3.3 7.5s-1.1 5.4-3.3 7.5c-2.2-2.1-3.3-4.6-3.3-7.5S7.8 4.6 10 2.5Z" /></svg>
);

/** Real links inside a <details>, so it works without JavaScript; with it, it also closes on outside click and Escape. */
function LangMenu({ r, ui }) {
  const langs = LANGS.filter((l) => content[l]);
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    const close = () => { el.open = false; };
    const onDown = (e) => { if (el.open && !el.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape' && el.open) { close(); el.querySelector('summary').focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);
  const remember = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode: the choice just is not remembered */ } };
  return (
    <details className="relative" ref={box}>
      <summary className="lang-btn" aria-label={`${ui.langLabel}: ${LANG_NAMES[r.lang]}`}>
        <Globe />
        <span className="hidden sm:inline" lang={r.lang}>{LANG_NAMES[r.lang]}</span>
        <span className="data sm:hidden">{r.lang.toUpperCase()}</span>
        <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
      </summary>
      <ul className="lang-list absolute end-0 z-30 mt-2 list-none p-2" aria-label={ui.langLabel}>
        {langs.map((l) => (
          <li key={l}>
            <a lang={HREFLANG[l]} hrefLang={HREFLANG[l]} href={href(counterpart(r, l))} className="lang-item" onClick={() => remember(l)} aria-current={l === r.lang ? 'true' : undefined}>
              {LANG_NAMES[l]}
            </a>
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
    <header style={{ borderBottom: '1px solid var(--rule)' }}>
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
    <footer className="mt-auto" style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
      <div className="wrap py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div>
            <Logo lang={r.lang} />
            <p className="muted mt-4 max-w-xs text-sm">{f.project}</p>
          </div>
          <div className="text-sm"><span className="cell-label">{f.publisher}</span>{PUBLISHER}<br /><a href={`mailto:${CONTACT}`}>{CONTACT}</a></div>
          <div className="grid content-start gap-1.5 text-sm"><span className="cell-label">{f.legal}</span>
            <a href={href(`${legal}/privacy/`)}>{f.privacy}</a>
            <a href={href(`${legal}/terms/`)}>{f.terms}</a>
            <a href={href(`${legal}/support/`)}>{f.support}</a>
          </div>
          <div className="grid grid-cols-2 content-start gap-x-6 gap-y-1.5 text-sm"><span className="cell-label col-span-2">{f.languages}</span>
            {LANGS.filter((l) => content[l]).map((l) => <a key={l} lang={HREFLANG[l]} hrefLang={HREFLANG[l]} href={href(counterpart(r, l))}>{LANG_NAMES[l]}</a>)}
          </div>
        </div>
        <p className="muted mt-10 border-t pt-6 text-sm measure" style={{ borderColor: "var(--rule)" }}>{f.disclaimer}</p>
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
