const tg = window.Telegram.WebApp;
tg.expand(); // робить WebApp на весь екран

let score = 0;
let userId = null;

const clicker = document.getElementById('clicker');
const scoreEl = document.getElementById('score');
const balanceEl = document.getElementById('balance');

const telegram_id = tg.initDataUnsafe.user.id;
const name = tg.initDataUnsafe.user.first_name + ' ' + (tg.initDataUnsafe.user.last_name || '');

const API_URL = 'https://bc4f424f-769c-4cbf-8349-06cdfb818e25-00-pb50i88fjg02.worf.replit.dev';

// API
async function createUser(name, telegram_id) {
  const res = await fetch(`${API_URL}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, telegram_id, clicks: 0 })
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.detail.includes('already exists')) {
      return await getUserByTelegramId(telegram_id);
    }
    throw new Error(err.detail || 'Помилка створення');
  }
  return await res.json();
}

async function getUserByTelegramId(telegram_id) {
  const res = await fetch(`${API_URL}/users/by_telegram_id/?telegram_id=${telegram_id}`);
  if (!res.ok) throw new Error('Користувача не знайдено');
  return await res.json();
}

async function updateClicks(user_id, newClicks) {
  await fetch(`${API_URL}/users/${user_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clicks: newClicks })
  });
}

function updateUI() {
  scoreEl.textContent = score;
  balanceEl.textContent = score;
}

clicker.addEventListener('click', async () => {
  score++;
  updateUI();
  await updateClicks(userId, score);
});

// Завантаження даних
async function init() {
  try {
    const user = await getUserByTelegramId(telegram_id);
    userId = user.id;
    score = user.clicks;
    updateUI();
  } catch {
    const newUser = await createUser(name, telegram_id);
    userId = newUser.id;
    score = newUser.clicks;
    updateUI();
  }
}

init();