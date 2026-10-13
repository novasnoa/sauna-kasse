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

**Kalender bei „Termine“:** Tag wählen, Länge wählen (30, 40, 45, 60, 90 Min.; `TK_LAENGEN` im Code), Zeit im 5-Minuten-Raster antippen
(12:00–24:00). Tages- oder Abendschicht ergibt sich aus dem Beginn (Beginn 12:00–18:25 / ab 18:30). Belegte Zeiten und solche, an denen die Länge
nicht mehr passt, sind ausgegraut. Es gibt nie zwei Massagen zur selben Zeit, unabhängig vom Masseur; direkt aneinander anschließen geht.
Das wird beim Speichern noch einmal geprüft (ein anderes Gerät kann dieselbe Zeit inzwischen vergeben haben). Je Termin: `dauer`, `gast`
(Name/Hinweis), `tel`. Die Liste unter dem Kalender zeigt nur den gewählten Tag. Zum Schichtplan gehen Beginn, „Massage (60 Min.)“ und
Name – die Telefonnummer bleibt bewusst in der Kasse. Ältere Termine ohne Dauer zählen 60 Minuten. Im Massageplan der Kasse steht hinter
dem Namen / „frei“ die Zahl der Termine der Schicht.

Im Kalender ist jede Massage ein umrandeter Kasten mit dem Massage-Symbol und dem Zeitraum („15:30–16:15“). Name und Telefon gehen gemeinsam im
Feld `gast` an den Schichtplan („Frau Meier · 0171 …“, höchstens 80 Zeichen, gekürzt wird der Name); dessen Tabelle bleibt unverändert.

Name und Telefon sind ein Feld (`gast`): „Reservieren“ öffnet sofort ein kleines Fenster mit Eingabefeld (Tastatur) und „Reservieren“ daneben; das Feld darf
leer bleiben. Über dem Kalender steht je Schicht, wer laut Schichtplan eingeteilt ist (aus plan.json; freie Plätze rot).

**Bearbeiten:** Ein Antippen eines Kastens im Kalender (oder „Bearbeiten“ in der Liste) öffnet ein Fenster für Name/Telefon, Beginn und Länge (30/40/45/60/90),
mit „Speichern“, „Abbrechen“ und „Löschen“. Der Termin selbst zählt bei der Prüfung auf Überschneidung nicht mit; bei einer Kollision bleibt das Fenster offen.
Im Kasten stehen Symbol, Zeitraum und Name/Telefon (gekürzt mit „…“, vollständig im Tooltip).

**Abrechnung Massage und Mehrwertsteuer (Stand 12.10.2026):** Die Preise sind brutto (19 % MwSt enthalten), die Sauna führt die Mehrwertsteuer auf den ganzen Umsatz ab.
Das **Trinkgeld gehört zu 100 % der Masseur*in**; auch darauf fällt Mehrwertsteuer an. Die Abrechnung Massage je Person (Ansicht und Mail) zeigt: Auflistung der Massagen mit
dem jeweiligen Trinkgeld (Trinkgeld ohne passende Massage als eigene Zeile) · **Gesamtsumme** (Massagen + Trinkgeld) · **davon Mehrwertsteuer** · **Nettobetrag** · dann beide Beträge:
mehrwertsteuerpflichtig = 70 % vom Brutto der Massagen + Trinkgeld; mehrwertsteuerbefreit = 70 % vom Netto der Massagen + Trinkgeld ohne MwSt (`rechnung()` im Code).
Beispiel 100 € Massage + 10 € Trinkgeld: 70,00 + 10,00 = 80,00 € bzw. 58,82 + 8,40 = 67,22 €. Gerundet wird auf der Summe je Person.
Stammdaten → Masseur*innen → „mehrwertsteuerpflichtig (19 %)“ (`ust`, Standard nein) bestimmt, welcher Betrag in der Sauna-Abrechnung zählt: Tabelle je Person mit Umsatz,
Trinkgeld und Rechnung, darunter die enthaltene Mehrwertsteuer der Pflichtigen und „Bleibt der Sauna aus den Massagen“ (Umsatz minus 70-%-Anteil der Massagen, vor Abführung der MwSt).

## Geräte: wer bucht? (Stammdaten → 🖥 Geräte)

