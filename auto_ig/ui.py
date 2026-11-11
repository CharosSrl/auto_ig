"""Interfaccia locale (Flask). Avvio:

    .venv/bin/python -m auto_ig.ui        # poi apri http://127.0.0.1:5000

Ascolta solo su 127.0.0.1: non è raggiungibile da altri computer.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

import requests
from flask import Flask, abort, flash, redirect, render_template, request, send_from_directory, url_for

from . import images, queue, sync
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


def default_when() -> str:
    """Prossime 18:00 (oggi se mancano almeno 30 minuti, altrimenti domani), ora locale."""
    now = datetime.now()
    target = now.replace(hour=18, minute=0, second=0, microsecond=0)
    if target - now < timedelta(minutes=30):
        target += timedelta(days=1)
    return target.strftime("%Y-%m-%dT%H:%M")


def media_base_ok(cfg: Config) -> bool:
    return bool(cfg.media_base_url) and "UTENTE/REPO" not in cfg.media_base_url


def create_app(queue_file: Path = QUEUE_FILE, media_dir: Path = MEDIA_DIR, cfg: Config | None = None,
               search_fn=default_search, client_factory=make_client, check_url=None,
               sync_fn=sync.sync) -> Flask:
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

    def find(posts, post_id):
        post = next((p for p in posts if p.id == post_id), None)
        if not post:
            abort(404)
        return post

    @app.context_processor
    def helpers():
        return {"to_input": to_input}

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
            post = images.add_to_queue(name, to_iso(request.form["quando"]), request.form.get("caption", ""),
                                       with_credit="crediti" in request.form,
                                       queue_path=queue_file, credits_path=credits_file)
            flash(f"Aggiunto alla coda: post {post.id} ({name})", "ok")
        except Exception as e:
            flash(f"Impossibile aggiungere: {e}", "errore")
        return redirect(request.referrer or url_for("cerca"))

    # --- Coda ----------------------------------------------------------
    @app.route("/coda")
    def coda():
        posts = sorted(queue.load(queue_file), key=lambda p: p.when)
        quota = None
        if cfg.access_token and request.args.get("quota") == "1":
            try:
                quota = client_factory(cfg).publishing_limit().get("quota_usage", 0)
            except Exception as e:
                flash(f"Quota non disponibile: {e}", "errore")
        return render_template("coda.html", posts=posts, quota=quota, limite=SAFE_DAILY_LIMIT,
                               media_ok=media_base_ok(cfg), base_url=cfg.media_base_url)

    @app.post("/coda/<post_id>/modifica")
    def modifica(post_id):
        posts = queue.load(queue_file)
        post = find(posts, post_id)
        try:
            post.when = to_iso(request.form["quando"])
            post.caption = request.form.get("caption", "")
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
        still_used = {m for p in posts for m in p.media}
        credits = images.load_credits(credits_file)
        for m in post.media:
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
        missing = [m for m in post.media if not check_url(cfg.media_url(m))]
        if missing:
            flash(f"File non raggiungibili all'URL pubblico (fai prima il push): {', '.join(missing)}", "errore")
            return redirect(url_for("coda"))
        ok, msg = publish_one(client_factory(cfg), cfg, post)
        queue.save(posts, queue_file)
        flash(msg, "ok" if ok else "errore")
        return redirect(url_for("coda"))

    @app.post("/sincronizza")
    def sincronizza():
        try:
            flash(sync_fn(), "ok")
        except Exception as e:
            flash(f"Sincronizzazione fallita: {e}", "errore")
        return redirect(url_for("coda"))

    # --- Video ---------------------------------------------------------
    @app.route("/video")
    def video():
        return render_template("video.html")

    return app


def main() -> None:
    app = create_app()
    print("Interfaccia su http://127.0.0.1:5000  (Ctrl+C per chiudere)")
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
