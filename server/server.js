// Практична робота №14. Найпростіший сервер на Express (Node.js).
// Віддає JSON-дані «Списку бажань» через /api/wishes і роздає файли застосунку з одного origin,
// тому CORS не потрібен, а клієнт звертається до API за відносною адресою.

const express = require('express');
const path = require('path');
const wishes = require('./data/wishes.json');

const PORT = 3000;
// Файли застосунку (index.html, script.js, css/) лежать на рівень вище за теку server
const APP_ROOT = path.join(__dirname, '..');

const app = express();

// Журнал запитів: після відповіді виводить метод, адресу та статус-код
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    });
    next();
});

// Статичні файли застосунку: віддаємо лише потрібне, а теку server із даними не публікуємо
app.use('/css', express.static(path.join(APP_ROOT, 'css')));

// Головна сторінка застосунку
app.get('/', (req, res) => {
    res.sendFile(path.join(APP_ROOT, 'index.html'));
});

// Скрипт застосунку
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(APP_ROOT, 'script.js'));
});

// GET /api/wishes: повертає весь список бажань як JSON (res.json ставить Content-Type: application/json)
app.get('/api/wishes', (req, res) => {
    res.json(wishes);
});

// GET /api/wishes/:id: повертає одне бажання або 404 з JSON-повідомленням
app.get('/api/wishes/:id', (req, res) => {
    const wish = wishes.find(item => String(item.id) === req.params.id);

    if (!wish) {
        return res.status(404).json({ error: 'Бажання не знайдено' });
    }

    res.json(wish);
});

// Будь-який інший шлях: 404 із JSON-повідомленням, а не порожня відповідь
app.use((req, res) => {
    res.status(404).json({ error: 'Не знайдено' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});