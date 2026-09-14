# Cadence

Musiktheorie in kleinen Schritten. Die erste Iteration vermittelt Dreiklänge ausschließlich auf
Deutsch und ohne Audio.

## Start

Voraussetzung: **Deno 2.9.6**.

```sh
deno task check
deno task test
deno task serve
```

Öffne http://127.0.0.1:8000. `deno task build` erzeugt `dist/` für einen statischen HTTPS-Host. Die
Anwendung verwendet Hash-URLs, daher braucht der Host keine SPA-Fallback-Regeln. Unterverzeichnisse
werden unterstützt. Keine externen Laufzeit-Abhängigkeiten, CDNs oder Backend-Dienste.

## Erste Iteration

- Drei Lektionen: Dreiklang, Dur/Moll, Akkordtöne ergänzen.
- Deutsche Notennamen einschließlich H/B, Cis, Es und Fis; Akkorde werden zunächst als Tonbuchstaben
  dargestellt.
- Erklärungen, Auswahlaufgaben, direktes Feedback und bestes Erstversuchsergebnis je Lektion.
- Angefangene Lektion nach jedem beantworteten Schritt in IndexedDB gespeichert.
- JSON-Sicherung und validierte Wiederherstellung mit ausdrücklicher Ersetzungsbestätigung.
- Offline-Ressourcen über einen Service Worker; erst nach vollständiger Installation erscheint
  „Offline bereit“.
- Ein schreibendes Fenster pro Browserprofil, abgesichert mit Web Locks.

Zielplattform: aktueller Chromium-Browser, insbesondere Vanadium auf GrapheneOS. Die konkrete
Android-Installation muss vor einer mobilen Freigabe auf einem echten Gerät geprüft werden. Die
erste Version enthält ein SVG-App-Symbol; plattformspezifische Installationsdarstellung ist noch
kein verifiziertes Versprechen.

## Architektur

`src/music/` enthält das Musikmodell mit expliziten Akkordschreibweisen. `src/learning/` enthält den
versionierten Kurs. `src/progress/` validiert Daten und speichert den vollständigen Lernstand
transaktional. `src/main.ts` komponiert den kleinen Bildschirmablauf mit direkten DOM-Operationen,
Hash-Navigation und lokalem Zustand. Jeder Bildschirm entfernt seine Ereignisbehandler beim Wechsel.

Deno prüft und transpiliert die TypeScript-Module; der Build schreibt relative Browserimporte auf
`.js` um. Der Service Worker wird mit einem inhaltsabhängigen Cache-Namen erzeugt. Eine
Aktualisierung wird erst ohne offene Lektion angeboten. Vorherige Anwendungscaches bleiben zunächst
erhalten; eine sichere Bereinigung folgt in einer späteren Iteration. Benutzerdaten liegen getrennt
in IndexedDB. Unbekannte Datenversionen werden abgewiesen, nicht gelöscht.

## Bewusste Grenzen und nächste Schritte

Diese erste Version verwendet Tonbuchstaben, noch keine Notensysteme oder Klaviatur. Sie enthält
noch keine zeitgesteuerte Wiederholung, Kompetenzschätzung, Umkehrungen, Septakkorde, Konten oder
Synchronisierung. Als Nächstes bieten sich Akkorde in Grundstellung im Notensystem sowie gezieltes
Wiederholen falscher Antworten an. Audio bleibt für die ersten Iterationen ausgeschlossen.

Browserdaten sind keine dauerhafte Sicherung. Fortschritt kann als JSON exportiert werden. Bei
Schreibfehlern bleibt die Aufgabe beantwortbar; erst ein erfolgreicher Commit führt zum nächsten
Schritt. Nach Neuladen geht es mit der nächsten unbeantworteten Aufgabe weiter.

## Prüfstand

`deno task check`, die fünf fachlichen/Validierungs-Tests und `deno task build` wurden mit Deno
2.9.6 erfolgreich ausgeführt.

Der Browsertest ist vorbereitet, konnte in der Entwicklungsumgebung aber nicht ausgeführt werden:
Der verfügbare Browser blockiert die lokale Adresse; der alternative Browser-Download lieferte kein
gültiges Archiv. Die lokale Browserprüfung war dadurch blockiert. Die unten dokumentierte
GitHub-Actions-Prüfung hat inzwischen den automatisierten Chromium-Ablauf erfolgreich verifiziert;
die Installation auf GrapheneOS bleibt eine Geräteprüfung.

