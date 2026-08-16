#!/usr/bin/env python3
import argparse
import sys
import fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--rect", required=True, help="x0,y0,x1,y1")
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    parts = [float(x.strip()) for x in args.rect.split(",")]
    if len(parts) != 4:
        raise SystemExit("--rect must be x0,y0,x1,y1")
    rect = fitz.Rect(parts)

    doc = fitz.open(args.file)
    page = doc[args.page - 1]
    page.insert_text(rect.tl, args.text, fontsize=24, color=(0, 0, 0))
    doc.save(args.output, garbage=3, deflate=True)
    doc.close()
    print(f"Signed with text -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
