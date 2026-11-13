const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 20;

/**
 * Validates the conversation history array.
 * @param {any} history
 * @returns {{ valid: boolean, sanitizedHistory: Array, error?: string }}
 */
function validateHistory(history) {
  if (history === undefined || history === null) {
    return { valid: true, sanitizedHistory: [] };
  }

  if (!Array.isArray(history)) {
    return { valid: false, error: 'El historial de conversación debe ser una lista (array).' };
  }

  if (history.length > MAX_HISTORY_ITEMS) {
    history = history.slice(-MAX_HISTORY_ITEMS);
  }

  const sanitized = [];
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `El elemento ${i} del historial es inválido.` };
    }

    const { role, text } = item;
    if (!role || typeof role !== 'string' || !['user', 'assistant', 'model'].includes(role.toLowerCase())) {
      return { valid: false, error: `El rol en el historial debe ser 'user' o 'assistant'.` };
    }

    if (text === undefined || text === null || typeof text !== 'string') {
      return { valid: false, error: `El mensaje en el historial debe ser una cadena de texto.` };
    }

    sanitized.push({
      role: role.toLowerCase() === 'assistant' ? 'assistant' : role.toLowerCase(),
      text: text.slice(0, MAX_MESSAGE_LENGTH)
    });
  }

  return { valid: true, sanitizedHistory: sanitized };
}

/**
 * POST /api/chat
 * Primary endpoint for conversational interaction with the educational AI.
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};

    // 1. Validate 'message' presence & type
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El campo "message" es obligatorio y debe ser una cadena de texto.'
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El mensaje no puede estar vacío.'
      });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `El mensaje excede el límite máximo de ${MAX_MESSAGE_LENGTH} caracteres.`
      });
    }

    // 2. Validate & sanitize 'history'
    const historyValidation = validateHistory(history);
    if (!historyValidation.valid) {
      return res.status(400).json({
        success: false,
        error: historyValidation.error
      });
    }

    // 3. Request educational response from Gemini service
    const reply = await geminiService.generateEducationalResponse(
      trimmedMessage,
      historyValidation.sanitizedHistory
    );

    // 4. Return successful response
    return res.status(200).json({
      success: true,
      reply: reply
    });

  } catch (error) {
    console.error('[ChatRoute Error]:', error.message || error);

    // Return safe user-friendly message in Spanish without internal stack traces
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al procesar el mensaje con el tutor educativo.'
    });
  }
});

module.exports = router;
