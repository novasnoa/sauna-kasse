# Sauna-Kasse

Kleines Kassensystem für die Sauna – eine Datei (`index.html`), läuft offline im Browser.
Ordnet Einnahmen zu, macht keine fertige Buchhaltung: eher Excel-Tabelle mit Eingabemaske.

- Stammdaten mit Reitern: Mitarbeiter*innen, Masseur*innen (je mit E-Mail und Telefon), Services, Massagen, Waren, Kunden; Sicherung ganz rechts
- Bis zu zwei Schichten pro Tag, mehrere gleichzeitig offen
- Schlüssel werden beim Gehen des Gastes wieder frei und können neu vergeben werden (belegte sind gesperrt)
- Kunden je Schicht, Leistungen/Waren buchen, Massagen dem Masseur zuordnen
- Mehrere Teilzahlungen (Bar/Karte/Sonstiges); Trinkgeld standardmäßig anteilig nach Massage-Anteil an die Masseure, Rest an die Kasse (oder fester Empfänger)
- Getrennte Abrechnung je Masseur (Massagen + Trinkgeld-Anteil, mit Unterschriftszeile)
- Abrechnungen per E-Mail (mailto:) an die hinterlegten Adressen: Gesamtabrechnung an die Kasse, Masseur-Abrechnung an den Masseur
- Abrechnung je Schicht oder Tag zum Drucken (Zahlungsarten, Umsatz, Masseure, Trinkgeld, offene Beträge)

Daten liegen im Browser (localStorage) – unter Stammdaten → Sicherung regelmäßig herunterladen.
