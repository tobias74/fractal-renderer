# Adreno-Fehler melden – Anleitung

## Wo

**https://crbug.com/dawn/new**

Das ist der Chromium-Tracker, Bereich Dawn. Dawn ist die WebGPU-Umsetzung in Chrome; das Team nimmt dort auch
Treiberfehler an und baut gerätespezifische Umgehungen ein. Den Link nennt das Dawn-Projekt selbst als Ort für
Fehlermeldungen (https://github.com/google/dawn).

Alternative: https://crbug.com/new mit der Komponente **Blink>WebGPU**. Dort landet es aber meist auch bei Dawn.

Du brauchst ein Google-Konto; die Meldung ist öffentlich sichtbar.

## Was du vorher selbst machen musst

1. **`repro.html` am Handy öffnen.** Das ist das Wichtigste: Die Seite ist das einzige Beispiel in dieser Meldung,
   und sie ist am betroffenen Gerät noch nicht gelaufen. Sie muss über HTTPS oder localhost geladen werden.
   - Zeigt sie **FAIL**: „Copy results as text" tippen und die Ausgabe in `ISSUE.md` an die Stelle
     `[RESULT ON THE DEVICE …]` setzen. Dann ist die Meldung vollständig.
   - Zeigt sie überall **PASS**: Die Seite stellt den Fehler nicht nach. Dann die Meldung so noch nicht absenden;
     die Testseite muss erst näher an den echten Shader heran (größer, tiefer verschachtelt).
2. **chrome://gpu vom Handy:** In Chrome auf dem Handy `chrome://gpu` öffnen, ganz nach unten scrollen und
   „Copy report to clipboard" tippen. Den Text als `chrome-gpu.txt` speichern.
3. **Platzhalter füllen:** In `ISSUE.md` die Stellen `[VERSION …]` und `[DRIVER VERSION …]` mit den Werten aus diesem
   Bericht ersetzen.
4. **Optional:** ein Foto oder Bildschirmfoto des falschen Bilds.

## Ausfüllen

- **Titel:** der Abschnitt „Title" aus `ISSUE.md`
- **Beschreibung:** alles unter „Body" aus `ISSUE.md` (Markdown wird dort dargestellt)
- **Anhänge** (Büroklammer bzw. „Add attachment"):
  - `repro.html`
  - `chrome-gpu.txt`
  - gegebenenfalls das Foto

## Hinweise

- **Dieses Paket** liegt im Repo auf dem Branch `bugreport-adreno`
  (https://github.com/tobias74/fractal-renderer/tree/bugreport-adreno/bugreport-adreno). Nach der Meldung kann der
  Branch gelöscht werden.
- **Im Text** stehen die Adresse der Seite und des Quelltexts; wenn du das nicht willst, nimm den ersten Satz unter
  „Where it was observed" heraus.
- **Keine Zugangsdaten:** Nichts in den Dateien enthält Zugangsdaten oder Serverdaten.
- **Worauf sich die Meldung stützt:** auf das, was du am Gerät gesehen hast (20.09., 21.09. und 26.–30.09.), und auf
  die Eingrenzung von damals. Die alten App-Stände, mit denen der Fehler sichtbar war, liegen nicht mehr bei.
  `repro.html` läuft am Desktop in allen 16 Fällen korrekt.
