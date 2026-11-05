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
  ChevronDown,
  Check,
  X,
  Sliders,
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

  // Cutoffs editor toggle
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
    setCalcNotice('Excluded assessments with pending marks.');
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
    setCalcNotice('All assessments included.');
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
    setCalcNotice('Loaded 80% sample marks.');
    setTimeout(() => setCalcNotice(null), 2500);
  };

  // Clear subject marks
  const handleClearSubjectInternals = () => {
    setAllMarks((prev) => {
      const copy = { ...prev };
      delete copy[activeSubject.code];
      return copy;
    });
    setCalcNotice('Marks cleared for this subject.');
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
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] antialiased">
      {/* ── Top Header ── */}
      <header className="border-b border-[#e5e5ea] bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1d1d1f] text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#1d1d1f]">
              CU Grade Calculator
            </span>
          </div>

          <button
            onClick={() => setShowCutoffEditor(!showCutoffEditor)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cutoffs</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Notice Message */}
        {calcNotice && (
          <div className="px-3 py-2 rounded-lg bg-[#f2f2f7] border border-[#e5e5ea] text-xs font-medium text-[#1d1d1f] flex items-center justify-between">
            <span>{calcNotice}</span>
            <button onClick={() => setCalcNotice(null)} className="text-[#86868b] hover:text-[#1d1d1f]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cutoff Configuration Drawer */}
        {showCutoffEditor && (
          <div className="min-card p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-[#f2f2f7] pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-[#1d1d1f]">Relative Grade Cutoffs</h3>
                <p className="text-[11px] text-[#86868b]">Assumed minimum score out of 100 for each grade</p>
              </div>
              <button
                onClick={handleResetCutoffs}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071e3] hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {['A+', 'A', 'B+', 'B', 'C'].map((grade) => (
                <div key={grade} className="text-center">
                  <span className="block text-[11px] font-semibold text-[#6e6e73] mb-1">
                    {grade}
                  </span>
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
                    className="w-full text-center py-1 px-1 rounded-md border border-[#d1d1d6] text-xs font-semibold focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 1. Clean Prominent Subject Dropdown ── */}
        <section className="space-y-2">
          <label htmlFor="subject-select" className="block text-xs font-semibold text-[#86868b] uppercase tracking-wider">
            Select Subject
          </label>
          <div className="relative">
            <select
              id="subject-select"
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              className="w-full appearance-none bg-white min-card px-3.5 py-2.5 min-h-[44px] text-sm sm:text-base font-semibold text-[#1d1d1f] cursor-pointer focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 pr-10 shadow-xs"
            >
              {curriculum.map((subj) => (
                <option key={subj.code} value={subj.code}>
                  {subj.code} — {subj.name} ({subj.credits} Cr)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#86868b]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Subject metadata */}
          <div className="flex items-center justify-between px-1 text-xs text-[#86868b]">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[#1d1d1f]">{activeSubject.name}</span>
              <span>•</span>
              <span>{activeSubject.credits} Credits</span>
              <span>•</span>
              <span>{activeSubject.category}</span>
            </div>
            <span className="font-medium text-[#0071e3]">
              Internal {100 - externalWeightTotal}% / External {externalWeightTotal}%
            </span>
          </div>
        </section>

        {/* ── 2. Target Grade Segmented Control ── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Target Grade
            </label>
            <span className="text-xs font-medium text-[#6e6e73]">
              Cutoff: <strong className="text-[#1d1d1f]">{targetCutoff}</strong>/100
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1 bg-[#f2f2f7] p-1 rounded-xl border border-[#e5e5ea]">
            {['A+', 'A', 'B+', 'B', 'C'].map((grade) => {
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white text-[#1d1d1f] shadow-xs'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  {grade}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedGrade('CUSTOM')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedGrade === 'CUSTOM'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Inline custom mark input if Custom is active */}
          {selectedGrade === 'CUSTOM' && (
            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#e5e5ea] text-xs">
              <span className="text-[#6e6e73] font-medium">Custom target marks:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="35"
                  max="100"
                  value={customTargetMarks}
                  onChange={(e) => setCustomTargetMarks(parseInt(e.target.value) || 0)}
                  className="w-14 text-center py-1 px-1 rounded border border-[#d1d1d6] font-semibold text-xs focus:outline-none focus:border-[#0071e3]"
                />
                <span className="text-[#86868b]">/100</span>
              </div>
            </div>
          )}
        </section>

        {/* ── 3. Internal Marks Entry (Apple Settings Grouped Table) ── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Internal Assessments
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleIncludeAll}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-[#6e6e73] hover:bg-[#f2f2f7]"
                title="Include all assessments"
              >
                Include All
              </button>
              <button
                type="button"
                onClick={handleExcludeUnmarked}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-[#975a16] bg-[#fef7ec] hover:bg-[#feebc8]"
                title="Exclude assessments without announced marks"
              >
                Only Announced
              </button>
              <button
                type="button"
                onClick={handleFillSampleInternals}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-[#0071e3] hover:bg-[#f2f2f7]"
              >
                Fill 80%
              </button>
              <button
                type="button"
                onClick={handleClearSubjectInternals}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-[#86868b] hover:text-[#e02424] hover:bg-[#f2f2f7]"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Grouped Inset List */}
          <div className="min-card overflow-hidden divide-y divide-[#f2f2f7]">
            {internalAssessments.map((a) => {
              const state = currentSubjectStates[a.id] || { rawMarks: null, isIncluded: true };
              const isIncluded = state.isIncluded !== false;
              const currentRaw = state.rawMarks;
              const isCompleted = isIncluded && currentRaw !== null && currentRaw !== undefined;
              const weightedContribution = isCompleted && a.maxMarks > 0
                ? ((currentRaw / a.maxMarks) * a.weight).toFixed(1)
                : null;

              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                    !isIncluded ? 'bg-[#fafafc] opacity-60' : 'bg-white'
                  }`}
                >
                  {/* Left: Checkbox & Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                    <button
                      type="button"
                      onClick={() => handleToggleInclude(a.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                        isIncluded
                          ? 'bg-[#0071e3] text-white'
                          : 'border border-[#c7c7cc] bg-white text-transparent'
                      }`}
                      aria-label={isIncluded ? `Exclude ${a.name}` : `Include ${a.name}`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium truncate block ${
                            !isIncluded ? 'line-through text-[#86868b]' : 'text-[#1d1d1f]'
                          }`}
                          title={a.name}
                        >
                          {a.name}
                        </span>
                        {!isIncluded && (
                          <span className="min-badge-neutral">Excluded</span>
                        )}
                        {isCompleted && (
                          <span className="min-badge-success">+{weightedContribution}%</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#86868b]">
                        Weight: {a.weight}% • Max: {a.maxMarks}
                      </span>
                    </div>
                  </div>

                  {/* Right: Input */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={a.maxMarks}
                      disabled={!isIncluded}
                      placeholder={!isIncluded ? '—' : '...'}
                      value={currentRaw !== null && currentRaw !== undefined ? currentRaw : ''}
                      onChange={(e) => handleMarkChange(a.id, a.maxMarks, e.target.value)}
                      className={`w-14 text-center py-1 px-1 rounded-md border text-xs font-semibold focus:outline-none focus:border-[#0071e3] ${
                        !isIncluded
                          ? 'bg-[#f2f2f7] border-transparent text-[#86868b] cursor-not-allowed'
                          : 'border-[#d1d1d6] bg-white text-[#1d1d1f]'
                      }`}
                    />
                    <span className="text-[11px] text-[#86868b] w-6">/{a.maxMarks}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact summary bar */}
          <div className="flex flex-wrap items-center justify-between px-1 py-1 text-xs text-[#86868b]">
            <div>
              <span>Earned Internal: </span>
              <strong className="text-[#1d1d1f] font-semibold">
                {calculation.internalWeightedMarks.toFixed(1)}
              </strong>
              <span> / {calculation.applicableInternalWeight}% scope</span>
            </div>
            {calculation.excludedWeight > 0 && (
              <span className="text-[#975a16] font-medium">
                {calculation.excludedWeight}% excluded
              </span>
            )}
          </div>
        </section>

        {/* ── 4. Final Calculated Result (Clean Minimalist Card) ── */}
        <section className="min-card p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#f2f2f7] pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                Required External Score
              </span>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">
                Target: {calculation.targetGrade} ({calculation.targetCutoffMarks}/100)
              </h2>
            </div>

            {/* Clean Status Pill */}
            <div>
              {calculation.status === 'ACHIEVABLE' && (
                <span className="min-badge-success px-2.5 py-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Achievable
                </span>
              )}
              {calculation.status === 'ALREADY_ACHIEVED' && (
                <span className="min-badge-success px-2.5 py-1 text-xs bg-[#e8f4fd] text-[#0071e3] border-[#bee3f8]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Target Secured
                </span>
              )}
              {calculation.status === 'IMPOSSIBLE' && (
                <span className="min-badge-danger px-2.5 py-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Not Possible
                </span>
              )}
            </div>
          </div>

          {/* Primary Result Number */}
          <div className="space-y-1">
            {calculation.status === 'ACHIEVABLE' && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1d1d1f]">
                    {calculation.deficit.toFixed(1)}
                  </span>
                  <span className="text-lg text-[#86868b] font-medium">
                    / {calculation.externalWeight} marks
                  </span>
                </div>
                <p className="text-xs text-[#6e6e73] pt-1">
                  You need at least{' '}
                  <strong className="text-[#1d1d1f] font-semibold">
                    {calculation.requiredExternalPercentage.toFixed(1)}%
                  </strong>{' '}
                  in the external examination to secure your target grade.
                </p>
              </>
            )}

            {calculation.status === 'ALREADY_ACHIEVED' && (
              <>
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c7430]">
                  0 Marks Needed
                </span>
                <p className="text-xs text-[#6e6e73] pt-1">
                  Your current internal score ({calculation.internalWeightedMarks.toFixed(1)}) already achieves the required goal.
                </p>
              </>
            )}

            {calculation.status === 'IMPOSSIBLE' && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#9b1c1c]">
                    {calculation.deficit.toFixed(1)}
                  </span>
                  <span className="text-xs text-[#9b1c1c]">
                    needed (only {calculation.externalWeight} available)
                  </span>
                </div>
                <p className="text-xs text-[#6e6e73] pt-1">
                  Highest possible total with 100% external score is{' '}
                  <strong className="text-[#1d1d1f] font-semibold">
                    {calculation.maxPossibleTotal} / {calculation.applicableTotalWeight}
                  </strong>.
                </p>
              </>
            )}
          </div>

          {/* 4-Stat Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#f2f2f7]">
            <div className="p-2.5 rounded-lg bg-[#fbfbfd] border border-[#f2f2f7]">
              <span className="block text-[11px] text-[#86868b]">Target Cutoff</span>
              <span className="text-xs font-semibold text-[#1d1d1f]">
                {calculation.targetCutoffMarks} / 100
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#fbfbfd] border border-[#f2f2f7]">
              <span className="block text-[11px] text-[#86868b]">Active Syllabus</span>
              <span className="text-xs font-semibold text-[#1d1d1f]">
                {calculation.applicableTotalWeight}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#fbfbfd] border border-[#f2f2f7]">
              <span className="block text-[11px] text-[#86868b]">Internal Earned</span>
              <span className="text-xs font-semibold text-[#1d1d1f]">
                {calculation.internalWeightedMarks.toFixed(1)} / {calculation.applicableInternalWeight}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#fbfbfd] border border-[#f2f2f7]">
              <span className="block text-[11px] text-[#86868b]">External Weight</span>
              <span className="text-xs font-semibold text-[#1d1d1f]">
                {calculation.externalWeight}%
              </span>
            </div>
          </div>

          {/* Multi-component Breakdown (if applicable) */}
          {calculation.externalComponents.length > 0 && calculation.status === 'ACHIEVABLE' && (
            <div className="pt-3 border-t border-[#f2f2f7] space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] block">
                External Exam Components
              </span>
              <div className="space-y-1.5">
                {calculation.externalComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#fbfbfd] border border-[#f2f2f7]"
                  >
                    <div>
                      <span className="text-xs font-medium text-[#1d1d1f] block">{comp.name}</span>
                      <span className="text-[11px] text-[#86868b]">Weight: {comp.weight}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#1d1d1f]">
                        {comp.requiredRawMarks}{' '}
                        <span className="text-xs font-normal text-[#86868b]">/ {comp.maxMarks}</span>
                      </span>
                      <span className="block text-[10px] text-[#86868b]">
                        ({calculation.requiredExternalPercentage.toFixed(0)}% raw)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default App;
