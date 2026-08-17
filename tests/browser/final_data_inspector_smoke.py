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
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
        page.set_content(inlined_html(), wait_until="load")

        assert page.locator("#phase4-app-subtitle").count() == 0
        assert page.locator("#toggle-valid-helper").count() == 0
        assert page.locator("#toggle-invalid-helper").count() == 0

        page.locator("#data-inspector > summary").click()
        assert "Datenbasis geprüft" in page.locator("#data-inspector-integrity-chip").inner_text()
        assert page.locator("#data-inspector-table tbody tr").count() > 1
        assert "LSE TA01" in page.locator("#data-inspector-meta").inner_text()

        page.select_option("#data-inspector-dataset", "hours")
        page.fill("#data-inspector-search", "05-96")
        assert page.locator("#data-inspector-table tbody tr").count() >= 1
        assert "Betriebsübliche Arbeitszeiten" in page.locator("#data-inspector-meta").inner_text()

        with page.expect_download() as download_info:
            page.click("#data-inspector-export-csv")
        download = download_info.value
        assert download.suggested_filename.endswith(".csv")

        with page.expect_download() as download_info:
            page.click("#data-inspector-export-json")
        download = download_info.value
        assert download.suggested_filename.endswith(".json")

        assert not errors, errors
        browser.close()
    print('{"status":"ok","final":"ui cleanup, bfs data inspector, csv/json export"}')

if __name__ == "__main__":
    main()
