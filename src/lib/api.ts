import { PayoutType, UserRole } from '../types';
import { dispatchBrowserApi, safeGetStorage, safeSetStorage } from './browserDb';

const STORAGE_USER_KEY = 'podrabotka_active_user_id';

/** Подставляется сборкой: true для автономного одностраничного билда (docs/). */
declare const __PODRABOTKA_STANDALONE__: boolean | undefined;

const STANDALONE_BUILD = typeof __PODRABOTKA_STANDALONE__ !== 'undefined' && __PODRABOTKA_STANDALONE__;

let forceStandaloneMode =
  typeof window !== 'undefined' &&
  (STANDALONE_BUILD ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'content:' ||
    window.location.protocol === 'blob:' ||
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('githubusercontent.com'));

export function getSavedUserId(): number {
  const raw = safeGetStorage(STORAGE_USER_KEY);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function setSavedUserId(id: number) {
  safeSetStorage(STORAGE_USER_KEY, String(id));
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const userId = getSavedUserId();

  if (forceStandaloneMode) {
    return dispatchBrowserApi(path, options, userId) as T;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    // If gateway returns 502/503/504 or static hosting returns HTML instead of JSON API, switch seamlessly to in-browser DB!
    if (res.status >= 502 || !contentType.includes('application/json')) {
      forceStandaloneMode = true;
      return dispatchBrowserApi(path, options, userId) as T;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err: any = new Error(data?.error || 'Произошла ошибка при обращении к серверу');
      err.code = data?.code;
      err.status = res.status;
      throw err;
    }
    return data as T;
  } catch (err: any) {
    if (err?.code === 'TARIFF_LIMIT' || (err?.status && err.status >= 400 && err.status < 500 && err.status !== 404)) {
      throw err;
    }
    // Network unreachable / offline / 404 static host -> seamless local browser engine
    forceStandaloneMode = true;
    return dispatchBrowserApi(path, options, userId) as T;
  }
}

export const JOB_CATEGORIES = [
  'Грузчик',
  'Курьер',
  'Промоутер',
  'Официант',
  'Склад',
  'Уборка',
  'Стройка',
  'Мероприятия',
] as const;

export function formatMoney(amount: number, symbol = '₽'): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} ${symbol}`;
}

export function formatShiftDate(isoDate: string): string {
  const now = new Date();
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const todayKey = toKey(now);
  const tmr = new Date(now);
  tmr.setDate(tmr.getDate() + 1);
  const tomorrowKey = toKey(tmr);

  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y || 2026, (m || 1) - 1, d || 1);
  const shortDate = dateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  if (isoDate === todayKey) return `Сегодня, ${shortDate}`;
  if (isoDate === tomorrowKey) return `Завтра, ${shortDate}`;
  return dateObj.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getPayoutLabel(type: PayoutType): string {
  switch (type) {
    case 'sbp_instant':
      return 'СБП сразу после смены';
    case 'cash_end_shift':
      return 'На руки в конце смены';
    case 'smz_card':
      return 'На карту СМЗ (+чек)';
    case 'weekly':
      return 'Раз в неделю';
    default:
      return 'Прямая выплата';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'worker':
      return 'Рабочий';
    case 'employer':
      return 'Работодатель';
    case 'admin':
      return 'Модератор';
  }
}

export function getWorkerLevel(shiftsCompleted: number, ratingAvg: number): string {
  if (shiftsCompleted >= 10 && ratingAvg >= 4.7) return 'Профи';
  if (shiftsCompleted >= 2) return 'Надёжный';
  return 'Новичок';
}
