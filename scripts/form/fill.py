#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--field", required=True)
    parser.add_argument("--value", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    writer.append(reader)
    writer.update_page_form_field_values(writer.pages, {args.field: args.value})
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Filled field '{args.field}' -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
