import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

from auto_ig import voce


class QwenTest(unittest.TestCase):
    def test_cache_e_velocita(self):
        chiamate = []

        class Finto:
            def generate_custom_voice(self, text, language, speaker):
                chiamate.append((text, language, speaker))
                return [np.sin(np.linspace(0, 2000, 24000)).astype(np.float32) * 0.3], 24000

        with tempfile.TemporaryDirectory() as d, mock.patch.object(voce, "CACHE_DIR", Path(d)), \
                mock.patch.object(voce, "_qwen_model", lambda: Finto()):
            frasi, durata = voce.speak(["Ciao a tutti.", "Ciao a tutti."], Path(d) / "v.wav", "qwen3-serena", 1.0)
            self.assertEqual(chiamate, [("Ciao a tutti.", "Italian", "serena")])   # seconda volta: dalla cache
            self.assertAlmostEqual(frasi[0].end - frasi[0].start, 1.0, places=2)
            veloce, _ = voce.speak(["Ciao a tutti."], Path(d) / "w.wav", "qwen3-serena", 1.25)
            self.assertEqual(len(chiamate), 1)                                      # velocità: niente nuova sintesi
            self.assertAlmostEqual(veloce[0].end - veloce[0].start, 0.8, places=2)


if __name__ == "__main__":
    unittest.main()
