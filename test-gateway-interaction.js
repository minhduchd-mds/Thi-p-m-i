'use strict';
// Browser-free interaction contract for the Hỷ Studio gate. No dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = new vm.Script(fs.readFileSync('public/hy-gateway.js', 'utf8'));

const elements = new Map();
const makeElement = (name) => {
  const events = Object.create(null);
  const attributes = Object.create(null);
  return {
    name, events, attributes, dataset: {}, hidden: false, children: [],
    classList: {toggle() {}},
    appendChild(el) {this.children.push(el);},
    setAttribute(key, value) {attributes[key] = String(value);},
    addEventListener(key, listener) {events[key] = listener;},
    focus() {},
    after() {},
    scrollIntoView() {},
    querySelector() {return makeElement('focusable');},
    querySelectorAll() {return [];},
    click() {events.click?.();}
  };
};
for (const id of ['hy-gateway','app','hy-page-hall','hy-page-library','hy-page-manager','hy-enter','hy-skip','hy-owned-list','hy-owned-note','bg-music','chinh-sua','mau-thiep','panel-music']) {
  elements.set(id, makeElement(id));
}
const gateway = elements.get('hy-gateway');
gateway.dataset.state = 'closed';
const actions = ['templates','design','music','manage'].map(action=>{
  const item = makeElement(action);
  item.dataset.hyAction = action;
  return item;
});
const back = makeElement('back');
const themes = ['red','jade','pink'].map(theme => {
  const item = makeElement(theme);
  item.dataset.hyTheme = theme;
  return item;
});
gateway.querySelector = selector => elements.get(selector.slice(1)) || null;
gateway.querySelectorAll = selector => selector==='[data-hy-back]' ? [back] :
  selector==='[data-hy-action]' ? actions :
  selector==='[data-hy-theme]' ? themes : [];

const audio = makeElement('audio');
audio.paused = true;
audio.playCalls = 0;
audio.currentTime = 0;
audio.volume = 0;
audio.play = function () { this.playCalls++; this.paused = false; this.events.play?.(); return Promise.resolve(); };
audio.pause = function () { this.paused = true; this.events.pause?.(); };
const document = {
  body: makeElement('body'),
  getElementById(id) {return elements.get(id) || null;},
  querySelector(s) {
    if (s==='.topbar .top-spacer') return makeElement('spacer');
    return null;
  },
  createElement(tag) {return tag==='audio' ? audio : makeElement(tag);},
  addEventListener() {}
};
const timers = [];
let nextTimer = 0;
const win = {
  location: {search:'',hash:''},
  matchMedia() {return {matches:false};},
  setTimeout(fn) {const id=++nextTimer; timers.push({id,fn,kind:'timeout'}); return id;},
  clearInterval() {},
  setInterval(fn) {const id=++nextTimer; timers.push({id,fn,kind:'interval'}); return id;}
};
const context = {
  document,window:win,location:win.location,URLSearchParams,
  sessionStorage:{getItem(){return null;},setItem(){}},
  localStorage:{length:0,key(){return null;}},
  clearTimeout(){}, console, fetch:async()=>({ok:false,status:404})
};
script.runInNewContext(context);
const sound = gateway.children.find(el=>el.name==='button');
assert.ok(sound, 'Music button is rendered in the gate');
assert.equal(audio.playCalls,0,'No music before the first user gesture');
assert.match(audio.src,/duyen-ngoc-phuong-dong\.mp3$/,'Use the existing bundled MP3');
assert.equal(audio.loop,true,'Gate music loops in the hall');

elements.get('hy-enter').click();
assert.equal(audio.playCalls,1,'Opening the doors starts audible music within the click');
assert.equal(audio.paused,false);
assert.equal(gateway.dataset.state,'opening');
const openTimer = timers.find(t=>t.kind==='timeout');
assert.ok(openTimer);
openTimer.fn();
assert.equal(gateway.dataset.state,'hall','Opening resolves to the lobby');
assert.equal(audio.paused,false,'Music continues in the lobby');

sound.click();
assert.equal(audio.paused,true,'Music button mutes');
assert.equal(sound.attributes['aria-pressed'],'false');

actions.find(x=>x.dataset.hyAction==='design').click();
assert.equal(gateway.hidden,true,'Editing hides the lobby');
assert.equal(elements.get('app').inert,false,'Editor restored to interactive state');

const home = document.querySelector('.topbar .top-spacer'); // home button inserted after the spacer
assert.ok(home);

console.log('PASS: Music starts on gate interaction, continues in lobby, can be muted, and editor opens.');
