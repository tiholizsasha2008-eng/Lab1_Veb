// Практична робота №10. Фреймворк: Vue 3 (CDN, без збірки).
// Причина вибору: шаблони схожі на звичайний HTML, а реактивність із коробки:
// зміна стану в data() сама перемальовує список без ручного DOM-коду.

const API_URL = 'https://jsonplaceholder.typicode.com/todos?userId=2';
// Скільки бажань із відповіді показувати на сторінці
const MAX_SERVER_ITEMS = 9;

console.log('script.js підключено');

// ---------- Практична робота №10: компонент WishItem (Vue 3) ----------

// Компонент однієї картки бажання. Дані отримує лише через props,
// про дії повідомляє батьківському компоненту подіями $emit
const WishItem = {
    props: ['id', 'name', 'price', 'priority', 'purchased'],
    emits: ['toggle', 'change-priority'],
    data() {
        return {
            // Довідник пріоритетів (власний для компонента, без глобальних змінних)
            priorities: [
                { value: 'високий', label: 'Високий', cssClass: 'priority-high' },
                { value: 'середній', label: 'Середній', cssClass: 'priority-medium' },
                { value: 'низький', label: 'Низький', cssClass: 'priority-low' }
            ]
        };
    },
    computed: {
        // Похідне значення: позначка поточного пріоритету (середній, якщо значення невідоме)
        currentPriority() {
            return this.priorities.find(p => p.value === this.priority) || this.priorities[1];
        },
        // Похідне значення: ціна у форматі «3 500 грн»
        formattedPrice() {
            return `${Number(this.price).toLocaleString('uk-UA')} грн`;
        }
    },
    template: `
        <article class="wish-card"
                 :class="{ 'is-purchased': purchased, 'priority-high': priority === 'високий' }"
                 :data-id="id"
                 :data-priority="priority">
            <h3>{{ name }}</h3>
            <p class="price">{{ formattedPrice }}</p>
            <p class="priority-row">
                <span class="label">Пріоритет: </span>
                <span class="badge" :class="currentPriority.cssClass">{{ currentPriority.label }}</span>
            </p>
            <select class="priority-select"
                    :aria-label="'Змінити пріоритет: ' + name"
                    :value="priority"
                    @change="$emit('change-priority', id, $event.target.value)">
                <option v-for="option in priorities" :key="option.value" :value="option.value">
                    {{ option.label }}
                </option>
            </select>
            <label class="purchase-toggle">
                <input type="checkbox"
                       :aria-label="'Придбано: ' + name"
                       :checked="purchased"
                       @change="$emit('toggle', id)">
                <span>Придбано</span>
            </label>
            <p class="purchase-status">{{ purchased ? 'Вже придбано' : 'Ще не придбано' }}</p>
        </article>
    `
};

// Кореневий застосунок: тут живе реактивний стан (масив бажань) і методи його зміни
const app = Vue.createApp({
    components: { WishItem },
    data() {
        return {
            // Дані: масив бажань {id, title, price, priority, purchased}
            wishes: [
                { id: 1, title: 'Бездротові навушники', price: 3500, priority: 'високий', purchased: false },
                { id: 2, title: 'Механічна клавіатура', price: 2800, priority: 'середній', purchased: false },
                { id: 3, title: 'Настільна гра «Catan»', price: 1600, priority: 'низький', purchased: false }
            ]
        };
    },
    methods: {
        // Обробник події toggle(id) від WishItem: перемикає «придбано».
        // Vue сам відстежує зміну й перемальовує картку
        toggleWish(id) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            wish.purchased = !wish.purchased;
            console.log(`«${wish.title}»: ${wish.purchased ? 'придбано' : 'не придбано'}`);
        },

        // Обробник події change-priority(id, priority) від WishItem (практична №8)
        changePriority(id, priority) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            wish.priority = priority;
            console.log(`Пріоритет «${wish.title}» змінено на: ${wish.priority}`);
        }
    },
    template: `
        <div class="cards">
            <wish-item v-for="wish in wishes"
                       :key="wish.id"
                       :id="wish.id"
                       :name="wish.title"
                       :price="wish.price"
                       :priority="wish.priority"
                       :purchased="wish.purchased"
                       @toggle="toggleWish"
                       @change-priority="changePriority"></wish-item>
        </div>
    `
});

