// Практична робота №10. Фреймворк: Vue 3 (CDN, без збірки).
// Причина вибору: шаблони схожі на звичайний HTML, а реактивність із коробки:
// зміна стану в data() сама перемальовує список без ручного DOM-коду.
// Практична робота №11: основне сховище — IndexedDB (object store «wishes»);
// копія списку й прапорець міграції лежать у localStorage, без IndexedDB застосунок працює на localStorage.
// Практична робота №12: CSS-прогрес-бар «накопичено на купівлю» (transition по width) у компоненті WishItem.
// Практична робота №13: SPA з hash-маршрутизацією (#/, #/purchased, #/wishes/:id): роутер власний, без фреймворку,
// а картки малює той самий компонент WishItem.
// Практична робота №14: «Бажання із сервера» віддає власний Node.js-сервер (Express) за адресою /api/wishes.

// Практична №14: ендпоінт власного сервера (той самий origin, що й застосунок, тому адреса відносна)
const API_URL = '/api/wishes';
// Скільки бажань із відповіді показувати на сторінці
const MAX_SERVER_ITEMS = 9;

// ---------- Практична робота №11: налаштування сховищ ----------

// Ключ localStorage зі списком бажань (JSON-рядок)
const LS_KEY = 'wishes';
// Ключ-прапорець migrated=true: початкове завантаження (міграція чи стартові дані) вже виконано
const MIGRATED_KEY = 'migrated';
// IndexedDB: назва бази, версія й object store (keyPath — id)
const DB_NAME = 'WishlistDB';
const DB_VERSION = 1;
const STORE_NAME = 'wishes';

// Модель даних одного бажання: { id, title, price, priority, url, purchased, saved }
// saved — накопичена на купівлю сума в грн (практична №12)
// Початкові бажання для першого запуску, коли в сховищах ще нічого немає
const DEFAULT_WISHES = [
    { id: 1, title: 'Бездротові навушники', price: 3500, priority: 'високий', url: '', purchased: false, saved: 0 },
    { id: 2, title: 'Механічна клавіатура', price: 2800, priority: 'середній', url: '', purchased: false, saved: 0 },
    { id: 3, title: 'Настільна гра «Catan»', price: 1600, priority: 'низький', url: '', purchased: false, saved: 0 }
];

console.log('script.js підключено');

// ---------- Практична робота №11: localStorage ----------

// Зберігає масив бажань у localStorage як JSON-рядок
function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Не вдалося записати в localStorage:', error);
    }
}

// Читає масив бажань із localStorage; при пошкоджених даних повертає порожній масив
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

// Перевіряє прапорець: чи вже виконано початкове завантаження
function isInitialized() {
    try {
        return localStorage.getItem(MIGRATED_KEY) === 'true';
    } catch (error) {
        return false;
    }
}

// Ставить прапорець migrated=true, щоб міграція не повторювалася
function markInitialized() {
    try {
        localStorage.setItem(MIGRATED_KEY, 'true');
    } catch (error) {
        console.error('Не вдалося записати прапорець міграції:', error);
    }
}

// ---------- Практична робота №11: IndexedDB ----------

// З'єднання з базою (заповнюється в initStorage після openDB)
let db = null;

// Відкриває базу WishlistDB; object store створюється лише в onupgradeneeded
function openDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB не підтримується'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Викликається, коли бази ще немає або її версія нижча за DB_VERSION
        request.onupgradeneeded = event => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const database = request.result;
            // Закриваємо з'єднання, якщо базу видаляють чи оновлюють (інша вкладка, DevTools)
            database.onversionchange = () => database.close();
            resolve(database);
        };
        request.onerror = () => reject(request.error);
    });
}

