#!/usr/bin/env python3
import sys
from pypdf import PdfReader

def main():
    if len(sys.argv) < 2:
        print("usage: info.py <pdf>", file=sys.stderr)
        return 1
    path = sys.argv[1]
    reader = PdfReader(path)
    info = reader.metadata or {}
    print(f"Pages: {len(reader.pages)}")
    print(f"Encrypted: {reader.is_encrypted}")
    print(f"Title: {info.get('/Title', '')}")
    print(f"Author: {info.get('/Author', '')}")
    print(f"Producer: {info.get('/Producer', '')}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
