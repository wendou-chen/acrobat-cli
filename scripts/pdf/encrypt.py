#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-password", required=True)
    parser.add_argument("--owner-password", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=args.user_password, owner_password=args.owner_password)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Encrypted -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
