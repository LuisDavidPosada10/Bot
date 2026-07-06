# Web Bot

Chatbot de IA con agente LangChain, memoria de sesión y más de 20 herramientas integradas. Este repositorio incluye el **backend** (API) y el **frontend** (interfaz de chat) como dos proyectos independientes dentro de la misma carpeta.

Diseñado para funcionar de dos formas:

- **Standalone** — app de chat en `http://localhost:5174` con utilidades generales (clima, divisas, trivia, PDFs, etc.).
- **Widget en portafolio** — iframe embebido en el sitio personal con modo reclutador (CV, vacantes, contacto, WhatsApp).

---

## Estructura del repositorio

```
Bot/
├── web-bot/              # Backend — Node.js, Express, LangChain
│   ├── src/
│   ├── .env.example
│   └── README.md         # Documentación detallada del API
│
└── frontend-web-bot/     # Frontend — React, TypeScript, Vite
    ├── src/
    ├── .env.example
    └── README.md         # Documentación detallada del UI
```

---

## Stack

| Proyecto | Tecnologías |
|----------|-------------|
| **web-bot** | Node.js, TypeScript, Express, LangChain, MongoDB (opcional), Pino |
| **frontend-web-bot** | React 18, TypeScript, Vite |

---

## Requisitos

- Node.js 18+
- npm
- API key de un proveedor compatible con OpenAI (OpenAI, Groq, etc.)
- MongoDB Atlas (opcional — sin URI solo usa memoria L1)
- Formspree (opcional — para leads de reclutadores)

---

## Inicio rápido (local)

### 1. Backend

```bash
cd web-bot
npm install
cp .env.example .env
# Editar .env con OPENAI_API_KEY y demás variables
npm run dev
```

→ API en `http://localhost:3000`

### 2. Frontend

```bash
cd frontend-web-bot
npm install
cp .env.example .env
# Editar .env: VITE_API_URL=http://localhost:3000
npm run dev
```

→ UI en `http://localhost:5174`

### 3. Verificar

```bash
curl http://localhost:3000/health
```

---

## Puertos en desarrollo

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 3000 | `http://localhost:3000` |
| Frontend del bot | 5174 | `http://localhost:5174` |
| Portafolio (externo) | 5173 | `http://localhost:5173` |

> El frontend del bot usa `strictPort: true` en el puerto **5174**. Si aparece `EADDRINUSE`, detén el proceso que lo ocupe antes de volver a arrancar.

---

## Modos de operación

El frontend detecta automáticamente el contexto:

| Modo | Cómo se activa | Comportamiento |
|------|----------------|----------------|
| **Standalone** | Abrir `localhost:5174` directo | Mensaje de bienvenida con herramientas generales. Sin WhatsApp. |
| **Portafolio** | Iframe con `?embed=portfolio` | Asistente de contratación: CV, vacantes, contacto, WhatsApp. |

El frontend envía `botMode=portfolio|standalone` al backend en cada mensaje. En modo portafolio el agente tiene acceso a `contactar_whatsapp` y un prompt orientado a reclutadores.

### Integración con el portafolio

El widget del portafolio carga el bot en un iframe:

```
http://localhost:5174/?embed=portfolio
```

Variables en el portafolio (`portafolio-web/.env`):

```env
VITE_BOT_WIDGET_URL=http://localhost:5174
VITE_BOT_WIDGET_ENABLED=true
```

---

## Variables de entorno

### Backend (`web-bot/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | Sí | API key del proveedor LLM |
| `OPENAI_BASE_URL` | No | URL base (Groq, Ollama, etc.) |
| `OPENAI_MODEL` | No | Modelo a usar |
| `PORT` | No | Puerto del servidor (defecto: 3000) |
| `ALLOWED_ORIGIN` | No | Orígenes CORS separados por coma |
| `MONGO_URI` / `MONGODB_URI` | No | URI de MongoDB para memoria L2 |
| `FORMSPREE_ENDPOINT` | No | Envío de leads de reclutadores |
| `PORTFOLIO_URL` | No | URL del portafolio (links del CV) |
| `WHATSAPP_NUMBER` | No | Número wa.me sin `+` (ej. `573001234567`) |
| `CONTACT_TO` | No | Email de destino para contactos |
| `HISTORY_MAX_TURNS` | No | Turnos máx. de historial al LLM (standalone) |
| `HISTORY_MAX_TOKENS` | No | Tokens máx. estimados de historial (standalone) |
| `HISTORY_MAX_TURNS_PORTFOLIO` | No | Turnos máx. en modo portafolio |
| `HISTORY_MAX_TOKENS_PORTFOLIO` | No | Tokens máx. en modo portafolio |

