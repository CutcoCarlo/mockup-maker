/* Mockup Maker — engraved knife mockups from a logo, entirely in the browser. */
(() => {
'use strict';

const DEBUG = /debug/.test(location.search);
const STORE_KEY = 'mockup-maker-v1';
// "Find logo" helper: the Google Apps Script web-app URL (see logo-finder/Code.gs). Empty = feature hidden.
const DEFAULT_FINDER = 'https://script.google.com/macros/s/AKfycbyNI7AmtTJbFLxdSsz87s3wyhQM3vzZUswbBVJQI9MKM5WwLQdjzZQGzls6Se8P9U7huQ/exec';
const FINDER_URL = (localStorage.getItem('mm-finder') || DEFAULT_FINDER).trim();

// ─── Products ───────────────────────────────────────────────────────────────
// zone = engravable area of the blade, as fractions of the (landscape) image.
const PRODUCTS = [
  { id: 'spreader', name: 'Spatula Spreader', arc: true, tagline: 'Thanks for Spreading the Word!',
    images: {
      classic: { src: 'images/landscape/spatula-spreader-classic.jpg', zone: { x: .12, y: .35, w: .38, h: .30 }, stamp: { x: .51, y: .33, w: .23, h: .30 } },
      pearl:   { src: 'images/landscape/spatula-spreader-pearl.jpg',   zone: { x: .12, y: .34, w: .38, h: .30 }, stamp: { x: .50, y: .32, w: .23, h: .31 } },
      red:     { src: 'images/landscape/spatula-spreader-red.jpg',     zone: { x: .12, y: .34, w: .38, h: .30 }, stamp: { x: .51, y: .32, w: .23, h: .32 } },
    } },
  { id: 'santoku', name: 'Santoku', arc: false, tagline: '',
    images: {
      classic: { src: 'images/landscape/santoku-classic.jpg', zone: { x: .16, y: .31, w: .36, h: .27 }, stamp: { x: .58, y: .22, w: .21, h: .27 } },
      pearl:   { src: 'images/landscape/santoku-pearl.jpg',   zone: { x: .16, y: .30, w: .36, h: .23 }, stamp: { x: .60, y: .17, w: .20, h: .28 } },
      red:     { src: 'images/landscape/santoku-red.jpg',     zone: { x: .16, y: .30, w: .36, h: .24 }, stamp: { x: .59, y: .16, w: .21, h: .30 } },
    } },
  { id: 'veggie', name: '6" Veggie Knife', arc: false, tagline: '',
    images: {
      classic: { src: 'images/landscape/veggie-6in-classic.jpg', zone: { x: .10, y: .28, w: .40, h: .27 }, stamp: { x: .53, y: .24, w: .16, h: .26 } },
      pearl:   { src: 'images/landscape/veggie-6in-pearl.jpg',   zone: { x: .10, y: .29, w: .40, h: .25 }, stamp: { x: .52, y: .24, w: .21, h: .26 } },
      red:     { src: 'images/landscape/veggie-6in-red.jpg',     zone: { x: .10, y: .29, w: .40, h: .27 }, stamp: { x: .53, y: .24, w: .19, h: .26 } },
    } },
  { id: 'trimmer', name: 'Santoku Trimmer', arc: false, tagline: '',
    images: {
      classic: { src: 'images/landscape/santoku-trimmer-classic.jpg', zone: { x: .12, y: .39, w: .38, h: .14 }, stamp: { x: .43, y: .29, w: .27, h: .17 } },
      pearl:   { src: 'images/landscape/santoku-trimmer-pearl.jpg',   zone: { x: .12, y: .38, w: .38, h: .13 }, stamp: { x: .43, y: .26, w: .23, h: .16 } },
      red:     { src: 'images/landscape/santoku-trimmer-red.jpg',     zone: { x: .12, y: .38, w: .38, h: .13 }, stamp: { x: .43, y: .30, w: .25, h: .15 } },
    } },
  // Two engravable surfaces: etched steel on the blade, coloured ink on the black handle. One image for every handle colour.
  { id: 'pocket', name: 'Pocket Knife', arc: false, tagline: '', surfaces: ['blade', 'handle'],
    images: {
      all: { src: 'images/landscape/pocket-knife.jpg', zones: { blade: { x: .10, y: .40, w: .22, h: .20 }, handle: { x: .58, y: .36, w: .30, h: .30, angle: 4 } } },
    } },
];
const MARK_COLORS = ['#ffffff', '#e5322d', '#f2e11f', '#f28c28'];
const imageInfo = (prod) => prod.images[state.handle] || prod.images.all;

// Fonts offered for engraved text — only ones that ship on every Apple device.
const FONTS = [
  { id: 'georgia-bi', label: 'Georgia Bold Italic', css: 'italic bold {px}px Georgia, "Times New Roman", serif' },
  { id: 'georgia-b',  label: 'Georgia Bold',        css: 'bold {px}px Georgia, "Times New Roman", serif' },
  { id: 'tahoma',     label: 'Tahoma',              css: '{px}px Tahoma, Verdana, sans-serif' },
  { id: 'tahoma-b',   label: 'Tahoma Bold',         css: 'bold {px}px Tahoma, Verdana, sans-serif' },
  { id: 'arial',      label: 'Arial',               css: '{px}px Arial, Helvetica, sans-serif' },
];
const fontCss = (id, px) => (FONTS.find(f => f.id === id) || FONTS[0]).css.replace('{px}', px);

const INK = '#4c4c4c';          // engraving color before opacity/multiply
const PREVIEW_W = 1200;         // on-screen render width; export uses native size
const DEFAULT_CLEANUP = { level: 200, light: false, separate: false, separation: 40, removed: [] };

// ─── Designs ────────────────────────────────────────────────────────────────
// Every knife holds a list of designs. A design is one picture: which side of the knife,
// whether the logo and/or text are on, up to three lines of text, how the text sits
// relative to the logo, and its own sliders.
let designSeq = Date.now();
const blankLines = () => [1, 2, 3].map(() => ({ text: '', font: 'georgia-bi' }));
function newDesign(prod, side = 'front', over = {}) {
  return {
    id: 'D' + (designSeq++),
    side,                         // 'front' | 'back'
    logo: true, text: false,
    lines: blankLines(),
    pos: prod.id === 'trimmer' ? 'right' : 'above',   // text relative to the logo: above | below | left | right
    curve: prod.arc ? 95 : 0,     // line 1 curve when above/below (0 = straight)
    logoSpot: 'stamp',            // back only: 'stamp' (small, where the CUTCO mark is) | 'center'
    surface: 'handle',            // pocket knife only
    opacity: 40, inkOpacity: 85, markColor: '#ffffff',
    size: 100, vert: 0, horiz: 0, rot: 0,          // logo (moves logo + text together)
    tsize: 100, tvert: 0, thoriz: 0, trot: 0,      // text
    ...over,
  };
}
function starterDesigns(prod) {
  const d = newDesign(prod);
  if (prod.tagline) { d.text = true; d.lines[0].text = prod.tagline; }
  return [d];
}
const defaultPer = (p) => ({ collapsed: false, designs: starterDesigns(p) });

// ─── State ──────────────────────────────────────────────────────────────────
const state = {
  logos: [],            // { id, name, dataURL, w, h }
  activeLogoId: null,
  cleanup: { ...DEFAULT_CLEANUP },
  handle: 'classic',
  per: {},
  pinkBg: false,
  pickerCollapsed: false,
};
PRODUCTS.forEach(p => state.per[p.id] = defaultPer(p));

function save() {
  try {
    const slim = { ...state, logos: state.logos.filter(l => !l.transient || l.id === state.activeLogoId).slice(-8) };
    localStorage.setItem(STORE_KEY, JSON.stringify(slim));
  } catch (e) { /* storage full or blocked — ignore */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.handle = s.handle || 'classic';
    state.pinkBg = !!s.pinkBg; state.pickerCollapsed = !!s.pickerCollapsed;
    state.activeLogoId = s.activeLogoId || null;
    state.cleanup = { ...DEFAULT_CLEANUP, ...(s.cleanup || {}) };
    state.logos = (s.logos || []).filter(l => l && l.dataURL);
    if (!state.logos.find(l => l.id === state.activeLogoId)) state.activeLogoId = state.logos.length ? state.logos[state.logos.length - 1].id : null;
    PRODUCTS.forEach(p => {
      const old = (s.per || {})[p.id];
      if (old && Array.isArray(old.designs) && old.designs.length) {
        state.per[p.id] = { collapsed: !!old.collapsed, designs: old.designs.map(d => ({ ...newDesign(p), ...d, lines: (d.lines && d.lines.length === 3) ? d.lines : blankLines() })) };
      } else if (old && old.tagline !== undefined) {
        state.per[p.id] = { collapsed: false, designs: migrateOld(p, old, s) };   // settings from the previous version
      }
    });
  } catch (e) { /* corrupt store — start fresh */ }
}
// Turn the previous version's per-knife settings into designs, so nothing already tuned is lost.
function migrateOld(p, o, s) {
  const front = newDesign(p, 'front', {
    logo: s.branding !== false, text: !!(o.tagline || s.personalized),
    pos: o.tagpos || (p.id === 'trimmer' ? 'right' : 'above'), curve: o.tagcurve ?? (p.arc ? 95 : 0), surface: o.surface || 'handle',
    opacity: o.opacity ?? 40, inkOpacity: o.inkOpacity ?? 85, markColor: o.markColor || '#ffffff',
    size: o.size ?? 100, vert: o.vert ?? 0, horiz: o.horiz ?? 0, rot: o.rot ?? 0,
    tsize: o.tagline ? (o.tagsize ?? 100) : (o.tsize ?? 100), tvert: o.tagline ? (o.tagvert ?? 0) : (o.tvert ?? 0), thoriz: o.thoriz ?? 0, trot: o.trot ?? 0,
  });
  if (o.tagline) { front.lines[0] = { text: o.tagline, font: o.tagfont || 'georgia-bi' }; }
  else if (s.text) { [1, 2, 3].forEach(i => front.lines[i - 1] = { text: s.text['line' + i] || '', font: s.text['font' + i] || 'georgia-bi' }); }
  const out = [front];
  if (s.showBack && !p.surfaces) {
    const back = newDesign(p, 'back', {
      logo: o.blogo !== false, text: true, logoSpot: 'stamp',
      opacity: o.opacity ?? 40, size: o.bsize ?? 100, vert: o.bvert ?? 0, horiz: o.bhoriz ?? 0, rot: o.brot ?? 0,
      tsize: o.btsize ?? 100, tvert: o.btvert ?? 0, thoriz: o.bthoriz ?? 0, trot: o.btrot ?? 0,
    });
    if (s.back) [1, 2, 3].forEach(i => back.lines[i - 1] = { text: s.back['line' + i] || '', font: s.back['font' + i] || 'georgia-bi' });
    out.push(back);
  }
  return out;
}
const designOf = (pid, did) => state.per[pid].designs.find(d => d.id === did);

// ─── DOM helpers ────────────────────────────────────────────────────────────
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const show = (el, on = true) => el.classList.toggle('hidden', !on);

// ─── Image loading ──────────────────────────────────────────────────────────
const imgCache = new Map();
function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  imgCache.set(src, p);
  return p;
}

// ─── Logo intake ────────────────────────────────────────────────────────────
let logoSeq = Date.now();
async function addLogoFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataURL = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
  await addLogoFromDataURL(dataURL, file.name || 'logo');
}
// SVGs without a width/height report a 0×0 size; give them one from their viewBox.
function fixSvgDataURL(dataURL) {
  try {
    const [head, payload] = dataURL.split(',');
    const isB64 = /;base64/i.test(head);
    let txt = isB64 ? decodeURIComponent(escape(atob(payload))) : decodeURIComponent(payload);
    const open = txt.match(/<svg\b[^>]*>/i);
    if (!open) return dataURL;
    let tag = open[0];
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      const vb = tag.match(/viewBox=["']\s*[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      const w = vb ? +vb[1] : 1000, h = vb ? +vb[2] : 1000;
      const scale = 1000 / Math.max(w, h);
      tag = tag.replace(/\swidth=["'][^"']*["']/i, '').replace(/\sheight=["'][^"']*["']/i, '')
               .replace(/<svg\b/i, `<svg width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"`);
      txt = txt.replace(open[0], tag);
    }
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
  } catch (e) { return dataURL; }
}

async function addLogoFromDataURL(dataURL, name, opts = {}) {
  if (/^data:image\/svg/i.test(dataURL)) dataURL = fixSvgDataURL(dataURL);
  const im = await loadImage(dataURL);
  if (opts.minSize && (im.naturalWidth < opts.minSize || im.naturalHeight < opts.minSize)) return null;
  // Keep stored logos a sensible size so localStorage and processing stay quick.
  const max = 1400;
  let w = im.naturalWidth, h = im.naturalHeight, url = dataURL;
  if (Math.max(w, h) > max) {
    const s = max / Math.max(w, h);
    const c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    url = c.toDataURL('image/png');
    w = c.width; h = c.height;
    imgCache.delete(dataURL);
  }
  const logo = { id: 'L' + (logoSeq++), name, dataURL: url, w, h, transient: !!opts.transient };
  state.logos.push(logo);
  if (!opts.quiet) {
    state.activeLogoId = logo.id;
    state.cleanup.removed = [];
    invalidateLogo();
    rerenderAll();
  }
  save();
  renderPicker();
  return logo;
}

// ─── Find logo on a website (via the Apps Script helper) ────────────────────
async function finderGet(params) {
  const q = Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  const r = await fetch(FINDER_URL + (FINDER_URL.includes('?') ? '&' : '?') + q, { redirect: 'follow' });
  if (!r.ok) throw new Error('helper returned ' + r.status);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'unknown error');
  return j;
}
async function findLogos(site) {
  const status = $('#url-status'), btn = $('#url-btn');
  site = (site || '').trim();
  if (!site) return;
  const domain = site.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  show(status); status.textContent = 'Looking at ' + domain + '…'; btn.disabled = true;
  try {
    // clear previous finds
    state.logos = state.logos.filter(l => !l.transient || l.id === state.activeLogoId);
    const list = await finderGet({ url: site });
    const cands = list.images || [];
    if (!cands.length) throw new Error('no images on that page');
    status.textContent = `Found ${cands.length} image(s) — loading…`;
    const results = new Array(cands.length).fill(null);
    let next = 0, done = 0;
    const worker = async () => {
      while (next < cands.length) {
        const i = next++;
        const c = cands[i];
        try {
          let dataURL = c.url;
          if (!/^data:/i.test(c.url)) {
            const im = await finderGet({ img: c.url });
            dataURL = `data:${im.type};base64,${im.data}`;
          }
          results[i] = await addLogoFromDataURL(dataURL, c.url.replace(/^data:.*/, 'inline-logo.svg').split('/').pop().split('?')[0] || 'logo', { transient: true, quiet: true, minSize: 40 });
        } catch (e) { /* skip this image */ }
        done++;
        status.textContent = `Found ${results.filter(Boolean).length} option(s) so far… (${done}/${cands.length})`;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    const got = results.filter(Boolean);
    if (!got.length) throw new Error('no usable images');
    status.textContent = `Found ${got.length} option(s) for ${domain}. Tap the best one.`;
    state.pickerCollapsed = false;
    renderPicker();
  } catch (e) {
    status.textContent = `Couldn't get logos from ${domain} (${e.message}). Save the logo to Photos and upload it instead.`;
  } finally { btn.disabled = false; }
}


// ─── Logo processing ────────────────────────────────────────────────────────
// Turns the active logo into an engraving mask: alpha = how strongly each pixel
// is marked, rgb = its palette colour. Also returns the colour palette and bbox.
let processed = null;      // { canvas, w, h, palette:[{hex,r,g,b,count,removed}], bbox }
let processing = null;
let processGen = 0;        // bumped on every change so an in-flight result can't go stale

function invalidateLogo() { processed = null; processing = null; processGen++; }

function hex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

async function getProcessed() {
  if (processed) return processed;
  const logo = state.logos.find(l => l.id === state.activeLogoId);
  if (!logo) return null;
  if (processing) return processing;
  const gen = processGen;
  processing = (async () => {
    const im = await loadImage(logo.dataURL);
    if (gen !== processGen) return getProcessed();
    const out = processLogo(im, state.cleanup);
    if (gen === processGen) { processed = out; processing = null; }
    return out;
  })();
  return processing;
}

function processLogo(im, cl) {
  const maxSide = 900;
  const s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0, w, h);
  const id = x.getImageData(0, 0, w, h), d = id.data, n = w * h;

  // Is the image fully opaque (JPEG-style)? Then the background is whatever colour the corners are.
  let opaque = true;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { opaque = false; break; }
  let bg = [255, 255, 255];
  if (opaque) {
    const pts = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [w >> 1, 0], [w >> 1, h - 1], [0, h >> 1], [w - 1, h >> 1]];
    const cols = pts.map(([px, py]) => { const i = (py * w + px) * 4; return [d[i], d[i + 1], d[i + 2]]; });
    // most common corner colour (within tolerance) wins
    let best = cols[0], bestN = 0;
    for (const a of cols) {
      let k = 0; for (const b of cols) if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 30) k++;
      if (k > bestN) { bestN = k; best = a; }
    }
    bg = best;
  }

  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3] / 255;
    let m = a;
    if (opaque) {
      const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
      m *= clamp01((dist - 28) / 34);
    }
    if (!cl.light) {
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      m *= clamp01((cl.level + 12 - L) / 24);
    }
    alpha[i] = m;
  }

  // ── palette: bin marked pixels, merge nearby bins into clusters ──
  const bins = new Map();
  let markCount = 0;
  for (let i = 0; i < n; i++) {
    if (alpha[i] < 0.6) continue;
    markCount++;
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let e = bins.get(key);
    if (!e) { e = { r: 0, g: 0, b: 0, n: 0 }; bins.set(key, e); }
    e.r += r; e.g += g; e.b += b; e.n++;
  }
  const sorted = Array.from(bins.values()).sort((a, b) => b.n - a.n);
  const clusters = [];
  for (const e of sorted) {
    if (e.n < markCount * 0.002) break;
    const r = e.r / e.n, g = e.g / e.n, b = e.b / e.n;
    let hit = null;
    for (const k of clusters) if (Math.hypot(k.r - r, k.g - g, k.b - b) < 46) { hit = k; break; }
    if (hit) {
      const t = hit.n + e.n;
      hit.r = (hit.r * hit.n + r * e.n) / t; hit.g = (hit.g * hit.n + g * e.n) / t; hit.b = (hit.b * hit.n + b * e.n) / t; hit.n = t;
    } else if (clusters.length < 12) clusters.push({ r, g, b, n: e.n });
  }
  let palette = clusters.filter(k => k.n >= markCount * 0.015).sort((a, b) => b.n - a.n).slice(0, 8);
  if (!palette.length && clusters.length) palette = clusters.slice(0, 1);
  palette = palette.map(k => ({ r: k.r, g: k.g, b: k.b, count: k.n, hex: hex(k.r, k.g, k.b), removed: false }));
  for (const p of palette) {
    p.removed = (cl.removed || []).some(hx => { const [r, g, b] = hexToRgb(hx); return Math.hypot(r - p.r, g - p.g, b - p.b) < 40; });
  }

  // assign every marked pixel to its nearest palette colour; anti-aliased edge
  // pixels (no confident match) take the majority colour of their neighbours
  const idx = new Uint8Array(n).fill(255);
  const sure = new Uint8Array(n);
  if (palette.length) {
    for (let i = 0; i < n; i++) {
      if (alpha[i] <= 0.02) continue;
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      let bi = 0, bd = Infinity;
      for (let k = 0; k < palette.length; k++) {
        const p = palette[k];
        const dd = (p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2;
        if (dd < bd) { bd = dd; bi = k; }
      }
      idx[i] = bi; sure[i] = (bd < 60 * 60 && alpha[i] > 0.85) ? 1 : 0;
    }
    const votes = new Uint16Array(palette.length);
    const fixed = new Uint8Array(idx);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const i = y * w + xx;
      if (idx[i] === 255 || sure[i]) continue;
      votes.fill(0);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const yy = y + dy, xq = xx + dx;
        if (yy < 0 || yy >= h || xq < 0 || xq >= w) continue;
        const j = yy * w + xq;
        if (sure[j]) votes[idx[j]]++;
      }
      let best = -1, bn = 0;
      for (let k = 0; k < votes.length; k++) if (votes[k] > bn) { bn = votes[k]; best = k; }
      if (best >= 0) fixed[i] = best;
    }
    idx.set(fixed);
    // removed colours
    const removedIdx = palette.map(p => p.removed);
    if (removedIdx.some(Boolean)) for (let i = 0; i < n; i++) if (idx[i] !== 255 && removedIdx[idx[i]]) alpha[i] = 0;

    // ── separate touching colours: carve a gap where different colours meet ──
    if (cl.separate && palette.length > 1) {
      const gap = Math.max(1, Math.round(1 + (cl.separation / 100) * 9));
      const erase = new Uint8Array(n);
      const tmp = new Uint8Array(n), dil = new Uint8Array(n);
      for (let k = 0; k < palette.length; k++) {
        if (removedIdx[k]) continue;
        // mask of colour k
        for (let i = 0; i < n; i++) tmp[i] = (idx[i] === k && sure[i]) ? 1 : 0;
        // dilate horizontally then vertically (box)
        for (let y = 0; y < h; y++) {
          const row = y * w;
          let run = 0;
          for (let xx = 0; xx < w + gap; xx++) {
            if (xx < w && tmp[row + xx]) run = 2 * gap + 1; // window
            const tx = xx - gap;
            if (tx >= 0 && tx < w) dil[row + tx] = run > 0 ? 1 : 0;
            if (run > 0) run--;
          }
        }
        for (let xx = 0; xx < w; xx++) {
          let run = 0;
          for (let y = 0; y < h + gap; y++) {
            if (y < h && dil[y * w + xx]) run = 2 * gap + 1;
            const ty = y - gap;
            if (ty >= 0 && ty < h) tmp[ty * w + xx] = run > 0 ? 1 : 0;
            if (run > 0) run--;
          }
        }
        // any pixel of another colour inside the dilated region gets erased
        for (let i = 0; i < n; i++) if (tmp[i] && idx[i] !== 255 && idx[i] !== k) erase[i] = 1;
      }
      for (let i = 0; i < n; i++) if (erase[i]) alpha[i] = 0;
    }
  }

  // ── write mask + bbox ──
  const out = x.createImageData(w, h), o = out.data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    const p = idx[i] !== 255 ? palette[idx[i]] : null;
    o[i * 4] = p ? p.r : 80; o[i * 4 + 1] = p ? p.g : 80; o[i * 4 + 2] = p ? p.b : 80;
    o[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.05) { const px = i % w, py = (i / w) | 0; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
  }
  const mc = document.createElement('canvas'); mc.width = w; mc.height = h;
  mc.getContext('2d').putImageData(out, 0, 0);
  const bbox = maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  return { canvas: mc, w, h, palette, bbox };
}

