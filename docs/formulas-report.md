# Análisis de fórmulas de titulares — export DiscoverSnoop ES

**Dataset**: 9979 titulares (2024-04 → 2026-04), 25 top-level categorías Google Discover.
**Winners**: top 25% por score dentro de cada bucket, con `position ≤ 20`. Total: 2351.

Las métricas que uso:
- `score` DiscoverSnoop (0–100, relevancia en Discover España).
- `position` (1 = arriba del feed, 28 = abajo).
- Los *winners* son los titulares que dominaron Discover en su slot.

Para cada bucket editorial extraigo:
1. **Estructuras dominantes** (colon-split, pregunta, número, declarativo…)
2. **Verbos y leading tokens** que repiten en titulares ganadores
3. **Templates reales** (esqueletos con slots {E} entidad, {N} número, {Q} cita)

---

## Economía  (`economia`)  — 319 winners

### Estructuras dominantes (% sobre 319)

- **colon_split_generic** (55.8%) — `{X}: {Y}`
- **entity_action_target** (35.1%) — `{E1} {verbo} a {E2}`
- **leading_confirmado** (3.1%) — `Confirmado: ...`
- **colon_reveal** (2.5%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_directa** (2.2%) — `{Que|Como|Por que} ...`
- **colon_esto_es** (1.6%) — `{X}: esto es lo que...`
- **ni_x_ni_y** (1.6%) — `Ni X ni Y: ...`
- **asi_lead** (1.3%) — `Asi {verbo} ...`
- **pregunta_final** (1.3%) — `... ?`
- **leading_alerta** (0.6%) — `Alerta ...`
- **esto_es_lo_que** (0.3%) — `Esto es lo que {hecho}`
- **numero_lead** (0.3%) — `{N} {cosas} que ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 10
- `confirma` — 6
- `anuncia` — 3
- `revela` — 1

### Esqueletos más repetidos (top 10)

- `llegan cartas {e} más {n} personas recibirán declaración renta` — 3×
- `busca cajones casa moneda {n} pesetas vale más {n} euros` — 2×
- `confirmado {e} cambia fecha declaración {e}` — 2×
- `revisa nómina datos debes comprobar saber cobras te corresponde` — 2×
- `amas casa pueden solicitar nueva pensión {n} euros {n} requisitos` — 2×
- `tires aceite cocina usado llévalo gasolinera {e} cada litro te regalan saldo llenar depósito gasolina` — 2×
- `agencia tributaria avisa españoles tengan propiedad piso o casa {e}` — 2×
- `hacienda devuelve {n} euros pensionistas aparezcan listado` — 2×
- `miles trabajadores notarán nómina nueva deducción {n} euros aprobada {e}` — 2×
- `banco {e} avisa titulares cuenta conjunta uno fallece otro podrá sacar dinero permiso herederos` — 2×

### Top 5 titulares ganadores

- *(score=50.5, pos=#16)* — Adriana, camionera: "Cuando llego al área de descanso echo las cortinas y no bajo del camión para que no vean que soy mujer"
- *(score=43.7, pos=#20)* — Hace 6.000 años enterraron a dos hermanas junto a un bebé y un perro en una mina de sílex en Chequia
- *(score=34.6, pos=#5)* — Antes tiraba las cajas de leche gastadas de Mercadona, ahora me he dado cuenta que son un tesoro para organizar la casa
- *(score=30.5, pos=#18)* — Las personas que siempre ayudan a los camareros después de comer en un restaurante tienen estas características, según la psicología
- *(score=26.0, pos=#15)* — La moneda más buscada de España: solo hay ocho ejemplares y su valor ronda los dos millones de euros

---

## Legal / Tribunales  (`legal`)  — 232 winners

### Estructuras dominantes (% sobre 232)

- **colon_split_generic** (48.3%) — `{X}: {Y}`
- **entity_action_target** (43.1%) — `{E1} {verbo} a {E2}`
- **leading_confirmado** (3.4%) — `Confirmado: ...`
- **ya_es_oficial** (2.6%) — `Ya es oficial: ...`
- **colon_reveal** (1.3%) — `{X}: {asi|lo que|por que} ...`
- **ni_x_ni_y** (0.4%) — `Ni X ni Y: ...`
- **pregunta_directa** (0.4%) — `{Que|Como|Por que} ...`
- **asi_lead** (0.4%) — `Asi {verbo} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 8
- `confirma` — 5
- `sentencia` — 1
- `anuncia` — 1
- `confirman` — 1

### Esqueletos más repetidos (top 10)

- `oficial trabajadores ganen {n} euros podrán cobrar paro sueldo mismo tiempo` — 2×
- `oficial nuevo registro horario {e} empresas tienen dar trabajadores recibo horas extra` — 2×
- `enrique gil piloto f {n} {e} {q}` — 2×
- `andrés millán abogado {q}` — 2×
- `hacienda lanza aviso queda prohibido seguir pagando efectivo cantidades partir ahora aunque fraccionado` — 2×

### Top 5 titulares ganadores

- *(score=21.0, pos=#5)* — Ya es oficial: los trabajadores que ganen menos de 1.350 euros podrán cobrar el paro y su sueldo al mismo tiempo
- *(score=17.4, pos=#3)* — Hacienda multará a los propietarios con más de una vivienda si no la usan como residencia habitual
- *(score=16.2, pos=#2)* — Nuevo año, nueva ayuda: el Gobierno regalará 200 euros mensuales durante 18 años a las familias que cumplan estas condiciones en 2025
- *(score=13.6, pos=#13)* — El Rey Juan Carlos, desde Abu Dabi: "Al final van a tener que reconocer lo que hice. Voy a acabar ganando"
- *(score=13.3, pos=#3)* — Felipe VI cancela las vacaciones privadas por el diagnóstico confirmado por el equipo médico de Zarzuela

---

## Entretenimiento  (`entretenimiento`)  — 217 winners

### Estructuras dominantes (% sobre 217)

- **colon_split_generic** (78.3%) — `{X}: {Y}`
- **entity_action_target** (24.0%) — `{E1} {verbo} a {E2}`
- **colon_reveal** (2.3%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_final** (1.4%) — `... ?`
- **pregunta_directa** (0.9%) — `{Que|Como|Por que} ...`
- **ni_x_ni_y** (0.5%) — `Ni X ni Y: ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `sentencia` — 1
- `detienen` — 1
- `confirma` — 1
- `rompe` — 1
- `anuncia` — 1

### Esqueletos más repetidos (top 10)

- `{q}` — 2×
- `niño {q} {q}` — 2×
- `tristeza {q} {q}` — 2×
- `viggo mortensen {q}` — 2×
- `clint eastwood {e} {q}` — 2×
- `joan manuel serrat {q}` — 2×

### Top 5 titulares ganadores

- *(score=75.7, pos=#17)* — "Los que salen a hacer ejercicio al parque después de 30 años de no hacerlo, no son tan distintos de quienes quieren resucitar a su banda de heavy metal"
- *(score=59.5, pos=#12)* — El niño de 'El sexto sentido': "Cuando llegaba a casa de la escuela, Bruce Willis me hablaba a través del contestador automático"
- *(score=33.9, pos=#12)* — Un australiano visita España y se hace la misma pregunta que muchos extranjeros al usar la cocina: "¿Dónde está?"
- *(score=33.7, pos=#11)* — Preguntan a Harrison Ford qué le gustaría que le dijera Dios cuando llegue al Cielo y su respuesta es legendaria: "Eres más guapo en persona"
- *(score=28.9, pos=#15)* — Si paras 'Pretty Woman' en el minuto 32, verás uno de los errores más graves e incomprensibles de la historia del cine

---

## News (genérico)  (`news_general`)  — 191 winners

### Estructuras dominantes (% sobre 191)

- **colon_split_generic** (49.2%) — `{X}: {Y}`
- **entity_action_target** (40.8%) — `{E1} {verbo} a {E2}`
- **colon_reveal** (1.0%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_final** (0.5%) — `... ?`
- **ni_x_ni_y** (0.5%) — `Ni X ni Y: ...`
- **leading_confirmado** (0.5%) — `Confirmado: ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 3
- `detenido` — 2
- `detiene` — 2
- `condenan` — 1
- `identifica` — 1
- `investiga` — 1

### Esqueletos más repetidos (top 10)


### Top 5 titulares ganadores

- *(score=27.4, pos=#12)* — Esta es la ciudad de España más maleducada, según un estudio
- *(score=20.1, pos=#18)* — La historia real tras la policía que le ha dado el Goya a 'La Infiltrada': se resistió a los homenajes, fue destinada a Andorra y aún sigue en activo | Premios Goya 2025
- *(score=17.9, pos=#4)* — Dos mujeres llenan dos carros de Mercadona, consiguen pasar la caja sin pagar 662 € y las descubren: multa y prohibición de ir a las tiendas cuatro años
- *(score=16.0, pos=#19)* — Santi, 17 años: «Me pasaba las tardes tumbado con el móvil y en clase me dormía. Hoy sé que quiero estudiar Química»
- *(score=15.4, pos=#15)* — Educación asegura que las adjudicaciones de docentes en la Comunidad Valenciana superan a las de 2022

---

## Gastro  (`gastro`)  — 188 winners

### Estructuras dominantes (% sobre 188)

- **colon_split_generic** (62.2%) — `{X}: {Y}`
- **entity_action_target** (20.2%) — `{E1} {verbo} a {E2}`
- **ni_x_ni_y** (5.9%) — `Ni X ni Y: ...`
- **pregunta_directa** (1.6%) — `{Que|Como|Por que} ...`
- **colon_reveal** (1.1%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_final** (0.5%) — `... ?`
- **asi_lead** (0.5%) — `Asi {verbo} ...`
- **esto_es_lo_que** (0.5%) — `Esto es lo que {hecho}`
- **leading_confirmado** (0.5%) — `Confirmado: ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 3
- `revela` — 2
- `destapan` — 1
- `planta` — 1
- `confirmado` — 1

### Esqueletos más repetidos (top 10)

- `maría li bao emperatriz alta gastronomía asiática {e} {q}` — 2×
- `mercadona implanta nueva hora cierre supermercados lunes {n} septiembre` — 2×
- `sandra moñino nutricionista {q}` — 2×

### Top 5 titulares ganadores

- *(score=47.9, pos=#13)* — Un exempleado de Dabiz Muñoz revela cómo es trabajar en DiverXO: «No levantábamos la cabeza»
- *(score=34.3, pos=#20)* — José Gómez (Joselito): “Como me llamo igual que mi padre tengo mesa en cualquier restaurante del mundo”
- *(score=32.8, pos=#14)* — María Li Bao, emperatriz de la alta gastronomía asiática en España: “Jamás verás a un chino pidiendo limosna, nosotros trabajamos”
- *(score=28.7, pos=#13)* — Julia Zhou, reina del dim sum y empresaria de éxito: “A un chino no le puedes tener diez días comiendo cocina española, no lo aguanta”
- *(score=25.2, pos=#6)* — Ni Mercadona ni Carrefour: el nuevo supermercado favorito de los españoles anunció la apertura de una nueva tienda

---

## Salud  (`salud`)  — 185 winners

### Estructuras dominantes (% sobre 185)

- **colon_split_generic** (68.6%) — `{X}: {Y}`
- **entity_action_target** (30.3%) — `{E1} {verbo} a {E2}`
- **ni_x_ni_y** (3.2%) — `Ni X ni Y: ...`
- **pregunta_final** (1.6%) — `... ?`
- **colon_reveal** (1.1%) — `{X}: {asi|lo que|por que} ...`
- **leading_alerta** (1.1%) — `Alerta ...`
- **pregunta_directa** (1.1%) — `{Que|Como|Por que} ...`
- **colon_esto_es** (0.5%) — `{X}: esto es lo que...`
- **leading_confirmado** (0.5%) — `Confirmado: ...`
- **ya_es_oficial** (0.5%) — `Ya es oficial: ...`
- **asi_lead** (0.5%) — `Asi {verbo} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `planta` — 2
- `confirma` — 1
- `revela` — 1
- `confirmado` — 1
- `desvela` — 1

### Esqueletos más repetidos (top 10)

- `luis zamora nutricionista {q}` — 2×
- `mejor fruta limpiar colon forma natural` — 2×
- `miguel assal experto primeros auxilios {q}` — 2×
- `` — 2×
- `vonda wright cirujana {q}` — 2×
- `aurelio rojas cardiólogo {q}` — 2×
- `mejor fruta limpiar arterias venas forma natural` — 2×

### Top 5 titulares ganadores

- *(score=69.2, pos=#13)* — Carlos González, pediatra: «No hay que enseñar a los niños a comer de todo, hay que enseñarles a comer de casi nada»
- *(score=41.2, pos=#13)* — Una estadounidense que vive en España, sin palabras con el estilismo de la gente en nuestro país: «Todas las mujeres llevan...»
- *(score=41.1, pos=#15)* — Ascensión Marcos, pionera de la inmunonutrición: «Lo ideal es desayunar a primera hora y durante 20 minutos»
- *(score=35.0, pos=#17)* — La farmacéutica leonesa que explica el origen de la expresión 'echar un polvo'
- *(score=29.5, pos=#14)* — María López, bióloga: «Comer sin azúcar va a hacer que nuestros hijos vayan más concentrados al cole»

---

## Sociedad  (`sociedad`)  — 144 winners

### Estructuras dominantes (% sobre 144)

- **colon_split_generic** (70.1%) — `{X}: {Y}`
- **entity_action_target** (33.3%) — `{E1} {verbo} a {E2}`
- **pregunta_directa** (6.2%) — `{Que|Como|Por que} ...`
- **leading_oficial** (1.4%) — `Oficial: ...`
- **ya_es_oficial** (1.4%) — `Ya es oficial: ...`
- **ni_x_ni_y** (0.7%) — `Ni X ni Y: ...`
- **leading_confirmado** (0.7%) — `Confirmado: ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 1

### Esqueletos más repetidos (top 10)

- `qué significa personas ayuden camareros recoger mesa según psicología` — 4×
- `oficial trabajadores ganen {n} euros podrán cobrar paro sueldo mismo tiempo` — 4×
- `psicología destaca tres colores usan personas inteligentes` — 2×
- `chino explica qué siempre invierten bazares restaurantes {e} {q}` — 2×
- `rafael santandreu psicólogo {q}` — 2×

### Top 5 titulares ganadores

- *(score=91.0, pos=#12)* — Una psicóloga explica qué significa que una persona utilice mucha ropa de color negro
- *(score=48.4, pos=#9)* — La psicología destaca los tres colores que usan las personas inteligentes
- *(score=41.6, pos=#11)* — Divorcio gris: la práctica cada vez más habitual entre mayores de 50 años
- *(score=36.3, pos=#12)* — El arrepentimiento más común en las mujeres al final de la vida, según el psiquiatra Robert Waldinger (estás a tiempo de evitarlo)
- *(score=36.3, pos=#13)* — Iris, 31 años: «Sobreviví a que me dejaran dos meses después de casarnos en la boda más bonita del mundo»

---

## Motor  (`motor`)  — 137 winners

### Estructuras dominantes (% sobre 137)

- **colon_split_generic** (55.5%) — `{X}: {Y}`
- **entity_action_target** (40.9%) — `{E1} {verbo} a {E2}`
- **leading_confirmado** (3.6%) — `Confirmado: ...`
- **colon_reveal** (2.2%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_final** (1.5%) — `... ?`
- **leading_oficial** (0.7%) — `Oficial: ...`
- **pregunta_directa** (0.7%) — `{Que|Como|Por que} ...`
- **colon_esto_es** (0.7%) — `{X}: esto es lo que...`
- **asi_lead** (0.7%) — `Asi {verbo} ...`
- **leading_alerta** (0.7%) — `Alerta ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 5
- `rescata` — 5
- `confirma` — 3
- `marca` — 1

### Esqueletos más repetidos (top 10)

- `joven español rescata {e} {n} lleva abandonado {n} después` — 3×
- `joven presenta examen conducir lía parda examinador tráfico pregunta cómo llama` — 2×
- `joven español rescata {e} abandonado hace más {n} años después` — 2×
- `alegría conductores {e} tendrán pasar {e} partir {n} coche está listado` — 2×
- `dgt obliga partir llevar vehículo procura tenerlo salgas coche` — 2×

### Top 5 titulares ganadores

- *(score=100.0, pos=#7)* — Una joven se presenta al examen de conducir y la lía parda cuando el examinador de tráfico le pregunta cómo se llama
- *(score=44.5, pos=#5)* — Confirmado | La DGT le dará el carnet de conducir gratis a los conductores que cumplan con este requisito
- *(score=34.0, pos=#6)* — La DGT estrena la línea roja en la carretera: su función y qué cambia para los conductores
- *(score=28.5, pos=#15)* — Un joven español rescata un SEAT 600 que lleva abandonado desde 1994: el antes y el después
- *(score=25.6, pos=#13)* — Una joven se presenta al examen de conducir y la lía parda cuando el examinador de tráfico le pregunta cómo se llama

---

## Hogar  (`hogar`)  — 118 winners

### Estructuras dominantes (% sobre 118)

- **colon_split_generic** (61.9%) — `{X}: {Y}`
- **entity_action_target** (9.3%) — `{E1} {verbo} a {E2}`
- **pregunta_directa** (3.4%) — `{Que|Como|Por que} ...`
- **ni_x_ni_y** (3.4%) — `Ni X ni Y: ...`
- **pregunta_final** (1.7%) — `... ?`
- **colon_reveal** (1.7%) — `{X}: {asi|lo que|por que} ...`
- **leading_alerta** (0.8%) — `Alerta ...`
- **asi_lead** (0.8%) — `Asi {verbo} ...`
- **esto_es_lo_que** (0.8%) — `Esto es lo que {hecho}`

### Verbos líderes (top 10 en 1ª posición útil)

- `desvela` — 1
- `confirma` — 1
- `arrasa` — 1

### Esqueletos más repetidos (top 10)

- `electrodoméstico debe desenchufar después utilizarlo queme` — 2×
- `adiós aire acondicionado invento {e} sólo {n} euros enfría habitaciones necesita instalación` — 2×
- `diego fernández ingeniero químico {q}` — 2×

### Top 5 titulares ganadores

- *(score=47.7, pos=#16)* — Adiós a colgar los abrigos y camisas de invierno: la solución japonesa para tener más espacio en el armario
- *(score=32.8, pos=#16)* — La piscina de La Moncloa
- *(score=31.7, pos=#5)* — Las lavadoras tienen una función que casi nadie conoce. Sirve para quitar las manchas rebeldes y las abuelas usaban algo parecido
- *(score=22.0, pos=#6)* — El electrodoméstico que se debe desconectar cuando no está en uso para evitar un incendio en toda la casa
- *(score=21.7, pos=#5)* — El electrodoméstico que debe desenchufar después de utilizarlo para que no se queme

---

## Tech  (`tech`)  — 105 winners

### Estructuras dominantes (% sobre 105)

- **colon_split_generic** (38.1%) — `{X}: {Y}`
- **entity_action_target** (16.2%) — `{E1} {verbo} a {E2}`
- **pregunta_directa** (15.2%) — `{Que|Como|Por que} ...`
- **colon_reveal** (2.9%) — `{X}: {asi|lo que|por que} ...`
- **numero_lead** (1.0%) — `{N} {cosas} que ...`
- **pregunta_final** (1.0%) — `... ?`

### Verbos líderes (top 10 en 1ª posición útil)

- `planta` — 2
- `anuncian` — 1
- `confirman` — 1
- `identifican` — 1

### Esqueletos más repetidos (top 10)

- `estado borde desastre planetario hace días nos enterado` — 2×
- `cómo desactivar {e} {e} qué importante hacerlo` — 2×
- `desactiva función móvil dejar recibir llamadas spam` — 2×

### Top 5 titulares ganadores

- *(score=60.9, pos=#9)* — Diego Redolar, neurocientífico: «Caminar treinta minutos al día fomenta la formación de nuevas neuronas»
- *(score=57.4, pos=#17)* — Bill Gates: "En una década, la inteligencia artificial hará innecesarios a los humanos para la mayoría de las cosas"
- *(score=41.0, pos=#12)* — Robert Sapolsky, neurocientífico: "Si todo el mundo entendiera que no somos dueños de nuestras decisiones, el mundo se derrumbaría"
- *(score=35.9, pos=#8)* — Cómo se desactiva el Meta AI de WhatsApp y por qué es importante hacerlo
- *(score=31.0, pos=#16)* — La genética española se desmorona: compartimos más ADN con un noruego que con un norteafricano

---

## Hobbies  (`hobbies`)  — 101 winners

### Estructuras dominantes (% sobre 101)

- **colon_split_generic** (50.5%) — `{X}: {Y}`
- **entity_action_target** (25.7%) — `{E1} {verbo} a {E2}`
- **pregunta_final** (2.0%) — `... ?`
- **ni_x_ni_y** (2.0%) — `Ni X ni Y: ...`
- **leading_alerta** (1.0%) — `Alerta ...`
- **numero_lead** (1.0%) — `{N} {cosas} que ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 4
- `detiene` — 1

### Esqueletos más repetidos (top 10)

- `gobierno confirma {n} febrero habrá puente festivo {e} cuántos días` — 2×
- `parece alemania o {e} mercadillo navideño más bonito va estar {e}` — 2×
- `oficial {e} confirma festivo {n} febrero habrá puente` — 2×
- `ecologistas quieren soltar {e} catalán felino superdepredador extinto {n}` — 2×

### Top 5 titulares ganadores

- *(score=76.6, pos=#17)* — Un hombre encuentra un regalo de Navidad de 1978 en la pared de la casa de sus padres: “Tenía mi nombre”
- *(score=19.0, pos=#14)* — Los científicos que descubrieron que los cerdos y las ratas pueden respirar por el ano, entre los galardonados de 'los otros premios Nobel'
- *(score=18.8, pos=#8)* — Una cámara consigue grabar a una de las especies felinas más raras del mundo
- *(score=15.8, pos=#16)* — Marcos, el pequeño de 6 años que acertó la Lotería del Niño a última hora: “Es la primera o segunda vez que jugamos”
- *(score=14.4, pos=#5)* — Esta debería ser la terminación del Gordo de la Lotería de Navidad, según la estadística

---

## Sucesos  (`sucesos`)  — 78 winners

### Estructuras dominantes (% sobre 78)

- **colon_split_generic** (50.0%) — `{X}: {Y}`
- **entity_action_target** (35.9%) — `{E1} {verbo} a {E2}`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 2
- `detiene` — 2
- `hallan` — 1
- `detenido` — 1
- `desvela` — 1
- `anuncia` — 1

### Esqueletos más repetidos (top 10)

- `nombre niño origen griego desaparecido {e} lleva años ponerse` — 2×
- `guardia civil detiene agricultor plantar nectarinas impone multa {n} euros` — 2×
- `aviso {e} {e} partir ahora puede dejar guantera coche` — 2×

### Top 5 titulares ganadores

- *(score=14.6, pos=#5)* — Aviso de la Guardia Civil a toda España: a partir de ahora, ten cuidado cuando compres o vendas en Wallapop
- *(score=14.1, pos=#7)* — Brasil analizó 13 tiburones frente a la costa de Río de Janeiro. Todos los ejemplares dieron positivo en cocaína
- *(score=14.0, pos=#3)* — Fraude de un millón de euros en Leroy Merlin: investigan a dos empleados que robaban y revendían aparatos de aire acondicionado
- *(score=13.1, pos=#4)* — El informe médico de la hija de Anabel Pantoja es concluyente: "No cabe duda de que las lesiones se han producido por un mecanismo violento"
- *(score=12.4, pos=#14)* — La interventora del Alvia: “Es un golpe superimportante. He perdido el conocimiento”; Renfe: “No te preocupes, te voy a mandar sanitarios”

---

## Viajes  (`viajes`)  — 75 winners

### Estructuras dominantes (% sobre 75)

- **colon_split_generic** (52.0%) — `{X}: {Y}`
- **entity_action_target** (32.0%) — `{E1} {verbo} a {E2}`
- **ni_x_ni_y** (4.0%) — `Ni X ni Y: ...`
- **colon_reveal** (2.7%) — `{X}: {asi|lo que|por que} ...`
- **leading_confirmado** (2.7%) — `Confirmado: ...`
- **asi_lead** (1.3%) — `Asi {verbo} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 1

### Esqueletos más repetidos (top 10)


### Top 5 titulares ganadores

- *(score=35.2, pos=#17)* — Irene Beaus, piloto y comandante de vuelos transoceánicos: «En 32 años no he coincidido más de 10 veces con otra mujer»
- *(score=31.1, pos=#17)* — He trabajado en muchos cruceros y esto es todo lo que sé sobre las citas entre la tripulación: "Solo esa versión"
- *(score=22.8, pos=#19)* — El pueblo de Castilla-La Mancha donde bañarse en aguas turquesas con vistas a una isla con un rinoceronte: «está rodeado de campos de trigo verde y lozano»
- *(score=21.9, pos=#14)* — Un jubilado compró un billete de avión vitalicio por menos de 300.000 euros: lleva 12.000 vuelos o más de seis viajes a la luna
- *(score=21.0, pos=#17)* — La estación de tren más bonita del mundo es Patrimonio de la Humanidad de la Unesco y parece el palacio de un emperador

---

## Política  (`politica`)  — 64 winners

### Estructuras dominantes (% sobre 64)

- **colon_split_generic** (57.8%) — `{X}: {Y}`
- **entity_action_target** (40.6%) — `{E1} {verbo} a {E2}`
- **colon_reveal** (1.6%) — `{X}: {asi|lo que|por que} ...`
- **pregunta_directa** (1.6%) — `{Que|Como|Por que} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 2
- `desvela` — 1

### Esqueletos más repetidos (top 10)


### Top 5 titulares ganadores

- *(score=16.6, pos=#16)* — Fernando Garea, tras el ingreso de Ábalos en Soto del Real: "Se puede decir que su defensa y su actuación ha sido muy torpe"
- *(score=13.5, pos=#14)* — El PP intenta poner contra las cuerdas al PSOE 'invitando' al mayor número de socialistas a comparecer en el Senado, su reinado particular
- *(score=13.0, pos=#20)* — Vicente Vallés ve lo que dice Pedro Sánchez sobre el accidente de Adamuz en el Congreso y no da crédito: «Reitera las explicaciones de Óscar Puente»
- *(score=11.8, pos=#17)* — Diarreas, aguas fecales y un pacto con el PP: así relató Leire Díez ante el juez su salto a la política en un pueblo de 800 habitantes
- *(score=10.1, pos=#6)* — Guillermo Fesser cree que el 5% de inversión en defensa que exige Trump "es para contrarrestar un 6,5% que invierte Rusia"

---

## Deportes  (`deportes`)  — 63 winners

### Estructuras dominantes (% sobre 63)

- **colon_split_generic** (57.1%) — `{X}: {Y}`
- **entity_action_target** (39.7%) — `{E1} {verbo} a {E2}`
- **pregunta_directa** (3.2%) — `{Que|Como|Por que} ...`
- **ni_x_ni_y** (1.6%) — `Ni X ni Y: ...`
- **colon_reveal** (1.6%) — `{X}: {asi|lo que|por que} ...`
- **asi_lead** (1.6%) — `Asi {verbo} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `renuncia` — 1
- `confirma` — 1
- `investigan` — 1

### Esqueletos más repetidos (top 10)

- `{q}` — 2×
- `salir caminar está partir {n} expertos {e} recomiendan practicar ejercicios` — 2×

### Top 5 titulares ganadores

- *(score=58.6, pos=#14)* — Saúl Sánchez, deportista y nutricionista: "Caminar todos los días para perder peso no es bueno ni eficiente”
- *(score=35.9, pos=#17)* — María Guardiola, hija de Pep Guardiola: “Mi padre y yo bromeamos diciendo que heredé su cabezonería. Cuando nos proponemos algo, lo perseguimos con una visión de túnel hasta lograrlo
- *(score=24.8, pos=#19)* — Otra lección mental de Iniesta con la alopecia: «Igual yo no me acomplejé porque tengo una autoestima de la hostia, pero hay que aceptarse con naturalidad
- *(score=21.3, pos=#15)* — El cambio de dieta que ayudó a Nadal a estirar su carrera al máximo: «No come carne ni embutido ni queso
- *(score=19.5, pos=#18)* — La confesión de Paco Roig que resume los 90': "Quise comprar a un árbitro ante el Bayern, le di tres millones a un agente y a los cinco minutos pitó un penalti en contra"

---

## Shopping  (`shopping`)  — 45 winners

### Estructuras dominantes (% sobre 45)

- **colon_split_generic** (73.3%) — `{X}: {Y}`
- **entity_action_target** (26.7%) — `{E1} {verbo} a {E2}`
- **ni_x_ni_y** (2.2%) — `Ni X ni Y: ...`
- **pregunta_directa** (2.2%) — `{Que|Como|Por que} ...`
- **leading_confirmado** (2.2%) — `Confirmado: ...`
- **colon_reveal** (2.2%) — `{X}: {asi|lo que|por que} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirmado` — 1

### Esqueletos más repetidos (top 10)

- `ingeniosa estafa {e} roba datos bancarios sólo pulsar botón` — 2×

### Top 5 titulares ganadores

- *(score=42.5, pos=#18)* — Alejandra y Jaime, padres de un bebé reborn: "Está hecho con inteligencia artificial, con fotos nuestras de pequeños"
- *(score=28.4, pos=#18)* — Ni por decoración ni para guardar el móvil: la auténtica función del pequeño bolsillo delantero de los pantalones más clásicos
- *(score=19.7, pos=#15)* — El historiador que crea zapatos en Fuenlabrada y vende 200.000 pares al año: "Tenemos hasta 20 colores de un mismo modelo"
- *(score=18.0, pos=#5)* — Comienzan a llegar las primeras multas por vender ropa y objetos de segunda mano en Vinted y Wallapop
- *(score=14.5, pos=#6)* — Cierra El Corte Inglés: el verdadero motivo por el cual la empresa vendió sus supermercados

---

## Empleo  (`trabajo`)  — 45 winners

### Estructuras dominantes (% sobre 45)

- **colon_split_generic** (64.4%) — `{X}: {Y}`
- **entity_action_target** (11.1%) — `{E1} {verbo} a {E2}`

### Verbos líderes (top 10 en 1ª posición útil)


### Esqueletos más repetidos (top 10)

- `{q} estudiante español intercambio {e} cuenta cómo vivir uno países más felices mundo` — 2×

### Top 5 titulares ganadores

- *(score=39.6, pos=#14)* — Antonio es el hombre con más títulos universitarios del mundo: «Tengo 53 años, tres hijos, trece carreras y estoy estudiando otras cinco»
- *(score=35.0, pos=#14)* — El profesor de instituto que alerta de la sobreprotección que crece en las familias: "Hay padres que me preguntan qué tiene de deberes su hijo de 16 años"
- *(score=30.7, pos=#20)* — Un español de Erasmus en Polonia 'flipa' con los exámenes de la universidad: "No sé cómo están preparados para trabajar"
- *(score=29.0, pos=#19)* — Las siete frases que usan las personas con alta educación, según la psicología
- *(score=19.3, pos=#7)* — El SEPE busca personal que quiera trabajar 3 horas diarias con sueldo de 700 euros en colegios y en limpieza

---

## Otros  (`otros`)  — 44 winners

### Estructuras dominantes (% sobre 44)

- **colon_split_generic** (65.9%) — `{X}: {Y}`
- **entity_action_target** (15.9%) — `{E1} {verbo} a {E2}`
- **pregunta_final** (4.5%) — `... ?`
- **ni_x_ni_y** (4.5%) — `Ni X ni Y: ...`
- **asi_lead** (4.5%) — `Asi {verbo} ...`
- **leading_confirmado** (2.3%) — `Confirmado: ...`
- **pregunta_directa** (2.3%) — `{Que|Como|Por que} ...`
- **colon_esto_es** (2.3%) — `{X}: esto es lo que...`
- **colon_reveal** (2.3%) — `{X}: {asi|lo que|por que} ...`

### Verbos líderes (top 10 en 1ª posición útil)

- `confirma` — 1

### Esqueletos más repetidos (top 10)

- `cambio hora invierno {n} qué día cambiar hora {e}` — 2×

### Top 5 titulares ganadores

- *(score=41.0, pos=#18)* — Hubo que rescatar a Einstein más de 30 veces para evitar que se ahogase en las aguas de Nueva York
- *(score=39.7, pos=#12)* — Hugo Hernández, experto en el arte de la seducción: «Tinder está en decadencia, el mejor lugar para ligar son las clases de baile»
- *(score=28.5, pos=#4)* — ¿Qué significa una botella en el techo de un coche aparcado?
- *(score=21.9, pos=#17)* — ¿Cuál es el único país del mundo que tiene en su nombre las cinco vocales sin repetir?
- *(score=20.6, pos=#4)* — Confirmada la fecha del cambio de hora: ya hay día para el horario de invierno

---