Ver `web-bot/.env.example` para la lista completa.

### Frontend (`frontend-web-bot/.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend |
| `VITE_BOT_NAME` | Nombre en el header del chat |
| `VITE_WHATSAPP_NUMBER` | Mismo número que `WHATSAPP_NUMBER` del backend |

---

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Estado del servidor y MongoDB |
| `/chat` | POST | Enviar mensaje (JSON o `multipart/form-data` con PDF) |

**Ejemplo:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué hora es?", "botMode": "standalone"}'
```

Las sesiones se mantienen con la cookie `webbot_sid` (`HttpOnly`, `SameSite=Lax`).

---

## Herramientas del agente

El backend expone **22 herramientas** en modo standalone y **23** en modo portafolio (incluye `contactar_whatsapp`).

Categorías principales:

- **Utilidades** — hora, calculadora, funciones custom
- **Información** — búsqueda web, clima, precios
- **Finanzas** — cripto, divisas, calculadora financiera
- **Productividad** — contraseñas, traducción, QR
- **Entretenimiento** — recetas, trivia
- **Carrera** — evaluar CV, analizar ofertas, entrevista técnica, roadmap
- **Contacto** — enviar lead por Formspree, link WhatsApp (portafolio)

Lista detallada en [`web-bot/README.md`](web-bot/README.md).

---

## Memoria y optimización de tokens

- **L1 (memoria)** — historial en RAM con TTL de 1 hora.
- **L2 (MongoDB)** — persistencia opcional con sync periódico.
- **Historial slim** — solo se guardan mensajes user/assistant finales (sin JSON crudo de tools).
- **Ventana de contexto** — últimos N turnos con tope de tokens antes de enviar al LLM.

Configurable vía `HISTORY_MAX_TURNS`, `HISTORY_MAX_TOKENS` y sus variantes `_PORTFOLIO`.

---

## Tests

```bash
# Backend — 59 tests
cd web-bot
npm test
npm run typecheck
npm run build
```

```bash
# Frontend — build de producción
cd frontend-web-bot
npm run build
```

---

## Scripts disponibles

### `web-bot`

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo con hot-reload (`tsx watch`) |
| `npm run build` | Compilar TypeScript → `dist/` |
| `npm start` | Ejecutar build de producción |
| `npm test` | Suite de tests (Vitest) |
| `npm run typecheck` | Verificación de tipos sin compilar |

### `frontend-web-bot`

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite (puerto 5174) |
| `npm run build` | Build de producción → `dist/` |
| `npm run preview` | Preview del build local |

---

## Despliegue

Ejemplo de configuración en producción:

**Backend** (Render, Railway, etc.):

```env
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
PORT=3000
ALLOWED_ORIGIN=https://tu-portafolio.vercel.app,https://tu-bot.vercel.app
PORTFOLIO_URL=https://tu-portafolio.vercel.app
WHATSAPP_NUMBER=573XXXXXXXXX
FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxx
MONGO_URI=mongodb+srv://...
```

**Frontend del bot** (Vercel, Netlify, etc.):

```env
VITE_API_URL=https://tu-backend.onrender.com
VITE_WHATSAPP_NUMBER=573XXXXXXXXX
```

**Portafolio** (proyecto separado):

```env
VITE_BOT_WIDGET_URL=https://tu-bot.vercel.app
VITE_BOT_WIDGET_ENABLED=true
```

---

## Seguridad

- Cookies de sesión `HttpOnly`
- CORS explícito por variable de entorno
- Errores técnicos ocultos al usuario final
- `toolResults` no se exponen en la respuesta HTTP al frontend
- PDF limitado a 10 MB (`application/pdf` únicamente)
- Sin secretos en respuestas de la API

---

## Documentación por proyecto

- [Backend — web-bot](web-bot/README.md)
- [Frontend — frontend-web-bot](frontend-web-bot/README.md)

---

## Autor

**Luis David Posada** — Desarrollador Full Stack

- [Portafolio](https://github.com/LuisDavidPosada10)
- [LinkedIn](https://www.linkedin.com/in/luisdavid23/)
- [GitHub](https://github.com/LuisDavidPosada10)
