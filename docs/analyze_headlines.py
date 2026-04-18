"""
Extrae patrones de titulares ganadores de un export DiscoverSnoop.

Input: CSV con columnas title, score, position, category, publisher (y otras).
Output:
  /tmp/formulas-report.md  — analisis legible por humanos
  /tmp/headline-formulas.learned.json  — nuevo fichero de formulas
"""

import csv, re, collections, json, unicodedata
from pathlib import Path

CSV_PATH = "/Users/danielmd/Desktop/pages-20240401-20260417-ES-1776381353.csv"
OUT_REPORT = Path("/tmp/formulas-report.md")
OUT_FORMULAS = Path("/tmp/headline-formulas.learned.json")

# ---------------------------------------------------------------------
# 1. Mapeo categoria DiscoverSnoop (taxonomia Google) -> topic/alert mapping
# ---------------------------------------------------------------------
# DS categories son paths tipo "/News/Politics". Vamos a mapear a buckets
# alineados con nuestro sistema (topics.json + Route.categories).

CATEGORY_BUCKETS = {
    # bucket_id -> (matchers sobre category path, topic?, ds_category_label?)
    "sucesos":        (["/Sensitive Subjects", "/News/Crime", "/Law & Government/Public Safety", "/Law & Government/Crime"], "sucesos", None),
    "legal":          (["/Law & Government", "/News/Politics/Legal"], "legal", None),
    "deportes":       (["/Sports"], None, "Sports"),
    "entretenimiento":(["/Arts & Entertainment"], None, "Entertainment"),
    "politica":       (["/News/Politics", "/Law & Government/Government"], None, "Politics"),
    "economia":       (["/Finance", "/Business & Industrial", "/News/Business News"], None, "Economy"),
    "tech":           (["/Computers & Electronics", "/Internet & Telecom", "/Science", "/Reference/Technical Reference"], None, "Technology"),
    "salud":          (["/Health", "/Beauty & Fitness"], None, None),
    "gastro":         (["/Food & Drink"], None, None),
    "viajes":         (["/Travel"], None, None),
    "motor":          (["/Autos & Vehicles"], None, None),
    "sociedad":       (["/People & Society"], None, None),
    "hogar":          (["/Home & Garden", "/Real Estate"], None, None),
    "trabajo":        (["/Jobs & Education"], None, None),
    "shopping":       (["/Shopping"], None, None),
    "hobbies":        (["/Hobbies & Leisure", "/Games", "/Pets & Animals", "/Books & Literature"], None, None),
    "news_general":   (["/News"], None, None),   # fallback de News
}

def bucket_for(category_path: str) -> str:
    if not category_path: return "sin_categoria"
    # Priority order matters: sucesos > legal > politica > news_general
    for bid in [
        "sucesos", "legal", "politica",
        "deportes", "entretenimiento",
        "economia", "tech", "salud", "motor",
        "gastro", "viajes", "sociedad", "hogar",
        "trabajo", "shopping", "hobbies",
        "news_general",
    ]:
        prefixes, _, _ = CATEGORY_BUCKETS[bid]
        if any(category_path.startswith(p) for p in prefixes):
            return bid
    return "otros"

# ---------------------------------------------------------------------
# 2. Normalizacion y tokenizacion
# ---------------------------------------------------------------------

STOPWORDS_ES = set("""
a al algo algun alguna algunas alguno algunos ante antes aquel aquella
aquellas aquellos aqui asi bajo bien como con contra cual cuando cuanta
cuantas cuanto cuantos de del desde donde dos el la los las le lo un una
unos unas en entre era eran es ese esa esos esas este esta estos estas
esto eso fue fuera fueron habia habian hacer hacia hasta hay ha han he
han hemos hoy sin sobre son ser si no ni pero por para porque pues
que quien quienes se sea sean segun sido sin sobre son su sus tambien tan
tanto tantos tantas tener tengo tenia tenias tenian toda todas todos todo
un una unas unos y ya yo mi mis tu tus vos vosotros vosotras nuestros
nuestras nuestra nuestro ellas ellos ella el tras mas menos muy solo
""".split())

