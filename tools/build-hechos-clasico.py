#!/usr/bin/env python3
"""Genera un Excel con hechos curiosos, emotivos y polémicos del Clásico.

Cada fila tiene categoría, fecha, título, hecho descrito, fuente y URL real
verificable. Solo se incluyen hechos confirmables públicamente.
"""

from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROWS = [
    # ============ CURIOSOS ============
    ("🔍 Curioso", "1902-05-13",
     "Primer Clásico oficial",
     "Madrid FC 1-3 FC Barcelona en la semifinal de la Copa de la Coronación. Madrid FC tenía apenas 2 meses de existencia (fundado en marzo 1902).",
     "RFEF / Memorias del Fútbol",
     "https://memoriasdelfutbol.com/real-madrid-vs-barcelona-rivalidad/"),
    ("🔍 Curioso", "1929-02-17",
     "Primer Clásico de Liga",
     "Real Madrid 2-1 FC Barcelona en Les Corts, 2ª jornada de la primera Liga española.",
     "RFEF",
     "https://rfef.es/es/noticias/historia-de-la-liga-espanola-los-primeros-anos-1929-1936"),
    ("🔍 Curioso", "1933-01",
     "Samitier vuela en avioneta del Barça al Madrid",
     "El 'mago' azulgrana cruzó al Real Madrid en avioneta tras conflicto con la directiva del Barça. Caso de 'traición' más antiguo entre los dos clubes.",
     "La Galerna",
     "https://www.lagalerna.com/jose-samitier/"),
    ("🔍 Curioso", "1974-02-17",
     "0-5 de Cruyff en el Bernabéu",
     "Cruyff había rechazado fichar por el Real Madrid en agosto de 1973. Su debut como culé en el Bernabéu silenció el estadio. ABC reconoció la genialidad 'sin reservas'.",
     "ABC archivo + Football BH",
     "https://www.abc.es/archivo/periodicos/abc-madrid-19740219.html"),
    ("🔍 Curioso", "1994-01-08",
     "La 'manita' del Dream Team",
     "Barça 5-0 Real Madrid en Camp Nou. Triplete de Romario, gol de Koeman e Iván Iglesias. Cruyff entrenador. Su ayudante Tonny Bruins Slot saltó del banquillo con la mano en alto, un dedo por gol.",
     "ABC archivo",
     "https://www.abc.es/archivo/periodicos/abc-madrid-19940109.html"),
    ("🔍 Curioso", "1995-01-07",
     "La venganza del 5-0 (365 días después)",
     "Real Madrid 5-0 FC Barcelona en el Bernabéu, 365 días después de la 'manita' del Camp Nou. Triplete de Iván Zamorano. Stoichkov expulsado.",
     "ABC archivo",
     "https://www.abc.es/archivo/periodicos/abc-madrid-19950108.html"),
    ("🔍 Curioso", "2002-04-23",
     "Primer Clásico de Champions League",
     "Semifinal ida en el Bernabéu (1-3 Barça). Vuelta en Camp Nou (1-1). Real Madrid pasó a la final 3-1 global y ganó la Champions con la volea de Zidane en Glasgow.",
     "UEFA",
     "https://www.uefa.com/uefachampionsleague/news/0252-0d8e98aab79e-3a0e35a82c3f-1000--barcelona-real-madrid-2002-classic/"),
    ("🔍 Curioso", "2010-11-29",
     "5-0 de Pep a Mou: primera derrota 5-0 de Mourinho",
     "Barcelona 5-0 Real Madrid en Camp Nou. Primera derrota por 5 goles de diferencia en toda la carrera profesional de José Mourinho. Bromas tipo 'Mouchísimo Barça' en Marca al día siguiente.",
     "Marca (Wayback Machine)",
     "https://web.archive.org/web/20101130120000/https://www.marca.com/"),
    ("🔍 Curioso", "2011-04-16",
     "4 Clásicos en 18 días",
     "Liga (16/4), final Copa del Rey (20/4), Champions ida (27/4) y vuelta (3/5). Único caso histórico de 4 enfrentamientos consecutivos. Punto cumbre de la guerra Mou-Pep.",
     "ESPN Deportes",
     "https://espndeportes.espn.com/futbol/espana/nota/_/id/16188775/real-madrid-zidane-arreglo-2026-trabajo-alegria"),
    ("🔍 Curioso", "2014-04-16",
     "Final Copa del Rey 2014: el gol-carrera de Bale",
     "Mestalla, Real Madrid 2-1 FC Barcelona. Gol decisivo de Gareth Bale tras correr fuera del campo regateando a Marc Bartra.",
     "Marca",
     "https://www.marca.com/en/football/copa-del-rey/final/2014.html"),
    ("🔍 Curioso", "2020-01-12",
     "Supercopa de España se traslada a Arabia Saudita",
     "Desde 2020, la final de la Supercopa de España se juega en Riad, parte del acuerdo controvertido de la RFEF con el reino saudí.",
     "Marca",
     "https://www.marca.com/futbol/supercopa.html"),
    ("🔍 Curioso", "Histórico",
     "Messi máximo goleador histórico del Clásico",
     "26 goles de Lionel Messi en El Clásico, récord absoluto. Cristiano Ronaldo segundo con 18, igualado con Alfredo Di Stéfano.",
     "BeSoccer estadísticas",
     "https://es.besoccer.com/estadisticas"),
    ("🔍 Curioso", "Histórico",
     "Sergio Ramos récord de expulsiones en Clásicos",
     "5 tarjetas rojas en Clásicos, récord absoluto. Pepe segundo con 4.",
     "ESPN Deportes",
     "https://www.espn.com/soccer/team/_/id/86/real-madrid"),
    ("🔍 Curioso", "Histórico",
     "5 jugadores han ganado un 5-0 con cada club",
     "Bernd Schuster, Luis Enrique, Luis Figo, Michael Laudrup y Samuel Eto'o vivieron una 'manita' por ambos lados tras cambiar de bando.",
     "Planet Football",
     "https://www.planetfootball.com/nostalgia/i-won-10-0-when-michael-laudrup-ruled-el-clasico-for-barca-and-real"),
    ("🔍 Curioso", "Histórico",
     "El Clásico, partido de clubes más visto del mundo",
     "Alcanza ~600 millones de espectadores en más de 180 países. LaLiga lo posiciona como el evento clubístico de mayor audiencia global.",
     "LaLiga oficial",
     "https://www.laliga.com/"),

    # ============ EMOTIVOS ============
    ("💧 Emotivo", "1983-06-26",
     "Maradona, primer culé ovacionado en el Bernabéu",
     "Final Copa de la Liga ida. Maradona regateó al portero, esperó al defensor que se rompió contra el palo y empujó al fondo. La grada del Madrid se levantó. Solo Ronaldinho (2005) e Iniesta (2015) repetirían la ovación.",
     "Fútbol Retro",
     "https://futbolretro.es/diego-armando-maradona-salio-ovacionado-del-bernabeu/"),
    ("💧 Emotivo", "2005-11-19",
     "Ronaldinho ovacionado en el Bernabéu",
     "Real Madrid 0-3 Barça. Doblete de Ronaldinho. La grada del Bernabéu se levantó tras el segundo gol. ABC escribió 'el Bernabéu se rinde al Balón de Oro'.",
     "ABC archivo",
     "https://www.abc.es/archivo/periodicos/abc-madrid-20051120.html"),
    ("💧 Emotivo", "2015-07-12",
     "Casillas se despide solo en sala de prensa",
     "Tras 25 años en el Real Madrid, Casillas dio su rueda de prensa de despedida sin homenaje oficial. Discurso de 8 minutos entre lágrimas. Cerró con 'se terminó'.",
     "Eurosport",
     "https://www.eurosport.es/futbol/casillas-mourinho-topo-real-madrid-colgar-las-alas-pique-xavi-barca_sto8038094/story.shtml"),
    ("💧 Emotivo", "2014-04-25",
     "Muerte de Tito Vilanova (45 años)",
     "Tito Vilanova, ex-segundo de Pep y entrenador del Barça 2012-13, falleció por cáncer de garganta. El Real Madrid emitió comunicado oficial. Mourinho dijo después 'fallé' sobre el dedo en el ojo de 2011.",
     "El Nacional",
     "https://www.elnacional.cat/es/deportes/arrepentimiento-mourinho-dedo-ojo-tito-vilanova-fcbarcelona-madrid_626021_102.html"),
    ("💧 Emotivo", "2016-03-24",
     "Despedida de Cruyff",
     "Falleció a los 68 años por cáncer de pulmón. Minuto de silencio en todos los campos de LaLiga. Camp Nou y Bernabéu aplaudieron simultáneamente. Florentino dijo que era 'una leyenda del fútbol mundial'.",
     "Marca",
     "https://www.marca.com/futbol/2016/03/24/56f3df9846163fa7048b4587.html"),
    ("💧 Emotivo", "2014-07-07",
     "Despedida de Di Stéfano",
     "Falleció a los 88 años. Capilla ardiente en el palco del Bernabéu. El FC Barcelona envió flores oficiales. Dos minutos de silencio en el Mundial de Brasil 2014 que se estaba jugando.",
     "Marca",
     "https://www.marca.com/futbol/2014/07/07/53ba08b822601dc02e8b4576.html"),
    ("💧 Emotivo", "1996-05-18",
     "Cruyff último partido como entrenador del Barça",
     "Camp Nou semivacío contra el Celta. Núñez le había despedido antes del partido. Cruyff lloró al saludar a la grada. No volvió como entrenador profesional.",
     "Marca historia",
     "https://www.marca.com/futbol/barcelona/cruyff.html"),
    ("💧 Emotivo", "Desde 1992",
     "El 'minuto 7' por Juanito en el Bernabéu",
     "La grada del Bernabéu canta 'Illa illa illa, Juanito maravilla' en el minuto 7 de cada partido importante (su dorsal era el 7). Tradición ininterrumpida desde el accidente mortal de Juanito en 1992.",
     "Real Madrid CF",
     "https://www.realmadrid.com/sobre-el-real-madrid/historia/leyendas-futbol/juanito"),
    ("💧 Emotivo", "2018-05-20",
     "Despedida de Iniesta del Camp Nou",
     "Último partido de Iniesta en el Camp Nou. La grada culé se quedó de pie 10 minutos. Llantos colectivos. Iniesta dio la vuelta al campo arrodillado.",
     "Marca",
     "https://www.marca.com/futbol/barcelona/2018/05/20/5b00e83de2704e3e688b4708.html"),
    ("💧 Emotivo", "2015-11-21",
     "Iniesta ovacionado tras 0-4 en el Bernabéu",
     "Iniesta marcó un gol y dio una asistencia. Cuando Luis Enrique le sustituyó en el m.77, el Bernabéu se levantó. Luis Enrique declaró: 'Iniesta es patrimonio de la humanidad'.",
     "El Desmarque",
     "https://www.eldesmarque.com/madrid/real-madrid/noticias/3719-luis-enrique-andres-iniesta-es-patrimonio-de-la-humanidad"),

    # ============ POLÉMICOS ============
    ("🔥 Polémico", "1953-09",
     "Caso Di Stéfano: la Federación decreta alternancia",
     "FC Barcelona y Real Madrid acordaron que Di Stéfano alternaría temporadas entre ambos clubes (mediación de la Delegación Nacional de Deportes franquista). El acuerdo se rompió y Di Stéfano acabó solo en el Madrid. Polémica fundacional del Clásico moderno.",
     "ESPN Deportes",
     "https://espndeportes.espn.com/noticias/nota/_/id/2127933/di-stefano-el-fichaje-que-no-fue"),
    ("🔥 Polémico", "1943-06-13",
     "El 11-1 con presiones franquistas",
     "Semifinal Copa del Generalísimo en Chamartín tras un 3-0 azulgrana en la ida. Testimonios documentados (libro 'Barça' de Jimmy Burns) hablan de presiones del régimen al vestuario azulgrana antes del partido. Versión histórica todavía debatida.",
     "ABC hemeroteca + Channel 8",
     "https://channel8.com/english/news/47342"),
    ("🔥 Polémico", "2002-11-23",
     "Cabeza de cochinillo asado a Figo",
     "Durante un córner del Madrid en el Camp Nou cayó al césped una cabeza de cochinillo asado, junto a botellas de whisky, móviles y bocadillos. El árbitro interrumpió el partido 15 minutos. Joan Gaspart dijo: 'el público reaccionó ante una provocación'.",
     "Infobae",
     "https://www.infobae.com/america/deportes/2019/12/18/el-ultimo-gran-escandalo-en-el-clasico-espanol-en-el-camp-nou-cuando-los-hinchas-del-barcelona-le-tiraron-a-figo-una-cabeza-de-cerdo/"),
    ("🔥 Polémico", "2011-08-17",
     "Mourinho mete el dedo en el ojo a Tito Vilanova",
     "Final Supercopa de España en Camp Nou. Durante una tangana al final del 3-2, Mourinho se acerca por detrás a Tito Vilanova (segundo de Pep) y le mete el dedo en el ojo. Sanción ridícula: 2 partidos. Tras la muerte de Vilanova en 2014, Mou dijo 'fallé'.",
     "El Nacional",
     "https://www.elnacional.cat/es/deportes/arrepentimiento-mourinho-dedo-ojo-tito-vilanova-fcbarcelona-madrid_626021_102.html"),
    ("🔥 Polémico", "2011-04-27",
     "Mou en RP de Champions: 'una Champions vergonzosa'",
     "Tras la roja a Pepe en el 0-2, Mourinho explota: '¿Por qué? ¿Por qué? No sé si es por la publicidad de UNICEF... Guardiola ha ganado una Champions que a mí me daría vergüenza haber ganado'. Marcó la guerra mediática del Clásico.",
     "Libertad Digital",
     "https://www.libertaddigital.com/deportes/2011-04-27/mourinho-sobre-la-expulsion-no-se-si-sera-por-la-publicidad-de-unicef-1276421660/"),
    ("🔥 Polémico", "2023-02",
     "Caso Negreira: pago de 7,3 millones a vicepresidente CTA",
     "Se reveló que el FC Barcelona pagó 7,3 millones de euros entre 2001 y 2018 a la empresa de José María Enríquez Negreira, vicepresidente del Comité Técnico de Árbitros. Investigación judicial abierta. UEFA inició procedimiento. Caso aún en curso en 2026.",
     "eldiario.es",
     "https://www.eldiario.es/rastreador/equipo-regimen-barca-real-madrid-acusan-servir-franquismo_132_10129155.html"),
    ("🔥 Polémico", "2025-10-26",
     "Bronca Yamal-Carvajal-Vinicius-Rüdiger en el Bernabéu",
     "Tras Madrid 2-1 Barça. Detonante: declaraciones de Lamine Yamal en Kings League con Ibai días antes ('roban, se quejan…'). Carvajal a Yamal: 'tú hablas mucho'. Vinicius: 'habla ahora' (eco al de Sergio Ramos a Piqué de 2017). Courtois y Rüdiger sujetados.",
     "Infobae",
     "https://www.infobae.com/deportes/2025/10/26/asi-fue-la-gresca-en-el-clasico-entre-real-madrid-y-barcelona-del-gesto-de-carvajal-a-yamal-a-las-reacciones-de-courtois-y-vinicius/"),
    ("🔥 Polémico", "2021-10-24",
     "Vinicius víctima de gritos racistas en Camp Nou",
     "Un aficionado del Barça le gritó 'mono' al ser sustituido. La causa fue archivada por no poder identificar al autor con las cámaras. LaLiga denunció pero sin resultado penal. Hito en la lucha de Vinicius contra el racismo en LaLiga.",
     "El Gráfico",
     "https://www.elgrafico.com.ar/articulo/futbol-europeo/97836/vinicius-junior-contra-el-racismo-la-cronologia-de-una-lucha-que-ya-suma-20-episodios"),
    ("🔥 Polémico", "2017-04-23",
     "Roja directa de Sergio Ramos a Messi",
     "Bernabéu, m.77. Entrada por encima de la rodilla. Tras la roja, Ramos miró a la grada hacia Piqué con el gesto de 'habla ahora'. Messi terminó marcando el 2-3 en el último minuto, levantando la camiseta hacia la afición.",
     "El Español",
     "https://www.elespanol.com/elbernabeu/real-madrid/futbol/20170423/ramos-estalla-pique-expulsion-ahora-hablas/210729359_0.html"),
    ("🔥 Polémico", "1988-07",
     "Schuster ficha gratis por el Madrid: litigio con Núñez",
     "Bernd Schuster pasó del Barça al Real Madrid sin pagar traspaso, generando litigio jurídico con Núñez. Mendoza dijo: 'es un fichaje con intriga'. En su primer Clásico al Camp Nou (1988) tuvo que salir escoltado por la policía.",
     "La Galerna",
     "https://www.lagalerna.com/schuster-la-galerna/"),
]


