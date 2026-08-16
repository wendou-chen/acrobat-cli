#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--password", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    if reader.is_encrypted:
        reader.decrypt(args.password)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Decrypted -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
