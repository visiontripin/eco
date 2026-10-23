import React from 'react';
import {
  Clock,
  Flame,
  Heart,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  CheckCircle2,
  Utensils,
} from 'lucide-react';
import { JobItem } from '../types';
import { formatMoney, formatShiftDate, getPayoutLabel } from '../lib/api';

interface JobCardProps {
  job: JobItem;
  onSelect: (job: JobItem) => void;
  onToggleFavorite: (e: React.MouseEvent, job: JobItem) => void;
  onOpenProfile: (e: React.MouseEvent, userId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onSelect,
  onToggleFavorite,
  onOpenProfile,
}) => {
  const hourly = Math.round(job.pay_amount / Math.max(1, job.duration_hours));
  const spotsLeft = Math.max(0, job.slots_total - job.slots_filled);
  const fillPercent = Math.min(100, Math.round((job.slots_filled / Math.max(1, job.slots_total)) * 100));

  return (
    <div
      onClick={() => onSelect(job)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer p-4 sm:p-5 bg-white hover:shadow-elevated ${
        job.is_promoted
          ? 'border-brand-200 ring-1 ring-brand-100/80'
          : 'border-gray-200/90 hover:border-brand-300'
      }`}
    >
      {/* Top Row: Badges + Bookmark */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-soft text-ink-700 border border-gray-200/70">
            {job.category}
          </span>
          {job.is_urgent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
              <Flame className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
              Срочно
            </span>
          )}
          {!job.experience_required && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              Без опыта
            </span>
          )}
          {job.meal_included && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800">
              <Utensils className="w-3 h-3" />
              Питание
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => onToggleFavorite(e, job)}
          aria-label="В избранное"
          className={`p-2 -m-1 rounded-full transition-colors ${
            job.is_favorite
              ? 'text-brand-600 bg-brand-50'
              : 'text-gray-400 hover:text-brand-600 hover:bg-gray-50'
          }`}
        >
          <Heart className={`w-4 h-4 ${job.is_favorite ? 'fill-brand-600' : ''}`} />
        </button>
      </div>

      {/* Title & Pay */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
        <h3 className="text-base sm:text-[17px] font-bold text-ink-900 leading-snug group-hover:text-brand-700 transition-colors">
          {job.title}
        </h3>
        <div className="sm:text-right shrink-0">
          <div className="font-heading text-lg sm:text-xl font-extrabold text-ink-900 whitespace-nowrap">
            {formatMoney(job.pay_amount, job.currency_symbol)}
            <span className="text-xs font-sans font-normal text-ink-500"> / смена</span>
          </div>
          <div className="text-xs font-medium text-ink-500">{hourly} ₽/час</div>
        </div>
      </div>

      {/* Metro / City + Shift Time + Direct Payout */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-[13px] text-ink-700 mb-3.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: job.metro_color || '#D82376' }}
          />
          <span>{job.metro_station}</span>
          <span className="text-ink-400">· {job.walk_minutes} мин</span>
          {job.area_type === 'mo' && (
            <span className="px-1.5 py-0.2 bg-gray-100 text-ink-700 rounded text-[11px]">
              {job.city}
            </span>
          )}
        </span>

        <span className="inline-flex items-center gap-1 text-ink-500">
          <Clock className="w-3.5 h-3.5 text-ink-400" />
          <strong className="font-semibold text-ink-700">{formatShiftDate(job.shift_date)}</strong>,{' '}
          {job.start_time}–{job.end_time}
        </span>

        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
          <Wallet className="w-3.5 h-3.5" />
          {getPayoutLabel(job.payout_type)}
        </span>
      </div>

      {/* Team Slots Progress Bar */}
      <div className="mb-3.5 bg-surface-soft rounded-xl px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-ink-700 min-w-0">
          <Users className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="truncate">
            Набрано <strong>{job.slots_filled}</strong> из <strong>{job.slots_total}</strong> чел.
            {spotsLeft > 0 ? (
              <span className="text-brand-700 font-semibold"> · свободно {spotsLeft}</span>
            ) : (
              <span className="text-ink-400"> · резерв</span>
            )}
          </span>
        </div>
        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-brand-600 rounded-full transition-all"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Footer: Employer Trust + Action */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100">
        <button
          type="button"
          onClick={(e) => onOpenProfile(e, job.employer_id)}
          className="flex items-center gap-1.5 text-left min-w-0 hover:opacity-80 transition-opacity"
        >
          {job.employer_verified && (
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
          )}
          <span className="text-xs sm:text-[13px] font-semibold text-ink-900 truncate">
            {job.employer_company}
          </span>
          {job.employer_reviews_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-900 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {job.employer_rating.toFixed(1)}
            </span>
          )}
        </button>

        {job.my_application_status ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {job.my_application_status === 'accepted'
              ? 'Вы в смене'
              : job.my_application_status === 'completed'
              ? 'Завершена'
              : 'Отклик отправлен'}
          </span>
        ) : (
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white group-hover:bg-brand-700 transition-colors shrink-0">
            Откликнуться
          </span>
        )}
      </div>
    </div>
  );
};
