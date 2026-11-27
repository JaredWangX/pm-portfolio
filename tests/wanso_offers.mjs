import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context=vm.createContext({window:{},Intl});
for(const file of ['offers.js','catalog.js','store-data.js']) vm.runInContext(fs.readFileSync(path.join(root,'prototypes/wanso',file),'utf8'),context,{filename:file});
const {wansoOffers:{calculate},wansoCatalog:catalog}=context.window;
const fixture=(price,fee,promotion={})=>({platforms:{grab:{name:'GrabFood',price,fee,promotion}}});
const fixed=(id,minSpend,amount)=>({id,name:id,type:'fixed',minSpend,amount});
const rate=(id,minSpend,rateBps,cap)=>({id,name:id,type:'rate',minSpend,rateBps,cap});
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
check('coupon threshold is exact and ineligible coupon cannot reduce total',()=>{
 const coupons=[fixed('满五万减五千',50000,5000)];
 assert.equal(calculate(fixture(49999,10000,{coupons}),'grab').couponDiscount,0);
 assert.equal(calculate(fixture(50000,10000,{coupons}),'grab').total,55000);
 assert.equal(calculate(fixture(50001,10000,{coupons}),'grab').total,55001);
});
check('merchant discount applied before coupon/delivery eligibility',()=>{
 const rules={merchant:{rateBps:1000,minSpend:40000,cap:15000},coupons:[fixed('满六万',60000,8000)],delivery:{minSpend:60000,amount:null}};
 const offer=calculate(fixture(60000,12000,rules),'grab');
 assert.equal(offer.merchantDiscount,6000);assert.equal(offer.eligibleSubtotal,54000);
 assert.equal(offer.couponDiscount,0);assert.equal(offer.deliveryDiscount,0);
 assert.equal(offer.total,66000);assert.equal(offer.unavailable.length,2);
});
check('only the most valuable platform coupon is used; rate has cap',()=>{
 const offer=calculate(fixture(60000,12000,{merchant:{rateBps:1000,minSpend:0,cap:15000},coupons:[fixed('固定券',50000,6000),rate('折扣券',50000,2000,9000)],delivery:{minSpend:54000,amount:null}}),'grab');
 assert.equal(offer.couponName,'折扣券');assert.equal(offer.couponDiscount,9000);
 assert.equal(offer.couponOptions.filter(c=>c.selected).length,1);
 assert.equal(offer.total,45000);assert.equal(offer.netDeliveryFee,0);
});
check('merchant cap and one shared delivery fee hold for multiple portions',()=>{
 const rules={merchant:{rateBps:1000,minSpend:0,cap:15000},coupons:[fixed('固定券',50000,6000)],delivery:{minSpend:54000,amount:10000}};
 const offer=calculate(fixture(60000,12000,rules),'grab',3);
 assert.equal(offer.price,180000);assert.equal(offer.fee,12000);assert.equal(offer.merchantDiscount,15000);
 assert.equal(offer.netDeliveryFee,2000);assert.equal(offer.total,161000);
});
check('discounts cannot exceed their respective goods or delivery costs',()=>{
 const offer=calculate(fixture(10000,2000,{coupons:[fixed('大额券',0,50000)],delivery:{minSpend:0,amount:10000}}),'grab');
 assert.equal(offer.couponDiscount,10000);assert.equal(offer.deliveryDiscount,2000);assert.equal(offer.total,0);
});
check('currency rounds down to whole VND and quantity validation is explicit',()=>{
 const offer=calculate(fixture(33333,0,{merchant:{rateBps:1500,minSpend:0,cap:99999}}),'grab');
 assert.equal(offer.merchantDiscount,4999);assert.equal(offer.total,28334);
 for(const q of [0,-1,1.5,NaN,100]) assert.throws(()=>calculate(fixture(50000,10000),'grab',q));
});
check('all 160 stores retain exact matched menu prices and safe totals for one to four people',()=>{
 assert.equal(catalog.length,160);assert.equal(new Set(catalog.map(s=>s.id)).size,160);
 for(const store of catalog)for(const key of ['grab','shopee']){
  assert.equal(store.menu[0].prices[key],store.platforms[key].price);
  for(let quantity=1;quantity<=4;quantity++){
   const offer=calculate(store,key,quantity);
   assert.equal(offer.total,offer.price+offer.fee-offer.discount);
   assert.equal(offer.discount,offer.merchantDiscount+offer.couponDiscount+offer.deliveryDiscount);
   assert.equal(offer.total,offer.payableItems+offer.netDeliveryFee);
   assert(offer.total>=0 && Number.isSafeInteger(offer.total));
   assert(offer.netDeliveryFee>=0);assert(offer.couponOptions.filter(c=>c.selected).length<=1);
  }
 }
});
check('each city has 80 examples, mixed discounts and actual eligible free-delivery offers',()=>{
 for(const city of ['hanoi','hcm']){
  const stores=catalog.filter(s=>s.city===city);assert.equal(stores.length,80);
  const hasDiscount=stores.filter(s=>['grab','shopee'].some(k=>calculate(s,k).discount>0)).length;
  const free=stores.filter(s=>['grab','shopee'].some(k=>calculate(s,k).netDeliveryFee===0)).length;
  assert(hasDiscount>=40 && hasDiscount<80);assert(free>=10 && free<80);
  console.log(city,JSON.stringify({stores:80,hasDiscount,freeDelivery:free}));
 }
});
console.log(JSON.stringify({passed:checks}));
