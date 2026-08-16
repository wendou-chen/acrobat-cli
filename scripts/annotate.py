#!/usr/bin/env python3
import argparse
import sys
import fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", choices=["highlight", "text"], default="highlight")
    parser.add_argument("--page", type=int, required=True)
    parser.add_argument("--rect", required=True, help="x0,y0,x1,y1")
    parser.add_argument("--text", default="")
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    parts = [float(x.strip()) for x in args.rect.split(",")]
    if len(parts) != 4:
        raise SystemExit("--rect must be x0,y0,x1,y1")
    rect = fitz.Rect(parts)

    doc = fitz.open(args.file)
    page = doc[args.page - 1]
    if args.type == "highlight":
        page.add_highlight_annot(rect)
    else:
        page.add_text_annot(rect.tl, args.text or "annotation")
    doc.save(args.output, garbage=3, deflate=True)
    doc.close()
    print(f"Added {args.type} annotation -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
