'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const STORAGE = 'igookboom-demo-v2';
  const languages = { es:0, zh:1, en:2 };
  const cart = new Map();
  let language = 'es', category = 'all', storageFailed = false;
  const local = values => values[languages[language]];
  const t = key => local(MESSAGES[key]);
  const money = cents => new Intl.NumberFormat({es:'es-ES',zh:'zh-CN',en:'en-IE'}[language], { style:'currency',currency:'EUR' }).format(cents / 100);
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/苹果|蘋果/g,'iphone').replace(/三星/g,'samsung').replace(/红米|紅米/g,'redmi').replace(/galaxy/g,'').replace(/[^\p{L}\p{N}]/gu,'');
  const productById = id => PRODUCTS.find(product => product.id === id);
  const lineKey = line => JSON.stringify([line.id,line.model,line.variant]);
  const validQuantity = (value,product) => Number.isInteger(value) && value >= product.min && value <= 9999;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(text, action, className = 'secondary') {
    const element = node('button',text,className); element.type='button'; element.addEventListener('click',action); return element;
  }
  function announce(key) { $('#status').textContent=t(key); }
  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ version:2,language,items:[...cart.values()],notes:$('#notes').value.slice(0,2000) }));
    } catch { storageFailed=true; }
    renderStorageWarning();
  }
  function restore() {
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE) || 'null');
      if (!saved || saved.version !== 2) return;
      if (Object.hasOwn(languages,saved.language)) language=saved.language;
      if (typeof saved.notes==='string') $('#notes').value=saved.notes.slice(0,2000);
      if (!Array.isArray(saved.items)) return;
      for (const line of saved.items.slice(0,500)) {
        if (!line || typeof line!=='object') continue;
        const product=productById(line.id);
        if (!product || !product.models.includes(line.model) || !Number.isInteger(line.variant) || !product.variants[line.variant] || !validQuantity(line.quantity,product)) continue;
        const clean={id:product.id,model:line.model,variant:line.variant,quantity:line.quantity};
        cart.set(lineKey(clean),clean);
      }
    } catch { storageFailed=true; }
  }
  function renderStorageWarning() {
    $('#storage-warning').hidden=!storageFailed;
    $('#storage-warning').textContent=storageFailed ? t('storageError') : '';
  }
  function translate() {
    document.documentElement.lang=language==='zh'?'zh-CN':language;
    document.title=`iGo · OK BOOM — ${t('catalog')} · DEMO`;
    $('meta[name="description"]').content=t('disclaimer');
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent=t(element.dataset.i18n);
    for (const element of document.querySelectorAll('[data-i18n-placeholder]')) element.placeholder=t(element.dataset.i18nPlaceholder);
    for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label',t(element.dataset.i18nAria));
    $('#language').value=language;
    $('#status').textContent='';
    renderFilters(); renderProducts(); renderCart(); renderStorageWarning();
  }
  function matches(product,query) {
    const haystack=normalize([product.sku,product.brand,...product.name,...product.spec,...CATEGORIES[product.category],...product.models].join(' '));
    return query.trim().split(/\s+/u).filter(Boolean).every(token=>haystack.includes(normalize(token)));
  }
  function renderFilters() {
    $('#filters').replaceChildren();
    for (const id of ['all',...Object.keys(CATEGORIES)]) {
      const filter=button(id==='all'?t('all'):local(CATEGORIES[id]),()=>{
        category=id;
        for(const child of $('#filters').children) child.setAttribute('aria-pressed',String(child.dataset.category===category));
        renderProducts();
      });
      filter.dataset.category=id; filter.setAttribute('aria-pressed',String(id===category)); $('#filters').append(filter);
    }
  }
  // Image paths must be repository-local. Product data and notes are always rendered as text.
  function art(product) {
    const wrapper=node('div',undefined,'product-art');
    if (typeof product.image==='string' && /^assets\/products\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/i.test(product.image) && !product.image.includes('..')) {
      const image=document.createElement('img'); image.src=product.image; image.alt=local(product.name); image.loading='lazy';
      image.addEventListener('error',()=>{wrapper.replaceChildren(placeholder(product),node('small',t('illustration'),'image-label'));},{once:true});
      wrapper.append(image);
    } else wrapper.append(placeholder(product),node('small',t('illustration'),'image-label'));
    return wrapper;
  }
  function placeholder(product) { const shape=node('span',undefined,`object ${product.art}`); shape.setAttribute('aria-hidden','true'); return shape; }
  function renderProducts() {
    const visible=PRODUCTS.filter(product=>(category==='all'||product.category===category) && matches(product,$('#search').value));
    $('#grid').replaceChildren();
    for(const product of visible) {
      const card=node('article',undefined,'card');
      const imageButton=button('',()=>openProduct(product),'art-button'); imageButton.setAttribute('aria-label',`${t('productDetails')}: ${local(product.name)}`); imageButton.append(art(product));
      const bottom=node('div',undefined,'card-bottom');
      const price=node('div'); price.append(node('strong',money(product.price)),node('small',t('demoPrice')));
      const choose=button(t('details'),()=>openProduct(product),'add');choose.dataset.product=product.id;
      bottom.append(price,choose);
      card.append(imageButton,node('p',`${local(CATEGORIES[product.category])} / ${product.sku}`,'tag'),node('h3',local(product.name)),node('p',product.models.join(' · '),'model-list'),node('p',local(product.spec)),bottom,node('p',`${t('minimum')}: ${product.min}`,'fine'));
      $('#grid').append(card);
    }
    $('#empty').hidden=visible.length>0; $('#results').textContent=`${visible.length} ${t('results')}`;
    const models=[...new Set(PRODUCTS.flatMap(product=>product.models))];
    $('#models').replaceChildren(...models.map(model=>{const option=node('option');option.value=model;return option;}));
  }
  function selectField(labelText,values,id) {
    const label=node('label',labelText,'field'), select=document.createElement('select'); select.id=id;select.required=true;
    const prompt=node('option',t('select'));prompt.value='';select.append(prompt);
    values.forEach((value,index)=>{const option=node('option',value);option.value=String(index);select.append(option);});
    label.append(select); return {label,select};
  }
  function openProduct(product) {
    const body=$('#product-body'); body.replaceChildren();
    const picture=art(product); const zoom=button(t('zoom'),()=>{const expanded=picture.classList.toggle('zoomed');zoom.setAttribute('aria-expanded',String(expanded));});zoom.setAttribute('aria-expanded','false');
    const title=node('h2',local(product.name));title.id='product-title';
    const form=document.createElement('form');
    const model=selectField(t('model'),product.models,'product-model');
    const variant=selectField(t('variant'),product.variants.map(local),'product-variant');
    if(product.models.length===1) model.select.value='0';
    if(product.variants.length===1) variant.select.value='0';
    const quantityLabel=node('label',`${t('quantity')} · ${t('minimum')}: ${product.min}`,'field');
    const quantity=document.createElement('input');quantity.id='product-quantity';quantity.type='number';quantity.min=product.min;quantity.max=9999;quantity.step=1;quantity.required=true;quantity.value=product.min;quantityLabel.append(quantity);
    const error=node('p',undefined,'field-error');error.setAttribute('role','alert');
    const submit=node('button',t('add'),'primary');submit.type='submit';
    form.append(model.label,variant.label,quantityLabel,error,submit);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const amount=Number(quantity.value);
      if(model.select.value==='' || variant.select.value==='' || !validQuantity(amount,product)) {error.textContent=t('invalid');return;}
      const line={id:product.id,model:product.models[Number(model.select.value)],variant:Number(variant.select.value),quantity:amount};
      const key=lineKey(line),previous=cart.get(key);
      if(previous && previous.quantity+amount>9999) {error.textContent=t('invalid');return;}
      if(previous) line.quantity+=previous.quantity;
      cart.set(key,line);save();renderCart();$('#product-dialog').close();announce('added');
    });
    body.append(title,picture,zoom,node('p',local(product.spec)),node('p',`${t('demoPrice')}: ${money(product.price)}`,'price'),node('p',`${t('sku')}: ${product.sku}`),node('p',t('noStock'),'fine'),form);
    if(!$('#product-dialog').open) $('#product-dialog').showModal();
  }
  function totals() {
    return [...cart.values()].reduce((result,line)=>({quantity:result.quantity+line.quantity,cents:result.cents+productById(line.id).price*line.quantity}),{quantity:0,cents:0});
  }
  function renderCart() {
    const container=$('#items');container.replaceChildren();
    if(!cart.size) container.append(node('p',t('emptyCart')));
    for (const [key,line] of cart) {
      const product=productById(line.id),row=node('div',undefined,'item');
      const info=node('div',undefined,'item-info');info.append(node('strong',local(product.name)),node('small',`${product.sku} · ${line.model} · ${local(product.variants[line.variant])}`),node('small',`${t('demoPrice')}: ${money(product.price)}`));
      const label=node('label',t('quantity'));const input=document.createElement('input');input.type='number';input.min=product.min;input.max=9999;input.step=1;input.value=line.quantity;
      input.setAttribute('aria-label',`${local(product.name)} ${line.model} ${local(product.variants[line.variant])} — ${t('quantity')}`);
      input.addEventListener('change',()=>{
        const value=Number(input.value);
        if(!validQuantity(value,product)) {input.value=line.quantity;announce('invalid');return;}
        line.quantity=value;save();renderCart();
      });label.append(input);
      const remove=button(t('remove'),()=>{cart.delete(key);save();renderCart();announce('removed');},'remove');remove.setAttribute('aria-label',`${t('remove')}: ${local(product.name)} ${line.model} ${local(product.variants[line.variant])}`);
      row.append(info,label,node('strong',money(product.price*line.quantity),'line-total'),remove);container.append(row);
    }
    const total=totals();$('#count').textContent=total.quantity;$('#total').textContent=`${t('total')}: ${money(total.cents)}`;
    for(const id of ['checkout','download','clear']) $(`#${id}`).disabled=id==='clear'?!cart.size&&!$('#notes').value:!cart.size;
  }
  function renderReview() {
    const body=$('#review-body');body.replaceChildren();
    for(const line of cart.values()) {
      const product=productById(line.id),row=node('div',undefined,'review-line');
      row.append(node('strong',local(product.name)),node('p',`${product.sku} · ${line.model} · ${local(product.variants[line.variant])}`),node('p',`${money(product.price)} × ${line.quantity} = ${money(product.price*line.quantity)}`));body.append(row);
    }
    body.append(node('p',`${t('total')}: ${money(totals().cents)}`,'total'),node('p',t('totalNote'),'fine'));
    if($('#notes').value) body.append(node('h3',t('notes')),node('p',$('#notes').value,'review-notes'));
  }
  function download() {
    if(!cart.size)return;
    const lines=[`iGo · OK BOOM — ${t('cartTitle')}`,t('banner'),''];
    for(const line of cart.values()) {
      const product=productById(line.id);
      lines.push(`${product.sku} | ${local(product.name)} | ${line.model} | ${local(product.variants[line.variant])} | ${money(product.price)} × ${line.quantity} = ${money(product.price*line.quantity)}`);
    }
    lines.push('',`${t('total')}: ${money(totals().cents)}`,t('totalNote'),'',t('notes'),$('#notes').value,'',t('disclaimer'));
    const url=URL.createObjectURL(new Blob(['\uFEFF',lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const link=node('a');link.href=url;link.download=`IGOOKBOOM-DEMO-${language}.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('downloaded');
  }
  $('#language').addEventListener('change',event=>{language=event.target.value;translate();save();});
  $('#search').addEventListener('input',renderProducts);
  $('#reset').addEventListener('click',()=>{category='all';$('#search').value='';renderFilters();renderProducts();});
  $('#notes').addEventListener('input',()=>{save();$('#clear').disabled=!cart.size&&!$('#notes').value;});
  $('#clear').addEventListener('click',()=>{if(!window.confirm(t('clearConfirm')))return;cart.clear();$('#notes').value='';save();renderCart();announce('cleared');});
  $('#download').addEventListener('click',download);$('#receipt').addEventListener('click',download);
  $('#checkout').addEventListener('click',()=>{if(cart.size){renderReview();$('#review-dialog').showModal();}});
  $('#confirm').addEventListener('click',()=>{if(!cart.size)return;$('#review-dialog').close();$('#complete-dialog').showModal();});
  document.querySelectorAll('[data-close]').forEach(element=>element.addEventListener('click',()=>document.getElementById(element.dataset.close).close()));
  $('#year').textContent=new Date().getFullYear();restore();translate();
})();
