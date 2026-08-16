#!/usr/bin/env python3
import argparse
import io
import sys
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


def make_watermark(text, width, height):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width, height))
    c.setFont("Helvetica", 48)
    c.setFillColorRGB(0.5, 0.5, 0.5, 0.3)
    c.saveState()
    c.translate(width / 2, height / 2)
    c.rotate(45)
    c.drawCentredString(0, 0, text)
    c.restoreState()
    c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    for page in reader.pages:
        wm = make_watermark(args.text, float(page.mediabox.width), float(page.mediabox.height))
        page.merge_page(wm)
        writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Watermarked -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
