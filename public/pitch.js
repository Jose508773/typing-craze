// Session management
let sessionId = generateSessionId();
let isWaitingForClarification = false;

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now();
}

// ==================== UI HELPERS ====================

function show(id) {
  document.getElementById(id).style.display = '';
}

function hide(id) {
  document.getElementById(id).style.display = 'none';
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  document.getElementById('error-text').textContent = msg;
  banner.style.display = '';
  setTimeout(() => { banner.style.display = 'none'; }, 6000);
}

function setLoading(on) {
  const btn = document.getElementById('analyze-btn');
  if (btn) {
    btn.disabled = on;
    btn.textContent = on ? 'Analyzing...' : 'Analyze My Idea';
  }
  if (on) {
    show('loading-section');
  } else {
    hide('loading-section');
  }
}

// ==================== SUBMIT IDEA ====================

async function submitIdea() {
  const input = document.getElementById('idea-input');
  const message = input.value.trim();

  if (!message) {
    showError('Please describe your startup idea before analyzing.');
    input.focus();
    return;
  }

  hide('error-banner');
  hide('results-section');
  hide('clarifying-section');
  setLoading(true);
  isWaitingForClarification = false;

  try {
    const data = await callAPI(message);
    handleResponse(data);
  } catch (err) {
    showError('Something went wrong. Please try again.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ==================== SUBMIT CLARIFICATION ====================

async function submitClarification() {
  const input = document.getElementById('clarifying-input');
  const message = input.value.trim();

  if (!message) {
    showError('Please answer the questions above before continuing.');
    input.focus();
    return;
  }

  hide('error-banner');
  hide('clarifying-section');
  setLoading(true);
  isWaitingForClarification = false;

  try {
    const data = await callAPI(message);
    handleResponse(data);
  } catch (err) {
    showError('Something went wrong. Please try again.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ==================== API CALL ====================

async function callAPI(message) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json();
}

// ==================== RESPONSE HANDLER ====================

function handleResponse(data) {
  if (!data || data.error) {
    showError(data?.error || 'Unexpected response from AI. Please try again.');
    return;
  }

  if (data.type === 'clarifying') {
    showClarifyingQuestions(data.questions || []);
  } else if (data.type === 'analysis') {
    showAnalysis(data);
    show('reset-btn');
  } else {
    showError('Unexpected response format. Please try again.');
  }
}

// ==================== CLARIFYING QUESTIONS ====================

function showClarifyingQuestions(questions) {
  const list = document.getElementById('questions-list');
  list.innerHTML = '';

  questions.forEach((q, i) => {
    const li = document.createElement('li');
    li.setAttribute('data-num', i + 1);
    li.textContent = q;
    list.appendChild(li);
  });

  document.getElementById('clarifying-input').value = '';
  show('clarifying-section');
  isWaitingForClarification = true;

  document.getElementById('clarifying-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== RENDER ANALYSIS ====================

function showAnalysis(data) {
  // Core Problem
  if (data.coreProblem) {
    document.getElementById('content-problem').textContent = data.coreProblem.content || '';
  }

  // Target Audience
  if (data.targetAudience) {
    document.getElementById('content-audience').textContent = data.targetAudience.content || '';
  }

  // Proposed Solution + UVP
  if (data.proposedSolution) {
    document.getElementById('content-solution').textContent = data.proposedSolution.content || '';
    const uvpBox = document.getElementById('content-uvp');
    if (data.proposedSolution.uvp) {
      uvpBox.innerHTML = `<div class="uvp-label">Unique Value Proposition</div>${escapeHTML(data.proposedSolution.uvp)}`;
      uvpBox.style.display = '';
    } else {
      uvpBox.style.display = 'none';
    }
  }

  // Lean Plan
  if (data.leanPlan && data.leanPlan.bullets) {
    const leanEl = document.getElementById('content-lean');
    leanEl.innerHTML = data.leanPlan.bullets.map(b => `
      <li class="lean-item">
        <span class="lean-badge">${escapeHTML(b.label)}</span>
        <span class="lean-text">${escapeHTML(b.text)}</span>
      </li>
    `).join('');
  }

  // VC Questions
  if (data.vcQuestions && data.vcQuestions.questions) {
    const vcEl = document.getElementById('content-vc');
    vcEl.innerHTML = data.vcQuestions.questions.map(q => `
      <div class="vc-item">
        <div class="vc-question">${escapeHTML(q.question)}</div>
        <div class="vc-probe">${escapeHTML(q.probe)}</div>
      </div>
    `).join('');
  }

  // Pitch Deck
  if (data.pitchDeck && data.pitchDeck.slides) {
    const deckEl = document.getElementById('content-deck');
    deckEl.innerHTML = data.pitchDeck.slides.map(s => `
      <div class="deck-slide">
        <div class="deck-slide-label">${escapeHTML(s.slide)}</div>
        <div class="deck-slide-content">${escapeHTML(s.content)}</div>
      </div>
    `).join('');
  }

  show('results-section');
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== RESET ====================

async function resetSession() {
  try {
    await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {}

  sessionId = generateSessionId();
  isWaitingForClarification = false;

  document.getElementById('idea-input').value = '';
  hide('results-section');
  hide('clarifying-section');
  hide('loading-section');
  hide('error-banner');
  hide('reset-btn');

  const btn = document.getElementById('analyze-btn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Analyze My Idea';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('idea-input').focus();
}

// ==================== UTILS ====================

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Allow Ctrl+Enter / Cmd+Enter to submit from textareas
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (isWaitingForClarification && document.activeElement === document.getElementById('clarifying-input')) {
      submitClarification();
    } else if (document.activeElement === document.getElementById('idea-input')) {
      submitIdea();
    }
  }
});
