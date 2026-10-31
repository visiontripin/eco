import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Wallet,
  ShieldCheck,
  Star,
  Users,
  CheckCircle2,
  Send,
  Heart,
  Info,
} from 'lucide-react';
import { JobItem, UserProfile } from '../types';
import { formatMoney, formatShiftDate, getPayoutLabel } from '../lib/api';

interface JobDetailModalProps {
  job: JobItem | null;
  me: UserProfile | null;
  onClose: () => void;
  onApply: (jobId: number, coverNote: string) => Promise<void>;
  onToggleFavorite: (e: React.MouseEvent, job: JobItem) => void;
  onOpenProfile: (userId: number) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  me,
  onClose,
  onApply,
  onToggleFavorite,
  onOpenProfile,
}) => {
  const [coverNote, setCoverNote] = useState(
    'Готов выйти вовремя без опозданий, телефон всегда на связи.'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!job) return null;

  const hourly = Math.round(job.pay_amount / Math.max(1, job.duration_hours));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onApply(job.id, coverNote);
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
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-elevated animate-enter"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
              {job.category}
            </span>
            <span className="text-xs text-ink-500">{job.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => onToggleFavorite(e, job)}
              className={`p-2 rounded-full transition-colors ${
                job.is_favorite ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-ink-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${job.is_favorite ? 'fill-brand-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-gray-100 text-ink-700 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink-900 leading-tight mb-3">
              {job.title}
            </h2>
            <div className="inline-flex items-baseline gap-2.5 bg-surface-soft px-4 py-3 rounded-2xl border border-gray-200/70 w-full justify-between">
              <div>
                <div className="text-xs text-ink-500">Оплата за смену ({job.duration_hours} ч)</div>
                <div className="font-heading text-2xl font-extrabold text-brand-600">
                  {formatMoney(job.pay_amount, job.currency_symbol)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-emerald-700 flex items-center justify-end gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  {getPayoutLabel(job.payout_type)}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">Ставка {hourly} ₽/час · без комиссии</div>
              </div>
            </div>
          </div>

          {/* Shift Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-surface-soft p-3.5">
              <div className="text-xs text-ink-500 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                Дата и время смены
              </div>
              <div className="font-bold text-ink-900">{formatShiftDate(job.shift_date)}</div>
              <div className="text-xs text-ink-700">
                с {job.start_time} до {job.end_time} ({job.duration_hours} часов)
              </div>
            </div>

            <div className="rounded-2xl bg-surface-soft p-3.5">
              <div className="text-xs text-ink-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                Локация и метро / МЦД
              </div>
              <div className="font-bold text-ink-900 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: job.metro_color }}
                />
                {job.metro_station} ({job.walk_minutes} мин)
              </div>
              <div className="text-xs text-ink-700 mt-0.5">{job.address}</div>
            </div>
          </div>

          {/* Employer Card */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile(job.employer_id);
            }}
            className="w-full rounded-2xl border border-gray-200 p-3.5 flex items-center justify-between hover:border-brand-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 font-heading font-bold flex items-center justify-center shrink-0">
                {job.employer_company.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-ink-900 truncate">{job.employer_company}</span>
                  {job.employer_verified && (
                    <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-ink-500">
                  Контактное лицо: {job.employer_name} · Нажмите для просмотра отзывов
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className="inline-flex items-center gap-1 font-bold text-sm text-ink-900 bg-amber-50 px-2.5 py-1 rounded-xl">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {job.employer_rating > 0 ? job.employer_rating.toFixed(1) : 'Новый'}
              </div>
              <div className="text-[11px] text-ink-400 mt-0.5">
                {job.employer_reviews_count} отз.
              </div>
            </div>
          </button>

          {/* Description & Requirements */}
          <div>
            <h4 className="font-bold text-sm text-ink-900 mb-1.5">Что предстоит делать</h4>
            <p className="text-sm text-ink-700 leading-relaxed">{job.description}</p>
          </div>

          {job.requirements.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-ink-900 mb-2">Требования и условия</h4>
              <ul className="space-y-1.5">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-ink-700">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-surface-soft px-3.5 py-2.5 flex items-center justify-between text-xs text-ink-700">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-brand-600" />
              Команда на смену: набрано <strong>{job.slots_filled}</strong> из{' '}
              <strong>{job.slots_total}</strong> чел.
            </span>
            <span className="font-semibold text-brand-700">Ответ в тот же день</span>
          </div>

          {/* Apply Form or Existing Status */}
          {job.my_application_status ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">Вы уже откликнулись на эту подработку</div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Текущий статус и переписка с заказчиком доступны во вкладке «Кабинет».
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            </div>
          ) : me?.role !== 'worker' ? (
            <div className="rounded-2xl bg-surface-soft border border-gray-200 p-4 text-xs text-ink-700 flex items-center gap-2.5">
              <Info className="w-5 h-5 text-brand-600 shrink-0" />
              <span>
                Сейчас активен режим <strong>{me?.role === 'employer' ? 'Работодателя' : 'Модератора'}</strong>. Переключите роль на «Рабочий» в верхней панели, чтобы откликнуться в 1 клик.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Короткий комментарий для работодателя
                </label>
                <input
                  type="text"
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Например: есть медкнижка, приеду за 15 минут"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm shadow-brand flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? 'Отправляем отклик...'
                  : `Откликнуться на смену · ${formatMoney(job.pay_amount)}`}
              </button>

              {me.tariff_limit !== null && (
                <p className="text-center text-[11px] text-ink-500">
                  По тарифу «{me.tariff_title}» использовано сегодня:{' '}
                  <strong>
                    {me.today_applications_used ?? 0} из {me.tariff_limit}
                  </strong>{' '}
                  откликов
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
