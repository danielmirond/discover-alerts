# Análisis v2 — Score-weighted + tier viral/winner

**Dataset**: 9979 titulares DiscoverSnoop ES (2024-04 → 2026-04).
**Score distribution**: p25=2.6 · p50=3.4 · p75=5.1 · p90=8.1 · p95=11.0 · max=100.0
**Viral threshold**: score ≥ 30 → 53 titulares (0.5% del dataset).

**Cómo leer este reporte**:
- `avg_score` de un patrón = audiencia media (0-100) de los titulares que lo usan en ese bucket/tier.
- `count` = cuántos titulares usan el patrón.
- **Un patrón con avg_score alto es MÁS Discover-compatible** que uno con count alto y avg_score bajo.
- Tier **VIRAL** (≥30) muestra los patrones que escalan hasta top de Discover. Los virales tienen varias veces la audiencia de un winner estándar.

---

## DEPORTES  —  winners: 66  ·  virals: 2

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 37 · 7.5 | 2 · 47.2 | **6.3×** |
| `asi_lead` | 1 · 4.6 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 27 · 7.5 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 1 · 11.2 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 1 · 11.2 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 2 · 7.5 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=58.6, pos=#14)* — Saúl Sánchez, deportista y nutricionista: "Caminar todos los días para perder peso no es bueno ni eficiente”
- *(score=35.9, pos=#17)* — María Guardiola, hija de Pep Guardiola: “Mi padre y yo bromeamos diciendo que heredé su cabezonería. Cuando nos proponemos algo, lo perseguimos con una visión de túnel hasta lograrlo

---

## ENTRETENIMIENTO  —  winners: 218  ·  virals: 4

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `entity_action_target` | 50 · 7.6 | 2 · 67.6 | **8.8×** |
| `colon_split_generic` | 172 · 8.7 | 3 · 42.4 | **4.9×** |
| `pregunta_final` | 3 · 10.7 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 5 · 8.4 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 2 · 13.2 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 1 · 8.0 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=75.7, pos=#17)* — "Los que salen a hacer ejercicio al parque después de 30 años de no hacerlo, no son tan distintos de quienes quieren resucitar a su banda de heavy metal"
- *(score=59.5, pos=#12)* — El niño de 'El sexto sentido': "Cuando llegaba a casa de la escuela, Bruce Willis me hablaba a través del contestador automático"
- *(score=33.9, pos=#12)* — Un australiano visita España y se hace la misma pregunta que muchos extranjeros al usar la cocina: "¿Dónde está?"
- *(score=33.7, pos=#11)* — Preguntan a Harrison Ford qué le gustaría que le dijera Dios cuando llegue al Cielo y su respuesta es legendaria: "Eres más guapo en persona"

---

## ECONOMIA  —  winners: 325  ·  virals: 4

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 183 · 8.8 | 1 · 50.5 | **5.7×** |
| `entity_action_target` | 114 · 8.3 | 2 · 37.1 | **4.5×** |
| `colon_esto_es` | 5 · 9.7 | 0 · 0.0 | **0.0×** |
| `esto_es_lo_que` | 1 · 10.5 | 0 · 0.0 | **0.0×** |
| `asi_lead` | 4 · 12.9 | 0 · 0.0 | **0.0×** |
| `leading_confirmado` | 11 · 8.2 | 0 · 0.0 | **0.0×** |
| `ya_es_oficial` | 1 · 5.6 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 9 · 9.7 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 8 · 7.7 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 4 · 13.2 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 5 · 8.5 | 0 · 0.0 | **0.0×** |
| `leading_alerta` | 2 · 9.0 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=50.5, pos=#16)* — Adriana, camionera: "Cuando llego al área de descanso echo las cortinas y no bajo del camión para que no vean que soy mujer"
- *(score=43.7, pos=#20)* — Hace 6.000 años enterraron a dos hermanas junto a un bebé y un perro en una mina de sílex en Chequia
- *(score=34.6, pos=#5)* — Antes tiraba las cajas de leche gastadas de Mercadona, ahora me he dado cuenta que son un tesoro para organizar la casa
- *(score=30.5, pos=#18)* — Las personas que siempre ayudan a los camareros después de comer en un restaurante tienen estas características, según la psicología

---

## TECH  —  winners: 100  ·  virals: 5

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `entity_action_target` | 16 · 9.9 | 1 · 57.4 | **5.8×** |
| `colon_split_generic` | 36 · 9.6 | 4 · 47.6 | **4.9×** |
| `pregunta_directa` | 15 · 10.0 | 1 · 35.9 | **3.6×** |
| `colon_reveal` | 3 · 12.1 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 1 · 5.8 | 0 · 0.0 | **0.0×** |
| `numero_lead` | 1 · 14.3 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=60.9, pos=#9)* — Diego Redolar, neurocientífico: «Caminar treinta minutos al día fomenta la formación de nuevas neuronas»
- *(score=57.4, pos=#17)* — Bill Gates: "En una década, la inteligencia artificial hará innecesarios a los humanos para la mayoría de las cosas"
- *(score=41.0, pos=#12)* — Robert Sapolsky, neurocientífico: "Si todo el mundo entendiera que no somos dueños de nuestras decisiones, el mundo se derrumbaría"
- *(score=35.9, pos=#8)* — Cómo se desactiva el Meta AI de WhatsApp y por qué es importante hacerlo
- *(score=31.0, pos=#16)* — La genética española se desmorona: compartimos más ADN con un noruego que con un norteafricano

---

## SALUD  —  winners: 183  ·  virals: 4

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `entity_action_target` | 54 · 8.0 | 2 · 55.2 | **6.9×** |
| `colon_split_generic` | 126 · 8.4 | 3 · 50.5 | **6.0×** |
| `colon_esto_es` | 1 · 13.5 | 0 · 0.0 | **0.0×** |
| `asi_lead` | 1 · 5.4 | 0 · 0.0 | **0.0×** |
| `leading_confirmado` | 1 · 11.4 | 0 · 0.0 | **0.0×** |
| `ya_es_oficial` | 1 · 10.4 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 2 · 10.1 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 2 · 5.8 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 6 · 8.5 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 3 · 9.9 | 0 · 0.0 | **0.0×** |
| `leading_alerta` | 2 · 6.0 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=69.2, pos=#13)* — Carlos González, pediatra: «No hay que enseñar a los niños a comer de todo, hay que enseñarles a comer de casi nada»
- *(score=41.2, pos=#13)* — Una estadounidense que vive en España, sin palabras con el estilismo de la gente en nuestro país: «Todas las mujeres llevan...»
- *(score=41.1, pos=#15)* — Ascensión Marcos, pionera de la inmunonutrición: «Lo ideal es desayunar a primera hora y durante 20 minutos»
- *(score=35.0, pos=#17)* — La farmacéutica leonesa que explica el origen de la expresión 'echar un polvo'

---

## MOTOR  —  winners: 135  ·  virals: 3

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `entity_action_target` | 55 · 10.2 | 1 · 44.5 | **4.4×** |
| `colon_split_generic` | 75 · 9.3 | 1 · 34.0 | **3.7×** |
| `leading_confirmado` | 4 · 13.4 | 1 · 44.5 | **3.3×** |
| `colon_esto_es` | 1 · 15.1 | 0 · 0.0 | **0.0×** |
| `asi_lead` | 1 · 8.6 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 1 · 15.8 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 3 · 10.1 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 2 · 7.7 | 0 · 0.0 | **0.0×** |
| `leading_oficial` | 1 · 23.4 | 0 · 0.0 | **0.0×** |
| `leading_alerta` | 1 · 8.4 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=100.0, pos=#7)* — Una joven se presenta al examen de conducir y la lía parda cuando el examinador de tráfico le pregunta cómo se llama
- *(score=44.5, pos=#5)* — Confirmado | La DGT le dará el carnet de conducir gratis a los conductores que cumplan con este requisito
- *(score=34.0, pos=#6)* — La DGT estrena la línea roja en la carretera: su función y qué cambia para los conductores

---

## GASTRO  —  winners: 188  ·  virals: 3

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 117 · 9.9 | 3 · 38.3 | **3.9×** |
| `esto_es_lo_que` | 1 · 6.8 | 0 · 0.0 | **0.0×** |
| `asi_lead` | 1 · 7.5 | 0 · 0.0 | **0.0×** |
| `leading_confirmado` | 1 · 6.4 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 2 · 8.5 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 3 · 7.1 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 38 · 9.4 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 1 · 20.8 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 11 · 10.8 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=47.9, pos=#13)* — Un exempleado de Dabiz Muñoz revela cómo es trabajar en DiverXO: «No levantábamos la cabeza»
- *(score=34.3, pos=#20)* — José Gómez (Joselito): “Como me llamo igual que mi padre tengo mesa en cualquier restaurante del mundo”
- *(score=32.8, pos=#14)* — María Li Bao, emperatriz de la alta gastronomía asiática en España: “Jamás verás a un chino pidiendo limosna, nosotros trabajamos”

---

## VIAJES  —  winners: 74  ·  virals: 2

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 38 · 8.9 | 2 · 33.2 | **3.7×** |
| `asi_lead` | 1 · 6.0 | 0 · 0.0 | **0.0×** |
| `leading_confirmado` | 2 · 6.3 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 2 · 11.4 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 3 · 7.0 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 25 · 8.6 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=35.2, pos=#17)* — Irene Beaus, piloto y comandante de vuelos transoceánicos: «En 32 años no he coincidido más de 10 veces con otra mujer»
- *(score=31.1, pos=#17)* — He trabajado en muchos cruceros y esto es todo lo que sé sobre las citas entre la tripulación: "Solo esa versión"

---

## SOCIEDAD  —  winners: 140  ·  virals: 8

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 98 · 8.8 | 4 · 35.7 | **4.1×** |
| `entity_action_target` | 46 · 8.6 | 2 · 32.5 | **3.8×** |
| `leading_confirmado` | 1 · 5.1 | 0 · 0.0 | **0.0×** |
| `ya_es_oficial` | 2 · 6.2 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 9 · 11.3 | 0 · 0.0 | **0.0×** |
| `leading_oficial` | 2 · 9.2 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 1 · 27.5 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=91.0, pos=#12)* — Una psicóloga explica qué significa que una persona utilice mucha ropa de color negro
- *(score=48.4, pos=#9)* — La psicología destaca los tres colores que usan las personas inteligentes
- *(score=41.6, pos=#11)* — Divorcio gris: la práctica cada vez más habitual entre mayores de 50 años
- *(score=36.3, pos=#13)* — Iris, 31 años: «Sobreviví a que me dejaran dos meses después de casarnos en la boda más bonita del mundo»
- *(score=36.3, pos=#12)* — El arrepentimiento más común en las mujeres al final de la vida, según el psiquiatra Robert Waldinger (estás a tiempo de evitarlo)

---

## HOGAR  —  winners: 116  ·  virals: 3

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 73 · 9.0 | 1 · 47.7 | **5.3×** |
| `esto_es_lo_que` | 1 · 6.7 | 0 · 0.0 | **0.0×** |
| `asi_lead` | 1 · 9.1 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 4 · 8.9 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 2 · 9.1 | 0 · 0.0 | **0.0×** |
| `pregunta_final` | 2 · 10.6 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 4 · 9.1 | 0 · 0.0 | **0.0×** |
| `leading_alerta` | 1 · 13.7 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 12 · 9.6 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=47.7, pos=#16)* — Adiós a colgar los abrigos y camisas de invierno: la solución japonesa para tener más espacio en el armario
- *(score=32.8, pos=#16)* — La piscina de La Moncloa
- *(score=31.7, pos=#5)* — Las lavadoras tienen una función que casi nadie conoce. Sirve para quitar las manchas rebeldes y las abuelas usaban algo parecido

---

## TRABAJO  —  winners: 43  ·  virals: 3

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 27 · 8.5 | 3 · 35.1 | **4.1×** |
| `entity_action_target` | 5 · 10.8 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=39.6, pos=#14)* — Antonio es el hombre con más títulos universitarios del mundo: «Tengo 53 años, tres hijos, trece carreras y estoy estudiando otras cinco»
- *(score=35.0, pos=#14)* — El profesor de instituto que alerta de la sobreprotección que crece en las familias: "Hay padres que me preguntan qué tiene de deberes su hijo de 16 años"
- *(score=30.7, pos=#20)* — Un español de Erasmus en Polonia 'flipa' con los exámenes de la universidad: "No sé cómo están preparados para trabajar"

---

## SHOPPING  —  winners: 44  ·  virals: 1

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 32 · 9.9 | 1 · 42.5 | **4.3×** |
| `ni_x_ni_y` | 1 · 28.4 | 0 · 0.0 | **0.0×** |
| `colon_reveal` | 1 · 6.7 | 0 · 0.0 | **0.0×** |
| `leading_confirmado` | 1 · 7.0 | 0 · 0.0 | **0.0×** |
| `pregunta_directa` | 1 · 11.6 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 12 · 9.2 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=42.5, pos=#18)* — Alejandra y Jaime, padres de un bebé reborn: "Está hecho con inteligencia artificial, con fotos nuestras de pequeños"

---

## HOBBIES  —  winners: 106  ·  virals: 1

| Patrón | Winners count · avg_score | Virals count · avg_score | Diferencial (viral avg / winner avg) |
|---|---|---|---|
| `colon_split_generic` | 55 · 6.9 | 1 · 76.6 | **11.1×** |
| `pregunta_final` | 2 · 6.7 | 0 · 0.0 | **0.0×** |
| `leading_alerta` | 1 · 12.4 | 0 · 0.0 | **0.0×** |
| `ni_x_ni_y` | 2 · 6.3 | 0 · 0.0 | **0.0×** |
| `numero_lead` | 1 · 5.0 | 0 · 0.0 | **0.0×** |
| `entity_action_target` | 27 · 7.6 | 0 · 0.0 | **0.0×** |

**Top 5 titulares VIRAL**:

- *(score=76.6, pos=#17)* — Un hombre encuentra un regalo de Navidad de 1978 en la pared de la casa de sus padres: “Tenía mi nombre”

---

## Cross-bucket: patrones que más escalan al tier viral

Calculado solo sobre buckets con al menos 5 virales. Ratio = avg_score(viral) / avg_score(winner).

| Patrón | winners | virals | ratio medio |
|---|---|---|---|
| `entity_action_target` | 62 | 3 | **4.77×** |
| `colon_split_generic` | 134 | 8 | **4.51×** |
| `pregunta_directa` | 24 | 1 | **3.60×** |
| `colon_reveal` | 3 | 0 | **0.00×** |
| `pregunta_final` | 1 | 0 | **0.00×** |
| `numero_lead` | 1 | 0 | **0.00×** |
| `leading_confirmado` | 1 | 0 | **0.00×** |
| `ya_es_oficial` | 2 | 0 | **0.00×** |
| `leading_oficial` | 2 | 0 | **0.00×** |
| `ni_x_ni_y` | 1 | 0 | **0.00×** |
