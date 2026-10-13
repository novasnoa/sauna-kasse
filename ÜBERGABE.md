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

**Korrektur (13.10.2026):** Die Tagesübersicht trägt kein Datum; sie gilt immer für den Tag, der auf der Hauptseite gewählt ist. Die **Monatsübersicht** öffnet ein Tipp auf das Datum auf der Hauptseite (statt des
Datumsfelds); Tag antippen wählt ihn. In jeder Tageszelle steht unter den Namen eine kleine **Zeitlinie** (12–24 Uhr, Strich bei 18:30) mit den eingetragenen Massagen; bei vergangenen Tagen grau.

**Google-Abgleich nur von Hand (13.10.2026):** Der Hintergrundabgleich ist aus (`GOOGLE_AUTO = false` im Code): kein Abgleich beim Start, nach dem Speichern, alle 30 Sekunden, beim Zurückkehren in die App oder
bei Netz, und keine stille Google-Anmeldung. Grund: das Google-Fenster ging gelegentlich von selbst auf. Abgeglichen wird nur auf Knopfdruck (☁ oben bzw. Stammdaten → Sicherung & Google); dann darf auch das
Google-Fenster aufgehen. Der Schichtplan (plan.json) und die Termine an den Schichtplan laufen unabhängig davon. **Folge:** Termine, Stammdaten und Schichten gleichen sich zwischen Geräten nicht mehr von selbst ab.
Automatische Mails an Masseur*innen brauchen eine bestehende Anmeldung; ohne sie meldet die Kasse „Anmeldung nötig“, bis von Hand abgeglichen wurde.

**Tagesabruf bei SumUp (Test, nur lesend):** Stammdaten → Kartengerät → „Tagesabruf“ (volle Ansicht: `?modus=voll`). Holt den Verlauf eines Tages (`GET /v2.1/merchants/{code}/transactions/history`, mit Seitenfolge) und liest für jede
erfolgreiche Zahlung ab dem Mindestbetrag (Vorgabe 40 €, bis 40 Belege) den Einzelbeleg (`GET /v1.1/receipts/{id}?mid={code}`): Zeit, Betrag, Trinkgeld, Posten, Beleg-Nr.; darunter die Rohantwort des
ersten Belegs. Zweck: sehen, was die Belege des Solo wirklich enthalten, bevor das Trinkgeld den Massagen zugeordnet wird (Posten vorhanden? Zeitstempel? Trinkgeld getrennt?). Gegen echtes SumUp noch nicht erprobt (nur gegen eine Attrappe).

**Abgleich am Schichtende, Stufe 1 (13.10.2026):** In der Tagesübersicht stehen unter den Abrechnungen zwei Bereiche, Tagesschicht und Abendschicht, jeder mit dem Knopf **Abgleich**.
Er holt (nach Eingabe des SumUp-Codes, einmal je Start) den Verlauf des gewählten Tages und zu jeder erfolgreichen Zahlung ab 40 € den Einzelbeleg (nur lesend) und ordnet
die Zahlungen den Terminen der Schicht zu: Betrag ohne Trinkgeld = Preis der Länge (fest: 30 = 40 €, 40 = 55 €, 45 = 60 €, 60 = 75 €, 90 = 110 €, `MASSAGE_PREISE`); bei mehreren Treffern
gilt die zeitlich nächste Zahlung zum Terminende. Angezeigt werden Zuordnungen mit Trinkgeld, Termine ohne Zahlung und Zahlungen ohne Termin (Sammelzahlung, andere Schicht, keine Massage).
**Es wird nichts gespeichert oder verschickt.** Offen: Stufe 2 (Rückfragen bei überzähligen Zahlungen, Sammelzahlungen, Trinkgeld anteilig nach Preis), Stufe 3 (Bericht am Bildschirm, per Mail, später in den Schichtplan).
Nur mit einer Attrappe der SumUp-Schnittstelle gemessen; ob die echten Belege `tip_amount` und `receipt_no` so liefern, zeigt erst ein echter Tag (Tagesabruf unter `?modus=voll`).

