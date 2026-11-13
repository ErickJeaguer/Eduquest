/**
 * Eduquest Educational Chatbot - Frontend Client Application
 * Handles UI interactions, Markdown rendering, conversation history in localStorage,
 * and asynchronous communication with the Express backend.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const chatMessages = document.getElementById('chatMessages');
  const welcomeBanner = document.getElementById('welcomeBanner');
  const typingIndicator = document.getElementById('typingIndicator');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const btnSend = document.getElementById('btnSend');
  const btnIconNormal = btnSend.querySelector('.btn-icon-normal');
  const btnIconLoading = btnSend.querySelector('.btn-icon-loading');
  const charCount = document.getElementById('charCount');
  const btnClearChat = document.getElementById('btnClearChat');
  const btnConfirmClear = document.getElementById('btnConfirmClear');
  const notificationToastEl = document.getElementById('notificationToast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  // Bootstrap Modal and Toast instances
  const confirmClearModal = new bootstrap.Modal(document.getElementById('confirmClearModal'));
  const notificationToast = new bootstrap.Toast(notificationToastEl, { delay: 4000 });

  // Conversation State
  const STORAGE_KEY = 'eduquest_chat_history_v1';
  let conversationHistory = []; // Array of { role: 'user' | 'assistant', text: string, timestamp: string }
  let isProcessing = false;

  // Configure marked.js for safe and styled educational output
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {
            console.error('Highlight error:', e);
          }
        }
        return code;
      }
    });
  }

  // =========================================================================
  // Initialization & LocalStorage Management
  // =========================================================================

  function loadConversation() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        conversationHistory = JSON.parse(stored);
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          if (welcomeBanner) welcomeBanner.classList.add('d-none');
          conversationHistory.forEach(item => {
            renderMessage(item.role, item.text, item.timestamp, false);
          });
          scrollToBottom(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not parse stored conversation:', err);
      conversationHistory = [];
    }
    // If no history, ensure welcome banner is visible
    if (welcomeBanner) welcomeBanner.classList.remove('d-none');
  }

  function saveConversation() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
    } catch (err) {
      console.error('Failed to save conversation in localStorage:', err);
    }
  }

  function clearConversation() {
    conversationHistory = [];
    localStorage.removeItem(STORAGE_KEY);

    // Remove all message rows
    const rows = chatMessages.querySelectorAll('.message-row');
    rows.forEach(r => r.remove());

    // Restore welcome banner
    if (welcomeBanner) welcomeBanner.classList.remove('d-none');

    showToast('Conversación reiniciada.', 'info');
  }

  // =========================================================================
  // UI Rendering & Formatting
  // =========================================================================

  function formatTime(dateObj = new Date()) {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage(role, text, timestamp = formatTime(), shouldScroll = true) {
    if (welcomeBanner) welcomeBanner.classList.add('d-none');

    const isUser = role === 'user';
    const messageRow = document.createElement('div');
    messageRow.className = `message-row ${isUser ? 'user-row' : 'assistant-row'} d-flex align-items-start gap-2 gap-md-3`;

    if (isUser) {
      // User Message Layout
      messageRow.innerHTML = `
        <div class="user-bubble-wrapper d-flex flex-column align-items-end">
          <div class="user-bubble">
            ${escapeHtml(text)}
          </div>
          <span class="message-meta">${timestamp}</span>
        </div>
        <div class="message-avatar user-avatar flex-shrink-0">
          <i class="bi bi-person-fill"></i>
        </div>
      `;
    } else {
      // Assistant Message Layout
      let parsedHtml = '';
      if (window.marked) {
        parsedHtml = marked.parse(text);
      } else {
        parsedHtml = escapeHtml(text).replace(/\n/g, '<br>');
      }

      const messageId = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

      messageRow.innerHTML = `
        <div class="message-avatar assistant-avatar flex-shrink-0">
          <i class="bi bi-mortarboard-fill"></i>
        </div>
        <div class="assistant-bubble flex-grow-1">
          <div class="markdown-content" id="${messageId}">
            ${parsedHtml}
          </div>
          <div class="message-actions d-flex justify-content-between align-items-center">
            <span class="message-meta">${timestamp}</span>
            <button class="btn-message-action btn-copy" data-target="${messageId}" title="Copiar respuesta">
              <i class="bi bi-clipboard"></i> <span>Copiar</span>
            </button>
          </div>
        </div>
      `;
    }

    // Insert before typing indicator
    chatMessages.insertBefore(messageRow, typingIndicator);

    // Apply syntax highlighting to any code blocks in assistant reply
    if (!isUser && window.hljs) {
      messageRow.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }

    // Attach copy event listener
    if (!isUser) {
      const copyBtn = messageRow.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => handleCopyResponse(copyBtn, text));
      }
    }

    if (shouldScroll) {
      scrollToBottom(true);
    }
  }

  function renderErrorMessage(errorText) {
    if (welcomeBanner) welcomeBanner.classList.add('d-none');

    const messageRow = document.createElement('div');
    messageRow.className = 'message-row assistant-row d-flex align-items-start gap-2 gap-md-3';
    messageRow.innerHTML = `
      <div class="message-avatar flex-shrink-0" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);">
        <i class="bi bi-exclamation-triangle-fill"></i>
      </div>
      <div class="assistant-bubble flex-grow-1" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(30, 20, 25, 0.8);">
        <div class="d-flex align-items-center gap-2 mb-2 text-danger fw-bold">
          <i class="bi bi-slash-circle"></i>
          <span>No se pudo completar la consulta</span>
        </div>
        <p class="mb-0 text-light" style="font-size: 0.92rem; line-height: 1.5;">
          ${escapeHtml(errorText)}
        </p>
        <div class="message-actions mt-2 pt-2 border-top border-secondary">
          <span class="message-meta">${formatTime()}</span>
        </div>
      </div>
    `;

    chatMessages.insertBefore(messageRow, typingIndicator);
    scrollToBottom(true);
  }

  function handleCopyResponse(button, text) {
    navigator.clipboard.writeText(text).then(() => {
      const icon = button.querySelector('i');
      const label = button.querySelector('span');
      if (icon) icon.className = 'bi bi-check2 text-success';
      if (label) label.textContent = '¡Copiado!';
      setTimeout(() => {
        if (icon) icon.className = 'bi bi-clipboard';
        if (label) label.textContent = 'Copiar';
      }, 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      showToast('No se pudo copiar el texto al portapapeles', 'warning');
    });
  }

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    });
  }

  function setTypingVisible(visible) {
    if (visible) {
      typingIndicator.classList.remove('d-none');
      scrollToBottom(true);
    } else {
      typingIndicator.classList.add('d-none');
    }
  }

  function setSendingState(sending) {
    isProcessing = sending;
    btnSend.disabled = sending;
    messageInput.disabled = sending;

    if (sending) {
      btnIconNormal.classList.add('d-none');
      btnIconLoading.classList.remove('d-none');
    } else {
      btnIconNormal.classList.remove('d-none');
      btnIconLoading.classList.add('d-none');
      messageInput.focus();
    }
  }

  function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    if (type === 'error') {
      toastIcon.className = 'bi bi-exclamation-circle-fill text-danger';
    } else if (type === 'warning') {
      toastIcon.className = 'bi bi-exclamation-triangle-fill text-warning';
    } else {
      toastIcon.className = 'bi bi-info-circle-fill text-primary';
    }
    notificationToast.show();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =========================================================================
  // Send Message Flow
  // =========================================================================

  async function handleSendMessage(rawText) {
    const text = (rawText || messageInput.value || '').trim();

    if (!text) {
      messageInput.focus();
      return;
    }

    if (text.length > 2000) {
      showToast('El mensaje no puede superar los 2000 caracteres.', 'warning');
      return;
    }

    if (isProcessing) return;

    // 1. Reset input and resize
    messageInput.value = '';
    updateTextareaHeight();
    updateCharCounter();

    // 2. Render user message
    const nowTimestamp = formatTime();
    renderMessage('user', text, nowTimestamp, true);

    // 3. Prepare payload with history (exclude current message)
    const historyPayload = conversationHistory.map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      text: item.text
    }));

    // Save user message to local state
    conversationHistory.push({
      role: 'user',
      text: text,
      timestamp: nowTimestamp
    });
    saveConversation();

    // 4. UI: Show typing & disable inputs
    setSendingState(true);
    setTypingVisible(true);

    try {
      // 5. Send asynchronous request to Express /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        const errorMsg = (data && data.error)
          ? data.error
          : `Error en el servidor (${response.status} ${response.statusText})`;
        renderErrorMessage(errorMsg);
      } else {
        // 6. Render real Gemini response
        const assistantTimestamp = formatTime();
        renderMessage('assistant', data.reply, assistantTimestamp, true);

        // Save assistant response to state
        conversationHistory.push({
          role: 'assistant',
          text: data.reply,
          timestamp: assistantTimestamp
        });
        saveConversation();
      }
    } catch (networkError) {
      console.error('Fetch error:', networkError);
      renderErrorMessage(
        'No se pudo conectar con el servidor de Eduquest. ' +
        'Verifica que el servidor Node.js esté en ejecución y que tengas conexión a internet.'
      );
    } finally {
      setTypingVisible(false);
      setSendingState(false);
    }
  }

  // =========================================================================
  // Input Auto-Resize & Character Counter
  // =========================================================================

  function updateTextareaHeight() {
    messageInput.style.height = 'auto';
    const newHeight = Math.min(messageInput.scrollHeight, 180);
    messageInput.style.height = `${newHeight}px`;
  }

  function updateCharCounter() {
    const len = messageInput.value.length;
    charCount.textContent = len;
    if (len > 1800) {
      charCount.classList.add('text-warning');
    } else {
      charCount.classList.remove('text-warning');
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  // Form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  // Enter to send, Shift+Enter for new line
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Textarea input monitoring
  messageInput.addEventListener('input', () => {
    updateTextareaHeight();
    updateCharCounter();
  });

  // Clear chat triggers
  btnClearChat.addEventListener('click', () => {
    if (conversationHistory.length === 0) {
      showToast('No hay mensajes en la conversación para borrar.', 'info');
      return;
    }
    confirmClearModal.show();
  });

  btnConfirmClear.addEventListener('click', () => {
    clearConversation();
    confirmClearModal.hide();
  });

  // Suggestion chips (in welcome hero banner)
  document.querySelectorAll('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) {
        handleSendMessage(prompt);
      }
    });
  });

  // Quick topic pills (above composer)
  document.querySelectorAll('.btn-quick-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) {
        messageInput.value = prompt;
        updateTextareaHeight();
        updateCharCounter();
        messageInput.focus();
      }
    });
  });

  // Check backend health on startup
  async function checkServerHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (!data.apiKeyConfigured) {
          console.warn('[Eduquest]: GEMINI_API_KEY no está configurada en el archivo .env del servidor.');
        }
      }
    } catch (e) {
      console.warn('[Eduquest]: No se pudo conectar al endpoint de salud del servidor.');
    }
  }

  // Load existing conversation from localStorage
  loadConversation();
  checkServerHealth();
});
