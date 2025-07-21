const API_URL = "https://kakaskibackend.onrender.com";

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

function calculateUpgradeCost(upgradeId, level) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return Infinity;
    return Math.floor(upgrade.base_cost * (upgrade.cost_multiplier ** level));
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
        profileId.textContent = currentUser.telegram_id !== undefined ? currentUser.telegram_id : 'Невідомо';
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
    } catch {
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
        if (!response.ok) throw new Error();

        const leaders = await response.json();
        leaderboardList.innerHTML = '';

        if (leaders.length === 0) {
            leaderboardList.innerHTML = '<li>Поки що немає гравців у таблиці лідерів.</li>';
            return;
        }

        leaders.forEach((user, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${index + 1}. ${user.name}</span><span>${formatNumber(user.clicks)} 💩</span>`;
            leaderboardList.appendChild(listItem);
        });
    } catch {
        leaderboardList.innerHTML = '<li>Не вдалося завантажити таблицю лідерів. Перевірте бекенд.</li>';
    }
}

async function saveUserData() {
    if (!currentUser || isProcessingRequest) return;
    isProcessingRequest = true;

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
    } catch {}
    finally {
        isProcessingRequest = false;
    }
}

function startAutoClicker() {
    if (autoClickInterval) clearInterval(autoClickInterval);

    if (currentUser && currentUser.auto_clicks_per_second > 0) {
        autoClickInterval = setInterval(() => {
            currentUser.clicks += currentUser.auto_clicks_per_second;
            updateScoreDisplay();
        }, 1000);
    }
}

async function loadUser() {
    if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp || !window.Telegram.WebApp.initDataUnsafe || !window.Telegram.WebApp.initDataUnsafe.user) {
        currentUser = {
            id: 99999,
            name: "Test User",
            telegram_id: 99999,
            clicks: 0,
            clicks_per_tap: 1,
            auto_clicks_per_second: 0
        };
        alert("Запущено в тестовому режимі. Відкрийте бота через Telegram для повної функціональності.");
        updateScoreDisplay();
        updateProfileInfo();
        renderShop();
        startAutoClicker();
        showScreen(screens.main);
        return;
    }

    const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;

    try {
        let response = await fetch(`${API_URL}/users/by_telegram_id/?telegram_id=${parseInt(telegramUser.id)}`);
        if (response.status === 404) {
            const createData = {
                name: telegramUser.first_name || "New Player",
                telegram_id: parseInt(telegramUser.id),
                clicks: 0,
                clicks_per_tap: 1,
                auto_clicks_per_second: 0
            };
            response = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData)
            });
            if (!response.ok) throw new Error();
            currentUser = await response.json();
        } else if (response.ok) {
            currentUser = await response.json();
        } else {
            throw new Error();
        }

        userUpgrades = {};
        UPGRADES.forEach(upgrade => {
            let level = 0;
            if (upgrade.clicks_per_tap_increase > 0) {
                if (upgrade.clicks_per_tap_increase === 1) {
                    level = (currentUser.clicks_per_tap || 1) - 1;
                }
            } else if (upgrade.auto_clicks_increase > 0) {
                if (upgrade.auto_clicks_increase === 1) {
                    level = (currentUser.auto_clicks_per_second || 0);
                }
            }
            if (level < 0) level = 0;
            userUpgrades[upgrade.id] = level;
        });

        updateScoreDisplay();
        updateProfileInfo();
        renderShop();
        startAutoClicker();

        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        showScreen(screens.main);
    } catch (error) {
        alert(`Критична помилка завантаження даних: ${error.message}`);
        appContainer.innerHTML = `<div style="padding:20px; color:red; text-align:center;">Помилка: ${error.message}. Будь ласка, перезавантажте сторінку.</div>`;
    }
}

playButton.addEventListener('click', () => showScreen(screens.game));
profileButton.addEventListener('click', () => {
    showScreen(screens.profile);
    updateProfileInfo();
});
shopButton.addEventListener('click', () => {
    showScreen(screens.shop);
    renderShop();
});
leaderboardButton.addEventListener('click', () => {
    showScreen(screens.leaderboard);
    fetchLeaderboard();
});

backButtons.forEach(button => button.addEventListener('click', () => showScreen(screens.main)));

poopButton.addEventListener('click', () => {
    if (!currentUser) return;

    currentUser.clicks += (currentUser.clicks_per_tap || 1);
    updateScoreDisplay();

    const spawnedPoop = document.createElement('div');
    spawnedPoop.className = 'spawned-poop';
    const rect = poopButton.getBoundingClientRect();
    const x = Math.random() * rect.width - rect.width / 2;
    const y = Math.random() * rect.height - rect.height / 2;
    const rotate = Math.random() * 360;

    spawnedPoop.style.setProperty('--x', `${x}px`);
    spawnedPoop.style.setProperty('--y', `${y - 50}px`);
    spawnedPoop.style.setProperty('--rotate', `${rotate}deg`);
    spawnedPoop.style.left = `${rect.left + rect.width / 2}px`;
    spawnedPoop.style.top = `${rect.top + rect.height / 2}px`;

    poopSpawnArea.appendChild(spawnedPoop);

    spawnedPoop.addEventListener('animationend', () => spawnedPoop.remove());
});

let saveTimeout;
appContainer.addEventListener('click', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveUserData, 3000);
});

themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
    loadUser();
});
