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
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.set_content(inlined_html(), wait_until="load")

        # Reaktiver Einkommensvergleich nach Trennung in Form Adapter, View und Controller.
        for prefix, amount in (("fv", 60000), ("fi", 30000)):
            page.select_option(f"#{prefix}-source-type", "direct")
            page.fill(f"#{prefix}-direct-income", str(amount))
            page.select_option(f"#{prefix}-direct-kind", "full")
            page.select_option(f"#{prefix}-direct-index-enabled", "Nein")
        assert page.locator("#ekv-valid-display").inner_text() == "CHF 60’000.00"
        assert page.locator("#ekv-invalid-display").inner_text() == "CHF 30’000.00"
        assert page.locator("#ekv-grade").inner_text() == "50%"

        page.select_option("#ekv-method", "mixed")
        page.fill("#ekv-employment-share", "80")
        page.fill("#ekv-household-share", "20")
        page.fill("#ekv-household-limitation", "25")
        assert page.locator("#ekv-weighted-employment").inner_text() == "40%"
        assert page.locator("#ekv-weighted-household").inner_text() == "5%"
        assert page.locator("#ekv-final-grade").inner_text() == "45%"
        assert "hide" not in (page.locator("#mixed-result-grid").get_attribute("class") or "")

        # Vollständigkeitsdarstellung wird weiterhin aus Validation gerendert.
        page.fill("#ekv-period-from", "2026-01-01")
        page.fill("#ekv-valid-reason", "Begründung VE")
        page.fill("#ekv-invalid-reason", "Begründung IVE")
        page.fill("#ekv-employee-name", "Alpha Fünf")
        page.fill("#ekv-edit-date", "2026-08-15")
        assert page.locator("#ekv-validation-list").inner_text().strip() == "Die aktuelle Berechnung ist vollständig erfasst und plausibel dokumentiert."
        assert page.locator("#ekv-valid-status-state").inner_text() == "Vollständig"
        assert page.locator("#ekv-invalid-status-state").inner_text() == "Vollständig"

        assert not errors, errors
        browser.close()
    print('{"status":"ok","phase_b_alpha5_ui":"form adapter, view, controller, sorted ui build"}')


if __name__ == "__main__":
    main()
