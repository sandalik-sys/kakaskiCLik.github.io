// --- Constants (Константи) ---
// ЦЕЙ URL ПОВИНЕН БУТИ ТОЧНИМ URL ТВОГО ЗАПУЩЕНОГО БЕКЕНДУ НА REPLIT
// Твій URL з попередніх повідомлень був:
const API_URL = "https://bc4f424f-769c-4cbf-8349-06cdfb818e25-00-pb50i88fjg02.worf.replit.dev";

// Базові апгрейди - ТИ МОЖЕШ ДОДАТИ/ЗМІНИТИ ЇХ
const UPGRADES = [
    { id: 'upgrade1', name: 'Покращений Тап', description: 'Збільшує кліки за тап на 1', base_cost: 100, cost_multiplier: 1.5, clicks_per_tap_increase: 1, icon: '👆' },
    { id: 'upgrade2', name: 'Сильніший Палець', description: 'Збільшує кліки за тап на 2', base_cost: 500, cost_multiplier: 1.8, clicks_per_tap_increase: 2, icon: '💪' },
    { id: 'upgrade3', name: 'Подвійна Какашка', description: 'Збільшує кліки за тап на 5', base_cost: 2000, cost_multiplier: 2.0, clicks_per_tap_increase: 5, icon: '💩💩' },
    { id: 'upgrade4', name: 'Авто-Тапер (x1/сек)', description: 'Автоматично додає 1 клік на секунду', base_cost: 1000, cost_multiplier: 2.0, clicks_per_tap_increase: 0, auto_clicks_increase: 1, icon: '🤖' },
    // Додай більше апгрейдів тут
];

// --- DOM Elements (Елементи HTML, з якими ми працюємо) ---
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
const backButtons = document.querySelectorAll('.back-btn'); // Всі кнопки "Назад"

const poopButton = document.getElementById('poop-button');
const scoreDisplay = document.getElementById('score-display');
const clicksPerTapDisplay = document.getElementById('clicks-per-tap-display');
const autoClicksPerSecondDisplay = document.getElementById('auto-clicks-per-second-display');
const poopSpawnArea = document.getElementById('poop-spawn-area');

// Profile Screen Elements (Елементи екрану профілю)
const profileName = document.getElementById('profile-name');
const profileId = document.getElementById('profile-id');
const profileClicks = document.getElementById('profile-clicks');
const profileClicksPerTap = document.getElementById('profile-clicks-per-tap');
const profileAutoClicks = document.getElementById('profile-auto-clicks');

// Shop Screen Elements (Елементи екрану магазину)
const shopBalance = document.getElementById('shop-balance');
const shopGrid = document.getElementById('shop-grid');

// Leaderboard Screen Elements (Елементи екрану таблиці лідерів)
const leaderboardList = document.getElementById('leaderboard-list');

// Theme Toggle (Перемикач теми)
const themeToggle = document.getElementById('theme-toggle');

// --- Global Variables (Глобальні змінні) ---
let currentUser = null; // Об'єкт поточного користувача з бекенду
let userUpgrades = {}; // Об'єкт для зберігання рівнів апгрейдів користувача {upgrade_id: level}
let isProcessingRequest = false; // Флаг для запобігання подвійних запитів до бекенду
let autoClickInterval = null; // Змінна для інтервалу авто-клікера

// --- Helper Functions (Допоміжні функції) ---

/**
 * Обчислює вартість апгрейду для даного рівня.
 * @param {string} upgradeId ID апгрейду.
 * @param {number} level Рівень, якого користувач намагається досягти (поточний рівень + 1).
 * @returns {number} Обчислена вартість.
 */
function calculateUpgradeCost(upgradeId, level) {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return Infinity; // Якщо апгрейд не знайдено, вартість нескінченна

    return Math.floor(upgrade.base_cost * (upgrade.cost_multiplier ** level));
}

/**
 * Форматує число з пробілами як роздільниками тисяч.
 * @param {number} num Число для форматування.
 * @returns {string} Відформатоване число.
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Приховує всі екрани і показує вказаний.
 * @param {HTMLElement} screenToShow Елемент екрану, який потрібно показати.
 */
