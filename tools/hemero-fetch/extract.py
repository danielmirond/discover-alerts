#!/usr/bin/env python3
"""
extract: extrae texto plano de los HTML/PDF descargados por fetch.py.

Uso:
    python3 extract.py                   # procesa todo output/
    python3 extract.py --id 2011-04-27   # un solo target
    python3 extract.py --grep "puto"     # filtra texto que contenga la palabra

Salida:
    - <archivo>.txt junto a cada HTML/PDF original
    - findings.tsv con líneas que matchearon --grep (si se usó)

Requiere:
    pip install beautifulsoup4 pypdf
"""

import argparse
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

OUTPUT_DIR = Path(__file__).parent / "output"

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


def extract_html(path: Path) -> str:
    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    # Quitar scripts y estilos
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    # Compactar líneas vacías
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_pdf(path: Path) -> str:
    if PdfReader is None:
        return "[pypdf no instalado: pip install pypdf]"
    reader = PdfReader(str(path))
    return "\n".join(p.extract_text() or "" for p in reader.pages)


def process(path: Path, grep_re: re.Pattern | None, findings: list[str]) -> None:
    if path.suffix == ".html":
        text = extract_html(path)
    elif path.suffix == ".pdf":
        text = extract_pdf(path)
    else:
        return

    out = path.with_suffix(".txt")
    out.write_text(text, encoding="utf-8")

    if grep_re:
        for ln, line in enumerate(text.splitlines(), 1):
            if grep_re.search(line):
                rel = path.relative_to(OUTPUT_DIR)
                findings.append(f"{rel}\t{ln}\t{line.strip()}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--id", help="Solo procesar un target")
    ap.add_argument("--grep", help="Regex a buscar (case-insensitive)")
    args = ap.parse_args()

    if not OUTPUT_DIR.exists():
        print("No hay carpeta output/. Ejecuta fetch.py primero.", file=sys.stderr)
        return 1

    grep_re = re.compile(args.grep, re.IGNORECASE) if args.grep else None
    findings: list[str] = []

    targets = (
        [OUTPUT_DIR / args.id] if args.id else [d for d in OUTPUT_DIR.iterdir() if d.is_dir()]
    )

    for tdir in targets:
        if not tdir.exists():
            print(f"Skip {tdir}: no existe", file=sys.stderr)
            continue
        print(f"\n=== {tdir.name} ===")
        for path in sorted(tdir.iterdir()):
            if path.suffix in {".html", ".pdf"}:
                print(f"  {path.name}")
                process(path, grep_re, findings)

    if grep_re:
        out = Path(__file__).parent / "findings.tsv"
        out.write_text("file\tline\ttext\n" + "\n".join(findings), encoding="utf-8")
        print(f"\n{len(findings)} líneas matchearon -> {out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
