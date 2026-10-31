import React from 'react';
import {
  Search,
  ShieldCheck,
  Star,
  BellRing,
  ArrowRight,
  Wallet,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { JobItem, PlatformStats } from '../types';
import { JOB_CATEGORIES, formatMoney } from '../lib/api';
import { JobCard } from '../components/JobCard';

interface HomeViewProps {
  jobs: JobItem[];
  stats: PlatformStats | null;
  onGoSearch: (category?: string, area?: 'all' | 'moscow' | 'mo') => void;
  onNeedPeople: () => void;
  onSelectJob: (job: JobItem) => void;
  onToggleFavorite: (e: React.MouseEvent, job: JobItem) => void;
  onOpenProfile: (e: React.MouseEvent, userId: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  jobs,
  stats,
  onGoSearch,
  onNeedPeople,
  onSelectJob,
  onToggleFavorite,
  onOpenProfile,
}) => {
  const freshJobs = jobs.slice(0, 6);

  return (
    <div className="space-y-10 pb-6 animate-enter">
      {/* HERO SECTION (Elevated from Screenshot 1) */}
      <section className="hero-glow rounded-3xl px-4 sm:px-8 pt-6 sm:pt-10 pb-6 border border-pink-100/80">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-100/90 text-brand-700">
              <MapPin className="w-3.5 h-3.5" />
              Москва и Московская область
            </span>
            {stats && stats.open_jobs_count > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-ink-700 border border-gray-200/80">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                {stats.open_slots_count} свободных мест · ср. {formatMoney(stats.avg_shift_pay)}
              </span>
            )}
          </div>

          <h1 className="font-heading text-[28px] sm:text-[42px] font-extrabold text-ink-900 leading-[1.14] mb-4">
            Подработка на сегодня —{' '}
            <span className="text-brand-600">рядом с домом</span>
          </h1>

          <p className="text-[15px] sm:text-[17px] text-ink-500 leading-relaxed max-w-xl mb-6">
            Смены на складах, доставка, промо-акции и мероприятия в Москве и городах Подмосковья.
            Откликайтесь за минуту — прямые выплаты сразу после смены без комиссии.
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-7 max-w-lg">
            <button
              type="button"
              onClick={() => onGoSearch('all')}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-[15px] shadow-brand flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" />
              Найти подработку
            </button>

            <button
              type="button"
              onClick={onNeedPeople}
              className="sm:w-52 py-3.5 px-6 rounded-2xl bg-white hover:bg-gray-50 active:scale-[0.99] text-ink-900 font-bold text-[15px] border border-gray-200 shadow-card transition-all"
            >
              Нужны люди
            </button>
          </div>

          {/* Quick Category Pills (All 8 from Screenshot 1 + counts) */}
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.map((cat) => {
              const count = jobs.filter((j) => j.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onGoSearch(cat)}
                  className="px-3.5 py-2 rounded-full bg-white hover:border-brand-400 hover:text-brand-700 text-[13px] font-semibold text-ink-900 border border-gray-200 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>{cat}</span>
                  {count > 0 && (
                    <span className="text-[11px] font-bold text-ink-400">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Moscow vs Moscow Oblast Jump */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-pink-100/90 text-xs">
            <span className="text-ink-400 font-medium">Быстрый выбор зоны:</span>
            <button
              type="button"
              onClick={() => onGoSearch('all', 'moscow')}
              className="px-3 py-1 rounded-full bg-white border border-gray-200 font-semibold text-ink-700 hover:border-brand-400"
            >
              Внутри МКАД / Метро Москвы
            </button>
            <button
              type="button"
              onClick={() => onGoSearch('all', 'mo')}
              className="px-3 py-1 rounded-full bg-white border border-gray-200 font-semibold text-ink-700 hover:border-brand-400"
            >
              Московская область (Химки, Мытищи, Люберцы, Красногорск)
            </button>
          </div>
        </div>
      </section>

      {/* FRESH SHIFTS SECTION */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-ink-900">
              Свежие подработки
            </h2>
            <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
              Проверенные заказчики · отклик в 1 клик без длинных резюме
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoSearch('all')}
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 shrink-0"
          >
            Все ({jobs.length}) <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {freshJobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 p-10 text-center text-ink-500">
            Пока нет открытых подработок. Работодатели — разместите первую вакансию!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {freshJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={onSelectJob}
                onToggleFavorite={onToggleFavorite}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        )}
      </section>

      {/* TRUST & PLATFORM BENEFITS SECTION (Elevated from Screenshot 1) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-surface-soft p-5 space-y-2 border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[15px] text-ink-900">Проверенные работодатели</h3>
          <p className="text-xs sm:text-[13px] text-ink-500 leading-relaxed">
            Отзывы проходят обязательную модерацию, компании получают знак проверки.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-soft p-5 space-y-2 border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Star className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[15px] text-ink-900">Рейтинг и индекс выхода</h3>
          <p className="text-xs sm:text-[13px] text-ink-500 leading-relaxed">
            После каждой смены — взаимная оценка пунктуальности и честности оплаты.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-soft p-5 space-y-2 border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[15px] text-ink-900">Прямые выплаты 100%</h3>
          <p className="text-xs sm:text-[13px] text-ink-500 leading-relaxed">
            Расчёт по СБП, наличными или на карту СМЗ напрямую от заказчика без удержаний.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-soft p-5 space-y-2 border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[15px] text-ink-900">Мгновенные уведомления</h3>
          <p className="text-xs sm:text-[13px] text-ink-500 leading-relaxed">
            Узнаёте о приглашении на смену и сообщениях бригадира сразу в колокольчике.
          </p>
        </div>
      </section>
    </div>
  );
};
