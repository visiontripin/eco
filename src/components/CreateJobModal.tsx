import React, { useState } from 'react';
import { X, PlusCircle, Sparkles } from 'lucide-react';
import { LocationItem, PayoutType } from '../types';
import { JOB_CATEGORIES } from '../lib/api';

interface CreateJobModalProps {
  open: boolean;
  locations: LocationItem[];
  onClose: () => void;
  onCreate: (payload: any) => Promise<void>;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  open,
  locations,
  onClose,
  onCreate,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Склад');
  const [metroStation, setMetroStation] = useState<string>(
    locations[0]?.station_name || 'Автозаводская'
  );
  const [address, setAddress] = useState('');
  const [walkMinutes, setWalkMinutes] = useState(7);
  const [shiftDate, setShiftDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [payAmount, setPayAmount] = useState(4800);
  const [payoutType, setPayoutType] = useState<PayoutType>('sbp_instant');
  const [slotsTotal, setSlotsTotal] = useState(4);
  const [experienceRequired, setExperienceRequired] = useState(false);
  const [medBookRequired, setMedBookRequired] = useState(false);
  const [mealIncluded, setMealIncluded] = useState(true);
  const [isUrgent, setIsUrgent] = useState(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const selectedLoc = locations.find((l) => l.station_name === metroStation);

  const calcHours = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let diff = eh + em / 60 - (sh + sm / 60);
    if (diff <= 0) diff += 24;
    return Math.max(2, Math.round(diff * 2) / 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reqs: string[] = [];
      if (!experienceRequired) reqs.push('Без опыта — инструктаж на месте');
      if (medBookRequired) reqs.push('Действующая медкнижка');
      if (mealIncluded) reqs.push('Бесплатное питание на смене');
      reqs.push('Паспорт РФ / ЕАЭС');

      await onCreate({
        title,
        category,
        area_type: selectedLoc?.area_type || 'moscow',
        city: selectedLoc?.city_name || 'Москва',
        metro_station: metroStation,
        walk_minutes: walkMinutes,
        address,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        duration_hours: calcHours(),
        pay_amount: Number(payAmount),
        payout_type: payoutType,
        slots_total: Number(slotsTotal),
        experience_required: experienceRequired,
        med_book_required: medBookRequired,
        smz_preferred: payoutType === 'smz_card' || payoutType === 'sbp_instant',
        meal_included: mealIncluded,
        is_urgent: isUrgent,
        description:
          description.trim() ||
          'Понятные задачи на смене, тёплое помещение и своевременный расчёт сразу после сдачи смены бригадиру.',
        requirements: reqs,
      });
      setTitle('');
      setAddress('');
      setDescription('');
      onClose();
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
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-ink-900">Разместить подработку</h2>
            <p className="text-xs text-ink-500">Москва и Московская область · прямые расчёты</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-ink-700 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Название смены *
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Сборщик заказов на вечернюю смену"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 bg-white focus:outline-none focus:border-brand-600"
              >
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Метро / МЦД / Город МО
              </label>
              <select
                value={metroStation}
                onChange={(e) => setMetroStation(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 bg-white focus:outline-none focus:border-brand-600"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.station_name}>
                    {loc.station_name} ({loc.city_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-700 mb-1">Точный адрес *</label>
              <input
                required
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ул. Автозаводская, д. 23"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Пешком, мин</label>
              <input
                type="number"
                min={1}
                max={45}
                value={walkMinutes}
                onChange={(e) => setWalkMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Дата смены *</label>
              <input
                required
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Начало</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Окончание</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Оплата за смену, ₽
              </label>
              <input
                required
                type="number"
                min={1000}
                step={100}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Способ прямой выплаты
              </label>
              <select
                value={payoutType}
                onChange={(e) => setPayoutType(e.target.value as PayoutType)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none focus:border-brand-600"
              >
                <option value="sbp_instant">СБП сразу после смены</option>
                <option value="cash_end_shift">На руки в конце смены</option>
                <option value="smz_card">На карту СМЗ (+чек)</option>
                <option value="weekly">Раз в неделю</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Нужно людей, чел.
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 font-bold focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: 'Срочный набор сегодня/завтра', active: isUrgent, toggle: () => setIsUrgent(!isUrgent) },
              { label: 'Питание на смене', active: mealIncluded, toggle: () => setMealIncluded(!mealIncluded) },
              { label: 'Нужна медкнижка', active: medBookRequired, toggle: () => setMedBookRequired(!medBookRequired) },
              { label: 'Нужен опыт', active: experienceRequired, toggle: () => setExperienceRequired(!experienceRequired) },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.toggle}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  chip.active
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface-soft text-ink-700 border-gray-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Описание задач и как пройти на объект
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите задачи, форму одежды и контакт старшего смены..."
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="rounded-xl bg-brand-50/70 px-3.5 py-2.5 text-xs text-brand-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Расчётная ставка для исполнителя:
            </span>
            <strong>{Math.round(payAmount / calcHours())} ₽/час ({calcHours()} ч)</strong>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand flex items-center justify-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            {submitting ? 'Публикуем смену...' : 'Опубликовать подработку'}
          </button>
        </form>
      </div>
    </div>
  );
};
