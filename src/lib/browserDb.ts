const memoryStore = new Map<string, string>();

export function safeGetStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function safeSetStorage(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError in Android content:// HTML Viewer — memoryStore keeps full session state
  }
}

const DB_KEY = 'podrabotka_msk_standalone_db_v1';

function formatOffsetDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createInitialState() {
  const today = formatOffsetDate(0);
  const tomorrow = formatOffsetDate(1);
  const dayAfter = formatOffsetDate(2);
  const inThreeDays = formatOffsetDate(3);

  return {
    regions: [
      { id: 1, country_code: 'RU', country_name: 'Россия', slug: 'moscow-and-mo', name: 'Москва и Московская область', currency_code: 'RUB', currency_symbol: '₽', timezone: 'Europe/Moscow', locale: 'ru-RU', is_active: 1, sort_order: 1 },
      { id: 2, country_code: 'RU', country_name: 'Россия', slug: 'spb-and-lo', name: 'Санкт-Петербург и ЛО', currency_code: 'RUB', currency_symbol: '₽', timezone: 'Europe/Moscow', locale: 'ru-RU', is_active: 0, sort_order: 2 },
      { id: 3, country_code: 'BY', country_name: 'Беларусь', slug: 'minsk', name: 'Минск и Минская область', currency_code: 'BYN', currency_symbol: 'Br', timezone: 'Europe/Minsk', locale: 'ru-BY', is_active: 0, sort_order: 3 },
      { id: 4, country_code: 'KZ', country_name: 'Казахстан', slug: 'almaty', name: 'Алматы и агломерация', currency_code: 'KZT', currency_symbol: '₸', timezone: 'Asia/Almaty', locale: 'ru-KZ', is_active: 0, sort_order: 4 },
      { id: 5, country_code: 'UZ', country_name: 'Узбекистан', slug: 'tashkent', name: 'Ташкент', currency_code: 'UZS', currency_symbol: 'сум', timezone: 'Asia/Tashkent', locale: 'ru-UZ', is_active: 0, sort_order: 5 },
      { id: 6, country_code: 'AE', country_name: 'ОАЭ', slug: 'dubai', name: 'Dubai & UAE', currency_code: 'AED', currency_symbol: 'AED', timezone: 'Asia/Dubai', locale: 'en-AE', is_active: 0, sort_order: 6 },
    ],
    locations: [
      { id: 1, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Автозаводская', line_name: 'Замоскворецкая (2)', line_color: '#2DBE2C', lat: 55.7066, lng: 37.657 },
      { id: 2, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Курская', line_name: 'Кольцевая / АПЛ (5)', line_color: '#8D5B2D', lat: 55.7585, lng: 37.6598 },
      { id: 3, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Деловой центр', line_name: 'Москва-Сити (4А)', line_color: '#00BFFF', lat: 55.7491, lng: 37.5395 },
      { id: 4, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Павелецкая', line_name: 'Замоскворецкая (2)', line_color: '#2DBE2C', lat: 55.7297, lng: 37.6389 },
      { id: 5, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Тушинская', line_name: 'Таганско-Краснопресненская (7)', line_color: '#943E90', lat: 55.8267, lng: 37.4368 },
      { id: 6, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Марьино', line_name: 'Люблинско-Дмитровская (10)', line_color: '#99CC00', lat: 55.6497, lng: 37.7442 },
      { id: 7, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Комсомольская', line_name: 'Сокольническая (1)', line_color: '#EF161E', lat: 55.7753, lng: 37.6549 },
      { id: 8, region_id: 1, area_type: 'moscow', city_name: 'Москва', station_name: 'Отрадное', line_name: 'Серпуховско-Тимирязевская (9)', line_color: '#999999', lat: 55.8642, lng: 37.6047 },
      { id: 9, region_id: 1, area_type: 'mo', city_name: 'Химки (МО)', station_name: 'МЦД Химки', line_name: 'МЦД-3', line_color: '#E95420', lat: 55.8944, lng: 37.4513 },
      { id: 10, region_id: 1, area_type: 'mo', city_name: 'Красногорск (МО)', station_name: 'Мякинино / МЦД Павшино', line_name: 'АПЛ / МЦД-2', line_color: '#0078BE', lat: 55.8233, lng: 37.3845 },
      { id: 11, region_id: 1, area_type: 'mo', city_name: 'Мытищи (МО)', station_name: 'ст. Мытищи', line_name: 'Ярославское напр.', line_color: '#0088CC', lat: 55.9105, lng: 37.7616 },
      { id: 12, region_id: 1, area_type: 'mo', city_name: 'Люберцы (МО)', station_name: 'МЦД Люберцы-1', line_name: 'МЦД-3', line_color: '#E95420', lat: 55.6766, lng: 37.8981 },
      { id: 13, region_id: 1, area_type: 'mo', city_name: 'Одинцово (МО)', station_name: 'МЦД Одинцово', line_name: 'МЦД-1', line_color: '#F6A600', lat: 55.6725, lng: 37.2823 },
      { id: 14, region_id: 1, area_type: 'mo', city_name: 'Домодедово (МО)', station_name: 'ст. Взлётная / Домодедово', line_name: 'Павелецкое напр.', line_color: '#2DBE2C', lat: 55.4412, lng: 37.7675 },
    ],
    tariffs: [
      { id: 1, slug: 'worker_free', title: 'Бесплатный', target_role: 'worker', price_rub: 0, limit_value: 5 as number | null, description: 'Базовый доступ к сменам в Москве и МО для быстрого старта', perks: ['До 5 откликов в день', 'Прямые контакты после принятия', 'Публичный рейтинг и отзывы'] },
      { id: 2, slug: 'worker_pro', title: 'Про', target_role: 'worker', price_rub: 299, limit_value: null as number | null, description: 'Приоритетный показ анкеты работодателям и безлимитные отклики', perks: ['Безлимит откликов в день', 'Анкета выше в списке кандидатов', 'Мгновенные пуш-уведомления о срочных сменах'] },
      { id: 3, slug: 'employer_start', title: 'Старт', target_role: 'employer', price_rub: 0, limit_value: 1 as number | null, description: 'Для разового поиска помощников и проверки сервиса', perks: ['1 активная вакансия одновременно', 'Доступ к рейтингам и проверке СМЗ/медкнижки', 'Чат с откликнувшимися'] },
      { id: 4, slug: 'employer_business', title: 'Бизнес', target_role: 'employer', price_rub: 1990, limit_value: 20 as number | null, description: 'Массовый набор сменного персонала с приоритетным выделением', perks: ['До 20 активных вакансий', 'Бейдж «Срочно / Топ-смена» в выдаче', 'Быстрое клонирование смен и командный набор'] },
    ],
    users: [
      { id: 1, email: 'onedopea@gmail.com', password: 'demo1234', role: 'worker', name: 'Златов Влас', company_name: '', phone: '88005553535', bio: 'Пунктуальный и ответственный исполнитель. Быстро включаюсь в процессы на складе, доставке и мероприятиях, всегда на связи за 2 часа до начала смены.', city: 'Москва', metro_station: 'Автозаводская', skills: ['Склад', 'Курьер', 'Мероприятия', 'Промоутер'], has_med_book: true, is_self_employed: true, night_shifts_ok: true, is_verified: true, tariff_slug: 'worker_free', earned_total: 9400, shifts_completed: 2, show_up_rate: 100, created_at: today },
      { id: 2, email: 'hr@darkstore-msk.ru', password: 'demo1234', role: 'employer', name: 'Илья Громов', company_name: 'Экспресс-Даркстор МСК', phone: '+7 (495) 740-18-92', bio: 'Сеть городских дарксторов и мини-складов в Москве и Химках. Чистые тёплые помещения и мгновенная выплата по СБП сразу после сдачи смены.', city: 'Москва', metro_station: 'Автозаводская', skills: ['Склад', 'Курьер', 'Грузчик'], has_med_book: false, is_self_employed: false, night_shifts_ok: true, is_verified: true, tariff_slug: 'employer_business', earned_total: 0, shifts_completed: 46, show_up_rate: 99, created_at: today },
      { id: 3, email: 'staff@stolica-expo.ru', password: 'demo1234', role: 'employer', name: 'Анна Соколова', company_name: 'Столица Экспо & Кейтеринг', phone: '+7 (495) 912-44-10', bio: 'Обслуживание деловых форумов, выставок в Москва-Сити, Гостином Дворе и Крокус Экспо. Бесплатное питание на площадке и форма от организатора.', city: 'Москва', metro_station: 'Деловой центр', skills: ['Мероприятия', 'Официант', 'Промоутер'], has_med_book: false, is_self_employed: false, night_shifts_ok: false, is_verified: true, tariff_slug: 'employer_business', earned_total: 0, shifts_completed: 31, show_up_rate: 98, created_at: today },
      { id: 4, email: 'sklad@kovalev-log.ru', password: 'demo1234', role: 'employer', name: 'Дмитрий Ковалёв', company_name: 'Атлант Логистик МО', phone: '+7 (499) 322-77-05', bio: 'Крупные логопарки в Люберцах, Мытищах, Одинцово и Домодедово. Корпоративный шаттл от МЦД, спецодежда выдаётся на КПП.', city: 'Люберцы (МО)', metro_station: 'МЦД Люберцы-1', skills: ['Грузчик', 'Склад', 'Уборка', 'Стройка'], has_med_book: false, is_self_employed: false, night_shifts_ok: true, is_verified: true, tariff_slug: 'employer_business', earned_total: 0, shifts_completed: 24, show_up_rate: 97, created_at: today },
      { id: 5, email: 'artem.smirnov@mail.ru', password: 'demo1234', role: 'worker', name: 'Артём Смирнов', company_name: '', phone: '+7 (916) 442-19-83', bio: 'Опыт комплектации с ТСД более 1.5 лет (Ozon, Яндекс Лавка). Медкнижка действующая, оформлена самозанятость.', city: 'Москва', metro_station: 'Павелецкая', skills: ['Склад', 'Грузчик', 'Курьер'], has_med_book: true, is_self_employed: true, night_shifts_ok: true, is_verified: true, tariff_slug: 'worker_pro', earned_total: 84500, shifts_completed: 18, show_up_rate: 100, created_at: today },
      { id: 6, email: 'maria.kuz@yandex.ru', password: 'demo1234', role: 'worker', name: 'Мария Кузнецова', company_name: '', phone: '+7 (926) 805-61-27', bio: 'Аккуратная сборка заказов, промо-акции и выкладка товара. Живу в Химках рядом с МЦД.', city: 'Химки (МО)', metro_station: 'МЦД Химки', skills: ['Склад', 'Промоутер', 'Уборка'], has_med_book: true, is_self_employed: true, night_shifts_ok: false, is_verified: true, tariff_slug: 'worker_free', earned_total: 41200, shifts_completed: 9, show_up_rate: 100, created_at: today },
      { id: 7, email: 'admin@podrabotka.msk', password: 'demo1234', role: 'admin', name: 'Алексей Морозов', company_name: 'Служба модерации Подработка.МСК', phone: '+7 (495) 000-01-01', bio: 'Модерация отзывов, верификация работодателей и управление тарифной сеткой сервиса.', city: 'Москва', metro_station: 'Курская', skills: [] as string[], has_med_book: false, is_self_employed: false, night_shifts_ok: false, is_verified: true, tariff_slug: 'employer_business', earned_total: 0, shifts_completed: 0, show_up_rate: 100, created_at: today },
    ],
    jobs: [
      { id: 1, employer_id: 2, region_id: 1, area_type: 'moscow', title: 'Сборщик онлайн-заказов в тёплый даркстор', category: 'Склад', city: 'Москва', metro_station: 'Автозаводская', metro_color: '#2DBE2C', walk_minutes: 6, address: 'ул. Автозаводская, д. 17к1', shift_date: today, start_time: '15:00', end_time: '23:00', duration_hours: 8, pay_amount: 4800, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 5, slots_filled: 3, experience_required: false, med_book_required: true, smz_preferred: true, meal_included: true, is_urgent: true, is_promoted: true, description: 'Сборка продуктовых корзин по мобильному терминалу (ТСД) без тяжёлых паллет. Вводный инструктаж 15 минут на месте, чай/кофе и горячий перекус в комнате отдыха. Выплата по СБП сразу после закрытия смены.', requirements: ['Аккуратность и внимательность к срокам годности', 'Желательна медкнижка (или готовность показать справку)', 'Смартфон на Android/iOS'], status: 'active', created_at: today },
      { id: 2, employer_id: 2, region_id: 1, area_type: 'moscow', title: 'Вело- / пеший курьер на вечерний пик (электровелосипед выдаём)', category: 'Курьер', city: 'Москва', metro_station: 'Павелецкая', metro_color: '#2DBE2C', walk_minutes: 4, address: 'Кожевническая ул., д. 8с2', shift_date: today, start_time: '16:00', end_time: '22:00', duration_hours: 6, pay_amount: 4500, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 4, slots_filled: 2, experience_required: false, med_book_required: false, smz_preferred: true, meal_included: false, is_urgent: true, is_promoted: true, description: 'Доставка небольших пакетов в радиусе 1.8 км от даркстора на Павелецкой. Исправный электровелосипед и термосумку выдаём бесплатно перед стартом. Гарантированная минималка + 100% чаевых ваши.', requirements: ['18+', 'Уверенное знание навигатора', 'Паспорт РФ / ЕАЭС'], status: 'active', created_at: today },
      { id: 3, employer_id: 3, region_id: 1, area_type: 'moscow', title: 'Хелпер регистрации и навигации гостей IT-форума', category: 'Мероприятия', city: 'Москва', metro_station: 'Деловой центр', metro_color: '#00BFFF', walk_minutes: 5, address: 'Пресненская наб., д. 12 (Башня Федерация)', shift_date: tomorrow, start_time: '08:30', end_time: '18:30', duration_hours: 10, pay_amount: 5500, currency_symbol: '₽', payout_type: 'smz_card', slots_total: 8, slots_filled: 5, experience_required: false, med_book_required: false, smz_preferred: true, meal_included: true, is_urgent: true, is_promoted: true, description: 'Встреча участников конференции у стойки аккредитации, сканирование QR-билетов, выдача бейджей и навигация по залам. Двухразовое горячее питание и фирменное поло предоставляются.', requirements: ['Грамотная устная речь и доброжелательность', 'Чёрные классические брюки и чистая тёмная обувь', 'Самозанятость приветствуется (+компенсация налога 6%)'], status: 'active', created_at: today },
      { id: 4, employer_id: 4, region_id: 1, area_type: 'moscow', title: 'Грузчик-разнорабочий на разгрузку шоурума мебели', category: 'Грузчик', city: 'Москва', metro_station: 'Курская', metro_color: '#8D5B2D', walk_minutes: 8, address: 'Нижняя Сыромятническая ул., д. 10 (Artplay)', shift_date: today, start_time: '14:00', end_time: '20:00', duration_hours: 6, pay_amount: 4200, currency_symbol: '₽', payout_type: 'cash_end_shift', slots_total: 3, slots_filled: 1, experience_required: false, med_book_required: false, smz_preferred: false, meal_included: false, is_urgent: true, is_promoted: false, description: 'Разгрузка двух малотоннажных фургонов с дизайнерскими стульями и светильниками, подъём на грузовом лифте на 2 этаж. Расчёт наличными или переводом сразу в 20:00.', requirements: ['Физическая выносливость (коробки до 20 кг)', 'Перчатки и тележки рохли на объекте'], status: 'active', created_at: today },
      { id: 5, employer_id: 2, region_id: 1, area_type: 'mo', title: 'Маркировщик одежды и аксессуаров (сидячая/стоячая смена)', category: 'Склад', city: 'Химки (МО)', metro_station: 'МЦД Химки', metro_color: '#E95420', walk_minutes: 10, address: 'г. Химки, Ленинградская ул., стр. 25', shift_date: tomorrow, start_time: '09:00', end_time: '20:00', duration_hours: 11, pay_amount: 5600, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 6, slots_filled: 4, experience_required: false, med_book_required: false, smz_preferred: true, meal_included: true, is_urgent: false, is_promoted: false, description: 'Наклейка этикеток «Честный знак» и проверка целостности упаковки лёгкого текстиля на чистом светлом складе класса А. Без тяжёлых грузов, комфортная температура +21°C.', requirements: ['Без опыта — покажем за 10 минут', 'Паспорт для оформления пропуска на КПП'], status: 'active', created_at: today },
      { id: 6, employer_id: 3, region_id: 1, area_type: 'moscow', title: 'Официант банкетной линии (фуршет в лофте)', category: 'Официант', city: 'Москва', metro_station: 'Тушинская', metro_color: '#943E90', walk_minutes: 9, address: 'Волоколамское ш., д. 88', shift_date: tomorrow, start_time: '14:00', end_time: '23:00', duration_hours: 9, pay_amount: 5800, currency_symbol: '₽', payout_type: 'cash_end_shift', slots_total: 6, slots_filled: 3, experience_required: true, med_book_required: true, smz_preferred: false, meal_included: true, is_urgent: false, is_promoted: false, description: 'Сервировка фуршетных столов, вынос закусок и напитков на закрытом корпоративном вечере на 90 гостей. Вечерний развоз до метро и питание включены.', requirements: ['Опыт на банкетах или в кафе от 3 смен', 'Белая рубашка без принтов и тёмный низ'], status: 'active', created_at: today },
      { id: 7, employer_id: 3, region_id: 1, area_type: 'mo', title: 'Промоутер-консультант на выставку в Крокус Экспо', category: 'Промоутер', city: 'Красногорск (МО)', metro_station: 'Мякинино / МЦД Павшино', metro_color: '#0078BE', walk_minutes: 3, address: 'г. Красногорск, Международная ул., д. 18 (Павильон 2)', shift_date: tomorrow, start_time: '10:00', end_time: '18:00', duration_hours: 8, pay_amount: 4600, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 4, slots_filled: 2, experience_required: false, med_book_required: false, smz_preferred: true, meal_included: true, is_urgent: false, is_promoted: false, description: 'Раздача каталогов у стенда российского бренда кофемашин, приглашение посетителей на дегустацию эспрессо. Прямой выход из метро Мякинино в тёплый переход павильона.', requirements: ['Активность и улыbчивость', 'Возраст 18+'], status: 'active', created_at: today },
      { id: 8, employer_id: 4, region_id: 1, area_type: 'mo', title: 'Комплектовщик маркетплейсов (дневная смена + шаттл)', category: 'Склад', city: 'Люберцы (МО)', metro_station: 'МЦД Люберцы-1', metro_color: '#E95420', walk_minutes: 12, address: 'г. Люберцы, Новорязанское ш., логопарк «Восток»', shift_date: dayAfter, start_time: '08:00', end_time: '20:00', duration_hours: 12, pay_amount: 6400, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 10, slots_filled: 6, experience_required: false, med_book_required: false, smz_preferred: true, meal_included: true, is_urgent: false, is_promoted: true, description: 'Комплектация заказов бытовой техники и товаров для дома по сканеру. Бесплатный автобус от МЦД Люберцы-1 в 07:35, комплексный обед в столовой за счёт компании.', requirements: ['Готовность к активной смене на ногах', 'Удобная закрытая обувь'], status: 'active', created_at: today },
      { id: 9, employer_id: 4, region_id: 1, area_type: 'moscow', title: 'Клинер после съёмочного дня в фотостудии', category: 'Уборка', city: 'Москва', metro_station: 'Марьино', metro_color: '#99CC00', walk_minutes: 7, address: 'Люблинская ул., д. 157', shift_date: dayAfter, start_time: '09:00', end_time: '15:00', duration_hours: 6, pay_amount: 3600, currency_symbol: '₽', payout_type: 'cash_end_shift', slots_total: 2, slots_filled: 0, experience_required: false, med_book_required: false, smz_preferred: false, meal_included: false, is_urgent: false, is_promoted: false, description: 'Влажная уборка двух светлых залов фотостудии (220 м²), протирка зеркал и гримёрных столов. Весь профессиональный инвентарь Karcher на месте.', requirements: ['Опыт поддерживающей уборки приветствуется'], status: 'active', created_at: today },
      { id: 10, employer_id: 4, region_id: 1, area_type: 'mo', title: 'Подсобный рабочий на чистовую отделку бизнес-центра', category: 'Стройка', city: 'Одинцово (МО)', metro_station: 'МЦД Одинцово', metro_color: '#F6A600', walk_minutes: 9, address: 'г. Одинцово, Можайское ш., д. 71', shift_date: inThreeDays, start_time: '08:30', end_time: '18:30', duration_hours: 10, pay_amount: 6200, currency_symbol: '₽', payout_type: 'cash_end_shift', slots_total: 5, slots_filled: 2, experience_required: false, med_book_required: false, smz_preferred: false, meal_included: false, is_urgent: false, is_promoted: false, description: 'Помощь мастерам-монтажникам стеклянных офисных перегородок: подача профиля, уборка защитной плёнки. Чистое сухое отапливаемое помещение.', requirements: ['Соблюдение техники безопасности', 'Каска и жилет выдаются на объекте'], status: 'active', created_at: today },
      { id: 11, employer_id: 4, region_id: 1, area_type: 'mo', title: 'Грузчик-комплектовщик в пекарню-цех (вечер)', category: 'Грузчик', city: 'Мытищи (МО)', metro_station: 'ст. Мытищи', metro_color: '#0088CC', walk_minutes: 8, address: 'г. Мытищи, Олимпийский пр-т, д. 29', shift_date: today, start_time: '17:00', end_time: '23:00', duration_hours: 6, pay_amount: 4100, currency_symbol: '₽', payout_type: 'sbp_instant', slots_total: 3, slots_filled: 2, experience_required: false, med_book_required: true, smz_preferred: false, meal_included: true, is_urgent: true, is_promoted: false, description: 'Формирование лотков со свежей выпечкой по маршрутам утренней доставки и погрузка в изотермические фургоны. Выпечка с собой + оплата сразу на карту.', requirements: ['Действующая медкнижка', 'Без вредных привычек'], status: 'active', created_at: today },
      { id: 12, employer_id: 3, region_id: 1, area_type: 'moscow', title: 'Бариста-помощник / дегустатор на открытие кофейни', category: 'Официант', city: 'Москва', metro_station: 'Комсомольская', metro_color: '#EF161E', walk_minutes: 5, address: 'Краснопрудная ул., д. 12', shift_date: inThreeDays, start_time: '10:00', end_time: '19:00', duration_hours: 9, pay_amount: 5100, currency_symbol: '₽', payout_type: 'smz_card', slots_total: 2, slots_filled: 1, experience_required: false, med_book_required: true, smz_preferred: true, meal_included: true, is_urgent: false, is_promoted: false, description: 'Помощь старшему бариста в день праздничного открытия: выдача фильтр-кофе и круассанов по купонам, поддержание чистоты станции выдачи.', requirements: ['Медкнижка', 'Дружелюбная подача'], status: 'active', created_at: today },
    ],
    applications: [
      { id: 1, job_id: 3, worker_id: 1, cover_note: 'Работал на регистрации в Экспоцентре, буду вовремя за 15 минут до начала.', status: 'completed', payout_recorded: true, created_at: today, updated_at: today },
      { id: 2, job_id: 7, worker_id: 1, cover_note: 'Живу на синей ветке, самозанятость оформлена, готов на весь день.', status: 'accepted', payout_recorded: false, created_at: today, updated_at: today },
      { id: 3, job_id: 1, worker_id: 5, cover_note: 'Опыт с ТСД 1.5 года, медкнижка и СМЗ на руках. Могу быть на Автозаводской уже в 14:40!', status: 'pending', payout_recorded: false, created_at: today, updated_at: today },
      { id: 4, job_id: 5, worker_id: 6, cover_note: 'Живу в 10 минутах от склада в Химках, выходила на маркировку текстиля.', status: 'accepted', payout_recorded: false, created_at: today, updated_at: today },
      { id: 5, job_id: 2, worker_id: 5, cover_note: 'Готов на вечерний слот.', status: 'completed', payout_recorded: true, created_at: today, updated_at: today },
    ],
    messages: [
      { id: 1, application_id: 1, sender_id: 3, body: 'Влас, спасибо за отличную работу на стойке аккредитации! Выплата отправлена по СБП.', created_at: today },
      { id: 2, application_id: 1, sender_id: 1, body: 'Анна, спасибо! Выплата пришла моментально, буду рад выйти снова.', created_at: today },
      { id: 3, application_id: 2, sender_id: 3, body: 'Вы подтверждены в команду! Встречаемся у входа в Павильон 2 в 09:45, куратор Денис.', created_at: today },
      { id: 4, application_id: 3, sender_id: 5, body: 'Добрый день! Подскажите, вход со стороны 2-го Автозаводского проезда?', created_at: today },
      { id: 5, application_id: 4, sender_id: 2, body: 'Мария, ждём вас на КПП №2, пропуск заказан на ваше ФИО.', created_at: today },
    ],
    favorites: [
      { user_id: 1, job_id: 1 },
      { user_id: 1, job_id: 8 },
    ],
    reviews: [
      { id: 1, job_id: 3, application_id: 1 as number | null, author_id: 3, target_user_id: 1, author_role: 'employer', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Влас приехал за 20 минут до начала смены, быстро разобрался со сканером билетов, вежливо общался с гостями форума. Рекомендуем!', moderation_status: 'approved', created_at: today },
      { id: 2, job_id: 3, application_id: 1 as number | null, author_id: 1, target_user_id: 3, author_role: 'worker', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Чёткая организация смены в Москва-Сити, покормили горячим обедом, оплату с компенсацией налога СМЗ перевели в тот же вечер.', moderation_status: 'approved', created_at: today },
      { id: 3, job_id: 2, application_id: 5 as number | null, author_id: 5, target_user_id: 2, author_role: 'worker', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Электровелосипед выдали с полностью заряженной батареей, перевод по СБП пришёл через 5 минут после сдачи сумки.', moderation_status: 'approved', created_at: today },
      { id: 4, job_id: 2, application_id: 5 as number | null, author_id: 2, target_user_id: 5, author_role: 'employer', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Артём закрыл 19 доставок за вечер без единого опоздания. Отличный курьер!', moderation_status: 'approved', created_at: today },
      { id: 5, job_id: 8, application_id: null, author_id: 5, target_user_id: 4, author_role: 'worker', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Шаттл от МЦД Люберцы пришёл по расписанию, на складе тепло, бригадир адекватный. Деньги перевели в конце смены.', moderation_status: 'approved', created_at: today },
      { id: 6, job_id: 5, application_id: null, author_id: 2, target_user_id: 6, author_role: 'employer', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Мария промаркировала 640 единиц без единого брака. Очень аккуратный исполнитель.', moderation_status: 'approved', created_at: today },
      { id: 7, job_id: 1, application_id: null, author_id: 6, target_user_id: 2, author_role: 'worker', rating: 5, punctuality_ok: true, paid_on_time: true, comment: 'Чистый даркстор на Автозаводской, нет штрафов «из воздуха», старший смены помог в первый час с ТСД.', moderation_status: 'pending', created_at: today },
      { id: 8, job_id: 4, application_id: null, author_id: 1, target_user_id: 4, author_role: 'worker', rating: 4, punctuality_ok: true, paid_on_time: true, comment: 'Заплатили ровно 4 200 ₽ сразу в 20:00 наличными, как в описании. Минус звезда только за ожидание пропуска на въезде 15 минут.', moderation_status: 'pending', created_at: today },
    ],
    notifications: [
      { id: 1, user_id: 1, type: 'status', title: 'Вы приняты на смену в Красногорске!', body: 'Столица Экспо & Кейтеринг подтвердила ваш выход на смену «Промоутер-консультант на выставку в Крокус Экспо» (4 600 ₽).', target_tab: 'cabinet', is_read: false, created_at: today },
      { id: 2, user_id: 1, type: 'review', title: 'Новый отзыв 5★ в вашем профиле', body: 'Анна Соколова оценила вашу работу на IT-форуме в Москва-Сити на 5.0.', target_tab: 'profile', is_read: false, created_at: today },
      { id: 3, user_id: 2, type: 'application', title: 'Новый отклик: Артём Смирнов (5.0 ★)', body: 'Кандидат с тарифом Про откликнулся на смену «Сборщик онлайн-заказов в тёплый даркстор».', target_tab: 'cabinet', is_read: false, created_at: today },
      { id: 4, user_id: 7, type: 'review', title: '2 отзыва ожидают модерации', body: 'Проверьте новые отзывы работников перед публикацией в рейтинге работодателей.', target_tab: 'admin', is_read: false, created_at: today },
    ],
  };
}

type StoreShape = ReturnType<typeof createInitialState>;

function loadStore(): StoreShape {
  const raw = safeGetStorage(DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fall back cleanly if corrupted
    }
  }
  const init = createInitialState();
  safeSetStorage(DB_KEY, JSON.stringify(init));
  return init;
}

function saveStore(store: StoreShape) {
  safeSetStorage(DB_KEY, JSON.stringify(store));
}

function makeErr(message: string, code?: string) {
  const e: any = new Error(message);
  if (code) e.code = code;
  return e;
}

export function dispatchBrowserApi(rawPath: string, options: RequestInit, activeUserId: number): any {
  const store = loadStore();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  const parsedUrl = new URL(rawPath, 'https://podrabotka.msk');
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  const currentUser = store.users.find((u) => u.id === activeUserId) || store.users[0];
  const uid = currentUser.id;
  const todayStr = formatOffsetDate(0);

  const ratingStats = (targetId: number) => {
    const approved = store.reviews.filter(
      (r) => r.target_user_id === targetId && r.moderation_status === 'approved'
    );
    const avg =
      approved.length > 0
        ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10
        : 0;
    return { rating_avg: avg, reviews_count: approved.length };
  };

  const serializeUser = (targetId: number) => {
    const u = store.users.find((x) => x.id === targetId);
    if (!u) return null;
    const tariff = store.tariffs.find((t) => t.slug === u.tariff_slug);
    const { rating_avg, reviews_count } = ratingStats(u.id);
    const todayUsed = store.applications.filter(
      (a) => a.worker_id === u.id && a.status !== 'cancelled' && a.created_at.slice(0, 10) === todayStr
    ).length;
    const activeJobs = store.jobs.filter((j) => j.employer_id === u.id && j.status === 'active').length;

    return {
      ...u,
      tariff_title: tariff ? tariff.title : 'Бесплатный',
      tariff_limit: tariff ? tariff.limit_value : 5,
      today_applications_used: todayUsed,
      active_jobs_used: activeJobs,
      rating_avg,
      reviews_count,
    };
  };

  const platformStats = () => {
    const activeJobs = store.jobs.filter((j) => j.status === 'active');
    const openSlots = activeJobs.reduce((acc, j) => acc + Math.max(0, j.slots_total - j.slots_filled), 0);
    const avgPay =
      activeJobs.length > 0
        ? Math.round(activeJobs.reduce((acc, j) => acc + j.pay_amount, 0) / activeJobs.length)
        : 0;
    return {
      open_jobs_count: activeJobs.length,
      open_slots_count: openSlots,
      avg_shift_pay: avgPay,
      verified_employers_count: store.users.filter((u) => u.role === 'employer' && u.is_verified).length,
      pending_reviews_count: store.reviews.filter((r) => r.moderation_status === 'pending').length,
      total_users_count: store.users.length,
    };
  };

  const serializeJob = (j: any) => {
    const emp = store.users.find((u) => u.id === j.employer_id) || store.users[1];
    const empRat = ratingStats(emp.id);
    const fav = store.favorites.some((f) => f.user_id === uid && f.job_id === j.id);
    const myApp = store.applications.find((a) => a.worker_id === uid && a.job_id === j.id);
    const appsForJob = store.applications.filter((a) => a.job_id === j.id && a.status !== 'cancelled');
    return {
      ...j,
      employer_name: emp.name,
      employer_company: emp.company_name || emp.name,
      employer_verified: Boolean(emp.is_verified),
      employer_rating: empRat.rating_avg,
      employer_reviews_count: empRat.reviews_count,
      is_favorite: fav,
      my_application_id: myApp ? myApp.id : null,
      my_application_status: myApp ? myApp.status : null,
      applications_count: appsForJob.length,
      pending_applications_count: appsForJob.filter((a) => a.status === 'pending').length,
    };
  };

  // --- Routes ---
  if (pathname === '/api/bootstrap' && method === 'GET') {
    return {
      me: serializeUser(uid),
      demoAccounts: store.users
        .filter((u) => [1, 2, 7].includes(u.id))
        .map((u) => ({ id: u.id, name: u.name, company_name: u.company_name, role: u.role, email: u.email })),
      tariffs: store.tariffs,
      locations: store.locations,
      stats: platformStats(),
      notifications: [...store.notifications].filter((n) => n.user_id === uid).reverse(),
    };
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const found = store.users.find(
      (u) => u.email.toLowerCase() === String(body.email || '').trim().toLowerCase()
    );
    if (!found || (body.password && found.password !== String(body.password))) {
      throw makeErr('Неверный email или пароль');
    }
    return { me: serializeUser(found.id) };
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const email = String(body.email || '').trim();
    if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw makeErr('Пользователь с таким email уже зарегистрирован');
    }
    const cleanRole = body.role === 'employer' ? 'employer' : 'worker';
    const nextId = Math.max(0, ...store.users.map((u) => u.id)) + 1;
    store.users.push({
      id: nextId,
      email,
      password: String(body.password || 'demo1234'),
      role: cleanRole,
      name: String(body.name || 'Пользователь').trim(),
      company_name: cleanRole === 'employer' ? String(body.company_name || body.name).trim() : '',
      phone: String(body.phone || '').trim(),
      bio: '',
      city: 'Москва',
      metro_station: 'Автозаводская',
      skills: cleanRole === 'worker' ? ['Склад', 'Курьер'] : [],
      has_med_book: false,
      is_self_employed: false,
      night_shifts_ok: false,
      is_verified: false,
      tariff_slug: cleanRole === 'employer' ? 'employer_start' : 'worker_free',
      earned_total: 0,
      shifts_completed: 0,
      show_up_rate: 100,
      created_at: todayStr,
    });
    store.notifications.push({
      id: Math.max(0, ...store.notifications.map((n) => n.id)) + 1,
      user_id: nextId,
      type: 'system',
      title: 'Добро пожаловать в Подработка.МСК!',
      body: 'Ваш профиль готов к работе в Москве и Московской области.',
      target_tab: 'profile',
      is_read: false,
      created_at: todayStr,
    });
    saveStore(store);
    return { me: serializeUser(nextId) };
  }

  const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch && method === 'GET') {
    const targetId = Number(userMatch[1]);
    const prof = serializeUser(targetId);
    if (!prof) throw makeErr('Профиль не найден');
    const revs = store.reviews
      .filter((r) => r.target_user_id === targetId && r.moderation_status === 'approved')
      .map((r) => {
        const au = store.users.find((u) => u.id === r.author_id);
        const jb = store.jobs.find((j) => j.id === r.job_id);
        return {
          ...r,
          author_name: au?.name || 'Участник',
          author_company: au?.company_name || '',
          job_title: jb?.title || '',
        };
      })
      .reverse();
    const employerJobs =
      prof.role === 'employer'
        ? store.jobs.filter((j) => j.employer_id === targetId && j.status === 'active')
        : [];
    return { profile: prof, reviews: revs, employerJobs };
  }

  if (pathname === '/api/me/profile' && method === 'PUT') {
    const idx = store.users.findIndex((u) => u.id === uid);
    if (idx >= 0) {
      store.users[idx] = {
        ...store.users[idx],
        name: body.name ?? store.users[idx].name,
        company_name: body.company_name ?? store.users[idx].company_name,
        phone: body.phone ?? store.users[idx].phone,
        bio: body.bio ?? store.users[idx].bio,
        city: body.city ?? store.users[idx].city,
        metro_station: body.metro_station ?? store.users[idx].metro_station,
        skills: Array.isArray(body.skills) ? body.skills : store.users[idx].skills,
        has_med_book: body.has_med_book ?? store.users[idx].has_med_book,
        is_self_employed: body.is_self_employed ?? store.users[idx].is_self_employed,
        night_shifts_ok: body.night_shifts_ok ?? store.users[idx].night_shifts_ok,
      };
      saveStore(store);
    }
    return { me: serializeUser(uid) };
  }

  if (pathname === '/api/me/tariff' && method === 'PUT') {
    const tariff = store.tariffs.find((t) => t.slug === body.tariff_slug);
    if (!tariff) throw makeErr('Тариф не найден');
    const u = store.users.find((x) => x.id === uid);
    if (u) {
      u.tariff_slug = tariff.slug;
      store.notifications.push({
        id: Math.max(0, ...store.notifications.map((n) => n.id)) + 1,
        user_id: uid,
        type: 'system',
        title: `Тариф «${tariff.title}» подключён`,
        body: 'Новые лимиты уже действуют в вашем кабинете.',
        target_tab: 'cabinet',
        is_read: false,
        created_at: todayStr,
      });
      saveStore(store);
    }
    return { me: serializeUser(uid) };
  }

  if (pathname === '/api/jobs' && method === 'GET') {
    const empFilter = searchParams.get('employer_id');
    const incInactive = searchParams.get('include_inactive') === '1';
    let list = store.jobs.filter((j) => {
      if (!incInactive && j.status !== 'active') return false;
      if (empFilter && j.employer_id !== Number(empFilter)) return false;
      return true;
    });
    const serialized = list
      .map(serializeJob)
      .sort(
        (a, b) =>
          Number(b.is_promoted) - Number(a.is_promoted) ||
          Number(b.is_urgent) - Number(a.is_urgent) ||
          b.id - a.id
      );
    return { jobs: serialized };
  }

  if (pathname === '/api/jobs' && method === 'POST') {
    const meNow = serializeUser(uid)!;
    if (meNow.role === 'employer' && meNow.tariff_limit !== null && meNow.active_jobs_used >= meNow.tariff_limit) {
      throw makeErr(
        `Достигнут лимит активных вакансий (${meNow.tariff_limit}) на тарифе «${meNow.tariff_title}». Перейдите на тариф «Бизнес».`,
        'TARIFF_LIMIT'
      );
    }
    const loc = store.locations.find((l) => l.station_name === body.metro_station);
    const nextId = Math.max(0, ...store.jobs.map((j) => j.id)) + 1;
    const newJob = {
      id: nextId,
      employer_id: uid,
      region_id: 1,
      area_type: loc ? loc.area_type : body.area_type || 'moscow',
      title: String(body.title).trim(),
      category: String(body.category || 'Склад'),
      city: loc ? loc.city_name : String(body.city || 'Москва'),
      metro_station: String(body.metro_station || 'Автозаводская'),
      metro_color: loc ? loc.line_color : '#D82376',
      walk_minutes: Number(body.walk_minutes) || 7,
      address: String(body.address).trim(),
      shift_date: String(body.shift_date),
      start_time: String(body.start_time || '10:00'),
      end_time: String(body.end_time || '19:00'),
      duration_hours: Number(body.duration_hours) || 9,
      pay_amount: Number(body.pay_amount) || 4500,
      currency_symbol: '₽',
      payout_type: String(body.payout_type || 'sbp_instant'),
      slots_total: Math.max(1, Number(body.slots_total) || 1),
      slots_filled: 0,
      experience_required: Boolean(body.experience_required),
      med_book_required: Boolean(body.med_book_required),
      smz_preferred: Boolean(body.smz_preferred),
      meal_included: Boolean(body.meal_included),
      is_urgent: Boolean(body.is_urgent),
      is_promoted: meNow.tariff_slug === 'employer_business',
      description: String(body.description || 'Смена от проверенного заказчика.'),
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      status: 'active',
      created_at: todayStr,
    };
    store.jobs.push(newJob);
    saveStore(store);
    return { job: serializeJob(newJob), me: serializeUser(uid), stats: platformStats() };
  }

  const jobPatchMatch = pathname.match(/^\/api\/jobs\/(\d+)$/);
  if (jobPatchMatch && method === 'PATCH') {
    const job = store.jobs.find((j) => j.id === Number(jobPatchMatch[1]));
    if (!job) throw makeErr('Вакансия не найдена');
    if (body.status) job.status = body.status;
    saveStore(store);
    return { job: serializeJob(job), me: serializeUser(uid), stats: platformStats() };
  }

  const jobCloneMatch = pathname.match(/^\/api\/jobs\/(\d+)\/clone$/);
  if (jobCloneMatch && method === 'POST') {
    const meNow = serializeUser(uid)!;
    if (meNow.role === 'employer' && meNow.tariff_limit !== null && meNow.active_jobs_used >= meNow.tariff_limit) {
      throw makeErr(`Лимит активных вакансий (${meNow.tariff_limit}) исчерпан.`, 'TARIFF_LIMIT');
    }
    const orig = store.jobs.find((j) => j.id === Number(jobCloneMatch[1]));
    if (!orig) throw makeErr('Смена не найдена');
    const nextId = Math.max(0, ...store.jobs.map((j) => j.id)) + 1;
    const copy = {
      ...orig,
      id: nextId,
      shift_date: formatOffsetDate(1),
      slots_filled: 0,
      status: 'active',
    };
    store.jobs.push(copy);
    saveStore(store);
    return { job: serializeJob(copy), me: serializeUser(uid), stats: platformStats() };
  }

  const favMatch = pathname.match(/^\/api\/jobs\/(\d+)\/favorite$/);
  if (favMatch && method === 'POST') {
    const jid = Number(favMatch[1]);
    const idx = store.favorites.findIndex((f) => f.user_id === uid && f.job_id === jid);
    if (idx >= 0) {
      store.favorites.splice(idx, 1);
      saveStore(store);
      return { is_favorite: false };
    }
    store.favorites.push({ user_id: uid, job_id: jid });
    saveStore(store);
    return { is_favorite: true };
  }

  const applyMatch = pathname.match(/^\/api\/jobs\/(\d+)\/apply$/);
  if (applyMatch && method === 'POST') {
    const meNow = serializeUser(uid)!;
    if (meNow.role !== 'worker') {
      throw makeErr('Переключитесь на роль Рабочего, чтобы откликнуться');
    }
    const jid = Number(applyMatch[1]);
    const job = store.jobs.find((j) => j.id === jid);
    if (!job) throw makeErr('Смена не найдена');

    const existing = store.applications.find((a) => a.job_id === jid && a.worker_id === uid);
    if (existing && existing.status !== 'cancelled') {
      throw makeErr('Вы уже откликнулись на эту подработку');
    }
    if (meNow.tariff_limit !== null && meNow.today_applications_used >= meNow.tariff_limit) {
      throw makeErr(
        `Вы использовали все ${meNow.tariff_limit} бесплатных откликов на сегодня. Подключите тариф «Про» (299 ₽/мес)!`,
        'TARIFF_LIMIT'
      );
    }

    const cover = String(body.cover_note || 'Готов выйти на смену без опозданий!').trim();
    if (existing) {
      existing.status = 'pending';
      existing.cover_note = cover;
    } else {
      store.applications.push({
        id: Math.max(0, ...store.applications.map((a) => a.id)) + 1,
        job_id: jid,
        worker_id: uid,
        cover_note: cover,
        status: 'pending',
        payout_recorded: false,
        created_at: todayStr,
        updated_at: todayStr,
      });
    }
    store.notifications.push({
      id: Math.max(0, ...store.notifications.map((n) => n.id)) + 1,
      user_id: job.employer_id,
      type: 'application',
      title: `Новый отклик: ${meNow.name}`,
      body: `Кандидат откликнулся на смену «${job.title}» (${job.pay_amount} ₽).`,
      target_tab: 'cabinet',
      is_read: false,
      created_at: todayStr,
    });
    saveStore(store);
    return { ok: true, me: serializeUser(uid) };
  }

  if (pathname === '/api/applications' && method === 'GET') {
    const meNow = serializeUser(uid)!;
    const filtered = store.applications.filter((a) => {
      const job = store.jobs.find((j) => j.id === a.job_id);
      if (!job) return false;
      if (meNow.role === 'employer') return job.employer_id === uid;
      if (meNow.role === 'admin') return true;
      return a.worker_id === uid;
    });

    const mapped = filtered
      .map((a) => {
        const job = store.jobs.find((j) => j.id === a.job_id)!;
        const emp = store.users.find((u) => u.id === job.employer_id)!;
        const w = store.users.find((u) => u.id === a.worker_id)!;
        const wRat = ratingStats(w.id);
        const msgs = store.messages
          .filter((m) => m.application_id === a.id)
          .map((m) => {
            const su = store.users.find((u) => u.id === m.sender_id);
            return { ...m, sender_name: su?.name || 'Участник', sender_role: su?.role || 'worker' };
          });
        const hasMyReview = store.reviews.some(
          (r) => r.application_id === a.id && r.author_id === uid
        );

        return {
          ...a,
          job_title: job.title,
          job_category: job.category,
          job_city: job.city,
          job_metro: job.metro_station,
          job_metro_color: job.metro_color,
          job_date: job.shift_date,
          job_start_time: job.start_time,
          job_end_time: job.end_time,
          job_pay_amount: job.pay_amount,
          job_payout_type: job.payout_type,
          employer_id: emp.id,
          employer_name: emp.name,
          employer_company: emp.company_name || emp.name,
          employer_phone: emp.phone,
          employer_verified: emp.is_verified,
          worker_name: w.name,
          worker_phone: w.phone,
          worker_city: w.city,
          worker_metro: w.metro_station,
          worker_skills: w.skills,
          worker_has_med_book: w.has_med_book,
          worker_is_self_employed: w.is_self_employed,
          worker_shifts_completed: w.shifts_completed,
          worker_show_up_rate: w.show_up_rate,
          worker_rating: wRat.rating_avg,
          worker_reviews_count: wRat.reviews_count,
          worker_tariff_slug: w.tariff_slug,
          has_my_review: hasMyReview,
          messages: msgs,
        };
      })
      .sort(
        (a, b) =>
          (a.worker_tariff_slug === 'worker_pro' ? 0 : 1) -
            (b.worker_tariff_slug === 'worker_pro' ? 0 : 1) || b.id - a.id
      );

    return { applications: mapped };
  }

  const appStatusMatch = pathname.match(/^\/api\/applications\/(\d+)\/status$/);
  if (appStatusMatch && method === 'PATCH') {
    const appRow = store.applications.find((a) => a.id === Number(appStatusMatch[1]));
    if (!appRow) throw makeErr('Отклик не найден');
    const job = store.jobs.find((j) => j.id === appRow.job_id)!;
    const st = body.status;

    if (st === 'cancelled') {
      if (appRow.status === 'accepted' && job.slots_filled > 0) job.slots_filled -= 1;
      appRow.status = 'cancelled';
    } else if (st === 'accepted') {
      if (appRow.status !== 'accepted') {
        appRow.status = 'accepted';
        job.slots_filled = Math.min(job.slots_total, job.slots_filled + 1);
      }
    } else if (st === 'rejected') {
      if (appRow.status === 'accepted' && job.slots_filled > 0) job.slots_filled -= 1;
      appRow.status = 'rejected';
    } else if (st === 'completed') {
      const wasPaid = appRow.payout_recorded;
      appRow.status = 'completed';
      appRow.payout_recorded = true;
      if (!wasPaid) {
        const w = store.users.find((u) => u.id === appRow.worker_id);
        const emp = store.users.find((u) => u.id === job.employer_id);
        if (w) {
          w.earned_total += job.pay_amount;
          w.shifts_completed += 1;
        }
        if (emp) emp.shifts_completed += 1;
      }
    }
    saveStore(store);
    return { ok: true, me: serializeUser(uid), stats: platformStats() };
  }

  const appMsgMatch = pathname.match(/^\/api\/applications\/(\d+)\/messages$/);
  if (appMsgMatch && method === 'POST') {
    const aid = Number(appMsgMatch[1]);
    store.messages.push({
      id: Math.max(0, ...store.messages.map((m) => m.id)) + 1,
      application_id: aid,
      sender_id: uid,
      body: String(body.body || '').trim(),
      created_at: todayStr,
    });
    saveStore(store);
    return { ok: true };
  }

  if (pathname === '/api/reviews' && method === 'POST') {
    store.reviews.push({
      id: Math.max(0, ...store.reviews.map((r) => r.id)) + 1,
      job_id: Number(body.job_id),
      application_id: body.application_id ? Number(body.application_id) : null,
      author_id: uid,
      target_user_id: Number(body.target_user_id),
      author_role: currentUser.role,
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      punctuality_ok: Boolean(body.punctuality_ok),
      paid_on_time: Boolean(body.paid_on_time),
      comment: String(body.comment || '').trim(),
      moderation_status: 'pending',
      created_at: todayStr,
    });
    saveStore(store);
    return { ok: true, stats: platformStats() };
  }

  if (pathname === '/api/admin/overview' && method === 'GET') {
    const revs = [...store.reviews]
      .map((r) => {
        const au = store.users.find((u) => u.id === r.author_id);
        const tu = store.users.find((u) => u.id === r.target_user_id);
        const jb = store.jobs.find((j) => j.id === r.job_id);
        return {
          ...r,
          author_name: au?.name || 'Участник',
          author_company: au?.company_name || '',
          target_name: tu?.name || 'Участник',
          target_company: tu?.company_name || '',
          target_role: tu?.role || 'worker',
          job_title: jb?.title || '',
        };
      })
      .sort(
        (a, b) =>
          (a.moderation_status === 'pending' ? 0 : 1) -
            (b.moderation_status === 'pending' ? 0 : 1) || b.id - a.id
      );

    return {
      reviews: revs,
      tariffs: store.tariffs,
      users: store.users.map((u) => serializeUser(u.id)),
      regions: store.regions,
      stats: platformStats(),
    };
  }

  const adminRevMatch = pathname.match(/^\/api\/admin\/reviews\/(\d+)$/);
  if (adminRevMatch && method === 'PATCH') {
    const rev = store.reviews.find((r) => r.id === Number(adminRevMatch[1]));
    if (rev) {
      rev.moderation_status = body.moderation_status;
      saveStore(store);
    }
    return { ok: true, stats: platformStats() };
  }

  const adminTariffMatch = pathname.match(/^\/api\/admin\/tariffs\/(\d+)$/);
  if (adminTariffMatch && method === 'PUT') {
    const t = store.tariffs.find((x) => x.id === Number(adminTariffMatch[1]));
    if (t) {
      t.price_rub = Math.max(0, Number(body.price_rub) || 0);
      t.limit_value =
        body.limit_value === '' || body.limit_value === null || body.limit_value === undefined
          ? null
          : Math.max(1, Number(body.limit_value));
      saveStore(store);
    }
    return { tariffs: store.tariffs };
  }

  const adminVerifyMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/verify$/);
  if (adminVerifyMatch && method === 'PATCH') {
    const u = store.users.find((x) => x.id === Number(adminVerifyMatch[1]));
    if (u) {
      u.is_verified = !u.is_verified;
      saveStore(store);
    }
    return { is_verified: Boolean(u?.is_verified) };
  }

  const adminRegionMatch = pathname.match(/^\/api\/admin\/regions\/(\d+)$/);
  if (adminRegionMatch && method === 'PATCH') {
    const rid = Number(adminRegionMatch[1]);
    if (rid === 1) throw makeErr('Базовый регион Москва и МО всегда активен');
    const reg = store.regions.find((x) => x.id === rid);
    if (reg) {
      reg.is_active = reg.is_active ? 0 : 1;
      saveStore(store);
    }
    return { is_active: Boolean(reg?.is_active) };
  }

  if (pathname === '/api/notifications/read-all' && method === 'POST') {
    for (const n of store.notifications) {
      if (n.user_id === uid) n.is_read = true;
    }
    saveStore(store);
    return { ok: true };
  }

  return {};
}
