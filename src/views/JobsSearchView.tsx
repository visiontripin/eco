import React, { useMemo, useState } from 'react';
import {
  Search,
  LocateFixed,
  SlidersHorizontal,
  RotateCcw,
  Heart,
  X,
} from 'lucide-react';
import { JobItem, LocationItem } from '../types';
import { JOB_CATEGORIES } from '../lib/api';
import { JobCard } from '../components/JobCard';

interface JobsSearchViewProps {
  jobs: JobItem[];
  locations: LocationItem[];
  initialCategory: string;
  initialArea: 'all' | 'moscow' | 'mo';
  onSelectJob: (job: JobItem) => void;
  onToggleFavorite: (e: React.MouseEvent, job: JobItem) => void;
  onOpenProfile: (e: React.MouseEvent, userId: number) => void;
  userHomeStation?: string;
}

export const JobsSearchView: React.FC<JobsSearchViewProps> = ({
  jobs,
  locations,
  initialCategory,
  initialArea,
  onSelectJob,
  onToggleFavorite,
  onOpenProfile,
  userHomeStation,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(initialCategory || 'all');
  const [areaType, setAreaType] = useState<'all' | 'moscow' | 'mo'>(initialArea || 'all');
  const [station, setStation] = useState<string>('all');
  const [minPay, setMinPay] = useState<number>(0);
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');
  const [payoutFilter, setPayoutFilter] = useState<string>('all');
  const [noExperience, setNoExperience] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'pay_desc' | 'urgent' | 'rating'>('recommended');
  const [showGeoModal, setShowGeoModal] = useState(false);

  React.useEffect(() => {
    setCategory(initialCategory || 'all');
  }, [initialCategory]);

  React.useEffect(() => {
    setAreaType(initialArea || 'all');
  }, [initialArea]);

  const filteredJobs = useMemo(() => {
    const now = new Date();
    const fmt = (offset: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    };
    const todayStr = fmt(0);
    const tomorrowStr = fmt(1);
    const upcomingStr = fmt(2);

    const q = query.trim().toLowerCase();

    const list = jobs.filter((j) => {
      if (category !== 'all' && j.category !== category) return false;
      if (areaType !== 'all' && j.area_type !== areaType) return false;
      if (station !== 'all' && j.metro_station !== station) return false;
      if (minPay > 0 && j.pay_amount < minPay) return false;
      if (payoutFilter !== 'all' && j.payout_type !== payoutFilter) return false;
      if (noExperience && j.experience_required) return false;
      if (verifiedOnly && !j.employer_verified) return false;
      if (favoritesOnly && !j.is_favorite) return false;

      if (datePreset === 'today' && j.shift_date !== todayStr) return false;
      if (datePreset === 'tomorrow' && j.shift_date !== tomorrowStr) return false;
      if (datePreset === 'upcoming' && j.shift_date < upcomingStr) return false;

      if (q) {
        const hay = `${j.title} ${j.category} ${j.city} ${j.metro_station} ${j.address} ${j.employer_company}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'pay_desc') {
      return [...list].sort((a, b) => b.pay_amount - a.pay_amount);
    }
    if (sortBy === 'urgent') {
      return [...list].sort(
        (a, b) => Number(b.is_urgent) - Number(a.is_urgent) || a.shift_date.localeCompare(b.shift_date)
      );
    }
    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.employer_rating - a.employer_rating || b.pay_amount - a.pay_amount);
    }
    return list;
  }, [
    jobs,
    query,
    category,
    areaType,
    station,
    minPay,
    payoutFilter,
    noExperience,
    verifiedOnly,
    favoritesOnly,
    datePreset,
    sortBy,
  ]);

  const activeFiltersCount = [
    category !== 'all',
    areaType !== 'all',
    station !== 'all',
    minPay > 0,
    datePreset !== 'all',
    payoutFilter !== 'all',
    noExperience,
    verifiedOnly,
    favoritesOnly,
    query.trim() !== '',
  ].filter(Boolean).length;

  const resetAll = () => {
    setQuery('');
    setCategory('all');
    setAreaType('all');
    setStation('all');
    setMinPay(0);
    setDatePreset('all');
    setPayoutFilter('all');
    setNoExperience(false);
    setVerifiedOnly(false);
    setFavoritesOnly(false);
    setSortBy('recommended');
  };

  return (
    <div className="space-y-4 pb-6 animate-enter">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-900">
            Подработки
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-0.5">
            Найдено {filteredJobs.length} смен по Москве и Московской области
          </p>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Search Bar + Metro/MO Quick Geo Picker (Elevated from Screenshot 2) */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: склад, курьер, Автозаводская, Химки..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-9 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowGeoModal(true)}
          title="Выбрать станцию метро или город МО"
          className={`px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold shrink-0 transition-all shadow-sm ${
            station !== 'all' || areaType !== 'all'
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-ink-900 hover:border-brand-400'
          }`}
        >
          <LocateFixed className="w-4 h-4 text-brand-600" />
          <span className="hidden sm:inline">
            {station !== 'all'
              ? station
              : areaType === 'moscow'
              ? 'Москва'
              : areaType === 'mo'
              ? 'Область (МО)'
              : 'Метро / МО'}
          </span>
        </button>
      </div>

      {/* Category Pills WITHOUT ugly browser scrollbar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-bold shrink-0 transition-colors ${
            category === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-ink-900 border border-gray-200 hover:border-brand-300'
          }`}
        >
          Все
        </button>
        {JOB_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat === category ? 'all' : cat)}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-semibold shrink-0 transition-colors ${
              category === cat
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-ink-900 border border-gray-200 hover:border-brand-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Compact Smart Filter Selects + Quick Toggle Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={minPay}
          onChange={(e) => setMinPay(Number(e.target.value))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 focus:outline-none focus:border-brand-600"
        >
          <option value={0}>Любая оплата</option>
          <option value={4000}>от 4 000 ₽ / смена</option>
          <option value={5000}>от 5 000 ₽ / смена</option>
          <option value={6000}>от 6 000 ₽ / смена</option>
        </select>

        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value as any)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 focus:outline-none focus:border-brand-600"
        >
          <option value="all">Любая дата</option>
          <option value="today">На сегодня</option>
          <option value="tomorrow">На завтра</option>
          <option value="upcoming">Ближайшие дни</option>
        </select>

        <select
          value={payoutFilter}
          onChange={(e) => setPayoutFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 focus:outline-none focus:border-brand-600"
        >
          <option value="all">Любая выплата</option>
          <option value="sbp_instant">СБП сразу</option>
          <option value="cash_end_shift">На руки</option>
          <option value="smz_card">На карту СМЗ</option>
        </select>

        <button
          type="button"
          onClick={() => setNoExperience(!noExperience)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            noExperience
              ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
              : 'bg-white border-gray-200 text-ink-700'
          }`}
        >
          Без опыта
        </button>

        <button
          type="button"
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            verifiedOnly
              ? 'bg-brand-50 border-brand-400 text-brand-700'
              : 'bg-white border-gray-200 text-ink-700'
          }`}
        >
          Проверенные ★
        </button>

        <button
          type="button"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            favoritesOnly
              ? 'bg-brand-50 border-brand-400 text-brand-700'
              : 'bg-white border-gray-200 text-ink-700'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-brand-600 text-brand-600' : ''}`} />
          Избранные
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-ink-400 hidden sm:block" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-surface-soft px-3 py-2 text-xs font-semibold text-ink-700 focus:outline-none focus:border-brand-600"
          >
            <option value="recommended">Рекомендуемые</option>
            <option value="pay_desc">Высокая ставка</option>
            <option value="urgent">Сначала срочные</option>
            <option value="rating">По рейтингу заказчика</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-surface-soft/50 p-10 text-center space-y-3">
          <p className="text-sm font-medium text-ink-500">
            По заданным параметрам смены не найдены. Попробуйте смягчить фильтры.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="px-5 py-2.5 rounded-2xl bg-brand-600 text-white text-xs font-bold shadow-brand"
          >
            Показать все открытые подработки ({jobs.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {filteredJobs.map((job) => (
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

      {/* Metro / Moscow Oblast Geo Modal */}
      {showGeoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => setShowGeoModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto shadow-elevated animate-enter space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-ink-900">
                  Локация: Москва и МО
                </h3>
                <p className="text-xs text-ink-500">
                  Выберите зону или ближайшую станцию метро / МЦД
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGeoModal(false)}
                className="p-2 rounded-full bg-gray-100 text-ink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userHomeStation && (
              <button
                type="button"
                onClick={() => {
                  setAreaType('all');
                  setStation(userHomeStation);
                  setShowGeoModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-between hover:bg-brand-100"
              >
                <span>Рядом с моим домом: {userHomeStation}</span>
                <span>Выбрать →</span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              {[
                { id: 'all', label: 'Москва + МО' },
                { id: 'moscow', label: 'Только Москва' },
                { id: 'mo', label: 'Московская обл.' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAreaType(item.id as any);
                    setStation('all');
                  }}
                  className={`py-2.5 rounded-xl border ${
                    areaType === item.id && station === 'all'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface-soft text-ink-700 border-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                Станции метро и МЦД Подмосковья
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {locations
                  .filter((l) => areaType === 'all' || l.area_type === areaType)
                  .map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setStation(loc.station_name === station ? 'all' : loc.station_name);
                        setShowGeoModal(false);
                      }}
                      className={`px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between ${
                        station === loc.station_name
                          ? 'border-brand-600 bg-brand-50 font-bold text-brand-800'
                          : 'border-gray-100 hover:bg-gray-50 text-ink-900'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: loc.line_color }}
                        />
                        <span className="truncate">{loc.station_name}</span>
                      </span>
                      <span className="text-[11px] text-ink-400 shrink-0 pl-1">{loc.city_name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
