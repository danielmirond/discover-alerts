#!/usr/bin/env python3
"""
hemero-fetch: descarga páginas de hemerotecas digitales españolas para los partidos
clave del Clásico Real Madrid - FC Barcelona.

Uso:
    python3 fetch.py                    # descarga TODOS los targets de targets.json
    python3 fetch.py --priority maxima  # solo prioridad máxima
    python3 fetch.py --id 2011-04-27    # un solo target

Salida: ./output/<id>/<paper>_<date>.{pdf,html,txt}

Requiere:
    pip install requests beautifulsoup4 pypdf

Por qué este script: las hemerotecas (BNE, ABC, La Vanguardia, Mundo Deportivo)
bloquean WebFetch desde sandboxes pero son accesibles desde cualquier máquina
con IP residencial. Ejecuta esto en tu equipo y los .txt resultantes me los pasas.
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/121.0 Safari/537.36"
)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "es-ES,es;q=0.9"})

OUTPUT_DIR = Path(__file__).parent / "output"
SLEEP_BETWEEN = 1.5  # segundos entre peticiones para no saturar

# ----------------------------------------------------------------------------
# ABC — archivo histórico (1903 → 2010)
# Patrón URL: https://hemeroteca.abc.es/nav/Navigate.exe/hemeroteca/madrid/abc/YYYY/MM/DD.html
# ----------------------------------------------------------------------------
def fetch_abc_madrid(date: datetime, out_dir: Path) -> Path | None:
    if date.year < 1903 or date.year > 2010:
        print(f"  [abc-madrid] {date:%Y-%m-%d}: fuera de cobertura (1903-2010)")
        return None

    url = (
        f"https://hemeroteca.abc.es/nav/Navigate.exe/hemeroteca/madrid/abc/"
        f"{date:%Y/%m/%d}.html"
    )
    print(f"  [abc-madrid] {url}")

    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"    ERROR: {exc}")
        return None

    out = out_dir / f"abc-madrid_{date:%Y-%m-%d}.html"
    out.write_bytes(resp.content)
    print(f"    -> {out.relative_to(OUTPUT_DIR)}")

    # Buscar enlaces a páginas concretas (la portada lista las páginas)
    soup = BeautifulSoup(resp.text, "html.parser")
    page_links = [
        a["href"]
        for a in soup.find_all("a", href=True)
        if "/hemeroteca/madrid/abc/" in a["href"] and a["href"].endswith(".html")
    ]
    print(f"    {len(page_links)} páginas detectadas en la edición")

    return out


# ----------------------------------------------------------------------------
# La Vanguardia — hemeroteca (1881 → hoy)
# Patrón: https://hemeroteca.lavanguardia.com/preview/YYYY/MM/DD/pagina-N.html
# ----------------------------------------------------------------------------
def fetch_lavanguardia(date: datetime, out_dir: Path) -> Path | None:
    base = (
        f"https://hemeroteca.lavanguardia.com/preview/"
        f"{date:%Y/%m/%d}/"
    )
    print(f"  [lavanguardia] {base}")

    # Probamos páginas 1-30 (deportivas suelen estar entre 30-50 en ediciones grandes,
    # pero la portada es la 1 y a partir de ahí hay índice)
    saved: list[Path] = []
    for n in range(1, 51):
        url = f"{base}pagina-{n}.html"
        try:
            resp = SESSION.get(url, timeout=20)
            if resp.status_code == 404:
                if n == 1:
                    print(f"    edición no encontrada para {date:%Y-%m-%d}")
                break
            resp.raise_for_status()
        except requests.RequestException as exc:
            print(f"    ERROR pág {n}: {exc}")
            break

        out = out_dir / f"lavanguardia_{date:%Y-%m-%d}_pag{n:03}.html"
        out.write_bytes(resp.content)
        saved.append(out)
        time.sleep(SLEEP_BETWEEN)

    if saved:
        print(f"    -> {len(saved)} páginas guardadas")
        return saved[0]
    return None


# ----------------------------------------------------------------------------
# Mundo Deportivo — hemeroteca (1906 → hoy)
# Patrón: https://www.mundodeportivo.com/hemeroteca/YYYY/MM/DD/
# ----------------------------------------------------------------------------
def fetch_mundo_deportivo(date: datetime, out_dir: Path) -> Path | None:
    url = f"https://www.mundodeportivo.com/hemeroteca/{date:%Y/%m/%d}/"
    print(f"  [mundo-deportivo] {url}")

    try:
        resp = SESSION.get(url, timeout=30)
        if resp.status_code == 404:
            print(f"    edición no encontrada")
            return None
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"    ERROR: {exc}")
        return None

    out = out_dir / f"mundo-deportivo_{date:%Y-%m-%d}.html"
    out.write_bytes(resp.content)
    print(f"    -> {out.relative_to(OUTPUT_DIR)}")
    return out


# ----------------------------------------------------------------------------
# BNE — Hemeroteca Digital (búsqueda libre por término + filtro fecha)
# https://hemerotecadigital.bne.es/hd/es/results?...
# Nota: la búsqueda devuelve una lista; descargamos la primera página de resultados.
# ----------------------------------------------------------------------------
def fetch_bne_search(query: str, date: datetime, out_dir: Path) -> Path | None:
    # Ventana de ±3 días
    start = (date - timedelta(days=1)).strftime("%Y-%m-%d")
    end = (date + timedelta(days=3)).strftime("%Y-%m-%d")
    url = (
        "https://hemerotecadigital.bne.es/hd/es/results?"
        f"text={quote(query)}&fechaInicio={start}&fechaFin={end}"
    )
    print(f"  [bne-search] {url}")

    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"    ERROR: {exc}")
        return None

    out = out_dir / f"bne-search_{date:%Y-%m-%d}.html"
    out.write_bytes(resp.content)
    print(f"    -> {out.relative_to(OUTPUT_DIR)}")
    return out


# ----------------------------------------------------------------------------
# Orquestador
# ----------------------------------------------------------------------------
def process_target(target: dict, papers: list[str]) -> None:
    tid = target["id"]
    out_dir = OUTPUT_DIR / tid
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n=== {tid} | {target['result']} | {target['competition']} ===")
    print(f"    Notas: {target['notes']}")

    for date_str in target["search_dates"]:
        date = datetime.strptime(date_str, "%Y-%m-%d")

        if "abc" in papers:
            fetch_abc_madrid(date, out_dir)
            time.sleep(SLEEP_BETWEEN)

        if "lavanguardia" in papers:
            fetch_lavanguardia(date, out_dir)
            time.sleep(SLEEP_BETWEEN)

        if "mundo-deportivo" in papers and date.year >= 1906:
            fetch_mundo_deportivo(date, out_dir)
            time.sleep(SLEEP_BETWEEN)

        if "bne" in papers:
            query = "Real Madrid Barcelona"
            fetch_bne_search(query, date, out_dir)
            time.sleep(SLEEP_BETWEEN)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--priority",
        choices=["maxima", "alta", "media", "baja"],
        help="Filtrar por prioridad",
    )
    ap.add_argument("--id", help="Procesar un solo target por id")
    ap.add_argument(
        "--papers",
        default="abc,lavanguardia,mundo-deportivo,bne",
        help="Hemerotecas a usar (csv): abc,lavanguardia,mundo-deportivo,bne",
    )
    ap.add_argument(
        "--targets",
        default=str(Path(__file__).parent / "targets.json"),
        help="Ruta al fichero de targets",
    )
    args = ap.parse_args()

    with open(args.targets, encoding="utf-8") as f:
        config = json.load(f)

    targets = config["targets"]
    if args.priority:
        targets = [t for t in targets if t.get("priority") == args.priority]
    if args.id:
        targets = [t for t in targets if t["id"] == args.id]

    if not targets:
        print("Sin targets que procesar.", file=sys.stderr)
        return 1

    papers = [p.strip() for p in args.papers.split(",") if p.strip()]
    print(f"Procesando {len(targets)} targets con {papers}")

    OUTPUT_DIR.mkdir(exist_ok=True)
    for t in targets:
        process_target(t, papers)

    print(f"\nDescargas en: {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
