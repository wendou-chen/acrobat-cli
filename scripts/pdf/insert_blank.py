#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--after", type=int, required=True, help="Insert blank page after this 1-based page number")
    parser.add_argument("--width", type=float, default=595.0)
    parser.add_argument("--height", type=float, default=842.0)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, 1):
        writer.add_page(page)
        if i == args.after:
            writer.insert_blank_page(width=args.width, height=args.height, index=i)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Inserted blank page after {args.after} -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
