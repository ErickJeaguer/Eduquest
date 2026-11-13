# 🎓 Eduquest - Educational AI Chatbot

Eduquest es una aplicación web full-stack de tutoría pedagógica impulsada por la **API oficial de Google Gemini** (`@google/genai`), un backend robusto en **Node.js** con **Express**, y una interfaz moderna y responsiva construida con **HTML5, CSS3 personalizado y Bootstrap 5.3**.

---

## 🌟 Características Principales

- **Tutoría Socrática y Pedagógica**: Guiado por directivas del sistema en el servidor para explicar conceptos paso a paso, promover el aprendizaje activo y adaptar el lenguaje al estudiante.
- **Restricción Educativa Estricta**: Si se realizan preguntas ajenas a la educación, el asistente responde estrictamente con:
  > *"Lo siento, no te he entendido. Este es un chatbot educativo"*
- **Integración con la API Oficial de Google Gemini**: Utiliza el SDK oficial `@google/genai` (versión 3.x) con modelo configurable (`gemini-2.5-flash` por defecto).
- **Seguridad en el Backend**:
  - Las credenciales de API nunca se exponen al navegador.
  - Limitación de tasa de solicitudes (*rate limiting*) para prevenir abusos.
  - Validación y saneamiento de longitud de mensajes (máximo 2000 caracteres) y estructura de historial.
  - Sin fuga de trazas o mensajes de error internos al cliente.
- **Memoria Conversacional Multi-Turno**: Mantiene el contexto de los turnos previos de la charla sin duplicaciones ni saturación de tokens.
- **Persistencia en el Navegador**: Guarda la conversación en `localStorage` para que no se pierda al recargar la página.
- **Diseño Visual Exclusivo**:
  - Paleta moderna oscura con acentos índigo y efectos de vidrio esmerilado (*glassmorphism*).
  - Burbujas de mensaje diferenciadas con avatares e información temporal.
  - Indicador animado de escritura mientras la IA formula la respuesta.
  - Renderizado de Markdown completo con resaltado de sintaxis de código (`highlight.js`).
  - Botón para copiar respuestas directamente al portapapeles.
  - Modal para reiniciar o limpiar la conversación.
  - Totalmente adaptado para dispositivos móviles, tabletas y ordenadores de escritorio.

---

## 📁 Estructura del Proyecto

```text
Eduquest/
│
├── public/                      # Archivos estáticos servidos por Express
│   ├── index.html               # Estructura semántica de la interfaz
│   ├── css/
│   │   └── styles.css           # Estilos personalizados y diseño visual exclusivo
│   ├── js/
│   │   └── app.js               # Lógica del cliente, localStorage y llamadas a la API
│   └── assets/                  # Recursos gráficos y multimedia
│
├── server/                      # Backend en Node.js y Express
│   ├── index.js                 # Punto de entrada del servidor, middlewares y rutas
│   ├── routes/
│   │   └── chatRoutes.js        # Enrutador y validación para POST /api/chat
│   ├── services/
│   │   └── geminiService.js     # Cliente del SDK @google/genai y manejo de errores
│   └── prompts/
│       └── educationalSystemPrompt.js # Prompt del sistema con directivas educativas
│
├── .env                         # Variables de entorno locales (ignorado por Git)
├── .env.example                 # Plantilla pública de variables de entorno
├── .gitignore                   # Exclusión de archivos sensibles y node_modules
├── package.json                 # Dependencias y scripts de ejecución
└── README.md                    # Documentación del proyecto
```

---

## 🛠️ Requisitos Previos

- **Node.js**: Versión 18.x o superior (probado en Node.js v24.x).
- **npm**: Gestor de paquetes incluido con Node.js.
- **Clave de API de Google Gemini**: Obtenida de forma gratuita en [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio (si no lo tienes aún en tu máquina)
```bash
git clone https://github.com/ErickJeaguer/Eduquest.git
cd Eduquest
```

### 2. Instalar las dependencias
Ejecuta el siguiente comando en la raíz del proyecto:
```bash
npm install
```

### 3. Configurar las variables de entorno
Crea o edita el archivo `.env` en la raíz del proyecto a partir de la plantilla `.env.example`:

```env
# Clave de API de Google Gemini (requerida para generar respuestas)
GEMINI_API_KEY=tu_clave_de_gemini_aqui

# Modelo de Gemini a utilizar (opcional, por defecto gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Puerto del servidor backend (opcional, por defecto 3000)
PORT=3000
```

> ⚠️ **Nota de Seguridad**: Nunca subas tu archivo `.env` a repositorios públicos de Git. El archivo ya está listado en `.gitignore`.

### 4. Iniciar el servidor

#### Modo Producción:
```bash
npm start
```

#### Modo Desarrollo (con reinicio automático mediante nodemon):
```bash
npm run dev
```

### 5. Acceder a la aplicación
Abre tu navegador web y visita:
```text
http://localhost:3000
```

---

## 🔌 Especificación de la API Backend

### `POST /api/chat`
Envía una consulta educativa junto al historial reciente y recibe la respuesta del tutor.

#### Cabeceras
```http
Content-Type: application/json
```

#### Cuerpo de la petición (JSON)
```json
{
  "message": "¿Cuál es la diferencia entre masa y peso?",
  "history": [
    {
      "role": "user",
      "text": "Hola, tengo una duda de física."
    },
    {
      "role": "assistant",
      "text": "¡Hola! Con mucho gusto. ¿En qué tema de física te puedo ayudar?"
    }
  ]
}
```

#### Respuesta Exitosa (`200 OK`)
```json
{
  "success": true,
  "reply": "Excelente pregunta. La masa es la cantidad de materia que tiene un cuerpo..."
}
```

#### Respuesta de Error (`400 Bad Request` / `500 Internal Server Error`)
```json
{
  "success": false,
  "error": "El mensaje no puede estar vacío."
}
```

---

### `GET /api/health`
Verifica el estado del servicio y si la clave de API está configurada.

#### Respuesta (`200 OK`)
```json
{
  "status": "ok",
  "service": "Eduquest AI Chatbot API",
  "model": "gemini-2.5-flash",
  "apiKeyConfigured": true
}
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
