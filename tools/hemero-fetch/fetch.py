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
# URL nueva: https://www.abc.es/archivo/periodicos/abc-madrid-YYYYMMDD.html
# ----------------------------------------------------------------------------
def fetch_abc_madrid(date: datetime, out_dir: Path) -> Path | None:
    if date.year < 1903:
        print(f"  [abc-madrid] {date:%Y-%m-%d}: fuera de cobertura (ABC empieza en 1903)")
        return None

    url = f"https://www.abc.es/archivo/periodicos/abc-madrid-{date:%Y%m%d}.html"
    print(f"  [abc-madrid] {url}")

    try:
        resp = SESSION.get(url, timeout=30, allow_redirects=True)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"    ERROR: {exc}")
        return None

    out = out_dir / f"abc-madrid_{date:%Y-%m-%d}.html"
    out.write_bytes(resp.content)
    print(f"    -> {out.relative_to(OUTPUT_DIR)}")

    # Buscar enlaces a páginas concretas. ABC lista las páginas en la portada.
    soup = BeautifulSoup(resp.text, "html.parser")
    page_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/archivo/periodicos/" in href or "/archivo/" in href:
            page_links.append(href)

    print(f"    {len(page_links)} páginas detectadas en la edición")
    return out


# ----------------------------------------------------------------------------
# Mundo Deportivo — hemeroteca (1906 → hoy)
# URL: https://hemeroteca.elmundodeportivo.es/preview/YYYY/MM/DD/pagina-N.html
# (Es la misma estructura que La Vanguardia pero sí es accesible)
# ----------------------------------------------------------------------------
def fetch_mundo_deportivo(date: datetime, out_dir: Path) -> Path | None:
    if date.year < 1906:
        print(f"  [mundo-deportivo] {date:%Y-%m-%d}: fuera de cobertura (1906+)")
        return None

    base = f"https://hemeroteca.elmundodeportivo.es/preview/{date:%Y/%m/%d}/"
    print(f"  [mundo-deportivo] {base}")

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

        out = out_dir / f"mundo-deportivo_{date:%Y-%m-%d}_pag{n:03}.html"
        out.write_bytes(resp.content)
        saved.append(out)
        time.sleep(SLEEP_BETWEEN)

    if saved:
        print(f"    -> {len(saved)} páginas guardadas")
        return saved[0]
    return None


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
# Wayback Machine (archive.org)
# Estrategia: para cada dominio (marca.com, as.com, sport.es, mundodeportivo.com,
# elpais.com/deportes, lequipe.fr) se busca la captura más cercana al día d+1.
# Se descarga la portada o página principal capturada, donde aparecen titulares
# y enlaces a las crónicas completas.
# ----------------------------------------------------------------------------
WAYBACK_DOMAINS = [
    "marca.com",
    "as.com",
    "sport.es",
    "mundodeportivo.com",
    "elpais.com/deportes",
]


def fetch_wayback(domain: str, date: datetime, out_dir: Path) -> Path | None:
    """Descarga la captura de Wayback Machine más cercana a `date` para `domain`."""
    timestamp_day = date.strftime("%Y%m%d")

    # CDX API: snapshots para todo el día
    cdx = (
        "http://web.archive.org/cdx/search/cdx?"
        f"url={domain}&from={timestamp_day}000000&to={timestamp_day}235959"
        f"&output=json&limit=1&filter=statuscode:200"
    )
    print(f"  [wayback {domain}] {date:%Y-%m-%d}")

    try:
        resp = SESSION.get(cdx, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        print(f"    ERROR CDX: {exc}")
        return None

    if not data or len(data) < 2:
        print(f"    sin captura ese día — probando ventana ±3 días")
        from_t = (date - timedelta(days=3)).strftime("%Y%m%d")
        to_t = (date + timedelta(days=3)).strftime("%Y%m%d")
        cdx = (
            "http://web.archive.org/cdx/search/cdx?"
            f"url={domain}&from={from_t}&to={to_t}"
            f"&output=json&limit=1&filter=statuscode:200"
        )
        try:
            resp = SESSION.get(cdx, timeout=30)
            data = resp.json()
        except (requests.RequestException, ValueError):
            data = []
        if not data or len(data) < 2:
            print(f"    sin captura tampoco en ventana ampliada")
            return None

    # data[0] = headers, data[1] = primera fila
    snap = data[1]
    snap_timestamp = snap[1]
    snap_url = snap[2]
    archive_url = f"https://web.archive.org/web/{snap_timestamp}/{snap_url}"

    try:
        resp = SESSION.get(archive_url, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"    ERROR fetch: {exc}")
        return None

    safe_domain = domain.replace("/", "_")
    out = out_dir / f"wayback_{safe_domain}_{date:%Y-%m-%d}_{snap_timestamp}.html"
    out.write_bytes(resp.content)
    print(f"    -> {out.relative_to(OUTPUT_DIR)} (snap {snap_timestamp})")
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

        if "mundo-deportivo" in papers:
            fetch_mundo_deportivo(date, out_dir)
            time.sleep(SLEEP_BETWEEN)

        if "bne" in papers:
            query = "Real Madrid Barcelona"
            fetch_bne_search(query, date, out_dir)
            time.sleep(SLEEP_BETWEEN)

        if "wayback" in papers:
            for domain in WAYBACK_DOMAINS:
                fetch_wayback(domain, date, out_dir)
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
        default="abc,bne,wayback",
        help="Fuentes (csv): abc, mundo-deportivo, bne, wayback. "
             "mundo-deportivo da timeout desde muchas IPs. "
             "wayback descarga capturas de Marca, AS, Sport, Mundo Deportivo y "
             "El País Deportes desde archive.org.",
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
