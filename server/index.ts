import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './db.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '2mb' }));

function getCurrentUserId(req: Request): number {
  const headerVal = req.headers['x-user-id'];
  const parsed = Number(Array.isArray(headerVal) ? headerVal[0] : headerVal);
  if (Number.isInteger(parsed) && parsed > 0) {
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(parsed) as { id: number } | undefined;
    if (exists) return exists.id;
  }
  return 1;
}

function getRatingStats(userId: number): { rating_avg: number; reviews_count: number } {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(ROUND(AVG(rating), 1), 0) as avg_rating
       FROM reviews
       WHERE target_user_id = ? AND moderation_status = 'approved'`
    )
    .get(userId) as { cnt: number; avg_rating: number };
  return {
    rating_avg: Number(row?.avg_rating ?? 0),
    reviews_count: Number(row?.cnt ?? 0),
  };
}

function serializeUser(userId: number) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!u) return null;

  const tariff = db.prepare('SELECT * FROM tariffs WHERE slug = ?').get(u.tariff_slug) as any;
  const { rating_avg, reviews_count } = getRatingStats(u.id);

  const todayApps = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications
       WHERE worker_id = ? AND date(created_at) = date('now') AND status != 'cancelled'`
    )
    .get(u.id) as { c: number };

  const activeJobs = db
    .prepare(`SELECT COUNT(*) as c FROM jobs WHERE employer_id = ? AND status = 'active'`)
    .get(u.id) as { c: number };

  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    company_name: u.company_name || '',
    phone: u.phone || '',
    bio: u.bio || '',
    city: u.city || 'Москва',
    metro_station: u.metro_station || '',
    skills: JSON.parse(u.skills_json || '[]'),
    has_med_book: Boolean(u.has_med_book),
    is_self_employed: Boolean(u.is_self_employed),
    night_shifts_ok: Boolean(u.night_shifts_ok),
    is_verified: Boolean(u.is_verified),
    tariff_slug: u.tariff_slug,
    tariff_title: tariff ? tariff.title : 'Бесплатный',
    tariff_limit: tariff ? tariff.limit_value : 5,
    today_applications_used: Number(todayApps?.c ?? 0),
    active_jobs_used: Number(activeJobs?.c ?? 0),
    earned_total: Number(u.earned_total ?? 0),
    shifts_completed: Number(u.shifts_completed ?? 0),
    show_up_rate: Number(u.show_up_rate ?? 100),
    rating_avg,
    reviews_count,
    created_at: u.created_at,
  };
}

function serializeTariffs() {
  const rows = db.prepare('SELECT * FROM tariffs ORDER BY id ASC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    target_role: r.target_role,
    price_rub: Number(r.price_rub),
    limit_value: r.limit_value === null ? null : Number(r.limit_value),
    description: r.description,
    perks: JSON.parse(r.perks_json || '[]'),
  }));
}

function getPlatformStats() {
  const jobStats = db
    .prepare(
      `SELECT COUNT(*) as cnt,
              COALESCE(SUM(MAX(slots_total - slots_filled, 0)), 0) as open_slots,
              COALESCE(ROUND(AVG(pay_amount)), 0) as avg_pay
       FROM jobs WHERE status = 'active'`
    )
    .get() as any;

  const verifiedEmp = db
    .prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'employer' AND is_verified = 1`)
    .get() as any;

  const pendingRev = db
    .prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE moderation_status = 'pending'`)
    .get() as any;

  const totalUsers = db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as any;

  return {
    open_jobs_count: Number(jobStats?.cnt ?? 0),
    open_slots_count: Number(jobStats?.open_slots ?? 0),
    avg_shift_pay: Number(jobStats?.avg_pay ?? 0),
    verified_employers_count: Number(verifiedEmp?.cnt ?? 0),
    pending_reviews_count: Number(pendingRev?.cnt ?? 0),
    total_users_count: Number(totalUsers?.cnt ?? 0),
  };
}

