// Hand-written row types for the tables this app touches.
// Source of truth: supabase/migrations/0001..0006. Keep in step with them.

export type JobStatus = "active" | "on_hold" | "complete" | "archived";
export const JOB_STATUSES: readonly JobStatus[] = ["active", "on_hold", "complete", "archived"];

export type TaskKind = "task" | "folder";

/** One checklist line inside tasks.subitems (jsonb). */
export type Subitem = {
  id: string;
  text: string;
  done: boolean;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  completed_at?: string | null;
};

/** jobs.progress values: legacy numbers or {material, labour} percentages. */
export type ProgressEntry = { material: number; labour: number };
export type ProgressMap = Record<string, ProgressEntry | number>;

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  job_number: string | null;
  job_name: string;
  client: string | null;
  location: string | null;
  start_date: string | null;
  target_date: string | null;
  notes: string | null;
  status: JobStatus;
  enabled_categories: string[] | null;
  progress: ProgressMap | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  job_id: string | null;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  job_id: string | null;
  kind: TaskKind;
  text: string;
  note: string | null;
  due_date: string | null;
  assignee_id: string | null;
  done: boolean;
  completed_at: string | null;
  subitems: Subitem[] | null;
  expanded: boolean | null;
  created_by: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  job_id: string | null;
  service_call_id: string | null;
  user_id: string | null;
  user_name: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

export type OrgSettings = {
  id: boolean;
  company_name: string;
  company_short: string;
  legal_name: string | null;
  logo_path: string | null;
  color_primary: string;
  color_secondary: string;
  timezone: string;
  region: string;
  pay_period_days: number;
  pay_period_anchor_end: string | null;
  week_start_dow: number;
  job_number_prefix: string;
  service_number_prefix: string;
  assistant_name: string;
  orders_from_email: string | null;
  updated_at: string;
  updated_by: string | null;
};

/** Permission tiers (0005). Titles are labels under a tier; permissions follow the tier. */
export type Tier = "developer" | "owner" | "manager" | "employee";

export type RoleCatalogRow = {
  key: string;
  label: string;
  rank: number;
  is_admin: boolean;
  can_approve_timesheets: boolean;
  sort: number;
  /** Null only on a database that has not had 0005 applied yet. */
  tier: Tier | null;
};

export type Invite = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user: string | null;
};

export type PublicBranding = {
  company_name: string;
  company_short: string;
  logo_path: string | null;
  color_primary: string;
  color_secondary: string;
  assistant_name: string;
};

export type ProgressCategory = {
  key: string;
  label: string;
  icon: string | null;
  sort: number;
  code_title: string | null;
  code_refs: { ref: string; text: string }[];
  enabled_default: boolean;
  active: boolean;
};


// ---- Per-job folders ----

export type RfiStatus = "issued" | "action" | "complete";
export const RFI_STATUSES: readonly RfiStatus[] = ["issued", "action", "complete"];

export type Rfi = {
  id: string;
  job_id: string | null;
  rfi_number: string | null;
  date_issued: string | null;
  subject: string;
  drawing_ref: string | null;
  question: string | null;
  response: string | null;
  impact: string | null;
  status: RfiStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
};

export type ChangeOrder = {
  id: string;
  job_id: string | null;
  co_number: string | null;
  date_issued: string | null;
  subject: string;
  drawing_ref: string | null;
  description: string | null;
  cost_impact: number | null;
  schedule_impact_days: number | null;
  impact: string | null;
  status: RfiStatus;
  created_by: string | null;
  created_at: string;
};

/** One line inside material_orders.items (jsonb). */
export type MaterialItem = {
  id: string;
  description: string;
  qty: number | null;
  unit: string | null;
  received: boolean;
  received_at: string | null;
};

