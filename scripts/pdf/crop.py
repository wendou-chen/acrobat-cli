#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

def parse_pages(spec):
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return pages

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", required=True)
    parser.add_argument("--box", required=True, help="left,bottom,right,top")
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    parts = [float(x.strip()) for x in args.box.split(",")]
    if len(parts) != 4:
        raise SystemExit("--box must be left,bottom,right,top")
    box = RectangleObject(parts)

    reader = PdfReader(args.file)
    writer = PdfWriter()
    target = parse_pages(args.pages)
    for i, page in enumerate(reader.pages, 1):
        if i in target:
            page.cropbox = box
        writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Cropped pages {args.pages} -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())