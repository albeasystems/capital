import { renderToString } from 'react-dom/server';
import { Page } from './components/Pages.jsx';

export { routes, headHtml, sitemapXml, robotsTxt, llmsTxt, llmsFull } from './seo.js';
export { content } from './content/index.js';
export const render = (r) => renderToString(<Page r={r} />);
