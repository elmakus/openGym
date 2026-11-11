# HANDOFF — openGym Engine V2 / HYBRID-2 / M6 — 2026-11-11

**Status:** przekazanie do kolejnego czatu. **Preferencja użytkownika: WIĘCEJ rzeczywistych poprawek, MNIEJ testów; nie zatrzymuj się ani nie melduj po każdej drobnej zmianie.** Działaj w większych pakietach, a końcowy raport dopiero po osiągnięciu sensownego kamienia milowego.

## 1. Repozytorium i stan roboczy

- GitHub: https://github.com/elmakus/openGym
- Gałąź walidacyjna: `validation/hybrid2-liftosaur-runtime-parity`
- HEAD sprawdzony po ostatniej poprawce: `003ed5be785e763093e79e85668c256ad39c55d9`
- Tree HEAD: `8e5d8fdde591a48e24318605491e1cace8887a03`
- Commit: https://github.com/elmakus/openGym/commit/003ed5be785e763093e79e85668c256ad39c55d9
- Ostatnia inspekcja: lokalne HEAD identyczne z remote, **czysty worktree**; aktualny checkout jest detached HEAD, nie zakładaj aktywnej lokalnej gałęzi.
- Tower/Unraid Remote Desktop Commander device ID: `63a539a1-4564-4919-ad0e-2821704d43e0`
- Robocza kopia:
  `/mnt/cachedl/projects/openGym-validation/hybrid2-runtime-parity-20261109/shared-identity-followup-20261110`
- Walidacyjny korzeń: `/mnt/cachedl/projects/openGym-validation/hybrid2-runtime-parity-20261109`
- Prywatny dowód i skrypty:
  `/mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/`
- Główny lokalny dziennik:
  `/mnt/cachedl/projects/openGym-validation/README.md`
- Oryginalny zamrożony Liftosaur runtime commit:
  `ce75750bde4a190682fb5a6fa1984fc9184a9842`
- Oryginalny zamrożony M6 źródłowy SHA-256:
  `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`.
  Nie publikuj oryginalnego prywatnego pliku Liftoscript, danych sesji, rzeczywistych ciężarów, prywatnych tokenów ani zapisów kont.

**Zgoda użytkownika:** openGym to nieużywany projekt zabawowo-testowy; wolno tworzyć własne ćwiczenia, plany, modyfikować/przepisywać historię ćwiczeń i zmieniać działające openGym na potrzeby testów. Nie rozszerzaj tego automatycznie na **aktywny Liftosaur, prywatny oryginalny program, konto Liftosaur ani inne projekty**. `main` openGym nie nadpisuj niepotrzebnie; pracuj na powyższej gałęzi, potem możesz użyć testowego konta openGym zgodnie z uprawnieniami użytkownika. Dotychczasowe proofy używały izolowanego backendu, nie produkcyjnego profilu.

## 2. Obowiązkowa kolejność czytania dla nowego agenta

1. Ten plik w całości; sprawdź HEAD i czystość worktree.
2. `docs/validation/hybrid2-runtime-parity/M6_FULL_NATIVE_36_WARMUPS_20261111.md`
3. `docs/validation/hybrid2-runtime-parity/M6_CUSTOM_NATIVE_GYM_FUTURE_DIFF_20261111.md`
4. Ostatnie wpisy `docs/validation/hybrid2-runtime-parity/STATUS.md` oraz `scripts/hybrid2-runtime-parity/README.md`
5. Tylko następnie pliki odpowiednie do zmienianego obszaru, zwłaszcza:
   - `api/training-control/hybrid2/history.js`, `h1.js`, `observation.js`, `controller.js`, `supervisor.js`, `adapter.js`, `evidence.js`
   - `frontend/src/lib/hybrid2-sync.js`, `session-start.js`, `atp2-session.js`, `finish-session.js`, `session-edit.js`, `sync-merge.js`
   - `api/engine/warmup.js`, `api/training-control/history.js`.

