#!/usr/bin/env python3
import sys
from pypdf import PdfReader

def main():
    if len(sys.argv) < 2:
        print("usage: list.py <pdf>", file=sys.stderr)
        return 1
    reader = PdfReader(sys.argv[1])
    fields = reader.get_fields()
    if not fields:
        print("No form fields found.")
        return 0
    for name, field in fields.items():
        ftype = field.get("/FT", "")
        value = field.get("/V", "")
        print(f"{name}\t{ftype}\t{value}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
