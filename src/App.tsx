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

  // Exclude all unmarked assessments (super handy when teacher announced only 5 of 10)
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
          isIncluded: hasMark, // include only if marks entered
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                CU External Marks Calculator
              </h1>
              <p className="text-xs text-slate-500">
                Chandigarh University • Target Grade & External Exam Solver
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCutoffEditor(!showCutoffEditor)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configure Grade Cutoffs</span>
            <span className="sm:hidden">Cutoffs</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Notice alert */}
        {calcNotice && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 animate-in fade-in">
            {calcNotice}
          </div>
        )}

        {/* Grade Cutoffs Configuration Drawer */}
        {showCutoffEditor && (
          <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Assumed Grade Cutoff Marks (Relative Grading)
                </h3>
                <p className="text-xs text-slate-500">
                  Set your assumed cutoff marks out of 100 for each grade.
                </p>
              </div>
              <button
                onClick={handleResetCutoffs}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {['A+', 'A', 'B+', 'B', 'C'].map((grade) => (
                <div key={grade} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-extrabold text-indigo-700 block mb-1">
                    Grade {grade}
                  </span>
                  <div className="flex items-center gap-1">
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
                      className="w-full px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1. Subject Selection Bar */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 1: Select Subject
            </h2>
            <span className="text-xs text-slate-500">9 Official Courses</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {curriculum.map((subj) => {
              const isSelected = subj.code === selectedSubjectCode;
              return (
                <button
                  key={subj.code}
                  onClick={() => setSelectedSubjectCode(subj.code)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 font-semibold'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] block ${
                      isSelected ? 'text-indigo-200' : 'text-indigo-600 font-bold'
                    }`}
                  >
                    {subj.code}
                  </span>
                  <span className="text-xs font-bold line-clamp-1 block mt-0.5" title={subj.name}>
                    {subj.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Subject Info Header */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-900">{activeSubject.name}</span>
              <span className="mx-2">•</span>
              <span>{activeSubject.credits} Credits</span>
              <span className="mx-2">•</span>
              <span>{activeSubject.category}</span>
            </div>
            <div className="font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md font-semibold border border-indigo-100">
              Official Split: Internal {100 - externalWeightTotal}% | External Exam {externalWeightTotal}%
            </div>
          </div>
        </section>

        {/* 2. Target Grade Selection */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 2: Choose Desired Target Grade
            </h2>
            <span className="text-xs text-slate-500">
              Target Cutoff: <strong className="text-indigo-600">{targetCutoff} / 100 Marks</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['A+', 'A', 'B+', 'B', 'C'].map((grade) => {
              const isSelected = selectedGrade === grade;
              const cutoffMark = cutoffs[grade] || 88;
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-sm font-extrabold block">{grade}</span>
                  <span className={`text-[11px] ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {cutoffMark}+ marks
                  </span>
                </button>
              );
            })}

            {/* Custom Target Option */}
            <div
              onClick={() => setSelectedGrade('CUSTOM')}
              className={`flex-1 min-w-[130px] p-2 rounded-xl border cursor-pointer flex items-center gap-2 ${
                selectedGrade === 'CUSTOM'
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="grade"
                checked={selectedGrade === 'CUSTOM'}
                onChange={() => setSelectedGrade('CUSTOM')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-800 block">Custom Goal:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="35"
                    max="100"
                    value={customTargetMarks}
                    onChange={(e) => {
                      setCustomTargetMarks(parseInt(e.target.value) || 0);
                      setSelectedGrade('CUSTOM');
                    }}
                    className="w-14 px-1 py-0.5 text-center text-xs font-bold border border-slate-300 rounded bg-white"
                  />
                  <span className="text-[10px] text-slate-500">/100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Enter Internal Marks & Selectable Assessments */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 3: Internal Assessments & Selection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check or uncheck assessments to include/exclude them. Enter your marks for announced tests.
              </p>
            </div>

            {/* Assessment Quick Filter Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleIncludeAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Include all assessments in calculation"
              >
                Include All
              </button>

              <button
                onClick={handleExcludeUnmarked}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                title="Exclude any assessment where marks are not yet announced"
              >
                Exclude Unannounced
              </button>

              <button
                onClick={handleFillSampleInternals}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill 80%</span>
              </button>

              <button
                onClick={handleClearSubjectInternals}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Assessment Cards Grid with Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {internalAssessments.map((a) => {
              const state = currentSubjectStates[a.id] || { rawMarks: null, isIncluded: true };
              const isIncluded = state.isIncluded !== false;
              const currentRaw = state.rawMarks;

              // Distinct states:
              // 1. Excluded: isIncluded === false
              // 2. Completed: isIncluded && rawMarks !== null
              // 3. Pending: isIncluded && rawMarks === null
              const isCompleted = isIncluded && currentRaw !== null && currentRaw !== undefined;

              const weightedContribution = isCompleted && a.maxMarks > 0
                ? ((currentRaw / a.maxMarks) * a.weight).toFixed(2)
                : null;

              return (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    !isIncluded
                      ? 'bg-slate-100/70 border-slate-200 opacity-60'
                      : isCompleted
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Include/Exclude Toggle Checkbox and Title */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleInclude(a.id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 focus:outline-hidden"
                      title={isIncluded ? 'Click to exclude this assessment' : 'Click to include this assessment'}
                    >
                      {isIncluded ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold line-clamp-1 ${
                            !isIncluded ? 'line-through text-slate-500' : 'text-slate-800'
                          }`}
                          title={a.name}
                        >
                          {a.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span>Max: {a.maxMarks}</span>
                        <span>•</span>
                        <span className="font-semibold text-indigo-600">{a.weight}% wt</span>
                      </div>

                      {/* State Badge */}
                      <div className="mt-1">
                        {!isIncluded ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                            <EyeOff className="w-3 h-3" />
                            Excluded
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed (+{weightedContribution}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Marks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Raw Mark Input */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={a.maxMarks}
                        placeholder={!isIncluded ? '—' : 'Pending'}
                        disabled={!isIncluded}
                        value={currentRaw !== null && currentRaw !== undefined ? currentRaw : ''}
                        onChange={(e) => handleMarkChange(a.id, a.maxMarks, e.target.value)}
                        className={`w-16 px-2 py-1 text-center font-bold text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                          !isIncluded
                            ? 'bg-slate-200/50 border-slate-300 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-300'
                        }`}
                      />
                      <span className="text-xs text-slate-400">/{a.maxMarks}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 block mt-1">
                      {!isIncluded
                        ? '0% wt'
                        : isCompleted
                        ? `${weightedContribution}% earned`
                        : 'Not counted as 0'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Internal Progress & Active Weight Breakdown */}
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-600 font-medium">Accumulated Internal Marks: </span>
                <strong className="text-slate-900 text-sm">
                  {calculation.internalWeightedMarks.toFixed(2)}
                </strong>{' '}
                <span className="text-slate-500">
                  / {calculation.applicableInternalWeight}% active internal weight
                </span>
              </div>

              <div className="flex items-center gap-3">
                {calculation.excludedWeight > 0 && (
                  <span className="text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded">
                    Excluded: {calculation.excludedWeight}%
                  </span>
                )}
                {calculation.pendingInternalWeight > 0 && (
                  <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Pending: {calculation.pendingInternalWeight}%
                  </span>
                )}
                <span className="text-indigo-900 font-bold">
                  External Exam: {calculation.externalWeight}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * Note: Excluded and pending assessments do not penalize your score as zeros. The target is dynamically evaluated over your active syllabus of <strong>{calculation.applicableTotalWeight}%</strong>.
            </p>
          </div>
        </section>

        {/* 4. THE HERO RESULT: Required External Marks */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>External Examination Requirement Result</span>
              </span>
              <h3 className="text-lg sm:text-xl font-bold mt-1 text-white">
                Target: {calculation.targetGrade} ({calculation.targetCutoffMarks}/100 Marks)
              </h3>
            </div>

            {/* Feasibility Status Badge */}
            <div>
              {calculation.status === 'ACHIEVABLE' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" />
                  ACHIEVABLE
                </span>
              )}
              {calculation.status === 'ALREADY_ACHIEVED' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                  <Sparkles className="w-4 h-4" />
                  ALREADY SECURED
                </span>
              )}
              {calculation.status === 'IMPOSSIBLE' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <AlertTriangle className="w-4 h-4" />
                  TARGET NOT POSSIBLE
                </span>
              )}
            </div>
          </div>

          {/* Primary Result Callout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Big Stat: Required External Score */}
            <div className="md:col-span-2 space-y-2">
              <span className="text-xs text-indigo-300 uppercase tracking-wider font-semibold block">
                Minimum Marks Required in External Exam
              </span>

              {calculation.status === 'ACHIEVABLE' && (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {calculation.deficit.toFixed(1)}
                    </span>
                    <span className="text-xl sm:text-2xl text-indigo-300 font-bold">
                      / {calculation.externalWeight} weighted marks
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                    You must score at least{' '}
                    <strong className="text-emerald-400 font-bold text-base">
                      {calculation.requiredExternalPercentage.toFixed(1)}%
                    </strong>{' '}
                    in your external examination to secure your target grade.
                  </p>
                </div>
              )}

              {calculation.status === 'ALREADY_ACHIEVED' && (
                <div>
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                    0 Marks Needed
                  </span>
                  <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                    Your accumulated internal score ({calculation.internalWeightedMarks.toFixed(1)} marks) already satisfies your goal of {calculation.scaledTargetCutoff.toFixed(1)} marks.
                  </p>
                </div>
              )}

              {calculation.status === 'IMPOSSIBLE' && (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-rose-400 tracking-tight">
                      Needs {calculation.deficit.toFixed(1)} marks
                    </span>
                    <span className="text-sm text-rose-200">
                      (Max {calculation.externalWeight} available)
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                    Even with full marks on the external exam, your highest possible total is{' '}
                    <strong className="text-white font-bold">{calculation.maxPossibleTotal} / {calculation.applicableTotalWeight}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Breakdown Mini Box */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Target Cutoff:</span>
                <span className="font-bold text-white">{calculation.targetCutoffMarks}/100</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Active Scope:</span>
                <span className="font-bold text-indigo-300">{calculation.applicableTotalWeight}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Internal Marks Earned:</span>
                <span className="font-bold text-emerald-300">
                  {calculation.internalWeightedMarks.toFixed(1)} / {calculation.applicableInternalWeight}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>External Weight:</span>
                <span className="font-bold text-white">{calculation.externalWeight}%</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center font-bold">
                <span className="text-slate-300">Net External Deficit:</span>
                <span className={calculation.deficit <= calculation.externalWeight ? 'text-emerald-400' : 'text-rose-400'}>
                  {calculation.deficit > 0 ? `${calculation.deficit.toFixed(1)} marks` : '0 (Secured)'}
                </span>
              </div>
            </div>
          </div>

          {/* Component-wise breakdown for multi-component external examinations */}
          {calculation.externalComponents.length > 0 && calculation.status === 'ACHIEVABLE' && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
                Required Raw Score on External Examination:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calculation.externalComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{comp.name}</span>
                      <span className="text-[11px] text-indigo-300">Weight: {comp.weight}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-400">
                        {comp.requiredRawMarks} <span className="text-xs font-normal text-slate-300">/ {comp.maxMarks}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({calculation.requiredExternalPercentage.toFixed(0)}% raw score)
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
