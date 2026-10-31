import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Briefcase,
  Home,
  Search,
  Shield,
  User,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  ApplicationItem,
  JobItem,
  LocationItem,
  NotificationItem,
  PlatformStats,
  Tariff,
  UserProfile,
  UserRole,
} from './types';
import { apiFetch, getRoleLabel, setSavedUserId } from './lib/api';
import { HomeView } from './views/HomeView';
import { JobsSearchView } from './views/JobsSearchView';
import { CabinetView } from './views/CabinetView';
import { AdminView } from './views/AdminView';
import { ProfileView } from './views/ProfileView';
import { JobDetailModal } from './components/JobDetailModal';
import { CreateJobModal } from './components/CreateJobModal';
import {
  AuthSwitcherModal,
  NotificationsModal,
  PublicProfileModal,
  ReviewModal,
  TariffModal,
} from './components/Modals';

type ActiveTab = 'home' | 'jobs' | 'cabinet' | 'admin' | 'profile';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchInitCat, setSearchInitCat] = useState<string>('all');
  const [searchInitArea, setSearchInitArea] = useState<'all' | 'moscow' | 'mo'>('all');

  const [me, setMe] = useState<UserProfile | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<
    { id: number; name: string; company_name: string; role: UserRole; email: string }[]
  >([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [employerJobs, setEmployerJobs] = useState<JobItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [publicProfileId, setPublicProfileId] = useState<number | null>(null);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showTariffs, setShowTariffs] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    jobId: number;
    applicationId: number;
    targetUserId: number;
    targetName: string;
    jobTitle: string;
    isReviewingEmployer: boolean;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [boot, jobsRes, appsRes] = await Promise.all([
        apiFetch('/api/bootstrap'),
        apiFetch('/api/jobs'),
        apiFetch('/api/applications'),
      ]);

      setMe(boot.me);
      setDemoAccounts(boot.demoAccounts || []);
      setTariffs(boot.tariffs || []);
      setLocations(boot.locations || []);
      setStats(boot.stats || null);
      setNotifications(boot.notifications || []);
      setJobs(jobsRes.jobs || []);
      setApplications(appsRes.applications || []);

      if (boot.me?.role === 'employer') {
        const empRes = await apiFetch(
          `/api/jobs?employer_id=${boot.me.id}&include_inactive=1`
        );
        setEmployerJobs(empRes.jobs || []);
      } else {
        setEmployerJobs([]);
      }

      setSelectedJob((cur) => {
        if (!cur) return null;
        return (jobsRes.jobs || []).find((j: JobItem) => j.id === cur.id) || cur;
      });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleSwitchUser = async (userId: number) => {
    setSavedUserId(userId);
    await refreshAll();
    const target = demoAccounts.find((a) => a.id === userId);
    if (target?.role === 'admin') {
      setActiveTab('admin');
    } else if (target?.role === 'employer') {
      setActiveTab('cabinet');
    }
    showToast(`Активен профиль: ${target?.company_name || target?.name || 'Пользователь'}`);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, job: JobItem) => {
    e.stopPropagation();
    const res = await apiFetch(`/api/jobs/${job.id}/favorite`, { method: 'POST' });
    setJobs((prev) =>
      prev.map((item) => (item.id === job.id ? { ...item, is_favorite: res.is_favorite } : item))
    );
    setSelectedJob((prev) =>
      prev && prev.id === job.id ? { ...prev, is_favorite: res.is_favorite } : prev
    );
    showToast(res.is_favorite ? 'Смена сохранена в избранное' : 'Убрано из избранного');
  };

  const handleApplyToJob = async (jobId: number, coverNote: string) => {
    try {
      await apiFetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ cover_note: coverNote }),
      });
      await refreshAll();
      setSelectedJob(null);
      showToast('Отклик отправлен! Работодатель получит уведомление.');
    } catch (err: any) {
      if (err.code === 'TARIFF_LIMIT') {
        setSelectedJob(null);
        setShowTariffs(true);
      }
      showToast(err.message);
    }
  };

  const handleNeedPeopleClick = async () => {
    if (me?.role === 'employer') {
      setShowCreateJob(true);
      return;
    }
    // Switch seamlessly to Employer profile or let user open Create Job right away
    setSavedUserId(2);
    await refreshAll();
    setActiveTab('cabinet');
    setShowCreateJob(true);
    showToast('Включён режим Работодателя — разместите новую смену');
  };

  const handleCreateJob = async (payload: any) => {
    try {
      await apiFetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshAll();
      showToast('Подработка опубликована и уже видна исполнителям!');
    } catch (err: any) {
      if (err.code === 'TARIFF_LIMIT') {
        setShowTariffs(true);
      }
      showToast(err.message);
    }
  };

  const handleUpdateAppStatus = async (
    appId: number,
    status: 'accepted' | 'rejected' | 'completed' | 'cancelled'
  ) => {
    await apiFetch(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshAll();
    const msgMap = {
      accepted: 'Кандидат принят в смену!',
      rejected: 'Кандидату отправлен отказ',
      completed: 'Смена успешно закрыта, выплата учтена!',
      cancelled: 'Ваш отклик отозван',
    };
    showToast(msgMap[status]);
  };

  const handleSendMessage = async (appId: number, body: string) => {
    await apiFetch(`/api/applications/${appId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    await refreshAll();
  };

  const handleSubmitReview = async (payload: any) => {
    await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshAll();
    showToast('Спасибо! Отзыв отправлен на модерацию.');
  };

  const handleSelectTariff = async (slug: string) => {
    await apiFetch('/api/me/tariff', {
      method: 'PUT',
      body: JSON.stringify({ tariff_slug: slug }),
    });
    await refreshAll();
    showToast('Тариф успешно обновлён!');
  };

  const handleSaveProfile = async (payload: any) => {
    await apiFetch('/api/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await refreshAll();
    showToast('Изменения профиля сохранены');
  };

  const handleCloneJob = async (jobId: number) => {
    try {
      await apiFetch(`/api/jobs/${jobId}/clone`, { method: 'POST' });
      await refreshAll();
      showToast('Копия смены создана на завтра');
    } catch (err: any) {
      if (err.code === 'TARIFF_LIMIT') setShowTariffs(true);
      showToast(err.message);
    }
  };

  const handleToggleJobPause = async (job: JobItem) => {
    const nextStatus = job.status === 'active' ? 'paused' : 'active';
    await apiFetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await refreshAll();
    showToast(nextStatus === 'active' ? 'Показ вакансии возобновлён' : 'Вакансия поставлена на паузу');
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* STICKY HEADER (Matching & Elevating Screenshots 1–5) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="font-heading text-lg sm:text-xl font-extrabold tracking-tight text-ink-900 flex items-center shrink-0"
          >
            <span>Подработка.</span>
            <span className="text-brand-600">МСК</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-soft p-1 rounded-2xl">
            {[
              { id: 'home', label: 'Главная' },
              { id: 'jobs', label: 'Поиск смен' },
              { id: 'cabinet', label: 'Кабинет' },
              {
                id: 'admin',
                label:
                  stats && stats.pending_reviews_count > 0
                    ? `Модерация (${stats.pending_reviews_count})`
                    : 'Модерация',
              },
              { id: 'profile', label: 'Профиль' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === item.id
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-ink-700 hover:text-ink-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Controls: Quick Role Pill + Notification Bell */}
          <div className="flex items-center gap-2">
            {me && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-full bg-surface-soft hover:bg-brand-50 border border-gray-200/80 text-xs font-bold text-ink-900 flex items-center gap-1.5 transition-colors"
                title="Переключить роль (Рабочий / Работодатель / Модератор) или сменить аккаунт"
              >
                <Users className="w-3.5 h-3.5 text-brand-600" />
                <span className="max-w-[110px] truncate">{getRoleLabel(me.role)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Уведомления"
              className="relative p-2.5 rounded-full hover:bg-surface-soft text-ink-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center absolute top-1 right-1">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-5 pb-24 md:pb-12">
        {initialLoading || !me ? (
          <div className="py-20 text-center text-sm text-ink-400">
            Загружаем смены в Москве и Московской области...
          </div>
        ) : activeTab === 'home' ? (
          <HomeView
            jobs={jobs}
            stats={stats}
            onGoSearch={(cat = 'all', area = 'all') => {
              setSearchInitCat(cat);
              setSearchInitArea(area);
              setActiveTab('jobs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNeedPeople={handleNeedPeopleClick}
            onSelectJob={(job) => setSelectedJob(job)}
            onToggleFavorite={handleToggleFavorite}
            onOpenProfile={(e, uid) => {
              e.stopPropagation();
              setPublicProfileId(uid);
            }}
          />
        ) : activeTab === 'jobs' ? (
          <JobsSearchView
            jobs={jobs}
            locations={locations}
            initialCategory={searchInitCat}
            initialArea={searchInitArea}
            userHomeStation={me.metro_station}
            onSelectJob={(job) => setSelectedJob(job)}
            onToggleFavorite={handleToggleFavorite}
            onOpenProfile={(e, uid) => {
              e.stopPropagation();
              setPublicProfileId(uid);
            }}
          />
        ) : activeTab === 'cabinet' ? (
          <CabinetView
            me={me}
            applications={applications}
            allJobs={jobs}
            employerJobs={employerJobs}
            onOpenTariffs={() => setShowTariffs(true)}
            onOpenCreateJob={() => setShowCreateJob(true)}
            onGoSearch={() => setActiveTab('jobs')}
            onSelectJob={(job) => setSelectedJob(job)}
            onToggleFavorite={handleToggleFavorite}
            onOpenProfile={(uid) => setPublicProfileId(uid)}
            onUpdateAppStatus={handleUpdateAppStatus}
            onSendMessage={handleSendMessage}
            onOpenReview={(target) => setReviewTarget(target)}
            onCloneJob={handleCloneJob}
            onToggleJobPause={handleToggleJobPause}
          />
        ) : activeTab === 'admin' ? (
          <AdminView onDataChanged={refreshAll} showToast={showToast} />
        ) : (
          <ProfileView
            me={me}
            locations={locations}
            onSaveProfile={handleSaveProfile}
            onOpenMyPublicProfile={() => setPublicProfileId(me.id)}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Matching Screenshots 1–5 + Home access) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {[
            { id: 'home', label: 'Главная', icon: Home },
            { id: 'jobs', label: 'Поиск', icon: Search },
            { id: 'cabinet', label: 'Кабинет', icon: Briefcase },
            {
              id: 'admin',
              label: 'Модерация',
              icon: Shield,
              badge: stats?.pending_reviews_count || 0,
            },
            { id: 'profile', label: 'Профиль', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                  active ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" strokeWidth={active ? 2.4 : 1.9} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center absolute top-0.5 right-3">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODALS & DRAWERS */}
      <JobDetailModal
        job={selectedJob}
        me={me}
        onClose={() => setSelectedJob(null)}
        onApply={handleApplyToJob}
        onToggleFavorite={handleToggleFavorite}
        onOpenProfile={(uid) => setPublicProfileId(uid)}
      />

      <CreateJobModal
        open={showCreateJob}
        locations={locations}
        onClose={() => setShowCreateJob(false)}
        onCreate={handleCreateJob}
      />

      <PublicProfileModal
        userId={publicProfileId}
        onClose={() => setPublicProfileId(null)}
      />

      <TariffModal
        open={showTariffs}
        me={me}
        tariffs={tariffs}
        onClose={() => setShowTariffs(false)}
        onSelectTariff={handleSelectTariff}
      />

      <ReviewModal
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSubmit={handleSubmitReview}
      />

      <NotificationsModal
        open={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onMarkAllRead={handleMarkNotificationsRead}
        onNavigateTab={(tab) => setActiveTab((tab as ActiveTab) || 'cabinet')}
      />

      <AuthSwitcherModal
        open={showAuthModal}
        me={me}
        demoAccounts={demoAccounts}
        onClose={() => setShowAuthModal(false)}
        onSwitchUser={handleSwitchUser}
        onAuthSuccess={handleSwitchUser}
      />

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-ink-900 text-white text-xs sm:text-sm font-semibold shadow-elevated flex items-center gap-2 animate-enter max-w-[92vw]">
          <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
