# Clasificador de tickets — Frontend

Interfaz React con dos partes:

- **`/soporte` (pública):** el cliente escribe su nombre, un correo opcional y su consulta, y recibe «Su consulta será atendida» con un código de seguimiento. No ve el área, la probabilidad ni el resultado del modelo. El bot no conversa con el cliente.
- **`/admin` (panel administrativo, requiere contraseña):**
  - **Dashboard:** tickets por estado y por área, cola de revisión manual y tasa de correcciones manuales.
  - **Tickets:** filtros y búsqueda. El detalle muestra la sugerencia del modelo y la bitácora. Desde ahí se asigna el ticket a un empleado del área, se reasigna el área o se cambia el estado.
  - **Notificaciones:** bandeja de cada área. Muestra lo que el bot envía al área completa: código, nombre del cliente y mensaje.
  - **Áreas y Empleados:** alta, edición, activación y desactivación.
  - **Métricas del modelo:** por qué se eligió el modelo. Comparación de Naive Bayes, Regresión Logística y KNN, matriz de confusión real vs. predicho, precisión, recall, F1 y soporte por clase, distribución de clases, tamaños de entrenamiento y prueba, y longitud de los textos.
  - **Laboratorio NLP:** clasifica un mensaje sin crear un ticket y muestra cada paso del preprocesamiento.

Requiere que la API de `../clasificador-backend` esté ejecutándose en `127.0.0.1:8000` con `ADMIN_PASSWORD` definida (ver su README).

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/soporte` (página pública) y `http://127.0.0.1:5173/admin` (panel). El servidor de Vite redirige `/api` a la API local. `npm run build` comprueba la compilación; `npm run preview` sirve la compilación con el mismo proxy.

Estructura: `src/api.js` (cliente HTTP y token), `src/components/` (componentes y gráficos SVG/CSS propios, sin librería de gráficos), `src/pages/public/` y `src/pages/admin/`. El enrutado usa `react-router-dom` (versión fijada en `package.json`).

El token de sesión se guarda en `sessionStorage` y caduca a las 8 horas o al cerrar la pestaña. Los colores de los tres modelos provienen de una paleta categórica validada para daltonismo. Los valores también se muestran como texto, así que el color no es el único medio para identificar cada modelo.
