# EKV Navigator – AI Development Guide

## Zweck
Diese Datei ist die verbindliche Entwicklungsanweisung für KI gestützte Änderungen am EKV Navigator. Sie gilt zusätzlich zu den Fachtests, Architekturverträgen und Release Gates im Projekt.

## Grundsatz
Der EKV Navigator ist eine produktive IV Fachanwendung. Eine KI darf bestehendes Verhalten nicht stillschweigend vereinfachen, korrigieren, modernisieren oder neu interpretieren. Fachregeln und BFS Daten werden nur aufgrund eines expliziten Auftrags geändert.

## Unveränderliche Baseline
- Produktive Referenz: EKV Navigator 2.1.0
- Referenzdatei: `EKV_Navigator_IV(1).html`
- Referenz SHA256: `d876f0ad37efbfc4116cbae80738ba3df3189df77a28bb635a7e25a495d64e03`
- Golden Case Suite: `tests/golden/golden_cases_v1.json`
- Golden Case Lock: `governance/golden-cases.lock.json`

Golden Cases dürfen niemals angepasst werden, nur damit Tests wieder grün werden. Eine Änderung der erwarteten Werte ist eine fachliche Änderung und braucht eine explizite menschliche Freigabe.

## Vor jeder Änderung
1. Änderungstyp aus `governance/ai-change-policy.json` bestimmen.
2. Betroffene Dateien mit `node scripts/change_scope_check.js` prüfen.
3. Nur die für den Änderungstyp vorgesehenen Schichten anfassen.
4. Bestehende Fachlogik zuerst lesen und nicht aus allgemeinem Wissen ersetzen.
5. Vorhandene Tests und Referenzfälle als verbindliche Baseline behandeln.

## Architekturregeln
### Domain
`src/backend/domain/` enthält Fachregeln, Berechnungen, Validierung und fachliche Verträge.
- keine DOM Zugriffe
- kein `window`
- kein `document`
- kein `localStorage`
- keine Abhängigkeit von Features oder App Shell

### Daten
`src/backend/data/` enthält BFS Daten, Harmonisierung, Profile, Provenance und Importpipeline.
- Originale BFS Benennungen nicht manuell vereinheitlichen
- Zuordnung über Profile, NOGA, Alias und Audit
- unklare Zuordnungen niemals erraten
- produktive Daten nie automatisch überschreiben

### Features
`src/frontend/features/` enthält Anwendungsfunktionen und UI Workflows.
- darf Domain APIs verwenden
- darf keine neue EKV Fachregel definieren
- öffentliche Einstiegspunkte über Feature APIs

### App
`src/frontend/app/` orchestriert Features und Application State.
- keine Fachberechnung implementieren
- keine BFS Datenlogik implementieren

### Shared
`src/frontend/shared/` enthält nur generische UI, DOM und Formatierungshilfen.
- keine EKV Fachlogik

## Änderungstypen
### UI Änderung
Fachkern und BFS Daten sind tabu. Golden Cases müssen unverändert bleiben.

### BFS Datenupdate
Neue Lieferung zuerst über die Phase C Pipeline verarbeiten. Candidate und Audit prüfen. Keine direkte manuelle Datenmutation ohne nachvollziehbare Provenance.

### Fachregeländerung
Nur nach explizitem fachlichem Auftrag. Änderung in `src/backend/domain/`. Betroffene Golden Cases identifizieren. Erwartungswerte nur mit dokumentierter fachlicher Freigabe ändern.

### Arbeitsstände / Zeitperioden
Repository, Migration, View und Controller getrennt halten. Keine Berechnungslogik in Persistenzmodulen einführen.

### Export
Exportmodell, PDF Renderer und Word Renderer getrennt halten. Renderer dürfen keine Fachwerte aus sichtbarem HTML zurücklesen.

## Verbotene KI Muster
- Testwerte ändern, um eine fehlerhafte Implementierung zu legitimieren
- Golden Cases neu aus der geänderten Implementierung generieren
- unklare BFS Kategorien automatisch dem ähnlichsten Namen zuordnen
- Fachlogik in Event Handler oder Renderer schreiben
- globale Variablen als neue versteckte Schnittstelle einführen
- produktive BFS JSON Dateien ohne Audit überschreiben
- bestehende Migrationen löschen, weil aktuelle Daten damit funktionieren
- Framework oder externe Runtime Abhängigkeit ohne ausdrücklichen Auftrag einführen
- Browser Offlinefähigkeit brechen

## Pflichtprüfungen
Jede Änderung muss mindestens bestehen:
- `npm run test:golden`
- `npm test`

Vor einem Release Candidate zusätzlich:
- `npm run candidate:gate`
- `npm run test:browser`
- `npm run data:audit`

