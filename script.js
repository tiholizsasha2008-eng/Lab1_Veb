// script.js - практична робота №6, варіант 7: Список бажань

console.log('script.js підключено');

// Дані: масив бажань {title, price, priority}
const wishes = [
    { title: 'Бездротові навушники', price: 3500, priority: 'високий' },
    { title: 'Механічна клавіатура', price: 2800, priority: 'середній' },
    { title: 'Настільна гра «Catan»', price: 1600, priority: 'низький' }
];

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

// Позначає бажання з високим пріоритетом
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