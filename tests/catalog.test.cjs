const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const data = vm.runInNewContext(fs.readFileSync(path.join(root,'catalog.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'i18n.js'),'utf8')+'\n({PRODUCTS,CATEGORIES,MESSAGES})');
test('Every target category has a demo product; IDs and SKUs are unique',()=>{
 assert.equal(Object.keys(data.CATEGORIES).length,10);
 assert.equal(new Set(data.PRODUCTS.map(p=>p.id)).size,data.PRODUCTS.length);
 assert.equal(new Set(data.PRODUCTS.map(p=>p.sku)).size,data.PRODUCTS.length);
 for(const category of Object.keys(data.CATEGORIES)) assert.ok(data.PRODUCTS.some(p=>p.category===category));
});
test('Catalog variants, prices and minimums are valid for checkout',()=>{
 for(const product of data.PRODUCTS){
  assert.ok(product.sku.startsWith('DEMO-'));
  assert.ok(data.CATEGORIES[product.category]);
  assert.ok(Number.isSafeInteger(product.price)&&product.price>0);
  assert.ok(Number.isInteger(product.min)&&product.min>=1&&product.min<=9999);
  assert.ok(product.models.length>0&&product.models.every(x=>typeof x==='string'&&x));
  assert.equal(new Set(product.models).size,product.models.length);
  assert.ok(product.variants.length>0);
 }
});
test('Every product, category, variant and interface message has three translations',()=>{
 const translated = [...Object.values(data.MESSAGES),...Object.values(data.CATEGORIES),...data.PRODUCTS.flatMap(p=>[p.name,p.spec,...p.variants])];
 for(const values of translated){assert.equal(values.length,3);assert.ok(values.every(x=>typeof x==='string'&&x.trim()));}
});
test('All static HTML translation keys exist, including placeholders and ARIA labels',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const match of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) assert.ok(data.MESSAGES[match[1]],match[1]);
});
