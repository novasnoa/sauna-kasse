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

## Umzug der Daten
Die Buchungen liegen im Browser (localStorage) **und** – wenn der Google-Abgleich an ist – im App-Ordner des
Google-Kontos. Unter der neuen Adresse einmal bei Google anmelden: der Stand kommt aus dem Konto zurück.
Vorher auf jedem Gerät die Sicherung herunterladen.

## Danach
GitHub Pages (`novasnoa.github.io/sauna-kasse`) kann abgeschaltet werden, sobald alle Geräte auf der neuen Adresse laufen.
