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
const DEFAULT_TEXT = { line1: 'Handcrafted Especially For', line2: 'The Jones Family', line3: '', font1: 'georgia-bi', font2: 'georgia-bi', font3: 'georgia-bi' };
const DEFAULT_BACK = { line1: '', line2: '', line3: '', font1: 'georgia-bi', font2: 'georgia-bi', font3: 'georgia-bi' };
const DEFAULT_CLEANUP = { level: 200, light: false, separate: false, separation: 40, removed: [] };
const defaultPer = (p) => ({ opacity: 40, inkOpacity: 85, markColor: '#ffffff', surface: 'handle', size: 100, vert: 0, horiz: 0, rot: 0, tsize: 100, tvert: 0, thoriz: 0, trot: 0, tagline: p.tagline, tagfont: 'georgia-bi', tagsize: 100, tagcurve: p.arc ? 95 : 0, tagvert: 0,
  // back side: small logo where the stamp was, message in the middle, optional tagline
  blogo: true, bsize: 100, bvert: 0, bhoriz: 0, brot: 0, btsize: 100, btvert: 0, bthoriz: 0, btrot: 0,
  btagline: '', btagfont: 'georgia-bi', btagsize: 100, btagcurve: p.arc ? 95 : 0, btagvert: 0 });

// ─── State ──────────────────────────────────────────────────────────────────
const state = {
  logos: [],            // { id, name, dataURL, w, h }
  activeLogoId: null,
  cleanup: { ...DEFAULT_CLEANUP },
  showFront: true,      // front of the knife
  showBack: false,      // mirrored back of the knife (not the pocket knife)
  branding: true,       // show the logo side
  personalized: false,  // show the recipient-text side (both on = combined view)
  handle: 'classic',
  text: { ...DEFAULT_TEXT },
  back: { ...DEFAULT_BACK },
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
    Object.assign(state, s);
    if (s.type && s.branding === undefined) { state.branding = true; state.personalized = s.type === 'personalized'; }
    if (!state.branding && !state.personalized) state.branding = true;
    if (s.bothSides !== undefined && s.showBack === undefined) { state.showFront = true; state.showBack = !!s.bothSides; }
    if (!state.showFront && !state.showBack) state.showFront = true;
    delete state.bothSides;
    delete state.type;
    state.cleanup = { ...DEFAULT_CLEANUP, ...(s.cleanup || {}) };
    state.text = { ...DEFAULT_TEXT, ...(s.text || {}) };
    state.back = { ...DEFAULT_BACK, ...(s.back || {}) };
    if (s.text && s.text.font && !s.text.font1) { const f = s.text.font === 'bold' ? 'georgia-b' : 'georgia-bi'; state.text.font1 = state.text.font2 = state.text.font3 = f; }
    delete state.text.font;
    PRODUCTS.forEach(p => state.per[p.id] = { ...defaultPer(p), ...((s.per || {})[p.id] || {}) });
    state.logos = (s.logos || []).filter(l => l && l.dataURL);
    if (!state.logos.find(l => l.id === state.activeLogoId)) state.activeLogoId = state.logos.length ? state.logos[state.logos.length - 1].id : null;
  } catch (e) { /* corrupt store — start fresh */ }
}

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
function textLines(src = state.text) {
  return [1, 2, 3].map(i => ({ text: (src['line' + i] || '').trim(), font: src['font' + i] || 'georgia-bi' })).filter(l => l.text);
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

const bothViews = () => state.branding && state.personalized;
function labelBand(H, twoViews = bothViews()) { return twoViews ? Math.round(H * 0.12) : 0; }

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

async function renderProduct(prod, canvas, scale) {
  const info = imageInfo(prod);
  const img = await loadImage(info.src);
  const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
  const per = state.per[prod.id];
  if (prod.surfaces) return renderSurfaces(prod, canvas, img, W, H, per, info);
  const views = [state.showFront && state.branding && 'logo', state.showFront && state.personalized && 'text', state.showBack && 'back'].filter(Boolean);
  const sides = state.showFront && state.showBack;
  const band = labelBand(H, views.length > 1);
  const viewH = H + band;
  canvas.width = W; canvas.height = viewH * views.length;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const P = await getProcessed();

  views.forEach((view, vi) => {
    const isBack = view === 'back';
    const base = isBack ? backImage(img, info) : img;
    const zoneF = isBack ? mirrorZone(info.zone) : info.zone;
    ctx.save();
    ctx.translate(0, vi * viewH);
    if (band) {
      ctx.fillStyle = '#1a6fa3';
      ctx.font = `bold ${Math.round(band * 0.44)}px -apple-system, Helvetica, Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      const what = bothViews() ? (view === 'logo' ? 'Branded to Your Business' : view === 'text' ? 'Personalized to the Recipient' : '') : '';
      const side = sides ? (isBack ? 'Back' : 'Front') : '';
      ctx.fillText([side, what].filter(Boolean).join(' — '), W * 0.03, band * 0.55);
    }
    ctx.translate(0, band);
    ctx.drawImage(base, 0, 0, W, H);
    const z = { x: zoneF.x * W, y: zoneF.y * H, w: zoneF.w * W, h: zoneF.h * H, angle: zoneF.angle || 0 };
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    const lc = layer.getContext('2d');

    if (view === 'logo') {
      const logoZone = drawTagline(lc, z, W, H, { text: per.tagline, font: per.tagfont, size: per.tagsize, curve: per.tagcurve, vert: per.tagvert });
      placeLogo(lc, P, logoZone, per, INK);
    } else if (view === 'text') {
      placeText(lc, z, per, INK);
    } else {
      // back: tagline + message in the middle, small logo where the stamp was
      const bp = { size: per.bsize, vert: per.bvert, horiz: per.bhoriz, rot: per.brot, tsize: per.btsize, tvert: per.btvert, thoriz: per.bthoriz, trot: per.btrot };
      const textZone = drawTagline(lc, z, W, H, { text: per.btagline, font: per.btagfont, size: per.btagsize, curve: per.btagcurve, vert: per.btagvert });
      placeText(lc, textZone, bp, INK, textLines(state.back));
      if (per.blogo && info.stamp) {
        const st = mirrorZone(info.stamp);
        const sz = { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H, angle: z.angle };
        placeLogo(lc, P, sz, bp, INK, z);
      }
    }

    // clip marks to the steel, then lay them on as an engraving
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(bladeMask(base, info.src + (isBack ? '#back' : '')), 0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = per.opacity / 100;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();

    if (DEBUG) {
      if (info.stamp && !isBack) { const st = info.stamp; ctx.strokeStyle = 'rgba(0,0,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(st.x * W, st.y * H, st.w * W, st.h * H); }
      ctx.strokeStyle = 'rgba(255,0,0,.8)'; ctx.lineWidth = 2; ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = 'rgba(0,120,255,.35)'; ctx.lineWidth = 1; ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(0,80,200,.8)';
      for (let f = 0.1; f < 1; f += 0.1) {
        ctx.beginPath(); ctx.moveTo(f * W, 0); ctx.lineTo(f * W, H); ctx.stroke(); ctx.fillText(f.toFixed(1), f * W + 2, 12);
        ctx.beginPath(); ctx.moveTo(0, f * H); ctx.lineTo(W, f * H); ctx.stroke(); ctx.fillText(f.toFixed(1), 2, f * H - 2);
      }
    }
    ctx.restore();
  });
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
function placeText(lc, zone, per, color, lines = textLines()) {
  if (!lines.length) return;
  const t = textBlockCanvas(lines, zone.w * 0.9, zone.h * 0.8, per.tsize / 100);
  const cx = zone.x + zone.w / 2 + (per.thoriz / 100) * zone.w;
  const cy = zone.y + zone.h / 2 - (per.tvert / 100) * zone.h;
  lc.save(); lc.translate(cx, cy); lc.rotate(((zone.angle || 0) + per.trot) * Math.PI / 180);
  engrave(lc, t, 0, 0, t.width, t.height, -t.width / 2, -t.height / 2, t.width, t.height, color);
  lc.restore();
}

// Draws a tagline (curved or straight) above the logo area; returns the zone left for the logo.
function drawTagline(lc, z, W, H, t, arcDefault) {
  const tag = (t.text || '').trim();
  if (!tag) return { ...z };
  const g = document.createElement('canvas'); g.width = W; g.height = H;
  const gc = g.getContext('2d');
  gc.font = fontFor(100, t.font);
  const w100 = gc.measureText(tag).width || 1;
  const curved = t.curve > 0;
  const px = Math.max(8, Math.min(z.h * (curved ? 0.20 : 0.16), 100 * (z.w * 0.85) / w100) * (t.size / 100));
  const yOff = -(t.vert / 100) * z.h;
  let logoZone;
  if (curved) {
    const r = z.w * (0.6 + ((100 - t.curve) / 100) * 4);
    drawArcText(gc, tag, z.x + z.w / 2, z.y + px * 1.05 + r + yOff, r, px, t.font);
    logoZone = { ...z, y: z.y + px * 1.5, h: z.h - px * 1.5 };
  } else {
    gc.font = fontFor(px, t.font); gc.fillStyle = '#fff'; gc.textAlign = 'center'; gc.textBaseline = 'middle';
    gc.fillText(tag, z.x + z.w / 2, z.y + px * 0.6 + yOff);
    logoZone = { ...z, y: z.y + px * 1.3, h: z.h - px * 1.3 };
  }
  engrave(lc, g, 0, 0, W, H, 0, 0, W, H);
  return logoZone;
}

// Products with a blade AND a handle surface (pocket knife): one view, logo on the chosen
// surface; in Personalized mode the recipient text goes on the other one.
function renderSurfaces(prod, canvas, img, W, H, per, info) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  return getProcessed().then(P => {
    const zone = (name) => { const z = info.zones[name]; return { x: z.x * W, y: z.y * H, w: z.w * W, h: z.h * H, angle: z.angle || 0 }; };
    // the tab picks where the main engraving goes; with both views on, the text takes the other surface
    const chosen = per.surface === 'blade' ? 'blade' : 'handle';
    const other = chosen === 'blade' ? 'handle' : 'blade';
    const logoSurf = chosen, textSurf = state.branding ? other : chosen;
    const steel = document.createElement('canvas'), ink = document.createElement('canvas');
    steel.width = ink.width = W; steel.height = ink.height = H;
    const sc = steel.getContext('2d'), ic = ink.getContext('2d');
    const draw = (surf, fn) => surf === 'blade' ? fn(sc, INK) : fn(ic, per.markColor);
    if (state.branding) draw(logoSurf, (c, col) => placeLogo(c, P, zone(logoSurf), per, col));
    if (state.personalized) draw(textSurf, (c, col) => placeText(c, zone(textSurf), per, col));
    const mask = bladeMask(img, info.src);
    for (const [layer, lc, op, alpha] of [[steel, sc, 'multiply', per.opacity / 100], [ink, ic, 'source-over', per.inkOpacity / 100]]) {
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask, 0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.drawImage(layer, 0, 0); ctx.restore();
    }
    if (DEBUG) {
      ctx.lineWidth = 2;
      for (const n of prod.surfaces) { const z = zone(n); ctx.strokeStyle = n === 'blade' ? 'rgba(255,0,0,.8)' : 'rgba(0,160,0,.8)'; ctx.strokeRect(z.x, z.y, z.w, z.h); }
      ctx.strokeStyle = 'rgba(0,120,255,.35)'; ctx.lineWidth = 1; ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(0,80,200,.8)';
      for (let f = 0.1; f < 1; f += 0.1) {
        ctx.beginPath(); ctx.moveTo(f * W, 0); ctx.lineTo(f * W, H); ctx.stroke(); ctx.fillText(f.toFixed(1), f * W + 2, 12);
        ctx.beginPath(); ctx.moveTo(0, f * H); ctx.lineTo(W, f * H); ctx.stroke(); ctx.fillText(f.toFixed(1), 2, f * H - 2);
      }
    }
  });
}

// on-screen rerender, coalesced per product
const pending = new Set();
let raf = 0;
function rerender(pid) {
  pending.add(pid);
  if (raf) return;
  raf = requestAnimationFrame(async () => {
    // one loop at a time; anything requested mid-loop is picked up on the next pass
    while (pending.size) {
      const ids = Array.from(pending); pending.clear();
      for (const id of ids) {
        const prod = PRODUCTS.find(p => p.id === id);
        const card = $(`#products .product[data-id="${id}"]`);
        if (!card) continue;
        try {
          const img = await loadImage(imageInfo(prod).src);
          await renderProduct(prod, $('canvas.mock', card), PREVIEW_W / img.naturalWidth);
        } catch (e) { console.error('render failed', id, e); }
      }
    }
    raf = 0;
  });
}
function rerenderAll() { PRODUCTS.forEach(p => rerender(p.id)); }

