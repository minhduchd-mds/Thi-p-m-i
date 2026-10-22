'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/hy-gateway.css', 'utf8');
const js = fs.readFileSync('public/hy-gateway.js', 'utf8');

new vm.Script(js, { filename: 'public/hy-gateway.js' });
assert.match(html, /href="\/hy-gateway\.css\?v=1\.7\.0"/);
assert.match(html, /src="\/hy-gateway\.js\?v=1\.7\.0" defer/);
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
assert.match(css, /hy-courtyard\.svg/, 'New architectural courtyard must be visible as actual asset');
assert.match(css, /nth-child\(4\)/, 'Four lobby cards must have distinct presentation');
assert.match(js, /params\.has\('card'\)\s*\|\|\s*params\.has\('edit'\)/, 'Shared cards must bypass intro');
assert.match(js, /sessionStorage\.getItem/, 'Revisits should avoid replaying intro');
assert.match(js, /app\.inert = shown/, 'Prevent keyboard focus behind lobby');
assert.match(js, /localStorage\.getItem/, 'Existing device-only card management must be explicit');
assert.match(js, /record\.expiresAt/, 'Show card expiration');
assert.match(js, /studio\.html\?theme=/, 'Gallery must open the new block-based studio with selected theme');
assert.match(js, /section === 'music' \? '\?panel=music'/, 'Music path must open studio music settings');
assert.match(html, /id="bg-music" preload="metadata"/, 'Do not autoplay audio in guest experience');
assert.match(html, /Mở cửa &amp; nghe nhạc/, 'Entrance button must signal music playback');
assert.match(js, /duyen-ngoc-phuong-dong\.mp3/, 'Welcome music uses a real bundled track');
assert.match(js, /welcomeAudio\.play\(\)/, 'Use actual HTML audio playback');
assert.match(js, /const openDoors[\s\S]*?startWelcomeMusic\(\)/, 'Play as part of the opening gesture');
assert.match(js, /stopWelcomeMusic\(\)/, 'Stop ambient lobby music on editor entry');
assert.match(css, /\.hy-sound\[aria-pressed="true"\]/, 'Sound button provides visible active state');
const ornaments = ['carved-door.svg','song-hy.svg','gold-corner.svg','plum-branch.svg'];
for (const file of ornaments) {
  const assetPath = 'public/assets/ornaments/' + file;
  assert.ok(fs.existsSync(assetPath), 'Missing SVG ornament: ' + file);
  const vector = fs.readFileSync(assetPath, 'utf8');
  assert.match(vector, /^<svg /, 'Invalid SVG start: ' + file);
  assert.match(vector, /viewBox="0 0 1024 1024"/, 'Vector needs a scalable viewBox: ' + file);
  assert.ok((vector.match(/<path /g) || []).length >= 10, 'SVG must use real path geometry: ' + file);
  assert.ok(!(/<image\b|<foreignObject\b|data:image\//i).test(vector), 'SVG contains embedded bitmap: ' + file);
  assert.ok(css.includes('/assets/ornaments/' + file) || html.includes('/assets/ornaments/' + file),
    'SVG asset is not used in the UI: ' + file);
}
assert.ok(!css.includes('ornaments/carved-door.webp') && !css.includes('ornaments/song-hy.webp'), 'Decorative ornaments must remain vectors');
const woodPath = 'public/assets/textures/wood-mahogany.webp';
assert.ok(fs.existsSync(woodPath), 'Missing real wood WebP material');
const wood = fs.readFileSync(woodPath);
assert.equal(wood.subarray(0,4).toString('ascii'),'RIFF','Wood file must be RIFF');
assert.equal(wood.subarray(8,12).toString('ascii'),'WEBP','Wood file must be WebP');
assert.equal(wood.readUInt32LE(4)+8,wood.length,'Wood material must not be truncated');
assert.match(css, /\.hy-door--left,[\s\S]*?wood-mahogany\.webp/, 'Wood detail must be visible on door face');
assert.match(css, /\.hy-portico:after[\s\S]*?wood-mahogany\.webp/, 'Wood detail must be visible on gateway frame');

assert.match(html, /hy-art--seal/, 'Wedding seal must be mounted on the closed gate');
assert.match(html, /hy-art--plum/, 'Generated blossom branch must be mounted');
assert.match(css, /hy-gateway\[data-state="opening"\] \.hy-art--seal/, 'Seal must clear the doorway as doors open');
console.log('PASS: Hỷ Studio 3D gateway integration, existing editor anchors, guest bypass, accessibility and navigation contracts.');
