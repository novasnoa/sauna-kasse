# Auftrag für den Schichtplan: schreibgeschützter Lese-Zugang für die Kasse

Gilt für das Projekt **sauna-schichtplan** (Cloudflare Worker, `https://sauna-schichtplan.sauna-schichtplan.workers.dev/`).
Beachte dessen CLAUDE.md und seine Regeln. **Alles additiv: bestehende Endpunkte, Anmeldung (Cookie `zutritt`), die Kopfzeile `X-Schichtplan`
und die Oberfläche bleiben unverändert.**

## Ziel
Die Sauna-Kasse (`https://sauna-kassensystem.web.app`) soll den Massageplan der nächsten 4 Wochen **lesen und anzeigen** – ohne Anmeldung am Plan,
nur lesend. Das geht heute nicht: Die Anmeldung hängt an einem `SameSite=Lax`-Cookie, und der Worker sendet keine CORS-Header.
Die Anmeldung und das Cookie sollen **nicht** gelockert werden. Stattdessen ein eigener, enger Lese-Endpunkt.

## Was gebaut werden soll
**`GET /api/lese/board`** – ohne Cookie, geschützt durch einen geheimen Lese-Schlüssel.

- **Schlüssel:** Worker-Secret `LESE_SCHLUESSEL` (Wrangler-Secret, **nicht** im Repo, nicht in Logs). Lang und zufällig, z. B. `openssl rand -hex 24`.
  Übergabe als Abfrageparameter `k` (damit die Anfrage eine „einfache“ GET-Anfrage ohne Preflight bleibt):
  `/api/lese/board?k=<schlüssel>`. Vergleich in konstanter Zeit. Fehlt das Secret oder stimmt `k` nicht: **403** mit immer derselben
  knappen Antwort (`{"error":"Kein Zugriff."}`), ohne zu verraten, was falsch war. Ist `LESE_SCHLUESSEL` nicht gesetzt, ist der Endpunkt aus (403).
- **Zeitraum:** optional `from=JJJJ-MM-TT` und `to=JJJJ-MM-TT`. Ohne Angabe: heute (Europe/Berlin) bis heute + 27 Tage. Höchstens 62 Tage, sonst 400.
- **Antwort** – nur das, was die Kasse zum Anzeigen braucht, **keine** Personen-IDs, E-Mails, Notizen, Aktivitäten, Admin-Daten:
  ```json
  {
    "from": "2026-10-12", "to": "2026-11-08",
    "shifts": [
      { "date": "2026-10-12", "shiftType": "frueh", "positionName": "Massage", "slots": 1,
        "claims": [ { "name": "Tomoko Massage", "color": "#a4503a" } ] }
    ]
  }
  ```
  (Dieselbe Quelle wie `/api/board`, nur auf diese Felder gekürzt. Alle aktiven Positionen; die Kasse filtert selbst auf „Massage“.)
- **CORS:** `Access-Control-Allow-Origin` **nur** für `https://sauna-kassensystem.web.app` und `https://sauna-kassensystem.firebaseapp.com`
  (die Herkunft der Anfrage prüfen und genau diese zurückgeben, nie `*`), dazu `Vary: Origin`. **Keine** Anmeldedaten (`Allow-Credentials` nicht setzen).
  `OPTIONS` auf diesen Pfad mit 204 und denselben Headern beantworten. Nur GET erlauben.
- **Zwischenspeicher:** `Cache-Control: no-store` (oder höchstens 60 s).
- **Missbrauch:** einfache Begrenzung der Aufrufe je Minute und IP, falls der Worker das ohnehin schon kann; sonst weglassen.

## Nicht tun
- Cookie, `SameSite`, `X-Schichtplan`-Prüfung oder die Anmeldung der Oberfläche ändern.
- Weitere Endpunkte für Fremde öffnen, den Schlüssel ins Repo schreiben oder loggen.
- Die Oberfläche einbettbar machen (iframe) – nicht gewünscht.

## Prüfen (wirklich ausführen, Ergebnis berichten)
1. Ohne `k` und mit falschem `k`: 403, gleiche Antwort. Mit richtigem `k`: 200 und das JSON oben, **ohne** Cookie.
2. Aus dem Browser von `https://sauna-kassensystem.web.app` ein `fetch(url)` – die Antwort ist lesbar (CORS). Von einer anderen Herkunft: nicht lesbar.
3. Alte Wege unverändert: Anmeldung, `/api/state`, `/api/board` mit Cookie, die Oberfläche.
4. Antwort enthält keine `staffId`, `note` oder sonstigen Felder außerhalb der Liste oben.

## Danach (Robert)
- Den Schlüssel einmal erzeugen und setzen: `npx wrangler secret put LESE_SCHLUESSEL`, dann deployen.
- Den Schlüssel **nur** Robert nennen. Die Kasse speichert ihn selbst im privaten Google-Abgleich der Sauna – nicht im öffentlichen Quelltext.
- Meldung an die Kassen-Sitzung: „Lese-Endpunkt fertig, Pfad `/api/lese/board`, Parameter `k`.“ Dann baut sie das Fenster „Massageplan“.