async function exportCanvas(prod) {
  const c = document.createElement('canvas');
  await renderProduct(prod, c, 1);
  return c;
}
function canvasBlob(c) { return new Promise(res => c.toBlob(res, 'image/png')); }
function fileName(prod) {
  const logo = state.logos.find(l => l.id === state.activeLogoId);
  const base = (logo ? logo.name.replace(/\.[a-z0-9]+$/i, '') : 'mockup').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 30);
  return prod.surfaces ? `${base}-${prod.id}-${state.per[prod.id].surface}.png` : `${base}-${prod.id}-${state.handle}.png`;
}
async function download(prod) {
  const c = await exportCanvas(prod);
  const blob = await canvasBlob(c);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName(prod);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function share(prods) {
  const files = [];
  for (const p of prods) files.push(new File([await canvasBlob(await exportCanvas(p))], fileName(p), { type: 'image/png' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: 'Engraving mockup' }); } catch (e) { /* user cancelled */ }
  } else {
    for (const p of prods) await download(p);
  }
}

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
function buildProducts() {
  const host = $('#products'); host.innerHTML = '';
  const tpl = $('#product-tpl');
  PRODUCTS.forEach(prod => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.dataset.id = prod.id;
    $('.product-name', el).textContent = prod.name;
    $('.dl', el).onclick = () => download(prod);
    $('.sh', el).onclick = () => share([prod]);
    const opts = $('.options', el);
    $('.opt', el).onclick = () => { show(opts, opts.classList.contains('hidden')); $('.opt', el).classList.toggle('on'); };
    $$('input[type=range]', opts).forEach(inp => {
      const k = inp.dataset.k;
      const out = inp.nextElementSibling;
      const fmt = v => /size$/i.test(k) || k === 'opacity' || k === 'inkOpacity' ? v + '%' : /rot$/.test(k) ? (+v).toFixed(2) + '°' : v;
      inp.value = state.per[prod.id][k]; out.textContent = fmt(inp.value);
      inp.oninput = () => { state.per[prod.id][k] = +inp.value; out.textContent = fmt(inp.value); rerender(prod.id); };
      inp.onchange = save;
    });
    // blade / handle tabs and mark colour, only for products with two surfaces
    const surfSeg = $('.seg.surface', el), markRow = $('.mark-row', opts), inkRow = $('input[data-k=inkOpacity]', opts).parentElement;
    if (prod.surfaces) {
      show(surfSeg); show(markRow); show(inkRow);
      const syncSurf = () => $$('button', surfSeg).forEach(b => b.classList.toggle('on', b.dataset.val === state.per[prod.id].surface));
      syncSurf();
      $$('button', surfSeg).forEach(b => b.onclick = () => { state.per[prod.id].surface = b.dataset.val; syncSurf(); save(); rerender(prod.id); });
      const sw = $('.mark-swatches', opts); sw.innerHTML = '';
      MARK_COLORS.forEach(col => {
        const d = document.createElement('div'); d.className = 'swatch mark'; d.style.background = col;
        const syncMark = () => d.classList.toggle('sel', state.per[prod.id].markColor === col);
        syncMark();
        d.onclick = () => { state.per[prod.id].markColor = col; $$('.swatch.mark', sw).forEach(x => x.classList.remove('sel')); d.classList.add('sel'); save(); rerender(prod.id); };
        sw.appendChild(d);
      });
      $('.tag-opts', opts).remove(); $('.back-opts', opts).remove();
    } else {
      surfSeg.remove(); markRow.remove(); inkRow.remove();
    }
    [['tagline', 'tagfont'], ['btagline', 'btagfont']].forEach(([tk, fk]) => {
      const tag = $(`input[data-k=${tk}]`, opts);
      if (!tag) return;
      tag.value = state.per[prod.id][tk] || '';
      tag.oninput = () => { state.per[prod.id][tk] = tag.value; rerender(prod.id); };
      tag.onchange = save;
      tag.after(fontSelect(state.per[prod.id][fk], id => { state.per[prod.id][fk] = id; save(); rerender(prod.id); }));
    });
    const blogo = $('input[data-k=blogo]', opts);
    if (blogo) { blogo.checked = state.per[prod.id].blogo; blogo.onchange = () => { state.per[prod.id].blogo = blogo.checked; save(); rerender(prod.id); }; }
    $('.reset-one', el).onclick = () => {
      state.per[prod.id] = defaultPer(prod); save();
      buildProducts(); rerenderAll();
    };
    $('.canvas-wrap', el).onclick = () => present(prod);
    host.appendChild(el);
  });
  syncTextOpts();
}
function syncTextOpts() {
  $$('#products .text-opts').forEach(el => show(el, state.showFront && state.personalized));
  $$('#products .tag-opts, #products .logo-opts').forEach(el => show(el, state.showFront && state.branding));
  $$('#products .back-opts').forEach(el => show(el, state.showBack));
  show($('#text-panel'), state.showFront && state.personalized);
  show($('#back-panel'), state.showBack);
}

