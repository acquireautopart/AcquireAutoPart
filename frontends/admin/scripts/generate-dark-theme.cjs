/**
 * Generates src/app/theme.css – the dark-mode layer for the whole storefront.
 *
 * The site was written with light-surface Tailwind classes (bg-white, text-[#171916],
 * border-[#ececea] ...). Instead of editing every component, this script scans the
 * source, finds those light colours and emits a dark equivalent that only applies when
 * <html data-theme="dark">. Light mode is untouched.
 *
 * Re-run after adding new light colour classes:   npm run theme:generate
 *
 * Opt-outs:
 *  - wrap an element in `.theme-keep` to leave everything inside it as written
 *  - files in SKIP_FILES are not scanned (they use their own CSS variables)
 *  - KEEP classes never get a dark override (e.g. a surface that must stay white)
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const OUT = path.join(SRC, "app", "theme.css");
const SKIP_FILES = [/components[\\/]profile[\\/]/, /app[\\/]profile[\\/]/, /AuthDialog\.jsx$/];
const KEEP = new Set(["bg-[#fff]"]);
const DARK = ':where(html[data-theme="dark"])';

const NAMED = { white: "#ffffff", "line-light": "#e5e7eb" };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parseHex(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return "#" + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// light surface -> dark surface
function darkBg(hex) {
  const [h, s, l] = rgbToHsl(parseHex(hex));
  if (l < 0.85) return null;
  return hslToHex([h, s * 0.7, 0.075 + (1 - l) * 0.9]);
}
// dark/neutral text -> light text
function lightText(hex) {
  const [h, s, l] = rgbToHsl(parseHex(hex));
  if (s < 0.25 && l < 0.62) return hslToHex([h, s, clamp(1 - l, 0.64, 0.95)]);
  if (s >= 0.25 && l < 0.5 && (h <= 40 || h >= 350)) return hslToHex([h, Math.min(s, 0.85), 0.66]); // dark orange/brown text
  return null;
}
// light border -> dark border
function darkBorder(hex) {
  const [h, s, l] = rgbToHsl(parseHex(hex));
  if (l < 0.7) return null;
  return hslToHex([h, s * 0.5, 0.09 + (1 - l) * 1.1]);
}

const esc = (name) => name.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
const TOKEN =
  /(?<![\w-])((?:hover|focus|focus-within|group-hover|placeholder):)?(bg|text|border|ring|from|to)-(\[#[0-9a-fA-F]{3,6}\]|white|line-light)(?:\/(\d+))?(?![\w-])/g;

const rules = new Map(); // className -> css

for (const file of walk(SRC)) {
  if (SKIP_FILES.some((re) => re.test(file))) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(TOKEN)) {
    const [full, variant, util, colour, alpha] = m;
    if (KEEP.has(full) || rules.has(full)) continue;
    const alphaNum = alpha ? Number(alpha) / 100 : 1;
    const hex = colour.startsWith("[") ? colour.slice(1, -1) : NAMED[colour];

    let next = null;
    if (util === "bg" || util === "from" || util === "to") {
      if (alphaNum < 0.8) continue; // translucent white overlays are meant for dark surfaces
      next = darkBg(hex);
    } else if (util === "text") {
      next = lightText(hex);
    } else if (util === "border" || util === "ring") {
      if (alphaNum < 0.8) continue;
      next = darkBorder(hex);
    }
    if (!next) continue;

    const value =
      alphaNum < 1
        ? `rgb(${parseHex(next).map((v) => Math.round(v * 255)).join(" ")} / ${alphaNum})`
        : next;
    let decl;
    if (util === "bg") decl = `background-color:${value}`;
    else if (util === "text") decl = `color:${value}`;
    else if (util === "border") decl = `border-color:${value}`;
    else if (util === "ring") decl = `--tw-ring-color:${value}`;
    else if (util === "from")
      decl = `--tw-gradient-from:${value} var(--tw-gradient-from-position);--tw-gradient-to:rgb(${parseHex(next).map((v) => Math.round(v * 255)).join(" ")} / 0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`;
    else decl = `--tw-gradient-to:${value} var(--tw-gradient-to-position)`;

    const cls = esc(full);
    const guard = ":where(:not(.theme-keep *))";
    let selector;
    if (variant === "hover:") selector = `.${cls}:hover${guard}`;
    else if (variant === "focus:") selector = `.${cls}:focus${guard}`;
    else if (variant === "focus-within:") selector = `.${cls}:focus-within${guard}`;
    else if (variant === "placeholder:") selector = `.${cls}${guard}::placeholder`;
    else if (variant === "group-hover:") selector = `.group:hover .${cls}${guard}`;
    else selector = `.${cls}${guard}`;
    rules.set(full, `${DARK} ${selector}{${decl}}`);
  }
}

// ── static dark-mode rules for things that are not Tailwind classes ──
const base = `
${DARK} { color-scheme: dark; }
${DARK} body { background: #0b0b0b; color: #f2f2f0; }
${DARK} .category-nav-fixed-all { background: #121212; border-color: #262626; }
${DARK} ::selection { background: #ff6b00; color: #fff; }
@media (max-width: 639px) {
  ${DARK} .category-nav-fixed-all { background: #121212; border-left-color: #262626; }
}
`;

const body = [...rules.values()].sort().join("\n");
fs.writeFileSync(
  OUT,
  `/* AUTO-GENERATED by scripts/generate-dark-theme.cjs – do not edit by hand. */\n${base}\n${body}\n`,
);
console.log(`theme.css written with ${rules.size} class overrides`);
