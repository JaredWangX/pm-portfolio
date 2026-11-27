import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const start=performance.now(), initialMemory=process.memoryUsage().heapUsed;
const context=vm.createContext({window:{},Intl});
for(const name of ['offers.js','catalog.js','images.js','store-data.js']) vm.runInContext(fs.readFileSync(path.join(root,'prototypes/wanso',name),'utf8'),context,{filename:name});
const {wansoCatalog:catalog,wansoCatalogStats:stats,wansoCatalogByCity:byCity,wansoOffers:offers}=context.window;
const initializationMs=performance.now()-start, initializationHeapMB=(process.memoryUsage().heapUsed-initialMemory)/1024/1024;
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
check('each city contains 12,480 addressable sample stores, with stable IDs and distinct names',()=>{
 assert.equal(catalog.length,24960);
 assert.equal(new Set(catalog.map(s=>s.id)).size,24960);
 assert.equal(new Set(catalog.map(s=>s.city+':'+s.name)).size,24960);
 for(const city of ['hanoi','hcm']){
  assert.equal(byCity[city].length,12480);
  assert(byCity[city].every(s=>s.city===city&&s.sample));
 }
 for(let i=0;i<160;i++)assert.equal(catalog[i].id,'demo-'+(i+1));
 assert.equal(catalog[0].name,'Phở Gà An Nhiên · Hoàn Kiếm');
 assert.equal(catalog[0].platforms.grab.total,53100);
 assert.equal(catalog[0].platforms.shopee.total,51850);
});
check('menus are created only when a store is opened, then reused',()=>{
 assert(catalog.every(s=>typeof Object.getOwnPropertyDescriptor(s,'menu').get==='function'));
 const store=catalog.at(-1),first=store.menu;
 assert.equal(first.length,10);assert.equal(store.menu,first);
 assert.equal(Object.getOwnPropertyDescriptor(store,'menu').get,undefined);
 assert.equal(catalog.filter(s=>Object.getOwnPropertyDescriptor(s,'menu').get===undefined).length,1);
 assert.equal(first[0].prices.grab,store.platforms.grab.price);
 assert.equal(first[0].translations.zh,store.dishZh);
});
check('all generated branches use bounded integer prices and internally consistent settlement',()=>{
 for(const store of catalog)for(const key of ['grab','shopee']){
  assert(store.platforms[key].price>=29000&&store.platforms[key].price<=75000);
  for(const quantity of [1,2,4]){
   const q=offers.summary(store,key,quantity);
   assert.equal(q.total,q.subtotal+q.originalFee-q.merchantDiscount-q.couponDiscount-q.deliveryDiscount);
   assert(Number.isSafeInteger(q.total)&&q.total>=0);
   assert(q.deliveryDiscount<=q.originalFee);
   if(quantity===1){assert.equal(q.total,store.platforms[key].total);assert.equal(q.netDeliveryFee,store.platforms[key].netDeliveryFee);}
  }
 }
});
check('fast quotes and detailed display quotes share the same arithmetic across the complete price/rule combinations',()=>{
 const unique=new Map();
 for(const store of catalog)for(const key of ['grab','shopee']){
  // Ratings and review counts vary independently; numeric values and rules define the actual quote.
  const {price,fee,promotion}=store.platforms[key];
  unique.set(JSON.stringify([price,fee,promotion]),[store,key]);
 }
 for(const [store,key] of unique.values())for(const quantity of [1,2,4]){
  const fast=offers.summary(store,key,quantity),full=offers.calculate(store,key,quantity);
  for(const field of ['total','subtotal','originalFee','discount','merchantDiscount','couponDiscount','deliveryDiscount','netDeliveryFee'])assert.equal(fast[field],full[field]);
  assert(full.couponOptions.filter(c=>c.selected).length<=1);
 }
 console.log('unique price/rule combinations',unique.size);
});
check('city counts reflect qualifying one-portion offers, rather than decorative totals',()=>{
 for(const city of ['hanoi','hcm']){
  const list=catalog.filter(s=>s.city===city);
  const discount=list.filter(s=>Object.values(s.platforms).some(p=>offers.summary(s,p===s.platforms.grab?'grab':'shopee').discount>0)).length;
  const free=list.filter(s=>['grab','shopee'].some(key=>offers.summary(s,key).netDeliveryFee===0)).length;
  assert.equal(stats[city].stores,list.length);assert.equal(stats[city].hasDiscount,discount);assert.equal(stats[city].freeDelivery,free);
  assert(discount>list.length*.5&&discount<list.length);assert(free>list.length*.1&&free<list.length);
  console.log(city,JSON.stringify(stats[city]));
 }
});
check('all branches have category-matched local scene imagery; the first 160 retain independent assets',()=>{
 assert.equal(new Set(catalog.slice(0,160).map(s=>s.image)).size,160);
 for(const store of catalog){
  const seed=catalog.find(s=>s.id===store.imageAssetId);
  assert.equal(store.key,seed.key);assert(store.imageAlt&&store.imageKind&&store.imageCredit);
  assert(fs.existsSync(path.resolve(root,'prototypes/wanso',store.image)));
 }
});
console.log(JSON.stringify({passed:checks,initializationMs:Math.round(initializationMs),initializationHeapMB:Math.round(initializationHeapMB),stores:catalog.length}));
