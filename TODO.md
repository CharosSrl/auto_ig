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
- Video: generati **a codice con three.js** (scene 2D/3D), renderizzati headless in mp4.
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
- [ ] Creare repo GitHub **pubblico** (serve per gli URL pubblici dei media) e aggiungere i Secrets:
      `IG_ACCESS_TOKEN`, `IG_USER_ID`.

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
- [ ] Tab **Video**: scegli scena three.js, parametri, render, anteprima.
      > nota: per ora segnaposto; si completa insieme alla Fase 4.
- [x] Bottoni "Prova (dry-run)" e "Pubblica ora" (spunta "confermo" obbligatoria; bloccato se `MEDIA_BASE_URL`
      non è configurato o il file non è raggiungibile online). Quota 24h su richiesta.
      > nota: logica condivisa con la CLI tramite `publish_due.publish_one`. 15 test OK + prova dal vivo.
- [ ] Bottone "Sincronizza" (commit + push di coda e media) → spostato in Fase 5, serve il repo GitHub.

## Fase 4 — Video three.js
- [ ] Template scena in `auto_ig/video/scenes/*.html` (three.js da CDN con versione fissa).
- [ ] Render headless con Playwright: frame per frame deterministico → PNG → ffmpeg → mp4 1080×1920.
- [ ] 2–3 scene di esempio (testo animato, oggetto 3D rotante, particelle).

## Fase 5 — GitHub Actions
- [ ] `.github/workflows/publish.yml`: cron ogni 30 min + `workflow_dispatch`; esegue `publish_due`,
      committa `queue.yaml` aggiornato.
- [ ] Workflow mensile di refresh token (aggiorna il Secret via `gh` con un PAT dedicato).
- [ ] Prima esecuzione manuale in dry-run, poi reale.

## Fase 6 — Palinsesto
- [ ] Definire con Antonio: tema pagina, frequenza, orari, tipi di contenuto.
- [ ] `schedule/plan.yaml`: regole ricorrenti (es. "lun/mer/ven 18:00 immagine tema X") che
      generano voci in coda.

---

## 📥 Richieste nuove
<!-- Antonio: scrivi qui sotto, una riga per richiesta. Claude le smista nelle fasi. -->