Gedacht ist **ein** buchendes Gerät (das Tablet in der Sauna); der PC im Büro liest, wertet aus und pflegt Stammdaten und Termine. Jedes Gerät trägt sich beim ersten
Google-Abgleich selbst in `S.ger` ein (Name z. B. „iPad abc“, Rolle **bucht**, wie bisher). In den Stammdaten stellt man je Gerät **✍ bucht** oder **👁 nur lesen** ein (auch
für ein anderes Gerät; die Rolle wandert mit dem Abgleich), kann es umbenennen oder entfernen. Zuletzt gesehen kommt aus der Änderungszeit der Gerätedatei in Google Drive.
Ein Gerät ohne Eintrag gilt als buchend – nichts ändert sich, solange niemand umstellt. Mehrere buchende Geräte gehen (zum Testen); die Liste weist darauf hin.

„Nur lesen“ sperrt (Hinweis beim Antippen, Menge `SCHREIBEND` im Code): Schicht öffnen/wechseln/bearbeiten/schließen, Gäste aufnehmen/gehen lassen, Buchungen, Zahlungen,
Trinkgeld, „An Solo senden“, „Alle Buchungen löschen“ und das Einspielen einer Sicherung. Außerdem laufen dort **nicht**: die automatische Verlängerungsbuchung und der
automatische Mailversand. Erlaubt bleiben: Abrechnung/Auswertungen ansehen, Stammdaten (auch Mitarbeiter*innen), Termine, Massageplan, Sicherung herunterladen.
Oben zeigt ein Chip „👁 nur lesen“ an, dass das Gerät nicht bucht. Zurückstellen geht jederzeit in den Stammdaten (sie sind auch auf lesenden Geräten erreichbar).

## Modus „nur Massageplan“ (Stand 13.10.2026)

Solange die Kasse nicht kassiert (rechtliche Klärung offen, siehe `docs/kassensichv-gobd-luecken.md`), zeigt die App **nur eine Seite**: Massagetermine (Tageswahl) · Länge
(30/40/45/60/90) · Tagesschicht mit Name der Eingeteilten und Slots 12:00–18:25 · Abendschicht mit Name und Slots ab 18:30 · links **Schließen**, rechts grün **Reservieren**.
Die Seite füllt den Bildschirm und scrollt nicht (geprüft von 1024×690 bis 1366×1024 und im Hochformat). **Schließen** führt zu einer Startseite mit der Taste „Massagetermine“.
Abgeschaltet im Code (`modusMassage()`): Kasse, Abrechnung, Stammdaten, Kartengerät, Menü, Geräteliste und die Automatik (Verlängerung, Mail); `darfBuchen()` ist dort false.
Der Hintergrundabgleich (Google, Termine an den Schichtplan) läuft weiter.

**Umschalten bis zum eigenen Schalter:** Adresse `https://sauna-kassensystem.web.app/?modus=voll` zeigt die ganze Kasse, `…/?modus=massage` wieder nur den Massageplan. Die Wahl
bleibt auf dem Gerät gespeichert. Voreinstellung im Code: `MODUS_STANDARD`. Für Anmeldung bei Google, Stammdaten oder SumUp also einmal auf `?modus=voll` gehen und danach zurückstellen.

**Masseur*in je Termin:** Ganz rechts auf jedem Massagestreifen steht die Masseur*in: ausdrücklich gewählt (`mas` am Termin), sonst die Eingeteilten der Schicht laut Schichtplan.
Antippen des Streifens öffnet „Termin bearbeiten“: Anmerkung (Name/Telefon), Masseur*in (alle Personen des Schichtplans aus plan.json, ohne Owner/„Geschlossen“; Voreinstellung
„laut Schichtplan“), Beginn und Länge. Eine ausdrücklich gewählte Masseur*in geht im Text „Massage (60 Min.) · Name“ an den Schichtplan mit.

**Kopfzeilen und Übersichten im Massageplan:** Die Steuerung von „Massagetermine“ (‹ Datum › Heute) und „Länge“ (fünf Längen) ist gleich breit und links bündig (Länge steht unter dem ersten Feld
von Massagetermine); in schmalen Fenstern schrumpfen beide gleich. Ganz rechts oben steht **Tagesübersicht**: die Massagen des Tages je Masseur*in und Schicht mit Anzahl, Minuten und –
wenn der Preis bekannt ist – Betrag. Der Preis je Länge kommt aus den Massagen in den Stammdaten, deren Name die Minutenzahl enthält („Ganzkörper 60“); ohne Treffer steht „–“.
Ein Klick auf den Monat in der Tagesübersicht öffnet die **Monatsübersicht** (nahezu bildschirmfüllend): je Tag die eingeplanten Masseur*innen (T = Tagesschicht, A = Abendschicht, rot = frei)
laut Schichtplan und die Zahl der Termine; Tippen auf einen Tag wählt ihn aus.
