#!/usr/bin/env python3
import sys
from pypdf import PdfReader

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

def walk(items, reader, depth=0):
    for item in items:
        if isinstance(item, list):
            walk(item, reader, depth + 1)
        else:
            title = (item.title or "").strip()
            page = dest_page(reader, item)
            print(f"{'  ' * depth}{title} -> {page}")

def main():
    if len(sys.argv) < 2:
        print("usage: bookmarks.py <pdf>", file=sys.stderr)
        return 1
    reader = PdfReader(sys.argv[1])
    walk(reader.outline, reader)
    return 0

if __name__ == "__main__":
    sys.exit(main())
