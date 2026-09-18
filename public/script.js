const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const themeToggle = document.getElementById('theme-toggle');
const conversation = [];

const savedTheme = localStorage.getItem('chat-theme');
if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
updateThemeButton();

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('chat-theme', isDark ? 'light' : 'dark');
  updateThemeButton();
});

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeToggle.innerHTML = `<span aria-hidden="true">${isDark ? '☀' : '☾'}</span>`;
  themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
  themeToggle.title = isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode';
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = '';
  input.disabled = true;
  const thinkingMessage = appendThinking();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mendapatkan balasan.');
    thinkingMessage.remove();
    appendMessage('bot', data.result || 'Maaf, belum ada balasan.');
    conversation.push({ role: 'model', text: data.result || '' });
  } catch (error) {
    thinkingMessage.remove();
    appendMessage('bot', `**Terjadi kendala.** ${error.message}`);
  } finally {
    input.disabled = false;
    input.focus();
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.innerHTML = sender === 'bot' ? renderMarkdown(text) : escapeHtml(text);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function appendThinking() {
  const msg = document.createElement('div');
  msg.className = 'message bot thinking';
  msg.setAttribute('aria-label', 'Gemini sedang berpikir');
  msg.innerHTML = '<span></span><span></span><span></span>';
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function renderMarkdown(markdown) {
  let html = escapeHtml(markdown).replace(/\r\n/g, '\n').trim();
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^```([\w-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = html.split('\n');
  let inList = false;
  const output = [];
  lines.forEach((line) => {
    const item = line.match(/^[-*] (.+)$/) || line.match(/^\d+\. (.+)$/);
    if (item) {
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${item[1]}</li>`);
    } else {
      if (inList) { output.push('</ul>'); inList = false; }
      if (line.trim()) output.push(/^<(h[2-4]|pre)/.test(line) ? line : `<p>${line}</p>`);
    }
  });
  if (inList) output.push('</ul>');
  return output.join('');
}