// Додає бажання або замінює наявне з тим самим id (put, транзакція readwrite)
function addItem(item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        // {...item}: у Vue-об'єкта це Proxy, який IndexedDB не клонує, тому кладемо звичайну копію
        tx.objectStore(STORE_NAME).put({ ...item });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Оновлює бажання: put перезаписує запис за ключем id (наприклад, нове значення purchased чи saved)
function updateItem(item) {
    return addItem(item);
}

// Повертає всі бажання зі сховища (транзакція readonly)
function getAllItems() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Видаляє бажання за id (транзакція readwrite)
function deleteItem(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Одноразова міграція: якщо сховище порожнє, а в localStorage є дані, переносимо їх через addItem.
// Якщо даних немає ніде, при першому запуску записуємо початкові бажання.
// Після цього ставимо прапорець migrated, щоб не повторювати при наступних запусках
async function loadInitialData() {
    let items = await getAllItems();

    if (!isInitialized()) {
        if (items.length === 0) {
            const legacy = loadFromLocalStorage();
            const source = legacy.length > 0 ? legacy : DEFAULT_WISHES;

            for (const item of source) {
                await addItem(item);
            }

            items = await getAllItems();
            console.log(legacy.length > 0
                ? `Міграція з localStorage: перенесено бажань: ${source.length}`
                : `Перший запуск: записано початкових бажань: ${source.length}`);
        }
        markInitialized();
    }

    return items;
}

// Дані без IndexedDB: беремо список із localStorage (або початкові бажання при першому запуску)
function loadFallbackData() {
    let items = loadFromLocalStorage();

    if (items.length === 0 && !isInitialized()) {
        items = DEFAULT_WISHES.map(item => ({ ...item }));
        markInitialized();
    }

    return items;
}

// ---------- Практична робота №10: компонент WishItem (Vue 3) ----------

// Компонент однієї картки бажання. Дані отримує лише через props,
// про дії повідомляє батьківському компоненту подіями $emit.
// Практична №13: prop detailed вмикає режим сторінки деталей (повне посилання замість «Докладніше»)
const WishItem = {
    props: ['id', 'name', 'price', 'priority', 'url', 'purchased', 'saved', 'detailed'],
    emits: ['toggle', 'change-priority', 'remove', 'add-savings'],
    data() {
        return {
            // Довідник пріоритетів (власний для компонента, без глобальних змінних)
            priorities: [
                { value: 'високий', label: 'Високий', cssClass: 'priority-high' },
                { value: 'середній', label: 'Середній', cssClass: 'priority-medium' },
                { value: 'низький', label: 'Низький', cssClass: 'priority-low' }
            ],
            // Практична №12: значення поля «Відкласти», текст помилки та ширина заповнення (0 до першого показу)
            amount: null,
            savingsError: '',
            animatedPercent: 0
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
        },
        // Похідне значення: посилання лише з протоколом http(s), інакше порожній рядок
        safeUrl() {
            try {
                const parsed = new URL(this.url);
                return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
            } catch (error) {
                return '';
            }
        },
        // Практична №12: накопичена сума (для старих записів без поля saved це 0)
        savedAmount() {
            return Math.max(0, Number(this.saved) || 0);
        },
        // Практична №12: відсоток «накопичено / ціна» від 0 до 100, обчислений з даних бажання
        percent() {
            const price = Number(this.price);
            if (!(price > 0)) return 0;
            return Math.min(100, Math.floor(this.savedAmount / price * 100));
        },
        // Практична №12: накопичена сума у форматі «1 750 грн»
        formattedSaved() {
            return `${this.savedAmount.toLocaleString('uk-UA')} грн`;
        }
    },
    watch: {
        // Практична №12: коли зі сховища приходить нова сума, нова ширина запускає CSS-перехід
        percent(value) {
            this.animatedPercent = value;
        }
    },
    // Практична №12: після появи картки в DOM фіксуємо ширину 0, а потім ставимо реальну,
    // тому перехід програється вже при першому показі
    mounted() {
        void this.$el.offsetWidth;
        this.animatedPercent = this.percent;
    },
    methods: {
        // Практична №12: обробник форми «Відкласти». Перевіряє суму й повідомляє батьківський компонент
        submitSavings() {
            const value = Number(this.amount);
            if (!Number.isInteger(value) || value <= 0) {
                this.savingsError = 'Введіть цілу суму більше нуля';
                return;
            }

            this.savingsError = '';
            this.$emit('add-savings', this.id, value);
            this.amount = null;
        }
    },
    template: `
        <article class="wish-card"
                 :class="{ 'is-purchased': purchased, 'priority-high': priority === 'високий' }"
                 :data-id="id"
                 :data-priority="priority">
            <h3>{{ name }}</h3>
            <p class="price">{{ formattedPrice }}</p>
            <div class="savings">
                <p class="savings-text">Накопичено: {{ formattedSaved }} з {{ formattedPrice }} ({{ percent }}%)</p>
                <div class="progress-bar"
                     role="progressbar"
                     :aria-valuenow="percent"
                     aria-valuemin="0"
                     aria-valuemax="100"
                     :aria-label="'Накопичено на купівлю: ' + name">
                    <div class="progress-bar__fill" :style="{ width: animatedPercent + '%' }"></div>
                </div>
                <p v-if="percent === 100" class="savings-done">Суму зібрано, можна купувати</p>
                <form v-if="!purchased" class="savings-form" novalidate @submit.prevent="submitSavings">
                    <input type="number" min="1" step="1" inputmode="numeric"
                           placeholder="Сума, грн"
                           :aria-label="'Скільки відкласти (грн): ' + name"
                           v-model.number="amount">
                    <button type="submit">Відкласти</button>
                </form>
                <p v-if="savingsError" class="savings-error" role="alert">{{ savingsError }}</p>
            </div>
            <p class="priority-row">
                <span class="label">Пріоритет: </span>
                <span class="badge" :class="currentPriority.cssClass">{{ currentPriority.label }}</span>
            </p>
            <p v-if="safeUrl && !detailed" class="wish-link">
                <a :href="safeUrl" target="_blank" rel="noopener noreferrer"
                   :aria-label="'Відкрити товар (нова вкладка): ' + name">Відкрити товар</a>
            </p>
            <p v-if="detailed" class="wish-url">
                <span class="label">Посилання: </span>
                <a v-if="safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer">{{ safeUrl }}</a>
                <span v-else>не вказано</span>
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
            <p v-if="!detailed" class="details-link">
                <a :href="'#/wishes/' + id" data-link
                   :aria-label="'Докладніше про бажання: ' + name">Докладніше</a>
            </p>
            <button type="button" class="delete-btn"
                    :aria-label="'Видалити: ' + name"
                    @click="$emit('remove', id)">Видалити</button>
        </article>
    `
};

// Кореневий застосунок: тут живе реактивний стан (масив бажань, поточний маршрут) і методи його зміни
const app = Vue.createApp({
    components: { WishItem },
    data() {
        return {
            // Масив бажань {id, title, price, priority, url, purchased, saved}; наповнюється зі сховища в initStorage
            wishes: [],
            // Чи завершилось початкове завантаження (щоб не показувати «Не знайдено» до нього)
            isLoaded: false,
            // Практична №13: поточний маршрут {name, params}; його змінюють view-функції роутера
            route: { name: 'home', params: {} }
        };
    },
    computed: {
        // Практична №13: бажання зі сторінки деталей (id береться з адреси) або null, якщо такого немає
        currentWish() {
            return this.wishes.find(item => item.id === Number(this.route.params.id)) || null;
        },
        // Практична №13: що показати в контейнері: усі бажання, лише куплені або одне бажання
        visibleWishes() {
            if (this.route.name === 'purchased') {
                return this.wishes.filter(item => item.purchased);
            }
            if (this.route.name === 'detail') {
                return this.currentWish ? [this.currentWish] : [];
            }
            return this.wishes;
        },
        // Практична №13: чи є на сторінці картки; якщо ні, показуємо «Не знайдено»
        showCards() {
            if (this.route.name === 'detail') return this.currentWish !== null;
            return this.route.name === 'home' || this.route.name === 'purchased';
        },
        // Практична №13: заголовок поточної сторінки
        pageTitle() {
            switch (this.route.name) {
                case 'home': return 'Список бажаних речей';
                case 'purchased': return 'Куплені бажання';
                case 'detail': return this.isLoaded && !this.currentWish ? 'Не знайдено' : 'Деталі бажання';
                default: return 'Не знайдено';
            }
        },
        // Практична №13: текст, коли на сторінці немає карток
        emptyMessage() {
            return this.route.name === 'purchased'
                ? 'Куплених бажань поки немає.'
                : 'Список порожній. Додайте перше бажання через форму.';
        },
        // Практична №13: повідомлення сторінки «Не знайдено»
        notFoundMessage() {
            return this.route.name === 'detail'
                ? 'Бажання з таким номером не знайдено.'
                : 'Сторінку не знайдено.';
        }
    },
    watch: {
        // Практична №13: назва вкладки браузера відповідає поточній сторінці
        pageTitle: {
            immediate: true,
            handler(value) {
                document.title = `${value} — Список бажань`;
            }
        }
    },
    methods: {
        // Обробник події toggle(id) від WishItem: зберігає бажання з протилежним значенням purchased (put).
        // Список після запису перечитується зі сховища
        async toggleWish(id) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            const updated = { ...wish, purchased: !wish.purchased };
            if (await saveWish(updated)) {
                console.log(`«${updated.title}»: ${updated.purchased ? 'придбано' : 'не придбано'}`);
            }
        },

        // Обробник події change-priority(id, priority) від WishItem (практична №8)
        async changePriority(id, priority) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            const updated = { ...wish, priority };
            if (await saveWish(updated)) {
                console.log(`Пріоритет «${updated.title}» змінено на: ${updated.priority}`);
            }
        },

        // Практична №12: обробник події add-savings(id, amount) від WishItem.
        // Збільшує накопичену суму (не більше ціни) й зберігає її; після оновлення даних прогрес-бар сам анімується
        async addSavings(id, amount) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            const current = Math.max(0, Number(wish.saved) || 0);
            const updated = { ...wish, saved: Math.min(wish.price, current + amount) };
            if (await saveWish(updated)) {
                console.log(`«${updated.title}»: накопичено ${updated.saved} із ${updated.price} грн`);
            }
        },

        // Обробник події remove(id) від WishItem: видаляє бажання зі сховища (delete).
        // Практична №13: зі сторінки деталей видаленого бажання повертаємось на головну
        async deleteWish(id) {
            const wish = this.wishes.find(item => item.id === id);
            if (!wish) return;

            if (await removeWish(id)) {
                console.log(`Видалено бажання: «${wish.title}»`);
                if (this.route.name === 'detail') {
                    navigate('/');
                }
            }
        }
    },
    template: `
        <h2 id="page-title" tabindex="-1">{{ pageTitle }}</h2>
        <p v-if="!isLoaded" role="status">Завантаження…</p>
        <template v-else-if="showCards">
            <p v-if="visibleWishes.length === 0">{{ emptyMessage }}</p>
            <div class="cards">
                <wish-item v-for="wish in visibleWishes"
                           :key="wish.id"
                           :id="wish.id"
                           :name="wish.title"
                           :price="wish.price"
                           :priority="wish.priority"
                           :url="wish.url"
                           :purchased="wish.purchased"
                           :saved="wish.saved"
                           :detailed="route.name === 'detail'"
                           @toggle="toggleWish"
                           @change-priority="changePriority"
                           @add-savings="addSavings"
                           @remove="deleteWish"></wish-item>
            </div>
            <p v-if="route.name === 'detail'" class="back-link">
                <a href="#/" data-link>← До списку бажань</a>
            </p>
        </template>
        <template v-else>
            <p>{{ notFoundMessage }}</p>
            <p class="back-link"><a href="#/" data-link>На головну</a></p>
        </template>
    `
});

