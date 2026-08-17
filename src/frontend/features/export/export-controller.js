/* Phase B Alpha 4: Export Orchestrator. Renderer arbeiten ausschliesslich mit strukturierten Daten. */
function getStructuredExportDocument() {
  return createExportDocumentModel({
    workspaceName: getCurrentWorkspaceName(),
    periods: APP_STATE.savedPeriods,
    legacyAdapter: legacyPeriodToExportSnapshot
  });
}

function buildTimeperiodExportHtml(title, mode = "print") {
  const model = getStructuredExportDocument();
  return mode === "print"
    ? renderPdfExportDocument(model, title)
    : renderWordExportDocument(model, title);
}

function buildTimeperiodClipboardHtml() {
  if (!APP_STATE.savedPeriods.length) return "";
  return renderWordClipboardFragment(getStructuredExportDocument());
}

function buildClipboardFragment() {
  return buildTimeperiodClipboardHtml();
}

function buildTimeperiodClipboardPlainText() {
  const html = buildClipboardFragment();
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.style.position = "fixed";
  tmp.style.left = "-10000px";
  tmp.style.top = "0";
  tmp.style.width = "190mm";
  tmp.innerHTML = html;
  document.body.appendChild(tmp);
  const text = (tmp.innerText || tmp.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  tmp.remove();
  return text;
}

function copyHtmlWithExecCommand(htmlFragment, plainText = "") {
  const html = String(htmlFragment || "");
  const text = String(plainText || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  if (!html.trim()) return false;

  let copiedByEvent = false;
  const onCopy = event => {
    try {
      event.preventDefault();
      if (event.clipboardData) {
        event.clipboardData.setData("text/html", html);
        event.clipboardData.setData("text/plain", text);
        copiedByEvent = true;
      }
    } catch (err) {
      console.error("Copy Event fehlgeschlagen", err);
    }
  };

  const helper = document.createElement("textarea");
  helper.value = text || "EKV Word Export";
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  helper.style.top = "0";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  document.addEventListener("copy", onCopy);

  try {
    helper.focus();
    helper.select();
    document.execCommand("copy");
  } catch (err) {
    console.error("execCommand copy mit Copy Event fehlgeschlagen", err);
  } finally {
    document.removeEventListener("copy", onCopy);
    helper.remove();
  }
  if (copiedByEvent) return true;

  const wrapper = document.createElement("div");
  wrapper.contentEditable = "true";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "190mm";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#17212b";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  let success = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(wrapper);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    wrapper.focus();
    success = document.execCommand("copy");
    selection.removeAllRanges();
  } catch (err) {
    console.error("execCommand copy mit Selektion fehlgeschlagen", err);
  } finally {
    wrapper.remove();
  }
  return !!success;
}

function openWordClipboardPreview(htmlFragment) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Word Inhalt kopieren</title><style>
    body { font-family:Arial,Helvetica,sans-serif; margin:16px; background:#f4f8fb; color:#10233a; }
    .copy-hint { margin:0 0 12px; padding:10px 12px; background:#fff; border:1px solid #bfd3e5; font-size:13px; }
    .copy-area { background:#fff; border:1px solid #bfd3e5; padding:8px; }
  </style></head><body><div class="copy-hint"><strong>Automatisches Kopieren war nicht möglich.</strong><br>Markiere den Inhalt unten mit Ctrl+A und kopiere ihn mit Ctrl+C in Word.</div><div class="copy-area" contenteditable="true">${htmlFragment}</div></body></html>`);
  w.document.close();
  return true;
}

async function copyWordContent() {
  if (!requireSavedWorkspaceNameForExport()) return;
  if (!APP_STATE.savedPeriods.length) {
    alert("Es sind noch keine Zeitperioden gespeichert.");
    return;
  }

  let htmlFragment = "";
  let plainText = "";
  try {
    htmlFragment = buildClipboardFragment();
    plainText = buildTimeperiodClipboardPlainText();
  } catch (err) {
    console.error(err);
    alert("Der Word Inhalt konnte nicht erstellt werden. Bitte prüfe, ob die gespeicherten Zeitperioden vollständig sind.");
    return;
  }

  if (!htmlFragment.trim()) {
    alert("Der Word Inhalt konnte nicht erstellt werden, weil keine exportierbaren Inhalte vorhanden sind.");
    return;
  }

  try {
    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      const item = new ClipboardItem({
        "text/html": new Blob([htmlFragment], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
      alert("Der Word Inhalt wurde übersichtlich nach derselben Struktur wie der PDF Export in die Zwischenablage kopiert und kann in Word eingefügt werden.");
      return;
    }
  } catch (err) {
    console.error(err);
  }

  try {
    if (copyHtmlWithExecCommand(htmlFragment, plainText)) {
      alert("Der Word Inhalt wurde übersichtlich nach derselben Struktur wie der PDF Export in die Zwischenablage kopiert und kann in Word eingefügt werden.");
      return;
    }
  } catch (err) {
    console.error(err);
  }

  if (openWordClipboardPreview(htmlFragment)) {
    alert("Das automatische Kopieren wurde vom Browser blockiert. Ich habe eine Kopieransicht geöffnet, aus der du den Inhalt manuell in Word kopieren kannst.");
  } else {
    alert("Der Word Inhalt konnte nicht automatisch kopiert werden. Der Browser hat auch die Kopieransicht blockiert.");
  }
}

function exportPdfView() {
  if (!requireSavedWorkspaceNameForExport()) return;
  if (!APP_STATE.savedPeriods.length) {
    alert("Es sind noch keine Zeitperioden gespeichert.");
    return;
  }
  const w = window.open("", "_blank");
  if (!w) {
    alert("Der PDF Export konnte nicht geöffnet werden. Bitte erlaube Popups für diese lokale Anwendung und versuche es erneut.");
    return;
  }
  const htmlOut = renderPdfExportDocument(getStructuredExportDocument(), "EKV Zeitperioden PDF Export");
  w.document.open();
  w.document.write(htmlOut);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

function exportWordView() {
  if (!requireSavedWorkspaceNameForExport()) return;
  if (!APP_STATE.savedPeriods.length) {
    alert("Es sind noch keine Zeitperioden gespeichert.");
    return;
  }
  const htmlOut = renderWordExportDocument(getStructuredExportDocument(), "EKV Zeitperioden Word Export");
  const blob = new Blob(["\ufeff", htmlOut], { type: "application/msword" });
  const link = document.createElement("a");
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  link.href = URL.createObjectURL(blob);
  link.download = `EKV_Zeitperioden_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.doc`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}


const EXPORT_FEATURE_API = Object.freeze({
  pdf: exportPdfView,
  wordClipboard: copyWordContent,
  wordDownload: exportWordView
});
