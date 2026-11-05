import { DEFAULT_GRADE_CUTOFFS } from './calculator';
import { AssessmentUserState, SgpaSubjectState } from '../types';

const MARKS_KEY = 'cu_simple_calc_marks_v2';
const CUTOFFS_KEY = 'cu_simple_calc_cutoffs_v1';
const PREFS_KEY = 'cu_simple_calc_prefs_v1';
const SGPA_KEY = 'cu_simple_calc_sgpa_v1';

export function loadSavedMarks(): Record<string, Record<string, AssessmentUserState>> {
  try {
    const raw = localStorage.getItem(MARKS_KEY);
    if (!raw) {
      // Check for v1 migration
      const oldRaw = localStorage.getItem('cu_simple_calc_marks_v1');
      if (oldRaw) {
        const parsedOld = JSON.parse(oldRaw);
        const migrated: Record<string, Record<string, AssessmentUserState>> = {};
        for (const [subCode, assessments] of Object.entries(parsedOld)) {
          migrated[subCode] = {};
          for (const [aId, val] of Object.entries(assessments as any)) {
            if (typeof val === 'number' || val === null) {
              migrated[subCode][aId] = { rawMarks: val, isIncluded: true };
            } else if (val && typeof val === 'object') {
              migrated[subCode][aId] = {
                rawMarks: (val as any).rawMarks ?? null,
                isIncluded: (val as any).isIncluded !== false,
              };
            }
          }
        }
        return migrated;
      }
      return {};
    }

    const parsed = JSON.parse(raw);
    const normalized: Record<string, Record<string, AssessmentUserState>> = {};
    for (const [subCode, assessments] of Object.entries(parsed)) {
      normalized[subCode] = {};
      for (const [aId, val] of Object.entries(assessments as any)) {
        if (typeof val === 'number' || val === null) {
          normalized[subCode][aId] = { rawMarks: val, isIncluded: true };
        } else if (val && typeof val === 'object') {
          normalized[subCode][aId] = {
            rawMarks: (val as any).rawMarks ?? null,
            isIncluded: (val as any).isIncluded !== false,
          };
        }
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

export function saveMarks(marks: Record<string, Record<string, AssessmentUserState>>): void {
  try {
    localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
  } catch (err) {
    console.error('Failed to save marks to localStorage', err);
  }
}

export function loadSavedCutoffs(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CUTOFFS_KEY);
    if (!raw) return { ...DEFAULT_GRADE_CUTOFFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GRADE_CUTOFFS, ...parsed };
  } catch {
    return { ...DEFAULT_GRADE_CUTOFFS };
  }
}

export function saveCutoffs(cutoffs: Record<string, number>): void {
  try {
    localStorage.setItem(CUTOFFS_KEY, JSON.stringify(cutoffs));
  } catch (err) {
    console.error('Failed to save cutoffs to localStorage', err);
  }
}

export function loadPreferences(): { subjectCode: string; grade: string } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { subjectCode: '24SMT-341', grade: 'A' };
  } catch {
    return { subjectCode: '24SMT-341', grade: 'A' };
  }
}

export function savePreferences(prefs: { subjectCode: string; grade: string }): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences to localStorage', err);
  }
}

export function loadSavedSgpaGrades(): Record<string, SgpaSubjectState> {
  try {
    const raw = localStorage.getItem(SGPA_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveSgpaGrades(grades: Record<string, SgpaSubjectState>): void {
  try {
    localStorage.setItem(SGPA_KEY, JSON.stringify(grades));
  } catch (err) {
    console.error('Failed to save SGPA grades to localStorage', err);
  }
}
