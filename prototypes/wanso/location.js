'use strict';

// The native apps use city selection plus device location. This view adds map picking.
window.wansoLocation = (() => {
  const t = value => window.wansoI18n?.text(value) ?? value;
  const cities = {
    hanoi: {name:'Hà Nội',district:'Hoàn Kiếm',lat:21.0285,lng:105.8542},
    hcm: {name:'TP. Hồ Chí Minh',district:'Quận 1',lat:10.7769,lng:106.7009}
  };
  const storageKey='wanso-location-v1';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=t(text);return n;};
  const button=(text,fn,cls='location-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
  function cityFor(lat,lng) {
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    if(lat>=20.5&&lat<=21.4&&lng>=105.25&&lng<=106.1)return 'hanoi';
    if(lat>=10.3&&lat<=11.2&&lng>=106.2&&lng<=107.1)return 'hcm';
    return null;
  }
  function valid(value) {return value&&cities[value.city]&&cityFor(value.lat,value.lng)===value.city;}
  function restore() {
    try {const saved=JSON.parse(localStorage.getItem(storageKey));if(!valid(saved))return null;const names={'河内':'Hà Nội','胡志明市':'TP. Hồ Chí Minh','还剑区':'Hoàn Kiếm','第一郡':'Quận 1','巴亭区':'Ba Đình','栋多区':'Đống Đa','地图选点':'Điểm trên bản đồ','当前位置':'Vị trí hiện tại'};for(const key of ['label','district'])for(const [old,value] of Object.entries(names))if(saved[key])saved[key]=saved[key].replaceAll(old,value);if(/[\u3400-\u9fff]/.test(saved.label||''))saved.label=cities[saved.city].name;return saved;} catch{return null;}
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
      const fail=()=>{clearTimeout(timeout);script.remove();library=null;reject(new Error('Không tải được bản đồ'));};
      const timeout=setTimeout(fail,15000);
      script.onload=()=>{clearTimeout(timeout);resolve(window.L);};script.onerror=fail;document.head.append(script);
    });return library;
  }
  function mount(root,current,onConfirm) {
    let alive=true,map,resize,tileTimer,programmatic=false,gpsRequest=0;
    let selected=valid(current)?{...current}:{city:current.city||'hanoi',...cities[current.city||'hanoi'],label:cities[current.city||'hanoi'].name,mode:'city'};
    const toolbar=el('div','location-toolbar');
    const cityButtons=el('div','location-cities');cityButtons.setAttribute('aria-label',t('Chọn thành phố'));
    const gps=button('Vị trí của tôi',locate,'location-gps');gps.setAttribute('aria-label',t('Dùng vị trí hiện tại'));
    toolbar.append(cityButtons,gps);
    const form=el('form','location-search');
    const label=el('label','location-search-label','Tìm thành phố hoặc địa điểm');label.htmlFor='location-search-input';
    const input=el('input');input.id='location-search-input';input.type='search';input.placeholder=t('Thử Hồ Hoàn Kiếm hoặc Bến Thành');input.autocomplete='off';
    const searchButton=el('button','location-search-submit','Tìm');searchButton.type='submit';form.append(label,input,searchButton);
    const results=el('div','location-results');results.hidden=true;results.setAttribute('aria-label',t('Kết quả tìm địa điểm'));
    const mapWrap=el('div','location-map-wrap');
    const mapHost=el('div','location-map');mapHost.setAttribute('aria-label',t('Bản đồ chọn vị trí. Dùng phím mũi tên để di chuyển, Enter để chọn tâm bản đồ.'));
    const loadNote=el('p','location-map-loading','Đang tải bản đồ…');
    const hint=el('p','location-map-hint','Kéo bản đồ hoặc chạm để chọn. Ghim xanh là vị trí đã chọn.');
    mapWrap.append(mapHost,loadNote,hint);
    const status=el('p','location-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const selection=el('div','location-selection');const selectedName=el('strong');const coordinates=el('span');selection.append(el('span','location-selection-icon','⌖'),selectedName,coordinates);
    const confirm=button('Xác nhận vị trí',()=>{if(valid(selected)){remember(selected);onConfirm({...selected});}},'location-confirm');
    const foot=el('p','location-footnote','Tìm các địa điểm phổ biến hoặc chọn vị trí trực tiếp trên bản đồ.');
    root.append(toolbar,form,results,mapWrap,selection,status,confirm,foot);
    for(const [key,city] of Object.entries(cities)) {
      const choice=button(city.name,()=>choose({...city,city:key,label:city.name,mode:'city'}),'location-city');choice.dataset.city=key;cityButtons.append(choice);
    }
    function showSelection() {
      const supported=valid(selected);
      selectedName.textContent=t(selected.label);
      coordinates.textContent=t(`${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`);
      confirm.disabled=!supported;
      for(const b of cityButtons.children)b.setAttribute('aria-pressed',String(b.dataset.city===selected.city));
      if(!supported)status.textContent=t('Vị trí này chưa được hỗ trợ. Vui lòng chọn trong Hà Nội hoặc TP. Hồ Chí Minh.');
    }
    function choose(value) {
      gpsRequest++;gps.disabled=false;gps.textContent=t('Vị trí của tôi');
      selected={...value};status.textContent=t('');results.hidden=true;input.value='';
      if(map){programmatic=true;map.setView([selected.lat,selected.lng],15,{animate:false});programmatic=false;}
      showSelection();
    }
    function selectCenter() {
      if(!map||programmatic)return;
      const point=map.getCenter();
      if(Math.abs(point.lat-selected.lat)<1e-7&&Math.abs(point.lng-selected.lng)<1e-7)return;
      gpsRequest++;gps.disabled=false;gps.textContent=t('Vị trí của tôi');
      const city=cityFor(point.lat,point.lng);
      selected={city,district:'',lat:point.lat,lng:point.lng,label:city?cities[city].name+' · Điểm trên bản đồ':'Ngoài khu vực hỗ trợ',mode:'map'};
      status.textContent=t('');showSelection();
    }
    const normal=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
    function search() {
      const q=normal(input.value.trim());results.replaceChildren();
      if(!q){results.hidden=true;return;}
      const entries=[...Object.entries(cities).map(([city,value])=>({...value,city,label:value.name,aliases:city==='hanoi'?'Ha Noi Hanoi':'Ho Chi Minh Saigon HCM'})),...(window.wansoLocationPlaces||[])];
      const relevance=p=>normal(p.label||p.name).includes(q)?0:normal(p.aliases||'').includes(q)?1:2;
      const found=entries.filter(p=>normal([p.label,p.name,p.aliases,p.district,cities[p.city]?.name,t(p.label||p.name),t(p.district),t(cities[p.city]?.name)].join(' ')).includes(q)).sort((a,b)=>relevance(a)-relevance(b)).slice(0,6);
      for(const item of found){
        const b=button('',()=>choose({...item,label:item.label||item.name,mode:'place'}),'location-result');
        b.append(el('strong','',item.label||item.name),el('span','',[cities[item.city].name,item.district].filter(Boolean).join(' · ')));results.append(b);
      }
      if(!found.length)results.append(el('p','','Chưa tìm thấy địa điểm. Hãy thử từ khóa ngắn hơn hoặc chọn trên bản đồ.'));
      results.hidden=false;
    }
    form.onsubmit=e=>{e.preventDefault();search();};input.oninput=search;
    function locate() {
      if(!navigator.geolocation){status.textContent=t('Trình duyệt không hỗ trợ định vị. Vui lòng chọn trên bản đồ.');return;}
      const request=++gpsRequest;gps.disabled=true;gps.textContent=t('Đang định vị…');status.textContent=t('');
      navigator.geolocation.getCurrentPosition(position=>{
        if(!alive||request!==gpsRequest)return;
        gps.disabled=false;gps.textContent=t('Vị trí của tôi');
        const {latitude:lat,longitude:lng}=position.coords;const city=cityFor(lat,lng);
        if(!city){status.textContent=t('Vị trí hiện tại chưa được hỗ trợ. Hãy chọn Hà Nội hoặc TP. Hồ Chí Minh rồi chọn điểm trên bản đồ.');return;}
        choose({city,district:'',lat,lng,label:cities[city].name+' · Vị trí hiện tại',mode:'current'});
        status.textContent=t('Đã tìm thấy vị trí. Nhấn xác nhận để dùng cho lần chọn món này.');
      },error=>{
        if(!alive||request!==gpsRequest)return;gps.disabled=false;gps.textContent=t('Vị trí của tôi');
        status.textContent=t(error.code===1?'Chưa có quyền truy cập vị trí. Bạn vẫn có thể chọn trên bản đồ.':'Chưa thể xác định vị trí. Hãy chọn trên bản đồ hoặc thử lại sau.');
      },{timeout:8000,maximumAge:60000});
    }
    showSelection();
    loadMap().then(L=>{
      if(!alive)return;
      map=L.map(mapHost,{zoomControl:false,scrollWheelZoom:false,attributionControl:true,fadeAnimation:false,zoomAnimation:false}).setView([selected.lat,selected.lng],15);
      map.attributionControl.setPrefix(false);
      L.control.zoom({position:'bottomright',zoomInTitle:t('Phóng to bản đồ'),zoomOutTitle:t('Thu nhỏ bản đồ')}).addTo(map);
      // Standard browser cache/referrer retained; only visible tiles are requested.
      const retry=button('Tải lại bản đồ',()=>{retry.hidden=true;status.textContent=t('');loadNote.hidden=false;loadNote.textContent=t('Đang tải lại bản đồ…');tiles.redraw();},'location-map-retry');retry.hidden=true;mapWrap.append(retry);
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,minZoom:5,keepBuffer:0,updateWhenIdle:true,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
      loadNote.textContent=t('Đang tải bản đồ…');
      tileTimer=setTimeout(()=>{if(alive&&!loadNote.hidden)loadNote.textContent=t('Bản đồ đang tải chậm. Bạn có thể tìm địa điểm trước.');},8000);
      tiles.on('tileload',()=>{if(alive){loadNote.hidden=true;clearTimeout(tileTimer);}});
      const pin=el('span','location-center-pin');pin.setAttribute('aria-hidden','true');mapWrap.append(pin);
      tiles.on('tileerror',()=>{if(alive){clearTimeout(tileTimer);loadNote.hidden=true;retry.hidden=false;status.textContent=t('Một phần bản đồ chưa tải xong. Hãy thử lại hoặc tìm địa điểm để tiếp tục.');}});
      tiles.on('load',()=>{
        if(!alive)return;
        if(!mapHost.querySelector('.leaflet-tile-loaded'))status.textContent=t('Bản đồ chưa tải được. Hãy kiểm tra kết nối hoặc thử lại.');
        else if([...mapHost.querySelectorAll('.leaflet-tile')].every(tile=>tile.classList.contains('leaflet-tile-loaded'))){retry.hidden=true;if([t('Một phần bản đồ chưa tải xong. Hãy thử lại hoặc tìm địa điểm để tiếp tục.'),t('Bản đồ chưa tải được. Hãy kiểm tra kết nối hoặc thử lại.')].includes(status.textContent))status.textContent=t('');}
      });
      map.on('dragstart',()=>{gpsRequest++;gps.disabled=false;gps.textContent=t('Vị trí của tôi');});
      map.on('moveend',selectCenter);
      map.on('click',event=>map.panTo(event.latlng,{animate:false}));
      mapHost.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectCenter();confirm.focus();}});
      resize=new ResizeObserver(()=>{
        if(!alive)return;
        programmatic=true;map.invalidateSize({pan:false});map.setView([selected.lat,selected.lng],map.getZoom(),{animate:false});programmatic=false;
      });resize.observe(mapHost);
      programmatic=true;map.invalidateSize({pan:false});programmatic=false;
    }).catch(()=>{if(alive){loadNote.textContent=t('Không tải được bản đồ. Bạn vẫn có thể tìm địa điểm hoặc chọn thành phố.');hint.hidden=true;}});
    return ()=>{alive=false;gpsRequest++;clearTimeout(tileTimer);resize?.disconnect();map?.remove();root.replaceChildren();};
  }
  return {mount,restore,cityFor};
})();