def strip_accents(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def normalize(s: str) -> str:
    return strip_accents(s.lower()).strip()

# Tokens de estructura que queremos detectar como patron
STRUCT_PATTERNS = [
    # (regex sobre titular normalizado, etiqueta, template human-readable)
    (re.compile(r'^ultima hora[:\s]'),                  "leading_ultima_hora",  "Ultima hora: ..."),
    (re.compile(r'^confirmad[oa][:\s]'),                "leading_confirmado",   "Confirmado: ..."),
    (re.compile(r'^oficial[:\s]'),                      "leading_oficial",      "Oficial: ..."),
    (re.compile(r'^atencion[:\s]'),                     "leading_atencion",     "Atencion: ..."),
    (re.compile(r'^ya es oficial'),                     "ya_es_oficial",        "Ya es oficial: ..."),
    (re.compile(r'^alerta'),                            "leading_alerta",       "Alerta ..."),
    (re.compile(r'^[0-9]+\s'),                          "numero_lead",          "{N} {cosas} que ..."),
    (re.compile(r'^(que|como|por que|cuando|donde|quien)'), "pregunta_directa", "{Que|Como|Por que} ..."),
    (re.compile(r'^asi '),                              "asi_lead",             "Asi {verbo} ..."),
    (re.compile(r'^esto es lo que'),                    "esto_es_lo_que",       "Esto es lo que {hecho}"),
    (re.compile(r'^lo que (no sab|nadie|tienes|debes)'),"lo_que_no",            "Lo que no sabias de ..."),
    (re.compile(r'^ni .+ ni '),                         "ni_x_ni_y",            "Ni X ni Y: ..."),
    (re.compile(r'^mas alla de'),                       "mas_alla",             "Mas alla de ..."),
    (re.compile(r'\?$'),                                "pregunta_final",       "... ?"),
    (re.compile(r'^revelad[oa][:\s]'),                  "revelado",             "Revelado: ..."),
    (re.compile(r': esto es'),                          "colon_esto_es",        "{X}: esto es lo que..."),
    (re.compile(r'[:\-–]\s+(asi|lo que|esto es|por que)'), "colon_reveal",     "{X}: {asi|lo que|por que} ..."),
    (re.compile(r':[^:]+$'),                            "colon_split_generic",  "{X}: {Y}"),
    (re.compile(r'\w+ \w+ \w+ a \w+'),                  "entity_action_target", "{E1} {verbo} a {E2}"),
]

# Verbos declarativos que queremos destacar (despues de strip_accents)
DECLARATIVE_VERBS = set("""
confirma confirman confirmo confirmado
dispara disparan dispara se
revela revelan revelado
anuncia anuncian anunciado
sentencia sentencian sentenciado
dictamina dictaminan
condena condenan condenado
absuelve absuelven absuelto
detiene detienen detenido detenida
identifica identifican identificado
destapa destapan
desvela desvelan
halla hallan hallado hallada
rescata rescatan rescatado
golpea golpean
sorprende sorprenden sorprendido
marca marcan
estalla estallan
explota explotan
acaba acaban
hunde hunden hundido
arrasa arrasan
lidera lideran liderado
planta plantan
dimite dimiten
renuncia renuncian
investiga investigan investigado
imputa imputan imputado
rompe rompen roto
""".split())

def extract_struct_tags(title_norm: str):
    tags = []
    for rx, tag, _ in STRUCT_PATTERNS:
        if rx.search(title_norm):
            tags.append(tag)
    return tags

def leading_verb(title_norm: str):
    tokens = re.findall(r"[a-z']+", title_norm)
    for t in tokens[:4]:
        if t in STOPWORDS_ES: continue
        if t in DECLARATIVE_VERBS: return t
    return None

# ---------------------------------------------------------------------
# 3. Template extraction (titulares -> esqueleto)
# ---------------------------------------------------------------------

ENTITY_HINT_RE = re.compile(r"\b([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){0,3})\b")
NUMBER_RE = re.compile(r"\b\d+([.,]\d+)?\b")
QUOTED_RE = re.compile(r'"[^"]+"|\'[^\']+\'|“[^”]+”')

def templatize(title: str) -> str:
    t = title
    t = QUOTED_RE.sub('"{Q}"', t)
    # Don't replace number in case '13 signos' — we want {N} as slot
    t = NUMBER_RE.sub('{N}', t)
    # Entity hints: capture Capitalized words not sentence-start
    def repl(match):
        span = match.group(0)
        # Skip sentence start: position 0 capitalization is normal
        if match.start() == 0: return span
        return '{E}'
    t = ENTITY_HINT_RE.sub(repl, t)
    return t

# Skeleton: structure without content. Collapse consecutive slot tokens + stopwords
def skeleton(title: str) -> str:
    t = templatize(title).lower()
    # Strip to alphanumeric + slot markers
    t = re.sub(r'[^\w\s{}]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    # Drop stopwords
    toks = [w if w.startswith('{') else (w if w not in STOPWORDS_ES else None) for w in t.split()]
    toks = [w for w in toks if w]
    return ' '.join(toks)

# ---------------------------------------------------------------------
# 4. Load + filter + analyze
# ---------------------------------------------------------------------

rows = []
with open(CSV_PATH, encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        if not r.get('title'): continue
        try:
            sc = float(r.get('score') or 0)
            po = int(float(r.get('position') or 99))
        except ValueError:
            continue
        rows.append({
            'title': r['title'].strip(),
            'score': sc,
            'position': po,
            'category': r.get('category') or '',
            'publisher': r.get('publisher') or '',
        })

print(f"Loaded {len(rows)} rows with title")
# Score distribution
import statistics
sc_all = [r['score'] for r in rows]
print(f"score: min={min(sc_all):.1f} max={max(sc_all):.1f} p25={statistics.quantiles(sc_all, n=4)[0]:.1f} median={statistics.median(sc_all):.1f} p75={statistics.quantiles(sc_all, n=4)[2]:.1f} p90={statistics.quantiles(sc_all, n=10)[8]:.1f}")

# Assign bucket
for r in rows:
    r['bucket'] = bucket_for(r['category'])

# Winners = top-percentile por bucket (top ~25%) + posicion <= 20.
# Usar percentil por bucket evita descartar verticales con score bajo per se.
WINNER_POS_MAX = 20
WINNER_PERCENTILE = 0.25  # top 25% per bucket

winners_per_bucket = collections.defaultdict(list)
rows_by_bucket = collections.defaultdict(list)
for r in rows:
    rows_by_bucket[r['bucket']].append(r)

for bucket, brows in rows_by_bucket.items():
    if len(brows) < 20: continue
    # Sort by score desc, keep top N
    n_keep = max(10, int(len(brows) * WINNER_PERCENTILE))
    sorted_rows = sorted(brows, key=lambda r: -r['score'])
    threshold_score = sorted_rows[min(n_keep-1, len(sorted_rows)-1)]['score']
    winners = [r for r in sorted_rows[:n_keep] if r['position'] <= WINNER_POS_MAX]
    winners_per_bucket[bucket] = winners
    print(f"  bucket {bucket:20s}  total={len(brows):4d}  threshold_score={threshold_score:.1f}  winners_kept={len(winners)}")

print("\nWinners per bucket (score>=10, position<=15):")
for b, ws in sorted(winners_per_bucket.items(), key=lambda x: -len(x[1])):
    print(f"  {b:20s}  n={len(ws):5d}  avg_score={sum(w['score'] for w in ws)/len(ws):.1f}")

# ---------------------------------------------------------------------
# 5. Per-bucket pattern extraction
# ---------------------------------------------------------------------

report_lines = ["# Análisis de fórmulas de titulares — export DiscoverSnoop ES",
    "",
    f"**Dataset**: {len(rows)} titulares (2024-04 → 2026-04), 25 top-level categorías Google Discover.",
    f"**Winners**: top {int(WINNER_PERCENTILE*100)}% por score dentro de cada bucket, con `position ≤ {WINNER_POS_MAX}`. Total: {sum(len(v) for v in winners_per_bucket.values())}.",
    "",
    "Las métricas que uso:",
    "- `score` DiscoverSnoop (0–100, relevancia en Discover España).",
    "- `position` (1 = arriba del feed, 28 = abajo).",
    "- Los *winners* son los titulares que dominaron Discover en su slot.",
    "",
    "Para cada bucket editorial extraigo:",
    "1. **Estructuras dominantes** (colon-split, pregunta, número, declarativo…)",
    "2. **Verbos y leading tokens** que repiten en titulares ganadores",
    "3. **Templates reales** (esqueletos con slots {E} entidad, {N} número, {Q} cita)",
    "",
    "---",
    ""]

# For the learned JSON: build rules per bucket
learned_rules = []

BUCKET_ALERT_MAP = {
    # bucket -> list of alert (type, subtype?, topic?, category?) para anclar formulas
    "sucesos": [{"type": "trends_without_discover", "topic": "sucesos"},
                {"type": "entity", "subtype": "flash", "topic": "sucesos"},
                {"type": "entity", "subtype": "discover_1h", "topic": "sucesos"},
                {"type": "own_media_absent", "topic": "sucesos"},
                {"type": "triple_match", "topic": "sucesos"}],
    "legal":   [{"type": "trends_without_discover", "topic": "legal"},
                {"type": "entity", "subtype": "flash", "topic": "legal"},
                {"type": "entity", "subtype": "discover_1h", "topic": "legal"},
                {"type": "entity", "subtype": "ascending", "topic": "legal"},
                {"type": "own_media_absent", "topic": "legal"},
                {"type": "entity_coverage", "topic": "legal"},
                {"type": "triple_match", "topic": "legal"},
                {"type": "multi_entity_article", "topic": "legal"}],
    # Category-based: alertas entity sin topic pero con category. La ruta en
    # routing.json hace match por categoria, pero las formulas las atamos por
    # 'match' en headline-formulas.json que solo mira type/subtype/topic.
    # Para estos verticales usaremos type-only (no subtype) como lowest
    # precedence y dejamos que topic=null aplique.
    "deportes":[{"type": "entity", "subtype": "flash"},
                {"type": "entity", "subtype": "discover_1h"}],
    "politica":[{"type": "entity", "subtype": "flash"},
                {"type": "headline_pattern"}],
    "economia":[{"type": "entity_coverage"},
                {"type": "trends_without_discover"}],
    "entretenimiento": [{"type": "entity", "subtype": "flash"}],
    "news_general": [{"type": "entity"},
                      {"type": "trends_without_discover"},
                      {"type": "triple_match"},
                      {"type": "entity_coverage"}],
}

BUCKET_HUMAN_LABEL = {
    "sucesos": "Sucesos",
    "legal": "Legal / Tribunales",
    "news_general": "News (genérico)",
    "deportes": "Deportes",
    "politica": "Política",
    "economia": "Economía",
    "entretenimiento": "Entretenimiento",
    "gastro": "Gastro",
    "motor": "Motor",
    "salud": "Salud",
    "viajes": "Viajes",
    "sociedad": "Sociedad",
    "hogar": "Hogar",
    "trabajo": "Empleo",
    "tech": "Tech",
    "shopping": "Shopping",
    "hobbies": "Hobbies",
}

# Collect top patterns per bucket
bucket_patterns = {}

for bucket, winners in sorted(winners_per_bucket.items()):
    if len(winners) < 10:  # min sample
        continue
    struct_counts = collections.Counter()
    lead_verb_counts = collections.Counter()
    skel_counts = collections.Counter()
    for w in winners:
        tn = normalize(w['title'])
        for tag in extract_struct_tags(tn):
            struct_counts[tag] += 1
        v = leading_verb(tn)
        if v: lead_verb_counts[v] += 1
        skel_counts[skeleton(w['title'])] += 1
    bucket_patterns[bucket] = {
        'n': len(winners),
        'struct': struct_counts,
        'verbs': lead_verb_counts,
        'skel': skel_counts,
    }

# Write report
for bucket, data in sorted(bucket_patterns.items(), key=lambda x: -x[1]['n']):
    label = BUCKET_HUMAN_LABEL.get(bucket, bucket.title())
    report_lines.append(f"## {label}  (`{bucket}`)  — {data['n']} winners")
    report_lines.append("")
    report_lines.append(f"### Estructuras dominantes (% sobre {data['n']})")
    report_lines.append("")
    for tag, n in data['struct'].most_common(12):
        pct = 100 * n / data['n']
        # human label from STRUCT_PATTERNS
        human = next((h for rx, t, h in STRUCT_PATTERNS if t == tag), tag)
        report_lines.append(f"- **{tag}** ({pct:.1f}%) — `{human}`")
    report_lines.append("")
    report_lines.append(f"### Verbos líderes (top 10 en 1ª posición útil)")
    report_lines.append("")
    for v, n in data['verbs'].most_common(10):
        report_lines.append(f"- `{v}` — {n}")
    report_lines.append("")
    report_lines.append(f"### Esqueletos más repetidos (top 10)")
    report_lines.append("")
    for sk, n in data['skel'].most_common(10):
        if n < 2: continue
        report_lines.append(f"- `{sk}` — {n}×")
    report_lines.append("")
    # 5 titulares ejemplo
    examples = sorted(winners_per_bucket[bucket], key=lambda r: (-r['score'], r['position']))[:5]
    report_lines.append(f"### Top 5 titulares ganadores")
    report_lines.append("")
    for ex in examples:
        report_lines.append(f"- *(score={ex['score']}, pos=#{ex['position']})* — {ex['title']}")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")

OUT_REPORT.write_text('\n'.join(report_lines), encoding='utf-8')
print(f"\nReport written to {OUT_REPORT}")

# ---------------------------------------------------------------------
# 6. Build learned headline-formulas.json
# ---------------------------------------------------------------------

def build_template_lines(bucket, data, sample_rows):
    """Convierte los patterns top de un bucket en lineas declarativas
    con slots {entity} compatibles con nuestro formatter."""
    lines = []
    # Leading verbs -> transformar a formulas tipo "{entity} {verbo} {complemento}"
    top_verbs = [v for v, n in data['verbs'].most_common(5) if n >= 2]
    # Top struct tags -> mapping a templates concretos
    struct = [t for t, n in data['struct'].most_common(8) if n >= 3]

    if 'leading_ultima_hora' in struct:
        lines.append("Ultima hora: {entity}, claves del caso")
    if 'leading_confirmado' in struct:
        lines.append("Confirmado: {entity} y el giro inesperado")
    if 'leading_oficial' in struct or 'ya_es_oficial' in struct:
        lines.append("Oficial: {entity}, la novedad definitiva")
    if 'numero_lead' in struct:
        lines.append("{entity}: las claves que estan detras")
    if 'pregunta_directa' in struct:
        lines.append("Por que {entity} es tendencia hoy (y que pasa ahora)")
    if 'asi_lead' in struct:
        lines.append("Asi ha evolucionado {entity}")
    if 'esto_es_lo_que' in struct:
        lines.append("Esto es lo que pasa con {entity}")
    if 'lo_que_no' in struct:
        lines.append("Lo que nadie te esta contando de {entity}")
    if 'ni_x_ni_y' in struct:
        lines.append("Ni una cosa ni la otra: la realidad sobre {entity}")
    if 'mas_alla' in struct:
        lines.append("Mas alla del titular: {entity}, el angulo que falta")
    if 'colon_reveal' in struct or 'colon_esto_es' in struct:
        lines.append("{entity}: asi queda tras la noticia")
    if 'revelado' in struct:
        lines.append("Revelado: {entity} y la clave que lo cambia todo")
    # Añadir verbo-driven: combinar verbo top con entity
    for v in top_verbs[:3]:
        # Presentation
        if v.endswith('an') or v.endswith('ado'):
            lines.append(f"{{entity}}: as\u00ed lo {v}")
        else:
            lines.append(f"{{entity}} {v} y marca la jornada")
    # Deduplicate preserving order
    seen = set()
    dedup = []
    for l in lines:
        if l in seen: continue
        seen.add(l)
        dedup.append(l)
    return dedup[:5]  # max 5 lineas por regla

learned_rules_json = []

# Build a generic fallback (bucket news_general) primero
for bucket, alert_matches in BUCKET_ALERT_MAP.items():
    if bucket not in bucket_patterns: continue
    data = bucket_patterns[bucket]
    lines = build_template_lines(bucket, data, winners_per_bucket[bucket])
    if not lines: continue
    for m in alert_matches:
        learned_rules_json.append({
            "match": m,
            "lines": lines,
            "_source": f"DiscoverSnoop ES export, bucket={bucket}, n={data['n']}, avg_score={sum(w['score'] for w in winners_per_bucket[bucket])/data['n']:.1f}",
        })

# Also: generic rules without topic/subtype, derived from news_general
if "news_general" in bucket_patterns:
    data = bucket_patterns["news_general"]
    lines = build_template_lines("news_general", data, winners_per_bucket["news_general"])
    for t in ["entity", "entity_coverage", "trends_without_discover"]:
        # Generic fallback on each type (lowest precedence since match only has type)
        learned_rules_json.append({
            "match": {"type": t},
            "lines": lines,
            "_source": f"DiscoverSnoop ES export, bucket=news_general, generic fallback",
        })

final = {
    "//": "Formulas derivadas de un export DiscoverSnoop ES (10k titulares, 2024-04 a 2026-04). Las lineas fueron extraidas analizando estructuras y verbos dominantes en titulares ganadores (score>=10, position<=15) de cada vertical editorial. Regenerado con /tmp/analyze_headlines.py.",
    "rules": learned_rules_json,
}
OUT_FORMULAS.write_text(json.dumps(final, indent=2, ensure_ascii=False) + "\n", encoding='utf-8')
print(f"Learned formulas written to {OUT_FORMULAS}")
print(f"Total rules: {len(learned_rules_json)}")
