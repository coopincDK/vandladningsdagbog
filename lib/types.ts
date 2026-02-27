export type Sex = "male" | "female";
export interface UserProfile { sex: Sex; birthYear: number; sleepTime: string; wakeTime: string; }
export type EntryType = "intake" | "void" | "incontinence";
export type IncontinenceSeverity = "dry" | "damp" | "wet" | "soaked";
export type BeverageType = "vand" | "kaffe" | "te" | "juice" | "alkohol" | "sodavand" | "andet";

export interface Entry {
  id: string; dayId: string; timestamp: string; type: EntryType;
  beverageType?: BeverageType; intakeMl?: number;
  voidMl?: number; isEstimated?: boolean; durationSeconds?: number; urgencyScore?: number;
  severity?: IncontinenceSeverity; activity?: string;
  note?: string;
}

export interface DiaryDay { id: string; date: string; dayNumber: 1 | 2 | 3; isTypicalDay: boolean; }
export interface IPSSAnswer { a: number; b: number; comment?: string; }
export interface IPSSResult {
  answers: Record<number, IPSSAnswer>;
  skipSex: boolean;
  total: number;
  sexTotal: number;
  completedAt: string;
}

export interface Flag { key: string; label: string; color: "yellow" | "orange" | "red"; }
export interface DaySummary {
  totalIntakeMl: number; totalVoidMl: number; dayVoids: number; nightVoids: number;
  maxVoidMl: number; minVoidMl: number; nocturnalPolyuriaPct: number;
  incontinenceCount: number; avgUrgency: number; flags: Flag[];
}
