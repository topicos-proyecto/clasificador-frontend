# Clasificador de tickets — Frontend

Interfaz React para clasificar mensajes de clientes, visualizar el procesamiento NLP y consultar métricas. Requiere que la API de `../clasificador-backend` esté ejecutándose en `127.0.0.1:8000`.

Desde esta carpeta:

```bash
npm ci
npm run dev
```

Abrir la URL indicada por Vite, normalmente `http://127.0.0.1:5173/`. El servidor redirige las solicitudes `/api` a la API local. Ejecutar `npm run build` para comprobar la compilación; `npm run preview` sirve la compilación con el mismo proxy local.
