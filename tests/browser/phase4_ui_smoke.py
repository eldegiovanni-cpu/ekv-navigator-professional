from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"

def inlined_html():
    html=(DIST/'index.html').read_text(encoding='utf-8')
    css=(DIST/'assets'/'app.css').read_text(encoding='utf-8')
    data=(DIST/'assets'/'data.bundle.js').read_text(encoding='utf-8')
    domain=(DIST/'assets'/'backend.bundle.js').read_text(encoding='utf-8')
    app=(DIST/'assets'/'frontend.bundle.js').read_text(encoding='utf-8')
    return (html
      .replace('<link href="assets/app.css" rel="stylesheet"/>', f'<style>{css}</style>')
      .replace('<script src="assets/data.bundle.js"></script>', f'<script>{data}</script>')
      .replace('<script src="assets/backend.bundle.js"></script>', f'<script>{domain}</script>')
      .replace('<script src="assets/frontend.bundle.js"></script>', f'<script>{app}</script>'))

def set_direct(page, side, amount):
    prefix='fv' if side=='valid' else 'fi'
    page.select_option(f'#{prefix}-source-type','direct')
    page.fill(f'#{prefix}-direct-income',str(amount))
    page.select_option(f'#{prefix}-direct-kind','full')
    page.select_option(f'#{prefix}-direct-index-enabled','Nein')

def main():
    html=inlined_html()
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':900})
        errors=[]
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type=='error' else None)
        page.set_content(html, wait_until='load')
        assert page.locator('#phase4-workflow').count()==1
        assert page.locator('#phase4-step-valid').inner_text()=='Als Erstes bearbeiten'
        set_direct(page,'valid',60000)
        assert page.locator('#phase4-valid-chip').inner_text()=='Vollständig'
        assert page.locator('#phase4-step-invalid').inner_text()=='Als Nächstes bearbeiten'
        set_direct(page,'invalid',30000)
        assert page.locator('#phase4-grade-value').inner_text()=='50%'
        assert page.locator('#phase4-result-chip').inner_text()=='Prüfen'
        page.fill('#ekv-valid-reason','Valideneinkommen begründet')
        page.fill('#ekv-invalid-reason','Invalideneinkommen begründet')
        page.fill('#ekv-employee-name','Testperson')
        page.fill('#ekv-edit-date','2026-08-10')
        page.fill('#ekv-period-from','2026-01-01')
        assert page.locator('#phase4-result-chip').inner_text()=='Bereit'
        assert page.locator('#phase4-result-status').inner_text()=='Berechnung vollständig dokumentiert'
        assert 'is-complete' in (page.locator('#phase4-result-overview').get_attribute('class') or '')
        assert not errors, errors
        page.close()
        for width in (1440,1250,860,390):
            page=browser.new_page(viewport={'width':width,'height':800})
            page.set_content(html, wait_until='load')
            dims=page.evaluate('({scroll:document.documentElement.scrollWidth, inner:window.innerWidth})')
            assert dims['scroll'] <= dims['inner'], (width,dims)
            page.close()
        browser.close()
    print('{"status":"ok","phase4_ui":"workflow, completion, responsive overflow"}')

if __name__=='__main__':
    main()
