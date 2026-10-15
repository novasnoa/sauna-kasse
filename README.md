# Sauna-Kasse

Kleines Kassensystem für die Sauna – eine Datei (`index.html`), läuft offline im Browser.
Ordnet Einnahmen zu, macht keine fertige Buchhaltung: eher Excel-Tabelle mit Eingabemaske.

- Stammdaten mit Reitern: Mitarbeiter*innen, Masseur*innen (je mit E-Mail und Telefon), Services, Massagen, Waren, Kunden; Sicherung ganz rechts
- Zwei Schichten pro Tag: Tagesschicht und Abendschicht (beide gleichzeitig offen möglich). Schicht bearbeiten (Kasse, Masseure ändern); Tagesschicht: „Schicht wechseln“ übernimmt alle anwesenden Gäste mit Schlüssel und Buchungen in die Abendschicht (Mitarbeiter und Masseure neu wählen)
- Schlüssel werden beim Gehen des Gastes wieder frei und können neu vergeben werden (belegte sind gesperrt)
- Tablet/Touch: große Bedienflächen, freie Schlüssel per Antippen, Zahlart/Trinkgeld per Tippen, zweispaltig im Querformat
- Kunden je Schicht, Leistungen/Waren buchen, Massagen dem Masseur zuordnen
- Mehrere Teilzahlungen (Bar/Karte/Sonstiges); eine gemeinsame Zahlung je Gast „Zahlung buchen“ (die Sauna nimmt alles zusammen ein; Trinkgeld anteilig: Massage-Anteil an die Masseure, Rest an die Kasse); dazu „Sonstiges Trinkgeld“ (Popup: Betrag, gleichmäßig auf angewählte Mitarbeiter und Masseure verteilt)
- Getrennte Abrechnung je Masseur (Massagen + Trinkgeld-Anteil, mit Unterschriftszeile)
- Abrechnungen per E-Mail (mailto:) an die hinterlegten Adressen: Gesamtabrechnung an die Kasse, Masseur-Abrechnung an den Masseur
- Abrechnung in zwei Teilen: **Abrechnung Sauna** (alle Einnahmen und Trinkgelder; Umsatz je Leistung/Ware; die Massagen mit den Rechnungen der Masseure
  über 70 % und dem, was der Sauna bleibt) und **Abrechnung Massage** (je Masseur: seine Massagen, Trinkgeld, „Rechnung an die Sauna: 70 %“)
- Massagen: Die Masseure stellen der Sauna 70 % des Massagepreises (ohne Trinkgeld) in Rechnung, 30 % bleiben der Sauna; gerechnet je Buchungszeile,
  gerundet auf Cent; der Satz steht in `MASSEUR_PROZENT`. Früher verkauften die Masseure selbst und zahlten 30 % Miete – alte Zahlungen mit Zuordnung
  (`kat`) zählen in der Abrechnung weiter mit.
- Abrechnung je Schicht oder Tag zum Drucken (Zahlungsarten, Umsatz, Masseure, Trinkgeld, offene Beträge)

Daten liegen im Browser (localStorage) – unter Stammdaten → Sicherung regelmäßig herunterladen.

## Offline

`sw.js` legt die Seite beim ersten Öffnen mit Netz im Zwischenspeicher ab; danach startet die Kasse auch ohne WLAN
(auf dem iPad „Zum Home-Bildschirm“ wählen). Netz zuerst, Zwischenspeicher nur als Rückfall – so ist eine neue
Fassung sofort da. Die Buchungen liegen ohnehin lokal im Browser. Oben erscheint „Offline“, solange kein Netz da ist.

## Symbole auf den Kacheln

Jede Leistung, Massage und Ware hat ein Linien-Symbol (Tabler Icons, MIT-Lizenz, in der Datei eingebettet, 254 Stück in 8 Gruppen).
Ohne eigene Wahl bestimmt die Kasse es nach Stichwörtern im Namen, sonst gilt ein Standardsymbol der Rubrik. In den Stammdaten
(Services, Massagen, Waren) lässt sich das Symbol beim Anlegen und Ändern über „Symbol ▾“ aus der ganzen Sammlung wählen, mit Suche.
Auf der Hauptseite stehen die Kacheln der drei Rubriken oben, darunter die Abrechnung des Gastes.

## Verlängerung

Der Eintritt gilt 4 Stunden. Für jede angebrochene Stunde danach bucht die Kasse selbst 1× „Verlängerung“ auf den Gast;
oben in der Gastkarte steht „n × Verlängerung gebucht“. Preis und Name kommen aus der Leistung „Verlängerung“ (Stammdaten → Services) –
ohne sie bucht die Kasse nichts und zeigt einen Hinweis. Beim „Gast geht“ zählt die zuletzt angebrochene Stunde noch mit.

## Kartengerät (SumUp Solo)

Stammdaten → „Kartengerät“: Zugriffstest, Gerät wählen, Zugang einrichten (API-Schlüssel, Affiliate-Schlüssel, App-ID, eigener Code).
Die Schlüssel liegen nur verschlüsselt auf dem Gerät (AES-GCM), nie in der Sicherung oder im Google-Abgleich; der Code wird einmal je Start der Kasse
gebraucht. Im Zahlblock (Zahlart Karte) gibt es dann „An Solo senden“: Betrag ans Solo, Trinkgeld wählt die Kundin dort (Prozente einstellbar),
die Kasse fragt das Ergebnis ab (alle 2,5 s, bis 5 Minuten) und bucht Betrag und Trinkgeld. Kein Webhook, kein Server. Bei Fehler oder Ausfall
bleibt das Eintippen am Gerät. Noch nicht an einem echten Solo erprobt.

