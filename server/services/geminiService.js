const { GoogleGenAI } = require('@google/genai');
const { EDUCATIONAL_SYSTEM_PROMPT } = require('../prompts/educationalSystemPrompt');

/**
 * Service to handle communication with the Google Gemini API using the official @google/genai SDK.
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.client = null;

    if (this.isApiKeyConfigured()) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Check if a valid API key is present in environment variables.
   * @returns {boolean}
   */
  isApiKeyConfigured() {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim() !== '' &&
      this.apiKey !== 'YOUR_GEMINI_API_KEY'
    );
  }

  /**
   * Lazily re-check and retrieve client instance in case .env was modified at runtime.
   */
  getClient() {
    const currentKey = process.env.GEMINI_API_KEY;
    if (!this.client || currentKey !== this.apiKey) {
      this.apiKey = currentKey;
      this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      if (this.isApiKeyConfigured()) {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } else {
        this.client = null;
      }
    }
    return this.client;
  }

  /**
   * Formats the conversation history into the structure expected by the @google/genai SDK.
   *
   * @param {Array<{role: string, text: string}>} history
   * @param {string} currentMessage
   * @returns {Array<object>}
   */
  formatContents(history, currentMessage) {
    const contents = [];

    if (Array.isArray(history) && history.length > 0) {
      // Limit history to the last 12 messages to keep context focused and avoid token limits
      const boundedHistory = history.slice(-12);

      for (const item of boundedHistory) {
        if (!item || !item.text || typeof item.text !== 'string') continue;

        // Gemini SDK uses 'user' and 'model'
        const role = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';

        // Avoid adding consecutive items with the same role if malformed
        contents.push({
          role: role,
          parts: [{ text: item.text.trim() }]
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: currentMessage.trim() }]
    });

    return contents;
  }

  /**
   * Sends user message and conversation history to the Gemini model with system instructions.
   *
   * @param {string} message - Current user message.
   * @param {Array} history - Previous conversation messages.
   * @returns {Promise<string>} The assistant's text response.
   */
  async generateEducationalResponse(message, history = []) {
    const ai = this.getClient();

    if (!ai) {
      throw new Error(
        'La clave de API de Google Gemini (GEMINI_API_KEY) no está configurada en el servidor. ' +
        'Por favor, añade tu clave válida en el archivo .env para habilitar el asistente.'
      );
    }

    const contents = this.formatContents(history, message);

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: contents,
        config: {
          systemInstruction: EDUCATIONAL_SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      });

      if (!response || !response.text) {
        throw new Error('La respuesta de Gemini fue vacía o no contiene texto válido.');
      }

      return response.text.trim();
    } catch (error) {
      // Log for server diagnostics (without leaking secret keys)
      console.error('[GeminiService Error]:', error.message || error);

      // Translate common Gemini API errors into friendly Spanish explanations
      const errMsg = error.message || '';

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        throw new Error('La clave de API de Gemini proporcionada no es válida. Revisa tu archivo .env.');
      }

      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('quota')) {
        throw new Error('Se ha superado la cuota de uso o el límite de peticiones de Gemini. Inténtalo de nuevo en unos minutos.');
      }

      if (errMsg.includes('model') && (errMsg.includes('not found') || errMsg.includes('unsupported'))) {
        throw new Error(`El modelo '${this.modelName}' no está disponible o no tiene permisos. Verifica GEMINI_MODEL en .env.`);
      }

      if (errMsg.includes('SAFETY') || errMsg.includes('blocked')) {
        throw new Error('La respuesta fue bloqueada por los filtros de seguridad de Gemini.');
      }

      // Re-throw our clean custom error message if it was one of ours
      if (error.message && error.message.startsWith('La clave de API')) {
        throw error;
      }

      throw new Error('No se pudo obtener respuesta del tutor educativo en este momento. Por favor, inténtalo más tarde.');
    }
  }
}

module.exports = new GeminiService();
