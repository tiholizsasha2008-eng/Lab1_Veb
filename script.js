// script.js - практичні роботи №6-8, варіант 7: Список бажань

// Практична робота №7: прибираємо статичні картки-заглушки з index.html
const staticCards = document.querySelectorAll('#wishlist .wish-card');
staticCards.forEach(card => card.remove());
console.log(`Видалено статичних карток: ${staticCards.length}`);

console.log('script.js підключено');

// Дані: масив бажань {id, title, price, priority}
const wishes = [
    { id: 1, title: 'Бездротові навушники', price: 3500, priority: 'високий' },
    { id: 2, title: 'Механічна клавіатура', price: 2800, priority: 'середній' },
    { id: 3, title: 'Настільна гра «Catan»', price: 1600, priority: 'низький' }
];

// Лічильник id для нових бажань
let nextId = wishes.length + 1;

// Довідники пріоритетів: клас позначки та текст
const PRIORITIES = ['високий', 'середній', 'низький'];
const PRIORITY_CLASS = {
    'високий': 'priority-high',
    'середній': 'priority-medium',
    'низький': 'priority-low'
};
const PRIORITY_LABEL = {
    'високий': 'Високий',
    'середній': 'Середній',
    'низький': 'Низький'
};

// Контейнер списку: розділ #wishlist, а в ньому блок .cards із сіткою карток
const wishlistSection = document.querySelector('#wishlist');
const listContainer = wishlistSection.querySelector('.cards');
console.log('Контейнер знайдено:', listContainer);

// Створює картку для кожного бажання з масиву і додає її в контейнер
function renderWishes(items) {
    listContainer.innerHTML = '';

    items.forEach(wish => {
        const card = document.createElement('article');
        card.classList.add('wish-card');
        card.dataset.id = wish.id;
        card.dataset.priority = wish.priority;
        card.classList.toggle('priority-high', wish.priority === 'високий');

        const title = document.createElement('h3');
        title.textContent = wish.title;

        const price = document.createElement('p');
        price.classList.add('price');
        price.textContent = `${wish.price.toLocaleString('uk-UA')} грн`;

        // Рядок із позначкою пріоритету
        const priorityRow = document.createElement('p');
        priorityRow.classList.add('priority-row');

        const label = document.createElement('span');
        label.classList.add('label');
        label.textContent = 'Пріоритет: ';

        const badge = document.createElement('span');
        badge.classList.add('badge', PRIORITY_CLASS[wish.priority]);
        badge.textContent = PRIORITY_LABEL[wish.priority];

        priorityRow.append(label, badge);

        // Список для зміни пріоритету вже доданого бажання
        const select = document.createElement('select');
        select.classList.add('priority-select');
        select.setAttribute('aria-label', `Змінити пріоритет: ${wish.title}`);
        PRIORITIES.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = PRIORITY_LABEL[value];
            select.append(option);
        });
        select.value = wish.priority;

        card.append(title, price, priorityRow, select);
        listContainer.append(card);
    });

    console.log(`Відрендерено карток: ${items.length}`);
}

// Оновлює вже наявні елементи підсумку
function updateSummary() {
    document.querySelector('#total-price').textContent =
        `${calculateTotal(wishes).toLocaleString('uk-UA')} грн`;
    document.querySelector('#summary strong').textContent = wishes.length;
}

renderWishes(wishes);
updateSummary();

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

// Надсилання форми: без перезавантаження додає бажання в масив і перемальовує список
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

    wishes.push({ id: nextId++, title, price, priority });
    renderWishes(wishes);
    updateSummary();
    form.reset();
    priceError.textContent = '';
    console.log('Додано бажання:', wishes[wishes.length - 1]);
});

// Делегування: один обробник change на контейнері для всіх карток, у тому числі нових.
// Перефарбовує позначку пріоритету без повного перерендеру списку
listContainer.addEventListener('change', event => {
    if (!event.target.matches('.priority-select')) return;

    const select = event.target;
    const card = select.closest('.wish-card');
    const wish = wishes.find(item => item.id === Number(card.dataset.id));
    if (!wish) return;

    wish.priority = select.value;
    card.dataset.priority = select.value;
    card.classList.toggle('priority-high', select.value === 'високий');

    const badge = card.querySelector('.badge');
    badge.className = `badge ${PRIORITY_CLASS[select.value]}`;
    badge.textContent = PRIORITY_LABEL[select.value];

    console.log(`Пріоритет «${wish.title}» змінено на: ${wish.priority}`);
});

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