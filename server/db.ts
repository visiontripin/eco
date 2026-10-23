import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'podrabotka.sqlite');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function formatOffsetDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      currency_code TEXT NOT NULL DEFAULT 'RUB',
      currency_symbol TEXT NOT NULL DEFAULT '₽',
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      locale TEXT NOT NULL DEFAULT 'ru-RU',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_id INTEGER NOT NULL REFERENCES regions(id),
      area_type TEXT NOT NULL DEFAULT 'moscow',
      city_name TEXT NOT NULL,
      station_name TEXT NOT NULL,
      line_name TEXT NOT NULL,
      line_color TEXT NOT NULL DEFAULT '#D82376',
      lat REAL NOT NULL DEFAULT 55.7558,
      lng REAL NOT NULL DEFAULT 37.6173
    );

    CREATE TABLE IF NOT EXISTS tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      target_role TEXT NOT NULL,
      price_rub INTEGER NOT NULL DEFAULT 0,
      limit_value INTEGER,
      description TEXT NOT NULL DEFAULT '',
      perks_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL DEFAULT 'demo1234',
      role TEXT NOT NULL DEFAULT 'worker',
      name TEXT NOT NULL,
      company_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT 'Москва',
      metro_station TEXT NOT NULL DEFAULT 'Автозаводская',
      skills_json TEXT NOT NULL DEFAULT '[]',
      has_med_book INTEGER NOT NULL DEFAULT 0,
      is_self_employed INTEGER NOT NULL DEFAULT 0,
      night_shifts_ok INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      tariff_slug TEXT NOT NULL DEFAULT 'worker_free',
      earned_total INTEGER NOT NULL DEFAULT 0,
      shifts_completed INTEGER NOT NULL DEFAULT 0,
      show_up_rate INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL REFERENCES users(id),
      region_id INTEGER NOT NULL DEFAULT 1 REFERENCES regions(id),
      area_type TEXT NOT NULL DEFAULT 'moscow',
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Москва',
      metro_station TEXT NOT NULL,
      metro_color TEXT NOT NULL DEFAULT '#2DBE2C',
      walk_minutes INTEGER NOT NULL DEFAULT 7,
      address TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_hours REAL NOT NULL DEFAULT 8,
      pay_amount INTEGER NOT NULL,
      currency_symbol TEXT NOT NULL DEFAULT '₽',
      payout_type TEXT NOT NULL DEFAULT 'sbp_instant',
      slots_total INTEGER NOT NULL DEFAULT 3,
      slots_filled INTEGER NOT NULL DEFAULT 0,
      experience_required INTEGER NOT NULL DEFAULT 0,
      med_book_required INTEGER NOT NULL DEFAULT 0,
      smz_preferred INTEGER NOT NULL DEFAULT 0,
      meal_included INTEGER NOT NULL DEFAULT 0,
      is_urgent INTEGER NOT NULL DEFAULT 0,
      is_promoted INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      requirements_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cover_note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      payout_recorded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(job_id, worker_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      application_id INTEGER,
      author_id INTEGER NOT NULL REFERENCES users(id),
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      author_role TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      punctuality_ok INTEGER NOT NULL DEFAULT 1,
      paid_on_time INTEGER NOT NULL DEFAULT 1,
      comment TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      target_tab TEXT NOT NULL DEFAULT 'cabinet',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const existingRegions = db.prepare('SELECT COUNT(*) as c FROM regions').get() as { c: number };
  if (existingRegions.c > 0) {
    return;
  }

  seedInitialData();
}

