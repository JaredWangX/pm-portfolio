'use strict';

// The native apps use city selection plus device location. This view adds map picking.
window.wansoLocation = (() => {
  const cities = {
    hanoi: {name:'河内',district:'还剑区',lat:21.0285,lng:105.8542},
    hcm: {name:'胡志明市',district:'第一郡',lat:10.7769,lng:106.7009}
  };
  const storageKey='wanso-location-v1';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
  const button=(text,fn,cls='location-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
  function cityFor(lat,lng) {
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    if(lat>=20.5&&lat<=21.4&&lng>=105.25&&lng<=106.1)return 'hanoi';
    if(lat>=10.3&&lat<=11.2&&lng>=106.2&&lng<=107.1)return 'hcm';
    return null;
  }
  function valid(value) {return value&&cities[value.city]&&cityFor(value.lat,value.lng)===value.city;}
  function restore() {
    try {const saved=JSON.parse(localStorage.getItem(storageKey));return valid(saved)?saved:null;} catch{return null;}
  }
  function remember(value) {try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{/* Private mode can disallow local storage. */}}
  let library;
  function loadMap() {
    if(window.L)return Promise.resolve(window.L);
    if(library)return library;
    library=new Promise((resolve,reject)=>{
      if(!document.querySelector('[data-map-css]')){
        const css=document.createElement('link');css.rel='stylesheet';css.href='../../assets/vendor/leaflet/leaflet.css';css.dataset.mapCss='true';document.head.append(css);
      }
      const script=document.createElement('script');script.src='../../assets/vendor/leaflet/leaflet.js';
      const fail=()=>{clearTimeout(timeout);script.remove();library=null;reject(new Error('地图资源暂时无法加载'));};
      const timeout=setTimeout(fail,15000);
      script.onload=()=>{clearTimeout(timeout);resolve(window.L);};script.onerror=fail;document.head.append(script);
    });return library;
  }
  function mount(root,current,onConfirm) {
    let alive=true,map,resize,tileTimer,programmatic=false,gpsRequest=0;
    let selected=valid(current)?{...current}:{city:current.city||'hanoi',...cities[current.city||'hanoi'],label:cities[current.city||'hanoi'].name,mode:'city'};
    const toolbar=el('div','location-toolbar');
    const cityButtons=el('div','location-cities');cityButtons.setAttribute('aria-label','切换城市');
    const gps=button('定位到我',locate,'location-gps');gps.setAttribute('aria-label','使用当前位置');
    toolbar.append(cityButtons,gps);
    const form=el('form','location-search');
    const label=el('label','location-search-label','搜索城市或地标');label.htmlFor='location-search-input';
    const input=el('input');input.id='location-search-input';input.type='search';input.placeholder='试试「还剑湖」或「Ben Thanh」';input.autocomplete='off';
    const searchButton=el('button','location-search-submit','搜索');searchButton.type='submit';form.append(label,input,searchButton);
    const results=el('div','location-results');results.hidden=true;results.setAttribute('aria-label','地点搜索结果');
    const mapWrap=el('div','location-map-wrap');
    const mapHost=el('div','location-map');mapHost.setAttribute('aria-label','选点地图，方向键移动，回车选定中心');
    const loadNote=el('p','location-map-loading','正在加载地图…');
    const hint=el('p','location-map-hint','拖动地图或点击选点，蓝色标记是所选位置');
    mapWrap.append(mapHost,loadNote,hint);
    const status=el('p','location-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const selection=el('div','location-selection');const selectedName=el('strong');const coordinates=el('span');selection.append(el('span','location-selection-icon','⌖'),selectedName,coordinates);
    const confirm=button('确认此位置',()=>{if(valid(selected)){remember(selected);onConfirm({...selected});}},'location-confirm');
    const foot=el('p','location-footnote','地点搜索覆盖常用地标；其他位置可直接在地图上选。');
    root.append(toolbar,form,results,mapWrap,selection,status,confirm,foot);
    for(const [key,city] of Object.entries(cities)) {
      const choice=button(city.name,()=>choose({...city,city:key,label:city.name,mode:'city'}),'location-city');choice.dataset.city=key;cityButtons.append(choice);
    }
    function showSelection() {
      const supported=valid(selected);
      selectedName.textContent=selected.label;
      coordinates.textContent=`${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`;
      confirm.disabled=!supported;
      for(const b of cityButtons.children)b.setAttribute('aria-pressed',String(b.dataset.city===selected.city));
      if(!supported)status.textContent='这个位置暂未覆盖，请在河内或胡志明市选点。';
    }
    function choose(value) {
      gpsRequest++;gps.disabled=false;gps.textContent='定位到我';
      selected={...value};status.textContent='';results.hidden=true;input.value='';
      if(map){programmatic=true;map.setView([selected.lat,selected.lng],15,{animate:false});programmatic=false;}
      showSelection();
    }
    function selectCenter() {
      if(!map||programmatic)return;
      const point=map.getCenter();
      if(Math.abs(point.lat-selected.lat)<1e-7&&Math.abs(point.lng-selected.lng)<1e-7)return;
      gpsRequest++;gps.disabled=false;gps.textContent='定位到我';
      const city=cityFor(point.lat,point.lng);
      selected={city,district:'',lat:point.lat,lng:point.lng,label:city?cities[city].name+' · 地图选点':'覆盖范围外',mode:'map'};
      status.textContent='';showSelection();
    }
    const normal=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
    function search() {
      const q=normal(input.value.trim());results.replaceChildren();
      if(!q){results.hidden=true;return;}
      const entries=[...Object.entries(cities).map(([city,value])=>({...value,city,label:value.name,aliases:city==='hanoi'?'Ha Noi Hanoi':'Ho Chi Minh Saigon HCM'})),...(window.wansoLocationPlaces||[])];
      const found=entries.filter(p=>normal([p.label,p.name,p.aliases,p.district,cities[p.city]?.name].join(' ')).includes(q)).slice(0,6);
      for(const item of found){
        const b=button('',()=>choose({...item,label:item.label||item.name,mode:'place'}),'location-result');
        b.append(el('strong','',item.label||item.name),el('span','',[cities[item.city].name,item.district].filter(Boolean).join(' · ')));results.append(b);
      }
      if(!found.length)results.append(el('p','','没有匹配的常用地标。可以缩短关键词，或直接在地图上选点。'));
      results.hidden=false;
    }
    form.onsubmit=e=>{e.preventDefault();search();};input.oninput=search;
    function locate() {
      if(!navigator.geolocation){status.textContent='此浏览器不支持定位，请在地图上选点。';return;}
      const request=++gpsRequest;gps.disabled=true;gps.textContent='定位中…';status.textContent='';
      navigator.geolocation.getCurrentPosition(position=>{
        if(!alive||request!==gpsRequest)return;
        gps.disabled=false;gps.textContent='定位到我';
        const {latitude:lat,longitude:lng}=position.coords;const city=cityFor(lat,lng);
        if(!city){status.textContent='当前位置不在覆盖范围内。可选择河内或胡志明市，再在地图上选点。';return;}
        choose({city,district:'',lat,lng,label:cities[city].name+' · 当前位置',mode:'current'});
        status.textContent='已找到当前位置，确认后用于本次选餐。';
      },error=>{
        if(!alive||request!==gpsRequest)return;gps.disabled=false;gps.textContent='定位到我';
        status.textContent=error.code===1?'定位权限未开启，你仍可以在地图上选点。':'暂时无法定位，请在地图上选点或稍后重试。';
      },{timeout:8000,maximumAge:60000});
    }
    showSelection();
    loadMap().then(L=>{
      if(!alive)return;
      map=L.map(mapHost,{zoomControl:false,scrollWheelZoom:false,attributionControl:true,fadeAnimation:false,zoomAnimation:false}).setView([selected.lat,selected.lng],15);
      map.attributionControl.setPrefix(false);
      L.control.zoom({position:'bottomright',zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(map);
      // Standard browser cache/referrer retained; only visible tiles are requested.
      const retry=button('重试地图',()=>{retry.hidden=true;status.textContent='';loadNote.hidden=false;loadNote.textContent='正在重新载入地图…';tiles.redraw();},'location-map-retry');retry.hidden=true;mapWrap.append(retry);
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,minZoom:5,keepBuffer:0,updateWhenIdle:true,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
      loadNote.textContent='正在载入地图…';
      tileTimer=setTimeout(()=>{if(alive&&!loadNote.hidden)loadNote.textContent='地图载入较慢，可先搜索城市或地标。';},8000);
      tiles.on('tileload',()=>{if(alive){loadNote.hidden=true;clearTimeout(tileTimer);}});
      const pin=el('span','location-center-pin');pin.setAttribute('aria-hidden','true');mapWrap.append(pin);
      tiles.on('tileerror',()=>{if(alive){clearTimeout(tileTimer);loadNote.hidden=true;retry.hidden=false;status.textContent='部分地图暂未载入。可点「重试地图」，或搜索城市、地标继续选点。';}});
      tiles.on('load',()=>{
        if(!alive)return;
        if(!mapHost.querySelector('.leaflet-tile-loaded'))status.textContent='地图暂未载入，请检查网络或重试。';
        else if([...mapHost.querySelectorAll('.leaflet-tile')].every(tile=>tile.classList.contains('leaflet-tile-loaded'))){retry.hidden=true;if(/^(部分地图|地图暂未)/.test(status.textContent))status.textContent='';}
      });
      map.on('dragstart',()=>{gpsRequest++;gps.disabled=false;gps.textContent='定位到我';});
      map.on('moveend',selectCenter);
      map.on('click',event=>map.panTo(event.latlng,{animate:false}));
      mapHost.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectCenter();confirm.focus();}});
      resize=new ResizeObserver(()=>{
        if(!alive)return;
        programmatic=true;map.invalidateSize({pan:false});map.setView([selected.lat,selected.lng],map.getZoom(),{animate:false});programmatic=false;
      });resize.observe(mapHost);
      programmatic=true;map.invalidateSize({pan:false});programmatic=false;
    }).catch(()=>{if(alive){loadNote.textContent='地图暂时无法加载，可搜索地标或选择城市。';hint.hidden=true;}});
    return ()=>{alive=false;gpsRequest++;clearTimeout(tileTimer);resize?.disconnect();map?.remove();root.replaceChildren();};
  }
  return {mount,restore,cityFor};
})();
