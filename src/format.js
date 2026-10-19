import { INTL } from './site.js';

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'INR', 'CNY', 'AED'];

export function money(value, lang, currency = 'EUR', digits = 2) {
  return new Intl.NumberFormat(INTL[lang] || 'en-GB', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: 'always' }).format(value || 0);
}
/** Locale-correct percentage ("7 %" in Spanish, "7%" in English). `value` is already in percent. */
export function pct(value, lang, digits = 2) {
  return new Intl.NumberFormat(INTL[lang] || 'en-GB', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format((value || 0) / 100);
}
export function num(value, lang, digits = 0) {
  return new Intl.NumberFormat(INTL[lang] || 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: 'always' }).format(value || 0);
}
/** "5 años 3 meses" from a number of months, using the page's own unit words. */
export function duration(months, u) {
  const y = Math.floor(months / 12), m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? u.year : u.years}`);
  if (m) parts.push(`${m} ${m === 1 ? u.month : u.months}`);
  return parts.join(' ') || `0 ${u.months}`;
}
