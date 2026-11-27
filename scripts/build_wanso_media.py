"""Capture the current Wanso web UI, then record the same verified journey.

Run with the portfolio served on port 8765:
  python3 scripts/build_wanso_media.py
  python3 scripts/build_wanso_media.py --record
Requires Playwright Chromium, Pillow, and an ffmpeg binary (FFMPEG or imageio_ffmpeg).
All pointer, search, and navigation actions use the live product. The clock is fixed
at Vietnamese lunchtime so the recording is repeatable; no response data is patched.
"""
import argparse, io, json, os, subprocess, sys, time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'work'/'wanso-current-media'; WORK.mkdir(exist_ok=True)
ASSETS=ROOT/'assets'/'wanso'; SHOTS=ASSETS/'current'; SHOTS.mkdir(exist_ok=True)
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')
PROMPT='Muốn ăn phở gà thanh đạm, không rau mùi, tối đa 80.000đ gồm giao hàng. Gợi ý 5 quán.'
CLOCK="""(() => { const RealDate=Date, instant=RealDate.parse('2026-11-28T05:15:00Z'); class FixedDate extends RealDate {constructor(...args){super(...(args.length?args:[instant]));} static now(){return instant;}} window.Date=FixedDate; })();"""
parser=argparse.ArgumentParser();parser.add_argument('--record',action='store_true');args=parser.parse_args()
record=args.record
if record and not (WORK/'preflight.json').exists(): raise SystemExit('Run the preflight first.')
marks=[]
with sync_playwright() as p:
 # Bundled headless Chromium records the complete viewport; Chrome channel can crop it.
 browser=p.chromium.launch(headless=True)
 options=dict(viewport={'width':402,'height':874},device_scale_factor=1 if record else 2,locale='vi-VN',timezone_id='Asia/Ho_Chi_Minh',has_touch=True,is_mobile=True)
 if record: options.update(record_video_dir=str(WORK/'raw'),record_video_size={'width':402,'height':874})
 context=browser.new_context(**options);context.add_init_script(CLOCK)
 page=context.new_page();video=page.video if record else None
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 recording_origin=time.monotonic()
 page.goto(BASE+'/prototypes/wanso/?embed=1&device=1#home',wait_until='networkidle')
 expect(page.locator('.phone-nav')).to_be_visible();page.wait_for_timeout(350)
 # Warm the real external map through its UI before recording, not by faking tiles.
 def map_ready():
  page.wait_for_function('''() => {
   const tiles=[...document.querySelectorAll('.location-map .leaflet-tile')];
   return tiles.length>0 && tiles.every(t=>t.complete && t.naturalWidth>0);
  }''',timeout=45000)
 page.locator('.ios-home-location').click();map_ready()
 page.locator('#location-search-input').fill('Hoàn Kiếm');page.locator('.location-search-submit').click()
 page.locator('.location-result').first.click();map_ready();page.locator('.sheet-close').click()
 start=time.monotonic();trim_start=start-recording_origin
 def mark(name,caption):
  item={'name':name,'seconds':round(time.monotonic()-start,3),'caption':caption};marks.append(item);print(json.dumps(item,ensure_ascii=False),flush=True)
 def hold(seconds):page.wait_for_timeout(int((seconds if record else .08)*1000))
 def capture(name):
  if not record:
   Image.open(io.BytesIO(page.locator('.screen').screenshot())).convert('RGB').save(SHOTS/(name+'.webp'),'WEBP',quality=88,method=6)
 def scroll_to(scroller,target,offset=12):
  y=target.evaluate('(el)=>el.getBoundingClientRect().top')-scroller.evaluate('(el)=>el.getBoundingClientRect().top')+scroller.evaluate('(el)=>el.scrollTop')-offset
  scroller.evaluate('(el,y)=>el.scrollTo({top:y,behavior:"smooth"})',y);page.wait_for_timeout(650)
 def drag_nav(target):
  nav=page.locator('.phone-nav');current=nav.locator('[aria-current=page]').bounding_box();end=nav.locator('[data-target='+target+']').bounding_box()
  x=current['x']+current['width']/2;y=current['y']+current['height']/2
  page.mouse.move(x,y);page.mouse.down()
  for i in range(1,25):
   page.mouse.move(x+(end['x']+end['width']/2-x)*i/24,y);page.wait_for_timeout(18)
  page.mouse.up();page.wait_for_timeout(400)
  expect(nav.locator('[data-target='+target+']')).to_have_attribute('aria-current','page')
 def rail_pan(rail,dx):
  rail.evaluate('(el,dx)=>el.scrollBy({left:dx,behavior:"smooth"})',dx);page.wait_for_timeout(700)
 # This is both the preflight and the film; no separate staged mock layout.
 mark('home','用越南语描述这一餐的要求；位置与两平台比较都在首页。');capture('home');hold(2)
 mark('navigation','拖动玻璃导航，切换探索与首页。');drag_nav('explore');capture('explore');hold(2);drag_nav('home');hold(.5)
 mark('location','在地图上选择用餐位置，确认附近的选餐范围。')
 page.locator('.ios-home-location').click();map_ready()
 page.locator('#location-search-input').fill('Hoàn Kiếm');page.locator('.location-search-submit').click()
 page.locator('.location-result').first.click();map_ready();hold(1.5);capture('location');page.locator('.location-confirm').click()
 expect(page.locator('.wanso-sheet')).not_to_be_visible()
 home=page.locator('.ios-page-home');rail=page.locator('.rich-home-rail')
 assert rail.locator('.rich-home-card').count()==5
 for card in rail.locator('.rich-home-card').all():
  assert card.locator('.rich-home-platforms [data-platform]').count()==2
 mark('featured','精选展示五家餐厅，每家都可以对比 GrabFood 与 ShopeeFood。')
 scroll_to(home,rail,28);hold(1);rail_pan(rail,240);hold(1);rail_pan(rail,240);hold(1)
 home.evaluate('(el)=>el.scrollTo({top:0,behavior:"smooth"})');page.wait_for_timeout(650)
 mark('search','清淡鸡肉河粉、不放香菜，含配送不超过 80,000 越南盾。')
 page.locator('.native-home-query').fill(PROMPT);hold(1);page.locator('.ios-home-search-submit').click()
 expect(page.locator('.rich-processing')).to_be_visible()
 mark('processing','依次理解口味、筛选菜品、核算费用，再给出推荐。')
 expect(page.locator('.ios-chat-reply')).to_have_count(3,timeout=15000)
 assert page.locator('.ios-user-message').count()==3
 replies=page.locator('.ios-chat-reply');chat=page.locator('.ios-chat')
 for reply in replies.all():
  assert reply.locator('.rich-recommendation').count()==5
  assert len(reply.locator('.ios-assistant-message').inner_text())>150
 assert page.locator('.phone-nav [aria-current=page]').get_attribute('data-target')=='home'
 chat.evaluate('(el)=>el.scrollTop=0');page.wait_for_timeout(150)
 mark('recommend','先说明为什么适合这次需求，再推荐具体菜品。');capture('recommend');hold(4)
 first=replies.first;answer_sections=first.locator('.rich-answer-section')
 scroll_to(chat,answer_sections.nth(1));hold(3)
 mark('candidates','左右浏览五家候选，推荐理由与含配送总价一起看。')
 cards=first.locator('.rich-chat-rail');scroll_to(chat,cards,12);capture('candidates');hold(2);rail_pan(cards,255);hold(2)
 mark('followup','第二轮继续核对：算上配送和优惠，哪个平台更实惠？')
 scroll_to(chat,page.locator('.ios-user-message').nth(1));capture('followup');hold(4)
 mark('confirm','第三轮保留口味与预算，收敛到一家更适合的店。')
 scroll_to(chat,page.locator('.ios-user-message').nth(2));capture('confirm');hold(4)
 third=replies.nth(2);scroll_to(chat,third.locator('.rich-chat-rail'),10)
 chosen=third.locator('.ios-restaurant-main').first;chosen.click()
 view=page.locator('.native-store-view');expect(view).to_be_visible();store_scroll=view.locator('.native-store-scroll')
 assert view.locator('.native-store-open').inner_text()=='Đang mở cửa'
 mark('store','进入同一个店铺详情，查看菜品特点、位置和营业信息。');capture('store');hold(4)
 mark('price','解释价差来自哪里，再查看同一道菜的两平台总费用。')
 view.locator('.native-store-price-link').click();page.wait_for_timeout(650);capture('price');hold(5)
 mark('compare','逐项核对餐费、店铺优惠、优惠券与配送减免。')
 scroll_to(store_scroll,view.locator('.native-store-platforms'),78);capture('compare');hold(5)
 mark('menu','继续看菜单、份量和菜品说明，核对是不是自己要点的那一道。')
 scroll_to(store_scroll,view.locator('.native-store-menu'),78);capture('menu');hold(4)
 mark('reviews','店铺下方补充口味与搭配建议，帮助继续选择。')
 scroll_to(store_scroll,view.locator('.native-store-reviews'),78);capture('reviews');hold(3)
 view.locator('.native-store-back').click();expect(view).to_have_count(0)
 mark('saved','拖动进入收藏；收藏餐厅与最近订单分开整理。')
 drag_nav('saved');capture('saved');hold(4)
 mark('profile','口味偏好与设置集中管理，下次选餐可以继续使用。')
 drag_nav('profile');capture('profile');hold(3)
 drag_nav('home');page.locator('.phone-back').click();expect(page.locator('.ios-page-home')).to_be_visible()
 page.locator('.ios-home-history').click();capture('history');hold(1)
 page.locator('.wanso-settings-back').click()
 mark('end','从用餐要求到最终选择，保留对话与每一步的判断。');hold(2)
 assert not errors,errors
 duration=time.monotonic()-start
 timeline={'duration':round(duration,3),'trim_start':round(trim_start,3),'marks':marks,'errors':errors,'size':[804,1748],'verified':'Live browser workflow; UI clock fixed at 12:15 Asia/Ho_Chi_Minh.'}
 (WORK/('recording.json' if record else 'preflight.json')).write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
 if not record: print('PREFLIGHT PASS: 5 dual-platform home cards, 3 rounds × 5 recommendations, price/menu/returns/nav.',flush=True)
 context.close();browser.close()
 if record:
  raw=Path(video.path())
  ffmpeg=os.getenv('FFMPEG')
  if not ffmpeg:
   sys.path.insert(0,str(ROOT/'work'/'media-tools'))
   import imageio_ffmpeg
   ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
  subprocess.run([ffmpeg,'-y','-i',str(raw),'-ss',str(trim_start),'-t',str(duration),'-an','-vf','fps=30','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(ASSETS/'selection-film.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  # Catch browser screencast cropping before replacing the published poster/captions.
  first_frame=WORK/'encoded-first.png'
  subprocess.run([ffmpeg,'-y','-i',str(ASSETS/'selection-film.mp4'),'-frames:v','1',str(first_frame)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  check=Image.open(first_frame).convert('RGB')
  assert check.size==(402,874),check.size
  assert len(set(check.crop((0,784,402,874)).getdata()))>30,'Video footer was cropped to a flat recording canvas'
  Image.open(SHOTS/'home.webp').save(ASSETS/'selection-film-poster.webp','WEBP',quality=88)
  def stamp(value):
   ms=round(value*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
  cues=[]
  for i,m in enumerate(marks):
   end=marks[i+1]['seconds'] if i+1<len(marks) else duration
   cues.append(stamp(m['seconds'])+' --> '+stamp(end)+'\n'+m['caption'])
  (ASSETS/'selection-film.zh.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(cues)+'\n')
  print('VIDEO',duration,(ASSETS/'selection-film.mp4').stat().st_size,flush=True)
