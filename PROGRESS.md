# Postęp projektu

## Obecny stan
Projekt to aplikacja webowa built with Next.js (App Router) i Cloudflare R2. Użytk mogą uploadować zdjęcia i filmy, browse galerię, lajkować, usuwać swoje pliki, pobierać je oraz udostępniać link via QR code. Interfejs responsywny, ciemny/jasny motyw, obsługa dotyku (zoom, swipe).

### Ukończone zadania
- Konfiguracja Next.js, Tailwind CSS, TypeScript.
- Integracja z Cloudflare R2 (upload, download, list, delete).
- Endpointy API: upload-url, download, photos (GET/DELETE), like.
- Strona główna (page.tsx) z uploadem, galerią, like, download, QR.
- Transformacje plików (obrazki: resize, rotate, flip; wideo: miniaturka).
- Ciemny motyw z zachowaniem preferencji.
- Paginacja galerii (pokaż więcej / zwiń).
- Optymistyczna aktualizacja lajków.

## Planowane zadania
1. **Bezpieczeństwo i autoryzacja**
   - Dodać autoryzację (np. NextAuth, klucz API) do endpointsów wrażliwych (delete, like).
   - Ograniczenie uploadów (rate limiting).
2. **Skalowalność i wydajność**
   - Paginacja po stronie serwera (cursor-based) dla `GET /api/photos`.
   - Generowanie miniatur na serwerze (np. Cloudflare Workers) zamiast po stronie klienta.
   - Cache'owanie obrazów (CDN).
3. **Funkcje społecznościowe**
   - Komentarze do zdjęcia.
   - Udostępnianie indywidualnych linków.
   - Powiadomienia email (np. po uploadzie).
4. **Narzedzia developerskie**
   - Testy jednostkowe (Vitest) dla logiki API i transformacji.
   - Linting i formatowanie (ESLint, Prettier).
   - CI/CD pipeline (GitHub Actions).
5. **Deployment i konfiguracja**
   - Skonfigurować zmienne środowiskowe w Vercel (R2 credentials).
   - Dodać CORS do bucketu R2.
   - Optymalizacja budowania (Next.js analyze-bundle).
6. **Ulepszenia UX**
   - Progress bar globalny.
   - Toast notifikacje.
   - Dostępność (a11y).

## Uwagi
- Aktualnie brak mechanizmu zabezpieczającego przed dublowaniem lajków (brak ETag/conditional write).
- Limit plików: tylko client-side walidacja, brak limitu na serwerze.
