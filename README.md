# Anatomical

Interaktywny atlas 3D ciała człowieka w języku polskim. Zawiera 250 struktur w sześciu warstwach anatomicznych. Możesz łączyć warstwy, czytać opisy struktur i poruszać stawami po obu stronach ciała.

## Uruchomienie

Rozpakuj ZIP, otwórz terminal w rozpakowanym folderze i uruchom polecenie:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

W systemie Windows możesz użyć `py` zamiast `python3`. Otwórz [http://localhost:8000](http://localhost:8000) w przeglądarce obsługującej WebGL 2. Archiwum zawiera wszystkie biblioteki, czcionki i modele 3D. Po uruchomieniu lokalnego serwera atlas działa bez połączenia z internetem.

## Obsługa

- Przeciągaj model, aby go obrócić. Do zmiany powiększenia użyj kółka myszy, gestu dwoma palcami lub przycisków `+` i `−`.
- Kliknij nazwę warstwy, aby wyświetlić ją osobno. Ikony oka pozwalają łączyć warstwy, a suwak zmienia przezroczystość wybranej warstwy.
- Kliknij strukturę, aby zobaczyć jej nazwę i opis funkcji. Możesz ją przybliżyć lub wyświetlić osobno.
- Wybierz staw i stronę ciała. Zmień kąt suwakiem albo kliknij „Pokaż ruch”. Narzędzie z ikoną dłoni pozwala przeciągać znaczniki stawów na modelu.

Model przedstawia jeden referencyjny wariant budowy ciała. Ruch kości i odkształcenia tkanek miękkich są obliczane na potrzeby demonstracji edukacyjnej.

Geometria 3D pochodzi z atlasów Z-Anatomy i BodyParts3D. Wersję do przeglądarek przygotował zespół Astronaut Health Intelligence Platform i udostępnił na licencji CC BY-SA 4.0. [Autorzy, licencje i dane źródłowe](dist/assets/anatomy/LICENSE.md).
