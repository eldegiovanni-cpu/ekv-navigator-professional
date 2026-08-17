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


def prepare_exportable_case(page):
    set_direct(page, "valid", 80000)
    set_direct(page, "invalid", 40000)
    page.fill("#ekv-valid-reason", "Valideneinkommen nachvollziehbar begründet")
    page.fill("#ekv-invalid-reason", "Invalideneinkommen nachvollziehbar begründet")
    page.fill("#ekv-employee-name", "Final Candidate Test")
    page.fill("#ekv-edit-date", "2026-08-10")
    page.fill("#ekv-period-from", "2026-01-01")
    page.click("#save-period-btn")
    if not page.locator("#workspace-manager").get_attribute("open"):
        page.locator("#workspace-manager > summary").click()
    page.fill("#workspace-name", "Final Candidate Exportfall")
    page.click("#save-workspace-btn")


def main():
    html = inlined_html()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.set_content(html, wait_until="load")

        assert page.locator("h1").inner_text().strip() == "EKV Navigator Professional"
        # Statistical years are mode-specific and are intentionally populated only after a mode is selected.
        page.select_option("#fv-source-type", "stat")
        page.select_option("#fv-stat-source", "TA01")
        page.select_option("#fi-source-type", "stat")
        page.select_option("#fi-stat-source", "TA01")
        assert page.locator("#fv-stat-year option").count() > 1
        assert page.locator("#fi-stat-year option").count() > 1
        prepare_exportable_case(page)
        assert page.locator("#period-count-chip").inner_text() == "1 Zeitperioden"

        # PDF Export mit simuliertem erlaubtem Popup
        page.evaluate("""
          window.__pdfCapture = {html:'', printed:false, focused:false};
          window.open = () => ({
            document: {open(){}, write(v){window.__pdfCapture.html=v}, close(){}},
            focus(){window.__pdfCapture.focused=true},
            print(){window.__pdfCapture.printed=true}
          });
        """)
        page.click("#export-pdf-btn")
        page.wait_for_timeout(400)
        pdf = page.evaluate("window.__pdfCapture")
        assert "EKV Zeitperioden PDF Export" in pdf["html"]
        assert "Final Candidate Exportfall" in pdf["html"]
        assert "IV Grad" in pdf["html"]
        assert pdf["printed"] is True

        # PDF Popup Blocker darf keinen JavaScript Fehler erzeugen
        page.evaluate("window.open = () => null")
        popup_message = []
        page.once("dialog", lambda d: (popup_message.append(d.message), d.accept()))
        page.click("#export-pdf-btn")
        page.wait_for_timeout(50)
        assert popup_message and "Popups" in popup_message[0]

        # Word Zwischenablage Fallback
        page.evaluate("""
          Object.defineProperty(navigator, 'clipboard', {configurable:true, value: undefined});
          Object.defineProperty(window, 'ClipboardItem', {configurable:true, value: undefined});
          document.execCommand = () => true;
        """)
        word_message = []
        page.once("dialog", lambda d: (word_message.append(d.message), d.accept()))
        page.click("#copy-word-btn")
        page.wait_for_timeout(100)
        assert word_message and "Word Inhalt wurde" in word_message[0]

        # beschädigter Speicher darf App nicht zum Absturz bringen
        page.evaluate("localStorage.setItem('ekvToolSavedWorkspaces', '{defekt')")
        page.fill("#workspace-search", "x")
        page.fill("#workspace-search", "")

        assert not errors, errors
        browser.close()
    print('{"status":"ok","commercial_release":"startup, pdf export, popup guard, word fallback, browser console"}')


if __name__ == "__main__":
    main()