// --- Bootstrap & Auth ---
app.get('/api/bootstrap', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const me = serializeUser(userId);
  const demoAccounts = (db.prepare('SELECT id, name, company_name, role, email FROM users WHERE id IN (1, 2, 7) ORDER BY id ASC').all() as any[]).map(
    (u) => ({
      id: u.id,
      name: u.name,
      company_name: u.company_name,
      role: u.role,
      email: u.email,
    })
  );
  const locations = db.prepare('SELECT * FROM locations WHERE region_id = 1 ORDER BY area_type ASC, id ASC').all();
  const notifications = (
    db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 25')
      .all(userId) as any[]
  ).map((n) => ({
    ...n,
    is_read: Boolean(n.is_read),
  }));

  res.json({
    me,
    demoAccounts,
    tariffs: serializeTariffs(),
    locations,
    stats: getPlatformStats(),
    notifications,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'Укажите email для входа' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(String(email).trim()) as any;
  if (!user || (password && user.password !== String(password))) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }
  res.json({ me: serializeUser(user.id) });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password, role, company_name, city, metro_station } = req.body || {};
  if (!name || !email) {
    res.status(400).json({ error: 'Заполните имя и email' });
    return;
  }
  const cleanRole = role === 'employer' ? 'employer' : 'worker';
  const exists = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(String(email).trim());
  if (exists) {
    res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    return;
  }

  const defaultTariff = cleanRole === 'employer' ? 'employer_start' : 'worker_free';
  const info = db
    .prepare(
      `INSERT INTO users (
        email, password, role, name, company_name, phone, bio, city, metro_station,
        skills_json, is_verified, tariff_slug
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      String(email).trim(),
      String(password || 'demo1234'),
      cleanRole,
      String(name).trim(),
      cleanRole === 'employer' ? String(company_name || name).trim() : '',
      String(phone || '').trim(),
      '',
      String(city || 'Москва'),
      String(metro_station || 'Автозаводская'),
      JSON.stringify(cleanRole === 'worker' ? ['Склад', 'Курьер'] : []),
      defaultTariff
    );

  const newUserId = Number(info.lastInsertRowid);
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, target_tab)
     VALUES (?, 'system', 'Добро пожаловать в Подработка.МСК!', 'Ваш профиль создан. Заполните навыки и откликайтесь на смены рядом с домом.', 'profile')`
  ).run(newUserId);

  res.status(201).json({ me: serializeUser(newUserId) });
});

// --- Profile & Tariffs ---
app.get('/api/users/:id', (req: Request, res: Response) => {
  const targetId = Number(req.params.id);
  const profile = serializeUser(targetId);
  if (!profile) {
    res.status(404).json({ error: 'Профиль не найден' });
    return;
  }

  const reviews = (
    db
      .prepare(
        `SELECT r.*, u.name as author_name, u.company_name as author_company, j.title as job_title
         FROM reviews r
         JOIN users u ON u.id = r.author_id
         LEFT JOIN jobs j ON j.id = r.job_id
         WHERE r.target_user_id = ? AND r.moderation_status = 'approved'
         ORDER BY r.id DESC`
      )
      .all(targetId) as any[]
  ).map((r) => ({
    ...r,
    punctuality_ok: Boolean(r.punctuality_ok),
    paid_on_time: Boolean(r.paid_on_time),
  }));

  const employerJobs =
    profile.role === 'employer'
      ? (db.prepare(`SELECT id, title, category, city, metro_station, shift_date, pay_amount, payout_type FROM jobs WHERE employer_id = ? AND status = 'active' ORDER BY id DESC`).all(targetId) as any[])
      : [];

  res.json({ profile, reviews, employerJobs });
});

app.put('/api/me/profile', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const {
    name,
    company_name,
    phone,
    bio,
    city,
    metro_station,
    skills,
    has_med_book,
    is_self_employed,
    night_shifts_ok,
  } = req.body || {};

  db.prepare(
    `UPDATE users
     SET name = COALESCE(?, name),
         company_name = COALESCE(?, company_name),
         phone = COALESCE(?, phone),
         bio = COALESCE(?, bio),
         city = COALESCE(?, city),
         metro_station = COALESCE(?, metro_station),
         skills_json = COALESCE(?, skills_json),
         has_med_book = COALESCE(?, has_med_book),
         is_self_employed = COALESCE(?, is_self_employed),
         night_shifts_ok = COALESCE(?, night_shifts_ok)
     WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : null,
    company_name !== undefined ? String(company_name).trim() : null,
    phone !== undefined ? String(phone).trim() : null,
    bio !== undefined ? String(bio).trim() : null,
    city !== undefined ? String(city).trim() : null,
    metro_station !== undefined ? String(metro_station).trim() : null,
    Array.isArray(skills) ? JSON.stringify(skills) : null,
    has_med_book !== undefined ? (has_med_book ? 1 : 0) : null,
    is_self_employed !== undefined ? (is_self_employed ? 1 : 0) : null,
    night_shifts_ok !== undefined ? (night_shifts_ok ? 1 : 0) : null,
    userId
  );

  res.json({ me: serializeUser(userId) });
});

app.put('/api/me/tariff', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const { tariff_slug } = req.body || {};
  const tariff = db.prepare('SELECT * FROM tariffs WHERE slug = ?').get(String(tariff_slug)) as any;
  if (!tariff) {
    res.status(404).json({ error: 'Тариф не найден' });
    return;
  }

  db.prepare('UPDATE users SET tariff_slug = ? WHERE id = ?').run(tariff.slug, userId);
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, target_tab)
     VALUES (?, 'system', ?, ?, 'cabinet')`
  ).run(
    userId,
    `Тариф «${tariff.title}» подключён`,
    tariff.limit_value === null
      ? 'Теперь вам доступны безлимитные отклики и приоритетный показ анкеты.'
      : `Лимит по тарифу обновлён: ${tariff.limit_value}.`
  );

  res.json({ me: serializeUser(userId) });
});

