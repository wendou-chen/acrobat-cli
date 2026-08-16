#!/usr/bin/env python3
"""Extract PDF page ranges by bookmark sections.

Example:
  python scripts/pdf/extract.py \
    --pdf "input.pdf" \
    --chapter "相似矩阵" \
    --sections "综合,拓展" \
    --output "output.pdf"
"""

import argparse
import sys
from pypdf import PdfReader, PdfWriter


def dest_page(reader, dest):
    try:
        if isinstance(dest, int):
            return dest + 1
        if isinstance(dest, list):
            return reader.get_destination_page_number(dest) + 1
        if hasattr(dest, "page"):
            return reader.get_destination_page_number(dest) + 1
    except Exception:
        pass
    return None


def walk(items, depth=0):
    results = []
    for item in items:
        if isinstance(item, list):
            results.extend(walk(item, depth + 1))
        else:
            title = (item.title or "").strip()
            page = dest_page(reader, item)
            results.append((depth, title, page))
    return results


def main():
    parser = argparse.ArgumentParser(description="Extract PDF pages by bookmarks")
    parser.add_argument("--pdf", required=True, help="Source PDF path")
    parser.add_argument("--chapter", required=True, help="Chapter keyword in bookmarks")
    parser.add_argument("--sections", required=True, help="Comma-separated section keywords, e.g. 综合,拓展")
    parser.add_argument("--output", required=True, help="Output PDF path")
    args = parser.parse_args()

    global reader
    reader = PdfReader(args.pdf)
    flat = walk(reader.outline)

    chap_idx = None
    for i, (depth, title, page) in enumerate(flat):
        if args.chapter in (title or "") and page is not None:
            chap_idx = i
            break
    if chap_idx is None:
        print(f"未找到包含 '{args.chapter}' 的书签", file=sys.stderr)
        return 1

    chap_depth = flat[chap_idx][0]
    children = []
    for j in range(chap_idx + 1, len(flat)):
        d, t, p = flat[j]
        if d <= chap_depth:
            break
        if d == chap_depth + 1:
            children.append((t, p))

    next_chapter_page = None
    for j in range(chap_idx + 1, len(flat)):
        d, t, p = flat[j]
        if d == chap_depth and p is not None:
            next_chapter_page = p
            break

    section_keywords = [s.strip() for s in args.sections.split(",") if s.strip()]
    selected = []
    for kw in section_keywords:
        for t, p in children:
            if kw in (t or ""):
                selected.append((t, p))
                break

    if not selected:
        print(f"未找到匹配章节子书签: {section_keywords}", file=sys.stderr)
        return 1

    ranges = []
    for i, (label, start) in enumerate(selected):
        next_start = selected[i + 1][1] if i + 1 < len(selected) else None
        end = (next_start - 1) if next_start else ((next_chapter_page - 1) if next_chapter_page else len(reader.pages))
        ranges.append((label, start, end))

    writer = PdfWriter()
    for label, start, end in ranges:
        for pno in range(start - 1, end):
            writer.add_page(reader.pages[pno])
        print(f"{label}: 第 {start}-{end} 页，共 {end - start + 1} 页")

    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"已保存: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
