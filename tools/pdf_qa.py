#!/usr/bin/env python3
"""Render contact sheets for visual QA of final PDFs."""
from pathlib import Path
from subprocess import run
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "qa"
OUT.mkdir(parents=True, exist_ok=True)

for pdf in sorted((ROOT / "output" / "pdf").glob("*.pdf")):
    with TemporaryDirectory() as tmp:
        stem = Path(tmp) / "page"
        run(["pdftoppm", "-r", "55", "-png", str(pdf), str(stem)], check=True)
        pages = [Image.open(p).convert("RGB") for p in sorted(Path(tmp).glob("page-*.png"))]
        if not pages:
            raise RuntimeError(f"No rendered pages: {pdf}")
        cols = min(4, len(pages))
        rows = (len(pages) + cols - 1) // cols
        pw, ph = pages[0].size
        sheet = Image.new("RGB", (cols * (pw + 18) + 18, rows * (ph + 40) + 18), "#dce5e3")
        draw = ImageDraw.Draw(sheet)
        for idx, page in enumerate(pages):
            x = 18 + (idx % cols) * (pw + 18)
            y = 18 + (idx // cols) * (ph + 40)
            sheet.paste(page, (x, y))
            draw.text((x, y + ph + 4), f"Page {idx + 1}", fill="#16343c")
        target = OUT / f"{pdf.stem}-contact.png"
        sheet.save(target)
        assert len(pages) == len(PdfReader(str(pdf)).pages)
        print(target)