// --- Jobs Search, Creation & Management ---
function serializeJobRow(j: any, userId: number) {
  const empRating = getRatingStats(j.employer_id);
  const fav = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND job_id = ?')
    .get(userId, j.id);
  const myApp = db
    .prepare('SELECT id, status FROM applications WHERE worker_id = ? AND job_id = ?')
    .get(userId, j.id) as any;
  const appCounts = db
    .prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_cnt
       FROM applications WHERE job_id = ? AND status != 'cancelled'`
    )
    .get(j.id) as any;

  return {
    id: j.id,
    employer_id: j.employer_id,
    region_id: j.region_id,
    area_type: j.area_type,
    title: j.title,
    category: j.category,
    city: j.city,
    metro_station: j.metro_station,
    metro_color: j.metro_color,
    walk_minutes: Number(j.walk_minutes),
    address: j.address,
    shift_date: j.shift_date,
    start_time: j.start_time,
    end_time: j.end_time,
    duration_hours: Number(j.duration_hours),
    pay_amount: Number(j.pay_amount),
    currency_symbol: j.currency_symbol || '₽',
    payout_type: j.payout_type,
    slots_total: Number(j.slots_total),
    slots_filled: Number(j.slots_filled),
    experience_required: Boolean(j.experience_required),
    med_book_required: Boolean(j.med_book_required),
    smz_preferred: Boolean(j.smz_preferred),
    meal_included: Boolean(j.meal_included),
    is_urgent: Boolean(j.is_urgent),
    is_promoted: Boolean(j.is_promoted),
    description: j.description,
    requirements: JSON.parse(j.requirements_json || '[]'),
    status: j.status,
    created_at: j.created_at,
    employer_name: j.employer_name,
    employer_company: j.employer_company || j.employer_name,
    employer_verified: Boolean(j.employer_verified),
    employer_rating: empRating.rating_avg,
    employer_reviews_count: empRating.reviews_count,
    is_favorite: Boolean(fav),
    my_application_id: myApp ? myApp.id : null,
    my_application_status: myApp ? myApp.status : null,
    applications_count: Number(appCounts?.total ?? 0),
    pending_applications_count: Number(appCounts?.pending_cnt ?? 0),
  };
}

app.get('/api/jobs', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const {
    q = '',
    category = 'all',
    area_type = 'all',
    metro_station = 'all',
    min_pay = '0',
    date_preset = 'all',
    payout_type = 'all',
    no_experience = '0',
    verified_only = '0',
    favorites_only = '0',
    employer_id = '',
    include_inactive = '0',
    sort = 'recommended',
  } = req.query as Record<string, string>;

  let sql = `
    SELECT j.*, u.name as employer_name, u.company_name as employer_company, u.is_verified as employer_verified
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    WHERE 1 = 1
  `;
  const params: any[] = [];

  if (include_inactive !== '1') {
    sql += ` AND j.status = 'active'`;
  }
  if (employer_id) {
    sql += ` AND j.employer_id = ?`;
    params.push(Number(employer_id));
  }
  if (q.trim()) {
    const like = `%${q.trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(j.title) LIKE ? OR
      LOWER(j.category) LIKE ? OR
      LOWER(j.city) LIKE ? OR
      LOWER(j.metro_station) LIKE ? OR
      LOWER(j.address) LIKE ? OR
      LOWER(u.company_name) LIKE ?
    )`;
    params.push(like, like, like, like, like, like);
  }
  if (category && category !== 'all') {
    sql += ` AND j.category = ?`;
    params.push(category);
  }
  if (area_type && area_type !== 'all') {
    sql += ` AND j.area_type = ?`;
    params.push(area_type);
  }
  if (metro_station && metro_station !== 'all') {
    sql += ` AND j.metro_station = ?`;
    params.push(metro_station);
  }
  if (Number(min_pay) > 0) {
    sql += ` AND j.pay_amount >= ?`;
    params.push(Number(min_pay));
  }
  if (payout_type && payout_type !== 'all') {
    sql += ` AND j.payout_type = ?`;
    params.push(payout_type);
  }
  if (no_experience === '1') {
    sql += ` AND j.experience_required = 0`;
  }
  if (verified_only === '1') {
    sql += ` AND u.is_verified = 1`;
  }

  const now = new Date();
  const fmt = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  if (date_preset === 'today') {
    sql += ` AND j.shift_date = ?`;
    params.push(fmt(0));
  } else if (date_preset === 'tomorrow') {
    sql += ` AND j.shift_date = ?`;
    params.push(fmt(1));
  } else if (date_preset === 'upcoming') {
    sql += ` AND j.shift_date >= ?`;
    params.push(fmt(2));
  }

  if (favorites_only === '1') {
    sql += ` AND EXISTS (SELECT 1 FROM favorites f WHERE f.user_id = ? AND f.job_id = j.id)`;
    params.push(userId);
  }

  const rows = db.prepare(sql).all(...params) as any[];
  let items = rows.map((r) => serializeJobRow(r, userId));

  if (sort === 'pay_desc') {
    items.sort((a, b) => b.pay_amount - a.pay_amount);
  } else if (sort === 'urgent') {
    items.sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent) || a.shift_date.localeCompare(b.shift_date));
  } else if (sort === 'rating') {
    items.sort((a, b) => b.employer_rating - a.employer_rating || b.pay_amount - a.pay_amount);
  } else {
    items.sort(
      (a, b) =>
        Number(b.is_promoted) - Number(a.is_promoted) ||
        Number(b.is_urgent) - Number(a.is_urgent) ||
        b.id - a.id
    );
  }

  res.json({ jobs: items });
});

app.post('/api/jobs', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const user = serializeUser(userId);
  if (!user) {
    res.status(401).json({ error: 'Авторизуйтесь для публикации вакансии' });
    return;
  }

  if (user.role === 'employer' && user.tariff_limit !== null && (user.active_jobs_used ?? 0) >= user.tariff_limit) {
    res.status(403).json({
      code: 'TARIFF_LIMIT',
      error: `Достигнут лимит активных вакансий (${user.tariff_limit}) на тарифе «${user.tariff_title}». Перейдите на тариф «Бизнес» для размещения до 20 смен.`,
    });
    return;
  }

  const {
    title,
    category = 'Склад',
    area_type = 'moscow',
    city = 'Москва',
    metro_station = 'Автозаводская',
    walk_minutes = 7,
    address = '',
    shift_date,
    start_time = '09:00',
    end_time = '18:00',
    duration_hours = 9,
    pay_amount = 4500,
    payout_type = 'sbp_instant',
    slots_total = 3,
    experience_required = false,
    med_book_required = false,
    smz_preferred = true,
    meal_included = false,
    is_urgent = false,
    description = '',
    requirements = [],
  } = req.body || {};

  if (!title || !address || !shift_date) {
    res.status(400).json({ error: 'Укажите название смены, дату и точный адрес' });
    return;
  }

  const locRow = db
    .prepare('SELECT line_color, city_name, area_type FROM locations WHERE station_name = ? LIMIT 1')
    .get(String(metro_station)) as any;

  const isPromoted = user.tariff_slug === 'employer_business' ? 1 : 0;

  const info = db
    .prepare(
      `INSERT INTO jobs (
        employer_id, region_id, area_type, title, category, city, metro_station, metro_color,
        walk_minutes, address, shift_date, start_time, end_time, duration_hours, pay_amount,
        currency_symbol, payout_type, slots_total, slots_filled, experience_required,
        med_book_required, smz_preferred, meal_included, is_urgent, is_promoted,
        description, requirements_json, status
      ) VALUES (
        ?, 1, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        '₽', ?, ?, 0, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 'active'
      )`
    )
    .run(
      userId,
      locRow ? locRow.area_type : area_type,
      String(title).trim(),
      String(category),
      locRow ? locRow.city_name : String(city).trim(),
      String(metro_station).trim(),
      locRow ? locRow.line_color : '#D82376',
      Number(walk_minutes) || 7,
      String(address).trim(),
      String(shift_date),
      String(start_time),
      String(end_time),
      Number(duration_hours) || 8,
      Number(pay_amount) || 4000,
      String(payout_type),
      Math.max(1, Number(slots_total) || 1),
      experience_required ? 1 : 0,
      med_book_required ? 1 : 0,
      smz_preferred ? 1 : 0,
      meal_included ? 1 : 0,
      is_urgent ? 1 : 0,
      isPromoted,
      String(description || 'Смена от проверенного заказчика. Подробный инструктаж на месте.').trim(),
      JSON.stringify(Array.isArray(requirements) ? requirements : [])
    );

  const created = db
    .prepare(
      `SELECT j.*, u.name as employer_name, u.company_name as employer_company, u.is_verified as employer_verified
       FROM jobs j JOIN users u ON u.id = j.employer_id WHERE j.id = ?`
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({ job: serializeJobRow(created, userId), me: serializeUser(userId), stats: getPlatformStats() });
});

app.patch('/api/jobs/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    res.status(404).json({ error: 'Вакансия не найдена' });
    return;
  }

  const user = serializeUser(userId);
  if (!user || (job.employer_id !== userId && user.role !== 'admin')) {
    res.status(403).json({ error: 'Нет прав для изменения вакансии' });
    return;
  }

  const { status } = req.body || {};
  if (status && ['active', 'paused', 'closed'].includes(status)) {
    db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, jobId);
  }

  const updated = db
    .prepare(
      `SELECT j.*, u.name as employer_name, u.company_name as employer_company, u.is_verified as employer_verified
       FROM jobs j JOIN users u ON u.id = j.employer_id WHERE j.id = ?`
    )
    .get(jobId);

  res.json({ job: serializeJobRow(updated, userId), me: serializeUser(userId), stats: getPlatformStats() });
});

app.post('/api/jobs/:id/clone', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const user = serializeUser(userId);
  const jobId = Number(req.params.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
  if (!job || !user) {
    res.status(404).json({ error: 'Смена не найдена' });
    return;
  }
  if (user.role === 'employer' && user.tariff_limit !== null && (user.active_jobs_used ?? 0) >= user.tariff_limit) {
    res.status(403).json({
      code: 'TARIFF_LIMIT',
      error: `Лимит активных вакансий (${user.tariff_limit}) исчерпан. Подключите тариф «Бизнес».`,
    });
    return;
  }

  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  const shiftDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;

  const info = db
    .prepare(
      `INSERT INTO jobs (
        employer_id, region_id, area_type, title, category, city, metro_station, metro_color,
        walk_minutes, address, shift_date, start_time, end_time, duration_hours, pay_amount,
        currency_symbol, payout_type, slots_total, slots_filled, experience_required,
        med_book_required, smz_preferred, meal_included, is_urgent, is_promoted,
        description, requirements_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    )
    .run(
      userId,
      job.region_id,
      job.area_type,
      job.title,
      job.category,
      job.city,
      job.metro_station,
      job.metro_color,
      job.walk_minutes,
      job.address,
      shiftDate,
      job.start_time,
      job.end_time,
      job.duration_hours,
      job.pay_amount,
      job.currency_symbol,
      job.payout_type,
      job.slots_total,
      job.experience_required,
      job.med_book_required,
      job.smz_preferred,
      job.meal_included,
      job.is_urgent,
      job.is_promoted,
      job.description,
      job.requirements_json
    );

  const created = db
    .prepare(
      `SELECT j.*, u.name as employer_name, u.company_name as employer_company, u.is_verified as employer_verified
       FROM jobs j JOIN users u ON u.id = j.employer_id WHERE j.id = ?`
    )
    .get(Number(info.lastInsertRowid));

  res.status(201).json({ job: serializeJobRow(created, userId), me: serializeUser(userId), stats: getPlatformStats() });
});

