# Web Bot — Backend

Backend de un chatbot de IA para la web, construido con **Node.js**, **TypeScript**, **LangChain** y **Express**. Expone una API HTTP que recibe mensajes del usuario, decide automáticamente qué herramienta usar y responde con texto enriquecido usando un agente de IA.

---

## Características

- **Agente con herramientas** — El modelo decide qué tool invocar según la intención del usuario, sin necesidad de comandos especiales.
- **Memoria de sesión** — Cada usuario tiene un historial de conversación con TTL automático (1 hora).
- **21 herramientas integradas** — Desde clima y criptomonedas hasta evaluación de CV y trivia.
- **Adjuntos PDF** — Sube tu CV o documento y el bot lo analiza.
- **CORS configurable** — Listo para conectar cualquier frontend.
- **Sin API keys extras** — La mayoría de herramientas funcionan sin registros adicionales.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js + TypeScript (ESM) |
| Framework HTTP | Express 4 |
| IA / LLM | LangChain + OpenAI compatible |
| Logging | Pino + pino-http |
| Subida de archivos | Multer (memoria, 10 MB) |
| Búsqueda web | DuckDuckScrape + Tavily (fallback) |
| Scraping de precios | Cheerio + Axios |
| Envío de correos | Nodemailer (SMTP) |

---

## Herramientas disponibles (21)

### Utilidades generales
| Nombre | Descripción |
|--------|-------------|
| `hora_actual` | Fecha y hora actual en ISO 8601 |
| `calculadora` | Evaluador matemático seguro: `sqrt`, `sin`, `log`, `pow`, `^`, constantes `pi` y `e` |
| `ejecutar_funcion` | Funciones simples personalizables (eco, saludo, etc.) |

### Búsqueda e información
| Nombre | Descripción |
|--------|-------------|
| `buscar_web` | Búsqueda en DuckDuckGo con caché y fallback a Tavily |
| `buscar_mejor_precio` | Compara precios en Amazon, eBay, MercadoLibre, Walmart y BestBuy |
| `clima_actual` | Clima en tiempo real + pronóstico 3 días para cualquier ciudad (wttr.in) |

### Finanzas y mercados
| Nombre | Descripción |
|--------|-------------|
| `cotizacion_cripto` | Precios de BTC, ETH, SOL, DOGE y 15+ criptos con variación 24h (CoinGecko) |
| `conversor_divisas` | Conversión entre más de 30 divisas (Frankfurter / BCE) |
| `calculadora_financiera` | Cuotas de préstamo, interés compuesto, ROI, punto de equilibrio, meta de ahorro |

### Productividad
| Nombre | Descripción |
|--------|-------------|
| `generar_contrasena` | Contraseñas criptográficamente seguras con cálculo de entropía en bits |
| `traducir_texto` | Traducción entre 50+ idiomas con autodetección (MyMemory) |
| `generador_qr` | QR de URL, texto, email, WiFi o contacto vCard con colores personalizables |

### Entretenimiento
| Nombre | Descripción |
|--------|-------------|
| `buscar_receta` | Recetas completas con ingredientes, medidas, instrucciones e imagen (TheMealDB) |
| `trivia_pregunta` | Quiz interactivo A/B/C/D — historia, ciencia, deportes, cine y más (Open Trivia DB) |

### Carrera profesional
| Nombre | Descripción |
|--------|-------------|
| `evaluar_cv` | Puntuación del CV, fortalezas, brechas y keywords ATS |
| `generar_carta` | Cover letter personalizada alineada a la oferta |
| `analizar_oferta` | Extrae skills requeridos, seniority, match contra CV y proyectos recomendados |
| `crear_roadmap` | Plan semanal para cubrir brechas (4-12 semanas) |
| `generar_bullets_cv` | Bullets cuantificados listos para pegar en el CV |
| `entrevista_tecnica` | Simulador de entrevista con preguntas, rúbrica y progreso |

### Contacto
| Nombre | Descripción |
|--------|-------------|
| `enviar_contacto` | Genera y envía email de contacto desde el bot (SMTP configurable) |

---

## Instalación

```bash
# Clonar e instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# ───── Requeridas ─────
OPENAI_API_KEY=sk-...          # Tu API key de OpenAI (o compatible)

# ───── Opcionales ─────
OPENAI_BASE_URL=               # Base URL para APIs compatibles (Groq, Ollama, etc.)
OPENAI_MODEL=gpt-4o-mini       # Modelo a usar (defecto: llama-3.1-8b-instant)
PORT=3000                      # Puerto del servidor (defecto: 3000)
ALLOWED_ORIGIN=http://localhost:5173  # Origen(es) CORS permitidos (coma-separados)

# ───── Tavily (fallback búsqueda web) ─────
TAVILY_API_KEY=tvly-...        # API key de Tavily (opcional)

# ───── SMTP para envío de emails ─────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@email.com
SMTP_PASS=tu_app_password
EMAIL_FROM=no-reply@tudominio.com
CONTACT_TO=destino@email.com   # Email del dueño del portafolio
```