// ─── Rendering ──────────────────────────────────────────────────────────────
const fontFor = (px, id = 'georgia-bi') => fontCss(id, px);

// Paint `src` (a canvas whose alpha is the mark) into a mark layer in ink colour.
function engrave(layerCtx, src, sx, sy, sw, sh, dx, dy, dw, dh, color = INK) {
  if (dw < 1 || dh < 1) return;
  const t = document.createElement('canvas');
  t.width = Math.ceil(dw); t.height = Math.ceil(dh);
  const tc = t.getContext('2d');
  tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high';
  tc.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = color; tc.fillRect(0, 0, t.width, t.height);
  layerCtx.drawImage(t, dx, dy);
}

// Where the steel is: everything in the photo that isn't the white background.
// Marks are clipped to this so nothing ever shows off the edge of the blade.
const bladeMasks = new Map();
function bladeMask(img, src) {
  if (bladeMasks.has(src)) return bladeMasks.get(src);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i + 3] = Math.round(255 * clamp01((247 - L) / 10));
  }
  x.putImageData(id, 0, 0);
  bladeMasks.set(src, c);
  return c;
}

// Render a block of text lines [{text, font}] (white on transparent) sized to fit maxW×maxH; returns canvas.
function textBlockCanvas(lines, maxW, maxH, scaleMul) {
  const probe = document.createElement('canvas').getContext('2d');
  const widths = lines.map(l => { probe.font = fontFor(100, l.font); return probe.measureText(l.text).width; });
  const lineH = 118; // at 100px
  const fitW = maxW / Math.max(1, ...widths), fitH = maxH / (lines.length * lineH);
  const px = Math.max(6, 100 * Math.min(fitW, fitH) * scaleMul);
  const cw = Math.ceil(Math.max(1, ...widths) * px / 100) + px, ch = Math.ceil(lines.length * lineH * px / 100) + px * 0.4;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = fontFor(px, l.font); g.fillText(l.text, cw / 2, (i + 0.5) * lineH * px / 100 + px * 0.2); });
  return c;
}
function textLines(lines) {
  return (lines || []).map(l => ({ text: (l.text || '').trim(), font: l.font || 'georgia-bi' })).filter(l => l.text);
}

