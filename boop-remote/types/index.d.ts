// Type declarations for the Opportunity Engine data layer and matching engine.
// Mirrors src/schema.js (the runtime validator is the source of truth) and the public
// functions of src/engine.js, src/questions.js and src/prompt.js.

export type OpportunityType =
  | 'employment' | 'contract' | 'freelance' | 'task_platform'
  | 'research_participation' | 'training_pathway' | 'program' | 'category';

export type Category =
  | 'customer_ops' | 'language_writing' | 'ai_data' | 'tech_digital' | 'research_participation'
  | 'creative_production' | 'structured_employment' | 'freelance_microbusiness' | 'government_program';

export type Status =
  | 'applications_open_confirmed' | 'registration_open_not_work_guaranteed' | 'eligibility_confirmed'
  | 'official_info_found' | 'waitlist_or_no_work_guarantee' | 'uncertain' | 'not_currently_open'
  | 'stale_needs_recheck' | 'rejected';

export type SourceType = 'official' | 'government' | 'independent_review' | 'forum' | 'journalism' | 'aggregator';
export type CanadaEligibility = 'confirmed' | 'likely' | 'unclear' | 'not_eligible';
export type Setting = 'remote' | 'hybrid' | 'onsite' | 'varies';
export type TimeWindow = 'day' | 'evening' | 'night' | 'weekend';
export type InteractionMode = 'text' | 'voice' | 'video' | 'in_person' | 'independent';
export type SkillKey = 'computer' | 'writing' | 'numeracy' | 'detail' | 'customer' | 'technical' | 'creative' | 'language';
export type Horizon = 'now' | 'bridge' | 'career';
export type WorkerStatus = 'employee' | 'contractor' | 'participant' | 'student' | 'varies' | 'unknown';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak';
export type Legitimacy = 'established' | 'likely' | 'unclear';
export type Assessment = 'none' | 'free_test' | 'unpaid_test' | 'paid_test' | 'interview' | 'unknown';

export interface Source {
  url: string;
  title: string;
  type: SourceType;
  publisher: string | null;
  /** ISO date or free text as shown on the page; null if not shown. */
  published: string | null;
  /** YYYY-MM-DD. */
  accessed: string;
  claims: string[];
  notes: string;
  /** false when the page could only be seen through a search summary. */
  accessible: boolean;
}

export interface Opportunity {
  id: string;
  name: string;
  organization: string;
  type: OpportunityType;
  category: Category;
  tags: string[];
  summary: string;
  whatYouDo: string;
  appeal: string[];
  watchOuts: string[];
  officialUrl: string | null;
  /** Only set when the application page itself was opened. */
  applyUrl: string | null;
  geography: { countries: string[]; regions: string[]; canadaEligibility: CanadaEligibility; setting: Setting };
  languages: string[];
  requirements: {
    experience: 'none' | 'some' | 'significant' | 'unknown';
    credentialRequired: boolean;
    credentials: string[];
    equipment: string[];
    minAge: number | null;
    assessment: Assessment;
  };
  schedule: {
    flexibility: 'flexible' | 'shifts' | 'fixed' | 'varies' | 'unknown';
    windows: TimeWindow[];
    hoursMinWeekly: number | null;
    hoursMaxWeekly: number | null;
  };
  interaction: { modes: InteractionMode[]; realtime: 'none' | 'some' | 'high' | 'unknown'; phone: boolean | null };
  /** Demand per skill, 0 (not needed) to 3 (core, high bar). */
  skills: Record<SkillKey, 0 | 1 | 2 | 3>;
  training: { required: boolean; cost: 'free' | 'paid_to_you' | 'user_pays' | 'none' | 'unknown'; notes: string };
  compensation: {
    min: number | null;
    max: number | null;
    /** 'unstated' when a figure was published without a currency. Never assumed. */
    currency: 'CAD' | 'USD' | 'unstated' | null;
    unit: 'hour' | 'task' | 'minute_audio' | 'study' | 'project' | 'month' | 'year' | null;
    basis: 'official' | 'self_reported' | 'aggregator' | 'unknown';
    notes: string;
  };
  reliability: { workVolume: 'steady' | 'variable' | 'sporadic' | 'unknown'; predictability: 'high' | 'medium' | 'low' | 'unknown'; notes: string };
  workerStatus: WorkerStatus;
  fees: string | null;
  applicationSteps: string[];
  timeToFirstEarnings: 'days' | 'weeks' | 'months' | 'unknown';
  horizon: Horizon;
  status: Status;
  legitimacy: Legitimacy;
  evidenceStrength: EvidenceStrength;
  riskFlags: string[];
  /** Set when the route is only open to a specific group. Such routes never enter the shortlist unless liked. */
  audience?: string[];
  fitsIf: string;
  notFitIf: string;
  /** YYYY-MM-DD. */
  lastChecked: string;
  sources: Source[];
}

