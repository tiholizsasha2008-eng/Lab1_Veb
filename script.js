// script.js - практична робота №6-7, варіант 7: Список бажань

// Практична робота №7, крок 2: прибираємо статичні картки-заглушки з index.html
const staticCards = document.querySelectorAll('#wishlist .wish-card');
staticCards.forEach(card => card.remove());
console.log(`Видалено статичних карток: ${staticCards.length}`);

console.log('script.js підключено');

// Дані: масив бажань {title, price, priority}
const wishes = [
    { title: 'Бездротові навушники', price: 3500, priority: 'високий' },
    { title: 'Механічна клавіатура', price: 2800, priority: 'середній' },
    { title: 'Настільна гра «Catan»', price: 1600, priority: 'низький' }
];

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

        const title = document.createElement('h3');
        title.textContent = wish.title;

        const price = document.createElement('p');
        price.classList.add('price');
        price.textContent = `${wish.price.toLocaleString('uk-UA')} грн`;

        card.append(title, price);

        // атрибут data-priority і умовний клас
        card.dataset.priority = wish.priority;
        if (wish.priority === 'високий') {
            card.classList.add('priority-high');
        }

        listContainer.append(card);
    });

    console.log(`Відрендерено карток: ${items.length}`);
}

renderWishes(wishes);

// Оновлюємо вже наявні елементи підсумку
const totalElement = document.querySelector('#total-price');
totalElement.textContent = `${calculateTotal(wishes).toLocaleString('uk-UA')} грн`;
document.querySelector('#summary strong').textContent = wishes.length;

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