function showScreen(screenToShow) {
    console.log(`Showing screen: ${screenToShow.id}`);
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screenToShow.classList.add('active');
}

/**
 * Оновлює відображення балансу кліків та кліків за тап.
 */
function updateScoreDisplay() {
    if (currentUser) {
        scoreDisplay.textContent = formatNumber(currentUser.clicks);
        clicksPerTapDisplay.textContent = `за тап: ${formatNumber(currentUser.clicks_per_tap || 1)}`; // Забезпечуємо 1, якщо null
        autoClicksPerSecondDisplay.textContent = `авто: ${formatNumber(currentUser.auto_clicks_per_second || 0)}/сек`; // Забезпечуємо 0, якщо null
        console.log(`Updated score: ${currentUser.clicks}, CPT: ${currentUser.clicks_per_tap}, Auto: ${currentUser.auto_clicks_per_second}`);
    } else {
        scoreDisplay.textContent = '0';
        clicksPerTapDisplay.textContent = 'за тап: 1';
        autoClicksPerSecondDisplay.textContent = 'авто: 0/сек';
    }
}

/**
 * Оновлює інформацію на екрані профілю.
 */
function updateProfileInfo() {
    if (currentUser) {
        profileName.textContent = currentUser.name || 'Невідомий';
        profileId.textContent = currentUser.telegram_id || 'Невідомо'; // <-- ВИПРАВЛЕНО ТУТ: якщо telegram_id немає, показуємо "Невідомо"
        profileClicks.textContent = formatNumber(currentUser.clicks);
        profileClicksPerTap.textContent = formatNumber(currentUser.clicks_per_tap || 1);
        profileAutoClicks.textContent = formatNumber(currentUser.auto_clicks_per_second || 0);
        console.log('Profile info updated.');
    }
}

/**
 * Відображає елементи магазину на основі UPGRADES та поточних рівнів користувача.
 */
function renderShop() {
    shopGrid.innerHTML = ''; // Очищаємо попередні елементи
    shopBalance.textContent = `Баланс: ${formatNumber(currentUser.clicks)} 💩`;
    console.log('Rendering shop...');

    UPGRADES.forEach(upgrade => {
        // Отримуємо поточний рівень апгрейду у користувача. Якщо немає, то 0.
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
        // Додаємо обробник подій для кнопки "Купити"
        buyButton.addEventListener('click', () => buyUpgrade(upgrade.id, nextCost, currentLevel));

        shopGrid.appendChild(itemDiv);
    });
    console.log('Shop rendered.');
}

/**
 * Обробляє покупку апгрейду.
 * @param {string} upgradeId ID апгрейду.
 * @param {number} cost Вартість апгрейду.
 * @param {number} currentLevel Поточний рівень апгрейду.
 */
