const tg = window.Telegram.WebApp;
tg.expand(); 

let score = 0;
let userId = null;
let userName = 'Гість';
let clicksPerTap = 1;

const appContainer = document.getElementById('appContainer');
const clicker = document.getElementById('clicker');
const scoreEl = document.getElementById('score');
const balanceEl = document.getElementById('balance');
const themeSwitch = document.getElementById('themeSwitch');
const leaderboardList = document.getElementById('leaderboardList');
const profileUserIdEl = document.getElementById('profileUserId');
const profileUserNameEl = document.getElementById('profileUserName');
const clicksPerTapEl = document.getElementById('clicksPerTap');
const shopBalanceEl = document.getElementById('shopBalance');
const shopItemsContainer = document.getElementById('shopItems');
const poopSpawnArea = document.getElementById('poop-spawn-area'); 

let telegram_id = null;
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    telegram_id = tg.initDataUnsafe.user.id;
    userName = tg.initDataUnsafe.user.first_name + ' ' + (tg.initDataUnsafe.user.last_name || '');
} else {
    console.warn("Telegram Web App user data not available. Running in development mode.");
    telegram_id = 'dev_user_123';
    userName = 'Dev User';
}

const API_URL = 'https://kakaskibackend.onrender.com';

const shopProducts = [
    { id: 1, name: 'Сильний Клік', description: '+1 клік за тап', cost: 100, type: 'clicks_per_tap', value: 1, icon: '💪' },
    { id: 2, name: 'Подвійний Удар', description: '+2 кліки за тап', cost: 500, type: 'clicks_per_tap', value: 2, icon: '✌️' },
    { id: 3, name: 'Золота Какашка', description: '+10 кліків за тап', cost: 2000, type: 'clicks_per_tap', value: 10, icon: '🌟' },
    { id: 4, name: 'Авто-Клікер 1', description: '+1 клік/сек', cost: 5000, type: 'auto_clicks', value: 1, icon: '🤖' }, // Приклад автокліка
];

// --- Функції API взаємодії ---

async function sendApiRequest(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        const res = await fetch(url, options);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || `Помилка API: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error(`Помилка під час ${method} запиту до ${url}:`, error);
        throw error;
    }
}

async function createUser(name, telegramId, initialClicks = 0, initialClicksPerTap = 1) {
    try {
        return await sendApiRequest(`${API_URL}/users/`, 'POST', {
            name,
            telegram_id: telegramId,
            clicks: initialClicks,
            clicks_per_tap: initialClicksPerTap 
        });
    } catch (error) {
        if (error.message && error.message.includes('already exists')) {
            console.warn("Користувач вже існує, спроба отримати існуючого...");
            return await getUserByTelegramId(telegramId);
        }
        throw error;
    }
}

async function getUserByTelegramId(telegramId) {
    return await sendApiRequest(`${API_URL}/users/by_telegram_id/?telegram_id=${telegramId}`);
}

async function updateUserData(userIdToUpdate, dataToUpdate) {
    await sendApiRequest(`${API_URL}/users/${userIdToUpdate}`, 'PATCH', dataToUpdate);
}

async function getLeaderboard() {
    return await sendApiRequest(`${API_URL}/users/leaderboard/`);
}


function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    if (screenId === 'leaderboardScreen') {
        renderLeaderboard();
    } else if (screenId === 'profileScreen') {
        updateProfileScreen();
    } else if (screenId === 'shopScreen') {
        renderShopItems(); // Оновлюємо магазин при відкритті
        shopBalanceEl.textContent = score.toLocaleString(); // Оновлюємо баланс в магазині
    }
}

function updateUI() {
    scoreEl.textContent = score.toLocaleString();
    balanceEl.textContent = score.toLocaleString();
    clicksPerTapEl.textContent = clicksPerTap;
    shopBalanceEl.textContent = score.toLocaleString(); // Оновлюємо баланс в магазині
    checkShopItemAvailability(); // Перевіряємо доступність товарів
}

function updateProfileScreen() {
    profileUserIdEl.textContent = userId || 'Невідомо';
    profileUserNameEl.textContent = userName || 'Невідомо';
    balanceEl.textContent = score.toLocaleString();
    clicksPerTapEl.textContent = clicksPerTap;
}

// Генерація частинок на фоні
function createParticles() {
    const numParticles = 15; // Кількість частинок
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 15 + 5; // Розмір від 5 до 20px
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        // Випадкова затримка та тривалість для варіації анімації
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 5}s`;
        document.body.appendChild(particle);
    }
}

