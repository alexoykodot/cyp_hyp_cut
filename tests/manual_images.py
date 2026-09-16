import functools
import http.server
import pathlib
import tempfile
import threading

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


root = pathlib.Path(__file__).resolve().parents[1]
handler = functools.partial(QuietHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
screenshots = pathlib.Path(tempfile.mkdtemp(prefix='manual-images-'))
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
        page.evaluate('''() => {
            for (const [system, config] of Object.entries(SYSTEMS)) {
                for (const category of config.categories) {
                    if (MANUAL_SECTIONS[system][category.id].length !== category.topics.length)
                        throw new Error('Topic mapping mismatch: ' + system + '/' + category.id);
                }
            }
        }''')
        for width in [1280, 390]:
            page.set_viewport_size({'width': width, 'height': 900})
            for system, category, topic, expected in [
                ('hypcut', 'quickstart', 1, 1),
                ('cypcut', 'graphicedit', 3, 3),
                ('hypcut', 'production', 14, 1),
            ]:
                page.evaluate('''([system, category, index]) => {
                    setSystem(system);
                    document.getElementById('chatWindow').replaceChildren();
                    askPreset(SYSTEMS[system].categories.find(c => c.id === category).topics[index].question);
                }''', [system, category, topic])
                page.wait_for_function('(count) => document.querySelectorAll(\'.manual-gallery img\').length === count', arg=expected)
                page.locator('.manual-gallery').scroll_into_view_if_needed()
                page.locator('.manual-gallery img').evaluate_all('(images) => images.forEach(img => img.loading = \'eager\')')
                page.wait_for_function('() => [...document.querySelectorAll(\'.manual-gallery img\')].every(img => img.complete && img.naturalWidth > 0)')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                with page.expect_popup() as popup_info:
                    page.locator('.manual-gallery a').first.click()
                popup = popup_info.value
                popup.wait_for_load_state()
                assert popup.url.endswith('.png')
                popup.close()
                page.screenshot(path=str(screenshots / f'{system}-{category}-{width}.png'), full_page=True)
        page.evaluate('''() => {
            setSystem('cypcut');
            document.getElementById('chatWindow').replaceChildren();
            askPreset('measure');
            setSystem('hypcut');
        }''')
        page.wait_for_function('() => document.querySelectorAll(\'.manual-gallery img\').length === 3')
        assert page.locator('.manual-gallery img').first.get_attribute('src').find('CypCut-manual-el') >= 0
        assert not errors, errors
        browser.close()
        print('PASS: topic mappings, desktop/mobile rendering, image loading, enlargement, deduplication, system switching.')
        print('Screenshots:', screenshots)
finally:
    server.shutdown()
    server.server_close()