// Arched text (white) along the top of a circle of radius r, centred at (cx, cy) — as a canvas overlay.
function drawArcText(g, text, cx, cy, r, px, fontId) {
  g.font = fontFor(px, fontId); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const chars = Array.from(text);
  const widths = chars.map(ch => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let ang = -(total / 2) / r;
  chars.forEach((ch, i) => {
    const a = ang + (widths[i] / 2) / r;
    g.save(); g.translate(cx + r * Math.sin(a), cy - r * Math.cos(a)); g.rotate(a); g.fillText(ch, 0, 0); g.restore();
    ang += widths[i] / r;
  });
}

// The back of the knife: the photo mirrored, with the CUTCO stamp painted out (real knives
// are only stamped on one side). The stamp is covered with the clean steel just left of it,
// flipped so the shading lines up, and feathered so there's no seam.
const backImages = new Map();
function backImage(img, info) {
  if (backImages.has(info.src)) return backImages.get(info.src);
  const W = img.naturalWidth, H = img.naturalHeight;
  const front = document.createElement('canvas'); front.width = W; front.height = H;
  const fc = front.getContext('2d');
  fc.drawImage(img, 0, 0);
  if (info.stamp) eraseStamp(fc, W, H, info.stamp);
  const back = document.createElement('canvas'); back.width = W; back.height = H;
  const bc = back.getContext('2d');
  bc.translate(W, 0); bc.scale(-1, 1); bc.drawImage(front, 0, 0);
  backImages.set(info.src, back);
  return back;
}
const mirrorZone = (z) => ({ ...z, x: 1 - z.x - z.w, angle: -(z.angle || 0) });

// Paint out the stamp. Inside a generous box, each row is compared with its own local steel
// level to find the stamp's strokes (dark marks and their bright halos). Then, per row, the whole
// span from the outermost stroke on the left to the outermost stroke on the right is replaced
// by a straight blend of the clean steel just outside that span, with the brushed texture from
// the strip beside the box laid back on top. Rows with no stroke are left exactly as photographed.
function eraseStamp(fc, W, H, st) {
  const x0 = Math.max(1, Math.round(st.x * W)), y0 = Math.max(1, Math.round(st.y * H));
  const w = Math.min(W - x0 - 1, Math.round(st.w * W)), h = Math.min(H - y0 - 1, Math.round(st.h * H));
  const img = fc.getImageData(x0, y0, w, h), d = img.data, n = w * h;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const sx = Math.max(0, x0 - w), sw = x0 - sx;
  const strip = sw > 8 ? fc.getImageData(sx, y0, sw, h).data : null;
  const HALF = 45, PAD = 6;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    // the handle starts at the first solid run of near-black pixels (a stroke is never that wide)
    let end = w, run = 0;
    for (let x = 0; x < w; x++) { if (L[row + x] < 70) { if (++run >= 15) { end = x - run + 1; break; } } else run = 0; }
    if (end < 12) continue;
    // local steel level: 80th percentile of a wide sliding window (text is never the majority of it)
    let first = -1, last = -1, count = 0;
    const hist = new Uint16Array(256); let inWin = 0, wa = 0, wb = 0;   // window is [wa, wb)
    for (let x = 0; x < end; x++) {
      const na = Math.max(0, x - HALF), nb = Math.min(end, x + HALF + 1);
      while (wb < nb) { hist[L[row + wb] | 0]++; inWin++; wb++; }
      while (wa < na) { hist[L[row + wa] | 0]--; inWin--; wa++; }
      let acc = 0, base = 255; const target = inWin * 0.8;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) { base = v; break; } }
      if (base < 185) continue;
      const dev = L[row + x] - base;
      if (dev < -6 || dev > 10) {
        // a stroke sits inside steel: blade edges and grind lines have background or a dark band nearby
        const up = L[Math.max(0, y - 9) * w + x], dn = L[Math.min(h - 1, y + 9) * w + x];
        const steel = v => v >= 140 && v <= 249;
        if (!steel(up) || !steel(dn)) continue;
        count++; if (first < 0) first = x; last = x;
      }
    }
    if (first < 0 || count > end * 0.5) continue;               // nothing, or a band (grind line)
    let a = Math.max(1, first - PAD), b = Math.min(end - 2, last + PAD);
    // both ends must sit on bright steel; if the right end is on a shaded edge, pull it in
    while (b > a && L[row + b + 1] < 175) b--;
    while (a < b && L[row + a - 1] < 175) a++;
    if (b <= a) continue;
    // steel colour just outside the span, averaged over 3px
    const left = [0, 0, 0], right = [0, 0, 0];
    for (let k = 1; k <= 3; k++) for (let c = 0; c < 3; c++) { left[c] += d[(row + Math.max(0, a - k)) * 4 + c] / 3; right[c] += d[(row + Math.min(end - 1, b + k)) * 4 + c] / 3; }
    // texture reference: the same gradient inside the strip, so only the grain is transferred
    let tl = [0, 0, 0], tr = [0, 0, 0];
    if (strip) for (let k = 1; k <= 3; k++) for (let c = 0; c < 3; c++) { tl[c] += strip[(y * sw + Math.max(0, (a % sw) - k)) * 4 + c] / 3; tr[c] += strip[(y * sw + Math.min(sw - 1, (b % sw) + k)) * 4 + c] / 3; }
    for (let x = a; x <= b; x++) {
      const t = (x - a + 1) / (b - a + 2);
      for (let c = 0; c < 3; c++) {
        let v = left[c] + (right[c] - left[c]) * t;
        if (strip) { const xs = x % sw; v += 0.5 * (strip[(y * sw + xs) * 4 + c] - (tl[c] + (tr[c] - tl[c]) * t)); }
        d[(row + x) * 4 + c] = Math.max(0, Math.min(255, v));
      }
    }
  }
  fc.putImageData(img, x0, y0);
}