**Abgleich, Stufe 2 (13.10.2026):** `abgleichBerechnen()` ordnet jetzt beide Schichten gemeinsam zu. Eine Zahlung gehört zunächst der Schicht, in der sie fiel (Grenze 18:30).
Hat eine Schicht mehr Zahlungen einer Länge als Termine und fehlt der anderen Schicht genau so eine, ist eine Verwechslung möglich: die App **fragt**, welche Zahlung zur anderen
Schicht gehört (Vorschlag: die früheste, also die vorab bezahlte); bei mehreren überzähligen wird nacheinander gefragt. Gibt es keine Wahl, wird ohne Frage verschoben. Fehlt der anderen Schicht
nichts, bleibt die Zahlung „ohne Termin“. **Sammelzahlungen:** passt der Betrag ohne Trinkgeld zur Summe von 2 oder 3 offenen Terminen, gilt sie für diese; das Trinkgeld wird nach Preis verteilt
(Trinkgeld × Preis ÷ Betrag ohne Trinkgeld). Zahlungen, die auch so zu nichts passen (z. B. Massage plus Ware), bleiben offen und werden gezeigt. Antworten gelten nur bis zum nächsten Abgleich; gespeichert wird nichts.
Gemessen mit Attrappe: Vorauszahlung (Frage, Antwort, Neuberechnung) und Sammelzahlung mit Trinkgeld. Offen: Stufe 3 (Bericht).

**Google-Knopf im Massageplan (13.10.2026):** Rechts neben „Tagesübersicht“ steht ein Knopf „☁ Google anmelden“ (`#mp-wolke`, Aktion `gMp`, Beschriftung `gMpText()`). Ungebunden: meldet bei Google an und gleicht ab; danach zeigt er „☁ ✓ Uhrzeit“, antippen = Abgleich von Hand,
bei abgelaufener Anmeldung „Bei Google anmelden“. Zweck: am Rechner (Büro) mit demselben Google-Konto Termine eintragen und sehen – Termine liegen im Abgleich (`ter`), der Rechner darf schreiben (Termine stehen nicht in `SCHREIBEND`).
Der Abgleich bleibt Handarbeit (`GOOGLE_AUTO = false`). Geprüft: Darstellung bei 1024, 820, 768 Breite ohne Überlauf; die Anmeldung selbst nur bis zum Klick (Google ist in der Testumgebung gesperrt).

**Trinkgeld an den Schichtplan (13.10.2026):** Ist ein Abgleich vollständig (keine Frage offen), erscheint je Schicht der Knopf „Trinkgeld an den Schichtplan senden“ (`mpAbglUebernehmen`).
Er schreibt das zugeordnete Trinkgeld in Cent als `tip` an jeden zugeordneten Termin (0 = Zuordnung ohne Trinkgeld; fehlt `tip`, ist es unbekannt) und stößt den Versand an. `terminPush` schickt `trinkgeld` je Termin mit (`null`, wenn unbekannt);
der Schichtplan zeigt es in der Abrechnung. Danach steht „✓ Trinkgeld im Schichtplan“. Wird die Länge eines Termins geändert, entfällt sein `tip` (anderer Preis).
**Rückwirkend:** Der Versand ersetzt die Termine im Schichtplan ab `terminVon()` – heute, bei abgeglichenem Trinkgeld eines vergangenen Tages bis zu drei Tage zurück. Termine, die dieses Gerät in diesem Zeitraum nicht kennt (nicht per Google abgeglichen), würden im Schichtplan mit ersetzt:
den Abgleich also am Gerät machen, an dem die Termine eingetragen wurden, oder vorher von Hand abgleichen. Gemessen mit Attrappe (Schichtplan-Server und SumUp).

**Korrektur (13.10.2026): automatisch statt per Knopf.** Der Knopf „Trinkgeld an den Schichtplan senden“ entfällt. `abgleichUebernehmen()` schreibt das zugeordnete Trinkgeld (`tip`, Cent) bei jeder Änderung des Abgleichs selbst in die Termine
und schickt es über `speichern()` → `terminPush()` an den Schichtplan: nach dem Abruf und nach jeder beantworteten Frage. Solange eine Frage offen ist, wird nichts gesendet. Die Anzeige „✓ Trinkgeld im Schichtplan“ bleibt.
Es gilt weiter die Warnung zum rückwirkenden Versand (`terminVon()`, bis zu drei Tage).

