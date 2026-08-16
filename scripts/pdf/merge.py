#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()

    writer = PdfWriter()
    for path in args.files:
        reader = PdfReader(path)
        for page in reader.pages:
            writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Merged {len(args.files)} files -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
