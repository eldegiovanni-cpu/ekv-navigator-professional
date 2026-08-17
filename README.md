# EKV Navigator Professional 1.0 Commercial Final Master Source

Stand: 17. August 2026

## Status

Dieser Source Stand ist die funktional und fachlich eingefrorene Commercial Final Master Basis.

Die Fachlogik basiert weiterhin auf der zertifizierten EKV Navigator 2.1 Referenz. Die Developer Architektur 3.0 bleibt die Wartungsbasis. Die BFS Datenbasis wurde am 17.08.2026 vollständig gegen die gelieferten Rohdateien abgeglichen.

## Qualitätsstatus

* 24 von 24 kritischen Kernfällen technisch bestanden
* 24 von 24 Kernfällen menschlich fachlich zertifiziert
* RC1.3 Baseline: 288 automatisierte Node Tests bestanden
* RC1.3 Baseline: 12 von 12 Browserprüfungen bestanden
* BFS Daten Audit ohne offene Zuordnungen und ohne Kollisionen
* Offline Build ohne externe Runtime Abhängigkeiten

## Feature Freeze

Ab diesem Stand werden bis zum Commercial Final keine Fachfunktionen oder Bedienfunktionen mehr ergänzt. Zulässig sind nur Release, Dokumentations, Lizenzierungs und Compliance Änderungen.

## Commercial Status

* BFS Commercial Nutzungsrechte: bestätigt, Quellenangabe erforderlich
* Anbieter: De Giovanni InvaTech, Marktstrasse 2, 8853 Lachen SZ
* UID/CHE: wird ergänzt, sobald der erste Verkauf konkret in Aussicht steht
* Arbeitgeberseitige Kommerzialisierung: geklärt
* Produktstatus: Commercial Final Master, vertriebsbereit
* Institutionslizenzvertrag: wird bei erstem konkreten Interessenten finalisiert
* Kundenedition: wird erst nach Angebot, Lizenzvereinbarung und Personalisierung ausgeliefert

## Build

`npm run build` erzeugt die portable Anwendung unter `dist/`.

`npm test` führt die automatisierte Qualitätssicherung aus.

`npm run test:browser` führt die Browserprüfungen aus.

`npm run core:certification-release-gate` prüft die vollständige menschliche Kernfallzertifizierung.
