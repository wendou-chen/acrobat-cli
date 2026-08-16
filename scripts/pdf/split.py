#!/usr/bin/env python3
import argparse
import os
import sys
from pypdf import PdfReader, PdfWriter

def parse_ranges(spec):
    ranges = []
    for part in spec.split(","):
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
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    total = len(reader.pages)
    ranges = parse_ranges(args.ranges)
    os.makedirs(args.output, exist_ok=True)
    for idx, (start, end) in enumerate(ranges, 1):
        writer = PdfWriter()
        for p in range(start - 1, end):
            if p < 0 or p >= total:
                raise SystemExit(f"page out of range: {p + 1}")
            writer.add_page(reader.pages[p])
        out_path = os.path.join(args.output, f"part-{idx}.pdf")
        with open(out_path, "wb") as f:
            writer.write(f)
        print(f"part-{idx}.pdf: pages {start}-{end}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
