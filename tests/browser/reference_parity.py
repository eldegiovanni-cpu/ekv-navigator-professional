from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / "reference" / "EKV_Navigator_IV_2.1_Reference.html"
DIST = ROOT / "dist"


def build_inlined_dist_html():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    css = (DIST / "assets" / "app.css").read_text(encoding="utf-8")
    data = (DIST / "assets" / "data.bundle.js").read_text(encoding="utf-8")
    domain = (DIST / "assets" / "backend.bundle.js").read_text(encoding="utf-8")
    app = (DIST / "assets" / "frontend.bundle.js").read_text(encoding="utf-8")
    html = html.replace('<link href="assets/app.css" rel="stylesheet"/>', f"<style>{css}</style>")
    html = html.replace('<script src="assets/data.bundle.js"></script>', f"<script>{data}</script>")
    html = html.replace('<script src="assets/backend.bundle.js"></script>', f"<script>{domain}</script>")
    html = html.replace('<script src="assets/frontend.bundle.js"></script>', f"<script>{app}</script>")
    return html


def set_direct(page, side, amount, kind="full", pensum=None):
    prefix = "fv" if side == "valid" else "fi"
    page.select_option(f"#{prefix}-source-type", "direct")
    page.fill(f"#{prefix}-direct-income", str(amount))
    page.select_option(f"#{prefix}-direct-kind", kind)
    if pensum is not None:
        page.fill(f"#{prefix}-direct-pensum", str(pensum))
    page.select_option(f"#{prefix}-direct-index-enabled", "Nein")


def scenario_direct_mixed(page):
    set_direct(page, "valid", 60000)
    set_direct(page, "invalid", 30000)
    pure = {
        "valid": page.locator("#ekv-valid-display").inner_text(),
        "invalid": page.locator("#ekv-invalid-display").inner_text(),
        "loss": page.locator("#ekv-loss").inner_text(),
        "grade": page.locator("#ekv-grade").inner_text(),
    }
    page.select_option("#ekv-method", "mixed")
    page.fill("#ekv-employment-share", "80")
    page.fill("#ekv-household-share", "20")
    page.fill("#ekv-household-limitation", "25")
    return {
        "pure": pure,
        "weightedEmployment": page.locator("#ekv-weighted-employment").inner_text(),
        "weightedHousehold": page.locator("#ekv-weighted-household").inner_text(),
        "finalGrade": page.locator("#ekv-final-grade").inner_text(),
    }


def scenario_statistical_deductions(page):
    page.select_option("#fv-source-type", "stat")
    page.select_option("#fv-stat-source", "TA01")
    page.select_option("#fv-stat-year", "2024")
    page.select_option("#fv-stat-gender", "Mann")
    page.select_option("#fv-stat-branch", "05-96 Total")
    page.select_option("#fv-stat-skill", "1")
    page.fill("#fv-stat-parallel-income", "50000")

    page.select_option("#fi-source-type", "stat")
    page.select_option("#fi-stat-source", "TA01")
    page.select_option("#fi-stat-year", "2024")
    page.select_option("#fi-stat-gender", "Mann")
    page.select_option("#fi-stat-branch", "05-96 Total")
    page.select_option("#fi-stat-skill", "1")
    page.select_option("#fi-stat-besitzstand", "Nein")
    page.fill("#fi-stat-restaf", "50")
    return {
        "validMonthly": page.locator("#fv-stat-monthly").inner_text(),
        "validAnnual": page.locator("#fv-stat-annual").inner_text(),
        "validTransfer": page.locator("#fv-stat-transfer").inner_text(),
        "parallel": page.locator("#fv-stat-parallel").inner_text(),
        "invalidMonthly": page.locator("#fi-stat-monthly").inner_text(),
        "invalidAnnual": page.locator("#fi-stat-annual").inner_text(),
        "invalidTransfer": page.locator("#fi-stat-transfer").inner_text(),
        "pauschal": page.locator("#fi-stat-auto-abzug").inner_text(),
        "teilzeit": page.locator("#fi-stat-teilzeit").inner_text(),
        "grade": page.locator("#ekv-grade").inner_text(),
    }


