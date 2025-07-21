const API_URL = 'https://kakaskibackend.onrender.com';

const UPGRADES = [
    { id: 'upgrade1', name: 'Покращений Тап', description: 'Збільшує кліки за тап на 1', base_cost: 100, cost_multiplier: 1.5, clicks_per_tap_increase: 1, icon: '👆' },
    { id: 'upgrade2', name: 'Сильніший Палець', description: 'Збільшує кліки за тап на 2', base_cost: 500, cost_multiplier: 1.8, clicks_per_tap_increase: 2, icon: '💪' },
    { id: 'upgrade3', name: 'Подвійна Какашка', description: 'Збільшує кліки за тап на 5', base_cost: 2000, cost_multiplier: 2.0, clicks_per_tap_increase: 5, icon: '💩💩' },
    { id: 'upgrade4', name: 'Авто-Тапер (x1/сек)', description: 'Автоматично додає 1 клік на секунду', base_cost: 1000, cost_multiplier: 2.0, clicks_per_tap_increase: 0, auto_clicks_increase: 1, icon: '🤖' },
];

const appContainer = document.getElementById('appContainer');
const screens = {
    main: document.getElementById('main-screen'),
    game: document.getElementById('game-screen'),
    profile: document.getElementById('profile-screen'),
    shop: document.getElementById('shop-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
};

const playButton = document.getElementById('play-btn');
const profileButton = document.getElementById('profile-btn');
const shopButton = document.getElementById('shop-btn');
const leaderboardButton = document.getElementById('leaderboard-btn');
const backButtons = document.querySelectorAll('.back-btn');

const poopButton = document.getElementById('poop-button');
const scoreDisplay = document.getElementById('score-display');
const clicksPerTapDisplay = document.getElementById('clicks-per-tap-display');
const autoClicksPerSecondDisplay = document.getElementById('auto-clicks-per-second-display');
const poopSpawnArea = document.getElementById('poop-spawn-area');

const profileName = document.getElementById('profile-name');
const profileId = document.getElementById('profile-id');
const profileClicks = document.getElementById('profile-clicks');
const profileClicksPerTap = document.getElementById('profile-clicks-per-tap');
const profileAutoClicks = document.getElementById('profile-auto-clicks');

const shopBalance = document.getElementById('shop-balance');
const shopGrid = document.getElementById('shop-grid');

const leaderboardList = document.getElementById('leaderboard-list');

const themeToggle = document.getElementById('theme-toggle');

let currentUser = null;
let userUpgrades = {};
let isProcessingRequest = false;
let autoClickInterval = null;

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function calculateUpgradeCost(upgradeId, level) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return Infinity;
    return Math.floor(upgrade.base_cost * (upgrade.cost_multiplier ** level));
}

function showScreen(screenToShow) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screenToShow.classList.add('active');
}

function updateScoreDisplay() {
    if (currentUser) {
        scoreDisplay.textContent = formatNumber(currentUser.clicks);
        clicksPerTapDisplay.textContent = `за тап: ${formatNumber(currentUser.clicks_per_tap || 1)}`;
        autoClicksPerSecondDisplay.textContent = `авто: ${formatNumber(currentUser.auto_clicks_per_second || 0)}/сек`;
    } else {
        scoreDisplay.textContent = '0';
        clicksPerTapDisplay.textContent = 'за тап: 1';
        autoClicksPerSecondDisplay.textContent = 'авто: 0/сек';
    }
}

function updateProfileInfo() {
    if (currentUser) {
        profileName.textContent = currentUser.name || 'Невідомий';
        profileId.textContent = currentUser.telegram_id || 'Невідомо';
        profileClicks.textContent = formatNumber(currentUser.clicks);
        profileClicksPerTap.textContent = formatNumber(currentUser.clicks_per_tap || 1);
        profileAutoClicks.textContent = formatNumber(currentUser.auto_clicks_per_second || 0);
    }
}

function renderShop() {
    shopGrid.innerHTML = '';
    shopBalance.textContent = `Баланс: ${formatNumber(currentUser.clicks)} 💩`;

    UPGRADES.forEach(upgrade => {
        const currentLevel = userUpgrades[upgrade.id] || 0;
        const nextCost = calculateUpgradeCost(upgrade.id, currentLevel);
        const canAfford = currentUser.clicks >= nextCost;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        itemDiv.setAttribute('data-upgrade-id', upgrade.id);
        itemDiv.innerHTML = `
            <div class="item-icon">${upgrade.icon}</div>
            <div class="item-details">
                <span class="item-name">${upgrade.name} (Рівень ${currentLevel})</span>
                <span class="item-description">${upgrade.description}</span>
            </div>
            <button class="buy-btn" ${!canAfford ? 'disabled' : ''}>Купити за ${formatNumber(nextCost)} 💩</button>
        `;
        const buyButton = itemDiv.querySelector('.buy-btn');
        buyButton.addEventListener('click', () => buyUpgrade(upgrade.id, nextCost, currentLevel));

        shopGrid.appendChild(itemDiv);
    });
}

