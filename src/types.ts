export type UserRole = 'worker' | 'employer' | 'admin';

export type PayoutType = 'sbp_instant' | 'cash_end_shift' | 'smz_card' | 'weekly';

export type ApplicationStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled';

export interface Region {
  id: number;
  country_code: string;
  country_name: string;
  slug: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  locale: string;
  is_active: number;
  jobs_count?: number;
}

export interface LocationItem {
  id: number;
  region_id: number;
  area_type: 'moscow' | 'mo';
  city_name: string;
  station_name: string;
  line_name: string;
  line_color: string;
  lat: number;
  lng: number;
}

export interface Tariff {
  id: number;
  slug: string;
  title: string;
  target_role: 'worker' | 'employer';
  price_rub: number;
  limit_value: number | null; // null = unlimited
  description: string;
  perks: string[];
}

export interface UserProfile {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  company_name: string;
  phone: string;
  bio: string;
  city: string;
  metro_station: string;
  skills: string[];
  has_med_book: boolean;
  is_self_employed: boolean;
  night_shifts_ok: boolean;
  is_verified: boolean;
  tariff_slug: string;
  tariff_title?: string;
  tariff_limit?: number | null;
  today_applications_used?: number;
  active_jobs_used?: number;
  earned_total: number;
  shifts_completed: number;
  show_up_rate: number;
  rating_avg: number;
  reviews_count: number;
  created_at: string;
}

export interface JobItem {
  id: number;
  employer_id: number;
  region_id: number;
  area_type: 'moscow' | 'mo';
  title: string;
  category: string;
  city: string;
  metro_station: string;
  metro_color: string;
  walk_minutes: number;
  address: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pay_amount: number;
  currency_symbol: string;
  payout_type: PayoutType;
  slots_total: number;
  slots_filled: number;
  experience_required: boolean;
  med_book_required: boolean;
  smz_preferred: boolean;
  meal_included: boolean;
  is_urgent: boolean;
  is_promoted: boolean;
  description: string;
  requirements: string[];
  status: 'active' | 'paused' | 'closed';
  created_at: string;
  employer_name: string;
  employer_company: string;
  employer_verified: boolean;
  employer_rating: number;
  employer_reviews_count: number;
  is_favorite?: boolean;
  my_application_id?: number | null;
  my_application_status?: ApplicationStatus | null;
  applications_count?: number;
  pending_applications_count?: number;
}

export interface MessageItem {
  id: number;
  application_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: UserRole;
  body: string;
  created_at: string;
}

export interface ApplicationItem {
  id: number;
  job_id: number;
  worker_id: number;
  cover_note: string;
  status: ApplicationStatus;
  payout_recorded: boolean;
  created_at: string;
  updated_at: string;
  // Job summary
  job_title: string;
  job_category: string;
  job_city: string;
  job_metro: string;
  job_metro_color: string;
  job_date: string;
  job_start_time: string;
  job_end_time: string;
  job_pay_amount: number;
  job_payout_type: PayoutType;
  employer_id: number;
  employer_name: string;
  employer_company: string;
  employer_phone: string;
  employer_verified: boolean;
  // Worker summary (for employer funnel)
  worker_name: string;
  worker_phone: string;
  worker_city: string;
  worker_metro: string;
  worker_skills: string[];
  worker_has_med_book: boolean;
  worker_is_self_employed: boolean;
  worker_shifts_completed: number;
  worker_show_up_rate: number;
  worker_rating: number;
  worker_reviews_count: number;
  worker_tariff_slug: string;
  has_my_review?: boolean;
  messages: MessageItem[];
}

export interface ReviewItem {
  id: number;
  job_id: number;
  job_title?: string;
  application_id: number | null;
  author_id: number;
  author_name: string;
  author_company?: string;
  author_role: UserRole;
  target_user_id: number;
  target_name?: string;
  target_company?: string;
  target_role?: UserRole;
  rating: number;
  punctuality_ok: boolean;
  paid_on_time: boolean;
  comment: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: 'application' | 'status' | 'review' | 'system' | 'message';
  title: string;
  body: string;
  target_tab: string;
  is_read: boolean;
  created_at: string;
}

export interface PlatformStats {
  open_jobs_count: number;
  open_slots_count: number;
  avg_shift_pay: number;
  verified_employers_count: number;
  pending_reviews_count: number;
  total_users_count: number;
}
