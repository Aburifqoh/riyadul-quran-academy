/**
 * Ilmvers AI — floating academy assistant (sits above WhatsApp)
 */
(function () {
  'use strict';

  if (window.__ilmversMounted) return;
  window.__ilmversMounted = true;

  var WA_LINK = 'https://wa.me/2348109690304?text=' + encodeURIComponent(
    "Assalamu Alaikum! I'd like to ask about Riyadul Quran Academy."
  );

  var STORAGE_KEY = 'ilmvers_ai_chat_v1';

  var DEFAULT_MSG = {
    role: 'assistant',
    content:
      "Assalamu Alaikum! I'm <strong>Ilmvers AI</strong>, your assistant for Riyadul Quran Academy. Ask me about courses, enrollment, schedules, or how to contact us."
  };

  var KNOWLEDGE = [
    {
      keys: ['course', 'courses', 'subject', 'curriculum', 'class', 'classes', 'offer', 'study', 'learn'],
      reply:
        "We offer:<br>• Qur'an Memorization & Recitation<br>• Arabic Writing & Reading<br>• Hadith Memorization & Explanation<br>• Tajweed Rules & Application<br>• Tawheed and Fiqh<br>• Mutūn, Akhlāq, Siirah, Nahw, Sarf, Tafsiir & Adhkār<br><br>See details on our <a href=\"courses.html\">Courses</a> page, or say <em>enroll</em> to get started."
    },
    {
      keys: ['enroll', 'enrol', 'register', 'registration', 'join', 'admission', 'apply', 'sign up', 'signup'],
      reply:
        "To enroll, open our <a href=\"contact.html\">Contact / Registration</a> form, or chat with us on <a href=\"" +
        WA_LINK +
        "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> (+234 810 969 0304). We'll guide you on the right course and schedule."
    },
    {
      keys: ['contact', 'phone', 'whatsapp', 'email', 'call', 'reach', 'number'],
      reply:
        "You can reach Riyadul Quran Academy at:<br>• WhatsApp / Phone: <a href=\"" +
        WA_LINK +
        "\" target=\"_blank\" rel=\"noopener\">+234 810 969 0304</a><br>• Email: <a href=\"mailto:Zakariyahuabdullateef12@gmail.com\">Zakariyahuabdullateef12@gmail.com</a><br>• Facebook: Riyadul Quran Academy<br>• YouTube: @riyadhulquraan"
    },
    {
      keys: ['fee', 'fees', 'price', 'cost', 'payment', 'tuition', 'how much'],
      reply:
        "Fees depend on the course and schedule. Please message us on <a href=\"" +
        WA_LINK +
        "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> or use the <a href=\"contact.html\">contact form</a> for current pricing."
    },
    {
      keys: ['schedule', 'time', 'timing', 'when', 'online', 'zoom', 'hour', 'hours', 'available'],
      reply:
        "Classes are online and flexible for students across Nigeria, USA, Canada, Britain and beyond. Share your preferred days/times via <a href=\"" +
        WA_LINK +
        "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> and we'll match you with a teacher."
    },
    {
      keys: ['tajweed', 'recitation', 'qira'],
      reply:
        "Our <strong>Tajweed Rules & Application</strong> course teaches precise Qur'anic recitation as taught by the Prophet ﷺ. Enroll via <a href=\"contact.html\">Contact Us</a> or WhatsApp."
    },
    {
      keys: ['hifz', 'memor', 'hafiz', 'memorization', 'memorisation'],
      reply:
        "Qur'an Memorization & Recitation is one of our core programmes — with Tajweed and structured revision. Ready to start? Say <em>enroll</em> or open <a href=\"contact.html\">Contact Us</a>."
    },
    {
      keys: ['arabic', 'nahw', 'sarf', 'language'],
      reply:
        "We teach Arabic Writing & Reading from foundation to advanced fluency, plus Nahw and Sarf. Visit <a href=\"courses.html\">Courses</a> or ask to enroll."
    },
    {
      keys: ['about', 'academy', 'who', 'mission', 'riyadul'],
      reply:
        "Riyadul Quran Academy is an online academy for Qur'an Memorization, Arabic and Islamic Studies — for young and old across the globe. Learn more on our <a href=\"about.html\">About</a> page."
    },
    {
      keys: ['age', 'child', 'kids', 'adult', 'beginner', 'level'],
      reply:
        "We welcome beginners through advanced learners — children and adults. Tell us the student's age and level on <a href=\"" +
        WA_LINK +
        "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> and we'll recommend a path."
    },
    {
      keys: ['hello', 'hi', 'salam', 'assalam', 'hey', 'good morning', 'good evening'],
      reply:
        "Wa alaikum assalam! How can Ilmvers AI help you today — courses, enrollment, or contact details?"
    },
    {
      keys: ['thank', 'jazak', 'thanks'],
      reply: "Wa iyyakum! May Allah bless your seeking of knowledge. Anything else I can help with?"
    }
  ];

  function loadMessages() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [DEFAULT_MSG];
  }

  function saveMessages(messages) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch (e) { /* ignore */ }
  }

  function matchReply(text) {
    var q = String(text || '').toLowerCase();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < KNOWLEDGE.length; i++) {
      var item = KNOWLEDGE[i];
      var score = 0;
      for (var k = 0; k < item.keys.length; k++) {
        if (q.indexOf(item.keys[k]) !== -1) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore > 0) return best.reply;
    return (
      "I can help with courses, enrollment, schedules, and contact info. " +
      "Try asking about <em>courses</em> or <em>how to enroll</em>. " +
      "For personal guidance, chat with us on <a href=\"" +
      WA_LINK +
      "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>."
    );
  }

  function injectStyles() {
    if (document.getElementById('ilmvers-ai-styles')) return;
    var style = document.createElement('style');
    style.id = 'ilmvers-ai-styles';
    style.textContent = [
      '#ilmvers-root{position:fixed;right:24px;bottom:88px;z-index:9999;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px}',
      '@media(max-width:640px){#ilmvers-root{right:16px;bottom:84px}}',
      '#ilmvers-fab{width:56px;height:56px;border-radius:9999px;border:1px solid rgba(212,175,55,.45);background:linear-gradient(135deg,#0d5c75,#12799a);color:#fff;box-shadow:0 10px 25px rgba(13,92,117,.35);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s ease,box-shadow .2s ease}',
      '#ilmvers-fab:hover{transform:scale(1.08);box-shadow:0 14px 28px rgba(13,92,117,.45)}',
      '#ilmvers-fab svg{width:26px;height:26px;fill:currentColor}',
      '#ilmvers-panel{width:min(380px,calc(100vw - 32px));height:min(500px,calc(100vh - 180px));background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border:1px solid rgba(13,92,117,.12);border-radius:18px;box-shadow:0 24px 50px rgba(17,24,39,.18);display:none;flex-direction:column;overflow:hidden}',
      '#ilmvers-panel.open{display:flex;animation:ilmversIn .22s ease}',
      '@keyframes ilmversIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
      '#ilmvers-header{background:linear-gradient(90deg,#0d5c75,#12799a);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;color:#fff}',
      '#ilmvers-header .title{font-weight:700;font-size:14px}',
      '#ilmvers-header .sub{font-size:11px;opacity:.85;margin-top:2px}',
      '#ilmvers-header .brand{display:flex;align-items:center;gap:10px}',
      '#ilmvers-header .icon{width:32px;height:32px;border-radius:9999px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}',
      '#ilmvers-close{background:transparent;border:0;color:rgba(255,255,255,.85);cursor:pointer;padding:4px;border-radius:9999px}',
      '#ilmvers-close:hover{background:rgba(255,255,255,.12);color:#fff}',
      '#ilmvers-messages{flex:1;overflow-y:auto;padding:16px;background:rgba(250,249,246,.7);display:flex;flex-direction:column;gap:12px}',
      '.ilmvers-msg{max-width:85%;border-radius:16px;padding:10px 14px;font-size:13.5px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.04)}',
      '.ilmvers-msg a{color:#0d5c75;text-decoration:underline}',
      '.ilmvers-msg.user{align-self:flex-end;background:#0d5c75;color:#fff;border-bottom-right-radius:4px}',
      '.ilmvers-msg.assistant{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;color:#1f2937;border-bottom-left-radius:4px}',
      '.ilmvers-typing{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:12px 16px;display:flex;gap:5px}',
      '.ilmvers-typing span{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:ilmversDot .8s infinite ease-in-out}',
      '.ilmvers-typing span:nth-child(2){animation-delay:.15s}',
      '.ilmvers-typing span:nth-child(3){animation-delay:.3s}',
      '@keyframes ilmversDot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}',
      '#ilmvers-input-wrap{padding:12px;border-top:1px solid #f1f5f9;background:#fff}',
      '#ilmvers-form{display:flex;gap:8px;align-items:flex-end}',
      '#ilmvers-input{flex:1;resize:none;border:1px solid #e5e7eb;background:#f8fafc;border-radius:12px;padding:10px 12px;font-size:13.5px;min-height:44px;max-height:90px;outline:none;font-family:inherit}',
      '#ilmvers-input:focus{border-color:#0d5c75;box-shadow:0 0 0 3px rgba(13,92,117,.15)}',
      '#ilmvers-send{width:40px;height:40px;border:0;border-radius:10px;background:#0d5c75;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '#ilmvers-send:disabled{background:#cbd5e1;cursor:not-allowed}',
      '#ilmvers-meta{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#94a3b8}',
      '#ilmvers-fab-label{position:absolute;right:64px;white-space:nowrap;background:#083f4e;color:#fff;font-size:11px;font-weight:600;padding:6px 10px;border-radius:9999px;opacity:0;pointer-events:none;transition:opacity .2s;box-shadow:0 6px 16px rgba(0,0,0,.15)}',
      '#ilmvers-fab-wrap{position:relative;display:flex;align-items:center}',
      '#ilmvers-fab-wrap:hover #ilmvers-fab-label{opacity:1}',
      'a[href*=\"wa.me\"][class*=\"fixed\"]{z-index:1000 !important}'
    ].join('');
    document.head.appendChild(style);
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  function mount() {
    injectStyles();

    var messages = loadMessages();
    var isOpen = false;
    var isTyping = false;

    var root = el('div', { id: 'ilmvers-root', 'aria-live': 'polite' });

    var panel = el('div', { id: 'ilmvers-panel', role: 'dialog', 'aria-label': 'Ilmvers AI chat' });
    var header = el('div', { id: 'ilmvers-header' });
    header.innerHTML =
      '<div class="brand"><div class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15.3 7.1 17.5 8 11.9 4 8l5.6-1.1L12 2z"/></svg></div><div><div class="title">Ilmvers AI</div><div class="sub">Riyadul Quran Academy</div></div></div>';
    var closeBtn = el('button', { id: 'ilmvers-close', type: 'button', 'aria-label': 'Close chat' });
    closeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    header.appendChild(closeBtn);

    var messagesEl = el('div', { id: 'ilmvers-messages' });
    var inputWrap = el('div', { id: 'ilmvers-input-wrap' });
    var form = el('form', { id: 'ilmvers-form' });
    var input = el('textarea', {
      id: 'ilmvers-input',
      rows: '1',
      maxlength: '500',
      placeholder: 'Ask about courses, enrollment…',
      'aria-label': 'Message Ilmvers AI'
    });
    var sendBtn = el('button', { id: 'ilmvers-send', type: 'submit', 'aria-label': 'Send message' });
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    var meta = el('div', { id: 'ilmvers-meta' });
    meta.innerHTML = '<span>Press Enter to send</span><span id="ilmvers-count">0/500</span>';

    form.appendChild(input);
    form.appendChild(sendBtn);
    inputWrap.appendChild(form);
    inputWrap.appendChild(meta);
    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(inputWrap);

    var fabWrap = el('div', { id: 'ilmvers-fab-wrap' });
    var label = el('div', { id: 'ilmvers-fab-label', text: 'Ilmvers AI' });
    var fab = el('button', {
      id: 'ilmvers-fab',
      type: 'button',
      'aria-label': 'Open Ilmvers AI',
      title: 'Ilmvers AI'
    });
    fab.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15.3 7.1 17.5 8 11.9 4 8l5.6-1.1L12 2z"/></svg>';
    fabWrap.appendChild(label);
    fabWrap.appendChild(fab);

    root.appendChild(panel);
    root.appendChild(fabWrap);
    document.body.appendChild(root);

    function renderMessages() {
      messagesEl.innerHTML = '';
      messages.forEach(function (msg) {
        var bubble = el('div', { className: 'ilmvers-msg ' + msg.role });
        bubble.innerHTML = msg.content;
        messagesEl.appendChild(bubble);
      });
      if (isTyping) {
        var typing = el('div', { className: 'ilmvers-typing', 'aria-label': 'Ilmvers AI is typing' });
        typing.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(typing);
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setOpen(next) {
      isOpen = next;
      panel.classList.toggle('open', isOpen);
      fab.setAttribute('aria-label', isOpen ? 'Close Ilmvers AI' : 'Open Ilmvers AI');
      if (isOpen) {
        renderMessages();
        setTimeout(function () { input.focus(); }, 50);
      }
    }

    function sendMessage(raw) {
      var text = String(raw || '').trim();
      if (!text || isTyping) return;
      messages.push({ role: 'user', content: text.replace(/</g, '&lt;').replace(/>/g, '&gt;') });
      saveMessages(messages);
      input.value = '';
      document.getElementById('ilmvers-count').textContent = '0/500';
      isTyping = true;
      renderMessages();

      setTimeout(function () {
        messages.push({ role: 'assistant', content: matchReply(text) });
        saveMessages(messages);
        isTyping = false;
        renderMessages();
      }, 450 + Math.min(700, text.length * 12));
    }

    fab.addEventListener('click', function () { setOpen(!isOpen); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sendMessage(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    input.addEventListener('input', function () {
      document.getElementById('ilmvers-count').textContent = input.value.length + '/500';
    });

    renderMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
