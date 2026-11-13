"""Interfaccia locale (Flask). Avvio:

    .venv/bin/python -m auto_ig.ui        # poi apri http://127.0.0.1:5000

Ascolta solo su 127.0.0.1: non è raggiungibile da altri computer.
"""
from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from flask import Flask, abort, flash, redirect, render_template, request, send_from_directory, url_for

from . import images, planner, queue, richieste, sync, video as vid
from .video.__main__ import add_reel_to_queue
from .config import MEDIA_DIR, QUEUE_FILE, Config
from .publish_due import SAFE_DAILY_LIMIT, make_client, publish_one
from .sources import search as default_search


def local_tz():
    return datetime.now().astimezone().tzinfo


def to_iso(value: str) -> str:
    """'2026-11-15T18:00' (input datetime-local) -> ISO con fuso orario locale."""
    return datetime.fromisoformat(value).replace(tzinfo=local_tz()).isoformat(timespec="minutes")


def to_input(iso: str) -> str:
    """ISO -> valore per <input type=datetime-local>, in ora locale."""
    try:
        return queue.Post("", iso, "image", []).when_dt().astimezone(local_tz()).strftime("%Y-%m-%dT%H:%M")
    except ValueError:
        return ""


GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]


def orario(iso) -> str:
    """ISO -> 'gio 13/11 alle 18:00' in ora locale ('' se non valido)."""
    try:
        dt = queue.Post("", str(iso), "image", []).when_dt().astimezone(local_tz())
    except ValueError:
        return ""
    return f"{GIORNI[dt.weekday()]} {dt:%d/%m} alle {dt:%H:%M}"


def stesso_orario(a, b) -> bool:
    try:
        return queue.Post("", str(a), "image", []).when_dt() == queue.Post("", str(b), "image", []).when_dt()
    except ValueError:
        return False


def default_when() -> str:
    """Prossime 18:00 (oggi se mancano almeno 30 minuti, altrimenti domani), ora locale."""
    now = datetime.now()
    target = now.replace(hour=18, minute=0, second=0, microsecond=0)
    if target - now < timedelta(minutes=30):
        target += timedelta(days=1)
    return target.strftime("%Y-%m-%dT%H:%M")


def clean(text: str) -> str:
    """Normalizza gli a capo del browser (\r\n -> \n) e toglie spazi ai bordi."""
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def media_base_ok(cfg: Config) -> bool:
    return bool(cfg.media_base_url) and "UTENTE/REPO" not in cfg.media_base_url


