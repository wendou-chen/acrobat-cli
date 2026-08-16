#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

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
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    remove = parse_pages(args.pages)
    for i, page in enumerate(reader.pages, 1):
        if i not in remove:
            writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Deleted pages {args.pages} -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
