import io
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from auto_ig import images
from auto_ig.sources import ImageResult, openverse


class Resp:
    def __init__(self, data=None, content=b""):
        self._d, self.content = data, content

    def raise_for_status(self):
        pass

    def json(self):
        return self._d

    def iter_content(self, n):
        for i in range(0, len(self.content), n):
            yield self.content[i:i + n]


class Sess:
    def __init__(self, resp):
        self.resp, self.calls = resp, []

    def get(self, url, **kw):
        self.calls.append((url, kw))
        return self.resp


def png_bytes(size=(2000, 1000), mode="RGBA"):
    buf = io.BytesIO()
    Image.new(mode, size, (200, 30, 30, 255) if mode == "RGBA" else (1, 2, 3)).save(buf, "PNG")
    return buf.getvalue()


RES = ImageResult("openverse", "abcdef123456", "https://x/img.png", "t", "https://page", "Mario",
                  "cc0 1.0", "https://lic", 2000, 1000, "Bella Vista!")


class TestImages(unittest.TestCase):
    def test_openverse_filters(self):
        data = {"results": [
            {"id": "1", "url": "u", "license": "cc0", "width": 3000, "height": 2000},
            {"id": "2", "url": "u", "license": "cc0", "width": 500, "height": 400},     # troppo piccola
            {"id": "3", "url": "u", "license": "by", "width": 3000, "height": 2000},    # non PD
        ]}
        s = Sess(Resp(data))
        out = openverse.search("mare", 10, session=s)
        self.assertEqual([r.id for r in out], ["1"])
        self.assertEqual(s.calls[0][1]["params"]["license"], "cc0,pdm")

    def test_save_result_crops_and_credits(self):
        d = Path(tempfile.mkdtemp())
        name = images.save_result(RES, d, session=Sess(Resp(content=png_bytes())))
        self.assertEqual(name, "openverse-bella-vista-abcdef12.jpg")
        with Image.open(d / name) as im:
            self.assertEqual((im.size, im.format, im.mode), ((1080, 1350), "JPEG", "RGB"))
        credits = json.loads((d / "credits.json").read_text())
        self.assertEqual(credits[name]["creator"], "Mario")
        self.assertEqual(images.credit_line(name, d / "credits.json"), "📷 Mario via Openverse (CC0)")

    def test_license_label(self):
        self.assertEqual(images.license_label("Public domain"), "Pubblico dominio")
        self.assertEqual(images.license_label("pdm 1.0"), "Pubblico dominio")
        self.assertEqual(images.license_label("CC0"), "CC0")
        self.assertEqual(images.license_label("pixabay"), "Licenza Pixabay")


if __name__ == "__main__":
    unittest.main()
