// Languages that have their own set of app captures in public/media/views/<lang>/ (and the screen loop).
// A language not listed here shows the English captures. Add a code only after its folder exists.
export const CAPTURE_LANGS = ['es', 'en', 'fr', 'it', 'de', 'pt', 'ar', 'hi', 'zh', 'ja', 'ko', 'vi'];
export const captureLang = (lang) => (CAPTURE_LANGS.includes(lang) ? lang : 'en');