// Монтуємо застосунок у контейнер розділу «Список бажаних речей»
const vm = app.mount('#wishlist-app');

// Реактивний масив зі стану Vue: старий код (підсумок, форма, логи) працює з ним як раніше,
// а будь-яка зміна масиву автоматично перемальовує список
const wishes = vm.wishes;
console.log('Vue-застосунок змонтовано, бажань:', wishes.length);

// Лічильник id для нових бажань
let nextId = wishes.length + 1;

// ---------- Практична робота №7 (замінено компонентом WishItem у практичній №10) ----------

// Створює спільну основу картки (article з заголовком h3).
// Її використовує рендер бажань із сервера (практична №9)
function createCardBase(titleText) {
    const card = document.createElement('article');
    card.classList.add('wish-card');

    const title = document.createElement('h3');
    title.textContent = titleText;

    card.append(title);
    return card;
}

/*
 Практична №10: ручний рендер списку з практичної №7 замінено компонентом WishItem
 з циклом v-for. Функцію renderWishes, статичні картки-заглушки та довідники
 PRIORITIES / PRIORITY_CLASS / PRIORITY_LABEL більше не викликаємо.

function renderWishes(items) {
    listContainer.innerHTML = '';
    items.forEach(wish => {
        const card = createCardBase(wish.title);
        ...
        listContainer.append(card);
    });
}
*/

// Оновлює вже наявні елементи підсумку
function updateSummary() {
    document.querySelector('#total-price').textContent =
        `${calculateTotal(wishes).toLocaleString('uk-UA')} грн`;
    document.querySelector('#summary strong').textContent = wishes.length;
}

// Автоматичний перерахунок підсумку: Vue відстежує масив wishes,
// тому функція викликається знову при кожній його зміні
Vue.watchEffect(updateSummary);

// ---------- Практична робота №8: форма та події ----------

const form = document.querySelector('#add-wish form');
const titleInput = document.querySelector('#wish-title');
const priceInput = document.querySelector('#wish-price');
const prioritySelect = document.querySelector('#wish-priority');
const priceError = document.querySelector('#price-error');

// Додаткова валідація: від'ємна ціна дає власне повідомлення про помилку
priceInput.addEventListener('input', () => {
    if (priceInput.value !== '' && Number(priceInput.value) < 0) {
        const message = 'Ціна не може бути від’ємною';
        priceInput.setCustomValidity(message);
        priceInput.setAttribute('aria-invalid', 'true');
        priceError.textContent = message;
    } else {
        priceInput.setCustomValidity('');
        priceInput.setAttribute('aria-invalid', 'false');
        priceError.textContent = '';
    }
});

// Скидає власне повідомлення про помилку, коли користувач виправляє назву
titleInput.addEventListener('input', () => titleInput.setCustomValidity(''));

// Надсилання форми: без перезавантаження додає бажання в реактивний масив;
// список і підсумок Vue оновлює сам
form.addEventListener('submit', event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const price = Number(priceInput.value);
    const priority = prioritySelect.value;

    // назва з самих пробілів проходить required, тому перевіряємо окремо
    if (title === '') {
        titleInput.setCustomValidity('Введіть назву бажання');
        titleInput.reportValidity();
        return;
    }

    wishes.push({ id: nextId++, title, price, priority, purchased: false });
    form.reset();
    priceError.textContent = '';
    console.log('Додано бажання:', wishes[wishes.length - 1]);
});

// Делегування події change із практичної №8 прибрано: зміну пріоритету
// тепер обробляє подія change-priority компонента WishItem (метод changePriority)

// ---------- Практична робота №9: клієнт для API (fetch) ----------

const serverContainer = document.querySelector('#server-cards');
const apiStatus = document.querySelector('#api-status');
const apiError = document.querySelector('#api-error');
const refreshButton = document.querySelector('#refresh-btn');

// Помилка HTTP-рівня: сервер відповів, але зі статусом поза діапазоном 200-299
class HttpError extends Error {
    constructor(status) {
        super(`HTTP ${status}`);
        this.status = status;
    }
}

