# TODO — auto_ig

> File di istruzioni per Claude Code. Antonio scrive qui cosa vuole, Claude lo esegue.
> Comando tipico: *"leggi TODO.md ed esegui il prossimo task"*.

---

## 📜 Preambolo (regole sempre valide — leggere prima di ogni task)

**Scopo.** Pagina Instagram che pubblica contenuti in automatico. Uso personale: tutto deve essere
**funzionale, semplice e intuibile**, non bello. Niente fronzoli.

**Come usare questo file (per Claude)**
1. Leggi tutto il preambolo, poi esegui i task **in ordine**, dal primo `[ ]` non spuntato.
2. A task finito: spunta `[x]` e aggiungi sotto una riga `> nota:` con cosa hai fatto / file toccati.
3. Se un task è bloccato (manca un token, una scelta, un'azione manuale): segnalo con `[!]`,
   scrivi il motivo in `> bloccato:` e passa al successivo solo se indipendente.
4. Se un task è ambiguo, **chiedi** prima di inventare.
5. Le richieste nuove di Antonio stanno in fondo, in **📥 Richieste nuove**: smistale nella fase giusta.
6. Non fare commit/push se il task non lo dice esplicitamente.

**Vincoli tecnici**
- Pubblicazione **solo** tramite API ufficiale Meta: *Instagram API with Instagram Login*
  (`graph.instagram.com`). Vietati bot che simulano login/browser su Instagram (rischio ban).
- Account Instagram **Professional** (Business o Creator). Permessi: `instagram_business_basic`,
  `instagram_business_content_publish`.
- Flusso API: crea container (`POST /{ig-id}/media`) → attendi `status_code=FINISHED` →
  `POST /{ig-id}/media_publish`. Carosello: max 10 elementi con `is_carousel_item=true`.
- I media devono stare su un **URL pubblico** (Meta li scarica). Immagini **JPEG**.
- Limite pubblicazioni: ~100 post/24h rolling (controllare sempre `GET /{ig-id}/content_publishing_limit`).
  Per una pagina sana: **max 1–3 post al giorno**.
- Token long-lived dura **60 giorni**: va rinnovato in automatico (`refresh_access_token`).
- **Segreti mai nel repo**: in `.env` locale (ignorato da git) e in GitHub Secrets.
- Ogni script che pubblica deve avere `--dry-run` (stampa le chiamate senza farle). Testare sempre prima così.

**Media e copyright**
- Immagini solo da fonti con licenza libera via API ufficiali, **solo CC0 / pubblico dominio**:
  **Wikimedia Commons** (principale, senza chiave), **Openverse** (senza chiave, spesso lento),
  **Pixabay** (opzionale, chiave gratuita). Pexels escluso: nuove chiavi sospese.
- Per ogni media salvare in `media/credits.json`: fonte, autore, URL originale, licenza.
- Video: generati **a codice con three.js** (scene 2D/3D in `auto_ig/video/scenes/`), renderizzati headless in mp4.
  Nuove scene: copiare una esistente, usare `start()` di `common.js`, tenere testi lontani dal 25% basso (caption IG).
- Formati: feed 1080×1350 JPEG; Reels 1080×1920, H.264, ≤ 90 s.

**Stack**
- Python 3.10, codice in `auto_ig/`, dipendenze in `requirements.txt`.
- Interfaccia locale in Python con **Flask** (leggera, solo 127.0.0.1, HTML semplice senza framework JS),
  lingua **italiana** per UI e commenti. Dipendenze in `.venv` (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`).
- Coda/palinsesto in `schedule/queue.yaml` (leggibile e modificabile a mano).
- Scheduling: **GitHub Actions** (cron) esegue `python -m auto_ig.publish_due`.

---

## Fase 0 — Setup manuale (lo fa Antonio, Claude fornisce istruzioni)
- [x] Convertire l'account Instagram in **Professional** (Impostazioni → Tipo di account → Creator/Business).
      > nota: account Professional già attivo: **@cintre_official**.
- [x] Creare app su developers.facebook.com → tipo *Business* → aggiungere prodotto **Instagram** →
      *API setup with Instagram login* → aggiungere l'account IG come tester.
      > nota: app creata (APP_ID/APP_SECRET in `.env`); usato il percorso Facebook Login con System User.
- [x] Generare il token dell'account (long-lived) e annotare `IG_USER_ID`. Metterli in `.env`.
      > nota: token **Facebook** (`EAA…`, percorso Facebook Login) → host `graph.facebook.com`, scelto in automatico.
      > Verificato: @cintre_official, permesso `instagram_content_publish` presente, quota 0/100 in 24h.
- [x] Rendere il token **permanente**.
      > nota: verificato con `python -m auto_ig.token_tool --info`: token **SYSTEM_USER, non scade mai**.
      > Nessuna conversione necessaria. Se in futuro il token cambia, rilanciare lo script.
- [ ] (Opzionale) Chiave API gratuita Pixabay (pixabay.com/api/docs) → `PIXABAY_API_KEY` in `.env`.
      > nota: Pexels non rilascia più nuove chiavi; non serve, Openverse funziona senza chiave.
- [x] Creare repo GitHub **pubblico**: `CharosSrl/auto_ig` (reso pubblico da Antonio).
      > nota: `MEDIA_BASE_URL=https://raw.githubusercontent.com/CharosSrl/auto_ig/main/media/` (verificato 200).
- [!] Aggiungere i Secrets `IG_ACCESS_TOKEN`, `IG_USER_ID` al repo.
      > bloccato: Claude non ha il permesso di scrivere segreti. Antonio lancia:
      > `for k in IG_ACCESS_TOKEN IG_USER_ID; do grep -m1 "^$k=" .env | cut -d= -f2- | tr -d '\n' | gh secret set "$k" --repo CharosSrl/auto_ig; done`

## Fase 1 — Core
- [x] Struttura progetto, `.gitignore`, `requirements.txt`, `.env.example`.
      > nota: creati `.gitignore` (esclude `.env`, `firebase-debug.log`), `requirements.txt`, `.env.example`, `schedule/queue.yaml`, `media/credits.json`.
- [x] `auto_ig/config.py`: carica `.env`, URL base pubblico dei media.
      > nota: `Config.from_env()` + `media_url()` (nome file → URL pubblico).
- [x] `auto_ig/ig_client.py`: container immagine/reel/carosello, polling stato, publish,
      publishing limit, refresh token, modalità dry-run.
      > nota: `IGClient` con `post_image/post_reel/post_carousel`, `publishing_limit`, `refresh_token`.
- [x] `auto_ig/queue.py`: modello Post, lettura/scrittura `schedule/queue.yaml`, validazione, post scaduti.
      > nota: `Post.validate()` controlla tipo, data ISO, n° media, caption ≤2200, ≤30 hashtag.
- [x] `auto_ig/publish_due.py`: pubblica i post scaduti e aggiorna lo stato (`--dry-run`).
      > nota: 1 post per esecuzione di default (`--max`), si ferma a 25 post/24h.
- [x] Test unitari (`tests/`) con risposte API simulate.
      > nota: `python3 -m unittest discover -s tests -t .` → 7 test OK.

## Fase 2 — Fonti immagini libere
- [x] Fonti in `auto_ig/sources/`: `wikimedia.py`, `openverse.py`, `pixabay.py` → `ImageResult` uniforme.
      > nota: Openverse oggi lento/504 (max 20 risultati anonimi): aggiunto Wikimedia Commons come fonte principale.
      > `search(..., source="auto")` usa Wikimedia + Openverse (se risponde) + Pixabay (se c'è la chiave).
- [x] Download + conversione JPEG 1080×1350 (crop centrato) in `media/`.
      > nota: `auto_ig/images.py`; provato dal vivo con Wikimedia, ritaglio verificato a occhio.
- [x] Scrittura automatica di `media/credits.json`; crediti aggiungibili in coda alla caption.
      > nota: CLI `python -m auto_ig.images cerca "..."` / `scarica "..." N [--coda DATA --caption ...]`. 11 test OK.

## Fase 3 — Interfaccia locale (Flask)
- [x] Tab **Cerca immagini**: query, anteprime con licenza, bottone "Aggiungi alla coda".
      > nota: avvio `.venv/bin/python -m auto_ig.ui` → http://127.0.0.1:5000. File: `auto_ig/ui.py`, `auto_ig/templates/`.
- [x] Tab **Coda**: tabella post (data, tipo, caption, stato), modifica, elimina, anteprima.
      > nota: elimina richiede la spunta "confermo" e rimuove anche il file media se non usato altrove.
- [x] Tab **Video**: scegli scena three.js, parametri, render, anteprima.
      > nota: render in background con avanzamento; anteprima dal vivo della scena; video pronti → "Aggiungi alla coda" come Reel.
- [x] Bottoni "Prova (dry-run)" e "Pubblica ora" (spunta "confermo" obbligatoria; bloccato se `MEDIA_BASE_URL`
      non è configurato o il file non è raggiungibile online). Quota 24h su richiesta.
      > nota: logica condivisa con la CLI tramite `publish_due.publish_one`. 15 test OK + prova dal vivo.
- [x] Bottone "Sincronizza" → fatto in Fase 5.

## Fase 4 — Video three.js
- [x] Template scena in `auto_ig/video/scenes/*.html` + `common.js` (renderer 1080×1920, `renderFrame(t)` deterministico).
      > nota: three.js r170 copiato in `auto_ig/video/vendor/` (niente CDN: funziona offline e non cambia da solo).
- [x] Render headless con Playwright (Chrome di sistema): frame per frame → JPEG in pipe → ffmpeg → mp4 1080×1920.
      > nota: H.264 yuv420p 30 fps + AAC muto + faststart, copertina JPEG automatica (`extra.cover`).
      > ~20 s di render per 4 s di video. CLI: `python -m auto_ig.video <scena> --testo ... [--coda DATA --caption ...]`.
- [x] 3 scene: `testo`, `oggetto`, `particelle`. Testo che si adatta da solo alla larghezza, fuori dalla zona caption.
      > nota: verificate a occhio le copertine; 21 test OK.

## Fase 5 — GitHub Actions
- [x] `.github/workflows/publish.yml`: cron ogni 30 min + `workflow_dispatch`; esegue `publish_due`,
      committa `queue.yaml` aggiornato.
      > nota: avvio manuale = dry-run di default. Prima esecuzione su GitHub: successo (run 43103606176).
- [x] ~~Workflow mensile di refresh token~~ non serve.
      > nota: il token è System User e non scade. Se il token smette di funzionare, il workflow fallisce e GitHub manda una mail.
- [x] Prima esecuzione manuale in dry-run.
- [x] Primo post **reale**: pubblicato da Antonio dalla UI l'11/11/2026 → https://www.instagram.com/p/Dfnd41tF9J1/
- [x] Bottone "Sincronizza" nella UI + CLI `python -m auto_ig.sync` (pull --rebase, commit di schedule/ e media/, push).

## Fase 6 — Palinsesto
- [ ] Definire con Antonio: tema pagina, frequenza, orari, tipi di contenuto.
- [ ] `schedule/plan.yaml`: regole ricorrenti (es. "lun/mer/ven 18:00 immagine tema X") che
      generano voci in coda.

---

## 📥 Richieste nuove
<!-- Antonio: scrivi qui sotto, una riga per richiesta. Claude le smista nelle fasi. -->

