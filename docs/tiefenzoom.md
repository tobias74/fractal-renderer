# Tiefenzoom jenseits von 10²⁶ – Plan (zurückgestellt am 26.09.2026)

## Anlass

Ein Vorlagenbild (eingebettete Julia-Menge als Kugel mit konzentrischen Ringen, „Julia-Morphing“) liegt bei einer
Bildbreite von **2·10⁻²⁶⁰⁸**, braucht **10,1 Millionen Iterationen** (Periode der zentralen Mini-Menge: 2 703 248) und
rechnet die Referenz mit **3520 Stellen**. Heute endet die App bei Zoom 10²⁶ und 100 000 Iterationen.

## Warum solche Stellen so tief liegen

Um eine Mini-Mandelbrot-Menge der Periode p verhält sich die p-fache Iteration fast wie z² + c. Nähert man sich ihr,
quadriert sich die Geometrie: jede weitere Strukturschicht ist zweifach gefaltet und liegt etwa beim doppelten
Exponenten der Tiefe (10⁻¹⁰ → 10⁻²⁰ → 10⁻⁴⁰ …). Nach acht bis neun solcher Stufen ist man bei 10⁻²⁶⁰⁰. Die Stelle ist
mathematisch eindeutig; eine flachere Stelle mit genau diesem Bild gibt es nicht.

Die **Wendepunkte** (seit 26.09.2026) rechnen dasselbe Quadrier-Gesetz ausdrücklich, c = p + (w − p)², und erzeugen so
den Charakter solcher Bilder schon bei 10⁻¹⁰ … 10⁻²⁰ – als eigenes, ebenso bestimmtes Bild (die Menge durch eine
Abbildung gesehen), nicht als Ausschnitt dieser Stelle.

## Heutige Grenzen

| | heute | Ziel |
|---|---|---|
| Zoom | 10²⁶ (`MAX_ZOOM`, `MAX_LOG`) | 10⁻³⁰⁰⁰ und tiefer |
| Referenz | Double-Double, ≈ 32 Stellen | beliebige Genauigkeit (Stellen ≈ Exponent + Reserve) |
| Abstände im Shader | fp32 (plus Double-Double auf der CPU) | Zahl mit eigenem Exponenten (Mantisse fp32 + Exponent i32) |
| Iterationen | 100 000 (`MAX_ITER`) | 10⁷ und mehr |
| Näherung | BLA (eine Ebene) | verkettete BLA über alle Ebenen, Sprünge über Millionen Schritte |
| Link | Dezimalstellen in `re`/`im` | Tausende Stellen, kompakt kodiert |

## Bausteine

1. **Referenzbahn in beliebiger Genauigkeit** (CPU): Festkomma auf BigInt oder eigene Mantisse/Exponent-Arithmetik,
   in einem Web Worker (später WASM). Rechenzeit: Millionen Schritte mit Tausenden Stellen – Minuten; die Bahn wird
   einmal je Referenz gerechnet und zwischengespeichert.
2. **Zahlen mit eigenem Exponenten im Shader**: (Mantisse fp32, Exponent i32) für δc und δz; Normalisieren nach jeder
   Operation. Bestimmtheit prüfen: dieselben Ergebnisse auf allen GPUs (nur IEEE-Grundoperationen, kein FMA-Zufall).
3. **Neuansetzen der Referenz** (Rebasing), wenn |z_ref + δz| < |δz|: Glitches ohne zweite Referenz vermeiden.
4. **Verkettete bilineare Näherung** (BLA-Baum über alle Stufen), damit Millionen Iterationen je Pixel in wenigen
   hundert Schritten laufen; Gültigkeitsradien mit eigenem Exponenten.
5. **Bahntextur** für Millionen Einträge (mehrere Texturen oder Speicherpuffer), dazu die BLA-Tabellen.
6. **Periode und Kern der Mini-Menge** finden (Periodenerkennung, Newton auf den Kern) – für die Navigation und als
   Referenzpunkt.
7. **Zoom-Bedienung und Link** für Exponenten jenseits von 300: Zoom logarithmisch speichern, Koordinaten kompakt.
8. **Export in Kacheln**: gleiche Referenz für alle Kacheln, bitgleich zum Bildschirm (Regel: der Link allein legt das
   Bild fest).

## Prüfbild

Eine eigene Stelle ähnlicher Art (eingebettete Julia-Menge um eine Mini-Menge hoher Periode, Tiefe um 10⁻²⁶⁰⁰,
zehn Millionen Iterationen), gesucht mit der Periodenerkennung aus Baustein 6. Die Koordinaten des fremden
Vorlagenbilds stehen bewusst nicht im Projekt.