Nie powtarzaj od zera wielotygodniowego audytu ani już zaliczonych dużych matryc; potraktuj raporty jako bazę i przejdź do kodowania poprawek.

## 3. Co jest faktycznie ukończone

- Odtworzono oryginalny M6 jako **29 oryginalnych definicji custom exercises** i **36 wystąpień ćwiczeń** w dniach A/B/C = 11/13/12, z sześcioma współdzielonymi grupami kluczy progresji. Bez dopasowywania po nazwach do katalogu openGym.
- Pełne przypisanie **36/36 źródłowych drabinek sprzętu**; ostatnie ćwiczenie nie miało jawnego `exerciseData[type].equipment.default`, ale oryginalny ewaluowany obiekt wskazywał rzeczywisty `cable` z 39 rungami w zamrożonych ustawieniach siłowni. Nie zgaduj sprzętu po nazwie. Dwa wystąpienia są bilateralne/per-side L/R.
- Poprawiono zapisywanie czytelnych nazw custom exercises w `exerciseNameSnapshot`, także gdy definicje są już w kanonicznym profilu, ale jeszcze nie zarejestrowane globalnie. Commit `17cf837f`.
- Oryginalne sesje NORMAL/Turbo porównane przez **prawdziwe openGym start → UI → ATP2 → finish → history/replay**: sześć kolejnych sesji, 72 wykonane wystąpienia, 83 oryginalne logiczne serie, **299/299 ścisłych porównań ATP2 PASS** i dodatkowe asercje historii. Osobny test sześciu nowych native L/R workouts (cztery asymetryczne) **18/18 PASS**.
- Oryginalny runtime Liftosaur: 12 sesji scenariuszowych NORMAL, Turbo, RTT INTRO, deload w osobnych śladach, **144 wystąpienia / 155/155 odczytanych logicznych serii / 722 asercje PASS**. To **nie** 144 pełne sesje frontendowe openGym! RTT/deload z tych scenariuszy obejmują zamrożone **warianty źródła z poprawkami w pamięci**, nie koniecznie aktualny aktywny program użytkownika.
- H1: naiwne porównanie z nową pustą historią openGym dało **44 rzeczywiste różnice w polach H1**, ponieważ oryginał zawierał wcześniejsze próbki w 5/6 anchorach. Są one celowo zachowane jako RED; nie „naprawiaj” ich przez fałszowanie oczekiwań. Po jawnej inicjalizacji **rzeczywistym źródłowym stanem wejściowym H1**, 12 zapisanych obserwacji openGym daje **84/84 przyrostowych porównań PASS**. To **nie** implementacja importu starej pamięci H1.
- Oryginalne M6: **8 rozgrzewek w 6 wystąpieniach**. Naprawiono błąd `api/engine/warmup.js`: fizyczne `allowed_values` na maszynach i wyciągach muszą sterować zaokrąglaniem (nie fikcyjne 2.5 kg). **16/16 pola prescription, 16/16 UI, 8/8 zapisanych rozgrzewek wykluczonych z ATP2 PASS**. Commit `5cf3cfa0`.
- Naprawiono kolejną realną usterkę: w następnym treningu, po zmianie `ATP2 candidate`, rozgrzewka `template/smart` pozostawała oparta na historycznym ciężarze `PlanRule`. Nowy `session-start.js` odtwarza rozgrzewkę z aktualnego candidate na prawdziwej drabince, omija zamrożone deload i zachowuje oddzielną władzę ATP2 nad ciężarami roboczymi. Zapisany workout i brak warmup w historycznych work-sets sprawdzone; commit **`003ed5be`**.
- Izolowany backend HTTP openGym zaliczał rzeczywiste `PUT/GET`, konflikt `409` z poprawnym merge, odczyt z dysku i fizyczny restart dla profilu z 72 native exposures i dla profilu z 36 exposures i ośmioma ukończonymi warmupami. **Dane przetrwały**.
- Ostatnia pełna regresja: **API 1085 PASS / 0 FAIL / 3 SKIP**, celowany frontend **226/226 PASS**, build Vite PASS. Pełny frontend ma znany **niezwiązany** historyczny błąd snapshotu locale `pt-br-locale.test.js` — nie modyfikuj fingerprintu, by uzyskać zielony wynik.