def create_app(queue_file: Path = QUEUE_FILE, media_dir: Path = MEDIA_DIR, cfg: Config | None = None,
               search_fn=default_search, client_factory=make_client, check_url=None,
               sync_fn=sync.sync, align_fn=sync.allineamento, github_fn=sync.coda_github, render_fn=vid.render, plan_file: Path = planner.PLAN_FILE,
               used_file: Path = planner.USED_FILE, req_dir: Path = richieste.REQ_DIR) -> Flask:
    app = Flask(__name__)
    app.secret_key = os.urandom(24)
    cfg = cfg or Config.from_env()
    credits_file = media_dir / "credits.json"
    results: dict[str, object] = {}          # ultima ricerca, chiave "fonte:id"

    def url_reachable(url: str) -> bool:
        try:
            return requests.head(url, timeout=10, allow_redirects=True).status_code == 200
        except requests.RequestException:
            return False
    check_url = check_url or url_reachable

    gh = {"t": 0.0, "coda": None, "errore": None}   # coda su GitHub, riletta al massimo ogni 60 s

    def coda_github(forza: bool = False):
        if forza or time.time() - gh["t"] > 60:
            try:
                gh.update(coda=github_fn(), errore=None)
            except Exception as e:  # noqa: BLE001
                gh.update(coda=None, errore=str(e))
            gh["t"] = time.time()
        return gh["coda"], gh["errore"]

    def find(posts, post_id):
        post = next((p for p in posts if p.id == post_id), None)
        if not post:
            abort(404)
        return post

    @app.context_processor
    def helpers():
        return {"to_input": to_input, "orario": orario, "stesso_orario": stesso_orario}

    @app.route("/")
    def home():
        return redirect(url_for("coda"))

    @app.route("/media/<path:name>")
    def media(name):
        return send_from_directory(media_dir, name)

    # --- Cerca ---------------------------------------------------------
    @app.route("/cerca")
    def cerca():
        q, fonte = request.args.get("q", "").strip(), request.args.get("fonte", "auto")
        found = []
        if q:
            try:
                found = search_fn(q, 20, fonte)
            except Exception as e:
                flash(f"Ricerca fallita: {e}", "errore")
            results.clear()
            results.update({f"{r.source}:{r.id}": r for r in found})
        return render_template("cerca.html", q=q, fonte=fonte, risultati=results, quando=default_when())

    @app.post("/aggiungi")
    def aggiungi():
        res = results.get(request.form.get("chiave", ""))
        if not res:
            flash("Risultato non trovato: rifai la ricerca.", "errore")
            return redirect(url_for("cerca"))
        try:
            name = images.save_result(res, media_dir)
            post = images.add_to_queue(name, to_iso(request.form["quando"]), clean(request.form.get("caption", "")),
                                       with_credit="crediti" in request.form,
                                       queue_path=queue_file, credits_path=credits_file)
            flash(f"Aggiunto alla coda: post {post.id} ({name})", "ok")
        except Exception as e:
            flash(f"Impossibile aggiungere: {e}", "errore")
        return redirect(request.referrer or url_for("cerca"))

    # --- Coda ----------------------------------------------------------
    @app.route("/coda")
    def coda():
        posts = sorted(queue.load(queue_file), key=lambda p: p.when_dt())
        quota = None
        if cfg.access_token and request.args.get("quota") == "1":
            try:
                quota = client_factory(cfg).publishing_limit().get("quota_usage", 0)
            except Exception as e:
                flash(f"Quota non disponibile: {e}", "errore")
        github, github_err = coda_github(forza=request.args.get("aggiorna") == "1")
        return render_template("coda.html", posts=posts, quota=quota, github=github, github_err=github_err, limite=SAFE_DAILY_LIMIT, plan_job=plan_job,
                               bozze=sum(p.status == "draft" for p in posts),
                               media_ok=media_base_ok(cfg), base_url=cfg.media_base_url)

    @app.post("/coda/<post_id>/modifica")
    def modifica(post_id):
        posts = queue.load(queue_file)
        post = find(posts, post_id)
        try:
            post.when = to_iso(request.form["quando"])
            post.caption = clean(request.form.get("caption", ""))
        except ValueError:
            flash("Data non valida.", "errore")
            return redirect(url_for("coda"))
        if post.status == "error":
            post.status, post.error = "pending", None
        if errs := post.validate():
            flash("Non salvato: " + "; ".join(errs), "errore")
            return redirect(url_for("coda"))
        queue.save(posts, queue_file)
        flash(f"Post {post.id} salvato.", "ok")
        return redirect(url_for("coda"))

    @app.post("/coda/<post_id>/elimina")
    def elimina(post_id):
        if "confermo" not in request.form:
            flash("Spunta 'confermo' per eliminare.", "errore")
            return redirect(url_for("coda"))
        posts = queue.load(queue_file)
        post = find(posts, post_id)
        posts.remove(post)
        files_of = lambda p: list(p.media) + ([p.extra["cover"]] if p.extra.get("cover") else [])
        still_used = {m for p in posts for m in files_of(p)}
        credits = images.load_credits(credits_file)
        for m in files_of(post):
            path = (media_dir / m).resolve()
            if m not in still_used and path.parent == media_dir.resolve() and path.exists():
                path.unlink()
                credits.pop(m, None)
        credits_file.write_text(json.dumps(credits, indent=2, ensure_ascii=False))
        queue.save(posts, queue_file)
        flash(f"Post {post.id} eliminato.", "ok")
        return redirect(url_for("coda"))

    @app.post("/coda/<post_id>/prova")
    def prova(post_id):
        post = find(queue.load(queue_file), post_id)
        ok, msg = publish_one(client_factory(cfg, dry_run=True), cfg, post, dry_run=True)
        flash(msg, "ok" if ok else "errore")
        return redirect(url_for("coda"))

    @app.post("/coda/<post_id>/pubblica")
    def pubblica(post_id):
        if "confermo" not in request.form:
            flash("Spunta 'confermo' per pubblicare davvero.", "errore")
            return redirect(url_for("coda"))
        if not (cfg.access_token and cfg.ig_user_id):
            flash("Manca IG_ACCESS_TOKEN o IG_USER_ID in .env.", "errore")
            return redirect(url_for("coda"))
        if not media_base_ok(cfg):
            flash("MEDIA_BASE_URL non configurato: Instagram non può scaricare i file (vedi Fase 5).", "errore")
            return redirect(url_for("coda"))
        posts = queue.load(queue_file)
        post = find(posts, post_id)
        if post.status == "published":
            flash(f"Post {post.id} è già pubblicato.", "errore")
            return redirect(url_for("coda"))
        needed = list(post.media) + ([post.extra["cover"]] if post.extra.get("cover") else [])
        missing = [m for m in needed if not check_url(cfg.media_url(m))]
        if missing:
            flash(f"File non raggiungibili all'URL pubblico (fai prima il push): {', '.join(missing)}", "errore")
            return redirect(url_for("coda"))
        # PC e GitHub devono avere la stessa coda, altrimenti GitHub Actions può ripubblicare il post
        problemi = align_fn(post.id)
        if problemi:
            flash("Non pubblico: PC e GitHub non sono allineati — " + "; ".join(problemi)
                  + ". Premi Sincronizza e riprova.", "errore")
            return redirect(url_for("coda"))
        ok, msg = publish_one(client_factory(cfg), cfg, post)
        queue.save(posts, queue_file)
        flash(msg, "ok" if ok else "errore")
        if ok:                                  # subito su GitHub: così le Actions sanno che è uscito
            try:
                flash(sync_fn(), "ok")
                gh["t"] = 0.0
            except Exception as e:  # noqa: BLE001
                flash(f"ATTENZIONE: pubblicato, ma la coda non è su GitHub ({e}). Premi Sincronizza ORA, "
                      "altrimenti GitHub Actions lo pubblica di nuovo.", "errore")
        return redirect(url_for("coda"))

    job: dict = {"running": False}            # un solo render alla volta
    job_lock = threading.Lock()

    # --- Palinsesto / bozze --------------------------------------------
    plan_job: dict = {"running": False, "log": []}

    def run_planner():
        try:
            planner.generate(plan_file, queue_file, media_dir, used_file, search_fn, render_fn,
                             log=plan_job["log"].append)
        except Exception as e:
            plan_job["log"].append(f"ERRORE: {e}")
        finally:
            plan_job["running"] = False

    @app.post("/bozze/genera")
    def bozze_genera():
        with job_lock:
            if plan_job["running"] or job["running"]:
                flash("C'è già una generazione o un render in corso.", "errore")
                return redirect(url_for("coda"))
            plan_job.update(running=True, log=[])
            threading.Thread(target=run_planner, daemon=True).start()
        return redirect(url_for("coda"))

    @app.post("/coda/<post_id>/approva")
    def approva(post_id):
        posts = queue.load(queue_file)
        post = find(posts, post_id)
        if post.status == "draft":
            post.status = "pending"
            queue.save(posts, queue_file)
            flash(f"Post {post.id} approvato: sarà pubblicato all'orario (dopo Sincronizza).", "ok")
        return redirect(url_for("coda"))

    @app.post("/bozze/approva-tutte")
    def approva_tutte():
        posts = queue.load(queue_file)
        n = 0
        for p in posts:
            if p.status == "draft":
                p.status, n = "pending", n + 1
        queue.save(posts, queue_file)
        flash(f"{n} bozze approvate. Ricordati di sincronizzare.", "ok")
        return redirect(url_for("coda"))

    @app.post("/sincronizza")
    def sincronizza():
        try:
            flash(sync_fn(), "ok")
            gh["t"] = 0.0
        except Exception as e:
            flash(f"Sincronizzazione fallita: {e}", "errore")
        return redirect(url_for("coda"))

    # --- Video ---------------------------------------------------------

    def run_render(scene, params, seconds, quality="alta"):
        def progress(i, n):
            job.update(done=i, total=n)
        try:
            mp4, cover = render_fn(scene, params, seconds, media_dir, progress=progress, quality=quality)
            job.update(result=(mp4, cover), error=None)
        except Exception as e:
            job.update(error=str(e), result=None)
        finally:
            job["running"] = False

    def unqueued_videos():
        used = {m for p in queue.load(queue_file) for m in p.media}
        vids = sorted(media_dir.glob("reel-*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True)
        return [v.name for v in vids if v.name not in used]

    @app.route("/video")
    def video():
        reqs = [(f, d, e) for f, d, e in richieste.all_requests(req_dir) if not d or d.get("stato") != "scartato"]
        github, _ = coda_github()
        per_media = {m: p for p in (github or {}).values() for m in p.get("media") or []}
        su_github = {f.name: per_media.get(f"reel-{f.name}.mp4") for f, d, e in reqs} if github is not None else None
        return render_template("video.html", scene=vid.scenes(), job=job, video=unqueued_videos(),
                               quando=default_when(), max_sec=vid.MAX_SECONDS, richieste=reqs,
                               has_video=lambda f: richieste.outputs(f)["mp4"].exists(), su_github=su_github)

    def req_folder(name: str) -> Path:
        folder = (req_dir / name).resolve()
        if folder.parent != req_dir.resolve() or not (folder / "richiesta.yaml").exists():
            abort(404)
        return folder

    @app.route("/richieste/<name>/<kind>")
    def richiesta_file(name, kind):
        if kind not in ("video.mp4", "video.jpg"):
            abort(404)
        return send_from_directory(req_folder(name) / "out", kind)

    @app.post("/richieste/<name>/coda")
    def richiesta_coda(name):
        try:
            post = richieste.enqueue(req_folder(name), to_iso(request.form["quando"]),
                                     clean(request.form.get("caption", "")), status="pending",
                                     media_dir=media_dir, queue_path=queue_file)
            flash(f"Reel in coda: post {post.id}. Ricordati di sincronizzare.", "ok")
        except Exception as e:
            flash(f"Impossibile mettere in coda: {e}", "errore")
        return redirect(url_for("video"))

    @app.post("/richieste/<name>/scarta")
    def richiesta_scarta(name):
        if "confermo" not in request.form:
            flash("Spunta 'confermo' per scartare.", "errore")
        else:
            richieste.set_state(req_folder(name), "scartato")
            flash(f"Richiesta {name} scartata.", "ok")
        return redirect(url_for("video"))

    @app.route("/video/s/<path:name>")
    def video_static(name):
        # Solo i file delle scene e three.js (per l'anteprima dal vivo nel browser)
        ok = ((name.startswith(("scenes/", "preset/")) and name.endswith((".html", ".js")))
              or name.startswith("vendor/"))
        if not ok or ".." in name:
            abort(404)
        return send_from_directory(vid.VIDEO_DIR, name)

    @app.post("/video/render")
    def video_render():
        f = request.form
        try:
            seconds = float(f.get("durata", 8))
        except ValueError:
            seconds = 0
        if f.get("scena") not in vid.scenes() or not 3 <= seconds <= vid.MAX_SECONDS:
            flash(f"Scena o durata non valida (3-{vid.MAX_SECONDS} s).", "errore")
            return redirect(url_for("video"))
        with job_lock:
            if job["running"]:
                flash("C'è già un render in corso.", "errore")
                return redirect(url_for("video"))
            params = {k: f.get(k, "") for k in ("testo", "colore", "accento")}
            job.clear()
            job.update(running=True, scene=f["scena"], done=0, total=int(seconds * vid.FPS), result=None, error=None)
            quality = "bozza" if f.get("qualita") == "bozza" else "alta"
            threading.Thread(target=run_render, args=(f["scena"], params, seconds, quality), daemon=True).start()
        return redirect(url_for("video"))

    @app.post("/video/aggiungi")
    def video_aggiungi():
        name = request.form.get("video", "")
        cover = name[:-4] + ".jpg"
        if name not in unqueued_videos():
            flash("Video non trovato.", "errore")
            return redirect(url_for("video"))
        try:
            post = add_reel_to_queue(name, cover if (media_dir / cover).exists() else "",
                                     to_iso(request.form["quando"]), clean(request.form.get("caption", "")), queue_file)
            flash(f"Reel aggiunto alla coda: post {post.id}. Ricordati di sincronizzare.", "ok")
        except Exception as e:
            flash(f"Impossibile aggiungere: {e}", "errore")
        return redirect(url_for("video"))

    @app.post("/video/elimina")
    def video_elimina():
        name = request.form.get("video", "")
        if name in unqueued_videos() and "confermo" in request.form:
            (media_dir / name).unlink(missing_ok=True)
            (media_dir / (name[:-4] + ".jpg")).unlink(missing_ok=True)
            flash(f"{name} eliminato.", "ok")
        else:
            flash("Spunta 'confermo' per eliminare.", "errore")
        return redirect(url_for("video"))

    return app


def main() -> None:
    app = create_app()
    print("Interfaccia su http://127.0.0.1:5000  (Ctrl+C per chiudere)")
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