app.post('/api/jobs/:id/favorite', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const jobId = Number(req.params.id);
  const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND job_id = ?').get(userId, jobId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND job_id = ?').run(userId, jobId);
    res.json({ is_favorite: false });
  } else {
    db.prepare('INSERT INTO favorites (user_id, job_id) VALUES (?, ?)').run(userId, jobId);
    res.json({ is_favorite: true });
  }
});

// --- Applications & Shift Lifecycle ---
app.post('/api/jobs/:id/apply', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const user = serializeUser(userId);
  const jobId = Number(req.params.id);

  if (!user || user.role !== 'worker') {
    res.status(403).json({ error: 'Переключитесь на роль Работника, чтобы откликнуться на смену' });
    return;
  }

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
  if (!job || job.status !== 'active') {
    res.status(404).json({ error: 'Смена уже закрыта или не найдена' });
    return;
  }

  const existing = db
    .prepare('SELECT * FROM applications WHERE job_id = ? AND worker_id = ?')
    .get(jobId, userId) as any;
  if (existing && existing.status !== 'cancelled') {
    res.status(409).json({ error: 'Вы уже откликнулись на эту подработку' });
    return;
  }

  if (user.tariff_limit !== null && (user.today_applications_used ?? 0) >= user.tariff_limit) {
    res.status(403).json({
      code: 'TARIFF_LIMIT',
      error: `Вы использовали все ${user.tariff_limit} бесплатных откликов на сегодня. Подключите тариф «Про» (299 ₽/мес) для безлимитных откликов!`,
    });
    return;
  }

  const coverNote = String(req.body?.cover_note || 'Готов выйти на смену без опозданий, на связи!').trim();

  let appId: number;
  if (existing && existing.status === 'cancelled') {
    db.prepare(`UPDATE applications SET status = 'pending', cover_note = ?, updated_at = datetime('now') WHERE id = ?`).run(
      coverNote,
      existing.id
    );
    appId = existing.id;
  } else {
    const info = db
      .prepare(`INSERT INTO applications (job_id, worker_id, cover_note, status) VALUES (?, ?, ?, 'pending')`)
      .run(jobId, userId, coverNote);
    appId = Number(info.lastInsertRowid);
  }

  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, target_tab)
     VALUES (?, 'application', ?, ?, 'cabinet')`
  ).run(
    job.employer_id,
    `Новый отклик: ${user.name}`,
    `Кандидат откликнулся на смену «${job.title}» (${job.pay_amount} ₽).`
  );

  res.status(201).json({ application_id: appId, me: serializeUser(userId) });
});

app.get('/api/applications', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const user = serializeUser(userId);
  if (!user) {
    res.json({ applications: [] });
    return;
  }

  const whereClause =
    user.role === 'employer'
      ? 'j.employer_id = ?'
      : user.role === 'admin'
      ? '1 = 1'
      : 'a.worker_id = ?';

  const queryParams = user.role === 'admin' ? [] : [userId];

  const rows = db
    .prepare(
      `SELECT a.*,
              j.title as job_title, j.category as job_category, j.city as job_city,
              j.metro_station as job_metro, j.metro_color as job_metro_color,
              j.shift_date as job_date, j.start_time as job_start_time, j.end_time as job_end_time,
              j.pay_amount as job_pay_amount, j.payout_type as job_payout_type,
              j.employer_id,
              emp.name as employer_name, emp.company_name as employer_company,
              emp.phone as employer_phone, emp.is_verified as employer_verified,
              w.name as worker_name, w.phone as worker_phone, w.city as worker_city,
              w.metro_station as worker_metro, w.skills_json as worker_skills_json,
              w.has_med_book as worker_has_med_book, w.is_self_employed as worker_is_self_employed,
              w.shifts_completed as worker_shifts_completed, w.show_up_rate as worker_show_up_rate,
              w.tariff_slug as worker_tariff_slug
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users emp ON emp.id = j.employer_id
       JOIN users w ON w.id = a.worker_id
       WHERE ${whereClause}
       ORDER BY
         CASE WHEN w.tariff_slug = 'worker_pro' THEN 0 ELSE 1 END ASC,
         a.id DESC`
    )
    .all(...queryParams) as any[];

  const msgStmt = db.prepare(
    `SELECT m.*, u.name as sender_name, u.role as sender_role
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.application_id = ?
     ORDER BY m.id ASC`
  );

  const hasReviewStmt = db.prepare(
    `SELECT 1 FROM reviews WHERE application_id = ? AND author_id = ? LIMIT 1`
  );

  const result = rows.map((r) => {
    const workerRating = getRatingStats(r.worker_id);
    const hasMyReview = Boolean(hasReviewStmt.get(r.id, userId));
    return {
      id: r.id,
      job_id: r.job_id,
      worker_id: r.worker_id,
      cover_note: r.cover_note,
      status: r.status,
      payout_recorded: Boolean(r.payout_recorded),
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: r.job_title,
      job_category: r.job_category,
      job_city: r.job_city,
      job_metro: r.job_metro,
      job_metro_color: r.job_metro_color,
      job_date: r.job_date,
      job_start_time: r.job_start_time,
      job_end_time: r.job_end_time,
      job_pay_amount: Number(r.job_pay_amount),
      job_payout_type: r.job_payout_type,
      employer_id: r.employer_id,
      employer_name: r.employer_name,
      employer_company: r.employer_company || r.employer_name,
      employer_phone: r.employer_phone,
      employer_verified: Boolean(r.employer_verified),
      worker_name: r.worker_name,
      worker_phone: r.worker_phone,
      worker_city: r.worker_city,
      worker_metro: r.worker_metro,
      worker_skills: JSON.parse(r.worker_skills_json || '[]'),
      worker_has_med_book: Boolean(r.worker_has_med_book),
      worker_is_self_employed: Boolean(r.worker_is_self_employed),
      worker_shifts_completed: Number(r.worker_shifts_completed),
      worker_show_up_rate: Number(r.worker_show_up_rate),
      worker_rating: workerRating.rating_avg,
      worker_reviews_count: workerRating.reviews_count,
      worker_tariff_slug: r.worker_tariff_slug,
      has_my_review: hasMyReview,
      messages: msgStmt.all(r.id),
    };
  });

  res.json({ applications: result });
});

app.patch('/api/applications/:id/status', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const appId = Number(req.params.id);
  const { status } = req.body || {};

  const appRow = db
    .prepare(
      `SELECT a.*, j.employer_id, j.title as job_title, j.pay_amount, j.slots_total, j.slots_filled
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`
    )
    .get(appId) as any;

  if (!appRow) {
    res.status(404).json({ error: 'Отклик не найден' });
    return;
  }

  if (status === 'cancelled' && appRow.worker_id === userId) {
    if (appRow.status === 'accepted' && appRow.slots_filled > 0) {
      db.prepare('UPDATE jobs SET slots_filled = MAX(0, slots_filled - 1) WHERE id = ?').run(appRow.job_id);
    }
    db.prepare(`UPDATE applications SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(appId);
    res.json({ ok: true, me: serializeUser(userId) });
    return;
  }

  if (appRow.employer_id !== userId) {
    res.status(403).json({ error: 'Только работодатель смены может изменить статус кандидата' });
    return;
  }

  if (status === 'accepted' && appRow.status !== 'accepted') {
    db.prepare(`UPDATE applications SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`).run(appId);
    db.prepare(`UPDATE jobs SET slots_filled = MIN(slots_total, slots_filled + 1) WHERE id = ?`).run(appRow.job_id);
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, target_tab)
       VALUES (?, 'status', 'Вас пригласили на смену!', ?, 'cabinet')`
    ).run(
      appRow.worker_id,
      `Работодатель подтвердил ваш выход на смену «${appRow.job_title}» (${appRow.pay_amount} ₽).`
    );
  } else if (status === 'rejected') {
    if (appRow.status === 'accepted') {
      db.prepare('UPDATE jobs SET slots_filled = MAX(0, slots_filled - 1) WHERE id = ?').run(appRow.job_id);
    }
    db.prepare(`UPDATE applications SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`).run(appId);
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, target_tab)
       VALUES (?, 'status', 'Набор на смену завершён', ?, 'jobs')`
    ).run(appRow.worker_id, `По смене «${appRow.job_title}» набрана полная бригада. Посмотрите свежие смены рядом.`);
  } else if (status === 'completed') {
    const alreadyPaid = Boolean(appRow.payout_recorded);
    db.prepare(
      `UPDATE applications SET status = 'completed', payout_recorded = 1, updated_at = datetime('now') WHERE id = ?`
    ).run(appId);
    if (!alreadyPaid) {
      db.prepare(
        `UPDATE users SET earned_total = earned_total + ?, shifts_completed = shifts_completed + 1 WHERE id = ?`
      ).run(Number(appRow.pay_amount), appRow.worker_id);
      db.prepare(`UPDATE users SET shifts_completed = shifts_completed + 1 WHERE id = ?`).run(appRow.employer_id);
      db.prepare(
        `INSERT INTO notifications (user_id, type, title, body, target_tab)
         VALUES (?, 'status', ?, ?, 'cabinet')`
      ).run(
        appRow.worker_id,
        `Смена закрыта · +${appRow.pay_amount} ₽`,
        `Смена «${appRow.job_title}» успешно завершена. Оцените работодателя для честного рейтинга!`
      );
    }
  }

  res.json({ ok: true, me: serializeUser(userId), stats: getPlatformStats() });
});