## 4. Otwarte zadania — teraz poprawki, nie wielki audyt

**P1 — bezpieczny H1 bootstrap/import historycznej pamięci.**
`replayHybridHistory` startuje zawsze od `initialHybridState` i odtwarza wyłącznie zapisane w openGym strukturalne workouty. Źródłowy Liftosaur może mieć już poprzedni H1 (perf1/perf2/perf3/perfCount/perfReference/candidateGuard). Implementuj **jawny, wersjonowany, immutable i walidowany checkpoint początkowy** bądź dowodowo poprawny import historii; bez last-write-wins dla H1 i bez cichego przepisania wyników na dane z telefonu. Zdefiniuj źródło/identity/provenance, timestamp/cutover, semantykę ponownego importu, chronologię i konflikt offline. Nie upychaj wcześniejszej pamięci jako zwykłego `profile.trainingControl.hybrid2` snapshotu: `reconcileHybridHistory` go nadpisuje. Dodaj minimalne celowane regresje dla replay, błędnego baseline i konfliktu; nie przeprowadzaj kolejnych setek redundantnych scenariuszy.

**P2 — rzeczywiste końcowe RTT / queued deload w openGym.**
Istnieją native-only dowody RTT INTRO/queued→active→terminal deload, ale nie ma dowodu pełnego przejścia *każdego przyszłego stanu* przez prawdziwy frontend i backend openGym. Weź najkrótszy reproduktor źródłowy, uruchom realne `start → finish → history → next session` i **napraw faktyczne defekty** statusów/shape/frozen/queued/guards, nie tylko dopisuj testy. Zachowaj spójność kluczy współdzielonych i barrier przeciw stale H1. Frozen deload nie może zostać nadpisany normalnym ATP2/warmup. Nie traktuj native-only porównania jako dowodu pełnej zgodności openGym.

**P3 — jakość ścieżki tworzenia/importu M6 w samym openGym.**
Dotychczasowe 29 custom definitions + 36 occurrences + 9 test workouts/108 exposures i 6 source-driven workouts/72 exposures były najczęściej zapisane w **prywatnych kanonicznych plikach i izolowanym API**, a nie w aktywnym profilu openGym użytkownika. Użytkownik zezwolił na dowolne zmiany **openGym**; jeśli istnieje dostęp do jego testowej aplikacji/konta, można realnie wdrożyć playground, zrobić UI review i poprawić błędy importu/sync. Nie zgaduj adresów ani danych logowania i nie twierdź, że profil jest już wdrożony.

**P4 — poprawki drugorzędne:**
Synchronizacja offline i edycja starszych rekordów, jawne zasady zmiany daty/usunięcia structural workout, warmup po RTT/Turbo/set edit, zachowanie jednostek/per-side, ale tylko przy konkretnym reproduktorze defektu.

## 5. Zasady pracy nowego czatu (wymagane przez użytkownika)

