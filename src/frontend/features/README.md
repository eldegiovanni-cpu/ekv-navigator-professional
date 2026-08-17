# Feature Module

Die Anwendung wird in Developer Architecture 3.0 nach fachlicher Verantwortung organisiert.

## Migriert in Alpha 2

- `income/statistical`: statistische Werte für VE und IVE
- `income/ahv`: AHV Einkommen und Teilzeit Hochrechnung
- `income/wage`: Stundenlohn, Saisonalbetrieb, Taglohn und Wochenlohn
- `income/direct`: direkte Einkommenseingabe und optionale Indexierung
- `income/valid`: kleiner VE Orchestrator
- `income/invalid`: kleiner IVE Orchestrator
- `income-comparison`: UI Steuerung des reinen und gemischten Einkommensvergleichs
- `periods`: UI Workflow für Zeitperioden
- `workspaces`: Arbeitsstandsworkflow und Browser Persistenz Orchestrierung
- `export`: PDF und Word Ausgabe
- `data-inspector`: read only BFS Datenkontrolle und Export

## Architekturregel

Feature Module dürfen Fachberechnungen verwenden, aber keine neue Fachberechnungslogik definieren. Fachregeln und Berechnungen liegen ausschliesslich unter `src/domain`. BFS Zugriff und Harmonisierung liegen unter `src/data/bfs`.

State Änderungen erfolgen über die Aktionen von `APP_STATE` und nicht über direkte Property Mutationen.
