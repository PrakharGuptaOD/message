// Replace this with your actual Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxvdNtQXTPg2voiPpp2rRN6Bj6YTP_qQUnSLx4_U5P9PZYo-kejhqi-Y12dlaW0AVY4KA/exec";

// Initialize post functionality for index.html
function initPost() {
    const form = document.getElementById('messageForm');
    const statusEl = document.getElementById('status');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!form) return;
    
    form.addEventListener('submit', function(e) { // Removed 'async' to avoid blocking
        e.preventDefault();
        
        const nameInput = document.getElementById('name');
        const messageInput = document.getElementById('message');
        const name = nameInput.value.trim();
        const message = messageInput.value.trim();
        
        if (!name || !message) {
            showStatus(statusEl, 'Please fill in all fields', 'error');
            return;
        }
        
        // --- OPTIMIZATION START: Optimistic UI Update ---
        // Don't wait for the slow Google Script. Assume success immediately.
        
        // 1. Show success immediately
        showStatus(statusEl, 'Message sent!', 'success');
        
        // 2. Clear inputs immediately
        const formData = new URLSearchParams();
        formData.append('name', name);
        formData.append('message', message);
        
        nameInput.value = '';
        messageInput.value = '';
        sendBtn.disabled = true; // Prevent double-submit briefly

        // 3. Send data in the background (Fire and Forget)
        fetch(API_URL + '?' + formData.toString(), {
            method: 'GET',
            mode: 'no-cors'
        }).then(() => {
            console.log('Background fetch completed');
        }).catch(error => {
            console.error('Background send failed:', error);
            // Optional: Alert user if network truly fails, though rare
        }).finally(() => {
            sendBtn.disabled = false;
        });

        // 4. Hide success message after 3 seconds
        setTimeout(() => {
            hideStatus(statusEl);
        }, 3000);
        // --- OPTIMIZATION END ---
    });
}

// Load messages for view.html
async function loadMessages() {
    const container = document.getElementById('messagesContainer');
    
    if (!container) return;

    // --- OPTIMIZATION START: Local Storage Caching ---
    // 1. Load cached messages INSTANTLY if they exist
    const cachedMessages = localStorage.getItem('chat_messages');
    if (cachedMessages) {
        try {
            const parsed = JSON.parse(cachedMessages);
            if (parsed && parsed.length > 0) {
                displayMessages(container, parsed);
                // Add a small indicator that we are checking for updates
                const updateIndicator = document.createElement('div');
                updateIndicator.className = 'message-timestamp';
                updateIndicator.style.textAlign = 'center';
                updateIndicator.style.marginTop = '10px';
                updateIndicator.textContent = 'Checking for new messages...';
                container.prepend(updateIndicator);
            }
        } catch (e) {
            console.error("Cache parse error", e);
        }
    }
    // --- OPTIMIZATION END ---
    
    try {
        const response = await fetch(API_URL, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            // Save fresh data to cache
            localStorage.setItem('chat_messages', JSON.stringify(result.data));
            displayMessages(container, result.data);
        } else {
            // Only show "No messages" if we don't have cached messages either
            if (!cachedMessages) {
                container.innerHTML = '<div class="no-messages">No messages yet. Be the first to post!</div>';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        // Only show error if we have nothing on screen
        if (!container.children.length) {
            container.innerHTML = '<div class="no-messages">Failed to load messages. Please try again later.</div>';
        }
    }
}

// Display messages in the container
function displayMessages(container, messages) {
    container.innerHTML = '';
    
    // Reverse to show newest first
    // Create a copy to avoid mutating the original array if it came from cache
    const sortedMessages = [...messages].reverse();
    
    sortedMessages.forEach(msg => {
        const messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        
        const nameLine = document.createElement('div');
        nameLine.className = 'message-name';
        nameLine.textContent = msg.name || 'Anonymous';
        
        const textLine = document.createElement('div');
        textLine.className = 'message-text';
        textLine.textContent = msg.message || '';
        
        const timestampLine = document.createElement('div');
        timestampLine.className = 'message-timestamp';
        timestampLine.textContent = formatTimestamp(msg.timestamp);
        
        messageBox.appendChild(nameLine);
        messageBox.appendChild(textLine);
        messageBox.appendChild(timestampLine);
        
        container.appendChild(messageBox);
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return diffMins + ' minute' + (diffMins > 1 ? 's' : '') + ' ago';
    } else if (diffHours < 24) {
        return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    } else if (diffDays < 7) {
        return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Show status message
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status show ' + type;
}

// Hide status message
function hideStatus(element) {
    element.className = 'status';
}