// Малює картки бажань, отриманих із сервера (completed - «вже придбано»)
function renderServerWishes(items) {
    serverContainer.innerHTML = '';

    items.slice(0, MAX_SERVER_ITEMS).forEach(item => {
        const card = createCardBase(item.title);
        card.dataset.serverId = item.id;
        card.classList.toggle('is-purchased', item.completed);

        const status = document.createElement('p');
        status.classList.add('purchase-status');
        status.textContent = item.completed ? 'Вже придбано' : 'Ще не придбано';

        card.append(status);
        serverContainer.append(card);
    });
}

// Вмикає або вимикає стан завантаження: текст і заблокована кнопка
function showLoading(isLoading) {
    apiStatus.hidden = !isLoading;
    refreshButton.disabled = isLoading;
    serverContainer.setAttribute('aria-busy', String(isLoading));
}

// Показує користувачу зрозуміле повідомлення про помилку
function showError(message) {
    apiError.textContent = message;
    apiError.hidden = false;
}

// Завантажує бажання з API JSONPlaceholder (https://jsonplaceholder.typicode.com/todos?userId=2)
// і виводить їх у DOM; помилки обробляються окремо для HTTP та мережі
async function loadData() {
    showLoading(true);
    apiError.hidden = true;
    serverContainer.innerHTML = '';

    try {
        const response = await fetch(API_URL);

        // fetch не вважає 404/500 помилкою, тому перевіряємо response.ok вручну
        if (!response.ok) {
            throw new HttpError(response.status);
        }

        const data = await response.json();
        console.log('Відповідь API:', data);

        if (!Array.isArray(data)) {
            throw new Error('Невірний формат відповіді API');
        }

        renderServerWishes(data);
        if (data.length === 0) {
            showError('Сервер не повернув жодного бажання');
        }
        console.log(`Отримано бажань: ${data.length}, показано: ${Math.min(data.length, MAX_SERVER_ITEMS)}`);
    } catch (error) {
        if (error instanceof HttpError) {
            showError(`Сервер відповів помилкою (код ${error.status}). Спробуйте пізніше.`);
        } else if (error instanceof TypeError) {
            // fetch відхиляє Promise із TypeError, коли запит не дійшов до сервера
            showError('Список бажань недоступний офлайн');
        } else {
            showError('Не вдалося обробити відповідь сервера. Спробуйте пізніше.');
        }
        console.error('Помилка завантаження:', error);
    } finally {
        showLoading(false);
    }
}

// Кнопка «Оновити»: повторний запит без перезавантаження сторінки
refreshButton.addEventListener('click', loadData);

// Перший запит при завантаженні сторінки
loadData();

// ---------- Практична робота №6: цикли, умови, стрілкова функція ----------

console.log('Кількість бажань:', wishes.length);
console.log(wishes);

// Рахує загальну вартість усіх бажань циклом for
function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

const totalPrice = calculateTotal(wishes);
console.log(`Загальна вартість ${wishes.length} бажань: ${totalPrice} грн`);

// Позначає бажання з високим пріоритетом і повертає їх кількість
function markHighPriority(items) {
    let highCount = 0;
    for (const wish of items) {
        if (wish.priority === 'високий') {
            console.log(`★ ПРІОРИТЕТНО: ${wish.title} (${wish.price} грн)`);
            highCount++;
        } else {
            console.log(`  ${wish.title} (${wish.price} грн), пріоритет: ${wish.priority}`);
        }
    }
    return highCount;
}

const highCount = markHighPriority(wishes);
const highLabel = highCount > 0 ? 'є' : 'немає';
console.log(`Бажань із високим пріоритетом: ${highCount} (${highLabel})`);

// Перевіряє, чи ціна не перевищує бюджет (стрілкова функція)
const withinBudget = (price, budget) => price <= budget;

const budget = 3000;
console.log(`Бюджет: ${budget} грн`);

for (const wish of wishes) {
    const fits = withinBudget(wish.price, budget);
    console.log(`${wish.title}: ${fits ? 'вкладається в бюджет' : 'перевищує бюджет'}`);
}