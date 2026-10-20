'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/hy-gateway.css', 'utf8');
const js = fs.readFileSync('public/hy-gateway.js', 'utf8');

new vm.Script(js, { filename: 'public/hy-gateway.js' });
assert.match(html, /href="\/hy-gateway\.css"/);
assert.match(html, /src="\/hy-gateway\.js" defer/);
assert.match(html, /id="hy-gateway"[^>]*hidden/);
for (const id of ['hy-page-hall','hy-page-library','hy-page-manager','hy-skip','hy-enter','hy-owned-list','chinh-sua','mau-thiep','panel-music','phone-screen','open-envelope','rsvp-form','save-card']) {
  assert.ok(html.includes('id="' + id + '"'), 'Missing UI anchor: ' + id);
}
for (const action of ['templates', 'design', 'music', 'manage']) {
  assert.ok(html.includes('data-hy-action="' + action + '"'), 'Missing lobby action: ' + action);
}
for (const theme of ['red', 'jade', 'pink']) {
  assert.ok(html.includes('data-hy-theme="' + theme + '"'), 'Missing theme in gallery: ' + theme);
}
assert.equal((html.match(/class="hy-door hy-door--(left|right)"/g) || []).length, 2);
assert.match(css, /transform-origin:0 50%/);
assert.match(css, /transform-origin:100% 50%/);
assert.match(css, /rotateY\(-112deg\)/);
assert.match(css, /rotateY\(112deg\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(js, /params\.has\('card'\)\s*\|\|\s*params\.has\('edit'\)/, 'Shared cards must bypass intro');
assert.match(js, /sessionStorage\.getItem/, 'Revisits should avoid replaying intro');
assert.match(js, /app\.inert = shown/, 'Prevent keyboard focus behind lobby');
assert.match(js, /localStorage\.getItem/, 'Existing device-only card management must be explicit');
assert.match(js, /record\.expiresAt/, 'Show card expiration');
assert.match(js, /document\.querySelector\('\[data-theme=/, 'Theme selection must reuse the original editor');
assert.match(js, /document\.querySelector\('\[data-tab="music"\]'\)/, 'Music path must open real music panel');
assert.match(html, /id="bg-music" preload="metadata"/, 'Do not autoplay audio in guest experience');
console.log('PASS: Hỷ Studio 3D gateway integration, existing editor anchors, guest bypass, accessibility and navigation contracts.');
