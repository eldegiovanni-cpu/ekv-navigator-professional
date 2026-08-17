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
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type == 'error' else None)
        page.set_content(inlined_html(), wait_until='load')

        # Status Komponente aus Data Inspector
        assert page.locator('#data-inspector-integrity-chip').inner_text() == 'Datenbasis geprüft'
        assert 'good' in (page.locator('#data-inspector-integrity-chip').get_attribute('class') or '')

        # Reale Berechnung, Periode und gemeinsame Statuskomponente
        for prefix, amount in [('fv', '60000'), ('fi', '30000')]:
            page.select_option(f'#{prefix}-source-type', 'direct')
            page.fill(f'#{prefix}-direct-income', amount)
            page.select_option(f'#{prefix}-direct-kind', 'full')
            page.select_option(f'#{prefix}-direct-index-enabled', 'Nein')
        page.fill('#ekv-period-from', '2026-01-01')
        page.fill('#ekv-valid-reason', 'VE begründet')
        page.fill('#ekv-invalid-reason', 'IVE begründet')
        page.fill('#ekv-employee-name', 'Alpha Sieben')
        page.fill('#ekv-edit-date', '2026-08-15')
        page.click('#save-period-btn')
        assert page.locator('#saved-periods-list .status-chip.neutral').inner_text() == 'IV Grad 50%'

        # Workspace Feature wird erst durch init gebunden und funktioniert über API Orchestrierung.
        page.locator('#workspace-manager > summary').click()
        page.fill('#workspace-name', 'Alpha 7 Fall')
        page.click('#save-workspace-btn')
        assert page.locator('#workspace-current-cards .phase5-case-card').count() == 1
        assert page.locator('#workspace-current-cards .phase5-case-status').inner_text() == 'Dokumentiert'
        assert page.locator('#ekv-save-chip').inner_text() == 'Gespeichert'

        # Suchlistener ist innerhalb Workspace init registriert.
        page.fill('#workspace-search', 'Alpha 7')
        assert page.locator('#workspace-current-cards .phase5-case-card').count() == 1
        page.fill('#workspace-search', 'nicht vorhanden')
        assert 'Noch keine aktuellen Arbeitsstände' in page.locator('#workspace-current-cards').inner_text()

        assert not errors, errors
        browser.close()
    print('{"status":"ok","phase_b_alpha7":"shared components, feature APIs, workspace init"}')

if __name__ == '__main__':
    main()
