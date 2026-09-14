# Pomodoro + Notas

Una app web sencilla que combina un temporizador Pomodoro con una lista de tareas, para ayudarte a enfocarte en una tarea a la vez.

## Funcionalidades

- Temporizador con tres modos: trabajo, descanso corto y descanso largo.
- Cambio automático de modo al completar una sesión (descanso largo cada 4 pomodoros).
- Lista de tareas: añade, marca como completada, elimina y selecciona una tarea activa.
- Contador de pomodoros por tarea y por día.
- Duraciones personalizables desde el panel de ajustes.
- El progreso se guarda en `localStorage`, así que persiste al recargar la página.
- Modo claro/oscuro automático según las preferencias del sistema.

## Uso

No requiere instalación ni dependencias. Basta con abrir `index.html` en el navegador:

```bash
# Desde la carpeta pomodoro-notas
start index.html   # Windows
# o simplemente arrastra el archivo a tu navegador
```

## Estructura del proyecto

- `index.html` — estructura de la página.
- `styles.css` — estilos y temas claro/oscuro.
- `app.js` — lógica del temporizador y de las tareas.