app.post('/api/applications/:id/messages', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const appId = Number(req.params.id);
  const body = String(req.body?.body || '').trim();
  if (!body) {
    res.status(400).json({ error: 'Введите текст сообщения' });
    return;
  }

  const appRow = db
    .prepare(`SELECT a.*, j.employer_id, j.title as job_title FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`)
    .get(appId) as any;
  if (!appRow) {
    res.status(404).json({ error: 'Диалог не найден' });
    return;
  }

  db.prepare(`INSERT INTO messages (application_id, sender_id, body) VALUES (?, ?, ?)`).run(appId, userId, body);
  const recipientId = userId === appRow.worker_id ? appRow.employer_id : appRow.worker_id;
  const sender = serializeUser(userId);
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, target_tab)
     VALUES (?, 'message', ?, ?, 'cabinet')`
  ).run(recipientId, `Сообщение от ${sender?.name || 'участника'}`, `По смене «${appRow.job_title}»: ${body.slice(0, 90)}`);

  res.status(201).json({ ok: true });
});

// --- Reviews & Moderation ---
app.post('/api/reviews', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  const user = serializeUser(userId);
  if (!user) {
    res.status(401).json({ error: 'Необходима авторизация' });
    return;
  }

  const {
    job_id,
    application_id = null,
    target_user_id,
    rating = 5,
    punctuality_ok = true,
    paid_on_time = true,
    comment = '',
  } = req.body || {};

  if (!job_id || !target_user_id || !String(comment).trim()) {
    res.status(400).json({ error: 'Напишите короткий отзыв о смене' });
    return;
  }

  db.prepare(
    `INSERT INTO reviews (
      job_id, application_id, author_id, target_user_id, author_role,
      rating, punctuality_ok, paid_on_time, comment, moderation_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(
    Number(job_id),
    application_id ? Number(application_id) : null,
    userId,
    Number(target_user_id),
    user.role,
    Math.min(5, Math.max(1, Number(rating) || 5)),
    punctuality_ok ? 1 : 0,
    paid_on_time ? 1 : 0,
    String(comment).trim()
  );

  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, target_tab)
     VALUES (7, 'review', 'Новый отзыв на модерации', ?, 'admin')`
  ).run(`${user.name} оставил оценку ${rating}★ — проверьте отзыв в очереди модерации.`);

  res.status(201).json({ ok: true, stats: getPlatformStats() });
});

// --- Admin / Moderation Panel ---
app.get('/api/admin/overview', (_req: Request, res: Response) => {
  const reviews = (
    db
      .prepare(
        `SELECT r.*,
                au.name as author_name, au.company_name as author_company,
                tu.name as target_name, tu.company_name as target_company, tu.role as target_role,
                j.title as job_title
         FROM reviews r
         JOIN users au ON au.id = r.author_id
         JOIN users tu ON tu.id = r.target_user_id
         LEFT JOIN jobs j ON j.id = r.job_id
         ORDER BY CASE WHEN r.moderation_status = 'pending' THEN 0 ELSE 1 END ASC, r.id DESC`
      )
      .all() as any[]
  ).map((r) => ({
    ...r,
    punctuality_ok: Boolean(r.punctuality_ok),
    paid_on_time: Boolean(r.paid_on_time),
  }));

  const users = (db.prepare(`SELECT id FROM users ORDER BY id ASC`).all() as any[]).map((u) => serializeUser(u.id));
  const regions = (
    db
      .prepare(
        `SELECT r.*,
                (SELECT COUNT(*) FROM jobs j WHERE j.region_id = r.id) as jobs_count
         FROM regions r ORDER BY r.sort_order ASC`
      )
      .all() as any[]
  );

  res.json({
    reviews,
    tariffs: serializeTariffs(),
    users,
    regions,
    stats: getPlatformStats(),
  });
});

app.patch('/api/admin/reviews/:id', (req: Request, res: Response) => {
  const reviewId = Number(req.params.id);
  const { moderation_status } = req.body || {};
  if (!['approved', 'rejected'].includes(moderation_status)) {
    res.status(400).json({ error: 'Некорректный статус модерации' });
    return;
  }

  const rev = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
  if (!rev) {
    res.status(404).json({ error: 'Отзыв не найден' });
    return;
  }

  db.prepare('UPDATE reviews SET moderation_status = ? WHERE id = ?').run(moderation_status, reviewId);

  if (moderation_status === 'approved') {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, body, target_tab)
       VALUES (?, 'review', ?, 'Проверенный отзыв опубликован и учтён в вашем рейтинге.', 'profile')`
    ).run(rev.target_user_id, `Опубликован новый отзыв (${rev.rating} ★)`);
  }

  res.json({ ok: true, stats: getPlatformStats() });
});

