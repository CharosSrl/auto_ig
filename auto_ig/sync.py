"""Sincronizza coda e media con GitHub (pull, commit, push).

    python -m auto_ig.sync

Le GitHub Actions committano lo stato dei post: per questo si fa sempre pull --rebase prima.
"""
from __future__ import annotations

import subprocess

from .config import ROOT

PATHS = ["schedule", "media"]


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


def main() -> None:
    print(sync())


if __name__ == "__main__":
    main()
