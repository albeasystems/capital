// Content registry. A language appears on the site only once its file exists here, so the build
// never publishes a half-translated tree and hreflang never points at a missing page.
import es from './es.js';
import en from './en.js';
import fr from './fr.js';
import it from './it.js';
import de from './de.js';
import pt from './pt.js';
import ar from './ar.js';
import hi from './hi.js';
import zh from './zh.js';
import ja from './ja.js';
import ko from './ko.js';
import vi from './vi.js';
import { legal } from './legal.js';

// Legal pages are only written for Spanish and English; the rest link to the English ones.
export const content = {
  es: { ...es, legal: legal.es },
  en: { ...en, legal: legal.en },
  fr, it, de, pt, ar, hi, zh, ja, ko, vi,
};
export const PAGE_IDS = ['real-apr', 'tin-vs-tae', 'loan-payment', 'early-repayment', 'amortization-systems', 'amortization-schedule', 'compare-loans', 'deposit-net'];