**Termine sofort im Schichtplan (13.10.2026):** Zwei Ursachen behoben. (1) `terminPush` übersprang einen Aufruf, während ein Versand lief, und holte ihn erst im Fünf-Minuten-Takt nach; jetzt folgt nach jedem erfolgreichen Versand sofort ein neuer Vergleich (gemessen: zweite Änderung 200 ms nach der ersten wird gleich gesendet).
(2) Der offene Schichtplan lud den Plan nur beim Öffnen; jetzt holt er alle 15 Sekunden still den Stand (Schichtplan-Repo, nach Deploy wirksam).

**Rückwirkende Änderungen an den Schichtplan (13.10.2026):** Bisher ging nur der Stand ab heute an den Schichtplan; Änderungen an vergangenen Terminen (Verschieben, Löschen, Länge, Trinkgeld) kamen nie an. Jetzt meldet `terminPush` zusätzlich `tage`:
die vergangenen Tage (bis 62 Tage zurück), deren Inhalt sich seit dem letzten erfolgreichen Versand geändert hat – oder die dieses Gerät früher gemeldet hat und die jetzt leer sind (`terminVergangen()`, Stand je Tag in `sk-termine-vergangen`).
Der Schichtplan ersetzt nur diese Tage. Ein Gerät, das alte Termine nicht kennt, berührt sie nicht. Beim ersten Lauf nach der Umstellung werden einmalig alle bekannten vergangenen Tage gemeldet (gleicher Inhalt). `terminVon()` (drei Tage Rückgriff beim Trinkgeld) entfällt.
**Voraussetzung:** Schichtplan mit dieser Schnittstelle ausgeliefert (`npm.cmd run deploy`); eine ältere Fassung ignoriert `tage`. Gemessen mit Attrappen: Änderung, Trinkgeld und Löschen eines vergangenen Termins, Server ersetzt nur den gemeldeten Tag.

**Bestätigen und Einfrieren (13.10.2026):** Ist der Abgleich einer Schicht vollständig (keine Frage offen), erscheint „Abgleich bestätigen und festschreiben“ (`mpAbglBestaetigen`, mit Rückfrage – nicht rückgängig zu machen).
Die zugeordneten Massagen bekommen `fest` (Zeitpunkt), `zid`/`zms` (Zahlung), `tip`, `sammel`. Eingefroren heißt: `terEdit`, `terEditGo`, `terEditWeg` und `terminWeg` lehnen mit Hinweis ab; ein 🔒 steht vor dem Namen (`terName`).
Ein späterer Abgleich lässt sie unberührt (`abgleichBerechnen` übernimmt sie mit der gespeicherten Zahlung, `abgleichUebernehmen` ändert ihr Trinkgeld nicht). Massagen ohne Zahlung bleiben änderbar.
**Grenzen:** Eine Entsperrung gibt es bewusst nicht in der Oberfläche; ein Irrtum ließe sich nur im Browser-Speicher (`fest` am Termin entfernen) oder über eine Sicherung beheben. Der Schichtplan erfährt von `fest` nichts, und der Google-Abgleich zwischen Geräten schützt `fest` nicht,
wenn ein anderes Gerät die Massage vor dem Abgleich noch geändert hat. Gemessen mit Attrappen: Festschreiben, Sperre von Bearbeiten und Löschen, erneuter Abgleich bleibt unverändert.

**Farbwechsel im Terminplan (13.10.2026):** Freie und gesperrte Zellen wechseln je Viertelstunde zwischen hellerem und dunklerem Ton (`tkViertel`, Klassen `v0`/`v1`; Tagesschicht beige, Abendschicht violett). Die Massagestreifen wechseln der Reihe nach (nach Beginn) durch drei Töne (`tkFarbe`, `f0`–`f2`: grau-beige, grün, sand), damit Anfang und Ende jeder Massage sofort zu sehen sind. Gilt im Massageplan und im Kalender der vollen Ansicht. Die Auswahl (`sel`) behält ihre Farbe.

**Zwei Strahlen in der Monatsübersicht (13.10.2026):** Unter den Namen steht je Tag statt der einen Linie ein Paar kleiner Zeitstrahlen ohne Beschriftung: oben die Frühschicht (12:00–18:30), darunter die Abendschicht (18:30–24:00). Eine Massage über die Grenze hinweg (z. B. 18:00–19:00) erscheint in beiden Strahlen mit ihrem Teil. Vergangene Tage grau. Der Strich bei 18:30 entfällt, weil die Grenze nun der Übergang zwischen den Strahlen ist.
