# U1-Rechner – Entscheidungshilfe (ES5)

## Zweck
Diese Web-Anwendung unterstützt Arbeitgeber bei der Auswahl des
wirtschaftlich sinnvollsten U1-Umlagetarifs je Krankenkasse.

## Funktionsweise
- Vergleich aller angebotenen U1-Tarife einer Krankenkasse
- Berechnung der wirtschaftlich günstigsten Tarife je Kranktage-Bereich (0–360)
- Kennzeichnung von Tarifen, die **nie wirtschaftlich optimal** sind
- Keine Eingabe von Gehältern oder Krankentagen notwendig

## Datenschutz / DSGVO
- Keine personenbezogenen Daten
- Keine Speicherung
- Keine Übertragung
- Alle Berechnungen erfolgen lokal im Browser

## Nutzung
```bash
python3 -m http.server 8000
```
Anschließend im Browser:
http://localhost:8000

Oder Deployment über GitHub Pages.

## Technik
- Reines HTML / CSS / JavaScript (ES5)
- Keine externen Bibliotheken
- Safari-, Chrome- und Firefox-kompatibel
