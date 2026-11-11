"""Rende permanente il token Facebook (percorso Facebook Login).

1. token breve (EAA...) -> user token long-lived (60 giorni)  [serve APP_ID + APP_SECRET]
2. user token long-lived -> Page token della pagina collegata a Instagram (NON scade)
3. scrive il Page token in .env come IG_ACCESS_TOKEN (il token non viene mai stampato)

    python -m auto_ig.token_tool          # esegue e aggiorna .env
    python -m auto_ig.token_tool --info   # mostra solo tipo e scadenza del token attuale
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime

import requests

from .config import ROOT, load_dotenv

FB = "https://graph.facebook.com/v23.0"
ENV = ROOT / ".env"


def _get(url: str, **params) -> dict:
    data = requests.get(url, params=params, timeout=30).json()
    if "error" in data:
        sys.exit(f"ERRORE API: {data['error'].get('message')}")
    return data


def token_info(token: str, app_id: str, app_secret: str) -> dict:
    d = _get(f"{FB}/debug_token", input_token=token, access_token=f"{app_id}|{app_secret}")["data"]
    exp = d.get("expires_at") or 0
    return {"tipo": d.get("type"), "valido": d.get("is_valid"),
            "scade": datetime.fromtimestamp(exp).isoformat() if exp else "mai",
            "permessi": d.get("scopes")}


def set_env(key: str, value: str) -> None:
    text = ENV.read_text() if ENV.exists() else ""
    line = f"{key}={value}"
    text = re.sub(rf"^{key}=.*$", line, text, flags=re.M) if re.search(rf"^{key}=", text, re.M) else text + f"\n{line}\n"
    ENV.write_text(text)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--info", action="store_true", help="mostra solo info sul token attuale")
    args = ap.parse_args()

    load_dotenv()
    token, ig_id = os.environ.get("IG_ACCESS_TOKEN", ""), os.environ.get("IG_USER_ID", "")
    app_id, secret = os.environ.get("APP_ID", ""), os.environ.get("APP_SECRET", "")
    if not (token and app_id and secret):
        sys.exit("Servono IG_ACCESS_TOKEN, APP_ID e APP_SECRET in .env "
                 "(App Dashboard -> Impostazioni app -> Di base)")

    info = token_info(token, app_id, secret)
    print("Token attuale:", info)
    if args.info:
        return
    if info["valido"] and info["scade"] == "mai":
        print("Il token è già permanente (es. System User): niente da fare.")
        return

    long_user = _get(f"{FB}/oauth/access_token", grant_type="fb_exchange_token",
                     client_id=app_id, client_secret=secret, fb_exchange_token=token)["access_token"]
    pages = _get(f"{FB}/me/accounts", access_token=long_user,
                 fields="name,access_token,instagram_business_account")["data"]
    page = next((p for p in pages if p.get("instagram_business_account", {}).get("id") == ig_id), None)
    if not page:
        names = [(p["name"], p.get("instagram_business_account", {}).get("id")) for p in pages]
        sys.exit(f"Nessuna pagina Facebook collegata a IG {ig_id}. Pagine trovate: {names}")

    set_env("IG_ACCESS_TOKEN", page["access_token"])
    print(f"OK: .env aggiornato con il Page token di '{page['name']}'")
    print("Nuovo token:", token_info(page["access_token"], app_id, secret))


if __name__ == "__main__":
    main()
