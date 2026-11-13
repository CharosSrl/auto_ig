import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from auto_ig import sync

CODA = """posts:
- id: '1'
  when: 2026-11-13T18:00+01:00
  type: reel
  media: [a.mp4]
  caption: ciao
  status: {stato}
"""


def sh(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)


class TestAllineamento(unittest.TestCase):
    """Repo di prova: 'github' (bare) + 'pc' e 'actions' (due cloni che pubblicano)."""

    def setUp(self):
        d = Path(tempfile.mkdtemp())
        self.github, self.pc, self.actions = d / "github.git", d / "pc", d / "actions"
        sh(d, "init", "-q", "--bare", "-b", "main", str(self.github))
        for clone in (self.pc, self.actions):
            sh(d, "clone", "-q", str(self.github), str(clone))
            sh(clone, "config", "user.email", "t@t"); sh(clone, "config", "user.name", "t")
        self.scrivi(self.pc, "pending"); sh(self.pc, "push", "-q", "-u", "origin", "main")
        sh(self.actions, "pull", "-q", "origin", "main")
        patch = mock.patch.object(sync, "ROOT", self.pc); patch.start(); self.addCleanup(patch.stop)

    def scrivi(self, repo, stato, commit=True):
        (repo / "schedule").mkdir(exist_ok=True)
        (repo / "schedule" / "queue.yaml").write_text(CODA.format(stato=stato))
        if commit:
            sh(repo, "add", "-A"); sh(repo, "commit", "-q", "-m", f"coda {stato}")

    def test_allineato(self):
        self.assertEqual(sync.allineamento("1"), [])

    def test_github_ha_gia_pubblicato(self):
        # le Actions pubblicano e committano: il PC è indietro e il post su GitHub è già uscito
        self.scrivi(self.actions, "published"); sh(self.actions, "push", "-q")
        problemi = " ".join(sync.allineamento("1"))
        self.assertIn("aggiornamenti", problemi)
        self.assertIn("già pubblicato", problemi)

    def test_modifiche_locali_non_inviate(self):
        self.scrivi(self.pc, "published", commit=False)
        self.assertIn("non ancora inviate", " ".join(sync.allineamento("1")))
        sh(self.pc, "add", "-A"); sh(self.pc, "commit", "-q", "-m", "x")
        self.assertIn("commit della coda", " ".join(sync.allineamento("1")))

    def test_coda_github_legge_la_versione_remota(self):
        self.scrivi(self.actions, "published"); sh(self.actions, "push", "-q")
        self.assertEqual(sync.coda_github()["1"]["status"], "published")   # sul PC è ancora "pending"

    def test_post_non_ancora_su_github(self):
        self.assertIn("non è ancora su GitHub", " ".join(sync.allineamento("7")))


if __name__ == "__main__":
    unittest.main()