// Монтуємо застосунок у контейнер сторінки
const vm = app.mount('#wishlist-app');

// Реактивний масив зі стану Vue: старий код (підсумок, форма, логи) працює з ним як раніше,
// а будь-яка зміна масиву автоматично перемальовує список
const wishes = vm.wishes;

// ---------- Практична робота №13: клієнтська маршрутизація (hash) ----------

// Розділи, які показує лише головна сторінка: форма додавання та бажання із сервера
const addWishSection = document.querySelector('#add-wish');
const serverSection = document.querySelector('#server-wishes');

// Перший показ сторінки не переносить фокус на заголовок
let isFirstRender = true;

// Показує або ховає статичні розділи головної сторінки
function showHomeSections(isVisible) {
    addWishSection.hidden = !isVisible;
    serverSection.hidden = !isVisible;
}

// View «/»: усі бажання (картки малює компонент WishItem), форма й бажання із сервера
function renderHome() {
    vm.route = { name: 'home', params: {} };
    showHomeSections(true);
}

// View «/purchased»: лише бажання з purchased: true
function renderPurchased() {
    vm.route = { name: 'purchased', params: {} };
    showHomeSections(false);
}

// View «/wishes/:id»: деталі одного бажання; id приходить із адреси
function renderWishDetail(params) {
    vm.route = { name: 'detail', params };
    showHomeSections(false);
}

