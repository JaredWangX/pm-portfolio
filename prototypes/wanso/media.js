'use strict';

// Keep each store's image identity while loading a small local variant on cards.
window.wansoMedia = (() => {
  const loaded=new Set(),unavailable=new Set();
  let firstImages=0;
  const placeholder='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Cpath fill="%23e5eef5" d="M0 0h1v1H0z"/%3E%3C/svg%3E';
  function cardSource(source) {
    if(/\/assets\/wanso\/catalog\/[^/]+\.webp(?:\?.*)?$/.test(source)){const thumb=source.replace('/catalog/','/catalog/thumbs/');return unavailable.has(thumb)?source:thumb;}
    if(/\/assets\/wanso\/native\/order-(?:moc|quyen)\.webp$/.test(source)){const thumb=source.replace('/native/','/native/thumbs/');return unavailable.has(thumb)?source:thumb;}
    return source;
  }
  function load(image) {
    if(!image.dataset.mediaPending)return;
    const source=image.dataset.mediaPending;delete image.dataset.mediaPending;
    observer?.unobserve(image);
    image.fetchPriority=image.dataset.mediaPriority||(firstImages++<2?'high':'auto');
    image.onload=()=>{if(image.naturalWidth>1){
      loaded.add(image.getAttribute('src'));image.dataset.mediaState='loaded';
      // The soft edge fill uses the already-decoded thumbnail, not another photo or request.
      image.parentElement?.style.setProperty('--photo-fill',`url("${image.getAttribute('src')}")`);
    }};
    let fallback=false;
    image.onerror=()=>{
      if(!fallback&&source!==image.dataset.imageSource){fallback=true;unavailable.add(source);image.src=image.dataset.imageSource;return;}
      image.dataset.mediaState='error';
    };
    image.src=source;
  }
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting)load(entry.target);
  },{rootMargin:'200px 100px',scrollMargin:'160px',threshold:0}):null;
  // Cached tab layers can be detached and restored. Do not retain abandoned image trees.
  if(observer)new MutationObserver(changes=>{
    const images=node=>node.nodeType===1?[...(node.matches('img[data-media-pending]')?[node]:[]),...node.querySelectorAll('img[data-media-pending]')]:[];
    for(const change of changes){
      for(const node of change.removedNodes)for(const img of images(node))if(!img.isConnected)observer.unobserve(img);
      for(const node of change.addedNodes)for(const img of images(node))observer.observe(img);
    }
  }).observe(document.body,{childList:true,subtree:true});
  function image(source,{className='',alt='',detail=false,eager=false,width=220,height=140}={}) {
    const node=document.createElement('img');node.className=className;node.alt=window.wansoI18n?.text(alt)??alt;
    const size=window.wansoPhotoSizes?.[source.split('/').pop()];
    node.width=size?.[0]||width;node.height=size?.[1]||height;node.draggable=false;node.decoding='async';
    if(size)node.style.aspectRatio=size[0]+'/'+size[1];
    node.dataset.imageSource=source;
    const target=detail?source:cardSource(source);
    node.dataset.mediaPending=target;node.dataset.mediaState='pending';
    if(eager||detail)node.dataset.mediaPriority='high';
    node.src=placeholder;
    if(eager||detail||loaded.has(target)||!observer)load(node);
    else observer.observe(node);
    return node;
  }
  return {image,cardSource};
})();
