"""Vietnamese settings remain readable and preserve the native state/action rules."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
SCREENSHOTS = Path(os.getenv('WANSO_SETTINGS_SHOTS', '/tmp/wanso-vietnamese-settings'))
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
checks = []

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for width, height in [(1440, 900), (390, 844)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + 'prototypes/wanso/?embed=1#profile', wait_until='networkidle')
        sheet = page.locator('.wanso-sheet')

        def current(route):
            section = page.locator(f'[data-settings="{route}"]')
            expect(section).to_be_visible()
            assert not re.search(r'[\u4e00-\u9fff]', section.inner_text()), route
            assert section.evaluate('(n) => n.scrollWidth <= n.clientWidth + 1'), route
            return section

        def row(label):
            return page.locator('.wanso-settings-row').filter(has=page.get_by_text(label, exact=True))

        def back():
            page.locator('.wanso-settings-back').click()

        # Settings are reached through the visible profile navigation, not only deep links.
        page.get_by_role('button', name='Cài đặt ứng dụng', exact=True).click()
        current('settings')
        rung = page.get_by_role('switch', name='Phản hồi rung', exact=True)
        expect(rung).to_have_attribute('aria-checked', 'true')
        rung.click()
        expect(page.get_by_role('switch', name='Phản hồi rung', exact=True)).to_have_attribute('aria-checked', 'false')
        assert page.evaluate('wansoControls.viewState().haptics') is False
        page.screenshot(path=str(SCREENSHOTS / f'{width}-settings.png'))

        # Theme keeps internal keys, applies from its sheet, and returns to settings.
        row('Giao diện').click()
        current('theme')
        row('Oải hương').click()
        expect(sheet).to_be_visible()
        expect(sheet).to_contain_text('Giao diện Oải hương')
        sheet.get_by_role('button', name='Áp dụng giao diện', exact=True).click()
        current('settings')
        expect(row('Giao diện')).to_contain_text('Oải hương')
        assert page.evaluate('wansoControls.viewState().theme') == '薰衣草'
        row('Ngôn ngữ').click()
        current('language')
        row('Tiếng Việt').click()
        expect(sheet).to_contain_text('Ngôn ngữ ứng dụng')
        sheet.get_by_role('button', name='Xong', exact=True).click()
        current('settings')
        expect(row('Ngôn ngữ')).to_contain_text('Tiếng Việt')
        row('Chính sách quyền riêng tư').click()
        expect(sheet).to_contain_text('Chính sách riêng tư Wanso')
        sheet.get_by_role('button', name='Xong', exact=True).click()
        expect(sheet).not_to_be_visible()
        current('settings')
        checks.append(f'{width}: profile/settings navigation, switch state, theme/language sheets and return refresh')
        back()
        expect(page.locator('.ios-page-profile')).to_be_visible()

        page.get_by_role('button', name='Tùy chọn đặt món', exact=True).click()
        current('preferences')
        row('Dưới 50.000đ').click()
        expect(row('Dưới 50.000đ')).to_have_attribute('aria-pressed', 'true')
        row('Tiết kiệm').click()
        expect(row('Tiết kiệm')).to_have_attribute('aria-pressed', 'true')
        assert page.evaluate('wansoControls.viewState().budget') == '5万以下'
        assert page.evaluate('wansoControls.viewState().mode') == '价格优先'
        membership = page.get_by_role('switch').first
        expect(membership).to_have_attribute('aria-checked', 'false')
        membership.click()
        expect(page.get_by_role('switch').first).to_have_attribute('aria-checked', 'true')
        assert page.evaluate('wansoControls.viewState().grab') is True
        page.screenshot(path=str(SCREENSHOTS / f'{width}-preferences.png'))
        back()
        expect(page.locator('.ios-profile-settings')).to_contain_text('Dưới 50.000đ · Tiết kiệm')
        checks.append(f'{width}: membership, budget and ranking selections retain internal values and update profile')

        page.get_by_role('button', name='Thông báo', exact=True).click()
        current('notifications')
        master = page.get_by_role('switch', name='Nhận thông báo', exact=True)
        master.click()
        expect(page.get_by_role('switch', name='Nhận thông báo', exact=True)).to_have_attribute('aria-checked', 'false')
        child_labels = ['Ưu đãi và mã giảm giá', 'Món giảm giá', 'Quán mới gần bạn', 'Cập nhật giao hàng', 'Tổng hợp AI hằng tuần']
        for label in child_labels:
            expect(page.get_by_role('switch', name=label, exact=True)).to_be_disabled()
        page.get_by_role('switch', name='Nhận thông báo', exact=True).click()
        for label in child_labels:
            expect(page.get_by_role('switch', name=label, exact=True)).to_be_enabled()
        expect(row('Bắt đầu')).to_be_disabled()
        expect(row('Kết thúc')).to_be_disabled()
        page.get_by_role('switch', name='Không làm phiền', exact=True).click()
        expect(row('Bắt đầu')).to_be_enabled()
        row('Bắt đầu').click()
        sheet.get_by_label('Bắt đầu không làm phiền', exact=True).fill('21:30')
        sheet.get_by_role('button', name='Lưu', exact=True).click()
        expect(sheet).not_to_be_visible()
        expect(row('Bắt đầu')).to_contain_text('21:30')
        page.screenshot(path=str(SCREENSHOTS / f'{width}-notifications.png'))
        checks.append(f'{width}: master notifications disables child options; quiet hours gate and save time correctly')
        back()

        page.get_by_role('button', name='Tài khoản và bảo mật', exact=True).click()
        current('account')
        row('Số điện thoại').click()
        sheet.get_by_label('Số điện thoại', exact=True).fill('0901234567')
        sheet.get_by_role('button', name='Lưu', exact=True).click()
        expect(sheet).not_to_be_visible()
        expect(row('Số điện thoại')).to_contain_text('0901234567')
        row('Giới tính').click()
        sheet.get_by_role('button', name='Không muốn chia sẻ', exact=True).click()
        expect(sheet).not_to_be_visible()
        expect(row('Giới tính')).to_contain_text('Không muốn chia sẻ')
        page.screenshot(path=str(SCREENSHOTS / f'{width}-account.png'))
        back()
        expect(page.locator('.ios-page-profile')).to_be_visible()
        checks.append(f'{width}: account editing and sheet closure refresh saved values without losing navigation')

        page.locator('.phone-nav').get_by_role('button', name='Trang chủ', exact=True).click()
        page.get_by_role('button', name='Lịch sử trò chuyện', exact=True).click()
        current('history')
        row('Tìm cuộc trò chuyện').click()
        sheet.get_by_label('Tìm cuộc trò chuyện', exact=True).fill('pho')
        sheet.get_by_role('button', name='Tìm kiếm', exact=True).click()
        expect(sheet).to_contain_text('Cuộc trò chuyện chọn món')
        sheet.get_by_role('button', name='Quay lại', exact=True).click()
        expect(sheet).not_to_be_visible()
        row('Xóa cuộc trò chuyện').click()
        expect(sheet).to_contain_text('Không thể khôi phục')
        sheet.get_by_role('button', name='Hủy', exact=True).click()
        expect(sheet).not_to_be_visible()
        assert page.evaluate('wansoControls.viewState().history') is True
        row('Xóa cuộc trò chuyện').click()
        sheet.get_by_role('button', name='Xác nhận xóa', exact=True).click()
        expect(sheet).not_to_be_visible()
        expect(page.locator('.wanso-settings-empty')).to_contain_text('Chưa có cuộc trò chuyện')
        page.get_by_role('button', name='Tìm món ăn', exact=True).click()
        expect(page.locator('.ios-page-home')).to_be_visible()
        checks.append(f'{width}: accent-insensitive history search, cancel-before-delete and empty-state recovery')
        assert not errors, errors
        context.close()
    browser.close()
print(json.dumps({'passed': len(checks), 'checks': checks, 'screenshots': str(SCREENSHOTS)}, ensure_ascii=False, indent=2))
