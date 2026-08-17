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
        removeItem: key => memory.delete(String(key)),
        clear: () => memory.clear(),
        key: index => Array.from(memory.keys())[index] ?? null,
        get length() { return memory.size; }
      }});
    })();
    </script>'''
    return (html
      .replace('</head>', storage + '</head>')
      .replace('<link href="assets/app.css" rel="stylesheet"/>', f'<style>{css}</style>')
      .replace('<script src="assets/data.bundle.js"></script>', f'<script>{data}</script>')
      .replace('<script src="assets/backend.bundle.js"></script>', f'<script>{domain}</script>')
      .replace('<script src="assets/frontend.bundle.js"></script>', f'<script>{app}</script>'))


def set_direct(page, side, amount):
    prefix = "fv" if side == "valid" else "fi"
    page.select_option(f"#{prefix}-source-type", "direct")
    page.fill(f"#{prefix}-direct-income", str(amount))
    page.select_option(f"#{prefix}-direct-kind", "full")
    page.select_option(f"#{prefix}-direct-index-enabled", "Nein")


def main():
    html = inlined_html()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.set_content(html, wait_until="load")
        page.locator("#workspace-manager > summary").click()

        assert page.locator("#workspace-total-count").inner_text() == "0"
        assert page.locator("#workspace-current-count").inner_text() == "0"
        assert page.locator("#workspace-review-count").inner_text() == "0"

        set_direct(page, "valid", 60000)
        set_direct(page, "invalid", 30000)
        page.fill("#ekv-valid-reason", "Valideneinkommen begründet")
        page.fill("#ekv-invalid-reason", "Invalideneinkommen begründet")
        page.fill("#ekv-employee-name", "Anna Muster")
        page.fill("#ekv-edit-date", "2026-08-10")
        page.fill("#ekv-period-from", "2026-01-01")
        page.fill("#workspace-name", "Fall Alpha")
        page.click("#save-workspace-btn")

        assert page.locator("#workspace-total-count").inner_text() == "1"
        assert page.locator("#workspace-current-count").inner_text() == "1"
        card = page.locator('#workspace-current-cards .phase5-case-card[data-workspace-name="Fall Alpha"]')
        assert card.count() == 1
        assert "50% IV Grad" in card.inner_text()
        assert "Dokumentiert" in card.inner_text()
        assert "Anna Muster" in card.inner_text()
        assert page.locator("#workspace-active-name").inner_text() == "Fall Alpha"
        assert page.locator("#workspace-active-state").inner_text() == "Gespeichert"

        page.fill("#workspace-name", "Fall Beta")
        page.click("#save-workspace-btn")
        assert page.locator("#workspace-total-count").inner_text() == "2"
        assert page.locator("#workspace-current-count").inner_text() == "2"

        page.fill("#fv-direct-income", "70000")
        assert page.locator("#workspace-active-state").inner_text() == "Geändert, noch nicht gespeichert"
        alpha_load = page.locator('#workspace-current-cards .phase5-workspace-action[data-action="load"][data-name="Fall Alpha"]')
        page.once("dialog", lambda dialog: dialog.dismiss())
        alpha_load.click()
        assert page.locator("#workspace-active-name").inner_text() == "Fall Beta"
        page.once("dialog", lambda dialog: dialog.accept())
        alpha_load.click()
        assert page.locator("#workspace-active-name").inner_text() == "Fall Alpha"
        assert page.locator("#workspace-active-state").inner_text() == "Gespeichert"

        # Alten Fall aus einem aktuellen Snapshot erzeugen und durch Eingabe Ereignis neu rendern.
        page.evaluate("""
          const key='ekvToolSavedWorkspaces';
          const store=JSON.parse(localStorage.getItem(key));
          const old=JSON.parse(JSON.stringify(store.workspaces['Fall Alpha']));
          old.savedAt='2026-06-01T10:00:00.000Z';
          old.summary.employeeName='Kontroll Person';
          store.workspaces['Alter Fall']=old;
          localStorage.setItem(key, JSON.stringify(store));
        """)
        page.fill("#workspace-search", "x")
        page.fill("#workspace-search", "")
        assert page.locator("#workspace-review-count").inner_text() == "1"
        assert page.locator("#old-workspace-count").inner_text() == "1"
        old_card = page.locator('#workspace-old-cards .phase5-case-card[data-workspace-name="Alter Fall"]')
        assert old_card.count() == 1
        assert "Kontrollieren" in old_card.inner_text()

        page.fill("#workspace-search", "Kontroll Person")
        assert page.locator("#workspace-old-cards .phase5-case-card").count() == 1
        assert page.locator("#workspace-current-cards .phase5-case-card").count() == 0
        page.fill("#workspace-search", "")

        old_card = page.locator('#workspace-old-cards .phase5-case-card[data-workspace-name="Alter Fall"]')
        old_card.locator('.phase5-workspace-action[data-action="load"]').click()
        assert page.locator("#workspace-active-name").inner_text() == "Alter Fall"
        assert "Kontrollliste" in page.locator("#workspace-status").inner_text()
        page.click("#save-workspace-btn")
        assert page.locator("#workspace-review-count").inner_text() == "0"
        assert page.locator("#workspace-current-count").inner_text() == "3"

        delete_btn = page.locator('#workspace-current-cards .phase5-workspace-action[data-action="delete"][data-name="Alter Fall"]')
        page.once("dialog", lambda dialog: dialog.accept())
        delete_btn.click()
        assert page.locator("#workspace-total-count").inner_text() == "2"

        assert not errors, errors

        for width in (1440, 1024, 760, 390):
            page.set_viewport_size({"width": width, "height": 850})
            dims = page.evaluate("({scroll:document.documentElement.scrollWidth, inner:window.innerWidth})")
            assert dims["scroll"] <= dims["inner"], (width, dims)

        browser.close()
    print('{"status":"ok","phase5_workspace":"save, metadata, dirty guard, review list, search, resave, delete, responsive"}')

if __name__ == "__main__":
    main()