export type MaterialOrder = {
  id: string;
  job_id: string | null;
  supplier: string | null;
  supplier_email: string | null;
  po_number: string | null;
  order_date: string | null;
  expected_date: string | null;
  notes: string | null;
  items: MaterialItem[];
  last_sent_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Tool = {
  id: string;
  job_id: string | null;
  name: string;
  dropped_by_id: string | null;
  dropped_by_text: string | null;
  dropped_date: string | null;
  picked_up: boolean;
  picked_up_by_id: string | null;
  picked_up_by_text: string | null;
  picked_up_date: string | null;
  checked: boolean;
  created_at: string;
};

/** photos.storage_path convention: job/<job_id>/<file> or sc/<service_call_id>/<file>. */
export type Photo = {
  id: string;
  job_id: string | null;
  service_call_id: string | null;
  storage_path: string;
  caption: string | null;
  date: string | null;
  taken_by: string | null;
  taken_at: string;
};

export type JobFileType = "ifc" | "shop_drawing" | "other";

export type JobFile = {
  id: string;
  job_id: string | null;
  file_type: JobFileType;
  name: string;
  revision: string | null;
  date_issued: string | null;
  storage_path: string | null;
  external_url: string | null;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

// ---- Top-level modules ----

export type ServiceStatus = "upcoming" | "in_progress" | "complete" | "cancelled";
export const SERVICE_STATUSES: readonly ServiceStatus[] = ["upcoming", "in_progress", "complete", "cancelled"];

/** One visit line inside service_calls.work_entries (jsonb). */
export type WorkEntry = {
  id: string;
  date: string | null;
  worker_id: string | null;
  worker_name: string | null;
  hours: number | null;
  material_source: string | null;
  parking: string | null;
  notes: string | null;
};

export type ServiceCall = {
  id: string;
  service_code: string | null;
  customer_name: string | null;
  company_name: string | null;
  customer_phone: string | null;
  customer_po: string | null;
  address: string | null;
  project_name: string | null;
  scheduled_date: string | null;
  status: ServiceStatus;
  work_report: string | null;
  work_entries: WorkEntry[];
  total_cost: number | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
};

/** One day cell in a timesheet row: hours as numbers, null = blank. */
export type HourCell = { reg: number | null; ot: number | null; dt: number | null };

/** One job line inside timesheets.rows (jsonb): 14 day cells, first day of week 1 first. */
export type TimesheetRow = {
  id: string;
  job_code: string | null;
  job_name: string | null;
  hours: HourCell[];
};

export type Timesheet = {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  week1_ending: string;
  week2_ending: string;
  rows: TimesheetRow[];
  total_hours: number;
  total_reg: number;
  total_ot: number;
  total_dt: number;
  notes: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type ScheduleEventType = "holiday" | "vacation" | "dayoff" | "event";
export const SCHEDULE_EVENT_TYPES: readonly ScheduleEventType[] = ["holiday", "vacation", "dayoff", "event"];

export type ScheduleEvent = {
  id: string;
  title: string;
  event_type: ScheduleEventType;
  start_date: string;
  end_date: string | null;
  who_id: string | null;
  who_text: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type BulletinPost = {
  id: string;
  title: string;
  body: string | null;
  author_id: string | null;
  author_name: string | null;
  pinned: boolean;
  archived: boolean;
  created_at: string;
};

export type LibraryCategory = "codes" | "manuals" | "specs" | "pmc_standards" | "safety";
export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = ["codes", "manuals", "specs", "pmc_standards", "safety"];

export type LibraryDoc = {
  id: string;
  category: LibraryCategory;
  title: string;
  edition: string | null;
  publisher: string | null;
  tags: string | null;
  notes: string | null;
  storage_path: string | null;
  external_url: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type JobAssignment = {
  job_id: string;
  user_id: string;
  role_on_job: string | null;
  assigned_at: string;
};

export type PayPeriod = { period_start: string; period_end: string };

// ---- Database shape for the typed Supabase client ----

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id" | "email">;
      jobs: Table<Job, "job_name">;
      contacts: Table<Contact, "name">;
      tasks: Table<Task, "text">;
      activity_log: Table<ActivityLog, "event_type" | "description">;
      org_settings: Table<OrgSettings, "company_name" | "company_short">;
      progress_categories: Table<ProgressCategory, "key" | "label">;
      role_catalog: Table<RoleCatalogRow, "key" | "label" | "rank">;
      invites: Table<Invite, "email">;
      timesheets: Table<Timesheet, "week1_ending" | "week2_ending">;
      rfis: Table<Rfi, "subject">;
      change_orders: Table<ChangeOrder, "subject">;
      material_orders: Table<MaterialOrder, never>;
      tools: Table<Tool, "name">;
      photos: Table<Photo, "storage_path">;
      job_files: Table<JobFile, "file_type" | "name">;
      service_calls: Table<ServiceCall, never>;
      schedule_events: Table<ScheduleEvent, "title" | "start_date">;
      bulletin_posts: Table<BulletinPost, "title">;
      library_docs: Table<LibraryDoc, "category" | "title">;
      job_assignments: Table<JobAssignment, "job_id" | "user_id">;
    };
    Views: { [_ in never]: never };
    Functions: {
      public_branding: { Args: Record<string, never>; Returns: PublicBranding[] };
      pay_period_bounds: { Args: { d: string }; Returns: PayPeriod[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
