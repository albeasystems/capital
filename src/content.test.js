// Every language mirrors Spanish key for key, keeps its placeholders, and obeys the copy rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { content, PAGE_IDS } from './content/index.js';
import { LANGS } from './site.js';

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const base = flat(content.es).filter(([k]) => !k.startsWith('legal'));

for (const lang of LANGS) {
  test(`${lang}: same keys and placeholders as Spanish`, () => {
    const mine = new Map(flat(content[lang]).filter(([k]) => !k.startsWith('legal')));
    const missing = base.map(([k]) => k).filter((k) => !mine.has(k));
    assert.deepEqual(missing, [], `${lang} is missing keys`);
    for (const [k, v] of base) {
      if (typeof v === 'string' && !Array.isArray(v)) assert.equal(placeholders(mine.get(k)), placeholders(v), `${lang}.${k} placeholders differ`);
    }
    for (const id of PAGE_IDS) {
      const p = content[lang].pages[id], q = content.es.pages[id];
      assert.equal(p.faq.length, q.faq.length, `${lang}.${id} faq count`);
      assert.equal(p.how.paras.length, q.how.paras.length, `${lang}.${id} paras`);
      assert.equal(p.lab, q.lab);
      assert.deepEqual(p.related, q.related);
    }
    assert.equal(content[lang].home.app.views.length, 7);
  });

  test(`${lang}: no em-dashes or en-dashes as separators, no duplicate slugs`, () => {
    for (const s of strings(content[lang])) assert.ok(!/[—–]/.test(s), `${lang}: dash in "${s.slice(0, 60)}"`);
    const slugs = PAGE_IDS.map((id) => content[lang].pages[id].slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });
}

test('RTL only for Arabic', () => {
  for (const l of LANGS) assert.equal(content[l].dir, l === 'ar' ? 'rtl' : 'ltr');
});
