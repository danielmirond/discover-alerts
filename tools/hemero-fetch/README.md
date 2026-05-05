# hemero-fetch

Descarga páginas de hemerotecas digitales españolas para los Clásicos clave (Real Madrid - Barcelona) y extrae el texto plano para análisis posterior.

## Por qué se ejecuta en local

Las hemerotecas (BNE, ABC, La Vanguardia, Mundo Deportivo) bloquean peticiones desde IPs de cloud/sandbox (sale 403). Desde una IP residencial funcionan sin problema. La idea: tú lo corres en tu equipo, me pasas los `.txt` resultantes y yo los analizo y catalogo citas.

## Setup

```bash
cd tools/hemero-fetch
pip install -r requirements.txt
```

## Uso típico

```bash
# 1) Descargar todos los partidos de prioridad máxima
python3 fetch.py --priority maxima

# 2) Extraer texto plano de los HTML/PDF descargados
python3 extract.py

# 3) Buscar términos específicos (regex case-insensitive)
python3 extract.py --grep "puto jefe|UNICEF|cochinillo|carnicero"
```

Otros usos:

```bash
# Solo un partido concreto
python3 fetch.py --id 2011-04-27

# Solo un periódico
python3 fetch.py --priority maxima --papers abc

# Procesar uno específico tras descargar
python3 extract.py --id 1974-02-17
```

## Estructura de salida

```
output/
├── 1974-02-17/                       # ID del Clásico
│   ├── abc-madrid_1974-02-18.html
│   ├── abc-madrid_1974-02-18.txt     # creado por extract.py
│   ├── lavanguardia_1974-02-18_pag001.html
│   ├── lavanguardia_1974-02-18_pag001.txt
│   ├── mundo-deportivo_1974-02-18.html
│   └── ...
├── 2011-04-27/
│   └── ...
└── findings.tsv                      # si usaste --grep
```

## Hemerotecas cubiertas

| Periódico | Cobertura | Endpoint |
|---|---|---|
| **ABC Madrid** | 1903 → hoy | `abc.es/archivo/periodicos/abc-madrid-YYYYMMDD.html` |
| **Mundo Deportivo** | 1906 → hoy | `hemeroteca.elmundodeportivo.es/preview/...` (timeout en muchas IPs) |
| **BNE Hemeroteca Digital** | varia | búsqueda libre filtrada por fecha |
| **archive.org Wayback** | 1996 → hoy | capturas de Marca, AS, Sport, Mundo Deportivo, El País Deportes |

`Marca` y `AS` no tienen hemeroteca pública digital, pero **archive.org sí guardó copias** que descargamos vía CDX API.

### Dominios Wayback configurados
- `marca.com`
- `as.com`
- `sport.es`
- `mundodeportivo.com`
- `elpais.com/deportes`

(Editar `WAYBACK_DOMAINS` en `fetch.py` para añadir más.)

## Targets

Definidos en `targets.json`. Cada uno tiene:

- `id`: identificador (fecha del partido)
- `match_date`: fecha del partido
- `search_dates`: días en los que buscar (típicamente d+1 y d+2 — las crónicas se publican al día siguiente)
- `result`, `competition`, `venue`
- `priority`: `maxima` / `alta` / `media` / `baja`
- `notes`: qué buscar en concreto

Ahora hay 30 targets (1902-2025). Para añadir más, edita `targets.json` y vuelve a lanzar.

## Tras la descarga

Mándame los `.txt` (puedes hacer `tar czf hemero-output.tar.gz output/`) o pega aquí los fragmentos relevantes. Yo:

1. Verifico citas con su contexto exacto
2. Las cataloga en `docs/clasico-declaraciones.md` con la fecha y edición exacta
3. Marco las que sean **fuente primaria** vs prensa derivada

## Posibles problemas

- **404 en una fecha**: a veces el archivo no está digitalizado para ese día concreto. Probar `search_dates` alternativas (d+2, d+3).
- **Cookies / paywall**: La Vanguardia puede pedir aceptar cookies; si pasa, abre el HTML en navegador y verifica si la página real está embebida.
- **Bloqueo por rate limiting**: subir `SLEEP_BETWEEN` en `fetch.py`.
- **OCR malo en ediciones antiguas (años 30, 40)**: el texto extraído puede tener errores. Para esos casos, dame el HTML/PDF original y trabajo con la imagen.