// View для неіснуючого маршруту: сторінка «Не знайдено» з посиланням на головну
function renderNotFound() {
    vm.route = { name: 'notfound', params: {} };
    showHomeSections(false);
}

// Таблиця маршрутів: шлях-патерн і view-функція, що показує відповідну «сторінку».
// Сегмент :id — параметр, його значення matchRoute передає у view
const routes = [
    { path: '/', view: renderHome },
    { path: '/purchased', view: renderPurchased },
    { path: '/wishes/:id', view: renderWishDetail }
];

// Порівнює шлях із патернами з таблиці routes і витягує параметри (:id).
// Повертає { view, params } або null, якщо маршруту немає
function matchRoute(path) {
    const pathParts = path.split('/').filter(Boolean);

    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                params[part.slice(1)] = pathParts[i];
                return true;
            }
            return part === pathParts[i];
        });

        if (isMatch) return { view: route.view, params };
    }

    return null;
}

// Поточний шлях із hash: «#/purchased» → «/purchased», порожній hash → «/»
function getCurrentPath() {
    const path = location.hash.slice(1);
    return path === '' ? '/' : path;
}

// Позначає в меню поточну сторінку атрибутом aria-current
function updateNavigation(path) {
    document.querySelectorAll('nav a[data-link]').forEach(link => {
        if (link.getAttribute('href') === `#${path}`) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// Визначає маршрут за адресою, викликає його view і оновлює меню;
// після переходу фокус переходить на заголовок сторінки
function renderRoute() {
    const path = getCurrentPath();
    const match = matchRoute(path);

    if (match) {
        match.view(match.params);
    } else {
        renderNotFound();
    }

    updateNavigation(path);
    console.log(`Маршрут: ${path}${match ? '' : ' (не знайдено)'}`);

    if (!isFirstRender) {
        Vue.nextTick(() => {
            const heading = document.querySelector('#page-title');
            if (heading) heading.focus();
        });
    }
    isFirstRender = false;
}

// Клієнтська навігація: змінює hash (це викликає hashchange), а для поточного маршруту просто перемальовує його
function navigate(path) {
    if (getCurrentPath() === path) {
        renderRoute();
        return;
    }
    location.hash = path;
}

// Делегування кліків: усі посилання з data-link (меню, картки, Vue-шаблони) працюють без перезавантаження
document.addEventListener('click', event => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;

    // Ctrl/Cmd/Shift-клік і не ліва кнопка відкривають посилання по-своєму, їх не перехоплюємо
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    navigate(link.getAttribute('href').slice(1));
});

// Кнопки «назад»/«вперед» і ручна зміна адреси: перемальовуємо вміст відповідно до нового hash
window.addEventListener('hashchange', renderRoute);

// ---------- Практична робота №11: шар збереження даних ----------

const storageError = document.querySelector('#storage-error');

// Показує користувачу повідомлення про проблему зі сховищем
function showStorageError(message) {
    storageError.textContent = message;
    storageError.hidden = false;
}

// Ховає повідомлення про помилку
function hideStorageError() {
    storageError.hidden = true;
}

// Перечитує список із IndexedDB у реактивний масив і оновлює копію в localStorage;
// Vue сам перемальовує картки, а Vue.watchEffect — підсумок
async function refreshWishes() {
    const items = await getAllItems();
    wishes.splice(0, wishes.length, ...items);
    saveToLocalStorage(wishes);
}

// Додає або оновлює бажання (put). Повертає true, якщо збереження вдалося.
// Без IndexedDB змінює масив напряму й записує його в localStorage
async function saveWish(wish) {
    try {
        if (db) {
            await updateItem(wish);
            await refreshWishes();
            hideStorageError();
        } else {
            const index = wishes.findIndex(item => item.id === wish.id);
            if (index === -1) {
                wishes.push(wish);
            } else {
                wishes.splice(index, 1, wish);
            }
            saveToLocalStorage(wishes);
        }
        return true;
    } catch (error) {
        showStorageError('Не вдалося зберегти зміни у сховищі. Спробуйте ще раз.');
        console.error('Помилка збереження:', error);
        return false;
    }
}

// Видаляє бажання за id (delete). Повертає true, якщо видалення вдалося
async function removeWish(id) {
    try {
        if (db) {
            await deleteItem(id);
            await refreshWishes();
            hideStorageError();
        } else {
            const index = wishes.findIndex(item => item.id === id);
            if (index !== -1) {
                wishes.splice(index, 1);
            }
            saveToLocalStorage(wishes);
        }
        return true;
    } catch (error) {
        showStorageError('Не вдалося видалити бажання зі сховища. Спробуйте ще раз.');
        console.error('Помилка видалення:', error);
        return false;
    }
}

// Новий id: найбільший наявний + 1 (після видалень length + 1 давав би дублікати)
function getNextId() {
    return wishes.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

// Початкове завантаження: відкриває IndexedDB, виконує міграцію й наповнює список.
// Якщо базу відкрити не вдалося, показує повідомлення й працює з localStorage
async function initStorage() {
    let items;

    try {
        db = await openDB();
        items = await loadInitialData();
        console.log('IndexedDB відкрито, бажань у сховищі:', items.length);
    } catch (error) {
        db = null;
        showStorageError('Не вдалося відкрити IndexedDB (можливо, приватний режим). Дані зберігаються лише в localStorage.');
        console.error('Помилка відкриття IndexedDB:', error);
        items = loadFallbackData();
    }

    wishes.splice(0, wishes.length, ...items);
    saveToLocalStorage(wishes);
    vm.isLoaded = true;
    logWishesReport();
}

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
 Практична №13: цей самий компонент використовують усі маршрути.

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
const urlInput = document.querySelector('#wish-url');
const prioritySelect = document.querySelector('#wish-priority');
const priceError = document.querySelector('#price-error');
const urlError = document.querySelector('#url-error');

// Перевіряє, що рядок є посиланням із протоколом http або https
function isHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

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

// Скидає повідомлення про помилку посилання, коли користувач його редагує
urlInput.addEventListener('input', () => {
    urlInput.setCustomValidity('');
    urlError.textContent = '';
});

// Надсилання форми: без перезавантаження зберігає нове бажання в сховище (put);
// список і підсумок після цього оновлюються автоматично
form.addEventListener('submit', async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const price = Number(priceInput.value);
    const priority = prioritySelect.value;
    const url = urlInput.value.trim();

    // назва з самих пробілів проходить required, тому перевіряємо окремо
    if (title === '') {
        titleInput.setCustomValidity('Введіть назву бажання');
        titleInput.reportValidity();
        return;
    }

    // type="url" пропускає й небезпечні схеми (javascript:), тому дозволяємо лише http(s)
    if (url !== '' && !isHttpUrl(url)) {
        const message = 'Посилання має починатися з http:// або https://';
        urlInput.setCustomValidity(message);
        urlError.textContent = message;
        urlInput.reportValidity();
        return;
    }

    const wish = { id: getNextId(), title, price, priority, url, purchased: false, saved: 0 };
    const saved = await saveWish(wish);
    if (!saved) return;

    form.reset();
    priceError.textContent = '';
    urlError.textContent = '';
    console.log('Додано бажання:', wish);
});

// Делегування події change із практичної №8 прибрано: зміну пріоритету
// тепер обробляє подія change-priority компонента WishItem (метод changePriority)

// ---------- Практична робота №9: клієнт для API (fetch); у практичній №14 — власний Node.js-сервер ----------

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

// Малює картки бажань, отриманих із власного сервера (purchased - «вже придбано»)
function renderServerWishes(items) {
    serverContainer.innerHTML = '';

    items.slice(0, MAX_SERVER_ITEMS).forEach(item => {
        const card = createCardBase(item.title);
        card.dataset.serverId = item.id;
        card.classList.toggle('is-purchased', item.purchased === true);

        const price = document.createElement('p');
        price.classList.add('price');
        price.textContent = `${Number(item.price).toLocaleString('uk-UA')} грн`;

        const status = document.createElement('p');
        status.classList.add('purchase-status');
        status.textContent = item.purchased === true ? 'Вже придбано' : 'Ще не придбано';

        card.append(price, status);
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

// Завантажує бажання з власного Node.js-сервера (GET /api/wishes) і виводить їх у DOM;
// помилки обробляються окремо для HTTP та мережі
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

// Рахує загальну вартість усіх бажань циклом for
function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

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

// Перевіряє, чи ціна не перевищує бюджет (стрілкова функція)
const withinBudget = (price, budget) => price <= budget;

// Звіт практичної №6 у консоль; викликається після завантаження даних зі сховища
function logWishesReport() {
    console.log('Кількість бажань:', wishes.length);
    console.log(wishes);

    const totalPrice = calculateTotal(wishes);
    console.log(`Загальна вартість ${wishes.length} бажань: ${totalPrice} грн`);

    const highCount = markHighPriority(wishes);
    const highLabel = highCount > 0 ? 'є' : 'немає';
    console.log(`Бажань із високим пріоритетом: ${highCount} (${highLabel})`);

    const budget = 3000;
    console.log(`Бюджет: ${budget} грн`);

    for (const wish of wishes) {
        const fits = withinBudget(wish.price, budget);
        console.log(`${wish.title}: ${fits ? 'вкладається в бюджет' : 'перевищує бюджет'}`);
    }
}

// Запуск: визначаємо маршрут за адресою (практична №13), відкриваємо сховище й наповнюємо список (практична №11)
renderRoute();
initStorage();