// place the processed logo inside a zone (contain-fit, then size/offset sliders)
// (zone.angle is the surface's natural tilt in degrees; the Rotate sliders add to it)
function placeLogo(lc, P, zone, per, color, moveRef = zone) {
  if (!P || !P.bbox) return;
  const b = P.bbox;
  const fit = Math.min(zone.w / b.w, zone.h / b.h) * (per.size / 100);
  const dw = b.w * fit, dh = b.h * fit;
  const cx = zone.x + zone.w / 2 + (per.horiz / 100) * moveRef.w;
  const cy = zone.y + zone.h / 2 - (per.vert / 100) * moveRef.h;
  lc.save(); lc.translate(cx, cy); lc.rotate(((zone.angle || 0) + per.rot) * Math.PI / 180);
  engrave(lc, P.canvas, b.x, b.y, b.w, b.h, -dw / 2, -dh / 2, dw, dh, color);
  lc.restore();
}
function placeText(lc, zone, per, color, lines) {
  if (!lines.length) return;
  const t = textBlockCanvas(lines, zone.w * 0.9, zone.h * 0.8, per.tsize / 100);
  const cx = zone.x + zone.w / 2 + (per.thoriz / 100) * zone.w;
  const cy = zone.y + zone.h / 2 - (per.tvert / 100) * zone.h;
  lc.save(); lc.translate(cx, cy); lc.rotate(((zone.angle || 0) + per.trot) * Math.PI / 180);
  engrave(lc, t, 0, 0, t.width, t.height, -t.width / 2, -t.height / 2, t.width, t.height, color);
  lc.restore();
}


