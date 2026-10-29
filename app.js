const products = [
  {id:'phone',name:'智慧型手機',category:'手機',spec:'多款容量與配色 · 型號洽詢',art:'device'},
  {id:'charger',name:'USB-C 快速充電器',category:'充電配件',spec:'日常充電選品 · 功率與協議待確認',art:'charger'},
  {id:'buds',name:'真無線藍牙耳機',category:'音訊設備',spec:'輕巧收納 · 型號與規格洽詢',art:'buds'},
  {id:'case',name:'簡約防護手機殼',category:'保護配件',spec:'多機型適配 · 顏色與材質洽詢',art:'case'},
  {id:'cable',name:'USB-C 充電傳輸線',category:'充電配件',spec:'日常隨行 · 長度與規格洽詢',art:'cable'},
  {id:'power',name:'便攜行動電源',category:'充電配件',spec:'外出備電選品 · 容量與認證待確認',art:'power'}
];
let category='全部商品';
const cart=new Map();
const grid=document.querySelector('#grid');
const filters=document.querySelector('#filters');
for(const label of ['全部商品',...new Set(products.map(p=>p.category))]){
  const button=document.createElement('button');button.textContent=label;button.type='button';
  button.setAttribute('aria-pressed',String(label===category));
  button.addEventListener('click',()=>{category=label;for(const b of filters.children)b.setAttribute('aria-pressed',String(b===button));renderProducts();});filters.append(button);
}
function renderProducts(){
  const query=document.querySelector('#search').value.trim().toLowerCase();
  const visible=products.filter(p=>(category==='全部商品'||p.category===category)&&`${p.name} ${p.spec}`.toLowerCase().includes(query));
  grid.innerHTML=visible.map(p=>`<article class="card"><div class="product-art" aria-hidden="true"><span class="object ${p.art}"></span></div><p class="tag">${p.category} ／ 展示商品</p><h3>${p.name}</h3><p>${p.spec}</p><div class="card-bottom"><span>批發價請詢價</span><button class="add" data-id="${p.id}" type="button" aria-label="加入${p.name}至詢價清單">加入詢價 ＋</button></div></article>`).join('');
  document.querySelector('#empty').hidden=visible.length>0;
}
grid.addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;const id=b.dataset.id;cart.set(id,Math.min(9999,(cart.get(id)||0)+1));renderCart();document.querySelector('#status').textContent=`已加入${products.find(p=>p.id===id).name}。`;});
function renderCart(){
  const items=document.querySelector('#items');
  items.innerHTML=cart.size?[...cart].map(([id,quantity])=>{const p=products.find(p=>p.id===id);return `<div class="item"><span>${p.name}</span><label>數量 <input aria-label="${p.name}數量" data-id="${id}" type="number" min="1" max="9999" step="1" value="${quantity}"></label><button type="button" class="remove" data-remove="${id}" aria-label="移除${p.name}">移除</button></div>`;}).join(''):'<p>清單目前是空的，從上方挑選你感興趣的商品吧。</p>';
  document.querySelector('#count').textContent=[...cart.values()].reduce((a,b)=>a+b,0);
  document.querySelector('#download').disabled=!cart.size;
}
document.querySelector('#items').addEventListener('change',e=>{if(!e.target.matches('input[data-id]'))return;const value=Number(e.target.value);const valid=Number.isInteger(value)&&value>=1&&value<=9999;const id=e.target.dataset.id;if(valid)cart.set(id,value);else document.querySelector('#status').textContent='數量請輸入 1 至 9999 的整數。';e.target.value=cart.get(id);document.querySelector('#count').textContent=[...cart.values()].reduce((a,b)=>a+b,0);});
document.querySelector('#items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){cart.delete(b.dataset.remove);renderCart();document.querySelector('#status').textContent='已移除商品。';}});
document.querySelector('#search').addEventListener('input',renderProducts);
document.querySelector('#download').addEventListener('click',()=>{
  if(!cart.size)return;
  const text=['IGOOKBOOM 詢價清單','以下為展示商品需求，並非已成立的訂單。','',...[...cart].map(([id,q])=>`${products.find(p=>p.id===id).name} × ${q}`),'','採購備註：',document.querySelector('#notes').value,'','價格、規格、庫存、最低訂購量與交期需另行確認。'].join('\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='IGOOKBOOM-詢價清單.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#status').textContent='詢價清單已下載，尚未傳送給業務。';
});
document.querySelector('#year').textContent=new Date().getFullYear();
renderProducts();renderCart();
