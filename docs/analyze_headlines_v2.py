"""
Analyzer v2 — score-weighted + tier viral/winner.

Cambios vs v1 (docs/analyze_headlines.py):
- Score es relativo (DiscoverSnoop: 100 = top del periodo-pais, escala de audiencia).
- Cada patron recibe SCORE-WEIGHTED WEIGHT = sum(score)/count → audiencia media
  representativa del patron, no frecuencia bruta.
- Dos tiers:
    VIRAL  = score >= 30   (top-of-top, ~5% del dataset)
    WINNER = p75 del bucket <= score < 30   (solidos pero no virales)
- Report destaca patrones presentes SOLO en viral (diferenciales) y patrones
  con mayor ratio viral_weight / winner_weight (los que escalan mas).
- Output: /tmp/formulas-report-v2.md
"""

import csv, re, collections, unicodedata, statistics
from pathlib import Path

CSV_PATH = "/Users/danielmd/Desktop/pages-20240401-20260417-ES-1776381353.csv"
OUT_REPORT = Path("/tmp/formulas-report-v2.md")
VIRAL_SCORE_MIN = 30

# --- reuse bucket mapping from v1 ---
CATEGORY_BUCKETS = {
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
    "news_general":   (["/News"], None, None),
}
BUCKET_ORDER = ["sucesos","legal","politica","deportes","entretenimiento","economia","tech","salud","motor","gastro","viajes","sociedad","hogar","trabajo","shopping","hobbies","news_general"]

def bucket_for(c):
    if not c: return "sin_categoria"
    for bid in BUCKET_ORDER:
        for p in CATEGORY_BUCKETS[bid][0]:
            if c.startswith(p): return bid
    return "otros"

def strip_accents(s): return ''.join(ch for ch in unicodedata.normalize('NFD', s) if unicodedata.category(ch) != 'Mn')
def normalize(s): return strip_accents(s.lower()).strip()