Zwei Schalter unter „Kartengerät“, beide standardmäßig an: **Nur am Solo kassieren** (mit eingerichtetem Solo gibt es im Zahlblock weder Zahlart noch
Trinkgeldfeld noch „Zahlung buchen“, nur den Knopf „An Solo senden“) und **Trinkgeld-Voreinstellung des Solo nutzen** (die Kasse schickt keine Prozente
mit; das Trinkgeld kommt aus der Antwort). Der Knopf zeigt den Stand: blau bereit, gelb pulsierend gesendet, grün bezahlt (schließt sich nach 5 s),
rot nicht bezahlt. Ob das Solo ohne gesendete Prozente Trinkgeld anbietet, sagt die SumUp-Doku nicht – erst der Test zeigt es; sonst den zweiten
Schalter ausschalten. Gesondertes Trinkgeld bleibt über „Sonstiges Trinkgeld“.

Nach dem Senden fragt die Kasse mit der `client_transaction_id` nach, die SumUp auf den Checkout zurückgibt – nicht mit der eigenen Kennung
(`foreign_transaction_id`): Die kommt laut SumUp-Spezifikation nur mit dem Affiliate-Schlüssel an, ohne ihn liefe jede Nachfrage bis zum Zeitlimit ins Leere.

**Testmodus** (unter „Kartengerät“ oder `?testmodus=1`): ein nachgestelltes SumUp in `sumup-dummy.js` – simuliertes Solo (bezahlt mit Trinkgeld,
abgelehnt, abgebrochen, offline, verfallen), Produkte wie im SumUp, Testgäste mit Schlüssel, Störungen und ein Protokoll jedes Aufrufs. Die Kasse
arbeitet dabei mit eigenem, leerem Speicher; nichts geht an SumUp, Google oder den Schichtplan. Dieselbe Datei liegt im Schichtplan-Repo
(`public/sumup-dummy.js`) – Änderungen an beiden Stellen gleich halten. Die volle Kasse dafür mit `?modus=voll` öffnen.

## Kartenzahlung

Bei Zahlart „Karte“ steht im Zahlblock der Betrag groß (Betrag + Trinkgeld), damit man ihn am Kartengerät nur abtippt.
Das Gerät ist nicht angebunden: es läuft für sich (z. B. SumUp Solo mit eigener SIM), die Kasse bleibt ohne Internet nutzbar.

## Trinkgeld

5 % / 10 % / 15 % vom Betrag der Zahlung (ist er leer: vom Gesamtbetrag des Gastes) oder freie Summe im Feld.

Es gibt nur eine gemeinsame Zahlung je Gast; die Trennung Sauna/Massage geschieht erst in der Abrechnung. Das Trinkgeld der Zahlung wird anteilig
nach dem Massage-Anteil verteilt (je Masseur sein Anteil am Gebuchten, der Rest an den Mitarbeiter an der Kasse). Wer anders verteilen will, bucht
**Sonstiges Trinkgeld**: ein Popup mit Betrag und Zahlart; die Summe geht gleichmäßig an die angewählten Mitarbeiter und Masseure (übrige Cent der Reihe nach an die ersten).

## Abgleich über Google (mehrere Geräte)

Optional, unter Stammdaten → „Sicherung & Google“. Jedes Gerät schreibt **nur seine eigene** Datei in den
versteckten App-Ordner (`drive.appdata`) des Google-Kontos und liest die der anderen; zusammengeführt wird je
Datensatz (zuletzt geändert gewinnt, neue Sätze kommen dazu, Gelöschtes steht in `S.tot`). Dadurch können mehrere
Geräte gleichzeitig buchen, und ein neues iPad holt sich beim Anmelden den vollen Stand. Gleiche Stammdaten, die
auf zwei Geräten getrennt angelegt wurden (gleicher Name / gleiche Schlüsselnummer), werden zusammengelegt.

Einrichtung (einmalig, Anleitung auch in der App): Google-Cloud-Projekt, Drive API aktivieren,
OAuth-Client-ID (Webanwendung) mit der Quelle `https://novasnoa.github.io`, Bereich `drive.appdata`.
Die Client-ID ist kein Geheimnis; sie kann in `index.html` bei `GOOGLE_CLIENT_ID` eingetragen werden,
dann entfällt die Eingabe auf jedem Gerät.

Geprüft nur gegen eine Drive-Attrappe (siehe Commit), nicht gegen das echte Google.

## Reihenfolge der Kacheln

Nur in den Stammdaten (Services, Massagen, Waren: ▲ ▼ je Zeile); die Startseite zeigt dieselbe Reihenfolge. Sie steht je Eintrag im Feld `o`
und wandert über den Google-Abgleich auf alle Geräte. Neue Einträge stehen hinten.

## Automatische Mail an die Masseure

Stammdaten → Sicherung & Google → „✉ Abrechnung automatisch per Mail“. Nach dem Schließen oder Wechseln einer Schicht sendet die Kasse jeder
Masseurin / jedem Masseur mit Massagen oder Trinkgeld in dieser Schicht die Abrechnung (Text wie `masseurText`) über die Gmail-Schnittstelle des
angemeldeten Google-Kontos (Recht `gmail.send`, nur Senden). Der Versand ist ein Auftrag an der Schicht (`mailFaellig`) und wird bei fehlendem Netz oder
abgelaufener Anmeldung wiederholt; `mails` je Masseur verhindert Doppelversand über alle Geräte. Ohne Adresse in den Stammdaten wird beim Schließen gewarnt.
Einrichtung: Gmail API aktivieren, Bereich `gmail.send` unter „Datenzugriff“ eintragen. Nur gegen eine Attrappe geprüft, nicht gegen echtes Gmail.
