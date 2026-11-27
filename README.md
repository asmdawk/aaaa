# Anatomical

Interaktywny atlas 3D ciała człowieka w języku polskim. Zawiera 250 struktur w sześciu warstwach anatomicznych. Możesz łączyć warstwy, włączać etykiety ze strzałkami, czytać opisy struktur i poruszać stawami po obu stronach ciała. Osobne działy pozwalają porównać złamania oraz zbadać zmiany w przekroju kości.

## Uruchomienie

Rozpakuj ZIP, otwórz terminal w rozpakowanym folderze i uruchom polecenie:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

W systemie Windows możesz użyć `py` zamiast `python3`. Otwórz [http://localhost:8000](http://localhost:8000) w przeglądarce obsługującej WebGL 2. Archiwum zawiera wszystkie biblioteki, czcionki i modele 3D. Po uruchomieniu lokalnego serwera atlas działa bez połączenia z internetem.

## Obsługa

- Przeciągaj model, aby go obrócić. Do zmiany powiększenia użyj kółka myszy, gestu dwoma palcami lub przycisków `+` i `−`.
- Kliknij nazwę warstwy, aby wyświetlić ją osobno. Ikony oka pozwalają łączyć warstwy, a suwak zmienia przezroczystość wybranej warstwy.
- Włącz „Etykiety struktur”, aby zobaczyć nazwy widocznych struktur ze strzałkami. Kliknij etykietę lub model, aby przeczytać opis, przybliżyć strukturę albo wyświetlić ją osobno.
- Wybierz staw i stronę ciała. Zmień kąt suwakiem albo kliknij „Pokaż ruch”. Narzędzie z ikoną dłoni pozwala przeciągać znaczniki stawów na modelu.

- W dziale „Złamania kości” wybierz kość i rodzaj złamania. Przełączaj widoczność kości, szpiku, mięśni i skóry. Przycisk „Pokaż ruch odłamów” uruchamia demonstrację przemieszczenia.
- W dziale „Choroby kości” wybierz chorobę i etap w modelu. Obracaj pełną zdrową kość i przekrój kości, aby porównać powierzchnię i wnętrze.

Animacje ruchu, przekroje i zmiany chorobowe są ilustracjami edukacyjnymi. Etapy w atlasie przedstawiają przykładowe nasilenie zmian.

Geometria 3D pochodzi z atlasów Z-Anatomy i BodyParts3D. Wersję do przeglądarek przygotował zespół Astronaut Health Intelligence Platform i udostępnił na licencji CC BY-SA 4.0. [Autorzy, licencje i dane źródłowe](dist/assets/anatomy/LICENSE.md).
