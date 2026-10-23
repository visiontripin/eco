import React, { useState } from 'react';
import {
  Plus,
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Copy,
  PauseCircle,
  PlayCircle,
  Phone,
  Award,
  Send,
  Wallet,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { ApplicationItem, JobItem, UserProfile } from '../types';
import {
  formatMoney,
  formatShiftDate,
  getPayoutLabel,
  getWorkerLevel,
} from '../lib/api';
import { JobCard } from '../components/JobCard';

interface CabinetViewProps {
  me: UserProfile;
  applications: ApplicationItem[];
  allJobs: JobItem[];
  employerJobs: JobItem[];
  onOpenTariffs: () => void;
  onOpenCreateJob: () => void;
  onGoSearch: () => void;
  onSelectJob: (job: JobItem) => void;
  onToggleFavorite: (e: React.MouseEvent, job: JobItem) => void;
  onOpenProfile: (userId: number) => void;
  onUpdateAppStatus: (appId: number, status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => Promise<void>;
  onSendMessage: (appId: number, text: string) => Promise<void>;
  onOpenReview: (target: {
    jobId: number;
    applicationId: number;
    targetUserId: number;
    targetName: string;
    jobTitle: string;
    isReviewingEmployer: boolean;
  }) => void;
  onCloneJob: (jobId: number) => Promise<void>;
  onToggleJobPause: (job: JobItem) => Promise<void>;
}

export const CabinetView: React.FC<CabinetViewProps> = ({
  me,
  applications,
  allJobs,
  employerJobs,
  onOpenTariffs,
  onOpenCreateJob,
  onGoSearch,
  onSelectJob,
  onToggleFavorite,
  onOpenProfile,
  onUpdateAppStatus,
  onSendMessage,
  onOpenReview,
  onCloneJob,
  onToggleJobPause,
}) => {
  const [workerTab, setWorkerTab] = useState<'applications' | 'favorites' | 'income'>('applications');
  const [employerTab, setEmployerTab] = useState<'candidates' | 'vacancies'>('candidates');
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [openChatId, setOpenChatId] = useState<number | null>(null);
  const [draftMessages, setDraftMessages] = useState<Record<number, string>>({});

  const favoriteJobs = allJobs.filter((j) => j.is_favorite);
  const activeShiftsCount = applications.filter((a) => a.status === 'accepted').length;

  const handleChatSubmit = async (e: React.FormEvent, appId: number) => {
    e.preventDefault();
    const txt = (draftMessages[appId] || '').trim();
    if (!txt) return;
    await onSendMessage(appId, txt);
    setDraftMessages((prev) => ({ ...prev, [appId]: '' }));
  };

  /* ==================== EMPLOYER CABINET ==================== */
  if (me.role === 'employer') {
    const pendingCandidatesCount = applications.filter((a) => a.status === 'pending').length;
    const visibleCandidates = applications.filter(
      (a) => candidateFilter === 'all' || a.status === candidateFilter
    );

    return (
      <div className="space-y-6 pb-8 animate-enter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-900">
              Кабинет работодателя
            </h1>
            <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
              {me.company_name || me.name} · управление сменами, бригадами и откликами
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateJob}
            className="py-3 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand inline-flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Разместить подработку
          </button>
        </div>

        {/* Employer KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-surface-soft p-4">
            <div className="text-xs text-ink-500 mb-1">Активные вакансии</div>
            <div className="font-heading text-2xl font-extrabold text-ink-900">
              {me.active_jobs_used ?? 0}
              <span className="text-sm font-sans font-semibold text-ink-400">
                {' '}
                / {me.tariff_limit === null ? '∞' : me.tariff_limit}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4">
            <div className="text-xs text-ink-500 mb-1">Ждут решения</div>
            <div className="font-heading text-2xl font-extrabold text-brand-600">
              {pendingCandidatesCount}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4">
            <div className="text-xs text-ink-500 mb-1">Закрыто смен</div>
            <div className="font-heading text-2xl font-extrabold text-ink-900">
              {me.shifts_completed}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4">
            <div className="text-xs text-ink-500 mb-1">Рейтинг заказчика</div>
            <div className="font-heading text-xl font-extrabold text-ink-900 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              {me.rating_avg > 0 ? me.rating_avg.toFixed(1) : 'Новый'}
              <span className="text-xs font-sans font-medium text-ink-400">
                ({me.reviews_count})
              </span>
            </div>
          </div>
        </div>

        {/* Tariff Bar */}
        <div className="rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center justify-between bg-white">
          <div className="text-sm text-ink-900">
            Тариф компании: <strong>{me.tariff_title}</strong>
            <span className="text-xs text-ink-500 ml-2 hidden sm:inline">
              · {me.tariff_limit === null ? 'Безлимит вакансий' : `Лимит ${me.tariff_limit} активных вакансий`}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTariffs}
            className="text-sm font-bold text-brand-600 hover:underline"
          >
            Сменить
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setEmployerTab('candidates')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              employerTab === 'candidates'
                ? 'bg-brand-600 text-white'
                : 'bg-surface-soft text-ink-700 hover:bg-gray-200/70'
            }`}
          >
            Отклики кандидатов ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setEmployerTab('vacancies')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              employerTab === 'vacancies'
                ? 'bg-brand-600 text-white'
                : 'bg-surface-soft text-ink-700 hover:bg-gray-200/70'
            }`}
          >
            Мои смены и вакансии ({employerJobs.length})
          </button>
        </div>

        {employerTab === 'candidates' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Все' },
                { id: 'pending', label: 'Новые' },
                { id: 'accepted', label: 'В бригаде' },
                { id: 'completed', label: 'Завершённые' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCandidateFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    candidateFilter === f.id
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-ink-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {visibleCandidates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-10 text-center text-sm text-ink-500">
                В этой категории пока нет откликов кандидатов.
              </div>
            ) : (
              <div className="space-y-3.5">
                {visibleCandidates.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-card"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenProfile(app.worker_id)}
                            className="font-heading text-base font-bold text-ink-900 hover:text-brand-600"
                          >
                            {app.worker_name}
                          </button>

                          {app.worker_tariff_slug === 'worker_pro' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-600 text-white">
                              PRO-исполнитель
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 text-ink-900 px-2 py-0.5 rounded-lg">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {app.worker_rating > 0 ? app.worker_rating.toFixed(1) : 'Новичок'}
                          </span>

                          <span className="text-xs text-emerald-700 font-semibold">
                            Выход {app.worker_show_up_rate}% ({app.worker_shifts_completed} смен)
                          </span>
                        </div>

                        <div className="text-xs text-ink-500 mt-1">
                          Вакансия: <strong className="text-ink-900">{app.job_title}</strong> ·{' '}
                          {formatShiftDate(app.job_date)} · {formatMoney(app.job_pay_amount)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {app.worker_is_self_employed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            СМЗ
                          </span>
                        )}
                        {app.worker_has_med_book && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                            Медкнижка
                          </span>
                        )}
                      </div>
                    </div>

                    {app.cover_note && (
                      <p className="text-xs sm:text-sm text-ink-700 bg-surface-soft rounded-xl p-3">
                        «{app.cover_note}»
                      </p>
                    )}

                    {/* Contact + Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
                        {app.worker_phone && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(app.worker_phone).catch(() => {});
                            }}
                            title="Нажмите, чтобы скопировать телефон"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-soft font-semibold hover:bg-gray-200/70"
                          >
                            <Phone className="w-3.5 h-3.5 text-brand-600" />
                            {app.worker_phone}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenChatId(openChatId === app.id ? null : app.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-soft font-semibold hover:bg-gray-200/70"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                          Чат ({app.messages.length})
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {app.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Принять на смену
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateAppStatus(app.id, 'rejected')}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-ink-500 hover:text-red-600 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Отклонить
                            </button>
                          </>
                        )}

                        {app.status === 'accepted' && (
                          <button
                            type="button"
                            onClick={() => onUpdateAppStatus(app.id, 'completed')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Подтвердить закрытие смены ({formatMoney(app.job_pay_amount)})
                          </button>
                        )}

                        {app.status === 'completed' && !app.has_my_review && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenReview({
                                jobId: app.job_id,
                                applicationId: app.id,
                                targetUserId: app.worker_id,
                                targetName: app.worker_name,
                                jobTitle: app.job_title,
                                isReviewingEmployer: false,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Оценить работника
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick Chat */}
                    {openChatId === app.id && (
                      <div className="border-t border-gray-100 pt-3 space-y-2.5">
                        <div className="space-y-1.5 max-h-44 overflow-y-auto">
                          {app.messages.length === 0 ? (
                            <p className="text-xs text-ink-400">
                              Напишите детали входа на объект или телефон старшего смены
                            </p>
                          ) : (
                            app.messages.map((m) => (
                              <div
                                key={m.id}
                                className={`rounded-xl px-3 py-2 text-xs max-w-[85%] ${
                                  m.sender_id === me.id
                                    ? 'ml-auto bg-brand-600 text-white'
                                    : 'bg-surface-soft text-ink-900'
                                }`}
                              >
                                <div className="font-bold opacity-80 text-[10px] mb-0.5">
                                  {m.sender_name}
                                </div>
                                {m.body}
                              </div>
                            ))
                          )}
                        </div>
                        <form
                          onSubmit={(e) => handleChatSubmit(e, app.id)}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={draftMessages[app.id] || ''}
                            onChange={(e) =>
                              setDraftMessages((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                            placeholder="Написать кандидату..."
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-600"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {employerJobs.map((j) => (
              <div
                key={j.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        j.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-ink-500'
                      }`}
                    >
                      {j.status === 'active' ? 'Активна' : 'На паузе'}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-ink-900">{j.title}</span>
                  </div>
                  <div className="text-xs text-ink-500">
                    {j.metro_station} ({j.city}) · {formatShiftDate(j.shift_date)} ·{' '}
                    <strong className="text-ink-900">{formatMoney(j.pay_amount)}</strong> · Набрано{' '}
                    <strong>
                      {j.slots_filled}/{j.slots_total}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCloneJob(j.id)}
                    className="px-3 py-2 rounded-xl bg-surface-soft hover:bg-gray-200/70 text-xs font-semibold text-ink-900 inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand-600" />
                    Дублировать на завтра
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleJobPause(j)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-ink-700 inline-flex items-center gap-1.5"
                  >
                    {j.status === 'active' ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        Пауза
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Включить
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ==================== WORKER CABINET (Elevated from Screenshot 5) ==================== */
  const levelLabel = getWorkerLevel(me.shifts_completed, me.rating_avg);

  return (
    <div className="space-y-6 pb-8 animate-enter">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-900">
          Мой кабинет
        </h1>
        <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
          Ваши отклики, расписание подтверждённых смен и статистика прямых выплат
        </p>
      </div>

      {/* 3+1 Crisp KPI Cards (Fixing Screenshot 5 overflow) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="text-xs text-ink-500 mb-1">Заработано</div>
          <div className="font-heading text-xl sm:text-2xl font-extrabold text-ink-900">
            {formatMoney(me.earned_total)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Прямые выплаты 100%</div>
        </div>

        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="text-xs text-ink-500 mb-1">Активные смены</div>
          <div className="font-heading text-xl sm:text-2xl font-extrabold text-brand-600">
            {activeShiftsCount}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">Всего закрыто: {me.shifts_completed}</div>
        </div>

        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="text-xs text-ink-500 mb-1">Рейтинг</div>
          <div className="font-heading text-lg sm:text-xl font-extrabold text-ink-900 flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
            {me.rating_avg > 0 ? me.rating_avg.toFixed(1) : '—'}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5 truncate">
            {levelLabel} · {me.reviews_count} отз.
          </div>
        </div>

        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="text-xs text-ink-500 mb-1">Откликов сегодня</div>
          <div className="font-heading text-xl sm:text-2xl font-extrabold text-ink-900">
            {me.today_applications_used ?? 0}
            <span className="text-sm font-sans font-semibold text-ink-400">
              {' '}
              / {me.tariff_limit === null ? '∞' : me.tariff_limit}
            </span>
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">Выход на смены: {me.show_up_rate}%</div>
        </div>
      </div>

      {/* Tariff Bar (Matching Screenshot 5) */}
      <div className="rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center justify-between bg-white">
        <div className="text-sm text-ink-900">
          Тариф: <strong>{me.tariff_title}</strong>
          <span className="text-xs text-ink-500 ml-2 hidden sm:inline">
            · {me.tariff_limit === null ? 'Безлимит откликов и приоритет в списке' : `${me.tariff_limit} бесплатных откликов в день`}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenTariffs}
          className="text-sm font-bold text-brand-600 hover:underline"
        >
          Сменить
        </button>
      </div>

      {/* Worker Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setWorkerTab('applications')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
            workerTab === 'applications'
              ? 'bg-brand-600 text-white'
              : 'bg-surface-soft text-ink-700'
          }`}
        >
          Мои отклики ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setWorkerTab('favorites')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
            workerTab === 'favorites'
              ? 'bg-brand-600 text-white'
              : 'bg-surface-soft text-ink-700'
          }`}
        >
          Избранные ({favoriteJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setWorkerTab('income')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 ${
            workerTab === 'income' ? 'bg-brand-600 text-white' : 'bg-surface-soft text-ink-700'
          }`}
        >
          История выплат
        </button>
      </div>

      {workerTab === 'applications' && (
        <div className="space-y-3.5">
          {applications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 p-10 text-center space-y-4">
              <p className="text-sm text-ink-500">Вы ещё не откликались на подработки</p>
              <button
                type="button"
                onClick={onGoSearch}
                className="px-6 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm shadow-brand"
              >
                Найти подработку
              </button>
            </div>
          ) : (
            applications.map((app) => {
              const statusMap: Record<string, { text: string; cls: string }> = {
                pending: { text: 'На рассмотрении', cls: 'bg-amber-50 text-amber-800' },
                accepted: { text: 'Вы приглашены на смену', cls: 'bg-emerald-50 text-emerald-700' },
                completed: { text: 'Смена завершена · Оплачено', cls: 'bg-brand-50 text-brand-700' },
                rejected: { text: 'Набор закрыт', cls: 'bg-gray-100 text-ink-500' },
                cancelled: { text: 'Отменён вами', cls: 'bg-gray-100 text-ink-400' },
              };
              const st = statusMap[app.status] || statusMap.pending;

              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.cls}`}>
                          {st.text}
                        </span>
                        <span className="text-xs text-ink-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatShiftDate(app.job_date)}, {app.job_start_time}–{app.job_end_time}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-ink-900">{app.job_title}</h3>
                      <button
                        type="button"
                        onClick={() => onOpenProfile(app.employer_id)}
                        className="text-xs text-ink-500 hover:text-brand-600 inline-flex items-center gap-1 mt-0.5"
                      >
                        {app.employer_verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                        )}
                        {app.employer_company} · м. {app.job_metro}
                      </button>
                    </div>

                    <div className="sm:text-right">
                      <div className="font-heading text-lg font-extrabold text-ink-900">
                        {formatMoney(app.job_pay_amount)}
                      </div>
                      <div className="text-xs text-emerald-700 font-medium">
                        {getPayoutLabel(app.job_payout_type)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {(app.status === 'accepted' || app.status === 'completed') &&
                        app.employer_phone && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(app.employer_phone).catch(() => {});
                            }}
                            title="Нажмите, чтобы скопировать телефон"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-soft text-xs font-semibold text-ink-900"
                          >
                            <Phone className="w-3.5 h-3.5 text-brand-600" />
                            {app.employer_phone}
                          </button>
                        )}

                      <button
                        type="button"
                        onClick={() => setOpenChatId(openChatId === app.id ? null : app.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-soft text-xs font-semibold text-ink-900 hover:bg-gray-200/70"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                        Чат с заказчиком ({app.messages.length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.status === 'completed' && !app.has_my_review && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenReview({
                              jobId: app.job_id,
                              applicationId: app.id,
                              targetUserId: app.employer_id,
                              targetName: app.employer_company,
                              jobTitle: app.job_title,
                              isReviewingEmployer: true,
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          Оценить заказчика
                        </button>
                      )}

                      {app.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdateAppStatus(app.id, 'cancelled')}
                          className="text-xs font-semibold text-ink-400 hover:text-red-600 px-2 py-1"
                        >
                          Отозвать
                        </button>
                      )}
                    </div>
                  </div>

                  {openChatId === app.id && (
                    <div className="border-t border-gray-100 pt-3 space-y-2.5">
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {app.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-xl px-3 py-2 text-xs max-w-[85%] ${
                              m.sender_id === me.id
                                ? 'ml-auto bg-brand-600 text-white'
                                : 'bg-surface-soft text-ink-900'
                            }`}
                          >
                            <div className="font-bold opacity-80 text-[10px] mb-0.5">
                              {m.sender_name}
                            </div>
                            {m.body}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => handleChatSubmit(e, app.id)} className="flex gap-2">
                        <input
                          type="text"
                          value={draftMessages[app.id] || ''}
                          onChange={(e) =>
                            setDraftMessages((prev) => ({ ...prev, [app.id]: e.target.value }))
                          }
                          placeholder="Написать работодателю..."
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-600"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {workerTab === 'favorites' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {favoriteJobs.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-gray-200 p-10 text-center text-sm text-ink-500">
              Нажмите на сердечко в любой карточке подработки, чтобы сохранить её здесь.
            </div>
          ) : (
            favoriteJobs.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                onSelect={onSelectJob}
                onToggleFavorite={onToggleFavorite}
                onOpenProfile={(_e, uid) => onOpenProfile(uid)}
              />
            ))
          )}
        </div>
      )}

      {workerTab === 'income' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-ink-900">Учёт прямых выплат за смены</h3>
              <p className="text-xs text-ink-500">
                Сервис не удерживает комиссию с рабочих — вы получаете 100% суммы напрямую от заказчика
              </p>
            </div>
            <Wallet className="w-6 h-6 text-brand-600 shrink-0" />
          </div>

          <div className="divide-y divide-gray-100">
            {applications
              .filter((a) => a.status === 'completed')
              .map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-ink-900">{a.job_title}</div>
                    <div className="text-xs text-ink-500">
                      {a.employer_company} · {getPayoutLabel(a.job_payout_type)}
                    </div>
                  </div>
                  <div className="font-heading font-bold text-emerald-600">
                    +{formatMoney(a.job_pay_amount)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