// Lay out the text around the logo and return the zone left for the logo.
//   above / below : line 1 on that side of the logo (curved if Curve > 0), line 2 on the other side
//   left / right  : up to three lines stacked beside the logo
function drawTextLayout(lc, z, W, H, lines, d) {
  if (!lines.length) return { ...z };
  const pos = d.pos;
  if (pos === 'left' || pos === 'right') {
    const box = pos === 'left' ? { x: z.x, y: z.y, w: z.w * 0.48, h: z.h } : { x: z.x + z.w * 0.52, y: z.y, w: z.w * 0.48, h: z.h };
    placeText(lc, { ...box, angle: z.angle }, { tsize: d.tsize, tvert: d.tvert, thoriz: 0, trot: d.trot }, INK, lines);
    return pos === 'left' ? { ...z, x: z.x + z.w * 0.52, w: z.w * 0.48 } : { ...z, w: z.w * 0.48 };
  }
  const band = (line, where, curved) => {
    const g = document.createElement('canvas'); g.width = W; g.height = H;
    const gc = g.getContext('2d');
    gc.font = fontFor(100, line.font);
    const w100 = gc.measureText(line.text).width || 1;
    const px = Math.max(8, Math.min(z.h * (curved ? 0.20 : 0.16), 100 * (z.w * 0.9) / w100) * (d.tsize / 100));
    const yOff = -(d.tvert / 100) * z.h;
    if (curved) {
      const r = z.w * (0.6 + ((100 - d.curve) / 100) * 4);      // Curve 100 = tight arc, 1 = nearly flat
      const apex = where === 'above' ? z.y + px * 1.05 : z.y + z.h - px * 0.25;
      drawArcText(gc, line.text, z.x + z.w / 2, apex + r + yOff, r, px, line.font);
    } else {
      gc.font = fontFor(px, line.font); gc.fillStyle = '#fff'; gc.textAlign = 'center'; gc.textBaseline = 'middle';
      gc.fillText(line.text, z.x + z.w / 2, (where === 'above' ? z.y + px * 0.75 : z.y + z.h - px * 0.7) + yOff);
    }
    engrave(lc, g, 0, 0, W, H, 0, 0, W, H);
    return px * 1.5;
  };
  let top = z.y, bottom = z.y + z.h;
  const other = pos === 'above' ? 'below' : 'above';
  const b1 = band(lines[0], pos, d.curve > 0);
  if (pos === 'above') top += b1; else bottom -= b1;
  if (lines[1]) { const b2 = band(lines[1], other, false); if (other === 'above') top += b2; else bottom -= b2; }
  return { ...z, y: top, h: Math.max(1, bottom - top) };
}

// Render one design of one knife into a canvas.
async function renderDesign(prod, d, canvas, scale) {
  const info = imageInfo(prod);
  const img = await loadImage(info.src);
  const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
  if (prod.surfaces) return renderSurfacesDesign(prod, d, canvas, img, W, H, info);
  const isBack = d.side === 'back';
  const base = isBack ? backImage(img, info) : img;
  const zoneF = isBack ? mirrorZone(info.zone) : info.zone;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0, W, H);
  const z = { x: zoneF.x * W, y: zoneF.y * H, w: zoneF.w * W, h: zoneF.h * H, angle: zoneF.angle || 0 };
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
  const lc = layer.getContext('2d');
  const P = d.logo ? await getProcessed() : null;
  const lines = d.text ? textLines(d.lines) : [];

  if (P && P.bbox && isBack && d.logoSpot === 'stamp' && info.stamp) {
    // small logo where the stamp was; text centred on the blade
    const st = mirrorZone(info.stamp);
    placeLogo(lc, P, { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H, angle: z.angle }, d, INK, z);
    if (lines.length) placeText(lc, z, d, INK, lines);
  } else if (P && P.bbox) {
    // logo with text arranged around it; Horizontal / Vertical move them together
    const gz = { ...z, x: z.x + (d.horiz / 100) * z.w, y: z.y - (d.vert / 100) * z.h };
    const logoZone = drawTextLayout(lc, gz, W, H, lines, d);
    placeLogo(lc, P, logoZone, { ...d, horiz: 0, vert: 0 }, INK);
  } else if (lines.length) {
    placeText(lc, z, d, INK, lines);          // text only, centred
  }

  lc.globalCompositeOperation = 'destination-in';
  lc.drawImage(bladeMask(base, info.src + (isBack ? '#back' : '')), 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = d.opacity / 100; ctx.drawImage(layer, 0, 0); ctx.restore();

  if (DEBUG) {
    if (info.stamp && !isBack) { const st = info.stamp; ctx.strokeStyle = 'rgba(0,0,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(st.x * W, st.y * H, st.w * W, st.h * H); }
    ctx.strokeStyle = 'rgba(255,0,0,.8)'; ctx.lineWidth = 2; ctx.strokeRect(z.x, z.y, z.w, z.h);
  }
}

// Pocket knife: etched steel on the blade, coloured ink on the handle. The tab picks where the
// logo goes; text (if on) takes the other surface, or the chosen surface when the logo is off.
function renderSurfacesDesign(prod, d, canvas, img, W, H, info) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  return (d.logo ? getProcessed() : Promise.resolve(null)).then(P => {
    const zone = (name) => { const zz = info.zones[name]; return { x: zz.x * W, y: zz.y * H, w: zz.w * W, h: zz.h * H, angle: zz.angle || 0 }; };
    const chosen = d.surface === 'blade' ? 'blade' : 'handle', other = chosen === 'blade' ? 'handle' : 'blade';
    const logoSurf = chosen, textSurf = d.logo ? other : chosen;
    const steel = document.createElement('canvas'), ink = document.createElement('canvas');
    steel.width = ink.width = W; steel.height = ink.height = H;
    const sc = steel.getContext('2d'), ic = ink.getContext('2d');
    const draw = (surf, fn) => surf === 'blade' ? fn(sc, INK) : fn(ic, d.markColor);
    const lines = d.text ? textLines(d.lines) : [];
    if (P && P.bbox) draw(logoSurf, (c, col) => placeLogo(c, P, zone(logoSurf), d, col));
    if (lines.length) draw(textSurf, (c, col) => placeText(c, zone(textSurf), d, col, lines));
    const mask = bladeMask(img, info.src);
    for (const [layer, lc, op, alpha] of [[steel, sc, 'multiply', d.opacity / 100], [ink, ic, 'source-over', d.inkOpacity / 100]]) {
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask, 0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.drawImage(layer, 0, 0); ctx.restore();
    }
  });
}

