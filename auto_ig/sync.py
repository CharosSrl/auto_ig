"""Sincronizza coda e media con GitHub (pull, commit, push).

    python -m auto_ig.sync

Le GitHub Actions committano lo stato dei post: per questo si fa sempre pull --rebase prima.

Prima di pubblicare dal PC, allineamento(post_id) controlla che PC e GitHub abbiano la stessa coda:
altrimenti GitHub Actions potrebbe ripubblicare un post già uscito (è successo il 2026-11-12).
"""
from __future__ import annotations

import subprocess

import yaml

from .config import ROOT

PATHS = ["schedule", "media"]
QUEUE = "schedule/queue.yaml"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {(r.stderr or r.stdout).strip()}")
    return r.stdout.strip()


def sync(message: str = "coda: aggiorna post e media") -> str:
    """Ritorna un messaggio leggibile con l'esito."""
    git("add", *PATHS)
    staged = git("diff", "--cached", "--name-only", "--", *PATHS)
    if staged:
        git("commit", "-m", message, "--", *PATHS)
    git("pull", "--rebase", "--autostash")
    ahead = git("rev-list", "--count", "@{u}..HEAD")
    if ahead != "0":
        git("push")
        return f"Sincronizzato: {len(staged.splitlines())} file inviati a GitHub."
    return "Già sincronizzato: niente da inviare (coda aggiornata da GitHub)."


def allineamento(post_id: str | None = None) -> list[str]:
    """Problemi che impediscono di pubblicare dal PC in sicurezza. Lista vuota = PC e GitHub allineati."""
    try:
        git("fetch", "--quiet")
    except RuntimeError as e:
        return [f"GitHub non raggiungibile ({e})"]
    problemi = []
    indietro = git("rev-list", "--count", "HEAD..@{u}")
    if indietro != "0":
        problemi.append(f"GitHub ha {indietro} aggiornamenti della coda che il PC non ha")
    if git("status", "--porcelain", "--", *PATHS):
        problemi.append("ci sono modifiche alla coda o ai media non ancora inviate a GitHub")
    elif git("rev-list", "--count", "@{u}..HEAD", "--", *PATHS) != "0":
        problemi.append("ci sono commit della coda non ancora inviati a GitHub")
    if post_id is not None:
        try:
            remoto = yaml.safe_load(git("show", f"@{{u}}:{QUEUE}")) or {}
        except (RuntimeError, yaml.YAMLError) as e:
            return problemi + [f"coda su GitHub illeggibile ({e})"]
        post = next((p for p in remoto.get("posts") or [] if str(p.get("id")) == str(post_id)), None)
        if post is None:
            problemi.append(f"il post {post_id} non è ancora su GitHub")
        elif post.get("status") == "published":
            problemi.append(f"su GitHub il post {post_id} risulta già pubblicato")
    return problemi


def main() -> None:
    print(sync())


if __name__ == "__main__":
    main()
