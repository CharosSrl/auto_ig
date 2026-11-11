import io
import shutil
import tempfile
import time
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

from PIL import Image

from auto_ig import planner, queue
from auto_ig.config import Config
from auto_ig.sources import ImageResult
from auto_ig.ui import create_app

PLAN = Path(__file__).resolve().parent.parent / "schedule" / "plan.yaml"


def jpeg(*a, **k):
    buf = io.BytesIO()
    Image.new("RGB", (1500, 2000), (10, 20, 30)).save(buf, "JPEG")
    return buf.getvalue()


class Base(unittest.TestCase):
    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.qf, self.md, self.used, self.plan = d / "q.yaml", d / "media", d / "usati.txt", d / "plan.yaml"
        self.md.mkdir()
        shutil.copy(PLAN, self.plan)
        self.searches = []
        self.dl = mock.patch("auto_ig.images.download_bytes", jpeg)
        self.dl.start()
        self.addCleanup(self.dl.stop)
        tz = planner.local_tz()
        self.now = datetime(2026, 11, 16, 9, 0, tzinfo=tz)      # lunedì mattina

    def search(self, term, n, fonte):
        self.searches.append(term)
        return [ImageResult("wikimedia", f"{term}-{i}", "https://x/i.jpg", "t", "p", "Autore", "CC0", "",
                            2000, 2000, f"{term} {i}") for i in range(3)]

    def render(self, scene, params, seconds, out_dir):
        self.rendered = (scene, params)
        (out_dir / f"reel-{scene}.mp4").write_bytes(b"x")
        (out_dir / f"reel-{scene}.jpg").write_bytes(b"x")
        return f"reel-{scene}.mp4", f"reel-{scene}.jpg"

    def gen(self):
        return planner.generate(self.plan, self.qf, self.md, self.used, self.search, self.render,
                                now=self.now, log=lambda m: None)


class TestPlanner(Base):
    def test_fills_week_with_alternating_drafts(self):
        created = self.gen()
        self.assertEqual(len(created), 7)
        self.assertTrue(all(p.status == "draft" for p in created))
        self.assertEqual({p.type for p in created}, {"image", "reel"})
        days = [p.when_dt().astimezone(planner.local_tz()) for p in created]
        self.assertEqual(days[0].date(), self.now.date())                  # oggi alle 18 è ancora libero
        self.assertTrue(all(d.hour == 18 and d.minute == 0 for d in days))
        self.assertEqual(len({d.date() for d in days}), 7)
        types = [p.type for p in created]
        self.assertTrue(all(a != b for a, b in zip(types, types[1:])))     # alternanza
        img = next(p for p in created if p.type == "image")
        self.assertIn("#moda", img.caption)
        self.assertIn("📷 Autore via Wikimedia (CC0)", img.caption)
        reel = next(p for p in created if p.type == "reel")
        self.assertTrue(reel.extra["cover"].endswith(".jpg"))
        self.assertEqual(self.gen(), [])                                    # seconda volta: niente da fare

    def test_drafts_never_published_and_no_repeat_images(self):
        created = self.gen()
        later = self.now + timedelta(days=30)
        self.assertEqual(queue.due(queue.load(self.qf), later), [])          # bozze escluse
        ids = self.used.read_text().splitlines()
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), sum(p.type == "image" for p in created))

    def test_skips_taken_days_and_late_today(self):
        posts = [queue.Post("1", (self.now + timedelta(days=1)).replace(hour=12).isoformat(), "image", ["a.jpg"])]
        queue.save(posts, self.qf)
        late = self.now.replace(hour=17, minute=45)
        slots = planner.free_slots(planner.load_plan(self.plan), posts, late)
        dates = [s.date() for s in slots]
        self.assertNotIn(self.now.date(), dates)                            # oggi: mancano < 30 min
        self.assertEqual(len(dates), 6)                                     # 7 giorni da domani, meno quello occupato
        self.assertNotIn((self.now + timedelta(days=1)).date(), dates)      # domani già occupato


class TestPlannerUI(Base):
    def test_generate_and_approve_from_ui(self):
        app = create_app(self.qf, self.md, Config("", "", "v23.0", "https://cdn/media/"),
                         search_fn=self.search, render_fn=self.render, sync_fn=lambda: "",
                         plan_file=self.plan, used_file=self.used)
        app.testing = True
        c = app.test_client()
        c.post("/bozze/genera")
        for _ in range(200):
            if "in corso".encode() not in c.get("/coda").data:
                break
            time.sleep(0.02)
        page = c.get("/coda").data.decode()
        self.assertIn("bozza", page)
        self.assertIn("Approva tutte le bozze (", page)
        first = queue.load(self.qf)[0]
        c.post(f"/coda/{first.id}/approva")
        self.assertEqual(queue.load(self.qf)[0].status, "pending")
        c.post("/bozze/approva-tutte")
        self.assertTrue(all(p.status == "pending" for p in queue.load(self.qf)))


if __name__ == "__main__":
    unittest.main()
