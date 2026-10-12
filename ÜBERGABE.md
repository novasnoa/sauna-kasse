# Übergabe an die Saunabetreiber – Veröffentlichung über das Google-Konto

Ziel: Kasse, Daten und Veröffentlichung gehören dem Sauna-Konto, nicht dem Entwickler.

## Einmalig, im Sauna-Google-Konto
1. **Projekt übernehmen:** Das Cloud-Projekt „Sauna-Kassensystem“ (ID `sauna-kassensystem`) gehört bisher dem Entwickler.
   Google Cloud Console → IAM und Verwaltung → IAM → „Zugriff gewähren“ → Sauna-Konto → Rolle **Inhaber**.
   Danach kann der Entwickler sich selbst entfernen (oder als „Bearbeiter“ bleiben, wenn er weiter pflegen soll).
2. **Firebase einschalten:** console.firebase.google.com → „Projekt hinzufügen“ → das **bestehende** Projekt wählen,
   Tarif **Spark** (kostenlos, keine Kreditkarte). Google Analytics ausschalten.
3. **Hosting:** Firebase → Erstellen → Hosting → „Los geht’s“. Die Adresse lautet dann `https://sauna-kassensystem.web.app`.
4. **Anmeldung erlauben:** Cloud Console → Google Auth Platform → Clients → Client „Sauna-Kasse“ →
   bei „Autorisierte JavaScript-Quellen“ ergänzen: `https://sauna-kassensystem.web.app` und `https://sauna-kassensystem.firebaseapp.com`.
   Unter „Zielgruppe“ das Sauna-Konto als Testnutzer eintragen (solange die App im Status „Test“ ist).

## Hochladen (wer pflegt, braucht Node.js)
    npm install -g firebase-tools
    firebase login            # mit dem Sauna-Konto anmelden
    firebase deploy --only hosting

Jede neue Fassung von `index.html` wird mit dem letzten Befehl veröffentlicht.

## Automatisch bei jedem Push (`.github/workflows/firebase.yml`)
Einmalig einzurichten, danach braucht niemand mehr `firebase login`:
1. Firebase → Projekteinstellungen → Dienstkonten → „Neuen privaten Schlüssel generieren“ (JSON-Datei).
   Besser ein eigenes Dienstkonto mit nur der Rolle **Firebase Hosting Admin** (Cloud Console → IAM).
2. GitHub-Repo → Settings → Secrets and variables → Actions → „New repository secret“:
   Name `FIREBASE_SERVICE_ACCOUNT`, Wert = der gesamte Inhalt der JSON-Datei.
3. Die JSON-Datei danach löschen; sie gehört nur noch ins GitHub-Geheimnis.
Fehlt das Geheimnis, schlägt der Lauf mit einer klaren Meldung fehl; GitHub Pages ist davon unabhängig.

## Umzug der Daten
Die Buchungen liegen im Browser (localStorage) **und** – wenn der Google-Abgleich an ist – im App-Ordner des
Google-Kontos. Unter der neuen Adresse einmal bei Google anmelden: der Stand kommt aus dem Konto zurück.
Vorher auf jedem Gerät die Sicherung herunterladen.

## Danach
GitHub Pages (`novasnoa.github.io/sauna-kasse`) kann abgeschaltet werden, sobald alle Geräte auf der neuen Adresse laufen.

## Massageplan (Schichtplan lesen)

Der Schichtplan (Cloudflare) lässt Abfragen aus fremden Seiten nicht zu und wird nicht verändert. Statt dessen holt
`tools/plan-holen.mjs` den Plan in der Veröffentlichung (GitHub Actions, alle 30 Minuten und bei jedem Push), meldet sich mit
dem Teampasswort an und legt nur Anzeigedaten als `plan.json` neben die Kasse (nicht im Repo, `.gitignore`). Die Kasse liest
`./plan.json` (Knopf „Massageplan“ oben), merkt sich den letzten guten Stand im Gerät und zeigt „Stand …“.
Veröffentlicht wird bei Zeitplan-Läufen nur, wenn sich der Plan geändert hat.

**Einmalig einzurichten:** GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret,
Name `SCHICHTPLAN_PASSWORT`, Wert = Teampasswort des Schichtplans. Ohne das Geheimnis bleibt der Plan leer
(„nicht verfügbar“); die Kasse läuft normal weiter.
Sofort aktualisieren: Actions → Firebase → Run workflow.
Die Daten gelten als praktisch öffentlich (Vorgabe des Betreibers); das Passwort steht nie im Quelltext.

## Massagetermine → Schichtplan

Knopf „Termine“ oben: reserviert Termine je Tag und Schicht (Tagesschicht/Abendschicht), **ohne Masseur*in** – wer massiert, legt der
Schichtplan fest; dort sehen die Eingetragenen der Schicht die Termine. Die Termine liegen in `S.ter` und gleichen sich über Google
zwischen den Geräten ab. Zum Schichtplan geht jeweils die ganze Liste der kommenden Termine (`PUT /api/kasse/termine`, der Plan
ersetzt seinen Stand); offline wird später nachgeholt. Der Schlüssel ist fest im Kassen-Code (`TERMIN_SCHLUESSEL`), damit kein Gerät ihn eintippen muss; derselbe Wert liegt im Schichtplan als Secret
`KASSE_SCHLUESSEL`. Er erlaubt nur, Massagetermine in den Schichtplan zu schreiben, nichts aus der Kasse zu lesen. Wechsel: beide Stellen ändern.
Der Plan muss dafür ausgeliefert sein, siehe `ANLEITUNG.md` im Schichtplan-Repo.

**Kalender bei „Termine“:** Tag wählen, Länge (30–120 Min.) wählen, Zeit im Viertelstundenraster antippen (12:00–24:00; Tagesschicht
bis 18:30, danach Abendschicht). Belegte Zeiten und solche, an denen die Länge nicht mehr passt, sind ausgegraut. Es gibt nie zwei
Massagen zur selben Zeit, unabhängig vom Masseur; direkt aneinander anschließen geht. Das wird auch beim Speichern noch einmal geprüft
(ein anderes Gerät kann dieselbe Zeit inzwischen vergeben haben). Termine tragen `dauer`; ältere ohne Dauer zählen 60 Minuten. Zum
Schichtplan geht die Dauer im Text mit („Rücken (60 Min.)“). Im Massageplan der Kasse steht hinter dem Namen / „frei“ die Zahl der
Termine der Schicht.
