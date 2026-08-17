from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"

def inlined_html():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    css = (DIST / "assets" / "app.css").read_text(encoding="utf-8")
    data = (DIST / "assets" / "data.bundle.js").read_text(encoding="utf-8")
    domain = (DIST / "assets" / "backend.bundle.js").read_text(encoding="utf-8")
    app = (DIST / "assets" / "frontend.bundle.js").read_text(encoding="utf-8")
    storage = r'''<script>
    (() => {
      const memory = new Map();
      Object.defineProperty(window, 'localStorage', { configurable: true, value: {
        getItem: key => memory.has(String(key)) ? memory.get(String(key)) : null,
        setItem: (key, value) => memory.set(String(key), String(value)),
        removeItem: key => memory.delete(String(key)), clear: () => memory.clear(),
        key: index => Array.from(memory.keys())[index] ?? null,
        get length() { return memory.size; }
      }});
    })();
    </script>'''
    return (html.replace('</head>', storage + '</head>')
      .replace('<link href="assets/app.css" rel="stylesheet"/>', f'<style>{css}</style>')
      .replace('<script src="assets/data.bundle.js"></script>', f'<script>{data}</script>')
      .replace('<script src="assets/backend.bundle.js"></script>', f'<script>{domain}</script>')
      .replace('<script src="assets/frontend.bundle.js"></script>', f'<script>{app}</script>'))

def main():
    html = inlined_html()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type == 'error' else None)
        page.set_content(html, wait_until='load')

        styles = page.evaluate('''() => ({
          bodyBg: getComputedStyle(document.body).backgroundColor,
          brandDisplay: getComputedStyle(document.querySelector('.ekvp-brand-row')).display,
          logoDisplay: getComputedStyle(document.querySelector('.ekvp-logo-lockup')).display,
          titleWeight: getComputedStyle(document.querySelector('.section-title')).fontWeight,
          heroRadius: getComputedStyle(document.querySelector('.ekvp-hero')).borderRadius,
          primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
        })''')
        assert styles['bodyBg'] == 'rgb(244, 247, 248)', styles
        assert styles['brandDisplay'] == 'flex', styles
        assert styles['logoDisplay'] == 'inline-flex', styles
        assert styles['titleWeight'] == '900', styles
        assert styles['heroRadius'] == '14px', styles
        assert styles['primary'] == '#276c73', styles

        for prefix, amount in [('fv', '60000'), ('fi', '30000')]:
            page.select_option(f'#{prefix}-source-type', 'direct')
            page.fill(f'#{prefix}-direct-income', amount)
            page.select_option(f'#{prefix}-direct-kind', 'full')
            page.select_option(f'#{prefix}-direct-index-enabled', 'Nein')
        assert page.locator('#ekv-grade').inner_text() == '50%'
        assert page.locator('#phase4-grade-value').inner_text() == '50%'

        page.locator('#workspace-manager > summary').click()
        assert page.locator('#workspace-manager').get_attribute('open') is not None
        dims = page.evaluate('({scroll: document.documentElement.scrollWidth, inner: window.innerWidth})')
        assert dims['scroll'] <= dims['inner'], dims

        page.emulate_media(media='print')
        assert page.locator('#phase4-workflow').evaluate("el => getComputedStyle(el).display") == 'none'
        assert not errors, errors
        page.close()

        mobile = browser.new_page(viewport={'width': 390, 'height': 844})
        mobile.set_content(html, wait_until='load')
        dims = mobile.evaluate('({scroll: document.documentElement.scrollWidth, inner: window.innerWidth})')
        assert dims['scroll'] <= dims['inner'], dims
        assert mobile.locator('.ekvp-logo-lockup').evaluate("el => getComputedStyle(el).display") == 'inline-flex'
        mobile.close()
        browser.close()
    print('{"status":"ok","phase_b_alpha6_design_system":"tokens, shell, desktop, mobile, print"}')

if __name__ == '__main__':
    main()
