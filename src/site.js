// Where the site lives: https://albeasystems.github.io/capital/ (repository albeasystems/capital). The old
// static site published privacy.html, terms.html and support.html there, so the build keeps those URLs alive.
export const ORIGIN = import.meta.env?.VITE_SITE_ORIGIN || 'https://albeasystems.github.io';
export const BASE = import.meta.env?.BASE_URL || '/capital/';
export const SITE_NAME = 'Capital';
export const PUBLISHER = 'Albea Systems';
export const CONTACT = 'albeasystems@gmail.com';
export const APP_ID = '6782654113';
export const APP_STORE = `https://apps.apple.com/app/id${APP_ID}`;

export const LANGS = ['es', 'en', 'fr', 'it', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'vi'];
export const LOCALES = { es: 'es_ES', en: 'en_US', fr: 'fr_FR', it: 'it_IT', de: 'de_DE', pt: 'pt_PT', ar: 'ar_AE', hi: 'hi_IN', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', vi: 'vi_VN' };
export const INTL = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', de: 'de-DE', pt: 'pt-PT', ar: 'ar-u-nu-latn', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', vi: 'vi-VN' };
export const HREFLANG = { es: 'es', en: 'en', fr: 'fr', it: 'it', de: 'de', pt: 'pt', ar: 'ar', hi: 'hi', zh: 'zh-Hans', ja: 'ja', ko: 'ko', vi: 'vi' };
export const LANG_NAMES = { es: 'Español', en: 'English', fr: 'Français', it: 'Italiano', de: 'Deutsch', pt: 'Português', ar: 'العربية', hi: 'हिन्दी', zh: '简体中文', ja: '日本語', ko: '한국어', vi: 'Tiếng Việt' };
// Bump UPDATED when copy or figures change: it feeds the visible date, JSON-LD dateModified and the sitemap lastmod.
export const PUBLISHED = '2026-10-19';
export const UPDATED = '2026-10-21';
export const RTL = new Set(['ar']);
/** Legal pages are written and reviewed in these languages only; the others link to English. */
export const LEGAL_LANGS = ['es', 'en'];

export const url = (route = '') => `${ORIGIN}${BASE}${route}`;
export const href = (route = '') => `${BASE}${route}`;
