# Sauna-Kasse

Kleines Kassensystem für die Sauna – eine Datei (`index.html`), läuft offline im Browser.
Ordnet Einnahmen zu, macht keine fertige Buchhaltung: eher Excel-Tabelle mit Eingabemaske.

- Stammdaten mit Reitern: Mitarbeiter*innen, Masseur*innen (je mit E-Mail und Telefon), Services, Massagen, Waren, Kunden; Sicherung ganz rechts
- Zwei Schichten pro Tag: Tagesschicht und Abendschicht (beide gleichzeitig offen möglich). Schicht bearbeiten (Kasse, Masseure ändern); Tagesschicht: „Schicht wechseln“ übernimmt alle anwesenden Gäste mit Schlüssel und Buchungen in die Abendschicht (Mitarbeiter und Masseure neu wählen)
- Schlüssel werden beim Gehen des Gastes wieder frei und können neu vergeben werden (belegte sind gesperrt)
- Tablet/Touch: große Bedienflächen, freie Schlüssel per Antippen, Zahlart/Trinkgeld per Tippen, zweispaltig im Querformat
- Kunden je Schicht, Leistungen/Waren buchen, Massagen dem Masseur zuordnen
- Mehrere Teilzahlungen (Bar/Karte/Sonstiges); zwei Zahlblöcke je Gast: „Sauna buchen“ (Trinkgeld an den Mitarbeiter an der Kasse) und „Massage buchen“ (Trinkgeld an den gewählten Masseur, der die Massage selbst verkauft); dazu „Sonstiges Trinkgeld“ (Popup: Betrag, gleichmäßig auf angewählte Mitarbeiter und Masseure verteilt)
- Getrennte Abrechnung je Masseur (Massagen + Trinkgeld-Anteil, mit Unterschriftszeile)
- Abrechnungen per E-Mail (mailto:) an die hinterlegten Adressen: Gesamtabrechnung an die Kasse, Masseur-Abrechnung an den Masseur
- Abrechnung je Schicht oder Tag zum Drucken (Zahlungsarten, Umsatz, Masseure, Trinkgeld, offene Beträge)

Daten liegen im Browser (localStorage) – unter Stammdaten → Sicherung regelmäßig herunterladen.

## Offline

`sw.js` legt die Seite beim ersten Öffnen mit Netz im Zwischenspeicher ab; danach startet die Kasse auch ohne WLAN
(auf dem iPad „Zum Home-Bildschirm“ wählen). Netz zuerst, Zwischenspeicher nur als Rückfall – so ist eine neue
Fassung sofort da. Die Buchungen liegen ohnehin lokal im Browser. Oben erscheint „Offline“, solange kein Netz da ist.

## Trinkgeld

5 % / 10 % / 15 % vom Betrag der Zahlung (ist er leer: vom Gesamtbetrag des Gastes) oder freie Summe im Feld.

Es gibt keine Verteilungsrechnung mehr: Die Massagen verkaufen die Masseure selbst, der Tresen nimmt nur das Geld.
Trinkgeld beim **Sauna buchen** geht an den Mitarbeiter an der Kasse, beim **Massage buchen** an den Masseur, der oben in der
Gastzeile gewählt ist. Wer anders verteilen will, bucht **Sonstiges Trinkgeld**: ein Popup mit Betrag und Zahlart; die Summe geht
gleichmäßig an die angewählten Mitarbeiter und Masseure (übrige Cent der Reihe nach an die ersten).

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
