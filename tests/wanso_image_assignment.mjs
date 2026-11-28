import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const context=vm.createContext({window:{}});
const run=name=>vm.runInContext(fs.readFileSync(new URL(`prototypes/wanso/${name}.js`,root),'utf8'),context);
for(const script of ['offers','catalog','images'])run(script);
const state=context.window;
const seeds=state.wansoCatalog.slice(0,160);
const seedById=new Map(seeds.map(store=>[store.id,store]));
for(const store of seeds)assert.equal(store.image,state.wansoImages[store.id],'Seed restaurant covers changed');
for(const store of state.wansoCatalog)assert.equal(seedById.get(store.imageAssetId).key,store.key,`${store.id}: image does not match cuisine`);
for(const city of new Set(state.wansoCatalog.map(store=>store.city))) {
  for(const cuisine of new Set(seeds.map(store=>store.key))) {
    const expected=new Set(seeds.filter(store=>store.key===cuisine).map(store=>store.image));
    const actual=new Set(state.wansoCatalog.filter(store=>store.city===city&&store.key===cuisine&&Number(store.id.slice(5))>160).map(store=>store.image));
    assert.deepEqual(actual,expected,`${city}/${cuisine}: some cuisine images are unavailable in this city`);
  }
}
const before=state.wansoCatalog.map(store=>store.image);
run('images');
assert.deepEqual(state.wansoCatalog.map(store=>store.image),before,'The same restaurant must keep the same image');
console.log('PASS: 160 seed covers preserved; both cities reach every cuisine-matched image; all store images remain stable.');
