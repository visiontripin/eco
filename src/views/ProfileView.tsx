import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, LogOut, Check } from 'lucide-react';
import { LocationItem, UserProfile } from '../types';
import { JOB_CATEGORIES, getRoleLabel } from '../lib/api';

interface ProfileViewProps {
  me: UserProfile;
  locations: LocationItem[];
  onSaveProfile: (payload: any) => Promise<void>;
  onOpenMyPublicProfile: () => void;
  onOpenAuthModal: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  me,
  locations,
  onSaveProfile,
  onOpenMyPublicProfile,
  onOpenAuthModal,
}) => {
  const [name, setName] = useState(me.name);
  const [companyName, setCompanyName] = useState(me.company_name);
  const [phone, setPhone] = useState(me.phone);
  const [bio, setBio] = useState(me.bio);
  const [metroStation, setMetroStation] = useState(me.metro_station || 'Автозаводская');
  const [skills, setSkills] = useState<string[]>(me.skills || []);
  const [hasMedBook, setHasMedBook] = useState(me.has_med_book);
  const [isSelfEmployed, setIsSelfEmployed] = useState(me.is_self_employed);
  const [nightShiftsOk, setNightShiftsOk] = useState(me.night_shifts_ok);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(me.name);
    setCompanyName(me.company_name);
    setPhone(me.phone);
    setBio(me.bio);
    setMetroStation(me.metro_station || 'Автозаводская');
    setSkills(me.skills || []);
    setHasMedBook(me.has_med_book);
    setIsSelfEmployed(me.is_self_employed);
    setNightShiftsOk(me.night_shifts_ok);
  }, [me]);

  const toggleSkill = (cat: string) => {
    setSkills((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedLoc = locations.find((l) => l.station_name === metroStation);
      await onSaveProfile({
        name,
        company_name: companyName,
        phone,
        bio,
        city: selectedLoc?.city_name || me.city,
        metro_station: metroStation,
        skills,
        has_med_book: hasMedBook,
        is_self_employed: isSelfEmployed,
        night_shifts_ok: nightShiftsOk,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8 animate-enter">
      {/* Header matching & elevating Screenshot 3 */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-heading text-xl font-bold flex items-center justify-center shrink-0 shadow-brand">
          {(me.company_name || me.name).slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-900">
              Профиль
            </h1>
            {me.is_verified && <ShieldCheck className="w-5 h-5 text-brand-600" />}
          </div>
          <p className="text-sm text-ink-500 mt-0.5">
            {me.email} · {getRoleLabel(me.role)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900 mb-1.5">Имя</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-brand-600"
          />
        </div>

        {me.role === 'employer' && (
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1.5">
              Название компании или бренда
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-brand-600"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1.5">Телефон</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1.5">
              Домашняя станция / город МО
            </label>
            <select
              value={metroStation}
              onChange={(e) => setMetroStation(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-brand-600"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.station_name}>
                  {loc.station_name} ({loc.city_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Worker Readiness & Skills */}
        {me.role === 'worker' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-2">
                Предпочитаемые категории смен
              </label>
              <div className="flex flex-wrap gap-2">
                {JOB_CATEGORIES.map((cat) => {
                  const selected = skills.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleSkill(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        selected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-ink-700 border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {[
                { label: 'Самозанятый (СМЗ)', val: isSelfEmployed, set: setIsSelfEmployed },
                { label: 'Есть медкнижка', val: hasMedBook, set: setHasMedBook },
                { label: 'Вечерние / ночные', val: nightShiftsOk, set: setNightShiftsOk },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
                    item.val
                      ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900'
                      : 'border-gray-200 bg-surface-soft text-ink-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.val && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-ink-900 mb-1.5">
            {me.role === 'employer' ? 'О компании и условиях для сменщиков' : 'О себе'}
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Расскажите коротко об опыте, пунктуальности и удобном графике..."
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:border-brand-600"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand transition-all"
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>

      {/* Bottom links matching Screenshot 3 ("Мой публичный профиль" & "Выйти / Сменить аккаунт") */}
      <div className="flex items-center justify-between pt-2 text-sm">
        <button
          type="button"
          onClick={onOpenMyPublicProfile}
          className="font-semibold text-brand-600 hover:underline inline-flex items-center gap-1.5"
        >
          Мой публичный профиль
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenAuthModal}
          className="text-ink-500 hover:text-ink-900 font-medium inline-flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          Сменить аккаунт / Выйти
        </button>
      </div>
    </div>
  );
};
