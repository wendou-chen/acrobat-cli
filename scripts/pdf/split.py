#!/usr/bin/env python3
import argparse
import os
import sys
from pypdf import PdfReader, PdfWriter

import re

def parse_ranges(spec):
    ranges = []
    parts = re.split(r"[,;\s]+", spec.strip())
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            ranges.append((int(a), int(b)))
        else:
            n = int(part)
            ranges.append((n, n))
    return ranges

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ranges", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("--names", help="Comma-separated list of output filenames")
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    total = len(reader.pages)
    ranges = parse_ranges(args.ranges)
    names = [n.strip() for n in args.names.split(",")] if args.names else []
    os.makedirs(args.output, exist_ok=True)
    for idx, (start, end) in enumerate(ranges, 1):
        writer = PdfWriter()
        for p in range(start - 1, end):
            if p < 0 or p >= total:
                raise SystemExit(f"page out of range: {p + 1}")
            writer.add_page(reader.pages[p])
        if idx - 1 < len(names) and names[idx - 1]:
            name = names[idx - 1]
            if not name.lower().endswith(".pdf"):
                name += ".pdf"
            out_name = name
        else:
            out_name = f"part-{idx}.pdf"
        out_path = os.path.join(args.output, out_name)
        with open(out_path, "wb") as f:
            writer.write(f)
        print(f"{out_name}: pages {start}-{end}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
