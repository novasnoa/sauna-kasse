# Sauna-Kasse

Kleines Kassensystem für die Sauna – eine Datei (`index.html`), läuft offline im Browser.
Ordnet Einnahmen zu, macht keine fertige Buchhaltung: eher Excel-Tabelle mit Eingabemaske.

- Stammdaten: Mitarbeiter, Masseure, Dienstleistungen (auch „Massage“), Waren, Kunden (Schlüsselnummern)
- Bis zu zwei Schichten pro Tag, mehrere gleichzeitig offen
- Schlüssel werden beim Gehen des Gastes wieder frei und können neu vergeben werden (belegte sind gesperrt)
- Kunden je Schicht, Leistungen/Waren buchen, Massagen dem Masseur zuordnen
- Mehrere Teilzahlungen (Bar/Karte/Sonstiges), Trinkgeld mit Empfänger
- Abrechnung je Schicht oder Tag zum Drucken (Zahlungsarten, Umsatz, Masseure, Trinkgeld, offene Beträge)

Daten liegen im Browser (localStorage) – unter Stammdaten → Sicherung regelmäßig herunterladen.