1. **Preferuj 3–6 sensownych zmian w jednym pakiecie**, a nie rytm „jedna poprawka → 20 testów → raport → czekaj na polecenie”.
2. **Kod produkcyjny i realne ścieżki UX/API ponad sztuczny test harness.** Każdy nowy test ma wykrywać konkretną regresję; nie powtarzaj całej starej matrycy przy każdej małej zmianie. Idealnie 1–3 celowane regresje na potwierdzony błąd.
3. Uruchamiaj skupione testy podczas implementacji, `git diff --check` i build, jeśli zmieniasz frontend. Pełne API/większe suite raz przy końcu większego pakietu albo gdy zmiana przecina wiele kontrolerów. Zachowuj poprawność — „mniej testów” nie oznacza publikowania niesprawdzonego kodu.
4. **Nie melduj się po każdej poprawce.** Krótkie statusy tylko, gdy praca trwa długo, potrzebna jest decyzja lub masz ważny wykryty blokujący problem. Zbiorczy raport na końcu etapu; nie pytaj o zgodę po drobnych poprawkach.
5. Zanim edytujesz, sprawdź HEAD, stan worktree oraz aktualny kontrakt kontrolerów. Nie nadpisuj równoległych zmian innych agentów. Commituj na gałęzi walidacyjnej, podaj SHA.
6. Oryginalny Liftosaur, program prywatny, source personal load logs pozostaw read-only. Nic prywatnego do publicznego repo GitHub; skrypty i pełne profile zostają na prywatnym Unraid. Nie zmieniaj `main` bez wyraźnej konieczności.
7. Odpowiadaj **po polsku**. Raport końcowy: jakie prawdziwe defekty naprawiono, co celowo pozostało, testy właściwe dla zmian, commit i ryzyka. Zero pustych „postępów”.

## 6. Ważne prywatne dowody/fixture — tylko lokalnie na Unraid

W katalogu `/mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/`:
- `m6-custom-validation-profile.json`, `m6-opengym-canonical-test-profile.json` — 29 custom i 36 wystąpień, dziewięć syntetycznych zakończonych treningów.
- `m6-native-equipment-complete-36-profile.json` — wszystkie 36 source-backed drabinek sprzętu, dwa paired.
- `m6-complete-native-atp2-frontend-first-diff.json` — 6 native-based openGym sesji, 299 ATP2 PASS; **44 H1 baseline RED**.
- `m6-complete-source-seeded-h1-sanitized.json` — 84/84 przyrostowej zgodności źródłowej.
- `m6-36-native-warmup-three-day-canonical.json`, `m6-36-native-warmup-http-roundtrip-sanitized.json` — oryginalne 8 warmupów / 36 exposures i HTTP persist/restart.
- `m6-full-native-transcript-v5/m6-atp2-h1-multiset-private.json` — pełne oryginalne source-native sesje w prywatnym tekście; nie wysyłać do publicznego GitHub.
- Produkcyjne zestawy testowe i parser: `api/engine/warmup.equipment.test.mjs`, `scripts/hybrid2-runtime-parity/native-workout-transcript.test.mjs`, `frontend/src/lib/session-start.test.js`.

**Stan docelowy nowego czatu:** rozpocząć od P1/P2, wykonać konkretne poprawki (nie od nowa tę samą walidację), zapisać sensowny commit i jeden zbiorczy raport. Jeżeli H1 bootstrap wymaga osobnej decyzji projektowej, wybrać bezpieczne, jawnie opisane rozwiązanie i równolegle naprawić niezależne defekty z P2; nie blokować pracy bez potrzeby.

## 2026-11-11 follow-up — H1 offline/409 conflict safety

Read docs/validation/hybrid2-runtime-parity/M6_OFFLINE_H1_CONFLICT_REVIEW_20261111.md
before continuing. Since 04bd08be, the sync layer retains competing H1 evidence,
holds invalid or compatible-looking divergent completed results, rejects automatic
PUT retries, presents explicit review, replays approved history and keeps immutable
receipts. API persistence now refuses pending/structurally invalid H1 writes.
An isolated HTTP scenario verifies 409, manual synthetic review, accepted PUT,
backend restart, disk reload and deterministic Engine/ATP2/Timed/H1 replay.

Unresolved: genuine three-way per-workout ancestry, differing checkpoint resolution,
physical Android offline UX and full real M6 future Liftosaur parity. This is NOT
production-ready. No private native M6 data were published; no live changes were made.
Never merge into main or migrate without separate consent.

Final test caveat: API 1088 pass (3 skip), focused sync frontend 401 pass and
build pass; full frontend 8368 pass / 2 fail (pt-BR inherited fingerprint
and unrelated warmup unit fallback). Do not claim all-green. See the new
offline H1 review document and private Unraid test logs for evidence.
