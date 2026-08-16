#!/usr/bin/env python3
"""Best-effort PDF/A conversion.

This re-saves with PDF 1.7 metadata and deflate compression.
It is not a certified PDF/A validator; use it for basic compatibility.
"""
import argparse
import sys
import fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    doc = fitz.open(args.file)
    doc.set_metadata({
        "producer": "acrobat-cli PDF/A best-effort",
        "creator": "acrobat-cli",
    })
    doc.save(args.output, garbage=4, deflate=True)
    doc.close()
    print(f"Best-effort PDF/A written -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
