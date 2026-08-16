#!/usr/bin/env python3
import argparse
import io
import sys

import fitz
import pytesseract
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", default="chi_sim")
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    doc = fitz.open(args.file)
    with open(args.output, "w", encoding="utf-8") as f:
        for i, page in enumerate(doc, 1):
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img, lang=args.lang)
            f.write(f"--- Page {i} ---\n{text}\n")
    doc.close()
    print(f"OCR complete -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
