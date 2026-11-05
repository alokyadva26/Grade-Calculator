import React, { useState, useEffect, useMemo } from 'react';
import rawCurriculum from './data/curriculum.json';
import { Subject, AssessmentUserState, ExternalCalculationResult } from './types';
import {
  calculateRequiredExternalMarks,
  DEFAULT_GRADE_CUTOFFS,
} from './utils/calculator';
import {
  loadSavedMarks,
  saveMarks,
  loadSavedCutoffs,
  saveCutoffs,
  loadPreferences,
  savePreferences,
} from './utils/storage';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Settings,
  Calculator,
  CheckSquare,
  Square,
  Clock,
  EyeOff,
  X,
} from 'lucide-react';

const curriculum: Subject[] = rawCurriculum as unknown as Subject[];

export const App: React.FC = () => {
  // Preferences
  const initialPrefs = useMemo(() => loadPreferences(), []);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(initialPrefs.subjectCode);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialPrefs.grade);
  const [customTargetMarks, setCustomTargetMarks] = useState<number>(85);

  // Saved data
  const [cutoffs, setCutoffs] = useState<Record<string, number>>(() => loadSavedCutoffs());
  const [allMarks, setAllMarks] = useState<Record<string, Record<string, AssessmentUserState>>>(() => loadSavedMarks());

  // Cutoffs modal drawer toggle
  const [showCutoffEditor, setShowCutoffEditor] = useState<boolean>(false);
  const [calcNotice, setCalcNotice] = useState<string | null>(null);

  // Active Subject
  const activeSubject = useMemo(() => {
    return curriculum.find((s) => s.code === selectedSubjectCode) || curriculum[0];
  }, [selectedSubjectCode]);

  // Current subject assessment states
  const currentSubjectStates: Record<string, AssessmentUserState> = useMemo(() => {
    return allMarks[activeSubject.code] || {};
  }, [allMarks, activeSubject.code]);

  // Auto-save to localStorage
  useEffect(() => {
    saveMarks(allMarks);
  }, [allMarks]);

  useEffect(() => {
    saveCutoffs(cutoffs);
  }, [cutoffs]);

  useEffect(() => {
    savePreferences({ subjectCode: selectedSubjectCode, grade: selectedGrade });
  }, [selectedSubjectCode, selectedGrade]);

  // Target Cutoff calculation
  const targetCutoff = selectedGrade === 'CUSTOM' ? customTargetMarks : (cutoffs[selectedGrade] || 88);

  // Main Calculation Engine
  const calculation: ExternalCalculationResult = useMemo(() => {
    return calculateRequiredExternalMarks(
      activeSubject,
      currentSubjectStates,
      targetCutoff,
      selectedGrade === 'CUSTOM' ? `Custom (${targetCutoff}m)` : `Grade ${selectedGrade}`
    );
  }, [activeSubject, currentSubjectStates, targetCutoff, selectedGrade]);

  // Handle Mark Input Change
  const handleMarkChange = (assessmentId: string, maxMarks: number, valueStr: string) => {
    const rawVal = valueStr.trim() === '' ? null : parseFloat(valueStr);
    const validVal = rawVal !== null && !isNaN(rawVal) ? Math.max(0, Math.min(maxMarks, rawVal)) : null;

    setAllMarks((prev) => {
      const subjectRecord = prev[activeSubject.code] || {};
      const currentAssessment = subjectRecord[assessmentId] || { rawMarks: null, isIncluded: true };

      return {
        ...prev,
        [activeSubject.code]: {
          ...subjectRecord,
          [assessmentId]: {
            ...currentAssessment,
            rawMarks: validVal,
          },
        },
      };
    });
  };

  // Toggle Include / Exclude
  const handleToggleInclude = (assessmentId: string) => {
    setAllMarks((prev) => {
      const subjectRecord = prev[activeSubject.code] || {};
      const currentAssessment = subjectRecord[assessmentId] || { rawMarks: null, isIncluded: true };
      const nextIncluded = !currentAssessment.isIncluded;

      return {
        ...prev,
        [activeSubject.code]: {
          ...subjectRecord,
          [assessmentId]: {
            ...currentAssessment,
            isIncluded: nextIncluded,
          },
        },
      };
    });
  };

  // Exclude all unmarked assessments
  const handleExcludeUnmarked = () => {
    const internalAssessments = activeSubject.assessments.filter((a) => !a.isExternal);
    setAllMarks((prev) => {
      const subjectRecord = prev[activeSubject.code] || {};
      const updated: Record<string, AssessmentUserState> = { ...subjectRecord };

      for (const a of internalAssessments) {
        const state = updated[a.id] || { rawMarks: null, isIncluded: true };
        const hasMark = state.rawMarks !== null && state.rawMarks !== undefined;
        updated[a.id] = {
          ...state,
          isIncluded: hasMark,
        };
      }

      return {
        ...prev,
        [activeSubject.code]: updated,
      };
    });
    setCalcNotice('Excluded all assessments without entered marks.');
    setTimeout(() => setCalcNotice(null), 2500);
  };

  // Include All internal assessments
  const handleIncludeAll = () => {
    const internalAssessments = activeSubject.assessments.filter((a) => !a.isExternal);
    setAllMarks((prev) => {
      const subjectRecord = prev[activeSubject.code] || {};
      const updated: Record<string, AssessmentUserState> = { ...subjectRecord };

      for (const a of internalAssessments) {
        const state = updated[a.id] || { rawMarks: null, isIncluded: true };
        updated[a.id] = {
          ...state,
          isIncluded: true,
        };
      }

      return {
        ...prev,
        [activeSubject.code]: updated,
      };
    });
    setCalcNotice('All assessments are now included.');
    setTimeout(() => setCalcNotice(null), 2000);
  };

  // Quick fill sample marks (80% on included internals)
  const handleFillSampleInternals = () => {
    const internalAssessments = activeSubject.assessments.filter((a) => !a.isExternal);
    const updated: Record<string, AssessmentUserState> = {};

    for (const a of internalAssessments) {
      const current = currentSubjectStates[a.id];
      const isIncluded = current?.isIncluded !== false;
      updated[a.id] = {
        isIncluded,
        rawMarks: isIncluded ? Math.round(a.maxMarks * 0.8 * 10) / 10 : null,
      };
    }

    setAllMarks((prev) => ({
      ...prev,
      [activeSubject.code]: updated,
    }));
    setCalcNotice('Loaded 80% sample marks for included assessments.');
    setTimeout(() => setCalcNotice(null), 2500);
  };

  // Clear subject marks
  const handleClearSubjectInternals = () => {
    setAllMarks((prev) => {
      const copy = { ...prev };
      delete copy[activeSubject.code];
      return copy;
    });
    setCalcNotice('Marks reset for this subject.');
    setTimeout(() => setCalcNotice(null), 2000);
  };

  // Reset cutoffs
  const handleResetCutoffs = () => {
    setCutoffs({ ...DEFAULT_GRADE_CUTOFFS });
  };

  // Assessments lists
  const internalAssessments = activeSubject.assessments.filter((a) => !a.isExternal);
  const externalAssessments = activeSubject.assessments.filter((a) => a.isExternal);
  const externalWeightTotal = externalAssessments.reduce((acc, a) => acc + a.weight, 0);

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* ═══════════════════════════════════════════
          HEADER — Floating translucent bar
      ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-surface-elevated backdrop-blur-spatial border-b border-spatial-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-spatial-sm bg-spatial-accent flex items-center justify-center text-white shadow-spatial-sm flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-base font-bold text-spatial-text leading-tight truncate">
                CU External Marks Calculator
              </h1>
              <p className="text-[11px] text-spatial-text-tertiary leading-tight hidden sm:block">
                Chandigarh University • Target Grade & External Exam Solver
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCutoffEditor(!showCutoffEditor)}
            className="spatial-btn-ghost !px-2.5 !py-2 sm:!px-3 text-xs !min-h-[36px] sm:!min-h-[40px] rounded-spatial-sm border border-spatial-border"
            aria-label="Configure Grade Cutoffs"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Cutoffs</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════ */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-4 sm:space-y-5">

        {/* Notice Banner */}
        {calcNotice && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-spatial bg-spatial-accent-subtle border border-spatial-accent/10 text-sm font-medium text-spatial-accent animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{calcNotice}</span>
            <button onClick={() => setCalcNotice(null)} className="text-spatial-accent/60 hover:text-spatial-accent">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            CUTOFF EDITOR — Floating spatial panel
        ═══════════════════════════════════════ */}
        {showCutoffEditor && (
          <div className="spatial-card p-5 sm:p-6 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-spatial-text">
                  Grade Cutoff Assumptions
                </h3>
                <p className="text-xs text-spatial-text-tertiary mt-0.5">
                  Set your assumed cutoff marks out of 100 for each grade (CU uses relative grading).
                </p>
              </div>
              <button
                onClick={handleResetCutoffs}
                className="spatial-btn-ghost !px-2.5 !py-1.5 text-xs !min-h-[32px] flex-shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {['A+', 'A', 'B+', 'B', 'C'].map((grade) => (
                <div key={grade} className="p-3 rounded-spatial-sm bg-surface-primary border border-spatial-border">
                  <span className="text-[11px] font-bold text-spatial-accent block mb-1.5">
                    Grade {grade}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="35"
                      max="100"
                      value={cutoffs[grade] || ''}
                      onChange={(e) =>
                        setCutoffs({
                          ...cutoffs,
                          [grade]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="spatial-input !py-1.5 text-center font-bold !text-sm !min-h-[38px]"
                    />
                    <span className="text-xs text-spatial-text-tertiary flex-shrink-0">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 1 — Subject Selection
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="step-label">Step 1 — Select Subject</span>
            <span className="text-[11px] text-spatial-text-tertiary">9 Courses</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {curriculum.map((subj) => {
              const isSelected = subj.code === selectedSubjectCode;
              return (
                <button
                  key={subj.code}
                  onClick={() => setSelectedSubjectCode(subj.code)}
                  className={`group p-3 sm:p-3.5 rounded-spatial text-left transition-all duration-200 border ${
                    isSelected
                      ? 'bg-spatial-accent text-white border-spatial-accent shadow-spatial-sm'
                      : 'bg-white hover:bg-surface-tertiary text-spatial-text border-spatial-border hover:border-spatial-border-strong hover:shadow-spatial-xs'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] block ${
                      isSelected ? 'text-white/70' : 'text-spatial-accent font-semibold'
                    }`}
                  >
                    {subj.code}
                  </span>
                  <span className="text-[13px] font-semibold line-clamp-1 block mt-0.5" title={subj.name}>
                    {subj.name}
                  </span>
                  <span className={`text-[11px] mt-0.5 block ${isSelected ? 'text-white/60' : 'text-spatial-text-tertiary'}`}>
                    {subj.credits} Cr • {subj.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected subject info bar */}
          <div className="pt-3 border-t border-spatial-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-spatial-text truncate">{activeSubject.name}</span>
              <span className="text-spatial-text-tertiary flex-shrink-0">•</span>
              <span className="text-spatial-text-secondary flex-shrink-0">{activeSubject.credits} Credits</span>
            </div>
            <div className="font-mono text-[11px] text-spatial-accent bg-spatial-accent-subtle px-3 py-1.5 rounded-full font-semibold flex-shrink-0 text-center sm:text-left">
              Internal {100 - externalWeightTotal}% | External {externalWeightTotal}%
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 2 — Target Grade Selection
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="step-label">Step 2 — Target Grade</span>
            <span className="text-[11px] font-semibold text-spatial-accent">
              Target: {targetCutoff}/100
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['A+', 'A', 'B+', 'B', 'C'].map((grade) => {
              const isSelected = selectedGrade === grade;
              const cutoffMark = cutoffs[grade] || 88;
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`py-3 px-2 rounded-spatial text-center transition-all duration-200 border ${
                    isSelected
                      ? 'bg-spatial-accent text-white border-spatial-accent shadow-spatial-sm'
                      : 'bg-white hover:bg-surface-tertiary text-spatial-text border-spatial-border hover:border-spatial-border-strong'
                  }`}
                >
                  <span className="text-base font-bold block">{grade}</span>
                  <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-white/70' : 'text-spatial-text-tertiary'}`}>
                    {cutoffMark}+ marks
                  </span>
                </button>
              );
            })}

            {/* Custom Target */}
            <button
              onClick={() => setSelectedGrade('CUSTOM')}
              className={`py-3 px-2 rounded-spatial text-center transition-all duration-200 border col-span-3 sm:col-span-1 ${
                selectedGrade === 'CUSTOM'
                  ? 'bg-spatial-accent-subtle border-spatial-accent'
                  : 'bg-white border-spatial-border hover:border-spatial-border-strong'
              }`}
            >
              <span className={`text-xs font-bold block ${selectedGrade === 'CUSTOM' ? 'text-spatial-accent' : 'text-spatial-text'}`}>
                Custom
              </span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <input
                  type="number"
                  min="35"
                  max="100"
                  value={customTargetMarks}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setCustomTargetMarks(parseInt(e.target.value) || 0);
                    setSelectedGrade('CUSTOM');
                  }}
                  className="w-12 px-1 py-0.5 text-center text-xs font-bold border border-spatial-border-strong rounded-md bg-white focus:ring-2 focus:ring-spatial-accent/30 focus:border-spatial-accent outline-none"
                />
                <span className="text-[10px] text-spatial-text-tertiary">/100</span>
              </div>
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 3 — Internal Assessment Marks
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          {/* Header with action buttons */}
          <div className="flex flex-col gap-3 pb-3 border-b border-spatial-border">
            <div>
              <span className="step-label">Step 3 — Internal Marks & Assessment Selection</span>
              <p className="text-xs text-spatial-text-tertiary mt-1">
                Enter marks for announced assessments. Toggle checkboxes to include or exclude.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleIncludeAll}
                className="spatial-btn-ghost !px-2.5 !py-1.5 text-xs !min-h-[34px] border border-spatial-border"
              >
                Include All
              </button>

              <button
                onClick={handleExcludeUnmarked}
                className="spatial-btn-ghost !px-2.5 !py-1.5 text-xs !min-h-[34px] border border-spatial-warning-border bg-spatial-warning-bg text-amber-700"
                title="Exclude any assessment where marks are not yet announced"
              >
                Exclude Unannounced
              </button>

              <button
                onClick={handleFillSampleInternals}
                className="spatial-btn-secondary !px-2.5 !py-1.5 text-xs !min-h-[34px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill 80%</span>
              </button>

              <button
                onClick={handleClearSubjectInternals}
                className="spatial-btn-ghost !px-2.5 !py-1.5 text-xs !min-h-[34px] text-spatial-text-tertiary hover:!text-red-600 hover:!bg-spatial-error-bg border border-spatial-border"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Assessment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {internalAssessments.map((a) => {
              const state = currentSubjectStates[a.id] || { rawMarks: null, isIncluded: true };
              const isIncluded = state.isIncluded !== false;
              const currentRaw = state.rawMarks;

              const isCompleted = isIncluded && currentRaw !== null && currentRaw !== undefined;

              const weightedContribution = isCompleted && a.maxMarks > 0
                ? ((currentRaw / a.maxMarks) * a.weight).toFixed(2)
                : null;

              return (
                <div
                  key={a.id}
                  className={`group p-3.5 rounded-spatial border transition-all duration-200 flex items-start gap-3 ${
                    !isIncluded
                      ? 'bg-surface-primary border-spatial-border opacity-50'
                      : isCompleted
                      ? 'bg-white border-spatial-success-border'
                      : 'bg-white border-spatial-border hover:border-spatial-border-strong hover:shadow-spatial-xs'
                  }`}
                >
                  {/* Include/Exclude Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleInclude(a.id)}
                    className="mt-0.5 flex-shrink-0 focus:outline-none"
                    title={isIncluded ? 'Click to exclude this assessment' : 'Click to include this assessment'}
                    style={{ minWidth: 20, minHeight: 20 }}
                  >
                    {isIncluded ? (
                      <CheckSquare className="w-[18px] h-[18px] text-spatial-accent" />
                    ) : (
                      <Square className="w-[18px] h-[18px] text-spatial-text-tertiary" />
                    )}
                  </button>

                  {/* Assessment Info */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-[13px] font-semibold line-clamp-1 block ${
                        !isIncluded ? 'line-through text-spatial-text-tertiary' : 'text-spatial-text'
                      }`}
                      title={a.name}
                    >
                      {a.name}
                    </span>

                    <div className="flex items-center gap-2 text-[11px] text-spatial-text-tertiary mt-0.5">
                      <span>Max {a.maxMarks}</span>
                      <span className="w-px h-3 bg-spatial-border-strong" />
                      <span className="font-semibold text-spatial-accent">{a.weight}% weight</span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-1.5">
                      {!isIncluded ? (
                        <span className="badge-neutral">
                          <EyeOff className="w-3 h-3" />
                          Excluded
                        </span>
                      ) : isCompleted ? (
                        <span className="badge-success">
                          <CheckCircle2 className="w-3 h-3" />
                          +{weightedContribution}%
                        </span>
                      ) : (
                        <span className="badge-warning">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Marks Input */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={a.maxMarks}
                        placeholder={!isIncluded ? '—' : '...'}
                        disabled={!isIncluded}
                        value={currentRaw !== null && currentRaw !== undefined ? currentRaw : ''}
                        onChange={(e) => handleMarkChange(a.id, a.maxMarks, e.target.value)}
                        className={`w-16 sm:w-[72px] px-2 py-2 text-center font-bold text-sm border rounded-spatial-sm outline-none transition-all ${
                          !isIncluded
                            ? 'bg-surface-primary border-spatial-border text-spatial-text-tertiary cursor-not-allowed'
                            : 'bg-surface-tertiary border-spatial-border-strong focus:ring-2 focus:ring-spatial-accent/30 focus:border-spatial-accent'
                        }`}
                        style={{ minHeight: 40 }}
                      />
                      <span className="text-[11px] text-spatial-text-tertiary font-medium">/{a.maxMarks}</span>
                    </div>

                    <span className="text-[10px] text-spatial-text-tertiary block mt-1">
                      {!isIncluded
                        ? 'not counted'
                        : isCompleted
                        ? `${weightedContribution}% earned`
                        : 'awaiting marks'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Internal Progress Summary */}
          <div className="p-4 rounded-spatial bg-spatial-accent-subtle border border-spatial-accent/10 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div>
                <span className="text-spatial-text-secondary">Accumulated Internal: </span>
                <strong className="text-spatial-text text-base">
                  {calculation.internalWeightedMarks.toFixed(2)}
                </strong>
                <span className="text-spatial-text-tertiary text-xs">
                  {' '}/ {calculation.applicableInternalWeight}% active
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {calculation.excludedWeight > 0 && (
                  <span className="badge-warning">
                    Excl: {calculation.excludedWeight}%
                  </span>
                )}
                {calculation.pendingInternalWeight > 0 && (
                  <span className="badge-neutral">
                    Pending: {calculation.pendingInternalWeight}%
                  </span>
                )}
                <span className="font-bold text-spatial-accent text-xs">
                  External: {calculation.externalWeight}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-spatial-text-tertiary leading-relaxed">
              Excluded and pending assessments are not counted as zero. Target is scaled to your active syllabus of <strong className="text-spatial-text-secondary">{calculation.applicableTotalWeight}%</strong>.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 4 — THE HERO RESULT
        ═══════════════════════════════════════ */}
        <section className="rounded-spatial-xl overflow-hidden animate-slide-up">
          {/* Result Header */}
          <div className={`p-5 sm:p-7 ${
            calculation.status === 'IMPOSSIBLE'
              ? 'bg-gradient-to-br from-gray-900 via-red-950/80 to-gray-900'
              : calculation.status === 'ALREADY_ACHIEVED'
              ? 'bg-gradient-to-br from-gray-900 via-emerald-950/60 to-gray-900'
              : 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900'
          } text-white space-y-5`}>

            {/* Title + Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="step-label !text-white/40 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  External Exam Requirement
                </span>
                <h3 className="text-base sm:text-lg font-bold mt-1 text-white/90">
                  Target: {calculation.targetGrade} ({calculation.targetCutoffMarks}/100)
                </h3>
              </div>

              <div className="flex-shrink-0">
                {calculation.status === 'ACHIEVABLE' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="w-4 h-4" />
                    ACHIEVABLE
                  </span>
                )}
                {calculation.status === 'ALREADY_ACHIEVED' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/25">
                    <Sparkles className="w-4 h-4" />
                    ALREADY SECURED
                  </span>
                )}
                {calculation.status === 'IMPOSSIBLE' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    <AlertTriangle className="w-4 h-4" />
                    NOT POSSIBLE
                  </span>
                )}
              </div>
            </div>

            {/* Primary Result */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <div className="md:col-span-2 space-y-2">
                <span className="text-[11px] text-white/40 uppercase tracking-[0.08em] font-semibold block">
                  Minimum External Exam Marks
                </span>

                {calculation.status === 'ACHIEVABLE' && (
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                        {calculation.deficit.toFixed(1)}
                      </span>
                      <span className="text-lg sm:text-xl text-white/40 font-semibold">
                        / {calculation.externalWeight}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mt-2 leading-relaxed">
                      You need at least{' '}
                      <strong className="text-emerald-400 font-bold">
                        {calculation.requiredExternalPercentage.toFixed(1)}%
                      </strong>{' '}
                      in your external exam to reach your target.
                    </p>
                  </div>
                )}

                {calculation.status === 'ALREADY_ACHIEVED' && (
                  <div>
                    <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tighter">
                      0 Needed
                    </span>
                    <p className="text-sm text-white/50 mt-2 leading-relaxed">
                      Your internal score of {calculation.internalWeightedMarks.toFixed(1)} already exceeds the target of {calculation.scaledTargetCutoff.toFixed(1)}.
                    </p>
                  </div>
                )}

                {calculation.status === 'IMPOSSIBLE' && (
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl sm:text-5xl font-black text-rose-400 tracking-tighter">
                        {calculation.deficit.toFixed(1)}
                      </span>
                      <span className="text-sm text-rose-300/60">
                        needed (max {calculation.externalWeight} available)
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mt-2 leading-relaxed">
                      Even with full external marks, your maximum possible total is{' '}
                      <strong className="text-white/80">{calculation.maxPossibleTotal} / {calculation.applicableTotalWeight}</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Breakdown Card */}
              <div className="p-4 rounded-spatial bg-white/[0.06] border border-white/[0.08] space-y-2.5 text-[13px]">
                <div className="flex justify-between items-center text-white/40">
                  <span>Target Cutoff</span>
                  <span className="font-bold text-white/80">{calculation.targetCutoffMarks}/100</span>
                </div>
                <div className="flex justify-between items-center text-white/40">
                  <span>Active Scope</span>
                  <span className="font-bold text-sky-400/80">{calculation.applicableTotalWeight}%</span>
                </div>
                <div className="flex justify-between items-center text-white/40">
                  <span>Internal Earned</span>
                  <span className="font-bold text-emerald-400/80">
                    {calculation.internalWeightedMarks.toFixed(1)} / {calculation.applicableInternalWeight}
                  </span>
                </div>
                <div className="flex justify-between items-center text-white/40">
                  <span>External Weight</span>
                  <span className="font-bold text-white/80">{calculation.externalWeight}%</span>
                </div>
                <div className="pt-2.5 border-t border-white/[0.08] flex justify-between items-center">
                  <span className="font-semibold text-white/50">Deficit</span>
                  <span className={`font-black text-base ${calculation.deficit <= calculation.externalWeight ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {calculation.deficit > 0 ? `${calculation.deficit.toFixed(1)}` : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* External Component Breakdown */}
            {calculation.externalComponents.length > 0 && calculation.status === 'ACHIEVABLE' && (
              <div className="pt-5 border-t border-white/[0.08] space-y-3">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] block">
                  External Component Breakdown
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {calculation.externalComponents.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3.5 rounded-spatial bg-white/[0.05] border border-white/[0.08] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-[13px] text-white/90 block">{comp.name}</span>
                        <span className="text-[11px] text-white/30">Weight: {comp.weight}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-400">
                          {comp.requiredRawMarks}{' '}
                          <span className="text-xs font-normal text-white/30">/ {comp.maxMarks}</span>
                        </span>
                        <span className="text-[10px] text-white/30 block">
                          ({calculation.requiredExternalPercentage.toFixed(0)}% raw)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
