'use strict';

// Restaurant identity stays separate from a folder's editable label.
window.wansoSaved = (() => {
  const key = 'wanso-saved-v2';
  const all = 'Tất cả';
  const icons = ['❤️','🍜','☕','🥗','🍱','🌿','✨','📍'];
  const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/gu,' ') : '';
  const normalized = value => clean(value).normalize('NFKC').toLocaleLowerCase();
  function defaults() {
    return {collections:[all,'Bữa trưa quen thuộc','Cuối tuần đổi vị'],
      collectionDetails:Object.assign(Object.create(null),{
        'Bữa trưa quen thuộc':{emoji:'🍜',description:'Những quán dễ chọn cho một bữa trưa ấm bụng.'},
        'Cuối tuần đổi vị':{emoji:'✨',description:'Để dành những hương vị muốn thử khi rảnh rỗi.'}
      }),group:{moc:'Bữa trưa quen thuộc',quyen:'Cuối tuần đổi vị'},savedFolder:all};
  }
  function load(validStore) {
    let raw;
    try {raw=localStorage.getItem(key);} catch {return defaults();}
    if(!raw)return defaults();
    try {
      const value=JSON.parse(raw);
      if(!Array.isArray(value.collections)||!value.group||typeof value.group!=='object')return defaults();
      const collections=[all],collectionDetails=Object.create(null),seen=new Set([normalized(all)]);
      for(const name of value.collections) {
        const label=clean(name);
        if(!label||label.length>36||seen.has(normalized(label)))continue;
        seen.add(normalized(label));collections.push(label);
        const info=value.collectionDetails?.[name];
        collectionDetails[label]={emoji:icons.includes(info?.emoji)?info.emoji:'❤️',description:clean(info?.description).slice(0,160)};
      }
      const group=Object.create(null);
      for(const [id,folder] of Object.entries(value.group))if(validStore(id))group[id]=collections.includes(folder)?folder:all;
      return {collections,collectionDetails,group,savedFolder:collections.includes(value.savedFolder)?value.savedFolder:all};
    } catch {return defaults();}
  }
  function persist(state) {
    try {
      localStorage.setItem(key,JSON.stringify({collections:state.collections,collectionDetails:state.collectionDetails,group:state.group,savedFolder:state.savedFolder}));
      return true;
    } catch {return false;}
  }
  function validateName(name,state,previous) {
    const value=clean(name);
    if(!value)return 'empty';
    if(value.length>36)return 'long';
    if(state.collections.some(other=>other!==previous&&(normalized(other)===normalized(value)||normalized(window.wansoI18n?.text(other)||other)===normalized(value))))return 'duplicate';
    return '';
  }
  return {all,icons,clean,load,persist,validateName};
})();
