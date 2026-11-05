export interface Assessment {
  id: string;
  name: string;
  componentType: string;
  maxMarks: number;
  weight: number;
  isExternal: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  coordinator: string;
  courseType: string;
  category: string;
  credits: number;
  modeOfAssessment: string;
  assessments: Assessment[];
}

export interface AssessmentUserState {
  rawMarks: number | null;
  isIncluded: boolean; // true = included, false = excluded from personal calculation
}

export interface ExternalComponentRequirement {
  id: string;
  name: string;
  maxMarks: number;
  weight: number;
  requiredRawMarks: number;
}

export interface ExternalCalculationResult {
  subjectCode: string;
  subjectName: string;
  targetGrade: string;
  targetCutoffMarks: number; // e.g. 88
  
  // Weight Breakdown
  officialTotalWeight: number; // 100.0%
  excludedWeight: number; // sum of excluded internal weights
  applicableTotalWeight: number; // officialTotalWeight - excludedWeight
  
  internalTotalWeight: number; // total internal weight in curriculum
  applicableInternalWeight: number; // internal weight excluding excluded ones
  completedInternalWeight: number; // weight of completed included components
  pendingInternalWeight: number; // weight of included but missing components
  
  externalWeight: number; // weight of external exam(s)
  
  // Marks Breakdown
  internalWeightedMarks: number; // sum of (raw / max) * weight for completed included
  scaledTargetCutoff: number; // target scaled to applicableTotalWeight
  deficit: number; // required weighted marks in external exam
  requiredExternalPercentage: number; // percentage needed on external exam
  status: 'ACHIEVABLE' | 'ALREADY_ACHIEVED' | 'IMPOSSIBLE';
  maxPossibleTotal: number; // highest achievable total on applicable scale
  
  externalComponents: ExternalComponentRequirement[];
}

export type GradeLetter = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export interface SgpaSubjectState {
  grade: GradeLetter;
  isIncluded: boolean;
}

export interface SgpaCalculationResult {
  sgpa: number;
  totalCredits: number;
  totalGradePoints: number;
  percentageEquivalent: number;
  standing: string;
}