export interface SafetySource { url: string; title: string; publisher: string; accessed: string; notes: string; tips: string[] }

export interface Catalogue { generated: string; records: Opportunity[]; safety: SafetySource[] }

/** A person's answers. null = not answered (neutral). Keys match question ids. */
export interface Profile {
  region: 'CA-ON' | 'CA' | 'outside' | null;
  hours: 'lt10' | '10to20' | '20to30' | '30plus' | null;
  windows: TimeWindow[] | null;
  windowsFirm: boolean | null;
  interaction: 'text' | 'live' | 'independent' | 'mix' | null;
  phone: 'fine' | 'prefer_not' | 'no' | null;
  goals: Array<'fast' | 'stable' | 'flexible' | 'career' | 'explore'> | null;
  computer: 1 | 2 | 3 | null;
  strengths: Partial<Record<Exclude<SkillKey, 'computer'>, 'yes' | 'learn' | 'prefer_not'>>;
  learn: 'yes' | 'some' | 'no' | null;
  /** [] means "none of these"; null means skipped. */
  equipment: string[] | null;
  dealbreakers: Array<'unpaid_test' | 'fees' | 'emotional_content' | 'contractor' | 'onsite'> | null;
  minPay: 0 | 18 | 22 | 28 | null;
  minPayFirm: boolean | null;
  adult: boolean | null;
}

export interface QuestionOption { value: string | number | boolean; label: string; exclusive?: boolean }
export interface WhenCondition { key: keyof Profile; not?: unknown; gt?: number; minLength?: number; maxLength?: number }
export interface Question {
  id: keyof Profile;
  title: string;
  help?: string;
  kind: 'single' | 'multi' | 'matrix';
  options: QuestionOption[];
  rows?: QuestionOption[];
  when?: WhenCondition;
}

export interface ScoreBreakdown { key: string; s: number; weight: number }
export interface Match {
  rec: Opportunity;
  /** -1..1 */
  score: number;
  breakdown: ScoreBreakdown[];
  why: string[];
  cautions: string[];
  label: 'Strong fit' | 'Good fit' | 'Possible fit' | 'Long shot' | 'Not enough answers yet';
  stale: boolean;
}
export interface Excluded { rec: Opportunity; reason: string }
export interface MatchResult { ranked: Match[]; excluded: Excluded[] }
export interface Pick extends Match { role: 'best' | 'alternative' | 'stretch' | 'flexible'; title: string; adj: number }

// src/questions.js
export const NONE: '__none';
export const QUESTIONS: Question[];
export function emptyProfile(): Profile;
export function visibleQuestions(profile: Profile): Question[];
export function conditionHolds(condition: WhenCondition | undefined, profile: Profile): boolean;

// src/engine.js
export const WEIGHTS: Record<string, number>;
export const CONFIG: { staleDays: number; usdToCad: number; hoursCap: Record<string, number> };
/** today is YYYY-MM-DD. */
export function match(catalogue: Opportunity[], profile: Profile, today: string): MatchResult;
export function pickThree(ranked: Match[], opts?: { liked?: string[]; passed?: string[] }): Pick[];
export function hardFilter(rec: Opportunity, profile: Profile, today: string): string | null;
export function scoreRecord(rec: Opportunity, profile: Profile, today: string): Omit<Match, 'rec' | 'label' | 'stale'>;
export function uncertainties(rec: Opportunity, today: string, profile?: Partial<Profile>): string[];
export function contrast(pick: Pick, best: Pick): string | null;
export function isStale(rec: Opportunity, today: string): boolean;
export function isRestricted(rec: Opportunity): boolean;
export function hourlyCad(rec: Opportunity): { lo: number; hi: number } | null;
export function fitLabel(score: number): Match['label'];

// src/prompt.js
export function buildPrompt(rec: Opportunity, profile: Profile, today: string): string;
export function preferenceLines(profile: Profile): string[];
export const GEMINI_URL: string;

// src/schema.js
export function validateRecord(rec: unknown): string[];
export function validateCatalogue(records: unknown[]): string[];
export const CATEGORIES: Record<Category, string>;
export const STATUSES: Record<Status, string>;
export const STATUS_SHORT: Record<Status, string>;
export const TYPE_LABELS: Record<OpportunityType, string>;