// Анімація спавну какашок при кліку
function spawnPoopParticles(event) {
    const rect = poopSpawnArea.getBoundingClientRect();
    for (let i = 0; i < clicksPerTap; i++) { // Кількість спавнених какашок = clicksPerTap
        const spawnedPoop = document.createElement('div');
        spawnedPoop.classList.add('spawned-poop');

        // Позиція кліку відносно клікер-зони
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        spawnedPoop.style.left = `${x}px`;
        spawnedPoop.style.top = `${y}px`;

        // Випадкові напрямки та обертання
        const randomX = (Math.random() - 0.5) * 150; // Від -75 до 75px
        const randomY = (Math.random() - 0.5) * 150 - 50; // Від -125 до 25px (щоб летіли вгору)
        const randomRotate = Math.random() * 720 - 360; // Від -360 до 360 градусів

        spawnedPoop.style.setProperty('--x', `${randomX}px`);
        spawnedPoop.style.setProperty('--y', `${randomY}px`);
        spawnedPoop.style.setProperty('--rotate', `${randomRotate}deg`);

        poopSpawnArea.appendChild(spawnedPoop);

        // Видаляємо елемент після закінчення анімації
        spawnedPoop.addEventListener('animationend', () => {
            spawnedPoop.remove();
        });
    }
}