// on-screen rerender, coalesced per product; one pass at a time
const pending = new Set();
let raf = 0;
function rerender(pid) {
  pending.add(pid);
  if (raf) return;
  raf = requestAnimationFrame(async () => {
    while (pending.size) {
      const ids = Array.from(pending); pending.clear();
      for (const id of ids) {
        const prod = PRODUCTS.find(p => p.id === id);
        if (state.per[id].collapsed) continue;
        for (const d of state.per[id].designs) {
          const canvas = $(`#products .design[data-did="${d.id}"] canvas.mock`);
          if (!canvas) continue;
          try {
            const img = await loadImage(imageInfo(prod).src);
            await renderDesign(prod, d, canvas, PREVIEW_W / img.naturalWidth);
          } catch (e) { console.error('render failed', id, d.id, e); }
        }
      }
    }
    raf = 0;
  });
}
function rerenderAll() { PRODUCTS.forEach(p => rerender(p.id)); }

async function exportCanvas(prod, d) {
  const c = document.createElement('canvas');
  await renderDesign(prod, d, c, 1);
  return c;
}
function canvasBlob(c) { return new Promise(res => c.toBlob(res, 'image/png')); }
function fileName(prod, d) {
  const logo = state.logos.find(l => l.id === state.activeLogoId);
  const base = (logo ? logo.name.replace(/\.[a-z0-9]+$/i, '') : 'mockup').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 30);
  const n = state.per[prod.id].designs.indexOf(d) + 1;
  return `${base}-${prod.id}-${prod.surfaces ? d.surface : d.side}-${n}.png`;
}
async function download(prod, d) {
  const c = await exportCanvas(prod, d);
  const blob = await canvasBlob(c);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName(prod, d);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function share(items) {
  const files = [];
  for (const [p, d] of items) files.push(new File([await canvasBlob(await exportCanvas(p, d))], fileName(p, d), { type: 'image/png' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: 'Engraving mockup' }); } catch (e) { /* user cancelled */ }
  } else {
    for (const [p, d] of items) await download(p, d);
  }
}
const allDesigns = () => PRODUCTS.flatMap(p => state.per[p.id].designs.map(d => [p, d]));

// ─── Picker UI ──────────────────────────────────────────────────────────────
let combine = null; // { picks: [], balance: 100 }

function renderPicker() {
  const card = $('#picker-card');
  show(card, state.logos.length > 0);
  show($('#no-logo-hint'), state.logos.length === 0);
  const grid = $('#logo-grid');
  grid.classList.toggle('pink', state.pinkBg);
  grid.classList.toggle('collapsed', state.pickerCollapsed && !combine);
  $('#pink-toggle').classList.toggle('on', state.pinkBg);
  $('#picker-collapse').textContent = state.pickerCollapsed ? '▸' : '▾';
  $('#picker-title').textContent = state.logos.length > 1 ? 'Pick the best logo' : 'Your logo';
  grid.innerHTML = '';
  const ordered = [...state.logos.filter(l => l.transient), ...state.logos.filter(l => !l.transient)];
  ordered.forEach(l => {
    const t = document.createElement('div');
    t.className = 'logo-thumb' + (l.id === state.activeLogoId && !combine ? ' sel' : '');
    t.innerHTML = `<img src="${l.dataURL}" alt=""><span class="dim">${l.w}×${l.h}</span>`;
    const pickIdx = combine ? combine.picks.indexOf(l.id) : -1;
    if (pickIdx >= 0) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = pickIdx + 1; t.appendChild(b); }
    else if (!combine) {
      const rm = document.createElement('button'); rm.className = 'rm'; rm.textContent = '✕'; rm.title = 'Remove';
      rm.onclick = (e) => { e.stopPropagation(); removeLogo(l.id); };
      t.appendChild(rm);
    }
    t.onclick = () => combine ? combinePick(l.id) : selectLogo(l.id);
    grid.appendChild(t);
  });
  show($('#combine-btn'), state.logos.length > 1 && !combine);
}
function selectLogo(id) {
  if (state.activeLogoId === id) return;
  state.activeLogoId = id; state.cleanup.removed = [];
  save(); invalidateLogo(); renderPicker(); renderCleanup(); rerenderAll();
}
function removeLogo(id) {
  state.logos = state.logos.filter(l => l.id !== id);
  if (state.activeLogoId === id) { state.activeLogoId = state.logos.length ? state.logos[state.logos.length - 1].id : null; invalidateLogo(); }
  save(); renderPicker(); renderCleanup(); rerenderAll();
}

// combine two logos into one (side by side)
function startCombine() { combine = { picks: [], balance: 100 }; $('#combine-balance').value = 100; $('#combine-balance-val').textContent = '100%'; show($('#combine-panel')); updateCombine(); renderPicker(); }
function cancelCombine() { combine = null; show($('#combine-panel'), false); renderPicker(); }
function combinePick(id) {
  const i = combine.picks.indexOf(id);
  if (i >= 0) combine.picks.splice(i, 1); else if (combine.picks.length < 2) combine.picks.push(id);
  renderPicker(); updateCombine();
}
async function combinedCanvas() {
  const [a, b] = combine.picks.map(id => state.logos.find(l => l.id === id));
  if (!a || !b) return null;
  const [ia, ib] = await Promise.all([loadImage(a.dataURL), loadImage(b.dataURL)]);
  const H = 600, bal = combine.balance / 100;
  const ha = H * bal, wa = ia.naturalWidth / ia.naturalHeight * ha;
  const hb = H, wb = ib.naturalWidth / ib.naturalHeight * hb;
  const gap = H * 0.08, top = Math.max(ha, hb);
  const c = document.createElement('canvas'); c.width = Math.ceil(wa + gap + wb); c.height = Math.ceil(top);
  const g = c.getContext('2d');
  g.drawImage(ia, 0, (top - ha) / 2, wa, ha);
  g.drawImage(ib, wa + gap, (top - hb) / 2, wb, hb);
  return c;
}
async function updateCombine() {
  const msg = $('#combine-msg'), use = $('#combine-use'), prev = $('#combine-preview');
  if (combine.picks.length < 2) {
    msg.textContent = combine.picks.length === 0 ? 'Tap two logos in the order you want them, left → right.' : 'Now tap the second logo.';
    use.disabled = true; prev.width = 1; prev.height = 1; return;
  }
  msg.textContent = 'Preview below — adjust Balance or Swap, then Use combined.';
  const c = await combinedCanvas();
  prev.width = c.width; prev.height = c.height; prev.getContext('2d').drawImage(c, 0, 0);
  use.disabled = false;
}
async function useCombined() {
  const c = await combinedCanvas(); if (!c) return;
  const names = combine.picks.map(id => state.logos.find(l => l.id === id).name.replace(/\.[a-z0-9]+$/i, ''));
  combine = null; show($('#combine-panel'), false);
  await addLogoFromDataURL(c.toDataURL('image/png'), names.join('+') + '.png');
}

// ─── Cleanup UI ─────────────────────────────────────────────────────────────
async function renderCleanup() {
  const cl = state.cleanup;
  $('#cl-level').value = cl.level; $('#cl-level-val').textContent = cl.level;
  $('#cl-light').checked = cl.light; $('#cl-separate').checked = cl.separate;
  $('#cl-sep').value = cl.separation; $('#cl-sep-val').textContent = cl.separation;
  show($('#cl-sep-row'), cl.separate);
  const P = await getProcessed();
  const sw = $('#swatches'); sw.innerHTML = '';
  if (!P) { sw.innerHTML = '<span class="muted small">Upload a logo to see its colors.</span>'; return; }
  P.palette.forEach(p => {
    const s = document.createElement('div');
    s.className = 'swatch' + (p.removed ? ' off' : ''); s.style.background = p.hex; s.title = p.hex;
    s.onclick = () => {
      const i = cl.removed.findIndex(hx => { const [r, g, b] = hexToRgb(hx); return Math.hypot(r - p.r, g - p.g, b - p.b) < 40; });
      if (i >= 0) cl.removed.splice(i, 1); else cl.removed.push(p.hex);
      cleanupChanged();
    };
    sw.appendChild(s);
  });
}
let cleanupTimer = 0;
function cleanupChanged() {
  save(); invalidateLogo();
  clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(async () => { await renderCleanup(); rerenderAll(); }, 60);
}