async function buyUpgrade(upgradeId, cost, currentLevel) {
    if (isProcessingRequest) return;
    if (currentUser.clicks < cost) {
        alert('Недостатньо какашок!');
        return;
    }
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;

    isProcessingRequest = true;
    const oldClicks = currentUser.clicks;
    const oldClicksPerTap = currentUser.clicks_per_tap;
    const oldAutoClicks = currentUser.auto_clicks_per_second;
    const oldUpgradeLevel = userUpgrades[upgrade.id] || 0;

    currentUser.clicks -= cost;
    if (upgrade.clicks_per_tap_increase) currentUser.clicks_per_tap += upgrade.clicks_per_tap_increase;
    if (upgrade.auto_clicks_increase) currentUser.auto_clicks_per_second += upgrade.auto_clicks_increase;
    userUpgrades[upgrade.id] = currentLevel + 1;

    updateScoreDisplay();
    renderShop();
    updateProfileInfo();
    startAutoClicker();

    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clicks: currentUser.clicks,
                clicks_per_tap: currentUser.clicks_per_tap,
                auto_clicks_per_second: currentUser.auto_clicks_per_second
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            currentUser.clicks = oldClicks;
            currentUser.clicks_per_tap = oldClicksPerTap;
            currentUser.auto_clicks_per_second = oldAutoClicks;
            userUpgrades[upgrade.id] = oldUpgradeLevel;
            updateScoreDisplay();
            renderShop();
            updateProfileInfo();
            startAutoClicker();
            alert('Помилка збереження покупки на сервері. Спробуйте ще раз.');
        }
    } catch (error) {
        currentUser.clicks = oldClicks;
        currentUser.clicks_per_tap = oldClicksPerTap;
        currentUser.auto_clicks_per_second = oldAutoClicks;
        userUpgrades[upgrade.id] = oldUpgradeLevel;
        updateScoreDisplay();
        renderShop();
        updateProfileInfo();
        startAutoClicker();
        alert('Помилка мережі при покупці. Перевірте з\'єднання.');
    } finally {
        isProcessingRequest = false;
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/users/leaderboard/`);
        if (!response.ok) throw new Error(await response.text());
        const leaders = await response.json();
        leaderboardList.innerHTML = '';
        if (leaders.length === 0) {
            leaderboardList.innerHTML = '<li>Поки що немає гравців у таблиці лідерів.</li>';
            return;
        }
        leaders.forEach((user, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${user.name}</span><span>${formatNumber(user.clicks)} 💩</span>`;
            leaderboardList.appendChild(li);
        });
    } catch {
        leaderboardList.innerHTML = '<li>Не вдалося завантажити таблицю лідерів. Перевірте бекенд.</li>';
    }
}

async function saveUserData() {
    if (!currentUser || isProcessingRequest) return;
    isProcessingRequest = true;
    try {
        await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clicks: currentUser.clicks,
                clicks_per_tap: currentUser.clicks_per_tap,
                auto_clicks_per_second: currentUser.auto_clicks_per_second
            })
        });
    } catch {
        // Не критично
    } finally {
        isProcessingRequest = false;
    }
}

function startAutoClicker() {
    if (autoClickInterval) clearInterval(autoClickInterval);
    if (currentUser.auto_clicks_per_second > 0) {
        autoClickInterval = setInterval(() => {
            currentUser.clicks += currentUser.auto_clicks_per_second;
            updateScoreDisplay();
        }, 1000);
    }
}

function spawnPoopEffect() {
    const poop = document.createElement('div');
    poop.textContent = '💩';
    poop.style.position = 'absolute';
    const rect = poopSpawnArea.getBoundingClientRect();
    const x = Math.random() * (rect.width - 30);
    const y = Math.random() * (rect.height - 30);
    poop.style.left = `${x}px`;
    poop.style.top = `${y}px`;
    poop.style.fontSize = '24px';
    poop.style.userSelect = 'none';
    poop.style.pointerEvents = 'none';
    poopSpawnArea.appendChild(poop);
    setTimeout(() => poop.remove(), 1000);
}

poopButton.addEventListener('click', () => {
    if (!currentUser) return;
    currentUser.clicks += currentUser.clicks_per_tap || 1;
    updateScoreDisplay();
    spawnPoopEffect();
    saveUserData();
});

playButton.addEventListener('click', () => {
    showScreen(screens.game);
});

profileButton.addEventListener('click', () => {
    updateProfileInfo();
    showScreen(screens.profile);
});

shopButton.addEventListener('click', () => {
    renderShop();
    showScreen(screens.shop);
});

leaderboardButton.addEventListener('click', () => {
    fetchLeaderboard();
    showScreen(screens.leaderboard);
});

backButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen(screens.main);
    });
});

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
});

async function getUserByTelegramId(telegramId) {
    try {
        const response = await fetch(`${API_URL}/users/by_telegram_id/?telegram_id=${telegramId}`);
        if (!response.ok) throw new Error('User not found');
        const user = await response.json();
        return user;
    } catch {
        return null;
    }
}

async function createUser(telegramId, name) {
    try {
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: telegramId, name, clicks: 0 })
        });
        if (!response.ok) throw new Error('Failed to create user');
        const newUser = await response.json();
        return newUser;
    } catch {
        return null;
    }
}

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramIdRaw = urlParams.get('telegram_id');

    if (!telegramIdRaw) {
        alert('Telegram ID не передано в URL');
        return;
    }

    const telegramId = Number(telegramIdRaw);
    if (isNaN(telegramId)) {
        alert('Некоректний Telegram ID');
        return;
    }

    let user = await getUserByTelegramId(telegramId);
    if (!user) {
        user = await createUser(telegramId, `User_${telegramId}`);
        if (!user) {
            alert('Не вдалося створити користувача');
            return;
        }
    }

    currentUser = {
        id: user.id,
        name: user.name,
        telegram_id: user.telegram_id,
        clicks: user.clicks,
        clicks_per_tap: 1,
        auto_clicks_per_second: 0
    };

    userUpgrades = {};

    updateScoreDisplay();
    updateProfileInfo();
    startAutoClicker();
    showScreen(screens.main);
}

window.addEventListener('load', init);