Für die Browserprüfung in einer normalen Entwicklungsumgebung:

```sh
deno run -A npm:playwright@1.62.1 install chromium
# Terminal 1
deno task serve
# Terminal 2
deno task test:browser
```

Der Test umfasst Lektionsabschluss, Wiederaufnahme nach Neuladen, Offline-Neustart, Zurück/Vorwärts,
Export, ungültigen Import, den Schutz vor mehreren schreibenden Fenstern und mobile Überbreite.
Playwright ist ausschließlich eine Testabhängigkeit; die Anwendung selbst benötigt keine Pakete. Die
Testabhängigkeit ist fest versioniert; ihre Lockdatei muss beim ersten erfolgreichen Abruf ergänzt
werden.

Vor einer Freigabe zusätzlich manuell prüfen: erfolgreicher Import, verweigerter Speicherzugriff,
unterbrochene Aktualisierung, neue Version bei offener Lektion und Installation auf GrapheneOS.
Diese Fälle sind noch nicht automatisiert abgedeckt.

## GitHub Actions

`.github/workflows/verify.yml` führt bei Pushes, Pull Requests und manuellem Start die
Deno-Prüfungen sowie den Chromium-Browsertest aus. Getestet wird die fertig gebaute Anwendung aus
`dist/`; der Server muss vor Testbeginn erreichbar sein. Ein Testfehler lässt den Lauf fehlschlagen.

Der Lauf installiert Deno 2.9.6 und Playwright 1.62.1 samt Chromium und Linux-Abhängigkeiten. Er
benötigt nur lesenden Repository-Zugriff und keine Projekt-Secrets. Screenshots, Serverprotokoll und
Playwright-Trace werden als `browser-diagnostics` für 14 Tage aufgehoben. Der Browsertest prüft
zusätzlich einen erfolgreichen Import einschließlich Neuladen. Lokale Testergebnisse liegen unter
`test-results/`.

Ein grüner Lauf bestätigt die automatisierten Prüfungen auf Chromium unter Ubuntu. Installation auf
einem echten GrapheneOS-Gerät sowie die oben genannten noch nicht automatisierten Fehler- und
Aktualisierungsfälle bleiben separate Prüfungen. Der aktuelle Status ist im Actions-Tab sichtbar;
die frühere lokale Browserblockade allein ist kein Testergebnis des Workflows.

Erster erfolgreicher CI-Lauf:
[Verify Cadence, 14.09.2026](https://github.com/archaic-web/cadence/actions/runs/34869505751),
Commit `263dc1200ba50044556e2f1292a23945125a49db`. Alle Schritte einschließlich Chromium-Browsertest
und Diagnose-Upload waren erfolgreich.

## Testbereitstellung auf GitHub Pages

Der Workflow testet denselben Build in Chromium und WebKit. Nur wenn alle Prüfungen erfolgreich
sind, wird `dist/` aus `initial-chord-lessons` als Pages-Artefakt veröffentlicht. Pull Requests
testen ausschließlich; sie veröffentlichen nicht. Auch ein manueller Workflow-Start kann diesen
Branch bereitstellen.

Einmalig muss unter **Settings → Pages → Build and deployment → Source** die Option **GitHub
Actions** aktiviert sein. Die veröffentlichte Adresse steht im erfolgreichen Deployment des
Environments `github-pages`. GitHub Pages stellt die Anwendung öffentlich bereit; Lernfortschritt
bleibt im jeweiligen Browser gespeichert.

Im Fußbereich steht `Version <Commit>`. Die WebKit-Prüfung ergänzt Chromium, ersetzt aber keinen
Test auf dem iPad. Öffne die Adresse zuerst in Safari und füge sie anschließend über „Zum
Home-Bildschirm“ als Web-App hinzu. Prüfe insbesondere Quer-/Hochformat, Schließen und Wiederöffnen
sowie einen Offline-Neustart nach „Offline bereit“.

Lokal: `BROWSER=webkit deno task test:browser` (vorher
`deno run -A npm:playwright@1.62.1 install --with-deps chromium webkit`). Die Browserdiagnosen
liegen getrennt unter `test-results/chromium/` und `test-results/webkit/`.
