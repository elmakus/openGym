# PROMPT DO NOWEGO CZATU — openGym Engine V2 (2026-11-11)

Przejmij dalszą pracę programistyczną nad **openGym Engine V2 / HYBRID-2 / M6**.

**Repozytorium:** https://github.com/elmakus/openGym
**Gałąź:** `validation/hybrid2-liftosaur-runtime-parity`
**Ostatni potwierdzony HEAD:** `003ed5be785e763093e79e85668c256ad39c55d9`

**NAJPIERW przeczytaj cały handoff:**
`handoffs/OPENGYM_ENGINE_V2_M6_HANDOFF_2026-11-11.md`

Następnie zapoznaj się z:
- `docs/validation/hybrid2-runtime-parity/M6_FULL_NATIVE_36_WARMUPS_20261111.md`
- `docs/validation/hybrid2-runtime-parity/M6_CUSTOM_NATIVE_GYM_FUTURE_DIFF_20261111.md`
- najnowszymi wpisami `docs/validation/hybrid2-runtime-parity/STATUS.md`.

Masz dostęp do mojego Unraida przez Remote Desktop Commander. Handoff podaje dokładne lokalizacje worktree i prywatnych oryginalnych fixture/proofów. Sprawdź, czy remote HEAD i worktree są nadal aktualne, zanim coś zmienisz.

## Czego oczekuję

**Więcej prawdziwych poprawek, mniej testowania dla samego testowania.** Obecna wielka walidacja M6 dała już 36/36 źródłowych sprzętów, 299/299 ATP2, H1 source-seeded 84/84, pełne odczytanie native work-setów i zgodność rozgrzewek. **Nie zaczynaj kolejnego wielkiego audytu tych samych przypadków**.

Pracuj samodzielnie nad **pakietem kilku realnych błędów/ulepszeń**. Przejdź przede wszystkim do:
1. Poprawnego importu/bootstrapu wcześniejszej pamięci H1 z trwałą, jednoznaczną semantyką chronologii, bez niebezpiecznego last-write-wins i bez fałszowania historii.
2. Napraw realną ścieżkę **RTT INTRO → queued deload → frozen deload → powrót do NORMAL**, także przez rzeczywiste `session-start → finish → history → next session` openGym, a nie tylko przez zewnętrzny symulator.
3. W miarę potrzeb usprawnij import customowego M6, edycję historii, synchronizację/offline i przeliczanie rozgrzewek. Użytkownik **wyraźnie pozwala dowolnie tworzyć i modyfikować ćwiczenia, plany i historię w NIEUŻYWANYM openGym**. Nie zmieniaj jednak aktywnego konta/programu Liftosaur.

**Organizacja pracy:** zrób kilka poprawek w jednej serii; do każdej tylko niezbędne celowane testy regresyjne, aby wykryć realny błąd i zabezpieczyć naprawę. Pełną regresję wykonaj raz pod koniec większego pakietu, jeśli jest potrzebna. Nie buduj kolejnych ogromnych suite i nie rozpisuj kolejnych audytów zamiast zmieniać kod. Utrzymuj stabilność i poprawność.

**Nie melduj mi się po każdej poprawce i nie zatrzymuj się po jednej.** Nie pytaj o zgodę na drobne zmiany. W trakcie długiej pracy możesz krótko informować o ważnym kamieniu milowym lub blockerze, ale właściwe podsumowanie prześlij **raz na końcu większego etapu**.

**Bezpieczeństwo:** wszystkie pełne prywatne źródła Liftosaur, osobiste dane i obciążenia treningowe pozostają tylko na Unraidzie. Do publicznego GitHub wrzucaj wyłącznie bezpieczny kod, testy na syntetycznych danych i sanitizowaną dokumentację. Nie zmieniaj bez potrzeby `main`; commituj na gałęzi walidacyjnej. Nie zmieniaj prawdziwej historii w Liftosaurze.

**Odpowiadaj po polsku.** W końcowym raporcie podaj: realnie naprawione problemy, wpływ na działanie, minimalną regresję, SHA commita i co pozostaje. **Zacznij od czytania handoffu, potem przejdź od razu do implementacji.**
