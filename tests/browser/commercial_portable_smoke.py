from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


def inlined_html():
    required = [
        DIST / "index.html", DIST / "assets" / "app.css", DIST / "assets" / "data.bundle.js",
        DIST / "assets" / "backend.bundle.js", DIST / "assets" / "frontend.bundle.js"
    ]
    for path in required:
        assert path.is_file(), f"Fehlt im Portable Build: {path.relative_to(DIST)}"
    html = required[0].read_text(encoding="utf-8")
    css = required[1].read_text(encoding="utf-8")
    data = required[2].read_text(encoding="utf-8")
    backend = required[3].read_text(encoding="utf-8")
    frontend = required[4].read_text(encoding="utf-8")
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
      .replace('<script src="assets/backend.bundle.js"></script>', f'<script>{backend}</script>')
      .replace('<script src="assets/frontend.bundle.js"></script>', f'<script>{frontend}</script>'))


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
        page.select_option("#fv-source-type", "stat")
        page.select_option("#fv-stat-source", "TA01")
        page.select_option("#fi-source-type", "stat")
        page.select_option("#fi-stat-source", "TA01")
        assert page.locator("#fv-stat-year option").count() > 1
        assert page.locator("#fi-stat-year option").count() > 1
        styles = page.evaluate("""() => {
          const hero = getComputedStyle(document.querySelector('.ekvp-hero'));
          return {heroBg: hero.backgroundImage, heroRadius: hero.borderRadius, primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()};
        }""")
        assert styles["heroBg"] != "none", styles
        assert styles["heroRadius"] == "14px", styles
        assert styles["primary"] == "#276c73", styles
        assert not errors, errors
        browser.close()
    print('{"status":"ok","commercial_portable":"complete packaged frontend assets verified"}')


if __name__ == "__main__":
    main()
