# Nexus Study

Biblioteca digital y espacio de estudio de escritorio para universitarios. Permite guardar, organizar, consultar y estudiar apuntes por asignatura, con tareas, calendario académico, Pomodoro y estadísticas de estudio. Todo se guarda localmente (SQLite + archivos en disco): funciona sin conexión a Internet.

## Requisitos

- Node.js 22 o superior (usa `node:sqlite`, disponible desde Node 22.5).
- Windows, macOS o Linux.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la app de Electron con recarga en caliente del renderer.

## Comprobaciones de calidad

```bash
npm run typecheck   # TypeScript (proceso principal/preload y renderer)
npm run lint         # ESLint
npm test             # Pruebas de la capa de datos (node:test)
```

## Compilación

```bash
npm run build   # Genera out/main, out/preload y out/renderer
npm run dist     # Además empaqueta un instalador con electron-builder
```

## Actualizaciones automáticas

Nexus Study comprueba solo, al abrir una instalación real (no en `npm run dev`), si hay una
versión más reciente publicada en GitHub Releases, la descarga en segundo plano y avisa
cuando está lista para instalar (Ajustes → Actualizaciones, y un aviso discreto en pantalla).
Los detalles de configuración, cómo publicar una versión nueva y qué secretos hacen falta
están en [`PUBLISHING.md`](./PUBLISHING.md).

## Almacenamiento de datos

- Base de datos SQLite: `<userData>/nexus-study.db` (migraciones automáticas al iniciar).
- Archivos importados (PDF, JPG, JPEG, PNG, WEBP): `<userData>/documents/<id-del-documento>.<extensión>`.
- `<userData>` es la carpeta de datos de usuario que gestiona Electron (por ejemplo, `%APPDATA%\nexus-study` en Windows).

La app arranca completamente vacía: no incluye asignaturas ni apuntes de ejemplo.

## Arquitectura

- `src/main`: proceso principal de Electron (ventana, IPC, base de datos, acceso a archivos).
- `src/preload`: puente seguro (`contextBridge`) entre el proceso principal y el renderer.
- `src/renderer`: interfaz en React + TypeScript.
- `src/shared`: tipos y contrato de IPC compartidos entre los tres procesos.

Al importar un PDF se extrae su texto (con `pdfjs-dist`, en el proceso principal) y se guarda en la base de datos junto al documento. La Biblioteca y la búsqueda dentro de cada asignatura buscan por coincidencia de subcadena (`LIKE`) en ese texto, además de en el título, las etiquetas y el nombre de archivo — el SQLite integrado en Node no trae compilado ningún módulo FTS, así que no hay ranking por relevancia ni búsqueda por palabras completas, solo coincidencia literal. El texto extraído nunca se envía al renderer por IPC (solo se usa dentro de la consulta SQL).

Los documentos se sirven al renderer mediante el protocolo interno `nexus-doc://<id>`, registrado en el proceso principal: el renderer nunca conoce rutas reales del disco.
