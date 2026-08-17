from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


def inlined_html():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    css = (DIST / "assets" / "app.css").read_text(encoding="utf-8")
    data = (DIST / "assets" / "data.bundle.js").read_text(encoding="utf-8")
    backend = (DIST / "assets" / "backend.bundle.js").read_text(encoding="utf-8")
    frontend = (DIST / "assets" / "frontend.bundle.js").read_text(encoding="utf-8")
    return (html
      .replace('<link href="assets/app.css" rel="stylesheet"/>', f'<style>{css}</style>')
      .replace('<script src="assets/data.bundle.js"></script>', f'<script>{data}</script>')
      .replace('<script src="assets/backend.bundle.js"></script>', f'<script>{backend}</script>')
      .replace('<script src="assets/frontend.bundle.js"></script>', f'<script>{frontend}</script>'))


def select_stat(page, side, mode, year, gender, branch, skill="Alle"):
    p = "fv" if side == "valid" else "fi"
    page.select_option(f"#{p}-source-type", "stat")
    page.select_option(f"#{p}-stat-source", mode)
    page.select_option(f"#{p}-stat-year", str(year))
    page.select_option(f"#{p}-stat-gender", gender)
    page.select_option(f"#{p}-stat-branch", branch)
    if mode != "T17":
        page.select_option(f"#{p}-stat-skill", skill)


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page()
        errors=[]
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.set_content(inlined_html(), wait_until="load")

        # Historical availability is mode-specific.
        page.select_option("#fv-source-type", "stat")
        page.select_option("#fv-stat-source", "TA01")
        assert "2012" in page.locator("#fv-stat-year option").all_text_contents()
        page.select_option("#fv-stat-source", "TA11")
        assert "2010" in page.locator("#fv-stat-year option").all_text_contents()

        # TA1 72 KN1: [5984] -> 69-75 = 5231.
        select_stat(page, "valid", "TA01", 2024, "Neutral", "72 Forschung u. Entwicklung", "1")
        assert "5’231" in page.locator("#fv-stat-monthly").inner_text() or "5'231" in page.locator("#fv-stat-monthly").inner_text()
        note=page.locator("#fv-stat-source-note").inner_text()
        assert "Datenhinweis" in note and "69-75" in note and "statistisch unsicher" in note

        # T17 54 Mann: [6617] -> Hauptgruppe 5 = 5439.
        select_stat(page, "valid", "T17", 2024, "Mann", "54 Schutzkräfte und Sicherheitsbedienstete")
        assert "5’439" in page.locator("#fv-stat-monthly").inner_text() or "5'439" in page.locator("#fv-stat-monthly").inner_text()
        assert "Berufsgruppe 5" in page.locator("#fv-stat-source-note").inner_text()

        # T11 internal training 1+2 women: [5570] -> TOTAL = 10077.
        select_stat(page, "valid", "TA11", 2024, "Frau", "Unternehmensinterne Ausbildung", "1+2")
        assert "10’077" in page.locator("#fv-stat-monthly").inner_text() or "10'077" in page.locator("#fv-stat-monthly").inner_text()
        assert "Totalwert" in page.locator("#fv-stat-source-note").inner_text()

        # 2026 is possible, but NLE/BUA are explicitly carried forward from 2025.
        select_stat(page, "valid", "TA01", 2026, "Neutral", "05-96 Total", "1")
        future_note=page.locator("#fv-stat-source-note").inner_text()
        assert "2025" in future_note and "fortgeschrieben" in future_note

        assert not errors, errors
        browser.close()
        print({"status":"ok","checks":5})

if __name__ == "__main__":
    main()
