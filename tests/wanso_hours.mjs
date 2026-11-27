import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{},Intl,Date});
vm.runInContext(fs.readFileSync(new URL('../prototypes/wanso/hours.js',import.meta.url),'utf8'),context);
const status=(hours,iso)=>context.window.wansoHours.status({hours},new Date(iso));
assert.equal(status('06:00–22:00','2026-11-27T09:00:00Z').state,'open'); // 16:00 Vietnam
assert.equal(status('06:00–22:00','2026-11-27T22:59:00Z').state,'closed'); // 05:59 next day
assert.equal(status('06:00–22:00','2026-11-27T23:00:00Z').state,'open'); // 06:00
assert.equal(status('06:00–22:00','2026-11-27T15:00:00Z').state,'closed'); // exactly 22:00
assert.equal(status('06:00–22:00','2026-11-27T15:00:00Z').detail,'Mở lúc 06:00 ngày mai');
assert.equal(status('22:00–02:00','2026-11-27T16:00:00Z').detail,'Mở đến 02:00 ngày mai');
assert.equal(status('22:00–02:00','2026-11-27T18:00:00Z').state,'open');
assert.equal(status('22:00–02:00','2026-11-27T19:00:00Z').state,'closed');
assert.equal(status('00:00–24:00','2026-11-27T18:00:00Z').state,'open');
assert.equal(status('全天营业','2026-11-27T18:00:00Z').state,'open');
for(const value of ['',undefined,'25:00–26:00','06:70–22:00','06:00–06:00','06:00–24:30','营业中'])assert.equal(status(value,'2026-11-27T09:00:00Z').state,'unknown');
console.log('PASS: local timezone, exact open/close boundaries, overnight/24h schedules and unknown/invalid hours');
