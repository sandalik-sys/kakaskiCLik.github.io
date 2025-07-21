const API_URL = 'https://kakaskibackend.onrender.com';

let telegram_id = null;
let userId = null;
let clicks = 0;

function getTelegramIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('telegram_id');
}

telegram_id = getTelegramIdFromUrl();

const scoreEl = document.getElementById('score');
const clicker = document.getElementById('clicker');

async function sendApiRequest(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `API error: ${res.status}`);
    }
    return await res.json();
}

async function getUserByTelegramId(tgId) {
    return await sendApiRequest(`${API_URL}/users/by_telegram_id/?telegram_id=${tgId}`);
}

async function createUser(tgId, name = "Telegram User") {
    return await sendApiRequest(`${API_URL}/users/`, 'POST', {
        telegram_id: tgId,
        name,
        clicks: 0
    });
}

async function updateUserClicks(userIdToUpdate, newClicks) {
    return await sendApiRequest(`${API_URL}/users/${userIdToUpdate}`, 'PATCH', { clicks: newClicks });
}

function updateUI() {
    if (scoreEl) {
        scoreEl.textContent = clicks;
    }
}

async function init() {
    if (!telegram_id) {
        alert("Error: telegram_id not found in URL. Please open from Telegram Bot.");
        return;
    }

    try {
        const user = await getUserByTelegramId(telegram_id);
        userId = user.id;
        clicks = user.clicks || 0;
        updateUI();
    } catch (e) {
        // If user not found, create new
        try {
            const newUser = await createUser(telegram_id);
            userId = newUser.id;
            clicks = 0;
            updateUI();
        } catch (err) {
            alert("Failed to create user: " + err.message);
        }
    }
}

clicker.addEventListener('click', async () => {
    clicks++;
    updateUI();

    if (userId) {
        try {
            await updateUserClicks(userId, clicks);
        } catch (e) {
            console.error("Failed to update clicks:", e);
        }
    }
});

init();
