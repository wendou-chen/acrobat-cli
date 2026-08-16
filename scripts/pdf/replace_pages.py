#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def parse_range(spec):
    if "-" in spec:
        a, b = spec.split("-", 1)
        return int(a), int(b)
    n = int(spec)
    return n, n

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--range", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    start, end = parse_range(args.range)
    target = PdfReader(args.file)
    source = PdfReader(args.src)
    writer = PdfWriter()

    for i, page in enumerate(target.pages, 1):
        if i < start:
            writer.add_page(page)
        elif i == start:
            for spage in source.pages:
                writer.add_page(spage)
        elif i > end:
            writer.add_page(page)

    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Replaced pages {start}-{end} with source -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
