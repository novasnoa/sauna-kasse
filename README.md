# Sauna-Kasse

Kleines Kassensystem für die Sauna – eine Datei (`index.html`), läuft offline im Browser.
Ordnet Einnahmen zu, macht keine fertige Buchhaltung: eher Excel-Tabelle mit Eingabemaske.

- Stammdaten mit Reitern: Mitarbeiter*innen, Masseur*innen (je mit E-Mail und Telefon), Services, Massagen, Waren, Kunden; Sicherung ganz rechts
- Bis zu zwei Schichten pro Tag, mehrere gleichzeitig offen
- Schlüssel werden beim Gehen des Gastes wieder frei und können neu vergeben werden (belegte sind gesperrt)
- Tablet/Touch: große Bedienflächen, freie Schlüssel per Antippen, Zahlart/Trinkgeld per Tippen, zweispaltig im Querformat
- Kunden je Schicht, Leistungen/Waren buchen, Massagen dem Masseur zuordnen
- Mehrere Teilzahlungen (Bar/Karte/Sonstiges); Trinkgeld standardmäßig anteilig nach Massage-Anteil an die Masseure, Rest an die Kasse (oder fester Empfänger)
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
