// Sukoon Mental Health Platform JavaScript

// Application data (Kept from original app.js)
const appData = {
  moodOptions: [
    {"emoji": "😊", "label": "Happy", "value": 5},
    {"emoji": "🙂", "label": "Good", "value": 4}, 
    {"emoji": "😐", "label": "Neutral", "value": 3},
    {"emoji": "😔", "label": "Down", "value": 2},
    {"emoji": "😰", "label": "Anxious", "value": 1}
  ],
  mindfulnessExercises: [
    {"title": "5-Minute Breathing", "duration": 5, "category": "Breathing"},
    {"title": "Body Scan Meditation", "duration": 15, "category": "Meditation"},
    {"title": "Progressive Relaxation", "duration": 20, "category": "Relaxation"},
    {"title": "Mindful Walking", "duration": 10, "category": "Movement"}
  ],
  copingStrategies: [
    {"title": "Deep Breathing Technique", "category": "Anxiety", "content": "Take slow, deep breaths. Inhale for 4 counts, hold for 4, exhale for 6. Repeat for 2-3 minutes."},
    {"title": "Grounding 5-4-3-2-1", "category": "Anxiety", "content": "Name 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, 1 thing you taste."},
    {"title": "Study Break Schedule", "category": "Stress", "content": "Take a 10-minute break every hour. Step away from your workspace and do light stretching."},
    {"title": "Sleep Hygiene Tips", "category": "Sleep", "content": "Keep consistent sleep schedule, avoid screens 1 hour before bed, create a relaxing bedtime routine."},
    {"title": "Progressive Muscle Relaxation", "category": "Stress", "content": "Tense and relax each muscle group, starting from your toes and working up to your head."},
    {"title": "Mindful Breathing", "category": "Anxiety", "content": "Focus solely on your breath. Count each inhale and exhale up to 10, then start again."}
  ],
  resources: [
    {"name": "Campus Counseling Center", "type": "Campus Service", "contact": "studentcounseling@university.edu", "available": "Mon-Fri 9AM-5PM"},
    {"name": "National Mental Health Helpline", "type": "Emergency", "contact": "1-800-123-4567", "available": "24/7"},
    {"name": "Student Crisis Text Line", "type": "Text Support", "contact": "Text HOME to 741741", "available": "24/7"}
  ]
};

// Global state
let currentSection = 'landing';
let selectedMood = null;
let chatConversationHistory = [];
const CHATBOT_API_URL = "http://127.0.0.1:5000/chat";

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  renderMoodOptions();
  loadMoodHistory(); // Now fetches from Database
  renderMindfulnessExercises();
  renderCopingStrategies();
  renderResources();
});

// Navigation
function navigateToSection(sectionId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(sectionId);
  if (targetPage) {
    targetPage.classList.add('active');
    currentSection = sectionId;
    window.scrollTo(0, 0);
  }
}
window.navigateToSection = navigateToSection;

// --- MOOD TRACKER (DATABASE INTEGRATED) ---

function renderMoodOptions() {
  const container = document.getElementById('mood-options');
  if (!container) return;
  container.innerHTML = '';
  appData.moodOptions.forEach(mood => {
    const moodDiv = document.createElement('div');
    moodDiv.className = 'mood-option';
    moodDiv.onclick = (event) => selectMood(mood, event);
    moodDiv.innerHTML = `<div class="mood-emoji">${mood.emoji}</div><div class="mood-label">${mood.label}</div>`;
    container.appendChild(moodDiv);
  });
}

function selectMood(mood, event) {
  selectedMood = mood;
  document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}
window.selectMood = selectMood;

async function saveMood() {
  if (!selectedMood) {
    showMessage('Please select a mood first.', 'warning');
    return;
  }
  
  const note = document.getElementById('mood-note').value;
  const moodData = {
    label: selectedMood.label,
    value: selectedMood.value,
    note: note
  };

  try {
    const response = await fetch('http://127.0.0.1:5000/save_mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moodData)
    });

    if (response.ok) {
      document.getElementById('mood-note').value = '';
      selectedMood = null;
      document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
      loadMoodHistory(); 
      showMessage('Mood logged to database! 🌟', 'success');
    }
  } catch (err) {
    console.error("Error saving mood:", err);
    showMessage('Server connection failed.', 'error');
  }
}
window.saveMood = saveMood;

async function loadMoodHistory() {
  const container = document.getElementById('mood-history-list');
  if (!container) return;

  try {
    const response = await fetch('http://127.0.0.1:5000/get_moods');
    const history = await response.json();

    if (history.length === 0) {
      container.innerHTML = '<p>No entries yet.</p>';
      return;
    }

    container.innerHTML = '';
    history.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'mood-history-item';
      item.innerHTML = `
        <div>
          <strong>${entry.mood_label}</strong>
          <p>${entry.note || ''}</p>
        </div>
        <div class="mood-date">${new Date(entry.timestamp).toLocaleDateString()}</div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

// --- AI CHATBOT (REFINED) ---

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessagesContainer = document.getElementById('chat-messages');

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (!msg) return;

        addMessageToChatUI('user', msg);
        chatInput.value = '';
        
        addTypingIndicator();

        try {
            const response = await fetch(CHATBOT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, history: chatConversationHistory })
            });

            const data = await response.json();
            removeTypingIndicator();
            
            if (data.reply) {
                addMessageToChatUI('bot', data.reply);
                chatConversationHistory.push({ role: 'user', parts: [{ text: msg }] });
                chatConversationHistory.push({ role: 'model', parts: [{ text: data.reply }] });
            }
        } catch (err) {
            removeTypingIndicator();
            addMessageToChatUI('bot', "Connection lost. Is your Python server running?");
        }
    });
}

function addMessageToChatUI(sender, message) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${sender}-message`;
    wrapper.innerHTML = `<div class="message-content"><p>${message}</p></div>`;
    chatMessagesContainer.appendChild(wrapper);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'message bot-message';
    indicator.innerHTML = `<div class="message-content"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    chatMessagesContainer.appendChild(indicator);
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// Modal helper
function showMessage(msg) {
    const modal = document.getElementById('success-modal');
    const text = document.getElementById('success-message');
    if (modal && text) {
        text.textContent = msg;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('hidden'), 3000);
    }
}
window.closeModal = () => document.getElementById('success-modal').classList.add('hidden');

// (Keep your Mindfulness/Resources rendering functions as they were)
function renderMindfulnessExercises() { /* ... original code ... */ }
function renderCopingStrategies() { /* ... original code ... */ }
function renderResources() { /* ... original code ... */ }