// ─── Product cards ──────────────────────────────────────────────────────────
const POSITIONS = [['above', 'Above'], ['below', 'Below'], ['left', 'Left'], ['right', 'Right']];
const segHtml = (cls, items) => `<div class="seg ${cls}">${items.map(([v, l]) => `<button data-val="${v}">${l}</button>`).join('')}</div>`;
const sliderHtml = (label, k, min, max, step) => `<div class="slider-row" data-row="${k}"><label>${label}</label><input type="range" data-k="${k}" min="${min}" max="${max}"${step ? ` step="${step}"` : ''}><span></span></div>`;

function designHtml(prod, d, n) {
  const pocket = !!prod.surfaces;
  return `
  <div class="design" data-did="${d.id}">
    <div class="design-head">
      <span class="design-name">Design ${n}</span>
      ${pocket ? '' : segHtml('side', [['front', 'Front'], ['back', 'Back']])}
      ${segHtml('parts', [['logo', 'Logo'], ['text', 'Text']])}
      <span class="spacer"></span>
      <button class="icon-btn small dup" title="Duplicate this design">⧉</button>
      <button class="icon-btn small rm" title="Remove this design">✕</button>
    </div>
    ${pocket ? '<div class="seg surface full"><button data-val="blade">Blade engraving</button><button data-val="handle">Handle engraving</button></div>' : ''}
    <div class="canvas-wrap"><canvas class="mock"></canvas></div>
    <div class="row between actions">
      <div class="row gap"><button class="btn dl">⬇ Download</button><button class="btn sh">⤴ Share</button></div>
      <button class="btn opt">⚙ Options</button>
    </div>
    <div class="subpanel options hidden">
      <div class="text-opts">
        <p class="label"><b>Text</b> <span class="text-note"></span></p>
        <div class="text-lines"></div>
        ${pocket ? '' : `<div class="seg-group pos-row"><span class="seg-label">Position</span>${segHtml('pos', POSITIONS)}</div>`}
        ${sliderHtml('Size', 'tsize', 20, 200)}
        ${pocket ? '' : sliderHtml('Curve', 'curve', 0, 100)}
        ${sliderHtml('Vertical', 'tvert', -60, 60)}
        ${sliderHtml('Horizontal', 'thoriz', -60, 60)}
        ${sliderHtml('Rotate', 'trot', -45, 45, 0.25)}
        <button class="btn link copy-text">⧉ Copy this text to all knives</button>
        <hr>
      </div>
      <div class="logo-opts">
        <p class="label"><b>Logo</b></p>
        ${pocket ? '' : `<div class="seg-group pos-row spot-row"><span class="seg-label">Placement</span>${segHtml('spot', [['stamp', 'Stamp spot (small)'], ['center', 'Centered']])}</div>`}
        ${sliderHtml('Size', 'size', 20, 300)}
        ${sliderHtml('Vertical', 'vert', -60, 60)}
        ${sliderHtml('Horizontal', 'horiz', -100, 60)}
        ${sliderHtml('Rotate', 'rot', -45, 45, 0.25)}
        <hr>
      </div>
      <p class="label"><b>Engraving</b></p>
      ${sliderHtml('Opacity', 'opacity', 5, 100)}
      ${pocket ? sliderHtml('Handle ink', 'inkOpacity', 5, 100) + '<div class="mark-row"><p class="label"><b>Mark color</b> — for the handle</p><div class="swatches mark-swatches"></div></div>' : ''}
    </div>
  </div>`;
}

function buildProducts() {
  const host = $('#products'); host.innerHTML = '';
  PRODUCTS.forEach(prod => {
    const per = state.per[prod.id];
    const el = document.createElement('div'); el.className = 'product'; el.dataset.id = prod.id;
    el.innerHTML = `
      <div class="product-head"><h3 class="product-name">${prod.name}</h3><span class="muted small count"></span><span class="chev">${per.collapsed ? '▸' : '▾'}</span></div>
      <div class="designs ${per.collapsed ? 'hidden' : ''}"></div>
      <div class="row add-row ${per.collapsed ? 'hidden' : ''}"><button class="btn add-design">＋ Add design</button></div>`;
    $('.product-head', el).onclick = () => { per.collapsed = !per.collapsed; save(); buildProducts(); rerender(prod.id); };
    $('.add-design', el).onclick = () => {
      const last = per.designs[per.designs.length - 1];
      per.designs.push({ ...JSON.parse(JSON.stringify(last)), id: 'D' + (designSeq++) });
      save(); buildProducts(); rerender(prod.id);
    };
    $('.count', el).textContent = per.designs.length + (per.designs.length === 1 ? ' design' : ' designs');
    const list = $('.designs', el);
    if (!per.collapsed) per.designs.forEach((d, i) => list.insertAdjacentHTML('beforeend', designHtml(prod, d, i + 1)));
    host.appendChild(el);
    if (!per.collapsed) per.designs.forEach(d => wireDesign(prod, d, $(`.design[data-did="${d.id}"]`, el)));
  });
  enhanceSliders(host);
}

function wireDesign(prod, d, card) {
  const per = state.per[prod.id];
  const opts = $('.options', card);
  const re = () => rerender(prod.id);
  const wireSeg = (cls, get, set) => {
    const seg = $(`.seg.${cls}`, card); if (!seg) return;
    const sync = () => $$('button', seg).forEach(b => b.classList.toggle('on', get() === b.dataset.val));
    sync();
    $$('button', seg).forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.val); sync(); save(); syncVisibility(); re(); });
  };
  const syncVisibility = () => {
    show($('.text-opts', opts), d.text);
    show($('.logo-opts', opts), d.logo);
    const spot = $('.spot-row', opts); if (spot) show(spot, d.side === 'back' && d.logo);
    const posRow = $('.pos-row:not(.spot-row)', opts); if (posRow) show(posRow, d.logo && !(d.side === 'back' && d.logoSpot === 'stamp'));
    const curve = $('[data-row=curve]', opts); if (curve) show(curve, d.logo && !(d.side === 'back' && d.logoSpot === 'stamp') && /above|below/.test(d.pos));
    const note = $('.text-note', opts);
    const oneEach = d.logo && !(d.side === 'back' && d.logoSpot === 'stamp') && /above|below/.test(d.pos) && !prod.surfaces;
    note.textContent = oneEach ? '— line 1 goes ' + d.pos + ' the logo, line 2 on the other side (Cutco allows one line each)' : '';
    $$('.text-line', opts).forEach((row, i) => row.classList.toggle('dim', oneEach && i === 2));
    $('.design-name', card).textContent = 'Design ' + (per.designs.indexOf(d) + 1) + (prod.surfaces ? '' : d.side === 'back' ? ' · Back' : ' · Front');
  };
  // side / parts / surface / position / placement
  wireSeg('side', () => d.side, v => d.side = v);
  wireSeg('surface', () => d.surface, v => d.surface = v);
  wireSeg('pos', () => d.pos, v => d.pos = v);
  wireSeg('spot', () => d.logoSpot, v => d.logoSpot = v);
  {
    const seg = $('.seg.parts', card);
    const sync = () => $$('button', seg).forEach(b => b.classList.toggle('on', !!d[b.dataset.val]));
    sync();
    $$('button', seg).forEach(b => b.onclick = (e) => {
      e.stopPropagation(); const k = b.dataset.val, o = k === 'logo' ? 'text' : 'logo';
      if (d[k] && !d[o]) return;                 // keep at least one on
      d[k] = !d[k]; sync(); save(); syncVisibility(); re();
    });
  }
  // text lines
  const linesHost = $('.text-lines', opts);
  d.lines.forEach((line, i) => {
    const row = document.createElement('div'); row.className = 'text-line';
    const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 50;
    inp.placeholder = i === 0 ? 'Line 1' : i === 1 ? 'Line 2 (optional)' : 'Line 3 (optional)'; inp.value = line.text || '';
    inp.oninput = () => { line.text = inp.value; re(); }; inp.onchange = save;
    row.appendChild(inp);
    row.appendChild(fontSelect(line.font, id => { line.font = id; save(); re(); }));
    linesHost.appendChild(row);
  });
  $('.copy-text', opts).onclick = () => {
    PRODUCTS.forEach(p => state.per[p.id].designs.forEach(x => { if (x !== d) x.lines = JSON.parse(JSON.stringify(d.lines)); }));
    save(); buildProducts(); rerenderAll();
  };
  // sliders
  $$('input[type=range]', opts).forEach(inp => {
    const k = inp.dataset.k, out = inp.nextElementSibling;
    const fmt = v => /size$/i.test(k) || k === 'opacity' || k === 'inkOpacity' ? v + '%' : /rot$/.test(k) ? (+v).toFixed(2) + '°' : v;
    inp.value = d[k]; out.textContent = fmt(inp.value);
    inp.oninput = () => { d[k] = +inp.value; out.textContent = fmt(inp.value); re(); };
    inp.onchange = save;
  });
  // mark colour (pocket)
  const sw = $('.mark-swatches', opts);
  if (sw) MARK_COLORS.forEach(col => {
    const s = document.createElement('div'); s.className = 'swatch mark' + (d.markColor === col ? ' sel' : ''); s.style.background = col;
    s.onclick = () => { d.markColor = col; $$('.swatch.mark', sw).forEach(x => x.classList.remove('sel')); s.classList.add('sel'); save(); re(); };
    sw.appendChild(s);
  });
  // buttons
  $('.dl', card).onclick = () => download(prod, d);
  $('.sh', card).onclick = () => share([[prod, d]]);
  $('.opt', card).onclick = () => { show(opts, opts.classList.contains('hidden')); $('.opt', card).classList.toggle('on'); };
  $('.dup', card).onclick = () => {
    const i = per.designs.indexOf(d);
    per.designs.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(d)), id: 'D' + (designSeq++) });
    save(); buildProducts(); rerender(prod.id);
  };
  $('.rm', card).onclick = () => {
    if (per.designs.length === 1) { if (!confirm('This is the only design for this knife. Reset it to the starting design?')) return; per.designs = starterDesigns(prod); }
    else per.designs = per.designs.filter(x => x !== d);
    save(); buildProducts(); rerender(prod.id);
  };
  $('.canvas-wrap', card).onclick = () => present(prod, d);
  syncVisibility();
}

