"""Drag the glass tab selector with native touch and mouse; preserve reading state."""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
OUT = Path(__file__).resolve().parents[1] / 'work' / 'swipe-qa'
OUT.mkdir(parents=True, exist_ok=True)
checks = []

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for width, touch in ([] if "--expanded-only" in sys.argv else [(320, True), (390, True), (1440, False)]):
        context = browser.new_context(viewport={'width': width, 'height': 900},
                                      has_touch=touch, is_mobile=touch)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + 'prototypes/wanso/?embed=1&device=1#home', wait_until='networkidle')
        nav = page.locator('.phone-nav')
        cdp = context.new_cdp_session(page)
        position = None

        def center(tab):
            rect = nav.locator('[data-target=' + tab + ']').bounding_box()
            return rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2

        def active(tab):
            expect(nav.locator('[aria-current=page]')).to_have_attribute('data-target', tab)

        def down(point):
            global position
            position = point
            if touch:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': point[0], 'y': point[1]}]})
            else:
                page.mouse.move(*point)
                page.mouse.down()

        def move(point):
            global position
            start = position
            for step in range(1, 13):
                x = start[0] + (point[0] - start[0]) * step / 12
                y = start[1] + (point[1] - start[1]) * step / 12
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
                else:
                    page.mouse.move(x, y)
                page.wait_for_timeout(12)
            position = point

        def up():
            if touch:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                page.mouse.up()
            page.wait_for_timeout(300)

        def drag_to(source, target):
            down(center(source))
            move(center(target))
            active(source)
            assert nav.evaluate('(e)=>e.classList.contains("is-dragging")')
            expected = ['home', 'explore', 'saved', 'profile'].index(target)
            assert abs(nav.evaluate('(e)=>Number(e.style.getPropertyValue("--nav-position"))') - expected) < .1
            up()
            active(target)
            expect(page.locator('.ios-page-' + target)).to_be_visible()

        # The selector follows continuously while the underlying page waits for release.
        down(center('home'))
        h, e = center('home'), center('explore')
        move(((h[0] + e[0]) / 2, h[1]))
        active('home')
        offset = nav.evaluate('(e)=>Number(e.style.getPropertyValue("--nav-position"))')
        assert .35 < offset < .65, offset
        page.locator('.screen').screenshot(path=str(OUT / f'{width}-drag-midpoint.png'))
        move(e)
        active('home')
        up()
        active('explore')
        checks.append(f'{width}: selector tracks the finger continuously; commits only on release')

        drag_to('explore', 'saved')
        drag_to('saved', 'profile')
        drag_to('profile', 'home')
        checks.append(f'{width}: all four tabs switch once without synthetic-click bounce')

        down(center('home'))
        move(center('saved'))
        move(center('home'))
        up()
        active('home')
        assert not nav.evaluate('(e)=>e.classList.contains("is-dragging")')
        checks.append(f'{width}: dragging away and back keeps the current page')

        # A vertical move or leaving the bar is a cancellation, not a different tab.
        down(center('home'))
        x, y = center('home')
        move((x, y - 120))
        up()
        active('home')
        down(center('home'))
        x, y = center('saved')
        move((x, y))
        move((x, y - 120))
        up()
        active('home')
        assert abs(nav.evaluate('(e)=>Number(e.style.getPropertyValue("--nav-position"))')) < .01
        checks.append(f'{width}: vertical movement and release outside the bar cancel selection')

        if touch:
            down(center('home'))
            move(center('profile'))
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
            page.wait_for_timeout(300)
            active('home')
            assert not nav.evaluate('(e)=>e.classList.contains("is-dragging")')
            assert abs(nav.evaluate('(e)=>Number(e.style.getPropertyValue("--nav-position"))')) < .01
            checks.append(f'{width}: system touch cancellation restores the selected capsule')

        # The same navigation path preserves both vertical and horizontal reading positions.
        home = page.locator('.ios-page-home')
        rail = page.locator('.ios-home-carousel')
        home.evaluate('(e)=>e.scrollTop=220')
        rail.evaluate('(e)=>e.scrollLeft=400')
        page.wait_for_timeout(250)
        old = [home.evaluate('(e)=>e.scrollTop'), rail.evaluate('(e)=>e.scrollLeft')]
        drag_to('home', 'explore')
        drag_to('explore', 'home')
        now = [home.evaluate('(e)=>e.scrollTop'), rail.evaluate('(e)=>e.scrollLeft')]
        assert all(abs(a-b) < 3 for a, b in zip(old, now)), (old, now)
        checks.append(f'{width}: swipe away and back restores page scroll and restaurant rail')

        # Ordinary content swipes keep their own scroll behavior and do not grab the tabs.
        home.evaluate('(e)=>e.scrollTop=0')
        rail.evaluate('(e)=>e.scrollLeft=0')
        rect = rail.bounding_box()
        down((rect['x'] + rect['width'] * .75, rect['y'] + 60))
        move((rect['x'] + rect['width'] * .2, rect['y'] + 60))
        up()
        active('home')
        assert rail.evaluate('(e)=>e.scrollLeft') > 60
        assert page.locator('.native-store-view').count() == 0
        checks.append(f'{width}: carousel swipe scrolls restaurants without changing tabs or opening a store')

        # Native taps remain usable, including after a cancelled drag.
        if touch:
            page.touchscreen.tap(*center('saved'))
        else:
            nav.locator('[data-target=saved]').click()
        active('saved')
        if touch:
            page.touchscreen.tap(*center('home'))
        else:
            nav.locator('[data-target=home]').click()
        active('home')
        checks.append(f'{width}: tap fallback still works after drag and cancellation')

        if not touch:
            nav.locator('[data-target=home]').focus()
            for key, target in [('ArrowRight', 'explore'), ('ArrowRight', 'saved'),
                                ('ArrowLeft', 'explore'), ('End', 'profile'),
                                ('ArrowRight', 'home'), ('Home', 'home')]:
                page.keyboard.press(key)
                active(target)
                expect(nav.locator('[data-target=' + target + ']')).to_be_focused()
                assert page.url.endswith('#' + target), page.url
            checks.append('desktop: arrow/Home/End keys stay in tab navigation and preserve keyboard focus')
            page.emulate_media(reduced_motion='reduce')
            assert nav.evaluate('(e)=>getComputedStyle(e,"::before").transitionDuration') == '0s'
            checks.append('desktop: reduced-motion preference disables the capsule transition')
        page.locator('.screen').screenshot(path=str(OUT / f'{width}-finished.png'))
        assert not errors, errors
        context.close()
    # The full phone must fit its portfolio dialog without scrolling the iframe document.
    for width in [1440, 390]:
        context = browser.new_context(viewport={'width': width, 'height': 900 if width == 1440 else 844},
                                      has_touch=width == 390, is_mobile=width == 390)
        page = context.new_page()
        page.goto(BASE + '#work', wait_until='domcontentloaded')
        opener = page.locator('.phone-project [data-phone-preview]')
        opener.click()
        dialog = page.locator('.phone-modal')
        expect(dialog).to_be_visible()
        holder = dialog.locator('iframe')
        frame = page.frame_locator('.phone-modal iframe')
        expect(frame.locator('.phone-nav')).to_be_visible(timeout=30000)
        page.wait_for_timeout(300)
        view = holder.element_handle().content_frame()
        bounds = holder.bounding_box()
        for selector in ['.screen', '.phone-nav']:
            box = frame.locator(selector).bounding_box()
            assert box['x'] >= bounds['x'] - 1 and box['y'] >= bounds['y'] - 1, (width, selector, box, bounds)
            assert box['x'] + box['width'] <= bounds['x'] + bounds['width'] + 1, (width, selector)
            assert box['y'] + box['height'] <= bounds['y'] + bounds['height'] + 1, (width, selector)
        assert view.evaluate('scrollY') == 0
        assert view.evaluate('document.documentElement.scrollHeight <= innerHeight + 1')
        assert frame.locator('.viewport').evaluate('(e)=>e.scrollHeight<=e.clientHeight+1')
        expect(frame.locator('.viewer-footer')).not_to_be_visible()
        before = page.evaluate('scrollY')
        a = frame.locator('.phone-nav [data-target=home]').bounding_box()
        b = frame.locator('.phone-nav [data-target=explore]').bounding_box()
        start = (a['x'] + a['width']/2, a['y'] + a['height']/2)
        end = (b['x'] + b['width']/2, b['y'] + b['height']/2)
        cdp = context.new_cdp_session(page)
        if width == 390:
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':start[0],'y':start[1]}]})
        else:
            page.mouse.move(*start)
            page.mouse.down()
        for step in range(1, 15):
            point = (start[0] + (end[0]-start[0])*step/14, start[1] + (end[1]-start[1])*step/14)
            if width == 390:
                cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':point[0],'y':point[1]}]})
            else:
                page.mouse.move(*point)
            page.wait_for_timeout(15)
            assert abs(page.evaluate('scrollY') - before) < 2
        expect(frame.locator('.phone-nav [aria-current=page]')).to_have_attribute('data-target', 'home')
        if width == 390:
            cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        else:
            page.mouse.up()
        expect(frame.locator('.phone-nav [aria-current=page]')).to_have_attribute('data-target', 'explore')
        assert abs(page.evaluate('scrollY') - before) < 2
        assert view.evaluate('scrollY') == 0
        frame.locator('.screen').screenshot(path=str(OUT / f'{width}-expanded-fit.png'))
        dialog.locator('.close').click()
        expect(dialog).not_to_be_visible()
        expect(opener).to_be_focused()
        checks.append(f'{width}: expanded phone fits without iframe scroll; drag keeps parent fixed and close restores focus')
        context.close()
    browser.close()
print(json.dumps({'passed': len(checks), 'checks': checks}, ensure_ascii=False, indent=2))
