# Capital website

Static site for the Capital iPhone app: 9 languages, a live calculator per page, prerendered HTML for
search engines and AI crawlers. Vite + React 19 + Tailwind v4, same pipeline as `measuro-web`.

```
npm install
npm test            # engine vs the iOS app, translation parity, copy rules
npm run dev         # http://localhost:5173/capital/
npm run build       # client + SSR bundle + prerender of every page into dist/
node scripts/audit.mjs   # SEO and link audit over dist/
```

Published at https://albeasystems.github.io/capital/ from the repository `albeasystems/capital`. The previous static
site there published `/privacy.html`, `/terms.html` and `/support.html`; the build writes redirects for them so those
URLs keep working. App 3.1 still links `/calculo/` (a 404 since the repo was renamed): point it to `/capital/`.

## Layout
- `src/engine.js` is a port of `Capital/Services/FinancialCalculator.swift`. `src/engine.test.js` pins the
  figures that appear in the app and in the page copy.
- `src/content/<lang>.js` mirrors `es.js` key for key; `src/content.test.js` enforces it. A language appears
  on the site as soon as it is registered in `src/content/index.js`.
- `src/seo.js` builds head tags, JSON-LD, hreflang, sitemap, robots and llms.txt.
- `public/media/` comes from `../marketing/` (`make-gif.mjs`, `make-web-media.mjs`, `make-og.mjs`).

## Things to know
- Capital Pro has no price here on purpose, and `home.plans.note` says it is not yet on the App Store.
  Delete that note and add the price when the product exists.
- Legal pages (privacy, terms, support) are written for Spanish and English only; other languages link to English.
- App captures exist in all nine languages (`marketing/source/<lang>/`, taken in the iOS Simulator with the app set to that language).
- ar / hi / zh copy has not been reviewed by a native speaker.
- `robots.txt` and `llms.txt` are generated into this project's folder. Crawlers read them at the domain root
  (`albeasystems.github.io/robots.txt`), which belongs to the `albeasystems.github.io` repository; a custom
  domain would make this site the root.