// − / + buttons on every slider: one step per tap, hold to keep going
function enhanceSliders(root) {
  $$('input[type=range]', root).forEach(inp => {
    if (inp.dataset.enhanced) return;
    inp.dataset.enhanced = '1';
    const mk = (sign) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'step-btn'; b.textContent = sign > 0 ? '+' : '−';
      const step = parseFloat(inp.step) || 1, min = parseFloat(inp.min), max = parseFloat(inp.max);
      const bump = () => {
        const v = Math.min(max, Math.max(min, Math.round((parseFloat(inp.value) + sign * step) / step) * step));
        if (v === parseFloat(inp.value)) return;
        inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
      };
      let timer = 0, repeat = 0;
      const stop = () => { clearTimeout(timer); clearInterval(repeat); timer = repeat = 0; };
      b.addEventListener('pointerdown', e => { e.preventDefault(); bump(); timer = setTimeout(() => { repeat = setInterval(bump, 90); }, 450); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
      return b;
    };
    inp.before(mk(-1)); inp.after(mk(1));
  });
}
function fontSelect(current, onChange) {
  const sel = document.createElement('select'); sel.className = 'font-select';
  FONTS.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.label; o.style.font = f.css.replace('{px}', 15); if (f.id === current) o.selected = true; sel.appendChild(o); });
  sel.onchange = () => onChange(sel.value);
  return sel;
}


// ─── Present mode ───────────────────────────────────────────────────────────
async function present(prod, d) {
  const c = await exportCanvas(prod, d);
  $('#present-img').src = c.toDataURL('image/jpeg', 0.92);
  show($('#present'));
  document.body.style.overflow = 'hidden';
}
function closePresent() { show($('#present'), false); document.body.style.overflow = ''; }

// ─── Wiring ─────────────────────────────────────────────────────────────────
function wireSegments() {
  $$('.seg[data-key]').forEach(seg => {
    const key = seg.dataset.key;
    const sync = () => $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.val === state[key]));
    sync();
    $$('button', seg).forEach(b => b.onclick = () => { state[key] = b.dataset.val; sync(); save(); rerenderAll(); });
  });
}

function init() {
  load();
  buildProducts();
  wireSegments();
  renderPicker();
  renderCleanup();

  // find logo by website (only when the helper is configured)
  if (FINDER_URL) {
    show($('#url-row'));
    $('#url-btn').onclick = () => findLogos($('#url-input').value);
    $('#url-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findLogos($('#url-input').value); } });
  }

  // intake
  const fi = $('#file-input');
  fi.onchange = async () => { for (const f of Array.from(fi.files)) await addLogoFromFile(f); fi.value = ''; };
  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', async e => { for (const f of Array.from(e.dataTransfer.files)) await addLogoFromFile(f); });
  document.addEventListener('paste', async e => {
    const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault();
    for (const it of items) await addLogoFromFile(it.getAsFile());
  });

  // picker
  $('#pink-toggle').onclick = () => { state.pinkBg = !state.pinkBg; save(); renderPicker(); };
  $('#picker-collapse').onclick = () => { state.pickerCollapsed = !state.pickerCollapsed; save(); renderPicker(); };
  $('#combine-btn').onclick = startCombine;
  $('#combine-cancel').onclick = cancelCombine;
  $('#combine-use').onclick = useCombined;
  $('#combine-swap').onclick = () => { if (combine) { combine.picks.reverse(); renderPicker(); updateCombine(); } };
  $('#combine-balance').oninput = (e) => { if (combine) { combine.balance = +e.target.value; $('#combine-balance-val').textContent = combine.balance + '%'; updateCombine(); } };

  // cleanup
  $('#cleanup-toggle').onclick = () => { const p = $('#cleanup-panel'); show(p, p.classList.contains('hidden')); $('#cleanup-toggle').classList.toggle('on'); };
  $('#cl-level').oninput = e => { state.cleanup.level = +e.target.value; $('#cl-level-val').textContent = e.target.value; cleanupChanged(); };
  $('#cl-light').onchange = e => { state.cleanup.light = e.target.checked; cleanupChanged(); };
  $('#cl-separate').onchange = e => { state.cleanup.separate = e.target.checked; show($('#cl-sep-row'), e.target.checked); cleanupChanged(); };
  $('#cl-sep').oninput = e => { state.cleanup.separation = +e.target.value; $('#cl-sep-val').textContent = e.target.value; cleanupChanged(); };
  $('#cl-reset').onclick = () => { state.cleanup = { ...DEFAULT_CLEANUP, removed: [] }; cleanupChanged(); };

  // footer
  $('#share-all').onclick = () => share(allDesigns());
  $('#reset-designs').onclick = () => {
    if (!confirm('Put every knife back to its single starting design? Your logo stays.')) return;
    PRODUCTS.forEach(p => state.per[p.id] = defaultPer(p)); save(); buildProducts(); rerenderAll();
  };
  $('#reset-all').onclick = () => {
    if (!confirm('Clear the logo and every setting?')) return;
    localStorage.removeItem(STORE_KEY); location.reload();
  };

  // present
  $('#present-close').onclick = closePresent;
  $('#present').onclick = (e) => { if (e.target.id === 'present') closePresent(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePresent(); });

  enhanceSliders(document);
  rerenderAll();

  if ('serviceWorker' in navigator && !DEBUG && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (DEBUG) window.__mm = { state, PRODUCTS, addLogoFromDataURL, rerenderAll, save, exportCanvas, backImage, loadImage, newDesign };
document.addEventListener('DOMContentLoaded', init);
})();
