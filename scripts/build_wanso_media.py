"""Capture Wanso's Chinese presentation mode, then record a verified slow journey.

Serve the portfolio on port 8765, then run this file, followed by --record.
The same browser actions drive both passes. No captions are baked into screenshots
and no restaurant, reply or price data is injected. UI clock is fixed at lunchtime.
"""
import argparse, io, json, os, re, subprocess, sys, time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'work'/'wanso-zh-media'; WORK.mkdir(exist_ok=True)
ASSETS=ROOT/'assets'/'wanso'; SHOTS=ASSETS/'current'; SHOTS.mkdir(exist_ok=True)
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')
PROMPT='想吃清淡鸡肉河粉，不放香菜，含配送不超过 80,000 越南盾，推荐5家店。'
CLOCK="""(() => { const RealDate=Date, instant=RealDate.parse('2026-11-28T05:15:00Z'); class FixedDate extends RealDate {constructor(...args){super(...(args.length?args:[instant]));} static now(){return instant;}} window.Date=FixedDate; })();"""
parser=argparse.ArgumentParser(); parser.add_argument('--record',action='store_true'); args=parser.parse_args()
record=args.record
if record and not (WORK/'preflight.json').exists(): raise SystemExit('Run the Chinese preflight first.')
marks=[]
with sync_playwright() as p:
 # This compositor scale is needed in addition to DPR. Without it Chromium records
 # a 402px phone in the upper left of an 804px gray canvas rather than a 2x video.
 browser=p.chromium.launch(headless=True,args=['--force-device-scale-factor=2'])
 options=dict(viewport={'width':402,'height':874},device_scale_factor=2,locale='zh-CN',timezone_id='Asia/Ho_Chi_Minh',has_touch=True,is_mobile=True)
 if record: options.update(record_video_dir=str(WORK/'raw'),record_video_size={'width':804,'height':1748})
 context=browser.new_context(**options); context.add_init_script(CLOCK)
 page=context.new_page(); video=page.video if record else None
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/prototypes/wanso/?embed=1&device=1&lang=zh#home',wait_until='networkidle')
 expect(page.locator('.phone-nav')).to_be_visible(); page.wait_for_timeout(350)
 assert page.locator('.phone-nav').inner_text().find('首页')>=0,'Chinese display mode is required'
 def map_ready():
  page.wait_for_function('''() => {const tiles=[...document.querySelectorAll('.location-map .leaflet-tile')];return tiles.length>0 && tiles.every(t=>t.complete && t.naturalWidth>0);}''',timeout=45000)
 # Warm the actual tile requests before the film begins; do not replace map imagery.
 page.locator('.ios-home-location').click(); map_ready()
 page.locator('#location-search-input').fill('Hoàn Kiếm'); page.locator('.location-search-submit').click()
 page.locator('.location-result').first.click(); map_ready(); page.locator('.sheet-close').click()
 page.wait_for_timeout(450)
 start=time.monotonic()
 def mark(name,caption):
  item={'name':name,'seconds':round(time.monotonic()-start,3),'caption':caption}; marks.append(item); print(json.dumps(item,ensure_ascii=False),flush=True)
 def hold(seconds): page.wait_for_timeout(int((seconds if record else .08)*1000))
 def photos_ready():
  page.wait_for_function('''() => [...document.querySelectorAll('.screen img, .wanso-sheet[open] img')].every(image => {
   const r=image.getBoundingClientRect();
   if(!r.width||!r.height||r.right<=0||r.left>=innerWidth||r.bottom<=0||r.top>=innerHeight)return true;
   return image.complete&&image.naturalWidth>1&&!image.dataset.mediaPending;
  })''',timeout=15000)
 def capture(name):
  photos_ready()
  if not record:
   shot=Image.open(io.BytesIO(page.locator('.screen').screenshot())).convert('RGB'); assert shot.size==(804,1748),shot.size
   shot.save(SHOTS/(name+'.webp'),'WEBP',quality=88,method=6)
 def scroll_to(scroller,target,offset=12):
  y=target.evaluate('(el)=>el.getBoundingClientRect().top')-scroller.evaluate('(el)=>el.getBoundingClientRect().top')+scroller.evaluate('(el)=>el.scrollTop')-offset
  scroller.evaluate('(el,y)=>el.scrollTo({top:y,behavior:"smooth"})',y); page.wait_for_timeout(850)
 def drag_nav(target):
  nav=page.locator('.phone-nav'); current=nav.locator('[aria-current=page]').bounding_box(); end=nav.locator('[data-target='+target+']').bounding_box()
  x=current['x']+current['width']/2; y=current['y']+current['height']/2
  page.mouse.move(x,y); page.mouse.down()
  for i in range(1,31): page.mouse.move(x+(end['x']+end['width']/2-x)*i/30,y); page.wait_for_timeout(18)
  page.mouse.up(); page.wait_for_timeout(400)
  expect(nav.locator('[data-target='+target+']')).to_have_attribute('aria-current','page')
 def rail_pan(rail,dx):
  rail.evaluate('(el,dx)=>el.scrollBy({left:dx,behavior:"smooth"})',dx); page.wait_for_timeout(800)

 mark('home','从首页选择用餐位置，再用一句话说明口味与预算。'); capture('home'); hold(4)
 mark('navigation','拖动底部玻璃导航进入探索，查看午餐场景与两平台餐厅。'); drag_nav('explore'); capture('explore'); hold(4); drag_nav('home')
 mark('location','在地图中查找还剑区，选中地点后确认附近的选餐范围。')
 page.locator('.ios-home-location').click(); map_ready()
 page.locator('#location-search-input').fill('Hoàn Kiếm'); page.locator('.location-search-submit').click(); hold(1)
 page.locator('.location-result').first.click(); map_ready(); capture('location'); hold(4); page.locator('.location-confirm').click()
 expect(page.locator('.wanso-sheet')).not_to_be_visible()
 home=page.locator('.ios-page-home'); rail=page.locator('.rich-home-rail')
 assert rail.locator('.rich-home-card').count()==5
 for card in rail.locator('.rich-home-card').all(): assert card.locator('.rich-home-platforms [data-platform]').count()==2
 home_photos=rail.locator('.rich-home-card img').evaluate_all('(images)=>images.map(image=>image.dataset.imageSource)')
 assert len(set(home_photos))==5,'Featured restaurants need five distinct photographs'
 mark('featured','五家精选都保留双平台入口；横向浏览菜品、特点和平台费用。')
 scroll_to(home,rail,28); hold(3); rail_pan(rail,240); hold(3); rail_pan(rail,240); hold(3)
 home.evaluate('(el)=>el.scrollTo({top:0,behavior:"smooth"})'); page.wait_for_timeout(850)
 mark('search','清淡鸡肉河粉、不放香菜，含配送不超过 80,000 越南盾。')
 query=page.locator('.native-home-query');query.fill(PROMPT)
 assert query.evaluate('(el)=>el.tagName==="TEXTAREA"&&el.scrollHeight<=el.clientHeight+1'),'The complete meal request must wrap visibly'
 hold(2); page.locator('.ios-home-search-submit').click()
 expect(page.locator('.rich-processing')).to_be_visible()
 mark('processing','依次理解需求、筛选菜品、核算费用，再整理推荐依据。')
 expect(page.locator('.ios-chat-reply')).to_have_count(3,timeout=15000)
 assert page.locator('.ios-user-message').count()==3
 replies=page.locator('.ios-chat-reply'); chat=page.locator('.ios-chat')
 assert replies.evaluate_all('(nodes)=>nodes.map(node=>node.dataset.kind)')==['discover','compare','decision']
 first=replies.first; comparison=replies.nth(1).locator('.reply-comparison'); decision=replies.nth(2).locator('.reply-decision')
 assert first.locator('.rich-recommendation').count()==5
 assert len(first.locator('.ios-assistant-message').inner_text())>100
 photos=first.locator('.rich-recommendation img').evaluate_all('(images)=>images.map(image=>image.dataset.imageSource)')
 assert len(set(photos))==5,'Discovery needs distinct restaurant photographs'
 scenes=first.locator('[data-store-id]').evaluate_all('(nodes)=>nodes.map(node=>window.wansoCatalog.find(store=>store.id===node.dataset.storeId).imageScene)')
 assert len(set(scenes))==5,'Different angles of the same dish must not masquerade as fresh photos'
 recommended_id=first.locator('[data-store-id]').first.get_attribute('data-store-id')
 expect(comparison).to_have_attribute('data-store-id',recommended_id)
 expect(decision).to_have_attribute('data-store-id',recommended_id)
 for reply in [replies.nth(1),replies.nth(2)]:
  assert reply.locator('.rich-chat-rail,img').count()==0,'Follow-up replies must not repeat the discovery photos'
 assert comparison.locator('.reply-platforms>[data-platform]').count()==2
 ledger_rows=comparison.locator('.reply-ledger-table tbody tr').all()
 ledger_amounts=[[int(re.sub(r'\D','',value)) for value in row.locator('td').all_text_contents()] for row in ledger_rows]
 for index in range(2):
  values=[row[index] for row in ledger_amounts]
  assert values[0]-values[1]-values[2]+values[3]-values[4]==values[5],values
 assert int(decision.locator('.reply-chosen-offer').get_attribute('data-total'))==min(ledger_amounts[-1])
 assert page.locator('.phone-nav [aria-current=page]').get_attribute('data-target')=='home'
 chat.evaluate('(el)=>el.scrollTop=0'); page.wait_for_timeout(250)
 mark('recommend','第一轮：先把清淡、不放香菜和预算对应到具体菜品，解释为什么推荐。'); capture('recommend'); hold(7)
 sections=first.locator('.rich-answer-section')
 scroll_to(chat,sections.nth(1)); hold(7)
 mark('candidates','逐家比较五个候选：菜品特点、推荐理由、双平台含配送总价。')
 cards=first.locator('.rich-chat-rail'); scroll_to(chat,cards,12)
 primary=cards.locator('.rich-restaurant').first.bounding_box();reading=chat.bounding_box()
 assert primary['y']>=reading['y']-1 and primary['y']+primary['height']<=reading['y']+reading['height']+1,'Primary restaurant card must fit above the composer'
 capture('candidates'); hold(5)
 for _ in range(4): rail_pan(cards,255); hold(5)
 mark('followup','第二轮针对同一家店比较两个平台，不重复推荐店铺；先看实付差多少，再看为什么。')
 scroll_to(chat,page.locator('.ios-user-message').nth(1)); hold(5)
 scroll_to(chat,comparison); capture('followup'); hold(8)
 mark('chat-ledger','展开费用与用券明细，核对店铺折扣、平台券和配送优惠如何影响本单总价。')
 comparison.locator('.reply-ledger-toggle').click(); scroll_to(chat,comparison.locator('.reply-ledger'),12); hold(6)
 scroll_to(chat,comparison.locator('.reply-coupon-rules'),12); hold(6)
 comparison.locator('.reply-ledger-toggle').click()
 mark('confirm','第三轮收敛到一家店，保留选定菜品与含配送实付，直接打开菜单继续确认。')
 scroll_to(chat,page.locator('.ios-user-message').nth(2)); hold(5)
 scroll_to(chat,decision); capture('confirm'); hold(8)
 decision.locator('.reply-primary').click()
 view=page.locator('.native-store-view'); expect(view).to_be_visible(); store_scroll=view.locator('.native-store-scroll')
 expect(view).to_have_attribute('data-store-id',recommended_id)
 page.wait_for_timeout(850);store_scroll.evaluate('(el)=>el.scrollTo({top:0,behavior:"smooth"})');page.wait_for_timeout(850)
 assert '营业' in view.locator('.native-store-open').inner_text()
 pricing=[]
 for card in view.locator('.native-store-platform').all():
  amounts=[int(re.sub(r'\D','',text)) for text in card.locator('.native-store-platform-body strong').all_text_contents()]
  total=int(re.sub(r'\D','',card.locator('.native-store-platform-total strong').inner_text()))
  assert amounts[0]-amounts[1]-amounts[2]+amounts[3]-amounts[4]==total,(amounts,total)
  pricing.append({'platform':card.get_attribute('data-platform'),'amounts':amounts,'total':total})
 price_proof={'breakdown':pricing,'overview':view.locator('.native-store-price-overview').inner_text(),'coupon_rules':view.locator('.native-store-rules-list').inner_text()}
 mark('store','进入同一家店铺，核对营业状态、招牌菜品和店铺信息。'); capture('store'); hold(7)
 mark('price','先看总价结论：不能只比较标价，还要算店铺优惠、优惠券和配送减免。')
 view.locator('.native-store-price-link').click(); page.wait_for_timeout(850); capture('price'); hold(8)
 mark('compare','两平台按同一道菜、同一份量逐项核算，餐费与每项减免都有明确金额。')
 scroll_to(store_scroll,view.locator('.native-store-platforms'),78); capture('compare'); hold(9)
 mark('difference','展开价差来源：哪一项省钱、哪一项反而增加费用，最后合计到应付金额。')
 scroll_to(store_scroll,view.locator('.native-store-compare'),78); hold(8)
 mark('coupons','只计入符合门槛的优惠；继续核对优惠券条件、封顶金额和配送减免。')
 rules=view.locator('.native-store-offer-rules')
 scroll_to(store_scroll,view.locator('.native-store-coupon-heading'),78)
 rules.first.locator('summary').click(); hold(5)
 scroll_to(store_scroll,rules.nth(1),88); rules.nth(1).locator('summary').click(); hold(5)
 mark('menu','查看菜单中的鸡肉河粉与加配选项，核对份量、配料和价格。')
 scroll_to(store_scroll,view.locator('.native-store-menu'),78); capture('menu'); hold(6)
 menu_rows=view.locator('.native-store-menu-row'); assert menu_rows.count()>=3
 scroll_to(store_scroll,menu_rows.nth(2),88); hold(6)
 mark('reviews','继续阅读口味与搭配建议：清淡程度、加料和适合的用餐情境。')
 scroll_to(store_scroll,view.locator('.native-store-reviews'),78); capture('reviews'); hold(6)
 # Save the restaurant through the real folder flow, not by altering local state.
 saved_id=view.get_attribute('data-store-id')
 mark('save-choose','把喜欢的店收藏起来，按自己的用餐场景整理。')
 view.locator('.native-store-heart').click(); sheet=page.locator('.wanso-sheet'); hold(4)
 sheet.locator('.collection-create').click()
 sheet.locator('[name=collectionName]').fill('清淡工作餐')
 sheet.locator('[name=collectionDescription]').fill('工作日想吃得清淡一些，留住汤粉、鸡肉和蔬菜搭配。')
 sheet.locator('#wanso-sheet-title').click()
 mark('save-create','新建「清淡工作餐」，写下口味和用餐场景。'); capture('collection'); hold(4)
 sheet.locator('button[type=submit]').click()
 expect(sheet.locator('.collection-choice[data-folder="清淡工作餐"]')).to_have_attribute('aria-pressed','true'); hold(4)
 sheet.locator('.sheet-button.primary').click(); expect(sheet).not_to_be_visible()
 expect(view.locator('.native-store-heart')).to_have_attribute('aria-pressed','true')
 view.locator('.native-store-back').click(); expect(view).to_have_count(0)
 mark('saved','回到对话，拖动导航进入收藏。')
 drag_nav('saved'); saved=page.locator('.ios-page-saved')
 expect(page.locator('.saved-toast')).not_to_be_visible(timeout=12000)
 saved.evaluate('(el)=>el.scrollTo({top:0,behavior:"smooth"})');page.wait_for_timeout(850)
 mark('saved-view','按收藏夹切换，紧凑列表保留同份餐的双平台价格。')
 expect(saved.locator('.saved-folder[data-folder="Tất cả"]')).to_have_attribute('aria-pressed','true')
 expect(saved.locator('.saved-restaurant')).to_have_count(3); capture('saved'); hold(4)
 saved.locator('.saved-folder[data-folder="清淡工作餐"]').click()
 expect(saved.locator('.saved-restaurant')).to_have_count(1)
 expect(saved.locator('.saved-folder[data-folder="清淡工作餐"] .saved-folder-count')).to_have_text('1')
 assert saved.locator('.saved-restaurant').get_attribute('data-saved-id')==saved_id
 mark('saved-folder','进入「清淡工作餐」，收藏夹数量与餐厅列表一致。'); hold(4)
 saved.locator('.saved-card-more').click()
 sheet.locator('.saved-card-action[data-action=catalogShare]').click()
 expect(sheet.locator('.wanso-share')).to_be_visible()
 page.wait_for_timeout(450)
 mark('share','分享店名、招牌菜和双平台费用，让朋友看懂推荐。'); capture('share'); hold(4)
 scroll_to(sheet,sheet.locator('.wanso-share-pricing'),78)
 share_totals=[int(re.sub(r'\D','',text)) for text in sheet.locator('.wanso-share-total strong').all_text_contents()]
 assert sorted(share_totals)==sorted(item['total'] for item in pricing),share_totals
 sheet.locator('.wanso-share-ledger summary').click()
 scroll_to(sheet,sheet.locator('.wanso-share-ledger'),78)
 mark('share-detail','展开优惠明细，核对餐费、优惠券和配送组成。'); hold(5)
 sheet.locator('.sheet-close').click()
 saved.locator('.saved-recent-shortcut').click()
 mark('recent-orders','最近订单单独打开，费用记录不会拉长收藏列表。'); hold(4);sheet.locator('.sheet-close').click()
 mark('profile','口味偏好集中管理，下一次选择继续沿用。'); drag_nav('profile'); capture('profile'); hold(4)
 drag_nav('home'); page.locator('.phone-back').click(); expect(page.locator('.ios-page-home')).to_be_visible()
 page.locator('.ios-home-history').click(); capture('history'); hold(4); page.locator('.wanso-settings-back').click()
 mark('end','下次选餐，从收藏和记录继续。'); hold(2)
 assert not errors,errors
 duration=time.monotonic()-start
 timeline={'language':'zh','duration':round(duration,3),'marks':marks,'reply_kinds':['discover','compare','decision'],'pricing':price_proof,'errors':errors,'size':[804,1748],'verified':'Actual 402×874 logical viewport, DPR2 with compositor scale2; fixed 12:15 Asia/Ho_Chi_Minh UI clock.'}
 (WORK/('recording.json' if record else 'preflight.json')).write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
 if not record: print('PREFLIGHT PASS: Chinese UI, 5 distinct discovery photos, one same-store platform comparison, one decision, price arithmetic, coupons, menu, real collection creation/counts, sharing fees, nav and returns.',flush=True)
 context.close(); browser.close()
 if record:
  raw=Path(video.path()); ffmpeg=os.getenv('FFMPEG')
  if not ffmpeg:
   sys.path.insert(0,str(ROOT/'work'/'media-tools')); import imageio_ffmpeg; ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
  info=subprocess.run([ffmpeg,'-i',str(raw)],capture_output=True,text=True).stderr
  h,m,s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',info).groups(); raw_duration=int(h)*3600+int(m)*60+float(s)
  # Match to the recorded ending, avoiding Chromium's variable initial-frame delay.
  trim_start=max(0,raw_duration-duration)
  subprocess.run([ffmpeg,'-y','-i',str(raw),'-ss',str(trim_start),'-t',str(duration),'-an','-vf','fps=30','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(ASSETS/'selection-film.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  frame=WORK/'encoded-first.png'; subprocess.run([ffmpeg,'-y','-i',str(ASSETS/'selection-film.mp4'),'-frames:v','1',str(frame)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  check=Image.open(frame).convert('RGB'); assert check.size==(804,1748),check.size
  assert len(set(check.crop((0,1568,804,1748)).getdata()))>30,'Cropped video footer'
  assert len(set(check.crop((650,500,804,1500)).getdata()))>30,'Gray canvas to right of phone'
  timeline.update(raw=str(raw),trim_start=round(trim_start,3),raw_duration=raw_duration,bytes=(ASSETS/'selection-film.mp4').stat().st_size)
  (WORK/'recording.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
  Image.open(SHOTS/'home.webp').save(ASSETS/'selection-film-poster.webp','WEBP',quality=88)
  def stamp(value):
   ms=round(value*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
  cues=[]
  for i,mark_item in enumerate(marks):
   end=marks[i+1]['seconds'] if i+1<len(marks) else duration
   cues.append(stamp(mark_item['seconds'])+' --> '+stamp(end)+'\n'+mark_item['caption'])
  (ASSETS/'selection-film.zh.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(cues)+'\n')
  print('VIDEO',duration,timeline['bytes'],flush=True)
