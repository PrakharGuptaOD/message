// script.js - shared across index.html and view.html

// ============== SET THIS BEFORE USING ==============
// Replace with your deployed Google Apps Script Web App URL (the "web app" URL).
// Example: "https://script.google.com/macros/s/AKfycbx......../exec"
const API_URL = "https://script.google.com/macros/s/AKfycbybM7plDA3Y-5iEOBb598XcwYMPiK94yuU8YMCyV05UskzuktPJY7jg4WMgzKG6JB9DZA/exec";
// ==================================================

// POST form: sends JSON { name, message }
function initPost() {
  const form = document.getElementById('postForm');
  const nameInput = document.getElementById('name');
  const messageInput = document.getElementById('message');
  const sendBtn = document.getElementById('sendBtn');
  const statusEl = document.getElementById('status');

  function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#b91c1c' : '#065f46';
  }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const name = (nameInput.value || '').trim();
    const message = (messageInput.value || '').trim();

    if (!name || !message) {
      setStatus('Please enter name and message.', true);
      return;
    }

    // UI: sending
    sendBtn.disabled = true;
    setStatus('Sending…');

    try {
      const payload = { name, message };
      const res = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      // expecting { success: true, row: ... } or similar
      setStatus('Message sent!');
      // clear form
      nameInput.value = '';
      messageInput.value = '';
    } catch (err) {
      console.error(err);
      setStatus('Failed to send message. Check console and backend deployment.', true);
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// GET messages: loads list and renders
async function loadMessages() {
  const messagesList = document.getElementById('messagesList');
  const loading = document.getElementById('loading');

  if (loading) loading.textContent = 'Loading messages…';
  if (messagesList) messagesList.innerHTML = '';

  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const json = await res.json();
    // Expecting the backend to return an array of { name, message, timestamp }
    const messages = Array.isArray(json) ? json : (json.messages || []);

    if (!messages.length) {
      if (loading) loading.textContent = '';
      if (messagesList) messagesList.innerHTML = '<div class="empty">No messages yet. Be the first!</div>';
      return;
    }

    // sort by latest first (if timestamp present)
    messages.sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
      return tb - ta;
    });

    if (loading) loading.textContent = '';

    messages.forEach(msg => {
      const wrap = document.createElement('div');
      wrap.className = 'message';

      const meta = document.createElement('div');
      meta.className = 'meta';

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = msg.name || 'Unknown';

      const timeEl = document.createElement('div');
      timeEl.className = 'time';
      let timeText = '';
      try {
        if (msg.timestamp) {
          // show readable local time
          const d = new Date(msg.timestamp);
          if (!isNaN(d)) {
            timeText = d.toLocaleString();
          } else {
            timeText = String(msg.timestamp);
          }
        } else {
          timeText = '';
        }
      } catch (e) {
        timeText = '';
      }
      timeEl.textContent = timeText;

      meta.appendChild(nameEl);
      meta.appendChild(timeEl);

      const textEl = document.createElement('div');
      textEl.className = 'text';
      textEl.textContent = msg.message || '';

      wrap.appendChild(meta);
      wrap.appendChild(textEl);

      messagesList.appendChild(wrap);
    });
  } catch (err) {
    console.error(err);
    if (loading) loading.textContent = '';
    if (messagesList) messagesList.innerHTML = '<div class="empty">Could not load messages. See console.</div>';
  }
}
