# Calendario del Mundial 2026 (landing no oficial)

Landing page estática con el **calendario y los resultados en vivo** de los
partidos del torneo mundial de fútbol 2026. Los resultados se **actualizan
automáticamente** consultando APIs públicas de datos deportivos.

> ⚠️ **Proyecto independiente y no oficial.** Sin afiliación, asociación ni
> patrocinio de la FIFA. Las marcas y logotipos pertenecen a sus respectivos
> titulares. Lee los [lineamientos](GUIDELINES.md).

## Características

- 📅 Calendario agrupado por día, ordenado cronológicamente.
- 🔴 Estado en vivo / programado / finalizado, con auto-refresco (60 s, o 30 s si
  hay partidos en curso).
- 🌍 Horas mostradas en la **zona horaria local** del visitante.
- 🚩 Banderas con **emoji Unicode** (sin descargar imágenes).
- 🧱 **Sin assets externos**: sin CDNs, sin fuentes de terceros, sin trackers.
  Las únicas peticiones de red son a las APIs de datos (JSON).
- ♻️ Cadena de respaldos: TheSportsDB → ESPN → `data/schedule.json` local.

## Cómo ejecutar

Es un sitio estático; basta con servir la carpeta. Para evitar problemas de CORS
con `fetch` sobre `file://`, usa un servidor local:

```bash
# Opción 1: Python
python3 -m http.server 8000

# Opción 2: Node
npx serve .
```

Luego abre <http://localhost:8000>.

## Fuentes de datos

| Orden | Fuente | Clave | Notas |
| ----- | ------ | ----- | ----- |
| 1 | [TheSportsDB](https://www.thesportsdb.com/) | Pública de prueba (`3`) | Gratuita y con CORS. Para producción usa una clave propia. |
| 2 | ESPN (API no documentada) | No | Respaldo. |
| 3 | `data/schedule.json` | — | Respaldo local con datos factuales. |

La fuente activa se muestra en la interfaz («Fuente: …»). Configura el ID de
liga, temporada e intervalo en el objeto `CONFIG` de [`js/app.js`](js/app.js).

## Estructura

```
.
├── index.html          # Estructura y descargos legales
├── css/styles.css      # Estilos (solo tipografía del sistema)
├── js/app.js           # Carga de datos, normalización y render
├── data/schedule.json  # Respaldo local factual
├── GUIDELINES.md        # Guía de cumplimiento de derechos de autor / marcas
└── README.md
```

## Cumplimiento legal

El cumplimiento de propiedad intelectual es parte central del proyecto. Antes de
publicar, revisa la lista de verificación de [GUIDELINES.md](GUIDELINES.md).
No constituye asesoría legal.

## Licencia

Código bajo licencia [MIT](LICENSE). Los datos pertenecen a sus respectivos
proveedores.