app.put('/api/admin/tariffs/:id', (req: Request, res: Response) => {
  const tariffId = Number(req.params.id);
  const { price_rub, limit_value } = req.body || {};

  const parsedPrice = Math.max(0, Number(price_rub) || 0);
  const parsedLimit =
    limit_value === '' || limit_value === null || limit_value === undefined
      ? null
      : Math.max(1, Number(limit_value));

  db.prepare('UPDATE tariffs SET price_rub = ?, limit_value = ? WHERE id = ?').run(
    parsedPrice,
    parsedLimit,
    tariffId
  );

  res.json({ tariffs: serializeTariffs() });
});

app.patch('/api/admin/users/:id/verify', (req: Request, res: Response) => {
  const targetId = Number(req.params.id);
  const row = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(targetId) as any;
  if (!row) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  const nextVal = row.is_verified ? 0 : 1;
  db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(nextVal, targetId);
  res.json({ is_verified: Boolean(nextVal) });
});

app.patch('/api/admin/regions/:id', (req: Request, res: Response) => {
  const regionId = Number(req.params.id);
  if (regionId === 1) {
    res.status(400).json({ error: 'Базовый регион Москва и МО всегда активен' });
    return;
  }
  const row = db.prepare('SELECT is_active FROM regions WHERE id = ?').get(regionId) as any;
  if (!row) {
    res.status(404).json({ error: 'Регион не найден' });
    return;
  }
  const nextVal = row.is_active ? 0 : 1;
  db.prepare('UPDATE regions SET is_active = ? WHERE id = ?').run(nextVal, regionId);
  res.json({ is_active: Boolean(nextVal) });
});

// --- Notifications ---
app.post('/api/notifications/read-all', (req: Request, res: Response) => {
  const userId = getCurrentUserId(req);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ ok: true });
});

// --- Healthcheck for деплоя и мониторинга ---
app.get('/api/health', (_req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as c FROM jobs').get() as { c: number };
    res.json({
      status: 'ok',
      service: 'podrabotka-msk',
      uptime_seconds: Math.round(process.uptime()),
      jobs_count: Number(row?.c ?? 0),
    });
  } catch (err: any) {
    res.status(503).json({ status: 'error', message: err?.message || 'database unavailable' });
  }
});

// --- Serve Vite Dev or Static Build on 0.0.0.0:3000 ---
async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = createHttpServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Podrabotka.MSK] Full-stack server listening on http://0.0.0.0:${port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Podrabotka.MSK] ${signal} received, shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
