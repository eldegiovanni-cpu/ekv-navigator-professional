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


def set_direct(page, side, amount):
    prefix = "fv" if side == "valid" else "fi"
    page.select_option(f"#{prefix}-source-type", "direct")
    page.fill(f"#{prefix}-direct-income", str(amount))
    page.select_option(f"#{prefix}-direct-kind", "full")
    page.select_option(f"#{prefix}-direct-index-enabled", "Nein")


def capture_pdf(page):
    page.evaluate("""
      window.__alpha4Pdf = {html:'', printed:false};
      window.open = () => ({
        document: {open(){}, write(v){window.__alpha4Pdf.html=v}, close(){}},
        focus(){}, print(){window.__alpha4Pdf.printed=true}
      });
    """)
    page.click("#export-pdf-btn")
    page.wait_for_timeout(400)
    return page.evaluate("window.__alpha4Pdf")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.set_content(inlined_html(), wait_until="load")

        set_direct(page, "valid", 80000)
        set_direct(page, "invalid", 40000)
        long_valid = "LANGE VE BEGRÜNDUNG " + ("Nachvollziehbarer Fachtext mit mehreren Absätzen. " * 45)
        long_invalid = "LANGE IVE BEGRÜNDUNG " + ("Weitere fachliche Erläuterung für die operative Dokumentation. " * 45)
        page.fill("#ekv-valid-reason", long_valid)
        page.fill("#ekv-invalid-reason", long_invalid)
        page.fill("#ekv-employee-name", "Alpha Vier")
        page.fill("#ekv-edit-date", "2026-08-15")
        page.fill("#ekv-period-from", "2026-01-01")
        page.click("#save-period-btn")

        page.locator("#workspace-manager > summary").click()
        page.fill("#workspace-name", "Alpha4 Export")
        page.click("#save-workspace-btn")

        stored = page.evaluate("""
          (() => {
            const store=JSON.parse(localStorage.getItem('ekvToolSavedWorkspaces'));
            const p=store.workspaces['Alpha4 Export'].savedPeriods[0];
            return {snapshot:p.exportSnapshot, box:p.box3Html};
          })()
        """)
        assert stored["snapshot"]["schemaVersion"] == 1
        assert stored["snapshot"]["metrics"]["valid"]["value"] == "CHF 80’000.00"
        assert stored["snapshot"]["metrics"]["grade"]["value"] == "50%"
        assert stored["snapshot"]["reasons"]["validText"].startswith("LANGE VE BEGRÜNDUNG")
        assert stored["box"]  # Legacy Ansichtsinhalt bleibt vorerst kompatibel gespeichert.

        # RC1.3: lange Word Inhalte müssen dem PDF Lesefluss folgen und dürfen nicht
        # durch fixe Höhen, Miniaturschrift oder Overflow abgeschnitten werden.
        page.evaluate(r"""
          window.__wordCapture = {};
          document.execCommand = command => {
            if (command !== 'copy') return false;
            const clipboardData = {
              setData(type, value) { window.__wordCapture[type] = value; },
              getData(type) { return window.__wordCapture[type] || ''; }
            };
            const event = new Event('copy', {bubbles:true, cancelable:true});
            Object.defineProperty(event, 'clipboardData', {value: clipboardData});
            document.dispatchEvent(event);
            return true;
          };
          Object.defineProperty(navigator, 'clipboard', {configurable:true, value: undefined});
          Object.defineProperty(window, 'ClipboardItem', {configurable:true, value: undefined});
        """)
        page.once("dialog", lambda dialog: dialog.accept())
        page.click("#copy-word-btn")
        word_html = page.evaluate("window.__wordCapture['text/html'] || ''")
        word_text = page.evaluate("window.__wordCapture['text/plain'] || ''")
        assert 'data-ekv-word-export="1"' in word_html
        assert "<!DOCTYPE" not in word_html
        assert "overflow:hidden" not in word_html.replace(" ", "").lower()
        assert "font-size:6" not in word_html.replace(" ", "").lower()
        assert long_valid[:24] in word_html
        assert long_invalid[:25] in word_html
        order = [
            word_html.index("Nachvollziehbarkeit Valideneinkommen"),
            word_html.index("Begründung Valideneinkommen"),
            word_html.index("Nachvollziehbarkeit Invalideneinkommen"),
            word_html.index("Begründung Invalideneinkommen"),
        ]
        assert order == sorted(order)
        assert "\n" in word_text
        assert "LANGE VE BEGRÜNDUNG" in word_text
        assert "LANGE IVE BEGRÜNDUNG" in word_text

        pdf = capture_pdf(page)
        assert pdf["printed"] is True
        assert "Alpha4 Export" in pdf["html"]
        assert "CHF 80’000.00" in pdf["html"]
        assert "LANGE VE BEGRÜNDUNG" in pdf["html"]

        # Legacy Kopie ohne exportSnapshot muss weiterhin exportierbar bleiben.
        page.evaluate("""
          const key='ekvToolSavedWorkspaces';
          const store=JSON.parse(localStorage.getItem(key));
          const legacy=JSON.parse(JSON.stringify(store.workspaces['Alpha4 Export']));
          legacy.savedAt='2026-08-15T18:00:00.000Z';
          delete legacy.savedPeriods[0].exportSnapshot;
          store.workspaces['Legacy Export']=legacy;
          localStorage.setItem(key, JSON.stringify(store));
        """)
        page.fill("#workspace-search", "Legacy")
        legacy_load = page.locator('.phase5-workspace-action[data-action="load"][data-name="Legacy Export"]')
        assert legacy_load.count() == 1
        page.once("dialog", lambda dialog: dialog.accept())
        legacy_load.click()
        page.fill("#workspace-search", "")
        assert page.locator("#workspace-active-name").inner_text() == "Legacy Export"

        legacy_pdf = capture_pdf(page)
        assert legacy_pdf["printed"] is True
        assert "Legacy Export" in legacy_pdf["html"]
        assert "CHF 80’000.00" in legacy_pdf["html"]
        assert "LANGE VE BEGRÜNDUNG" in legacy_pdf["html"]

        assert not errors, errors
        browser.close()
    print('{"status":"ok","phase_b_alpha4_export":"structured snapshot, pdf renderer, legacy adapter"}')


if __name__ == "__main__":
    main()