Bei BFS Updates zusätzlich den BFS Release Manifest Prozess und den erzeugten Provenance Audit prüfen.

## Wenn ein Test fehlschlägt
1. Ursache im geänderten Code suchen.
2. Prüfen, ob die Anforderung tatsächlich eine Fachänderung verlangt.
3. Golden Case Erwartungswerte nicht verändern, solange keine fachliche Freigabe vorliegt.
4. Bei Widerspruch zwischen Auftrag und bestehender Referenz den Widerspruch sichtbar machen statt stillschweigend eine Seite zu wählen.

## Definition Done
Eine KI Änderung ist erst abgeschlossen, wenn:
- der Change Scope zur Änderung passt
- keine verbotene Schicht verletzt wurde
- Golden Cases vollständig grün sind
- bestehende Regressionstests grün sind
- Browsertests vor Release grün sind
- Daten Audit bei Datenänderungen grün ist
- die Änderung in Release Notes oder der passenden Projektdokumentation nachvollziehbar beschrieben ist

## Risikoklassifizierung der Golden Cases
Die Risikoeinstufung liegt in `governance/golden-case-risk-v1.json`.

- `critical`: fachlicher Kernfall mit besonders hoher Auswirkung. Jede Änderung muss im Approval Record einzeln genannt werden.
- `high`: hohe fachliche Relevanz.
- `medium`: relevanter Berechnungs oder Eingabepfad.
- `standard`: ergänzende, aber weiterhin geschützte Baseline.

Die 24 kritischen Kernfälle sind nicht automatisch fachlich neu zertifiziert. Sie sind die priorisierte Prüfliste für eine formelle Fachzertifizierung und für jede zukünftige Fachregeländerung.

## Approval Workflow für Golden Case Änderungen
Wenn `tests/golden/golden_cases_v1.json` vom Lock abweicht, muss `npm run golden:approval-check` blockieren, solange kein gültiger menschlicher Approval Record vorliegt.

Ein Approval Record muss mindestens enthalten:
- alte und vorgeschlagene SHA256
- sämtliche betroffenen Golden Case IDs
- fachlichen Änderungsgrund
- Quelle beziehungsweise fachliche Referenz
- menschliche Freigabeperson und Rolle
- Freigabezeitpunkt
- Prüfnachweise

Eine KI darf `approvedBy.actorType` niemals auf etwas anderes als `human` legitimieren und darf keine Freigabeperson erfinden. Liegt keine echte menschliche Freigabe vor, bleibt der Status blockiert.

## Fachzertifizierung kritischer Kernfälle
Die 24 kritischen Golden Cases besitzen unter `docs/core-certification/` automatisch erzeugte Fachzertifizierungsdossiers.

Die Dossiers trennen zwei Ebenen strikt:
- `technicalVerification`: automatischer Soll Ist Vergleich gegen die gesperrte 2.1 Baseline.
- `humanCertification`: fachliche Freigabe durch eine reale Fachperson.

Eine technisch bestandene Prüfung darf niemals als menschliche Fachzertifizierung bezeichnet werden.

Vor einer fachlich zertifizierten Freigabe gilt zusätzlich:
- `npm run core:certification-report`
- `npm run core:certification-status`
- `npm run core:certification-release-gate`

Der strikte Release Gate darf erst grün werden, wenn für alle 24 kritischen Kernfälle gültige menschliche Zertifizierungsrecords in `governance/certifications/` liegen. Eine KI darf keine Namen, Rollen, Prüfnachweise oder Freigaben erfinden.

## Fachprüfungsworkflow der Kernfälle
Für die 24 kritischen Kernfälle steht unter `dist-review/` ein separates Offline Fachprüfungswerkzeug zur Verfügung. Es dient ausschliesslich der menschlichen Prüfung und ist kein Bestandteil der produktiven EKV Anwendung.

Verbindliche Regeln:
- Eine KI darf die Felder `reviewer`, `reviewedBy`, `ruleAssessment`, `resultAssessment`, `evidence` oder eine fachliche Entscheidung nicht im Namen einer Person erfinden oder vorbefüllen.
- Ein von einer Fachperson exportiertes Review Bundle darf zuerst nur mit `npm run core:review-bundle-check -- <datei>` validiert werden.
- Der schreibende Import mit `scripts/core_review_bundle.js <datei> --write` darf nur nach einer tatsächlich erfolgten menschlichen Prüfung ausgeführt werden.
- Jeder Record wird gegen den aktuellen `dossierFingerprint` geprüft. Veraltete Freigaben werden blockiert.
- Ein abgelehnter Kernfall blockiert den strikten Fachzertifizierungs Gate.
- Der Reviewprozess verändert weder die produktive EKV Anwendung noch die Golden Case Erwartungswerte.