async function buyUpgrade(upgradeId, cost, currentLevel) {
    if (isProcessingRequest) {
        console.warn('Request already in progress. Skipping.');
        return;
    }

    if (currentUser.clicks < cost) {
        alert('Недостатньо какашок!');
        return;
    }

    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) {
        console.error('Upgrade not found:', upgradeId);
        return;
    }

    isProcessingRequest = true;
    console.log(`Attempting to buy ${upgrade.name}...`);

    // --- Локальне оновлення для швидкого відгуку (фронтенд) ---
    const oldClicks = currentUser.clicks;
    const oldClicksPerTap = currentUser.clicks_per_tap;
    const oldAutoClicks = currentUser.auto_clicks_per_second;
    const oldUpgradeLevel = userUpgrades[upgrade.id] || 0;

    currentUser.clicks -= cost;
    if (upgrade.clicks_per_tap_increase) {
        currentUser.clicks_per_tap += upgrade.clicks_per_tap_increase;
    }
    if (upgrade.auto_clicks_increase) {
        currentUser.auto_clicks_per_second += upgrade.auto_clicks_increase;
    }
    userUpgrades[upgrade.id] = currentLevel + 1; // Збільшуємо рівень апгрейду

    updateScoreDisplay(); // Оновлюємо відображення кліків
    renderShop(); // Перерендеримо магазин, щоб оновити кнопки та рівні
    updateProfileInfo(); // Оновимо профіль
    startAutoClicker(); // Перезапустимо авто-клікер з новими значеннями

    try {
        // --- Збереження на бекенд ---
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clicks: currentUser.clicks,
                clicks_per_tap: currentUser.clicks_per_tap,
                auto_clicks_per_second: currentUser.auto_clicks_per_second
                // Тут ми б також відправляли userUpgrades, якщо бекенд їх зберігав
                // Наразі ми оновлюємо clicks_per_tap та auto_clicks_per_second на основі покупки
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to update user on backend after purchase (${response.status}):`, errorText);
            // --- Відкат змін локально, якщо бекенд не оновився ---
            currentUser.clicks = oldClicks;
            currentUser.clicks_per_tap = oldClicksPerTap;
            currentUser.auto_clicks_per_second = oldAutoClicks;
            userUpgrades[upgrade.id] = oldUpgradeLevel;
            updateScoreDisplay();
            renderShop();
            updateProfileInfo();
            startAutoClicker();
            alert('Помилка збереження покупки на сервері. Спробуйте ще раз.');
        } else {
            console.log(`Upgrade ${upgrade.name} purchased and saved.`);
            // Якщо бекенд повертає оновлений об'єкт користувача, ми можемо його використати
            // const updatedUser = await response.json();
            // currentUser = updatedUser;
            // updateScoreDisplay(); updateProfileInfo(); renderShop(); startAutoClicker();
        }
    } catch (error) {
        console.error('Network error during purchase:', error);
        alert('Помилка мережі при покупці. Перевірте з\'єднання або URL бекенду.');
        // --- Відкат змін при мережевій помилці ---
        currentUser.clicks = oldClicks;
        currentUser.clicks_per_tap = oldClicksPerTap;
        currentUser.auto_clicks_per_second = oldAutoClicks;
        userUpgrades[upgrade.id] = oldUpgradeLevel;
        updateScoreDisplay();
        renderShop();
        updateProfileInfo();
        startAutoClicker();
    } finally {
        isProcessingRequest = false;
    }
}

/**
 * Завантажує та відображає таблицю лідерів.
 */
async function fetchLeaderboard() {
    console.log('Fetching leaderboard...');
    try {
        const response = await fetch(`${API_URL}/users/leaderboard/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }
        const leaders = await response.json();
        leaderboardList.innerHTML = ''; // Очищаємо попередній список

        if (leaders.length === 0) {
            leaderboardList.innerHTML = '<li>Поки що немає гравців у таблиці лідерів.</li>';
            console.log('Leaderboard is empty.');
            return;
        }

        leaders.forEach((user, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${index + 1}. ${user.name}</span>
                <span>${formatNumber(user.clicks)} 💩</span>
            `;
            leaderboardList.appendChild(listItem);
        });
        console.log(`Leaderboard loaded with ${leaders.length} entries.`);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardList.innerHTML = '<li>Не вдалося завантажити таблицю лідерів. Перевірте бекенд.</li>';
    }
}

/**
 * Зберігає дані користувача на бекенді.
 */
async function saveUserData() {
    if (!currentUser || isProcessingRequest) {
        console.log('Skipping save: no current user or request in progress.');
        return;
    }
    isProcessingRequest = true;
    console.log('Saving user data...');

    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clicks: currentUser.clicks,
                clicks_per_tap: currentUser.clicks_per_tap,
                auto_clicks_per_second: currentUser.auto_clicks_per_second
            })
        });

        if (!response.ok) {
            console.error('Failed to save user data:', await response.text());
        } else {
            console.log('User data saved successfully.');
        }
    } catch (error) {
        console.error('Network error during save:', error);
    } finally {
        isProcessingRequest = false;
    }
}

/**
 * Запускає або перезапускає авто-клікер.
 */
function startAutoClicker() {
    if (autoClickInterval) {
        clearInterval(autoClickInterval); // Очищаємо попередній інтервал
        console.log('Cleared previous auto-clicker interval.');
    }

    if (currentUser && currentUser.auto_clicks_per_second > 0) {
        console.log(`Starting auto-clicker with ${currentUser.auto_clicks_per_second} clicks/sec.`);
        autoClickInterval = setInterval(() => {
            currentUser.clicks += currentUser.auto_clicks_per_second;
            updateScoreDisplay();
            // Можемо також періодично викликати saveUserData тут,
            // але краще покладатися на debounce або збереження при закритті/переході.
        }, 1000); // Кожну секунду
    } else {
        console.log('Auto-clicker not started/needed (auto_clicks_per_second is 0).');
    }
}


/**
 * Обробляє початкове завантаження/створення користувача.
 */
async function loadUser() {
    console.log('Attempting to load user...');
    // Перевірка, чи Telegram Web App доступний
    if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp || !window.Telegram.WebApp.initDataUnsafe || !window.Telegram.WebApp.initDataUnsafe.user) {
        console.warn("Telegram Web App data not found. Running in TEST MODE.");
        // Запускаємо в тестовому режимі, якщо Telegram User ID не знайдено
        currentUser = {
            id: 99999, // Використовуємо фіксований ID для тестування
            name: "Test User",
            telegram_id: "99999",
            clicks: 0,
            clicks_per_tap: 1,
            auto_clicks_per_second: 0
        };
        alert("Запущено в тестовому режимі. Будь ласка, відкрийте бота через Telegram для повної функціональності.");
        updateScoreDisplay();
        updateProfileInfo();
        renderShop();
        startAutoClicker();
        showScreen(screens.main); // Показати головне меню
        return;
    }

    const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
    console.log("Telegram user data:", telegramUser);

    try {
        // Спробувати отримати існуючого користувача
        let response = await fetch(`${API_URL}/users/by_telegram_id/?telegram_id=${telegramUser.id}`);
        console.log(`Fetched user by Telegram ID, status: ${response.status}`);

        if (response.status === 404) {
            // Якщо користувача не знайдено, створити нового
            console.log('User not found on backend. Creating new user...');
            const createData = {
                name: telegramUser.first_name || "New Player",
                telegram_id: String(telegramUser.id), // Telegram ID має бути рядком!
                clicks: 0,
                clicks_per_tap: 1, // Початкове значення
                auto_clicks_per_second: 0 // Початкове значення
            };
            response = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create user: ${response.status} - ${errorText}`);
            }
            currentUser = await response.json();
            console.log("New user created successfully:", currentUser);
        } else if (response.ok) {
            // Якщо користувач знайдений
            currentUser = await response.json();
            console.log("User loaded successfully:", currentUser);
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to load user: ${response.status} - ${errorText}`);
        }

        // Ініціалізуємо userUpgrades.
        // Це спрощений підхід, оскільки бекенд зараз не зберігає рівні апгрейдів.
        // Ми припускаємо, що clicks_per_tap та auto_clicks_per_second є сумою базового значення + апгрейди.
        // Для точного відстеження рівнів, бекенд мав би зберігати об'єкт upgrades {id: level}.
        userUpgrades = {};
        UPGRADES.forEach(upgrade => {
            let level = 0;
            // Це дуже спрощено і працює, якщо апгрейди дають +1, +2, +5 тощо.
            // Для більш складних апгрейдів потрібне чітке зберігання рівнів на бекенді.
            if (upgrade.clicks_per_tap_increase > 0) {
                // Якщо clicks_per_tap_increase = 1, і у користувача clicks_per_tap = 5,
                // то рівень = 4 (базовий 1 + 4 апгрейди)
                if (upgrade.clicks_per_tap_increase === 1) { // Якщо апгрейд дає +1
                    level = (currentUser.clicks_per_tap || 1) - 1;
                } else {
                     // Якщо апгрейд дає не +1, то ми не можемо легко вирахувати рівень без бекенду.
                     // Це місце для покращення.
                }
            } else if (upgrade.auto_clicks_increase > 0) {
                 if (upgrade.auto_clicks_increase === 1) { // Якщо авто-апгрейд дає +1
                    level = (currentUser.auto_clicks_per_second || 0);
                 } else {
                     // Те саме
                 }
            }
            if (level < 0) level = 0; // Не може бути від'ємного рівня
            userUpgrades[upgrade.id] = level;
        });
        console.log("User upgrades initialized:", userUpgrades);


        // --- Оновлення UI після успішного завантаження ---
        updateScoreDisplay();
        updateProfileInfo();
        renderShop();
        startAutoClicker(); // Запускаємо авто-клікер після завантаження даних

        // Важливо для Telegram Web App
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand(); // Розгортаємо Web App на всю висоту
        showScreen(screens.main); // Показати головне меню після ініціалізації
        console.log('Telegram Web App ready and expanded. Main screen shown.');

    } catch (error) {
        console.error('FATAL Initialization error:', error);
        alert(`Критична помилка завантаження даних користувача: ${error.message}. Перезавантажте сторінку або зверніться до розробника.`);
        // Залишаємо екран порожнім або показуємо повідомлення про помилку
        appContainer.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Помилка: ${error.message}. <br>Будь ласка, перезавантажте сторінку.</div>`;
    }
}