STRUCT_PATTERNS = [
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

def extract_struct_tags(tn):
    return [tag for rx, tag, _ in STRUCT_PATTERNS if rx.search(tn)]

# --- load ---
rows = []
with open(CSV_PATH, encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        if not r.get('title'): continue
        try:
            sc = float(r.get('score') or 0)
            po = int(float(r.get('position') or 99))
        except ValueError:
            continue
        rows.append({'title': r['title'].strip(), 'score': sc, 'position': po,
                     'category': r.get('category') or '', 'bucket': bucket_for(r.get('category') or '')})

print(f"loaded {len(rows)} rows")

# Overall score distribution
scores = [r['score'] for r in rows]
print(f"score distribution: p25={statistics.quantiles(scores, n=4)[0]:.1f} p50={statistics.median(scores):.1f} p75={statistics.quantiles(scores, n=4)[2]:.1f} p90={statistics.quantiles(scores, n=10)[8]:.1f} p95={statistics.quantiles(scores, n=20)[18]:.1f} max={max(scores):.1f}")
viral_count = sum(1 for r in rows if r['score'] >= VIRAL_SCORE_MIN)
print(f"viral (score>={VIRAL_SCORE_MIN}): {viral_count} ({100*viral_count/len(rows):.1f}%)")

# --- per bucket: winner tier (p75..<viral) + viral tier (>=30) ---
bucket_stats = {}
for bucket in BUCKET_ORDER:
    brows = [r for r in rows if r['bucket'] == bucket]
    if len(brows) < 30: continue
    bsc = sorted(r['score'] for r in brows)
    p75 = bsc[int(len(bsc)*0.75)]
    winners = [r for r in brows if p75 <= r['score'] < VIRAL_SCORE_MIN and r['position'] <= 20]
    virals  = [r for r in brows if r['score'] >= VIRAL_SCORE_MIN and r['position'] <= 20]
    bucket_stats[bucket] = {
        'total': len(brows), 'p75': p75,
        'winners': winners, 'virals': virals,
    }

print(f"\nbuckets con viral tier (n>=3):")
for b, s in sorted(bucket_stats.items(), key=lambda x: -len(x[1]['virals'])):
    if len(s['virals']) < 3: continue
    print(f"  {b:15s}  total={s['total']:4d}  p75={s['p75']:.1f}  winners={len(s['winners']):4d}  virals={len(s['virals']):3d}")

# --- score-weighted pattern analysis ---
def pattern_weights(items, tag_fn=extract_struct_tags):
    """Return dict tag -> { count, sum_score, avg_score, max_score }"""
    agg = collections.defaultdict(lambda: {'count': 0, 'sum_score': 0.0, 'max_score': 0.0})
    for r in items:
        tn = normalize(r['title'])
        for tag in tag_fn(tn):
            a = agg[tag]
            a['count'] += 1
            a['sum_score'] += r['score']
            if r['score'] > a['max_score']: a['max_score'] = r['score']
    for tag, a in agg.items():
        a['avg_score'] = a['sum_score'] / a['count']
    return agg

# --- build report ---
out = [
    "# Análisis v2 — Score-weighted + tier viral/winner",
    "",
    f"**Dataset**: {len(rows)} titulares DiscoverSnoop ES (2024-04 → 2026-04).",
    f"**Score distribution**: p25={statistics.quantiles(scores,n=4)[0]:.1f} · p50={statistics.median(scores):.1f} · p75={statistics.quantiles(scores,n=4)[2]:.1f} · p90={statistics.quantiles(scores,n=10)[8]:.1f} · p95={statistics.quantiles(scores,n=20)[18]:.1f} · max={max(scores):.1f}",
    f"**Viral threshold**: score ≥ {VIRAL_SCORE_MIN} → {viral_count} titulares ({100*viral_count/len(rows):.1f}% del dataset).",
    "",
    "**Cómo leer este reporte**:",
    "- `avg_score` de un patrón = audiencia media (0-100) de los titulares que lo usan en ese bucket/tier.",
    "- `count` = cuántos titulares usan el patrón.",
    "- **Un patrón con avg_score alto es MÁS Discover-compatible** que uno con count alto y avg_score bajo.",
    "- Tier **VIRAL** (≥30) muestra los patrones que escalan hasta top de Discover. Los virales tienen varias veces la audiencia de un winner estándar.",
    "",
    "---",
    ""
]

for bucket in BUCKET_ORDER:
    if bucket not in bucket_stats: continue
    s = bucket_stats[bucket]
    if not s['virals']: continue  # solo buckets con al menos 1 viral
    n_w, n_v = len(s['winners']), len(s['virals'])
    out.append(f"## {bucket.upper()}  —  winners: {n_w}  ·  virals: {n_v}")
    out.append("")

    # Patrones (struct tags)
    w_agg = pattern_weights(s['winners'])
    v_agg = pattern_weights(s['virals'])
    all_tags = set(w_agg.keys()) | set(v_agg.keys())

    # Tabla comparativa
    out.append("| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |")
    out.append("|---|---|---|---|")
    rows_view = []
    for tag in all_tags:
        w = w_agg.get(tag, {'count':0,'avg_score':0.0})
        v = v_agg.get(tag, {'count':0,'avg_score':0.0})
        ratio = (v['avg_score'] / w['avg_score']) if w['avg_score'] > 0 else (float('inf') if v['count'] > 0 else 0)
        rows_view.append((tag, w, v, ratio))
    # sort por diferencial descendente (virales primero)
    rows_view.sort(key=lambda x: (-x[3] if x[3] != float('inf') else -99999, -x[2]['count']))
    for tag, w, v, ratio in rows_view[:12]:
        ratio_str = f"{ratio:.1f}×" if ratio != float('inf') else "∞ (solo en viral)"
        out.append(f"| `{tag}` | {w['count']} · {w['avg_score']:.1f} | {v['count']} · {v['avg_score']:.1f} | **{ratio_str}** |")
    out.append("")

    # Patrones exclusivos del tier viral
    exclusive_viral = [t for t in all_tags if v_agg.get(t,{}).get('count',0) > 0 and w_agg.get(t,{}).get('count',0) == 0]
    if exclusive_viral:
        out.append(f"**Patrones EXCLUSIVOS del tier viral** (0 apariciones en winners): " + ", ".join(f"`{t}` ({v_agg[t]['count']})" for t in exclusive_viral))
        out.append("")

    # Top 5 titulares viral
    out.append("**Top 5 titulares VIRAL**:")
    out.append("")
    for r in sorted(s['virals'], key=lambda x: -x['score'])[:5]:
        out.append(f"- *(score={r['score']:.1f}, pos=#{r['position']})* — {r['title']}")
    out.append("")
    out.append("---")
    out.append("")

# Global cross-bucket: patrones con mayor ratio promedio
out.append("## Cross-bucket: patrones que más escalan al tier viral")
out.append("")
out.append("Calculado solo sobre buckets con al menos 5 virales. Ratio = avg_score(viral) / avg_score(winner).")
out.append("")
cross = collections.defaultdict(lambda: {'ratios': [], 'winners_count': 0, 'virals_count': 0})
for bucket, s in bucket_stats.items():
    if len(s['virals']) < 5: continue
    w_agg = pattern_weights(s['winners'])
    v_agg = pattern_weights(s['virals'])
    for tag in set(w_agg) | set(v_agg):
        w = w_agg.get(tag, {'count':0,'avg_score':0.0})
        v = v_agg.get(tag, {'count':0,'avg_score':0.0})
        cross[tag]['winners_count'] += w['count']
        cross[tag]['virals_count'] += v['count']
        if w['avg_score'] > 0 and v['count'] > 0:
            cross[tag]['ratios'].append(v['avg_score'] / w['avg_score'])
out.append("| Patrón | winners | virals | ratio medio |")
out.append("|---|---|---|---|")
cross_sorted = sorted(cross.items(), key=lambda x: -(sum(x[1]['ratios'])/len(x[1]['ratios']) if x[1]['ratios'] else 0))
for tag, d in cross_sorted[:15]:
    avg_r = sum(d['ratios'])/len(d['ratios']) if d['ratios'] else 0
    out.append(f"| `{tag}` | {d['winners_count']} | {d['virals_count']} | **{avg_r:.2f}×** |")
out.append("")

OUT_REPORT.write_text('\n'.join(out), encoding='utf-8')
print(f"\nreport written to {OUT_REPORT}")
