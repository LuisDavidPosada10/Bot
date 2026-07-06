# Web Bot — Frontend

Interfaz web del chatbot inteligente. Construida con **React 18**, **TypeScript** y **Vite**.

---

## Requisitos

- Node.js 18+
- El backend corriendo (por defecto en `http://localhost:3000`)

---

## Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env

# 3. Editar .env si el backend corre en otro puerto o URL
#    VITE_API_URL=http://localhost:3000

# 4. Modo desarrollo
npm run dev
# → http://localhost:5173

# 5. Build de producción
npm run build

# 6. Preview del build
npm run preview
```

---

## Variables de entorno

| Variable | Descripción | Defecto |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:3000` |
| `VITE_BOT_NAME` | Nombre que aparece en el header | `Web Bot` |

---

## Estructura

```
src/
├── App.tsx                  # Layout principal: header, mensajes, input
├── main.tsx                 # Entry point React
├── index.css                # Estilos globales
├── types/
│   └── index.ts             # Tipos: Message, ToolResult, Role
├── hooks/
│   └── useChat.ts           # Lógica de chat, llamadas al backend, estado
└── components/
    ├── MessageBubble.tsx    # Burbuja con markdown, QR, código, herramientas
    └── InputBar.tsx         # Campo de texto con adjunto PDF
```

---

## Características del UI

- Burbujas diferenciadas usuario / bot con animación de entrada
- Indicador de escritura (puntos rebotando) mientras el bot responde
- Renderizado de **negrita**, `código inline`, bloques de código con lenguaje
- Imágenes de QR renderizadas automáticamente dentro del chat
- URLs clicables en los mensajes
- Acordeón para ver las herramientas que usó el bot
- Adjuntar **PDF** (hasta 10 MB) para que el bot lo analice
- Botón de nueva conversación
- Totalmente responsive

---

## Comunicación con el backend

Toda la comunicación es hacia `VITE_API_URL` sin rutas relativas a archivos locales.

| Endpoint | Método | Descripción |
|---|---|---|
| `/chat` | `POST` | Envía mensaje (y PDF opcional) al agente |
| `/health` | `GET` | Verifica que el backend esté activo |

Las sesiones se mantienen vía cookie `webbot_sid` que el backend genera automáticamente.