function fontSelect(current, onChange) {
  const sel = document.createElement('select'); sel.className = 'font-select';
  FONTS.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.label; o.style.font = f.css.replace('{px}', 15); if (f.id === current) o.selected = true; sel.appendChild(o); });
  sel.onchange = () => onChange(sel.value);
  return sel;
}

// ─── Present mode ───────────────────────────────────────────────────────────
async function present(prod) {
  const c = await exportCanvas(prod);
  $('#present-img').src = c.toDataURL('image/jpeg', 0.92);
  show($('#present'));
  document.body.style.overflow = 'hidden';
}
function closePresent() { show($('#present'), false); document.body.style.overflow = ''; }

// ─── Wiring ─────────────────────────────────────────────────────────────────
function wireTypeToggles() {
  const seg = $('.seg.type');
  const sync = () => { $('button[data-val=branding]', seg).classList.toggle('on', state.branding); $('button[data-val=personalized]', seg).classList.toggle('on', state.personalized); };
  sync();
  $$('button', seg).forEach(b => b.onclick = () => {
    const k = b.dataset.val;
    if (state[k] && !state[k === 'branding' ? 'personalized' : 'branding']) return; // keep at least one on
    state[k] = !state[k]; sync(); save(); syncTextOpts(); rerenderAll();
  });
}
function wireSidesToggle() {
  const seg = $('.seg.side');
  const sync = () => { $('button[data-val=front]', seg).classList.toggle('on', state.showFront); $('button[data-val=back]', seg).classList.toggle('on', state.showBack); };
  sync();
  $$('button', seg).forEach(b => b.onclick = () => {
    const k = b.dataset.val === 'front' ? 'showFront' : 'showBack', other = k === 'showFront' ? 'showBack' : 'showFront';
    if (state[k] && !state[other]) return; // keep at least one side on
    state[k] = !state[k]; sync(); save(); syncTextOpts(); rerenderAll();
  });
}
function wireSegments() {
  wireTypeToggles();
  wireSidesToggle();
  $$('.seg[data-key]').forEach(seg => {
    const key = seg.dataset.key;
    const target = state;
    const sync = () => $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.val === target[key]));
    sync();
    $$('button', seg).forEach(b => b.onclick = () => {
      target[key] = b.dataset.val; sync(); save();
      rerenderAll();
    });
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

  // personalization text: each line has its own font
  const buildLines = (hostSel, src) => {
    const host = $(hostSel); host.innerHTML = '';
    [1, 2, 3].forEach(i => {
      const row = document.createElement('div'); row.className = 'text-line';
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 50;
      inp.placeholder = i === 3 ? 'Line 3 (optional)' : 'Line ' + i; inp.value = src['line' + i] || '';
      inp.oninput = () => { src['line' + i] = inp.value; rerenderAll(); };
      inp.onchange = save;
      row.appendChild(inp);
      row.appendChild(fontSelect(src['font' + i], id => { src['font' + i] = id; save(); rerenderAll(); }));
      host.appendChild(row);
    });
  };
  buildLines('#text-lines', state.text);
  buildLines('#back-lines', state.back);
  $('#t-reset').onclick = () => { state.text = { ...DEFAULT_TEXT }; save(); buildLines('#text-lines', state.text); rerenderAll(); };
  $('#b-reset').onclick = () => { state.back = { ...DEFAULT_BACK }; save(); buildLines('#back-lines', state.back); rerenderAll(); };


  // footer
  $('#share-all').onclick = () => share(PRODUCTS);
  $('#reset-all').onclick = () => {
    if (!confirm('Clear the logo and every setting?')) return;
    localStorage.removeItem(STORE_KEY); location.reload();
  };

  // present
  $('#present-close').onclick = closePresent;
  $('#present').onclick = (e) => { if (e.target.id === 'present') closePresent(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePresent(); });

  rerenderAll();

  if ('serviceWorker' in navigator && !DEBUG && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (DEBUG) window.__mm = { state, PRODUCTS, addLogoFromDataURL, rerenderAll, save, exportCanvas, backImage, loadImage };
document.addEventListener('DOMContentLoaded', init);
})();
