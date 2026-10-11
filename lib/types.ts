// Hand-written row types for the tables this app touches.
// Source of truth: supabase/migrations/0001..0005. Keep in step with them.

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
      timesheets: Table<{ id: string; employee_id: string | null }, "id">;
    };
    Views: { [_ in never]: never };
    Functions: {
      public_branding: { Args: Record<string, never>; Returns: PublicBranding[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