async function renderLeaderboard() {
    leaderboardList.innerHTML = '<li class="loading-message">Завантаження лідерів...</li>';

    try {
        const leaders = await getLeaderboard();
        leaderboardList.innerHTML = '';

        if (leaders.length === 0) {
            leaderboardList.innerHTML = '<li class="empty-message">Ще немає лідерів :( Будь першим!</li>';
            return;
        }

        leaders.forEach((user, index) => {
            const listItem = document.createElement('li');
            // Додаємо клас, щоб виділити поточного користувача
            if (user.id === userId) {
                listItem.classList.add('current-user');
            }
            listItem.innerHTML = `
                <span>${index + 1}. ${user.name}</span>
                <span>${user.clicks.toLocaleString()} кліків</span>
            `;
            leaderboardList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Помилка завантаження таблиці лідерів:", error);
        leaderboardList.innerHTML = '<li class="error-message">Не вдалося завантажити лідерів. Спробуйте пізніше.</li>';
        tg.showAlert('Помилка: Не вдалося завантажити таблицю лідерів.');
    }
}

// Рендеринг товарів магазину
function renderShopItems() {
    shopItemsContainer.innerHTML = ''; // Очищаємо перед рендерингом

    shopProducts.forEach(product => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('shop-item');
        itemDiv.dataset.itemId = product.id; // Зберігаємо ID товару

        const isAffordable = score >= product.cost;

        itemDiv.innerHTML = `
            <div class="item-icon">${product.icon}</div>
            <div class="item-details">
                <span class="item-name">${product.name}</span>
                <span class="item-description">${product.description}</span>
            </div>
            <button class="buy-btn" ${isAffordable ? '' : 'disabled'}>${product.cost.toLocaleString()} 💩</button>
        `;
        shopItemsContainer.appendChild(itemDiv);
    });
    checkShopItemAvailability(); // Перевіряємо доступність після рендерингу
}

// Перевірка доступності товарів у магазині
function checkShopItemAvailability() {
    document.querySelectorAll('.shop-item').forEach(itemDiv => {
        const cost = parseInt(itemDiv.dataset.cost);
        const buyBtn = itemDiv.querySelector('.buy-btn');
        if (score >= cost) {
            buyBtn.removeAttribute('disabled');
        } else {
            buyBtn.setAttribute('disabled', 'true');
        }
    });
}

// Логіка покупки товару
async function buyItem(itemId) {
    const product = shopProducts.find(p => p.id === itemId);
    if (!product) {
        tg.showAlert('Помилка: Товар не знайдено.');
        return;
    }

    if (score < product.cost) {
        tg.showAlert('Недостатньо какашок для покупки цього товару!');
        return;
    }

    // Знімаємо вартість
    score -= product.cost;

    // Застосовуємо ефект товару
    if (product.type === 'clicks_per_tap') {
        clicksPerTap += product.value;
    }
    // else if (product.type === 'auto_clicks') { ... логіка для автокліка ... }

    updateUI(); // Оновлюємо UI негайно

    // Надсилаємо оновлення на бекенд (баланс та clicks_per_tap)
    try {
        await updateUserData(userId, {
            clicks: score,
            clicks_per_tap: clicksPerTap // Оновлюємо також clicks_per_tap на сервері
        });
        tg.showNotification({
            message: `Ви успішно купили "${product.name}"!`,
            type: 'success'
        });
        renderShopItems(); // Перерендеримо магазин, щоб оновити стан кнопок
    } catch (error) {
        console.error("Помилка при покупці товару та оновленні на сервері:", error);
        tg.showAlert(`Помилка: Не вдалося зберегти покупку. ${error.message}`);
        // Можливо, відкотити зміни в score/clicksPerTap тут, якщо збереження не вдалося
    }
}


// --- Обробники подій ---

// Обробник кліку по какашці
clicker.addEventListener('click', (event) => {
    score += clicksPerTap; // Додаємо кліки з урахуванням апгрейду
    updateUI();
    spawnPoopParticles(event); // Спавнимо какашки

    // Надсилаємо оновлення кліків на бекенд кожні 10 кліків або кожні 5 секунд
    // Це зменшить навантаження на API порівняно з кожним кліком.
    // Для простоти поки що надсилаємо кожен клік, але у великому проєкті краще це оптимізувати.
    if (userId) {
        updateUserData(userId, { clicks: score }).catch(err => {
            console.error("Помилка оновлення кліків на сервері:", err);
        });
    }
});

// Обробник перемикача теми
themeSwitch.addEventListener('change', () => {
    const isDark = themeSwitch.checked;
    document.body.classList.toggle('dark-theme', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Обробники для кнопок меню та "Назад" та покупок в магазині
appContainer.addEventListener('click', (event) => {
    // Кнопки головного меню
    if (event.target.matches('.menu-buttons .btn')) {
        const targetScreenId = event.target.dataset.target;
        if (targetScreenId) {
            showScreen(targetScreenId);
        }
    }
    // Кнопки "Назад"
    if (event.target.matches('.back-btn')) {
        showScreen('mainMenu');
    }
    // Кнопки "Купити" в магазині
    if (event.target.matches('.shop-item .buy-btn')) {
        const itemId = parseInt(event.target.closest('.shop-item').dataset.itemId);
        buyItem(itemId);
    }
});


// --- Ініціалізація гри ---
async function init() {
    loadTheme(); // Завантажуємо тему при старті
    createParticles(); // Створюємо фонові частинки

    if (!telegram_id) {
        tg.showAlert('Помилка: Не вдалося отримати ID користувача Telegram. Гра може працювати некоректно.');
        console.error("Telegram ID відсутній, неможливо ініціалізувати користувача.");
        return;
    }

    try {
        const user = await getUserByTelegramId(telegram_id);
        userId = user.id;
        score = user.clicks;
        userName = user.name;
        // Завантажуємо clicks_per_tap з бекенду, якщо він там є
        if (user.clicks_per_tap !== undefined) {
            clicksPerTap = user.clicks_per_tap;
        }
        tg.showAlert(`Ласкаво просимо, ${userName}! Ваш баланс: ${score.toLocaleString()}`);
    } catch (error) {
        console.warn("Користувача не знайдено або помилка завантаження, спроба створення нового:", error.message);
        try {
            // Створюємо нового користувача з початковими значеннями
            const newUser = await createUser(userName, telegram_id, 0, 1);
            userId = newUser.id;
            score = newUser.clicks;
            userName = newUser.name;
            clicksPerTap = newUser.clicks_per_tap;
            tg.showAlert(`Вітаємо, ${userName}! Ви новий гравець. Починайте клікати!`);
        } catch (createError) {
            console.error("Критична помилка при ініціалізації користувача:", createError);
            tg.showAlert(`Критична помилка: Не вдалося завантажити або створити користувача. ${createError.message}. Спробуйте оновити Web App.`);
            return;
        }
    }

    updateUI();
    showScreen('mainMenu'); // Показуємо головне меню після ініціалізації
}

init(); // Запускаємо ініціалізацію гри
