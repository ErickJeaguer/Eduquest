require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middleware
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Rate limiting: 40 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Has enviado demasiados mensajes en poco tiempo. Por favor, espera un momento antes de continuar.'
  }
});

// Apply rate limiting to /api/chat
app.use('/api/chat', apiLimiter);

// Mount API routes
app.use('/api', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Eduquest AI Chatbot API',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apiKeyConfigured: Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== '' &&
      process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
    )
  });
});

// Serve frontend static files
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Global error handler (prevent stack trace leakage)
app.use((err, req, res, next) => {
  console.error('[Global Server Error]:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: 'Ocurrió un error inesperado en el servidor de Eduquest.'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 Eduquest Educational AI Chatbot está en ejecución`);
  console.log(`🚀 Servidor local: http://localhost:${PORT}`);
  console.log(`🤖 Modelo Gemini configurado: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`🔑 Estado de la API Key: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') ? 'Configurada ✅' : 'Pendiente en .env ⚠️'}`);
  console.log(`====================================================`);
});