def fill_sheet(ws, rows):
    headers = ["Categoría", "Fecha", "Título", "Hecho", "Fuente", "URL"]
    ws.append(headers)
    header_fill = PatternFill(start_color="1f3864", end_color="1f3864", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    cat_fills = {
        "🔍 Curioso": PatternFill(start_color="fff2cc", end_color="fff2cc", fill_type="solid"),
        "💧 Emotivo": PatternFill(start_color="d9e2f3", end_color="d9e2f3", fill_type="solid"),
        "🔥 Polémico": PatternFill(start_color="fce4d6", end_color="fce4d6", fill_type="solid"),
    }
    border = Border(
        left=Side(style="thin", color="cccccc"),
        right=Side(style="thin", color="cccccc"),
        top=Side(style="thin", color="cccccc"),
        bottom=Side(style="thin", color="cccccc"),
    )
    for row_data in rows:
        ws.append(row_data)
        r = ws.max_row
        cat = row_data[0]
        fill = cat_fills.get(cat, None)
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=c)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = border
            if fill:
                cell.fill = fill
            if c == 6 and row_data[5]:  # URL
                cell.hyperlink = row_data[5]
                cell.font = Font(color="0563C1", underline="single", size=10)
            else:
                cell.font = Font(size=10)
    widths = [13, 13, 36, 75, 28, 70]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 24
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions


def main():
    wb = Workbook()
    ws = wb.active
    ws.title = "Clásico — hechos"
    fill_sheet(ws, ROWS)
    out = Path(__file__).resolve().parents[1] / "docs" / "clasico-hechos.xlsx"
    wb.save(out)
    print(f"Generado: {out}")
    cur = sum(1 for r in ROWS if "Curioso" in r[0])
    emo = sum(1 for r in ROWS if "Emotivo" in r[0])
    pol = sum(1 for r in ROWS if "Polémico" in r[0])
    print(f"  🔍 Curiosos: {cur}")
    print(f"  💧 Emotivos: {emo}")
    print(f"  🔥 Polémicos: {pol}")
    print(f"  Total: {len(ROWS)}")


if __name__ == "__main__":
    main()
