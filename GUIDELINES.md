# Lineamientos para no infringir derechos de autor ni marcas de la FIFA

Este documento define las reglas de cumplimiento del proyecto. El objetivo es
ofrecer una landing útil con el calendario y los resultados del Mundial 2026
**sin infringir** la propiedad intelectual de la FIFA ni de terceros.

> Resumen de una línea: usa **datos factuales**, evita **material protegido**
> (logos, emblemas, mascotas, tipografías, fotos) y deja claro que el sitio
> **no es oficial**.

---

## 1. Qué SÍ se puede usar

- **Hechos del calendario**: fechas, horas, sedes, ciudades, equipos y
  resultados. Los hechos no son objeto de derechos de autor (no son una obra
  creativa). Se pueden mostrar y reorganizar libremente.
- **Nombres descriptivos**: «Mundial 2026», «torneo mundial de fútbol»,
  nombres de selecciones y estadios, citados con fin informativo (uso nominativo
  justo de la marca).
- **Banderas como emoji Unicode**: son caracteres tipográficos del sistema, no
  archivos de imagen ni assets descargados.
- **Datos de APIs públicas** de proveedores deportivos, respetando sus términos
  de uso y límites de peticiones.

## 2. Qué NO se debe usar

- ❌ El **logotipo / emblema oficial** del torneo o de la FIFA.
- ❌ La **mascota oficial**, el trofeo como ilustración protegida, o el cartel
  oficial.
- ❌ **Tipografías oficiales** del evento o fuentes con licencia restringida.
- ❌ **Fotografías** de jugadores, estadios o partidos sin licencia.
- ❌ **Audio/video** o highlights oficiales.
- ❌ Escudos/insignias de selecciones descargados como imágenes con derechos.
- ❌ Sugerir **afiliación, patrocinio o aprobación** oficial.
- ❌ El símbolo de marca registrada junto a términos oficiales de forma que
  implique titularidad.

## 3. Evitar llamadas a assets externos

Para reducir riesgo legal **y** mejorar privacidad/rendimiento, este proyecto:

- **No carga imágenes externas** (logos, escudos, banderas en PNG/SVG).
- **No usa CDNs de fuentes** (Google Fonts, etc.); solo tipografía del sistema
  (`system-ui`).
- **No incrusta** iframes, trackers ni scripts de terceros.
- Representa banderas con **emoji Unicode** generados desde el código ISO del
  país (ver `flagEmoji()` en `js/app.js`).
- Las únicas peticiones de red salientes son **a las APIs de datos** (JSON), no
  a recursos gráficos.

## 4. Uso correcto de las APIs de datos

Fuentes consideradas (gratuitas, orientadas a uso público):

| Fuente            | Clave | CORS | Uso en el proyecto              |
| ----------------- | ----- | ---- | ------------------------------- |
| TheSportsDB       | Pública de prueba (`3`) | Sí | Fuente principal de fixtures/resultados |
| ESPN (no oficial) | No    | Suele | Respaldo                        |
| `data/schedule.json` | —  | —    | Respaldo local factual          |

Reglas:

1. **Respeta los Términos de Servicio** y los límites de tasa de cada API. Para
   producción real, considera una **clave propia** (TheSportsDB ofrece planes) y
   no abuses de la clave de prueba pública.
2. **Atribuye la fuente** de los datos en la interfaz (este sitio muestra la
   etiqueta «Fuente: …»).
3. **No revendas ni redistribuyas** los datos como si fueran propios si los ToS
   lo prohíben.
4. **Cachea con moderación** y refresca con un intervalo razonable (este
   proyecto: 60 s, o 30 s si hay partidos en vivo).
5. No accedas a endpoints **no documentados** en producción sensible sin
   verificar que su uso esté permitido; mantenlos solo como respaldo.

## 5. Avisos y descargos obligatorios

- Mostrar de forma visible: **«Sitio no oficial, sin afiliación ni patrocinio de
  la FIFA»** (presente en el encabezado y el pie).
- Incluir una sección de **lineamientos de uso** enlazada desde la página.
- Indicar que las marcas pertenecen a **sus respectivos titulares**.

## 6. Lista de verificación antes de publicar

- [ ] Ningún logo, emblema, mascota o tipografía oficial en el repo o la página.
- [ ] Ninguna imagen/foto con derechos; banderas solo por emoji.
- [ ] Sin CDNs de fuentes ni assets de terceros.
- [ ] Descargo de no afiliación visible.
- [ ] Atribución de la fuente de datos visible.
- [ ] Términos de uso de cada API revisados y respetados.
- [ ] Intervalo de refresco razonable (sin martillar la API).

## 7. Aviso

Este documento es una guía de buenas prácticas, **no asesoría legal**. Para un
lanzamiento comercial, consulta a un abogado especializado en propiedad
intelectual de tu jurisdicción.
