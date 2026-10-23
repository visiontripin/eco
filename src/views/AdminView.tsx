import React, { useEffect, useState } from 'react';
import {
  Check,
  X,
  Star,
  ShieldCheck,
  Globe2,
  Building2,
} from 'lucide-react';
import { Region, ReviewItem, Tariff, UserProfile } from '../types';
import { apiFetch } from '../lib/api';

interface AdminViewProps {
  onDataChanged: () => void;
  showToast: (msg: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onDataChanged, showToast }) => {
  const [tab, setTab] = useState<'main' | 'employers' | 'regions'>('main');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [edits, setEdits] = useState<Record<number, { price: string; limit: string }>>({});
  const [loading, setLoading] = useState(true);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/overview');
      setReviews(data.reviews || []);
      setTariffs(data.tariffs || []);
      setUsers(data.users || []);
      setRegions(data.regions || []);

      const nextEdits: Record<number, { price: string; limit: string }> = {};
      for (const t of data.tariffs || []) {
        nextEdits[t.id] = {
          price: String(t.price_rub),
          limit: t.limit_value === null ? '' : String(t.limit_value),
        };
      }
      setEdits(nextEdits);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const pendingReviews = reviews.filter((r) => r.moderation_status === 'pending');

  const handleModerate = async (reviewId: number, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify({ moderation_status: status }),
    });
    showToast(
      status === 'approved'
        ? 'Отзыв одобрен и учтён в рейтинге!'
        : 'Отзыв отклонён модератором'
    );
    await loadAdmin();
    onDataChanged();
  };

  const handleSaveTariff = async (tariffId: number, title: string) => {
    const cur = edits[tariffId];
    if (!cur) return;
    await apiFetch(`/api/admin/tariffs/${tariffId}`, {
      method: 'PUT',
      body: JSON.stringify({
        price_rub: cur.price === '' ? 0 : Number(cur.price),
        limit_value: cur.limit === '' ? null : Number(cur.limit),
      }),
    });
    showToast(`Тариф «${title}» сохранён`);
    await loadAdmin();
    onDataChanged();
  };

  const handleToggleVerify = async (u: UserProfile) => {
    await apiFetch(`/api/admin/users/${u.id}/verify`, { method: 'PATCH' });
    showToast(
      u.is_verified
        ? `Отметка проверки снята у ${u.company_name || u.name}`
        : `${u.company_name || u.name} отмечен как проверенный`
    );
    await loadAdmin();
    onDataChanged();
  };

  const handleToggleRegion = async (reg: Region) => {
    try {
      await apiFetch(`/api/admin/regions/${reg.id}`, { method: 'PATCH' });
      showToast(`Статус региона «${reg.name}» обновлён в БД`);
      await loadAdmin();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-enter">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-900">
          Админ-панель
        </h1>
        <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
          Модерация взаимных отзывов, настройка тарифной матрицы и масштабирование регионов БД
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setTab('main')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
            tab === 'main' ? 'bg-brand-600 text-white' : 'bg-surface-soft text-ink-700'
          }`}
        >
          Отзывы ({pendingReviews.length}) и Тарифы
        </button>
        <button
          type="button"
          onClick={() => setTab('employers')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 inline-flex items-center gap-1.5 ${
            tab === 'employers' ? 'bg-brand-600 text-white' : 'bg-surface-soft text-ink-700'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Верификация участников
        </button>
        <button
          type="button"
          onClick={() => setTab('regions')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 inline-flex items-center gap-1.5 ${
            tab === 'regions' ? 'bg-brand-600 text-white' : 'bg-surface-soft text-ink-700'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          Регионы БД (СНГ / Мир)
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-ink-400">Загрузка панели управления...</div>
      ) : tab === 'main' ? (
        <div className="space-y-8">
          {/* 1. Review Moderation Queue (Elevated from Screenshot 4) */}
          <section className="space-y-3">
            <h2 className="font-heading text-lg sm:text-xl font-extrabold text-ink-900">
              Отзывы на модерации ({pendingReviews.length})
            </h2>

            {pendingReviews.length === 0 ? (
              <p className="text-sm text-ink-500">Очередь пуста — все отзывы проверены.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {pendingReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-ink-500">
                          Автор: <strong className="text-ink-900">{rev.author_name}</strong> → Кому:{' '}
                          <strong className="text-brand-700">
                            {rev.target_company || rev.target_name}
                          </strong>
                        </div>
                        {rev.job_title && (
                          <div className="text-[11px] text-ink-400 mt-0.5">
                            Смена: {rev.job_title}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 text-xs font-bold text-ink-900">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {rev.rating}.0
                      </span>
                    </div>

                    <p className="text-sm text-ink-900 leading-relaxed bg-surface-soft rounded-xl p-3">
                      {rev.comment}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerate(rev.id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Одобрить и опубликовать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerate(rev.id, 'rejected')}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 text-ink-500 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Tariffs & Prices (Exact match & upgrade of Screenshot 4) */}
          <section className="space-y-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-extrabold text-ink-900">
                Тарифы и цены
              </h2>
              <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
                Пустое поле лимита — без ограничений. Изменения мгновенно применяются ко всем кабинетам.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tariffs.map((t) => {
                const edit = edits[t.id] || { price: '0', limit: '' };
                const isWorkerPlan = t.target_role === 'worker';
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3.5 shadow-card"
                  >
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-bold text-ink-900">{t.title}</h3>
                      <span className="text-xs text-ink-500">
                        ({isWorkerPlan ? 'рабочие' : 'работодатели'})
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-ink-500 mb-1">Цена, ₽/мес</label>
                      <input
                        type="number"
                        min={0}
                        value={edit.price}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [t.id]: { ...edit, price: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-ink-900 focus:outline-none focus:border-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-ink-500 mb-1">
                        {isWorkerPlan ? 'Откликов в день' : 'Активных вакансий'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Без ограничений"
                        value={edit.limit}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [t.id]: { ...edit, limit: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:outline-none focus:border-brand-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveTariff(t.id, t.title)}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
                    >
                      Сохранить
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : tab === 'employers' ? (
        <div className="space-y-3">
          {users
            .filter((u) => u.role !== 'admin')
            .map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-ink-900">
                    <span>{u.company_name || u.name}</span>
                    {u.is_verified && <ShieldCheck className="w-4 h-4 text-brand-600" />}
                  </div>
                  <div className="text-xs text-ink-500">
                    {u.role === 'employer' ? 'Работодатель' : 'Рабочий'} · {u.email} · Рейтинг{' '}
                    {u.rating_avg > 0 ? u.rating_avg.toFixed(1) : '—'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleVerify(u)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    u.is_verified
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-gray-50 border-gray-200 text-ink-700'
                  }`}
                >
                  {u.is_verified ? 'Проверен ✓' : 'Выдать проверку'}
                </button>
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-brand-50/70 border border-brand-100 p-4 text-xs text-ink-700 leading-relaxed">
            <strong>Архитектура международного масштабирования в БД:</strong> сейчас пользовательская витрина сфокусирована на Москве и Московской области, но таблицы{' '}
            <code className="font-mono text-brand-700">regions</code> и{' '}
            <code className="font-mono text-brand-700">locations</code> уже хранят коды стран ISO, валюты, часовые пояса и локали для запуска новых стран в 1 клик.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regions.map((reg) => (
              <div
                key={reg.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-soft text-[11px] font-mono font-bold text-ink-700">
                      {reg.country_code} · {reg.currency_code} ({reg.currency_symbol})
                    </span>
                    <span className="font-bold text-sm text-ink-900">{reg.name}</span>
                  </div>
                  <div className="text-xs text-ink-400 mt-1">
                    Часовой пояс: {reg.timezone} · Локаль: {reg.locale}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleRegion(reg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                    reg.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-surface-soft text-ink-500 border border-gray-200'
                  }`}
                >
                  {reg.is_active ? 'Активен' : 'В резерве БД'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
