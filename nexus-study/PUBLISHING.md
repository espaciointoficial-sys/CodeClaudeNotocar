# Publicar una nueva versión de Nexus Study

Este documento explica cómo publicar una actualización real para que las instalaciones
existentes de Nexus Study la detecten y se actualicen solas, y qué debe configurar el
propietario del proyecto para que funcione de principio a fin.

## Cómo funciona el sistema de actualizaciones

- **Mecanismo**: [`electron-updater`](https://www.electron.build/auto-update), integrado en
  el proceso principal (`src/main/services/updater.ts`).
- **Proveedor**: GitHub Releases, sobre el repositorio real de este proyecto
  (`espaciointoficial-sys/CodeClaudeNotocar`, configurado en `package.json` → `build.publish`).
- **Desactivado en desarrollo**: si `app.isPackaged` es `false` (es decir, ejecutando con
  `npm run dev`), el actualizador no hace ninguna comprobación ni petición de red. Esto es
  intencional: solo tiene sentido comprobar actualizaciones desde una instalación real.
- **Datos del usuario**: viven en la carpeta de perfil de Electron (`app.getPath('userData')`,
  en Windows `%APPDATA%\nexus-study`), completamente separada de la carpeta de instalación.
  Verificado: reinstalar o actualizar el programa no toca esa carpeta, así que asignaturas,
  apuntes, notas, tareas y ajustes sobreviven siempre.

## Requisito único para publicar: `GH_TOKEN`

Para poder publicar (`npm run release` o el workflow de Actions) el proceso necesita un token
con permiso para crear una Release y subir archivos en el repositorio. Hay dos formas,
según desde dónde publiques:

- **Desde GitHub Actions, en el mismo repositorio**: no hace falta crear ningún secreto.
  El workflow ya usa `secrets.GITHUB_TOKEN`, que GitHub genera automáticamente en cada
  ejecución con permiso de escritura (`permissions: contents: write`, ya configurado en
  `.github/workflows/nexus-study-release.yml`). **Único ajuste a comprobar una vez**: en
  GitHub, ve a *Settings → Actions → General → Workflow permissions* del repositorio y
  asegúrate de que está marcado "Read and write permissions"; si está en "Read only", el
  workflow fallará al intentar crear la Release aunque el token exista.
- **Desde tu propio ordenador** (`npm run release` en local): necesitas crear un
  [token de acceso personal](https://github.com/settings/tokens) con permiso `repo` (o, si
  usas un token *fine-grained*, permiso de lectura/escritura sobre "Contents" y "Releases"
  del repositorio), y exportarlo como variable de entorno antes de ejecutar el comando:

  ```bash
  # PowerShell
  $env:GH_TOKEN = "tu_token_aqui"
  npm run release
  ```

  Nunca escribas este token en ningún archivo del repositorio.

No se necesita ningún otro secreto para que el sistema de actualizaciones funcione: la
detección de versiones en el cliente solo lee la Release pública, no necesita autenticarse.

## Firma de código (Windows y macOS)

Ahora mismo el instalador **no está firmado digitalmente** (no hay certificado configurado).
Esto significa que:

- En Windows, SmartScreen puede mostrar un aviso de "aplicación no reconocida" al ejecutar
  el instalador por primera vez.
- En macOS, Gatekeeper puede bloquear la app directamente si no está firmada y notarizada;
  además, `electron-updater` en macOS **requiere** que la app esté firmada para poder
  aplicar actualizaciones automáticas (Squirrel.Mac no funciona con apps sin firmar). Sin
  firma, los usuarios de macOS tendrían que reinstalar manualmente cada versión.

Para una experiencia profesional sin avisos, el propietario del proyecto debería:

- **Windows**: comprar/obtener un certificado de firma de código (OV o EV) y configurar
  `CSC_LINK` (ruta o URL al `.pfx`) y `CSC_KEY_PASSWORD` como secretos, que electron-builder
  detecta automáticamente por esos nombres de variable de entorno.
- **macOS**: una cuenta de Apple Developer, un certificado "Developer ID Application" y
  notarización (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` como secretos;
  electron-builder también los detecta por convención). Además, `electron-updater` en macOS
  solo puede aplicar actualizaciones automáticas sobre el artefacto `zip` (no sobre el
  `dmg`), por eso `package.json` genera ambos formatos para mac: el `dmg` para la primera
  instalación manual y el `zip` para que el actualizador funcione en versiones posteriores.

Ninguna de estas credenciales existe en este repositorio ni se ha inventado ningún valor:
esto queda documentado para cuando el propietario decida añadirlas.

## Flujo para publicar una versión nueva

1. **Cambiar la versión** en `nexus-study/package.json` (`"version"`), siguiendo semver
   (por ejemplo `0.1.0` → `0.2.0`). electron-updater compara versiones con semver, así que
   este campo es la fuente de verdad.
2. **Confirmar que todo pasa en local** (opcional pero recomendable antes de etiquetar):
   ```bash
   cd nexus-study
   npm run typecheck && npm run lint && npm test && npm run build
   ```
3. **Crear un commit** con el cambio de versión y **crear una etiqueta** con el mismo número,
   prefijada con `v` (formato que espera electron-builder/GitHub):
   ```bash
   git add nexus-study/package.json
   git commit -m "chore(nexus-study): bump version to 0.2.0"
   git tag v0.2.0
   git push origin <tu-rama>
   git push origin v0.2.0
   ```
4. **El workflow se ejecuta solo** al recibir esa etiqueta: `.github/workflows/nexus-study-release.yml`
   instala dependencias, ejecuta typecheck/lint/tests y luego `npm run release`
   (`electron-vite build && electron-builder --publish always`), dentro de la carpeta
   `nexus-study/`.
5. **electron-builder crea la Release en GitHub** (si no existe una con esa etiqueta) y sube:
   - `Nexus Study Setup <version>.exe` (el instalador).
   - `Nexus Study Setup <version>.exe.blockmap` (para descargas diferenciales).
   - `latest.yml` (el archivo que `electron-updater` consulta para saber cuál es la última
     versión disponible).
6. **Notas de versión**: puedes escribirlas a mano editando la Release en GitHub después de
   que se cree (electron-builder la crea como borrador/publicada con un cuerpo vacío o
   generado; edítala en `github.com/espaciointoficial-sys/CodeClaudeNotocar/releases` para
   añadir un resumen legible). Nexus Study enlaza directamente a esa página desde
   Ajustes → Actualizaciones.
7. **Comprobar que aparece bien en GitHub Releases**: abre la Release recién creada y
   verifica que los tres archivos anteriores están adjuntos. Si falta `latest.yml`, las
   instalaciones existentes no detectarán la actualización.
8. **Probar desde una instalación anterior real**: instala una versión anterior (por ejemplo
   con el instalador de la versión previa), ábrela, y usa el botón "Buscar actualizaciones"
   en Ajustes (o espera a la comprobación automática al abrir la app). Debería pasar por
   los estados Buscando → Descargando → Lista para instalar, y "Reiniciar e instalar"
   debe cerrar la app, instalar y volver a abrirla con los datos intactos.

> Nota sobre el monorepo: este repositorio también contiene `pomodoro-notas`, una app
> estática sin sistema de versiones propio. Las Releases de GitHub son independientes de
> las carpetas del repositorio, así que usarlas para Nexus Study no afecta a esa otra app;
> `electron-updater` además solo tiene en cuenta la Release más reciente que incluya un
> `latest.yml`, así que una Release sin ese archivo (de cualquier otro origen) se ignora
> automáticamente.

## Vincular el proyecto a GitHub (si aún no lo está)

El repositorio de este proyecto ya está conectado a GitHub
(`https://github.com/espaciointoficial-sys/CodeClaudeNotocar`), así que este paso ya está
hecho. Si en algún momento se necesitara mover Nexus Study a un repositorio propio:

1. Crear el repositorio en GitHub.
2. `git remote set-url origin https://github.com/<owner>/<repo>.git` (o `git remote add`
   si es un remoto nuevo).
3. Actualizar `owner`/`repo` en `nexus-study/package.json` → `build.publish` para que
   coincidan con el nuevo repositorio.
4. Volver a seguir el flujo de publicación de este documento.

## Qué queda pendiente para que las actualizaciones reales funcionen

Todo el código está implementado y verificado localmente (ver el informe de la
conversación), pero **no se ha publicado ninguna Release real** porque eso requiere una
acción del propietario del proyecto:

- [ ] Crear la primera etiqueta `v<version>` y dejar que el workflow publique una Release.
- [ ] (Opcional, recomendado) Configurar certificados de firma de código para Windows/macOS.
- [ ] Revisar/editar las notas de la Release publicada en GitHub.

Hasta que exista al menos una Release con `latest.yml`, el estado en Ajustes mostrará un
error de comprobación (esperado: no hay ninguna versión publicada todavía) sin que eso
afecte al funcionamiento normal de la aplicación.