function seedInitialData() {
  // 1. Regions: Moscow & Moscow Oblast active right now + International hubs ready in DB
  const insertRegion = db.prepare(`
    INSERT INTO regions (country_code, country_name, slug, name, currency_code, currency_symbol, timezone, locale, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRegion.run('RU', 'Россия', 'moscow-and-mo', 'Москва и Московская область', 'RUB', '₽', 'Europe/Moscow', 'ru-RU', 1, 1);
  insertRegion.run('RU', 'Россия', 'spb-and-lo', 'Санкт-Петербург и ЛО', 'RUB', '₽', 'Europe/Moscow', 'ru-RU', 0, 2);
  insertRegion.run('BY', 'Беларусь', 'minsk', 'Минск и Минская область', 'BYN', 'Br', 'Europe/Minsk', 'ru-BY', 0, 3);
  insertRegion.run('KZ', 'Казахстан', 'almaty', 'Алматы и агломерация', 'KZT', '₸', 'Asia/Almaty', 'ru-KZ', 0, 4);
  insertRegion.run('UZ', 'Узбекистан', 'tashkent', 'Ташкент', 'UZS', 'сум', 'Asia/Tashkent', 'ru-UZ', 0, 5);
  insertRegion.run('AE', 'ОАЭ', 'dubai', 'Dubai & UAE', 'AED', 'AED', 'Asia/Dubai', 'en-AE', 0, 6);

  // 2. Locations (Moscow Metro lines & Moscow Oblast MCD / Cities)
  const insertLoc = db.prepare(`
    INSERT INTO locations (region_id, area_type, city_name, station_name, line_name, line_color, lat, lng)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `);

  const mskLocations: [string, string, string, string, string, number, number][] = [
    ['moscow', 'Москва', 'Автозаводская', 'Замоскворецкая (2)', '#2DBE2C', 55.7066, 37.6570],
    ['moscow', 'Москва', 'Курская', 'Кольцевая / АПЛ (5)', '#8D5B2D', 55.7585, 37.6598],
    ['moscow', 'Москва', 'Деловой центр', 'Москва-Сити (4А)', '#00BFFF', 55.7491, 37.5395],
    ['moscow', 'Москва', 'Павелецкая', 'Замоскворецкая (2)', '#2DBE2C', 55.7297, 37.6389],
    ['moscow', 'Москва', 'Тушинская', 'Таганско-Краснопресненская (7)', '#943E90', 55.8267, 37.4368],
    ['moscow', 'Москва', 'Марьино', 'Люблинско-Дмитровская (10)', '#99CC00', 55.6497, 37.7442],
    ['moscow', 'Москва', 'Комсомольская', 'Сокольническая (1)', '#EF161E', 55.7753, 37.6549],
    ['moscow', 'Москва', 'Отрадное', 'Серпуховско-Тимирязевская (9)', '#999999', 55.8642, 37.6047],
    ['mo', 'Химки (МО)', 'МЦД Химки', 'МЦД-3', '#E95420', 55.8944, 37.4513],
    ['mo', 'Красногорск (МО)', 'Мякинино / МЦД Павшино', 'АПЛ / МЦД-2', '#0078BE', 55.8233, 37.3845],
    ['mo', 'Мытищи (МО)', 'ст. Мытищи', 'Ярославское напр.', '#0088CC', 55.9105, 37.7616],
    ['mo', 'Люберцы (МО)', 'МЦД Люберцы-1', 'МЦД-3', '#E95420', 55.6766, 37.8981],
    ['mo', 'Одинцово (МО)', 'МЦД Одинцово', 'МЦД-1', '#F6A600', 55.6725, 37.2823],
    ['mo', 'Домодедово (МО)', 'ст. Взлётная / Домодедово', 'Павелецкое напр.', '#2DBE2C', 55.4412, 37.7675],
  ];
  for (const loc of mskLocations) {
    insertLoc.run(...loc);
  }

  // 3. Tariffs (exact 4 plans from user's Screenshot 4 + clear value props)
  const insertTariff = db.prepare(`
    INSERT INTO tariffs (slug, title, target_role, price_rub, limit_value, description, perks_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTariff.run(
    'worker_free',
    'Бесплатный',
    'worker',
    0,
    5,
    'Базовый доступ к сменам в Москве и МО для быстрого старта',
    JSON.stringify(['До 5 откликов в день', 'Прямые контакты после принятия', 'Публичный рейтинг и отзывы'])
  );
  insertTariff.run(
    'worker_pro',
    'Про',
    'worker',
    299,
    null,
    'Приоритетный показ анкеты работодателям и безлимитные отклики',
    JSON.stringify(['Безлимит откликов в день', 'Анкета выше в списке кандидатов', 'Мгновенные пуш-уведомления о срочных сменах'])
  );
  insertTariff.run(
    'employer_start',
    'Старт',
    'employer',
    0,
    1,
    'Для разового поиска помощников и проверки сервиса',
    JSON.stringify(['1 активная вакансия одновременно', 'Доступ к рейтингам и проверке СМЗ/медкнижки', 'Чат с откликнувшимися'])
  );
  insertTariff.run(
    'employer_business',
    'Бизнес',
    'employer',
    1990,
    20,
    'Массовый набор сменного персонала с приоритетным выделением',
    JSON.stringify(['До 20 активных вакансий', 'Бейдж «Срочно / Топ-смена» в выдаче', 'Быстрое клонирование смен и командный набор'])
  );

  // 4. Users (Starting with Златов Влас from Screenshot 3 + Employers, Candidates & Moderator)
  const insertUser = db.prepare(`
    INSERT INTO users (
      email, password, role, name, company_name, phone, bio, city, metro_station,
      skills_json, has_med_book, is_self_employed, night_shifts_ok, is_verified,
      tariff_slug, earned_total, shifts_completed, show_up_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // User #1: Златов Влас (Primary Worker account matching Screenshot 3)
  insertUser.run(
    'onedopea@gmail.com',
    'demo1234',
    'worker',
    'Златов Влас',
    '',
    '88005553535',
    'Пунктуальный и ответственный исполнитель. Быстро включаюсь в процессы на складе, доставке и мероприятиях, всегда на связи за 2 часа до начала смены.',
    'Москва',
    'Автозаводская',
    JSON.stringify(['Склад', 'Курьер', 'Мероприятия', 'Промоутер']),
    1,
    1,
    1,
    1,
    'worker_free',
    9400,
    2,
    100
  );

  // User #2: Primary Employer account for testing Employer Cabinet seamlessly
  insertUser.run(
    'hr@darkstore-msk.ru',
    'demo1234',
    'employer',
    'Илья Громов',
    'Экспресс-Даркстор МСК',
    '+7 (495) 740-18-92',
    'Сеть городских дарксторов и мини-складов в Москве и Химках. Чистые тёплые помещения, понятные задания и мгновенная выплата по СБП сразу после сдачи смены.',
    'Москва',
    'Автозаводская',
    JSON.stringify(['Склад', 'Курьер', 'Грузчик']),
    0,
    0,
    1,
    1,
    'employer_business',
    0,
    46,
    99
  );

  // User #3: Second Verified Employer (Events & HoReCa)
  insertUser.run(
    'staff@stolica-expo.ru',
    'demo1234',
    'employer',
    'Анна Соколова',
    'Столица Экспо & Кейтеринг',
    '+7 (495) 912-44-10',
    'Обслуживание деловых форумов, выставок в Москва-Сити, Гостином Дворе и Крокус Экспо. Бесплатное питание на площадке и форма от организатора.',
    'Москва',
    'Деловой центр',
    JSON.stringify(['Мероприятия', 'Официант', 'Промоутер']),
    0,
    0,
    0,
    1,
    'employer_business',
    0,
    31,
    98
  );

  // User #4: Third Verified Employer (MO & Construction/Cleaning/Fulfillment)
  insertUser.run(
    'sklad@kovalev-log.ru',
    'demo1234',
    'employer',
    'Дмитрий Ковалёв',
    'Атлант Логистик МО',
    '+7 (499) 322-77-05',
    'Крупные логопарки в Люберцах, Мытищах, Одинцово и Домодедово. Корпоративный шаттл от МЦД, спецодежда выдаётся на КПП.',
    'Люберцы (МО)',
    'МЦД Люберцы-1',
    JSON.stringify(['Грузчик', 'Склад', 'Уборка', 'Стройка']),
    0,
    0,
    1,
    1,
    'employer_business',
    0,
    24,
    97
  );

  // User #5: Experienced Worker candidate in Employer #2's queue
  insertUser.run(
    'artem.smirnov@mail.ru',
    'demo1234',
    'worker',
    'Артём Смирнов',
    '',
    '+7 (916) 442-19-83',
    'Опыт комплектации с ТСД более 1.5 лет (Ozon, Яндекс Лавка). Медкнижка действующая, оформлена самозанятость.',
    'Москва',
    'Павелецкая',
    JSON.stringify(['Склад', 'Грузчик', 'Курьер']),
    1,
    1,
    1,
    1,
    'worker_pro',
    84500,
    18,
    100
  );

  // User #6: Second Worker candidate in Employer #2's queue
  insertUser.run(
    'maria.kuz@yandex.ru',
    'demo1234',
    'worker',
    'Мария Кузнецова',
    '',
    '+7 (926) 805-61-27',
    'Аккуратная сборка заказов, промо-акции и выкладка товара. Живу в Химках рядом с МЦД.',
    'Химки (МО)',
    'МЦД Химки',
    JSON.stringify(['Склад', 'Промоутер', 'Уборка']),
    1,
    1,
    0,
    1,
    'worker_free',
    41200,
    9,
    100
  );

  // User #7: Moderator / Admin
  insertUser.run(
    'admin@podrabotka.msk',
    'demo1234',
    'admin',
    'Алексей Морозов',
    'Служба модерации Подработка.МСК',
    '+7 (495) 000-01-01',
    'Модерация отзывов, верификация работодателей и управление тарифной сеткой сервиса.',
    'Москва',
    'Курская',
    '[]',
    0,
    0,
    0,
    1,
    'employer_business',
    0,
    0,
    100
  );

  // 5. Realistic Shifts across Moscow & Moscow Oblast (all 8 categories covered!)
  const today = formatOffsetDate(0);
  const tomorrow = formatOffsetDate(1);
  const dayAfter = formatOffsetDate(2);
  const inThreeDays = formatOffsetDate(3);

  const insertJob = db.prepare(`
    INSERT INTO jobs (
      employer_id, region_id, area_type, title, category, city, metro_station, metro_color,
      walk_minutes, address, shift_date, start_time, end_time, duration_hours, pay_amount,
      currency_symbol, payout_type, slots_total, slots_filled, experience_required,
      med_book_required, smz_preferred, meal_included, is_urgent, is_promoted,
      description, requirements_json
    ) VALUES (
      ?, 1, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      '₽', ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  // Job 1 (Today, Urgent, Warehouse/Darkstore - Employer 2)
  insertJob.run(
    2,
    'moscow',
    'Сборщик онлайн-заказов в тёплый даркстор',
    'Склад',
    'Москва',
    'Автозаводская',
    '#2DBE2C',
    6,
    'ул. Автозаводская, д. 17к1',
    today,
    '15:00',
    '23:00',
    8,
    4800,
    'sbp_instant',
    5,
    3,
    0,
    1,
    1,
    1,
    1,
    1,
    'Сборка продуктовых корзин по мобильному терминалу (ТСД) без тяжёлых паллет. Вводный инструктаж 15 минут на месте, чай/кофе и горячий перекус в комнате отдыха. Выплата по СБП сразу после закрытия смены у старшего смены.',
    JSON.stringify(['Аккуратность и внимательность к срокам годности', 'Желательна медкнижка (или готовность показать справку)', 'Смартфон на Android/iOS'])
  );

  // Job 2 (Today, Urgent, Courier - Employer 2)
  insertJob.run(
    2,
    'moscow',
    'Вело- / пеший курьер на вечерний пик (электровелосипед выдаём)',
    'Курьер',
    'Москва',
    'Павелецкая',
    '#2DBE2C',
    4,
    'Кожевническая ул., д. 8с2',
    today,
    '16:00',
    '22:00',
    6,
    4500,
    'sbp_instant',
    4,
    2,
    0,
    0,
    1,
    0,
    1,
    1,
    'Доставка небольших пакетов в радиусе 1.8 км от даркстора на Павелецкой. Исправный электровелосипед и термосумку выдаём бесплатно перед стартом. Гарантированная минималка даже при 1 заказе в час + 100% чаевых ваши.',
    JSON.stringify(['18+', 'Уверенное знание навигатора', 'Паспорт РФ / ЕАЭС'])
  );

  // Job 3 (Tomorrow, Event/Forum - Employer 3)
  insertJob.run(
    3,
    'moscow',
    'Хелпер регистрации и навигации гостей IT-форума',
    'Мероприятия',
    'Москва',
    'Деловой центр',
    '#00BFFF',
    5,
    'Пресненская наб., д. 12 (Башня Федерация)',
    tomorrow,
    '08:30',
    '18:30',
    10,
    5500,
    'smz_card',
    8,
    5,
    0,
    0,
    1,
    1,
    1,
    1,
    'Встреча участников конференции у стойки аккредитации, сканирование QR-билетов, выдача бейджей и навигация по залам. Двухразовое горячее питание и фирменное поло предоставляются.',
    JSON.stringify(['Грамотная устная речь и доброжелательность', 'Чёрные классические брюки и чистая тёмная обувь', 'Самозанятость приветствуется (+компенсация налога 6%)'])
  );

  // Job 4 (Today, Loader Moscow - Employer 4)
  insertJob.run(
    4,
    'moscow',
    'Грузчик-разнорабочий на разгрузку шоурума мебели',
    'Грузчик',
    'Москва',
    'Курская',
    '#8D5B2D',
    8,
    'Нижняя Сыромятническая ул., д. 10 (Artplay)',
    today,
    '14:00',
    '20:00',
    6,
    4200,
    'cash_end_shift',
    3,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    'Разгрузка двух малотоннажных фургонов с дизайнерскими стульями и светильниками, подъём на грузовом лифте на 2 этаж, распаковка и вынос картона в контейнер. Расчёт наличными или переводом сразу в 20:00.',
    JSON.stringify(['Физическая выносливость (коробки до 20 кг)', 'Перчатки и тележки рохли на объекте'])
  );

  // Job 5 (Tomorrow, MO Khimki Warehouse - Employer 2)
  insertJob.run(
    2,
    'mo',
    'Маркировщик одежды и аксессуаров (сидячая/стоячая смена)',
    'Склад',
    'Химки (МО)',
    'МЦД Химки',
    '#E95420',
    10,
    'г. Химки, Ленинградская ул., стр. 25',
    tomorrow,
    '09:00',
    '20:00',
    11,
    5600,
    'sbp_instant',
    6,
    4,
    0,
    0,
    1,
    1,
    0,
    0,
    'Наклейка этикеток «Честный знак» и проверка целостности упаковки лёгкого текстиля на чистом светлом складе класса А. Без тяжёлых грузов, комфортная температура +21°C.',
    JSON.stringify(['Без опыта — покажем за 10 минут', 'Паспорт для оформления пропуска на КПП'])
  );

  // Job 6 (Tomorrow, Waiter Banquet - Employer 3)
  insertJob.run(
    3,
    'moscow',
    'Официант банкетной линии (фуршет в лофте)',
    'Официант',
    'Москва',
    'Тушинская',
    '#943E90',
    9,
    'Волоколамское ш., д. 88',
    tomorrow,
    '14:00',
    '23:00',
    9,
    5800,
    'cash_end_shift',
    6,
    3,
    1,
    1,
    0,
    1,
    0,
    0,
    'Сервировка фуршетных столов, вынос закусок и напитков, поддержание чистоты в зале на закрытом корпоративном вечере на 90 гостей. Вечерний развоз до метро и питание включены.',
    JSON.stringify(['Опыт на банкетах или в кафе от 3 смен', 'Белая рубашка без принтов и тёмный низ'])
  );

  // Job 7 (Tomorrow, Krasnogorsk MO Expo Promoter - Employer 3)
  insertJob.run(
    3,
    'mo',
    'Промоутер-консультант на выставку в Крокус Экспо',
    'Промоутер',
    'Красногорск (МО)',
    'Мякинино / МЦД Павшино',
    '#0078BE',
    3,
    'г. Красногорск, Международная ул., д. 18 (Павильон 2)',
    tomorrow,
    '10:00',
    '18:00',
    8,
    4600,
    'sbp_instant',
    4,
    2,
    0,
    0,
    1,
    1,
    0,
    0,
    'Раздача каталогов у стенда российского бренда кофемашин, приглашение посетителей на дегустацию эспрессо. Прямой выход из метро Мякинино в тёплый переход павильона.',
    JSON.stringify(['Активность и улыбчивость', 'Возраст 18+'])
  );

  // Job 8 (Day after tomorrow, Lyubertsy MO Fulfillment - Employer 4)
  insertJob.run(
    4,
    'mo',
    'Комплектовщик маркетплейсов (дневная смена + шаттл)',
    'Склад',
    'Люберцы (МО)',
    'МЦД Люберцы-1',
    '#E95420',
    12,
    'г. Люберцы, Новорязанское ш., логопарк «Восток»',
    dayAfter,
    '08:00',
    '20:00',
    12,
    6400,
    'sbp_instant',
    10,
    6,
    0,
    0,
    1,
    1,
    0,
    1,
    'Комплектация заказов бытовой техники и товаров для дома по сканеру. Бесплатный автобус от МЦД Люберцы-1 в 07:35, комплексный обед в столовой за счёт компании.',
    JSON.stringify(['Готовность к активной смене на ногах', 'Удобная закрытая обувь'])
  );

  // Job 9 (Day after tomorrow, Cleaning Moscow - Employer 4)
  insertJob.run(
    4,
    'moscow',
    'Клинер после съёмочного дня в фотостудии',
    'Уборка',
    'Москва',
    'Марьино',
    '#99CC00',
    7,
    'Люблинская ул., д. 157',
    dayAfter,
    '09:00',
    '15:00',
    6,
    3600,
    'cash_end_shift',
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'Влажная уборка двух светлых залов фотостудии (220 м²), протирка зеркал и гримёрных столов. Весь профессиональный инвентарь Karcher и гипоаллергенная химия на месте.',
    JSON.stringify(['Опыт поддерживающей или послестроительной уборки приветствуется'])
  );

  // Job 10 (In 3 days, Construction Helper Odintsovo MO - Employer 4)
  insertJob.run(
    4,
    'mo',
    'Подсобный рабочий на чистовую отделку бизнес-центра',
    'Стройка',
    'Одинцово (МО)',
    'МЦД Одинцово',
    '#F6A600',
    9,
    'г. Одинцово, Можайское ш., д. 71',
    inThreeDays,
    '08:30',
    '18:30',
    10,
    6200,
    'cash_end_shift',
    5,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    'Помощь мастерам-монтажникам стеклянных офисных перегородок: подача профиля, уборка защитной плёнки, перенос инструмента. Чистое сухое отапливаемое помещение.',
    JSON.stringify(['Соблюдение техники безопасности', 'Каска и жилет выдаются на объекте'])
  );

  // Job 11 (Today, Mytishchi MO - Employer 4)
  insertJob.run(
    4,
    'mo',
    'Грузчик-комплектовщик в пекарню-цех (вечер)',
    'Грузчик',
    'Мытищи (МО)',
    'ст. Мытищи',
    '#0088CC',
    8,
    'г. Мытищи, Олимпийский пр-т, д. 29',
    today,
    '17:00',
    '23:00',
    6,
    4100,
    'sbp_instant',
    3,
    2,
    0,
    1,
    0,
    1,
    1,
    0,
    'Формирование лотков со свежей выпечкой по маршрутам утренней доставки и погрузка в изотермические фургоны. Свежая выпечка с собой после смены + оплата сразу на карту.',
    JSON.stringify(['Действующая медкнижка', 'Без вредных привычек'])
  );

  // Job 12 (In 3 days, Komsomolskaya Moscow Promoter - Employer 3)
  insertJob.run(
    3,
    'moscow',
    'Бариста-помощник / дегустатор на открытие кофейни',
    'Официант',
    'Москва',
    'Комсомольская',
    '#EF161E',
    5,
    'Краснопрудная ул., д. 12',
    inThreeDays,
    '10:00',
    '19:00',
    9,
    5100,
    'smz_card',
    2,
    1,
    0,
    1,
    1,
    1,
    0,
    0,
    'Помощь старшему бариста в день праздничного открытия: выдача фильтр-кофе и круассанов по купонам, поддержание чистоты станции выдачи.',
    JSON.stringify(['Медкнижка', 'Дружелюбная подача'])
  );

  // 6. Seed realistic Applications & Messages so Worker (#1) and Employer (#2) immediately have live workflows!
  const insertApp = db.prepare(`
    INSERT INTO applications (job_id, worker_id, cover_note, status, payout_recorded)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMsg = db.prepare(`
    INSERT INTO messages (application_id, sender_id, body)
    VALUES (?, ?, ?)
  `);

  // App 1: Златов Влас (#1) completed a previous shift at Stolica Expo (#3, Job 3 type) & earned 5500 + active accepted shift on Job 7!
  insertApp.run(3, 1, 'Работал на регистрации в Экспоцентре, буду вовремя за 15 минут до начала.', 'completed', 1);
  insertMsg.run(1, 3, 'Влас, спасибо за отличную работу на стойке аккредитации! Выплата отправлена по СБП.');
  insertMsg.run(1, 1, 'Анна, спасибо! Выплата пришла моментально, буду рад выйти снова.');

  // App 2: Златов Влас (#1) has an active confirmed shift tomorrow on Job 7 (Крокус Экспо)
  insertApp.run(7, 1, 'Живу на синей ветке, самозанятость оформлена, готов на весь день.', 'accepted', 0);
  insertMsg.run(2, 3, 'Вы подтверждены в команду! Встречаемся у входа в Павильон 2 в 09:45, куратор Денис.');

  // App 3: Артём Смирнов (#5) applied to Employer #2's Job 1 (Pending — ready for Employer #2 to Accept in 1 click!)
  insertApp.run(1, 5, 'Опыт с ТСД 1.5 года, медкнижка и СМЗ на руках. Могу быть на Автозаводской уже в 14:40!', 'pending', 0);
  insertMsg.run(3, 5, 'Добрый день! Подскажите, вход со стороны 2-го Автозаводского проезда?');

  // App 4: Мария Кузнецова (#6) applied to Employer #2's Job 5 in Khimki (Accepted — ready to test "Завершить смену и оценить"!)
  insertApp.run(5, 6, 'Живу в 10 минутах от склада в Химках, выходила на маркировку текстиля.', 'accepted', 0);
  insertMsg.run(4, 2, 'Мария, ждём вас на КПП №2, пропуск заказан на ваше ФИО.');

  // App 5: Артём Смирнов (#5) also completed a shift on Job 2 with Employer #2
  insertApp.run(2, 5, 'Готов на вечерний слот.', 'completed', 1);

  // Favorites for Worker #1
  db.prepare('INSERT INTO favorites (user_id, job_id) VALUES (?, ?)').run(1, 1);
  db.prepare('INSERT INTO favorites (user_id, job_id) VALUES (?, ?)').run(1, 8);

  // 7. Approved + Pending Moderation Reviews (for honest live ratings AND real items in Admin Moderation Queue!)
  const insertReview = db.prepare(`
    INSERT INTO reviews (
      job_id, application_id, author_id, target_user_id, author_role,
      rating, punctuality_ok, paid_on_time, comment, moderation_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Approved mutual reviews
  insertReview.run(
    3,
    1,
    3,
    1,
    'employer',
    5,
    1,
    1,
    'Влас приехал за 20 минут до начала смены, быстро разобрался со сканером билетов, вежливо общался с гостями форума. Рекомендуем!',
    'approved'
  );
  insertReview.run(
    3,
    1,
    1,
    3,
    'worker',
    5,
    1,
    1,
    'Чёткая организация смены в Москва-Сити, покормили горячим обедом, оплату с компенсацией налога СМЗ перевели в тот же вечер.',
    'approved'
  );
  insertReview.run(
    2,
    5,
    5,
    2,
    'worker',
    5,
    1,
    1,
    'Электровелосипед выдали с полностью заряженной батареей, радиус доставки небольшой, перевод по СБП пришёл через 5 минут после сдачи сумки.',
    'approved'
  );
  insertReview.run(
    2,
    5,
    2,
    5,
    'employer',
    5,
    1,
    1,
    'Артём закрыл 19 доставок за вечер без единого опоздания. Отличный курьер, всегда ждём на смены!',
    'approved'
  );
  insertReview.run(
    8,
    null,
    5,
    4,
    'worker',
    5,
    1,
    1,
    'Шаттл от МЦД Люберцы пришёл по расписанию, на складе тепло, бригадир адекватный. Деньги перевели в конце смены.',
    'approved'
  );
  insertReview.run(
    5,
    null,
    2,
    6,
    'employer',
    5,
    1,
    1,
    'Мария промаркировала 640 единиц без единого брака. Очень аккуратный исполнитель.',
    'approved'
  );

  // 2 Pending Reviews waiting in Admin Moderation Queue ("Отзывы на модерации (2)")!
  insertReview.run(
    1,
    null,
    6,
    2,
    'worker',
    5,
    1,
    1,
    'Чистый даркстор на Автозаводской, нет штрафов «из воздуха», старший смены помог в первый час с ТСД.',
    'pending'
  );
  insertReview.run(
    4,
    null,
    1,
    4,
    'worker',
    4,
    1,
    1,
    'Заплатили ровно 4 200 ₽ сразу в 20:00 наличными, как в описании. Минус звезда только за ожидание пропуска на въезде 15 минут.',
    'pending'
  );

  // 8. Seed Live Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, target_tab, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    1,
    'status',
    'Вы приняты на смену в Красногорске!',
    'Столица Экспо & Кейтеринг подтвердила ваш выход на смену «Промоутер-консультант на выставку в Крокус Экспо» (4 600 ₽).',
    'cabinet',
    0
  );
  insertNotif.run(
    1,
    'review',
    'Новый отзыв 5★ в вашем профиле',
    'Анна Соколова оценила вашу работу на IT-форуме в Москва-Сити на 5.0.',
    'profile',
    0
  );
  insertNotif.run(
    2,
    'application',
    'Новый отклик: Артём Смирнов (5.0 ★)',
    'Кандидат с тарифом Про откликнулся на смену «Сборщик онлайн-заказов в тёплый даркстор» (м. Автозаводская).',
    'cabinet',
    0
  );
  insertNotif.run(
    7,
    'review',
    '2 отзыва ожидают модерации',
    'Проверьте новые отзывы работников перед публикацией в рейтинге работодателей.',
    'admin',
    0
  );
}
