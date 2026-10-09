// Pull CODE_REFERENCES + PROGRESS_CATEGORIES out of the Phase 1 artifact and
// emit SQL insert rows for the white-label progress_categories catalog.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../docs/phase1-artifact.jsx', import.meta.url), 'utf8');
const grab = (name) => {
  const start = src.indexOf(`const ${name} =`);
  const open = src.indexOf(name.endsWith('S') && src[src.indexOf('=', start) + 2] === '[' ? '[' : '{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{' || src[i] === '[') depth++;
    else if (src[i] === '}' || src[i] === ']') { depth--; if (depth === 0) break; }
  }
  return new Function(`return (${src.slice(open, i + 1)})`)();
};
const refs = grab('CODE_REFERENCES');
const cats = grab('PROGRESS_CATEGORIES');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = cats.map((c, idx) => {
  const r = refs[c.id] || { code: null, sections: [] };
  return `  (${q(c.id)}, ${q(c.label)}, ${q(c.icon)}, ${idx * 10}, ${r.code ? q(r.code) : 'null'}, ${q(JSON.stringify(r.sections))}::jsonb)`;
});
const out = `insert into progress_categories (key, label, icon, sort, code_title, code_refs) values\n${rows.join(',\n')}\non conflict (key) do nothing;\n`;
writeFileSync(new URL('../supabase/seed/progress_categories.sql', import.meta.url), out);
console.log(`${cats.length} categories, ${Object.values(refs).reduce((n, r) => n + r.sections.length, 0)} code refs`);
