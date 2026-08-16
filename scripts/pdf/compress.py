#!/usr/bin/env python3
import argparse
import os
import sys
import fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    doc = fitz.open(args.file)
    doc.save(args.output, garbage=4, deflate=True)
    doc.close()

    orig = os.path.getsize(args.file)
    new = os.path.getsize(args.output)
    print(f"Compressed {orig} -> {new} bytes -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
