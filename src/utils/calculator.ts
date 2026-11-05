import {
  Subject,
  AssessmentUserState,
  ExternalCalculationResult,
  ExternalComponentRequirement,
  GradeLetter,
  SgpaSubjectState,
  SgpaCalculationResult,
} from '../types';

export const GRADE_POINTS: Record<GradeLetter, number> = {
  'A+': 10,
  'A': 9,
  'B+': 8,
  'B': 7,
  'C+': 6,
  'C': 5,
  'D': 4,
  'F': 0,
};

export const DEFAULT_GRADE_CUTOFFS: Record<string, number> = {
  'A+': 95,
  'A': 88,
  'B+': 80,
  'B': 70,
  'C': 55,
};

export function calculateRequiredExternalMarks(
  subject: Subject,
  userStates: Record<string, AssessmentUserState>,
  targetCutoffMarks: number,
  targetGradeLabel: string
): ExternalCalculationResult {
  const internalComponents = subject.assessments.filter((a) => !a.isExternal);
  const externalComponents = subject.assessments.filter((a) => a.isExternal);

  const officialTotalWeight = 100.0;
  const internalTotalWeight = internalComponents.reduce((acc, a) => acc + a.weight, 0);
  const externalWeight = externalComponents.reduce((acc, a) => acc + a.weight, 0);

  let excludedWeight = 0;
  let completedInternalWeight = 0;
  let pendingInternalWeight = 0;
  let internalWeightedMarks = 0;

  for (const comp of internalComponents) {
    const state = userStates[comp.id] || { rawMarks: null, isIncluded: true };
    const isIncluded = state.isIncluded !== false;

    if (!isIncluded) {
      excludedWeight += comp.weight;
    } else {
      if (state.rawMarks !== null && state.rawMarks !== undefined && !isNaN(state.rawMarks)) {
        completedInternalWeight += comp.weight;
        const clampedRaw = Math.max(0, Math.min(comp.maxMarks, state.rawMarks));
        const contrib = (clampedRaw / comp.maxMarks) * comp.weight;
        internalWeightedMarks += contrib;
      } else {
        pendingInternalWeight += comp.weight;
      }
    }
  }

  excludedWeight = Number(excludedWeight.toFixed(2));
  completedInternalWeight = Number(completedInternalWeight.toFixed(2));
  pendingInternalWeight = Number(pendingInternalWeight.toFixed(2));
  internalWeightedMarks = Number(internalWeightedMarks.toFixed(2));

  const applicableTotalWeight = Number((officialTotalWeight - excludedWeight).toFixed(2));
  const applicableInternalWeight = Number((internalTotalWeight - excludedWeight).toFixed(2));

  // Scale target to the applicable syllabus scope
  // If no components are excluded, scaledTargetCutoff = targetCutoffMarks
  // If e.g. 20% is excluded, student is assessed out of 80%, so an 88% target corresponds to 88% * 0.80 = 70.4 marks
  const scaledTargetCutoff = Number(((targetCutoffMarks / 100) * applicableTotalWeight).toFixed(2));

  // Remaining available weight to achieve the scaled target
  // External weight is always available.
  const deficit = Number((scaledTargetCutoff - internalWeightedMarks).toFixed(2));
  const maxPossibleTotal = Number((internalWeightedMarks + externalWeight).toFixed(2));

  let status: ExternalCalculationResult['status'] = 'ACHIEVABLE';
  let requiredExternalPercentage = 0;
  const componentRequirements: ExternalComponentRequirement[] = [];

  if (deficit <= 0) {
    status = 'ALREADY_ACHIEVED';
    requiredExternalPercentage = 0;
    for (const comp of externalComponents) {
      componentRequirements.push({
        id: comp.id,
        name: comp.name,
        maxMarks: comp.maxMarks,
        weight: comp.weight,
        requiredRawMarks: 0,
      });
    }
  } else if (deficit > externalWeight) {
    status = 'IMPOSSIBLE';
    requiredExternalPercentage = Number(((deficit / (externalWeight || 1)) * 100).toFixed(1));
    for (const comp of externalComponents) {
      componentRequirements.push({
        id: comp.id,
        name: comp.name,
        maxMarks: comp.maxMarks,
        weight: comp.weight,
        requiredRawMarks: comp.maxMarks,
      });
    }
  } else {
    status = 'ACHIEVABLE';
    requiredExternalPercentage = Number(((deficit / externalWeight) * 100).toFixed(1));
    for (const comp of externalComponents) {
      const rawReq = Number(((requiredExternalPercentage / 100) * comp.maxMarks).toFixed(1));
      componentRequirements.push({
        id: comp.id,
        name: comp.name,
        maxMarks: comp.maxMarks,
        weight: comp.weight,
        requiredRawMarks: Math.min(comp.maxMarks, rawReq),
      });
    }
  }

  return {
    subjectCode: subject.code,
    subjectName: subject.name,
    targetGrade: targetGradeLabel,
    targetCutoffMarks,
    officialTotalWeight,
    excludedWeight,
    applicableTotalWeight,
    internalTotalWeight,
    applicableInternalWeight,
    completedInternalWeight,
    pendingInternalWeight,
    externalWeight,
    internalWeightedMarks,
    scaledTargetCutoff,
    deficit,
    requiredExternalPercentage,
    status,
    maxPossibleTotal,
    externalComponents: componentRequirements,
  };
}

export function calculateSGPA(
  subjects: Subject[],
  grades: Record<string, SgpaSubjectState>,
  gradePointsMap: Record<GradeLetter, number> = GRADE_POINTS
): SgpaCalculationResult {
  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const subj of subjects) {
    const isMNG = subj.category.includes('MNG') || subj.category.includes('Non-Graded');
    const state = grades[subj.code] || {
      grade: 'A+' as GradeLetter,
      isIncluded: !isMNG, // By default exclude MNG from SGPA
    };

    if (state.isIncluded) {
      const points = gradePointsMap[state.grade] ?? 10;
      totalCredits += subj.credits;
      totalGradePoints += subj.credits * points;
    }
  }

  const sgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
  const percentageEquivalent = Number((sgpa * 10).toFixed(1));

  let standing = 'Outstanding';
  if (sgpa >= 9.5) standing = 'Outstanding (A+ Grade)';
  else if (sgpa >= 9.0) standing = 'Exemplary (First Class)';
  else if (sgpa >= 8.0) standing = 'Distinction (First Class)';
  else if (sgpa >= 7.0) standing = 'First Division';
  else if (sgpa >= 6.0) standing = 'Second Division (High)';
  else if (sgpa >= 5.0) standing = 'Second Division';
  else if (sgpa >= 4.0) standing = 'Pass';
  else standing = 'Needs Improvement';

  return {
    sgpa,
    totalCredits: Number(totalCredits.toFixed(1)),
    totalGradePoints: Number(totalGradePoints.toFixed(2)),
    percentageEquivalent,
    standing,
  };
}
