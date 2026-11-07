// Generates tokens.css, tailwind.preset.cjs and app/src/theme/tokens.ts from tokens.json.
// Run: node replica/design/build-tokens.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));
const vars = (pal) => Object.entries(pal).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');
const units = Object.entries(t.color.unit).filter(([k]) => k !== 'note')
  .map(([k, [fill, on]]) => `  --color-${k}: ${fill};\n  --color-on-${k}: ${on};`).join('\n');
const px = (o, p) => Object.entries(o).filter(([, v]) => typeof v === 'number').map(([k, v]) => `  --${p}-${k}: ${v}px;`).join('\n');

const css = `/* generated from tokens.json: do not edit */
:root {
${vars(t.color.light)}
${units}
${px(t.space, 'space')}
${px(t.radius, 'radius')}
  --font-sans: "${t.brand.font.family}", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${vars(t.color.dark)}
  }
}
:root[data-theme="dark"] {
${vars(t.color.dark)}
}
`;
writeFileSync(join(here, 'tokens.css'), css);

const roleColors = Object.fromEntries(Object.keys(t.color.light).map((k) => [k, `var(--color-${k})`]));
for (const k of Object.keys(t.color.unit)) if (k !== 'note') { roleColors[k] = `var(--color-${k})`; roleColors[`on-${k}`] = `var(--color-on-${k})`; }
const tw = {
  theme: {
    colors: { transparent: 'transparent', ...roleColors },
    fontFamily: { sans: ['var(--font-sans)'] },
    fontSize: Object.fromEntries(Object.entries(t.type.scale).map(([k, v]) => [k, [`${v.size}px`, `${v.line}px`]])),
    spacing: Object.fromEntries(Object.entries(t.space).map(([k, v]) => [k, `${v}px`])),
    borderRadius: Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [k, `${v}px`])),
  },
};
writeFileSync(join(here, 'tailwind.preset.cjs'), `// generated from tokens.json: do not edit\nmodule.exports = ${JSON.stringify(tw, null, 2)};\n`);

const unitObj = Object.fromEntries(Object.entries(t.color.unit).filter(([k]) => k !== 'note'));
const ts = `// generated from replica/design/tokens.json by build-tokens.mjs: do not edit
export const palettes = ${JSON.stringify({ light: t.color.light, dark: t.color.dark }, null, 2)} as const;
export type ColorRole = keyof typeof palettes.light;
export type Palette = Record<ColorRole, string>;
export const unitColors = ${JSON.stringify(unitObj, null, 2)} as const;
export const type = ${JSON.stringify(t.type, null, 2)} as const;
export const space = ${JSON.stringify(t.space)} as const;
export const radius = ${JSON.stringify(t.radius)} as const;
export const depth = ${JSON.stringify(t.depth)} as const;
export const motion = ${JSON.stringify(t.motion)} as const;
export const layout = ${JSON.stringify(t.layout)} as const;
`;
const out = join(here, '../../app/src/theme/tokens.ts');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, ts);
console.log('wrote tokens.css, tailwind.preset.cjs, app/src/theme/tokens.ts');
