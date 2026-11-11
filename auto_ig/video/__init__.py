"""Video da scene three.js: render deterministico fotogramma per fotogramma -> mp4 per Reels.

    python -m auto_ig.video particelle --testo "Ciao" --durata 8
    python -m auto_ig.video testo --testo "..." --coda "2026-12-01T18:00:00+01:00" --caption "..."

Chrome (di sistema) headless disegna la scena; i JPEG vanno in ffmpeg via pipe.
Uscita: media/reel-<scena>-<data>.mp4 (1080x1920, H.264, 30 fps, audio AAC muto) + copertina .jpg.
"""
from __future__ import annotations

import base64
import functools
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
MAX_SECONDS = 60


def scenes() -> list[str]:
    return sorted(p.stem for p in SCENES_DIR.glob("*.html"))


def ffmpeg_cmd(out: Path, fps: int = FPS) -> list[str]:
    """Specifiche Reels: H.264 yuv420p, 30 fps, AAC, moov all'inizio (faststart)."""
    return [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-shortest", "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-r", str(fps),
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", str(out),
    ]


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
           fps: int = FPS, progress: Callable[[int, int], None] | None = None) -> tuple[str, str]:
    """Renderizza la scena. Ritorna (nome mp4, nome copertina jpg) dentro out_dir."""
    if scene not in scenes():
        raise ValueError(f"Scena '{scene}' inesistente. Disponibili: {', '.join(scenes())}")
    if not 3 <= seconds <= MAX_SECONDS:
        raise ValueError(f"Durata tra 3 e {MAX_SECONDS} secondi")
    params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
    params.update(render="1", durata=str(seconds))
    from playwright.sync_api import sync_playwright   # import qui: serve solo per il render

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    mp4, cover = out_dir / f"reel-{scene}-{stamp}.mp4", out_dir / f"reel-{scene}-{stamp}.jpg"
    frames = int(round(seconds * fps))
    cover_frame = min(frames - 1, int(fps * min(2.5, seconds / 2)))

    srv, port = _serve(VIDEO_DIR)
    ff = subprocess.Popen(ffmpeg_cmd(mp4, fps), stdin=subprocess.PIPE, stderr=subprocess.PIPE)
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
