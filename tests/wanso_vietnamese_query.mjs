import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context=vm.createContext({window:{},Intl});
for(const file of ['offers.js','catalog.js','images.js','store-data.js','reviews-data.js','native.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,'prototypes/wanso',file),'utf8'),context,{filename:file});
}
const {wansoNative:native,wansoCatalog:catalog,wansoReviews:reviews}=context.window;
let passed=0;
function check(label,fn){fn();passed++;console.log('PASS '+label);}
function select(query){return native.selectedStores({query,surface:'test'});}
function totals(stores,query,budget){
  assert.equal(stores.length,5);
  for(const store of stores)assert(Math.min(native.offerFor(store,'grab',query).total,native.offerFor(store,'shopee',query).total)<=budget);
}
check('default Vietnamese query selects five chicken pho restaurants within 80.000đ',()=>{
  const q=native.getQuery(),stores=select(q);
  assert(q.includes('80.000đ'));totals(stores,q,80000);
  assert(stores.every(s=>s.key==='pho'));
  assert(stores.every(s=>native.offerFor(s,'grab',q).quantity===1));
  assert.equal(new Set(stores.map(s=>s.image)).size,5);
});
check('unaccented Vietnamese supports k budgets and two-person shared delivery',()=>{
  const q='Hai nguoi muon an com ga, ngan sach 160k da gom giao hang.',stores=select(q);
  totals(stores,q,160000);assert(stores.every(s=>s.key==='rice'));
  const offer=native.offerFor(stores[0],'grab',q);
  assert.equal(offer.quantity,2);assert.equal(offer.originalFee,stores[0].platforms.grab.fee);
  assert.equal(offer.price,stores[0].platforms.grab.price*2);
});
check('Vietnamese follow-up keeps category and revises quantity and the dotted budget',()=>{
  const q=native.getQuery()+'\nĐổi thành 2 người, ngân sách tối đa 120.000đ.',stores=select(q);
  totals(stores,q,120000);assert(stores.every(s=>s.key==='pho'));
  assert(stores.every(s=>native.offerFor(s,'grab',q).quantity===2));
});
check('switching the latest requested dish replaces earlier category',()=>{
  const q=native.getQuery()+'\nĐổi sang cơm gà, ngân sách 80 nghìn.',stores=select(q);
  totals(stores,q,80000);assert(stores.every(s=>s.key==='rice'));
});
check('Vietnamese dietary constraint never returns a chicken dish',()=>{
  const q='Mình ăn chay, không ăn thịt gà. Tối đa 80.000đ.',stores=select(q);
  totals(stores,q,80000);assert(stores.every(s=>s.key==='veggie'));
});
check('Vietnamese noodles, mixed pho, coffee and tea stay in their own categories',()=>{
  for(const [query,key] of [['Bún gà nấm, 80k','bun'],['Phở trộn gà, 80k','mixed'],['Cà phê ít đường, 80k','coffee'],['Trà chanh ít đá, 80k','tea'],['Bánh mì gà, 80k','banh']]) {
    const stores=select(query);totals(stores,query,80000);assert(stores.every(s=>s.key===key),query);
  }
});
check('too-small Vietnamese budget produces no invented recommendation',()=>{
  assert.equal(select('Muốn ăn phở gà, tối đa 10.000đ').length,0);
});
check('legacy Chinese requests remain accepted',()=>{
  const q='两个人吃鸡肉饭，预算十六万，含配送费。',stores=select(q);
  totals(stores,q,160000);assert(stores.every(s=>s.key==='rice'));
  assert.equal(native.offerFor(stores[0],'grab',q).quantity,2);
});
check('default catalog, menu, offers and tasting notes contain no Chinese',()=>{
  const han=/\p{Script=Han}/u;
  for(const store of catalog.slice(0,160)) {
    for(const field of ['name','dishZh','category','district','address','description','reason'])assert(!han.test(store[field]),field+': '+store[field]);
    assert(!han.test(store.tags.join(' ')));
    for(const menu of store.menu)assert(!han.test([menu.name,menu.category,menu.description].join(' ')));
    for(const key of ['grab','shopee']) {
      const offer=native.offerFor(store,key,native.getQuery());
      assert(!han.test(JSON.stringify([offer.couponName,offer.couponTerms,offer.qualification,offer.terms,offer.unavailable,offer.lines])));
    }
    assert(!han.test(JSON.stringify(reviews.forStore(store))));
  }
  assert(!han.test(JSON.stringify(reviews.forStore('moc'))));
  assert(!han.test(JSON.stringify(reviews.forStore('quyen'))));
});
console.log(JSON.stringify({passed}));