// --- Event Listeners (Обробники подій) ---

// Кнопки навігації
playButton.addEventListener('click', () => showScreen(screens.game));
profileButton.addEventListener('click', () => {
    showScreen(screens.profile);
    updateProfileInfo(); // Оновлюємо профіль при відкритті
});
shopButton.addEventListener('click', () => {
    showScreen(screens.shop);
    renderShop(); // Перерендеримо магазин при відкритті
});
leaderboardButton.addEventListener('click', () => {
    showScreen(screens.leaderboard);
    fetchLeaderboard(); // Завантажуємо лідерборд при відкритті
});

backButtons.forEach(button => {
    button.addEventListener('click', () => showScreen(screens.main));
});

// Логіка кліка по кнопці "Какашки"
poopButton.addEventListener('click', () => {
    if (!currentUser) {
        console.warn('No current user to click for.');
        return;
    }

    currentUser.clicks += (currentUser.clicks_per_tap || 1); // Додаємо кліки за тап
    updateScoreDisplay(); // Оновлюємо відображення

    // Створення маленької какашки (візуальний ефект)
    const spawnedPoop = document.createElement('div');
    spawnedPoop.className = 'spawned-poop';
    const rect = poopButton.getBoundingClientRect(); // Розміри кнопки "какашки"
    // Рандомне зміщення для ефекту розльоту
    const x = Math.random() * rect.width - rect.width / 2;
    const y = Math.random() * rect.height - rect.height / 2;
    const rotate = Math.random() * 360;

    spawnedPoop.style.setProperty('--x', `${x}px`);
    spawnedPoop.style.setProperty('--y', `${y - 50}px`); // Змістити вгору
    spawnedPoop.style.setProperty('--rotate', `${rotate}deg`);
    spawnedPoop.style.left = `${rect.left + rect.width / 2}px`;
    spawnedPoop.style.top = `${rect.top + rect.height / 2}px`;

    poopSpawnArea.appendChild(spawnedPoop);

    // Видаляємо спавнену какашку після анімації
    spawnedPoop.addEventListener('animationend', () => {
        spawnedPoop.remove();
    });
});

// Зберігаємо дані з невеликою затримкою після кліку/активності
// Це краще, ніж зберігати при кожному кліку.
let saveTimeout;
appContainer.addEventListener('click', () => {
    clearTimeout(saveTimeout); // Скидаємо таймер, якщо був попередній клік
    saveTimeout = setTimeout(saveUserData, 3000); // Зберігаємо через 3 секунди бездіяльності
});

// Логіка перемикача теми
themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme', themeToggle.checked);
    // Зберігаємо вибір теми в локальному сховищі браузера
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
});

// --- Initialization (Ініціалізація - запуск коду при завантаженні сторінки) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Starting initialization...');
    // Перевіряємо збережену тему з локального сховища
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }

    // Запускаємо функцію завантаження користувача
    loadUser();
});