---

## Ejecución

```bash
# Modo desarrollo (hot-reload)
npm run dev

# Compilar
npm run build

# Producción
npm start
```

---

## Tests

```bash
# Ejecutar suite completa
npm test

# Modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

Cubre memoria híbrida (L1 + Mongo), codec de mensajes, middleware de sesión, herramientas determinísticas, rutas HTTP y servicio de chat.

---

## API Endpoints

### `POST /chat`

Envía un mensaje al agente. Soporta adjuntos PDF vía `multipart/form-data`.

**Request (JSON)**
```json
{
  "message": "¿Cuál es el precio del Bitcoin en pesos colombianos?"
}
```

**Request (con PDF) — multipart/form-data**
```
message: "Evalúa mi CV y dame feedback"
file: <archivo.pdf>
```

**Response**
```json
{
  "answer": "El precio del Bitcoin es...",
  "toolResults": [
    {
      "name": "cotizacion_cripto",
      "args": { "monedas": ["btc"], "divisa": "cop" },
      "output": "{\"bitcoin\":{\"precio\":310000000,...}}"
    }
  ],
  "sessionId": "uuid-de-sesion"
}
```

**Headers**
- `x-session-id: <uuid>` — puedes enviar tu propio ID de sesión. Si no lo envías, se generará uno y se devolverá en la cookie `webbot_sid`.

---

### `GET /health`

Verifica el estado del servidor.

```json
{
  "ok": true,
  "missingEnv": []
}
```

---

## Arquitectura

```
src/
├── server.ts              # Entry point — Express + CORS + logging
├── agent/
│   └── miniAgent.ts       # Loop del agente: LLM → tool calls → respuesta
├── config/
│   └── env.ts             # Variables de entorno tipadas
├── controllers/
│   └── chatController.ts  # Handler HTTP del endpoint /chat
├── middlewares/
│   ├── session.ts         # Gestión de sessionId via cookie o header
│   └── upload.ts          # Multer — PDF en memoria, máx 10 MB
├── routes/
│   ├── chatRouter.ts      # POST /chat
│   └── healthRouter.ts    # GET /health
├── services/
│   └── chatService.ts     # Extracción de PDF + llamada al agente
├── store/
│   └── sessionStore.ts    # Historial en memoria con TTL y max 50 msgs
└── tools/
    ├── index.ts            # Registro de todas las herramientas
    ├── time.ts             # hora_actual
    ├── math.ts             # calculadora
    ├── customFunction.ts   # ejecutar_funcion
    ├── searchWebFixed.ts   # buscar_web
    ├── bestPrice.ts        # buscar_mejor_precio
    ├── weather.ts          # clima_actual
    ├── crypto.ts           # cotizacion_cripto
    ├── currency.ts         # conversor_divisas
    ├── finance.ts          # calculadora_financiera
    ├── password.ts         # generar_contrasena
    ├── translate.ts        # traducir_texto
    ├── qr.ts               # generador_qr
    ├── recipe.ts           # buscar_receta
    ├── trivia.ts           # trivia_pregunta
    ├── cv.ts               # evaluar_cv, generar_carta
    ├── career.ts           # analizar_oferta, crear_roadmap, generar_bullets_cv
    ├── interview.ts        # entrevista_tecnica
    └── email.ts            # enviar_contacto
```

---

## Seguridad

- Cookies `HttpOnly; SameSite=Lax` para las sesiones
- Límite de 10 MB y filtro `application/pdf` en subida de archivos
- Evaluador matemático sin `eval` — parser recursivo seguro
- CORS explícito vía variable de entorno
- Sin ningún secreto expuesto en respuestas

---

## Ideas de próximas herramientas

- `rastrear_vuelo` — AviationStack (tier gratuito disponible)
- `buscar_pelicula` — TMDB, puntuaciones y ficha completa (API key gratuita)
- `info_ip` — Geolocalización de IPs con ipwho.is (sin key)
- `generador_memes` — Imgflip API (tiene tier gratuito)
- `color_paleta` — Paletas harmónicas a partir de un color hex
- `calcular_imc` — IMC, peso ideal y clasificación WHO