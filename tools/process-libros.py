#!/usr/bin/env python3
"""Procesa libros (zip/ePub/PDF/txt) en la carpeta libros/ y extrae texto.

Uso:
  python3 tools/process-libros.py                # procesa todos los libros
  python3 tools/process-libros.py libros/x.zip   # procesa uno concreto
  python3 tools/process-libros.py --grep "Tenerife" libros/  # busca pasaje

Genera:
  libros/extracted/<nombre>.txt — texto plano del libro
  libros/extracted/<nombre>.json — metadatos (capítulos, paginación)
"""

import argparse
import json
import sys
import zipfile
from pathlib import Path


def extract_zip(zip_path: Path, dest: Path) -> list:
    """Descomprime un zip y devuelve la lista de archivos extraídos."""
    extracted = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            zf.extract(name, dest)
            extracted.append(dest / name)
    return extracted


def extract_pdf(pdf_path: Path) -> str:
    """Extrae texto de un PDF (con pypdf si está instalado)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        print("Instala: pip install pypdf", file=sys.stderr)
        return ""
    reader = PdfReader(pdf_path)
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def extract_epub(epub_path: Path) -> str:
    """Extrae texto de un ePub (es un zip con HTML dentro)."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("Instala: pip install beautifulsoup4", file=sys.stderr)
        return ""
    text = []
    with zipfile.ZipFile(epub_path, "r") as zf:
        for name in zf.namelist():
            if name.lower().endswith((".html", ".xhtml", ".htm")):
                with zf.open(name) as f:
                    soup = BeautifulSoup(f.read(), "html.parser")
                    text.append(soup.get_text(separator="\n"))
    return "\n\n---\n\n".join(text)


def extract_docx(docx_path: Path) -> str:
    """Extrae texto de un docx."""
    try:
        from docx import Document
    except ImportError:
        print("Instala: pip install python-docx", file=sys.stderr)
        return ""
    doc = Document(docx_path)
    return "\n".join(p.text for p in doc.paragraphs)


def extract_text(path: Path) -> str:
    """Detecta formato y extrae texto."""
    ext = path.suffix.lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".epub":
        return extract_epub(path)
    if ext == ".docx":
        return extract_docx(path)
    if ext in (".txt", ".md"):
        return path.read_text(encoding="utf-8", errors="ignore")
    return ""


def grep_text(text: str, pattern: str, context: int = 200) -> list:
    """Busca pasajes que contienen pattern y devuelve con contexto."""
    import re
    matches = []
    for m in re.finditer(re.escape(pattern), text, re.IGNORECASE):
        start = max(0, m.start() - context)
        end = min(len(text), m.end() + context)
        matches.append({
            "position": m.start(),
            "context": text[start:end],
        })
    return matches


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="Archivos o carpetas a procesar")
    ap.add_argument("--grep", help="Buscar pasaje en el texto extraído")
    ap.add_argument("--out", default="libros/extracted", help="Carpeta destino")
    args = ap.parse_args()

    base = Path(__file__).resolve().parents[1]
    libros_dir = base / "libros"
    out_dir = base / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    if not args.paths:
        # Todos los libros
        paths = [
            p for p in libros_dir.iterdir()
            if p.is_file() and p.suffix.lower() in (".zip", ".pdf", ".epub", ".docx", ".txt", ".md")
        ]
    else:
        paths = [Path(p) for p in args.paths]

    for path in paths:
        if not path.exists():
            print(f"NO EXISTE: {path}", file=sys.stderr)
            continue
        print(f"Procesando: {path}")

        if path.suffix.lower() == ".zip":
            extracted = extract_zip(path, out_dir / path.stem)
            for f in extracted:
                txt = extract_text(f)
                if txt:
                    out_txt = out_dir / f"{f.stem}.txt"
                    out_txt.write_text(txt, encoding="utf-8")
                    print(f"  → {out_txt} ({len(txt)} chars)")
                    if args.grep:
                        matches = grep_text(txt, args.grep)
                        for m in matches:
                            print(f"    MATCH @ {m['position']}: ...{m['context']}...")
        else:
            txt = extract_text(path)
            if txt:
                out_txt = out_dir / f"{path.stem}.txt"
                out_txt.write_text(txt, encoding="utf-8")
                print(f"  → {out_txt} ({len(txt)} chars)")
                if args.grep:
                    matches = grep_text(txt, args.grep)
                    for m in matches:
                        print(f"    MATCH @ {m['position']}: ...{m['context']}...")


if __name__ == "__main__":
    main()
