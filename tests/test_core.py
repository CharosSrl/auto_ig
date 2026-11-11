import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from auto_ig import queue
from auto_ig.config import Config
from auto_ig.ig_client import IGClient, IGError
from auto_ig.publish_due import run


class FakeResp:
    def __init__(self, data, status=200):
        self._d, self.status_code, self.text = data, status, str(data)

    def json(self):
        return self._d


class FakeSession:
    """Simula graph.instagram.com registrando le chiamate."""
    def __init__(self, statuses=("IN_PROGRESS", "FINISHED")):
        self.calls, self.statuses, self.n = [], list(statuses), 0

    def request(self, method, url, params=None, timeout=None):
        self.calls.append((method, url, dict(params or {})))
        if url.endswith("/media") or url.endswith("/media_publish"):
            self.n += 1
            return FakeResp({"id": f"id{self.n}"})
        if url.endswith("content_publishing_limit"):
            return FakeResp({"data": [{"quota_usage": 2}]})
        if "fields" in (params or {}):
            code = self.statuses.pop(0) if len(self.statuses) > 1 else self.statuses[0]
            return FakeResp({"status_code": code})
        return FakeResp({"error": {"message": "boh", "code": 1}}, 400)


def client(sess, **kw):
    return IGClient("TOK", "123", session=sess, sleep=lambda s: None, log=lambda m: None, **kw)


class TestClient(unittest.TestCase):
    def test_post_image_flow(self):
        s = FakeSession()
        mid = client(s).post_image("https://x/a.jpg", "ciao")
        self.assertEqual(mid, "id2")
        methods = [(m, u.rsplit("/", 1)[-1]) for m, u, _ in s.calls]
        self.assertEqual(methods[0], ("POST", "media"))
        self.assertEqual(methods[-1], ("POST", "media_publish"))
        self.assertEqual(s.calls[0][2]["image_url"], "https://x/a.jpg")
        self.assertEqual(s.calls[0][2]["access_token"], "TOK")

    def test_carousel_children(self):
        s = FakeSession(statuses=("FINISHED",))
        client(s).post_carousel(["https://x/a.jpg", "https://x/b.mp4"], "c")
        posts = [p for m, u, p in s.calls if m == "POST" and u.endswith("/media")]
        self.assertEqual(posts[0]["is_carousel_item"], "true")
        self.assertEqual(posts[1]["media_type"], "VIDEO")
        self.assertEqual(posts[2]["media_type"], "CAROUSEL")
        self.assertEqual(posts[2]["children"], "id1,id2")

    def test_host_from_token(self):
        self.assertIn("graph.facebook.com", IGClient("EAAxyz", "1").base)
        self.assertIn("graph.instagram.com", IGClient("IGAAxyz", "1").base)

    def test_container_error(self):
        s = FakeSession(statuses=("ERROR",))
        with self.assertRaises(IGError):
            client(s).post_image("https://x/a.jpg", "")

    def test_dry_run_makes_no_writes(self):
        s = FakeSession()
        client(s, dry_run=True).post_image("https://x/a.jpg", "")
        self.assertEqual(s.calls, [])


class TestQueue(unittest.TestCase):
    def setUp(self):
        self.path = Path(tempfile.mkdtemp()) / "queue.yaml"
        queue.save([
            queue.Post("1", "2026-01-01T10:00:00+00:00", "image", ["a.jpg"], "vecchio"),
            queue.Post("2", "2099-01-01T10:00:00+00:00", "image", ["b.jpg"], "futuro"),
            queue.Post("3", "2026-01-01T09:00:00+00:00", "carousel", ["only.jpg"], "rotto"),
        ], self.path)
        self.cfg = Config("TOK", "123", "v23.0", "https://cdn.example/media/")
        self.now = datetime(2026, 6, 1, tzinfo=timezone.utc)

    def test_roundtrip_and_due(self):
        posts = queue.load(self.path)
        self.assertEqual([p.id for p in queue.due(posts, self.now)], ["3", "1"])
        self.assertEqual(queue.next_id(posts), "4")
        self.assertTrue(posts[2].validate())
        self.assertFalse(posts[0].validate())

    def test_run_publishes_and_marks(self):
        s = FakeSession(statuses=("FINISHED",))
        code = run(max_posts=5, cfg=self.cfg, client=client(s), now=self.now, queue_path=self.path)
        posts = {p.id: p for p in queue.load(self.path)}
        self.assertEqual(code, 1)  # il carosello invalido fallisce
        self.assertEqual(posts["3"].status, "error")
        self.assertEqual(posts["1"].status, "published")
        self.assertEqual(posts["2"].status, "pending")
        img = [p for m, u, p in s.calls if u.endswith("/media")][0]
        self.assertEqual(img["image_url"], "https://cdn.example/media/a.jpg")

    def test_dry_run_leaves_queue(self):
        before = self.path.read_text()
        run(dry_run=True, max_posts=5, cfg=self.cfg, now=self.now, queue_path=self.path)
        self.assertEqual(before, self.path.read_text())


if __name__ == "__main__":
    unittest.main()
