import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Star,
  Check,
  Bell,
  UserCheck,
  Building2,
  Shield,
  LogIn,
  UserPlus,
  MapPin,
} from 'lucide-react';
import {
  NotificationItem,
  ReviewItem,
  Tariff,
  UserProfile,
  UserRole,
} from '../types';
import {
  apiFetch,
  formatMoney,
  formatShiftDate,
  getRoleLabel,
  getWorkerLevel,
} from '../lib/api';

/* ==================== 1. PUBLIC PROFILE PASSPORT MODAL ==================== */
export const PublicProfileModal: React.FC<{
  userId: number | null;
  onClose: () => void;
}> = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [employerJobs, setEmployerJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiFetch(`/api/users/${userId}`)
      .then((res) => {
        setProfile(res.profile);
        setReviews(res.reviews || []);
        setEmployerJobs(res.employerJobs || []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-elevated animate-enter"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <span className="font-heading text-base font-bold text-ink-900">Публичный паспорт</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-ink-700 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !profile ? (
          <div className="p-10 text-center text-sm text-ink-500">Загрузка профиля...</div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-heading text-xl font-bold flex items-center justify-center shrink-0">
                {(profile.company_name || profile.name).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-heading text-lg font-bold text-ink-900">
                    {profile.role === 'employer' && profile.company_name
                      ? profile.company_name
                      : profile.name}
                  </h3>
                  {profile.is_verified && (
                    <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-ink-500 mt-0.5">
                  {getRoleLabel(profile.role)} · {profile.city} ({profile.metro_station})
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.is_self_employed && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      Самозанятый (СМЗ)
                    </span>
                  )}
                  {profile.has_med_book && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                      Медкнижка
                    </span>
                  )}
                  {profile.is_verified && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700">
                      Проверен модерацией
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl bg-surface-soft p-3">
                <div className="font-heading text-lg font-extrabold text-ink-900 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {profile.rating_avg > 0 ? profile.rating_avg.toFixed(1) : '—'}
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {profile.reviews_count} отзывов
                </div>
              </div>
              <div className="rounded-2xl bg-surface-soft p-3">
                <div className="font-heading text-lg font-extrabold text-ink-900">
                  {profile.shifts_completed}
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">Закрыто смен</div>
              </div>
              <div className="rounded-2xl bg-surface-soft p-3">
                <div className="font-heading text-lg font-extrabold text-emerald-600">
                  {profile.show_up_rate}%
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {profile.role === 'employer'
                    ? 'Вовремя платит'
                    : getWorkerLevel(profile.shifts_completed, profile.rating_avg)}
                </div>
              </div>
            </div>

            {profile.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">
                  О себе / компании
                </h4>
                <p className="text-sm text-ink-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {profile.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                  Специализация
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-soft text-ink-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {employerJobs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                  Открытые смены компании ({employerJobs.length})
                </h4>
                <div className="space-y-2">
                  {employerJobs.map((j) => (
                    <div
                      key={j.id}
                      className="rounded-xl border border-gray-200 px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-ink-900">{j.title}</div>
                        <div className="text-ink-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-brand-600" />
                          {j.metro_station} · {formatShiftDate(j.shift_date)}
                        </div>
                      </div>
                      <div className="font-heading font-bold text-brand-600 shrink-0 pl-2">
                        {formatMoney(j.pay_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moderated Reviews */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                Проверенные отзывы ({reviews.length})
              </h4>
              {reviews.length === 0 ? (
                <div className="rounded-2xl bg-surface-soft p-4 text-xs text-ink-500 text-center">
                  Пока нет опубликованных отзывов после модерации
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="rounded-2xl bg-surface-soft p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-ink-900">
                          {rev.author_company || rev.author_name}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      </div>
                      <p className="text-xs text-ink-700 leading-relaxed">{rev.comment}</p>
                      {rev.job_title && (
                        <div className="text-[11px] text-ink-400">Смена: {rev.job_title}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ==================== 2. TARIFF SWITCHER MODAL ==================== */
export const TariffModal: React.FC<{
  open: boolean;
  me: UserProfile | null;
  tariffs: Tariff[];
  onClose: () => void;
  onSelectTariff: (slug: string) => Promise<void>;
}> = ({ open, me, tariffs, onClose, onSelectTariff }) => {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  if (!open || !me) return null;

  const targetRole = me.role === 'employer' ? 'employer' : 'worker';
  const roleTariffs = tariffs.filter((t) => t.target_role === targetRole);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-elevated animate-enter space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-ink-900">Тарифные планы</h3>
            <p className="text-xs text-ink-500">
              {targetRole === 'worker'
                ? 'Для исполнителей · 0% комиссии с ваших выплат за смены'
                : 'Для работодателей · прямые расчёты с кандидатами'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-ink-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roleTariffs.map((t) => {
            const isCurrent = me.tariff_slug === t.slug;
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between ${
                  isCurrent
                    ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-base font-bold text-ink-900">{t.title}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-600 text-white">
                        Активен
                      </span>
                    )}
                  </div>
                  <div className="font-heading text-2xl font-extrabold text-brand-600 mb-2">
                    {formatMoney(t.price_rub)}
                    <span className="text-xs font-sans font-normal text-ink-500"> / мес</span>
                  </div>
                  <p className="text-xs text-ink-500 mb-3">{t.description}</p>
                  <ul className="space-y-1.5 mb-4">
                    <li className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
                      <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      {targetRole === 'worker'
                        ? t.limit_value === null
                          ? 'Безлимит откликов в день'
                          : `${t.limit_value} откликов в день`
                        : t.limit_value === null
                        ? 'Безлимит активных вакансий'
                        : `До ${t.limit_value} активных вакансий`}
                    </li>
                    {t.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-xs text-ink-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || loadingSlug === t.slug}
                  onClick={async () => {
                    setLoadingSlug(t.slug);
                    try {
                      await onSelectTariff(t.slug);
                      onClose();
                    } finally {
                      setLoadingSlug(null);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-ink-400 cursor-default'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand'
                  }`}
                >
                  {isCurrent
                    ? 'Текущий тариф'
                    : loadingSlug === t.slug
                    ? 'Подключаем...'
                    : `Выбрать «${t.title}»`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== 3. MUTUAL REVIEW MODAL ==================== */
export const ReviewModal: React.FC<{
  target: {
    jobId: number;
    applicationId: number;
    targetUserId: number;
    targetName: string;
    jobTitle: string;
    isReviewingEmployer: boolean;
  } | null;
  onClose: () => void;
  onSubmit: (data: {
    job_id: number;
    application_id: number;
    target_user_id: number;
    rating: number;
    punctuality_ok: boolean;
    paid_on_time: boolean;
    comment: string;
  }) => Promise<void>;
}> = ({ target, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [punctualityOk, setPunctualityOk] = useState(true);
  const [paidOnTime, setPaidOnTime] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-elevated animate-enter space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-ink-900">Взаимная оценка смены</h3>
            <p className="text-xs text-ink-500">{target.targetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-ink-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            try {
              await onSubmit({
                job_id: target.jobId,
                application_id: target.applicationId,
                target_user_id: target.targetUserId,
                rating,
                punctuality_ok: punctualityOk,
                paid_on_time: paidOnTime,
                comment,
              });
              setComment('');
              onClose();
            } finally {
              setSending(false);
            }
          }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-2 py-2 bg-surface-soft rounded-2xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {target.isReviewingEmployer ? (
              <button
                type="button"
                onClick={() => setPaidOnTime(!paidOnTime)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  paidOnTime
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-gray-50 border-gray-200 text-ink-500'
                }`}
              >
                ✓ Оплата пришла вовремя и полностью
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPunctualityOk(!punctualityOk)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  punctualityOk
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-gray-50 border-gray-200 text-ink-500'
                }`}
              >
                ✓ Вышел на смену вовремя без опозданий
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Ваш честный отзыв *
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                target.isReviewingEmployer
                  ? 'Расскажите об условиях на объекте и скорости выплаты...'
                  : 'Оцените пунктуальность и качество работы исполнителя...'
              }
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-600"
            />
            <p className="text-[11px] text-ink-400 mt-1">
              Отзыв попадёт в очередь модерации и обновит рейтинг сразу после проверки.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand"
          >
            {sending ? 'Отправляем...' : 'Отправить отзыв на модерацию'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ==================== 4. NOTIFICATIONS DRAWER ==================== */
export const NotificationsModal: React.FC<{
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: string) => void;
}> = ({ open, notifications, onClose, onMarkAllRead, onNavigateTab }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end bg-black/40 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl sm:mt-12 max-h-[82vh] overflow-y-auto shadow-elevated animate-enter"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-600" />
            <span className="font-heading text-base font-bold text-ink-900">Уведомления</span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Прочитать все
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-100 text-ink-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-400">Пока нет уведомлений</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onNavigateTab(n.target_tab || 'cabinet');
                  onClose();
                }}
                className={`w-full text-left rounded-2xl p-3.5 transition-colors border ${
                  n.is_read
                    ? 'bg-white border-gray-100'
                    : 'bg-brand-50/60 border-brand-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs sm:text-sm text-ink-900">{n.title}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
                </div>
                <p className="text-xs text-ink-700 leading-relaxed">{n.body}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ==================== 5. ACCOUNT & ROLE SWITCHER + AUTH MODAL ==================== */
export const AuthSwitcherModal: React.FC<{
  open: boolean;
  me: UserProfile | null;
  demoAccounts: { id: number; name: string; company_name: string; role: UserRole; email: string }[];
  onClose: () => void;
  onSwitchUser: (userId: number) => void;
  onAuthSuccess: (userId: number) => void;
}> = ({ open, me, demoAccounts, onClose, onSwitchUser, onAuthSuccess }) => {
  const [mode, setMode] = useState<'switch' | 'login' | 'register'>('switch');
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, company_name: companyName, email, phone, password, role };
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onAuthSuccess(res.me.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-elevated animate-enter space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-ink-900">Аккаунт и выбор роли</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-ink-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-surface-soft p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('switch')}
            className={`py-2 rounded-xl transition-colors ${
              mode === 'switch' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            Быстрые роли
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-xl transition-colors ${
              mode === 'register' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            Регистрация
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-xl transition-colors ${
              mode === 'login' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            Вход по почте
          </button>
        </div>

        {mode === 'switch' ? (
          <div className="space-y-2.5">
            <p className="text-xs text-ink-500">
              Мгновенно переключайтесь между кабинетами Работника, Работодателя и Модератора, чтобы проверить все сценарии сервиса:
            </p>
            {demoAccounts.map((acc) => {
              const active = me?.id === acc.id;
              const Icon =
                acc.role === 'employer' ? Building2 : acc.role === 'admin' ? Shield : UserCheck;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onSwitchUser(acc.id);
                    onClose();
                  }}
                  className={`w-full rounded-2xl border p-3.5 flex items-center justify-between text-left transition-all ${
                    active
                      ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                      : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-ink-900">
                        {acc.company_name || acc.name}
                      </div>
                      <div className="text-xs text-ink-500">
                        {getRoleLabel(acc.role)} · {acc.email}
                      </div>
                    </div>
                  </div>
                  {active && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-600 text-white">
                      Выбран
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-3 text-sm">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`py-2.5 rounded-xl border text-xs font-bold ${
                      role === 'worker'
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-ink-700'
                    }`}
                  >
                    Ищу подработку
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('employer')}
                    className={`py-2.5 rounded-xl border text-xs font-bold ${
                      role === 'employer'
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-ink-700'
                    }`}
                  >
                    Я работодатель
                  </button>
                </div>

                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя и фамилия *"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
                />

                {role === 'employer' && (
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Название компании / бренда *"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
                  />
                )}

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Телефон (+7 999 000-00-00)"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
                />
              </>
            )}

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль *"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
            />

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand flex items-center justify-center gap-2"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {submitting
                ? 'Подождите...'
                : mode === 'login'
                ? 'Войти в аккаунт'
                : 'Создать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
