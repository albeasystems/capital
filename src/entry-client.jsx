import { hydrateRoot } from 'react-dom/client';
import './styles.css';
import { Page } from './components/Pages.jsx';
import { content } from './content/index.js';

// The server wrote everything the page needs onto #root; rebuild the same route record and hydrate.
const root = document.getElementById('root');
if (root) {
  const { lang, page, id } = root.dataset;
  const route = page === 'home' ? `${lang}/` : `${lang}/${page === 'calc' ? content[lang].pages[id].slug : id}/`;
  hydrateRoot(root, <Page r={{ lang, page, id, route }} />);
}
