"""Video da scene three.js: render deterministico fotogramma per fotogramma -> mp4 per Reels.

    python -m auto_ig.video particelle --testo "Ciao" --durata 8
    python -m auto_ig.video testo --testo "..." --coda "2026-12-01T18:00:00+01:00" --caption "..."

Chrome (di sistema) headless disegna la scena; i JPEG vanno in ffmpeg via pipe.
Uscita: media/reel-<scena>-<data>.mp4 (1080x1920, H.264, 30 fps, audio AAC muto) + copertina .jpg.
"""
from __future__ import annotations

import base64
import functools
import re
import http.server
import subprocess
import threading
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Callable

from ..config import MEDIA_DIR

VIDEO_DIR = Path(__file__).resolve().parent
SCENES_DIR = VIDEO_DIR / "scenes"
W, H = 1080, 1920
FPS = 30
MAX_SECONDS = 90


def scenes() -> list[str]:
    return sorted(p.stem for p in SCENES_DIR.glob("*.html"))


def ffmpeg_cmd(out: Path, fps: int = FPS, audio: Path | None = None, ass: Path | None = None,
               seconds: float | None = None) -> list[str]:
    """Specifiche Reels: H.264 yuv420p, 30 fps, AAC 48 kHz, moov all'inizio (faststart).
    audio: voce (wav) allungata con silenzio fino alla fine del video; senza audio traccia muta.
    ass: sottotitoli disegnati sul video (libass). ffmpeg va lanciato con cwd = ass.parent:
    nel filtro passa solo il nome del file (niente escape di percorsi)."""
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-"]
    if audio:
        cmd += ["-i", str(audio)]
        a_filter = "[1:a]aresample=48000,aformat=channel_layouts=stereo,apad[a]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        a_filter = "[1:a]anull[a]"
    if ass and not re.fullmatch(r"[A-Za-z0-9._-]+", ass.name):
        raise ValueError(f"Nome file sottotitoli non valido: {ass.name}")
    v_filter = f"[0:v]ass={ass.name}[v]" if ass else "[0:v]null[v]"
    # -t: durata esatta (con filter_complex -shortest non ferma apad, che è infinito)
    cmd += ["-filter_complex", f"{v_filter};{a_filter}", "-map", "[v]", "-map", "[a]", "-shortest",
            *(["-t", f"{seconds:.3f}"] if seconds else []),
            "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "6M", "-bufsize", "12M",
            "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-r", str(fps),
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            "-movflags", "+faststart", str(out)]
    return cmd


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def _serve(directory: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    """Server locale per le scene (i moduli ES non si caricano da file://)."""
    handler = functools.partial(_QuietHandler, directory=str(directory))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def render(scene: str, params: dict | None = None, seconds: float = 8, out_dir: Path = MEDIA_DIR,
           fps: int = FPS, progress: Callable[[int, int], None] | None = None,
           audio: Path | None = None, ass: Path | None = None, name: str | None = None) -> tuple[str, str]:
    """Renderizza la scena. Ritorna (nome mp4, nome copertina jpg) dentro out_dir.
    Con audio/ass aggiunge voce e sottotitoli; `name` fissa il nome dei file (senza estensione)."""
    if scene not in scenes():
        raise ValueError(f"Scena '{scene}' inesistente. Disponibili: {', '.join(scenes())}")
    if not 3 <= seconds <= MAX_SECONDS:
        raise ValueError(f"Durata tra 3 e {MAX_SECONDS} secondi")
    params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
    params.update(render="1", durata=str(seconds))
    from playwright.sync_api import sync_playwright   # import qui: serve solo per il render

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    base = name or f"reel-{scene}-{stamp}"
    mp4, cover = out_dir / f"{base}.mp4", out_dir / f"{base}.jpg"
    frames = int(round(seconds * fps))
    cover_frame = min(frames - 1, int(fps * min(2.5, seconds / 2)))

    srv, port = _serve(VIDEO_DIR)
    mp4, cover = mp4.resolve(), cover.resolve()
    audio = audio.resolve() if audio else None
    ff = subprocess.Popen(ffmpeg_cmd(mp4, fps, audio, ass, frames / fps), stdin=subprocess.PIPE, stderr=subprocess.PIPE,
                          cwd=ass.parent if ass else None)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="chrome", headless=True,
                                         args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
            page = browser.new_page(viewport={"width": W, "height": H})
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{port}/scenes/{scene}.html?{urllib.parse.urlencode(params)}")
            try:
                page.wait_for_function("window.sceneReady === true", timeout=20_000)
            except Exception:
                raise RuntimeError(f"La scena non si è caricata: {'; '.join(errors) or 'timeout'}")
            for i in range(frames):
                data_url = page.evaluate("t => window.grabFrame(t)", i / fps)
                jpg = base64.b64decode(data_url.split(",", 1)[1])
                ff.stdin.write(jpg)
                if i == cover_frame:
                    cover.write_bytes(jpg)
                if progress:
                    progress(i + 1, frames)
            browser.close()
        ff.stdin.close()
        if ff.wait(timeout=300) != 0:
            raise RuntimeError(f"ffmpeg: {ff.stderr.read().decode()[-500:]}")
        if ass:   # copertina presa dal video finale, così include il testo
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{cover_frame / fps:.2f}",
                            "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(cover)], check=True)
    except BaseException:
        ff.kill()
        mp4.unlink(missing_ok=True)
        cover.unlink(missing_ok=True)
        raise
    finally:
        srv.shutdown()
    return mp4.name, cover.name


def probe(path: Path) -> dict:
    """Info essenziali sul video (per verifiche)."""
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration",
                          "-of", "default=nw=1", str(path)], capture_output=True, text=True).stdout
    info: dict = {}
    for line in out.splitlines():
        k, _, v = line.partition("=")
        info.setdefault(k, []).append(v)
    return {k: v if len(v) > 1 else v[0] for k, v in info.items()}