def scenario_ta11(page):
    page.select_option("#fv-source-type", "stat")
    page.select_option("#fv-stat-source", "TA11")
    page.select_option("#fv-stat-year", "2024")
    page.select_option("#fv-stat-gender", "Frau")
    page.select_option("#fv-stat-branch", "Universitäre Hochschule (UNI, ETH)")
    page.select_option("#fv-stat-skill", "1+2")
    return {
        "monthly": page.locator("#fv-stat-monthly").inner_text(),
        "hours": page.locator("#fv-stat-hours").inner_text(),
        "annual": page.locator("#fv-stat-annual").inner_text(),
        "source": page.locator("#fv-stat-source-note").inner_text(),
    }


def scenario_ahv_partial(page):
    page.select_option("#fv-source-type", "income")
    page.select_option("#fv-inc-gender", "Mann")
    page.select_option("#fv-inc-target-year", "2025")
    page.select_option("#fv-inc-branch", "05-96 Total")
    page.select_option("#fv-inc-source", "IK-Auszug")
    page.select_option("#fv-inc-kind", "partial")
    row = page.locator("#fv-income-table tbody tr").first
    row.locator(".inc-year").select_option("2024")
    row.locator(".inc-amount").fill("30000")
    row.locator(".inc-pensum").fill("50")
    return {
        "full": row.locator(".inc-full-amount").inner_text(),
        "sourceIndex": row.locator(".inc-source-index").inner_text(),
        "targetIndex": row.locator(".inc-target-index").inner_text(),
        "total": row.locator(".inc-total").inner_text(),
        "average": page.locator("#fv-inc-average").inner_text(),
        "transfer": page.locator("#flow-valid-final").inner_text(),
    }


def scenario_no_loss(page):
    set_direct(page, "valid", 60000)
    set_direct(page, "invalid", 70000)
    return {
        "loss": page.locator("#ekv-loss").inner_text(),
        "grade": page.locator("#ekv-grade").inner_text(),
        "validation": page.locator("#ekv-validation-list").inner_text(),
    }


def scenario_open_period(page):
    set_direct(page, "valid", 60000)
    set_direct(page, "invalid", 30000)
    page.fill("#ekv-valid-reason", "Valideneinkommen begründet")
    page.fill("#ekv-invalid-reason", "Invalideneinkommen begründet")
    page.fill("#ekv-employee-name", "Testperson")
    page.fill("#ekv-edit-date", "2026-08-10")
    page.fill("#ekv-period-from", "2026-01-01")
    page.click("#save-period-btn")
    return {
        "count": page.locator("#period-count-chip").inner_text(),
        "warningHidden": "hide" in (page.locator("#ekv-period-warning").get_attribute("class") or ""),
        "listText": page.locator("#saved-periods-list").inner_text(),
    }


SCENARIOS = {
    # Data-independent behaviour remains byte-for-behaviour comparable with the immutable 2.1 reference.
    # Statistical and indexed scenarios are validated separately against the authoritative BFS raw reconciliation.
    "direct_mixed": scenario_direct_mixed,
    "no_loss": scenario_no_loss,
    "open_period": scenario_open_period,
}


def run_html(browser, html, scenario):
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    page.set_content(html, wait_until="load")
    result = scenario(page)
    page.close()
    return result, errors


def main():
    reference_html = REFERENCE.read_text(encoding="utf-8")
    phase3_html = build_inlined_dist_html()
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        for name, scenario in SCENARIOS.items():
            ref, ref_errors = run_html(browser, reference_html, scenario)
            new, new_errors = run_html(browser, phase3_html, scenario)
            if ref_errors or new_errors:
                raise AssertionError(f"{name}: Browserfehler Referenz={ref_errors} Phase3={new_errors}")
            if ref != new:
                raise AssertionError(f"{name}: Abweichung\nReferenz={json.dumps(ref, ensure_ascii=False, indent=2)}\nPhase3={json.dumps(new, ensure_ascii=False, indent=2)}")
            results[name] = new
        browser.close()
    print(json.dumps({"status": "ok", "scenarios": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
