# KassenSichV und GoBD – wo die Kasse steht (Lückenanalyse)

Stand 12.10.2026. Das ist **keine Rechts- oder Steuerberatung**, sondern eine technische Bestandsaufnahme gegen die gängigen Anforderungen, als Grundlage
für das Gespräch mit der Steuerberatung. Verbindlich sind AO § 146a, KassenSichV, die GoBD (BMF-Schreiben) und die DSFinV-K.

## Vorab klären (Steuerberatung, vor jeder Entwicklung)

1. Ist diese App für die Sauna ein **elektronisches Aufzeichnungssystem** im Sinne § 146a AO (sie erfasst Bar- und Kartenumsätze je Gast)? Wenn ja, gelten TSE-Pflicht,
   Belegausgabe, Mitteilung ans Finanzamt und DSFinV-K. Oder gibt es bereits eine zertifizierte Kasse, und diese App ist nur Schicht-/Masseurabrechnung (Nebenaufzeichnung)?
2. Wie sind **Kartenzahlungen am SumUp Solo** zu behandeln, wenn die Kasse sie nur abfragt?
3. Aufbewahrungsfristen (Buchungsbelege / Aufzeichnungen) und Form des Archivs.
4. Besteht eine **Belegausgabepflicht** bzw. kommt eine Befreiung nach § 148 AO in Frage?
5. Umsatzsteuer: Preise brutto, welcher Steuersatz je Leistung/Ware/Massage (heute nicht erfasst).
6. Wer ist Betreiber (Meldung über Mein ELSTER), und ist die Kasse dort schon gemeldet?

## Bestandsaufnahme

| Anforderung | Stand der App | Lücke |
|---|---|---|
| **TSE** (zertifiziert, BSI) signiert jeden Vorgang | keine | **fehlt ganz.** Eine USB-/SD-TSE ist aus dem Browser des iPads nicht ansprechbar; realistisch nur eine **Cloud-TSE** (z. B. fiskaly) über eine API, besser über einen kleinen eigenen Server als aus dem Browser. Die Cloud-TSE hält Daten nur begrenzt vor, ein **eigenes Archiv** ist nötig. |
| **Einzelaufzeichnung** (Datum, Uhrzeit, Artikel, Preis, Steuersatz, Zahlart) | Buchungen mit Name, Preis, Menge, Uhrzeit; Zahlungen mit Art und Betrag | Steuersatz je Position fehlt; Kassen-/Beleg-ID fehlt |
| **Unveränderbarkeit** (kein Löschen/Überschreiben, Storno als Gegenbuchung) | Buchungen und Zahlungen lassen sich **löschen** (`buchWeg`, `zahlWeg`), „Alle Buchungen löschen“, Sicherung **einspielen** ersetzt den Stand, Löschvermerke im Abgleich | **widerspricht GoBD.** Nötig: Storno als negativer Vorgang, abgeschlossene Schichten gesperrt, Änderungsprotokoll, kein Löschen von Buchungen |
| **Lückenlose fortlaufende Belegnummern** | keine | fehlt |
| **Belegausgabe** (Papier oder digital, mit TSE-Daten/QR) | Abrechnung/Mail an Masseur*innen, kein Kundenbeleg | fehlt |
| **Kassenabschluss** (Tages-/Z-Bericht) | Abrechnung je Schicht und Tag | Form und Unveränderbarkeit nach DSFinV-K fehlen |
| **DSFinV-K-Export** | nur eigene JSON-Sicherung | fehlt |
| **Aufbewahrung** (lesbar, unveränderbar, Jahre) | localStorage im Gerät, Google Drive (App-Ordner), Sicherung als Datei | kein revisionssicheres Archiv, keine Fristenverwaltung |
| **Verfahrensdokumentation** | README, ÜBERGABE.md (technisch, nicht in GoBD-Form) | fehlt in der geforderten Form |
| **Mitteilung ans Finanzamt** (Mein ELSTER, Seriennummer, TSE-Zertifikats-ID) | – | organisatorisch, erst nach TSE |
| **Zugriffs- und Protokollierung** (wer hat wann was getan) | Geräteliste (neu), keine Benutzer, nur Geräte-PIN für Abrechnung/Stammdaten | Benutzerbezug und Änderungsjournal fehlen |

## Wege

**A. Zertifizierte Kasse für die Umsätze nutzen** (z. B. ein am Markt etabliertes Kassensystem mit TSE und DSFinV-K) und diese App als internes Werkzeug für
Schichten, Termine und Masseur*innen-Abrechnung weiterführen. Geringster Entwicklungsaufwand und Haftungsrisiko; ob die App dann noch als Aufzeichnungssystem
gilt, klärt die Steuerberatung.

**B. Die App selbst konform machen.** Mehrere Stufen, jede für sich additiv und prüfbar:
1. *Ohne TSE nützlich:* Storno statt Löschen, gesperrte Schichten, Änderungsjournal, fortlaufende Belegnummern, Steuersatz je Position, unveränderbares Archiv + Export.
2. *TSE-Anbindung* über einen kleinen eigenen Server (Cloud-TSE, DSFinV-K-Taxonomie), Belege mit QR/TSE-Daten.
3. *DSFinV-K-Export*, Kassenabschluss, Mitteilung über Mein ELSTER, Verfahrensdokumentation.
Das ist ein Projekt über Wochen, braucht einen Server (Kosten, Betrieb) und einen Vertrag mit einem TSE-Anbieter – und bleibt nur konform, solange jede Änderung am
Code die Anforderungen weiter erfüllt.

## Empfehlung

Zuerst die sechs Fragen oben mit der Steuerberatung klären. Davon hängt ab, ob Weg A genügt oder Weg B nötig ist. Stufe 1 von Weg B (Storno, Sperren,
Journal, Belegnummern) lohnt sich in jedem Fall, weil sie auch ohne TSE die Nachvollziehbarkeit verbessert – sie ersetzt aber **nicht** die TSE-Pflicht.
