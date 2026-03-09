const PROMPTS = [
  "The quick brown fox jumps over the lazy dog near the river bank on a sunny afternoon.",
  "Programming is the art of telling another human what one wants the computer to do.",
  "Success is not final failure is not fatal it is the courage to continue that counts.",
  "The best time to plant a tree was twenty years ago the second best time is now.",
  "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
  "Life is what happens when you are busy making other plans so enjoy every moment.",
  "In the middle of every difficulty lies opportunity and those who look hard enough will find it.",
  "The only way to do great work is to love what you do and pursue it with passion.",
  "Strive not to be a success but rather to be of value to others around you.",
  "It does not matter how slowly you go as long as you do not stop moving forward.",
];

const GAME_DURATION = 60; // seconds

const promptEl    = document.getElementById('prompt');
const inputEl     = document.getElementById('input');
const wpmEl       = document.getElementById('wpm');
const accuracyEl  = document.getElementById('accuracy');
const timerEl     = document.getElementById('timer');
const resultEl    = document.getElementById('result');
const finalWpmEl  = document.getElementById('final-wpm');
const finalAccEl  = document.getElementById('final-accuracy');
const restartBtn  = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const timerBar    = document.getElementById('timer-bar');

let words = [];
let charIndex = 0;       // global char index
let wordIndex = 0;       // current word index
let charInWord = 0;      // char position within current word
let totalTyped = 0;
let correctTyped = 0;
let timeLeft = GAME_DURATION;
let timerInterval = null;
let started = false;
let finished = false;

// Build flat character list for easy indexing
// Each entry: { el, correct: bool | null }
let chars = [];

function pickPrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

function buildPrompt(text) {
  promptEl.innerHTML = '';
  chars = [];
  wordIndex = 0;
  charInWord = 0;
  charIndex = 0;

  const wordList = text.split(' ');
  words = wordList;

  wordList.forEach((word, wi) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.id = `word-${wi}`;

    word.split('').forEach((ch) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'char untyped';
      charSpan.textContent = ch;
      wordSpan.appendChild(charSpan);
      chars.push({ el: charSpan, char: ch, state: 'untyped' });
    });

    // Add virtual space char (except after last word)
    if (wi < wordList.length - 1) {
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'char untyped';
      spaceSpan.textContent = ' ';
      wordSpan.appendChild(spaceSpan);
      chars.push({ el: spaceSpan, char: ' ', state: 'untyped' });
    }

    promptEl.appendChild(wordSpan);
  });

  // Set cursor on first char
  if (chars.length > 0) {
    chars[0].el.classList.add('cursor');
  }
}

function updateCursor() {
  // Remove cursor from all
  chars.forEach(c => c.el.classList.remove('cursor'));
  if (charIndex < chars.length) {
    chars[charIndex].el.classList.add('cursor');
  }
}

function updateStats() {
  const elapsed = GAME_DURATION - timeLeft;
  const minutes = elapsed / 60 || 0.0001;
  const wordsTyped = correctTyped / 5;
  const wpm = Math.round(wordsTyped / minutes);
  const accuracy = totalTyped === 0 ? 100 : Math.round((correctTyped / totalTyped) * 100);

  wpmEl.textContent = wpm;
  accuracyEl.textContent = accuracy;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    const pct = (timeLeft / GAME_DURATION) * 100;
    timerBar.style.width = pct + '%';
    timerBar.className = 'timer-bar-fill' + (pct <= 16 ? ' danger' : pct <= 33 ? ' warning' : '');
    updateStats();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  clearInterval(timerInterval);
  timerInterval = null;
  finished = true;
  inputEl.disabled = true;

  const elapsed = GAME_DURATION - timeLeft || 1;
  const minutes = elapsed / 60;
  const wpm = Math.round((correctTyped / 5) / minutes);
  const accuracy = totalTyped === 0 ? 100 : Math.round((correctTyped / totalTyped) * 100);

  finalWpmEl.textContent = wpm;
  finalAccEl.textContent = accuracy;
  resultEl.classList.remove('hidden');
}

function handleInput(e) {
  if (finished) return;

  const value = inputEl.value;

  // Start timer on first keystroke
  if (!started && value.length > 0) {
    started = true;
    startTimer();
  }

  // We process character by character by comparing input length changes.
  // Because textarea can have paste/selection, recalculate from scratch each time.
  const typed = value;

  // Reset all char states and recompute
  chars.forEach(c => {
    c.el.classList.remove('correct', 'wrong', 'cursor', 'untyped');
    c.el.classList.add('untyped');
    c.state = 'untyped';
  });

  let correct = 0;
  let total = 0;

  for (let i = 0; i < typed.length && i < chars.length; i++) {
    const expected = chars[i].char;
    const actual = typed[i];
    total++;
    if (actual === expected) {
      chars[i].el.classList.remove('untyped');
      chars[i].el.classList.add('correct');
      chars[i].state = 'correct';
      correct++;
    } else {
      chars[i].el.classList.remove('untyped');
      chars[i].el.classList.add('wrong');
      chars[i].state = 'wrong';
    }
  }

  charIndex = Math.min(typed.length, chars.length);
  correctTyped = correct;
  totalTyped = total;

  updateCursor();
  updateStats();

  // Finished all chars
  if (typed.length >= chars.length) {
    endGame();
  }
}

function initGame() {
  clearInterval(timerInterval);
  timerInterval = null;
  started = false;
  finished = false;
  timeLeft = GAME_DURATION;
  charIndex = 0;
  totalTyped = 0;
  correctTyped = 0;

  timerEl.textContent = GAME_DURATION;
  timerBar.style.width = '100%';
  timerBar.className = 'timer-bar-fill';
  wpmEl.textContent = '0';
  accuracyEl.textContent = '100';

  inputEl.value = '';
  inputEl.disabled = false;
  resultEl.classList.add('hidden');

  buildPrompt(pickPrompt());
  inputEl.focus();
}

inputEl.addEventListener('input', handleInput);
restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Tab restarts the game; prevent focus loss
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    initGame();
  }
});

// Init on load
initGame();
