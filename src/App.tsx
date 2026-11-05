import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Search,
  X,
  BookOpen,
} from 'lucide-react';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

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

  // Dropdown search & open state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active Subject
  const activeSubject = useMemo(() => {
    return curriculum.find((s) => s.code === selectedSubjectCode) || curriculum[0];
  }, [selectedSubjectCode]);

  // Current subject assessment states
  const currentSubjectStates: Record<string, AssessmentUserState> = useMemo(() => {
    return allMarks[activeSubject.code] || {};
  }, [allMarks, activeSubject.code]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Filtered subjects for dropdown search
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return curriculum;
    return curriculum.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-surface-primary text-spatial-text antialiased pb-20">
      {/* ═══════════════════════════════════════════
          HEADER — Floating translucent spatial bar
      ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-surface-secondary/80 backdrop-blur-spatial border-b border-spatial-border shadow-spatial-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
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

          <div className="flex items-center gap-2 flex-shrink-0">
            <AnimatedThemeToggler className="border border-spatial-border hover:bg-surface-tertiary text-spatial-text !min-h-[36px] !min-w-[36px] sm:!min-h-[40px] sm:!min-w-[40px]" />

            <button
              onClick={() => setShowCutoffEditor(!showCutoffEditor)}
              className="spatial-btn-ghost !px-2.5 !py-2 sm:!px-3 text-xs !min-h-[36px] sm:!min-h-[40px] rounded-spatial-sm border border-spatial-border flex-shrink-0"
              aria-label="Configure Grade Cutoffs"
            >
              <Settings className="w-4 h-4 text-spatial-text-secondary" />
              <span className="hidden sm:inline font-medium">Cutoffs</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT CONTAINER
      ═══════════════════════════════════════════ */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-4 sm:space-y-5">
        {/* Notice Banner */}
        {calcNotice && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-spatial bg-spatial-accent-subtle border border-spatial-accent/20 text-sm font-medium text-spatial-accent animate-fade-in shadow-spatial-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{calcNotice}</span>
            <button
              onClick={() => setCalcNotice(null)}
              className="text-spatial-accent/60 hover:text-spatial-accent p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            CUTOFF EDITOR — Floating Drawer
        ═══════════════════════════════════════ */}
        {showCutoffEditor && (
          <div className="spatial-card p-5 sm:p-6 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-spatial-text">
                  Grade Cutoff Assumptions
                </h3>
                <p className="text-xs text-spatial-text-tertiary mt-0.5">
                  Set your assumed cutoff marks out of 100 for each grade (relative grading assumptions).
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
            STEP 1 — SUBJECT SELECTION DROPDOWN
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="step-label">Step 1 — Select Subject</span>
            <span className="text-[11px] font-semibold text-spatial-text-tertiary">
              9 Official Courses
            </span>
          </div>

          {/* Unified Subject Dropdown with Search */}
          <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setSearchQuery('');
              }}
              className={`w-full p-3.5 sm:p-4 rounded-spatial border text-left flex items-center justify-between gap-3 transition-all duration-200 ${
                isDropdownOpen
                  ? 'bg-surface-secondary border-spatial-accent ring-2 ring-spatial-accent/20 shadow-spatial'
                  : 'bg-surface-secondary hover:bg-surface-tertiary border-spatial-border-strong shadow-spatial-xs'
              }`}
              style={{ minHeight: 52 }}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-spatial-sm bg-spatial-accent-subtle text-spatial-accent flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-spatial-accent bg-spatial-accent-subtle px-1.5 py-0.5 rounded">
                      {activeSubject.code}
                    </span>
                    <span className="text-xs text-spatial-text-tertiary">
                      {activeSubject.credits} Credits • {activeSubject.category}
                    </span>
                  </div>
                  <div className="text-sm sm:text-[15px] font-bold text-spatial-text truncate mt-0.5">
                    {activeSubject.name}
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`w-5 h-5 text-spatial-text-secondary transition-transform duration-200 flex-shrink-0 ${
                  isDropdownOpen ? 'transform rotate-180 text-spatial-accent' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-surface-secondary rounded-spatial-lg border border-spatial-border-strong shadow-spatial-lg z-40 overflow-hidden animate-scale-in">
                {/* Search Bar inside Dropdown */}
                <div className="p-3 border-b border-spatial-border bg-surface-primary">
                  <div className="relative">
                    <Search className="w-4 h-4 text-spatial-text-tertiary absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search subject by name or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-medium rounded-spatial-sm border border-spatial-border-strong bg-surface-tertiary text-spatial-text focus:outline-none focus:ring-2 focus:ring-spatial-accent/30 focus:border-spatial-accent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-spatial-text-tertiary hover:text-spatial-text"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject Items List */}
                <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-spatial-border/60">
                  {filteredSubjects.length === 0 ? (
                    <div className="p-4 text-center text-xs text-spatial-text-tertiary">
                      No subjects match "{searchQuery}"
                    </div>
                  ) : (
                    filteredSubjects.map((subj) => {
                      const isSelected = subj.code === selectedSubjectCode;
                      return (
                        <button
                          key={subj.code}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectCode(subj.code);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full p-3 sm:p-3.5 text-left flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-spatial-accent-subtle/80 text-spatial-accent'
                              : 'hover:bg-surface-primary text-spatial-text'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? 'bg-spatial-accent text-white'
                                    : 'bg-black/[0.04] text-spatial-text-secondary'
                                }`}
                              >
                                {subj.code}
                              </span>
                              <span className="text-[11px] text-spatial-text-tertiary">
                                {subj.credits} Credits • {subj.category}
                              </span>
                            </div>
                            <span className="text-sm font-semibold block mt-1 truncate">
                              {subj.name}
                            </span>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-spatial-accent flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Subject Details Bar */}
          <div className="pt-3 border-t border-spatial-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-spatial-text">{activeSubject.name}</span>
              <span className="text-spatial-text-tertiary">•</span>
              <span className="text-spatial-text-secondary">{activeSubject.credits} Credits</span>
              <span className="text-spatial-text-tertiary">•</span>
              <span className="text-spatial-text-secondary">{activeSubject.category}</span>
            </div>
            <div className="font-mono text-[11px] text-spatial-accent bg-spatial-accent-subtle px-3 py-1.5 rounded-full font-semibold flex-shrink-0 text-center sm:text-left border border-spatial-accent/15">
              Internal {100 - externalWeightTotal}% | External Exam {externalWeightTotal}%
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 2 — TARGET GRADE SELECTION
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="step-label">Step 2 — Target Grade</span>
            <span className="text-[11px] font-semibold text-spatial-accent">
              Assumed Cutoff: {targetCutoff} / 100 Marks
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
                      : 'bg-surface-secondary hover:bg-surface-tertiary text-spatial-text border-spatial-border hover:border-spatial-border-strong'
                  }`}
                  style={{ minHeight: 52 }}
                >
                  <span className="text-base font-bold block">{grade}</span>
                  <span
                    className={`text-[11px] block mt-0.5 ${
                      isSelected ? 'text-white/80' : 'text-spatial-text-tertiary'
                    }`}
                  >
                    {cutoffMark}+ marks
                  </span>
                </button>
              );
            })}

            {/* Custom Target Option */}
            <button
              onClick={() => setSelectedGrade('CUSTOM')}
              className={`py-2.5 px-2 rounded-spatial text-center transition-all duration-200 border col-span-3 sm:col-span-1 ${
                selectedGrade === 'CUSTOM'
                  ? 'bg-spatial-accent-subtle border-spatial-accent ring-1 ring-spatial-accent'
                  : 'bg-surface-secondary border-spatial-border hover:border-spatial-border-strong'
              }`}
              style={{ minHeight: 52 }}
            >
              <span
                className={`text-xs font-bold block ${
                  selectedGrade === 'CUSTOM' ? 'text-spatial-accent' : 'text-spatial-text'
                }`}
              >
                Custom Goal
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
                  className="w-12 px-1 py-0.5 text-center text-xs font-bold border border-spatial-border-strong rounded-md bg-surface-tertiary text-spatial-text focus:ring-2 focus:ring-spatial-accent/30 focus:border-spatial-accent outline-none"
                />
                <span className="text-[10px] text-spatial-text-tertiary">/100</span>
              </div>
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 3 — INTERNAL MARKS & EXCLUSIONS
        ═══════════════════════════════════════ */}
        <section className="spatial-card p-4 sm:p-6 space-y-4">
          {/* Header with Quick Action Filter Buttons */}
          <div className="flex flex-col gap-3 pb-3 border-b border-spatial-border">
            <div>
              <span className="step-label">Step 3 — Internal Assessment Marks</span>
              <p className="text-xs text-spatial-text-tertiary mt-1">
                Enter your marks for announced tests. Toggle checkboxes to include or exclude pending/unannounced components.
              </p>
            </div>

            {/* Quick Action Buttons */}
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

          {/* Assessment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {internalAssessments.map((a) => {
              const state = currentSubjectStates[a.id] || { rawMarks: null, isIncluded: true };
              const isIncluded = state.isIncluded !== false;
              const currentRaw = state.rawMarks;

              const isCompleted = isIncluded && currentRaw !== null && currentRaw !== undefined;

              const weightedContribution =
                isCompleted && a.maxMarks > 0
                  ? ((currentRaw / a.maxMarks) * a.weight).toFixed(2)
                  : null;

              return (
                <div
                  key={a.id}
                  className={`group p-3.5 rounded-spatial border transition-all duration-200 flex items-start gap-3 ${
                    !isIncluded
                      ? 'bg-surface-primary border-spatial-border opacity-50'
                      : isCompleted
                      ? 'bg-surface-secondary border-spatial-success-border shadow-spatial-xs'
                      : 'bg-surface-secondary border-spatial-border hover:border-spatial-border-strong hover:shadow-spatial-xs'
                  }`}
                >
                  {/* Include / Exclude Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleInclude(a.id)}
                    className="mt-0.5 flex-shrink-0 focus:outline-none p-0.5 rounded"
                    title={isIncluded ? 'Click to exclude this assessment' : 'Click to include this assessment'}
                    style={{ minWidth: 24, minHeight: 24 }}
                  >
                    {isIncluded ? (
                      <CheckSquare className="w-5 h-5 text-spatial-accent" />
                    ) : (
                      <Square className="w-5 h-5 text-spatial-text-tertiary" />
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
                          +{weightedContribution}% earned
                        </span>
                      ) : (
                        <span className="badge-warning">
                          <Clock className="w-3 h-3" />
                          Pending Marks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Marks Input Field */}
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
                      <span className="text-[11px] text-spatial-text-tertiary font-medium">
                        /{a.maxMarks}
                      </span>
                    </div>

                    <span className="text-[10px] text-spatial-text-tertiary block mt-1">
                      {!isIncluded
                        ? 'not counted'
                        : isCompleted
                        ? `${weightedContribution}% earned`
                        : 'not counted as 0'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Internal Progress Summary */}
          <div className="p-4 rounded-spatial bg-spatial-accent-subtle border border-spatial-accent/15 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div>
                <span className="text-spatial-text-secondary">Accumulated Internal Marks: </span>
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
                    Excluded: {calculation.excludedWeight}%
                  </span>
                )}
                {calculation.pendingInternalWeight > 0 && (
                  <span className="badge-neutral">
                    Pending: {calculation.pendingInternalWeight}%
                  </span>
                )}
                <span className="font-bold text-spatial-accent text-xs">
                  External Exam: {calculation.externalWeight}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-spatial-text-tertiary leading-relaxed">
              * Excluded and pending assessments are not penalized as zero. Target is dynamically scaled to your active syllabus of <strong className="text-spatial-text-secondary">{calculation.applicableTotalWeight}%</strong>.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STEP 4 — THE HERO RESULT SECTION
        ═══════════════════════════════════════ */}
        <section
          id="hero-result"
          className="rounded-spatial-xl overflow-hidden shadow-spatial-md animate-slide-up"
        >
          <div
            className={`p-5 sm:p-7 ${
              calculation.status === 'IMPOSSIBLE'
                ? 'bg-gradient-to-br from-gray-900 via-rose-950/80 to-gray-900'
                : calculation.status === 'ALREADY_ACHIEVED'
                ? 'bg-gradient-to-br from-gray-900 via-emerald-950/70 to-gray-900'
                : 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900'
            } text-white space-y-5`}
          >
            {/* Title + Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="step-label !text-white/50 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  External Examination Requirement Result
                </span>
                <h3 className="text-base sm:text-lg font-bold mt-1 text-white">
                  Target: {calculation.targetGrade} ({calculation.targetCutoffMarks}/100 Marks)
                </h3>
              </div>

              <div className="flex-shrink-0">
                {calculation.status === 'ACHIEVABLE' && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    ACHIEVABLE
                  </span>
                )}
                {calculation.status === 'ALREADY_ACHIEVED' && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Sparkles className="w-4 h-4" />
                    ALREADY SECURED
                  </span>
                )}
                {calculation.status === 'IMPOSSIBLE' && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4" />
                    TARGET NOT POSSIBLE
                  </span>
                )}
              </div>
            </div>

            {/* Primary Result Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <div className="md:col-span-2 space-y-2">
                <span className="text-[11px] text-white/50 uppercase tracking-[0.08em] font-semibold block">
                  Minimum External Exam Marks Needed
                </span>

                {calculation.status === 'ACHIEVABLE' && (
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                        {calculation.deficit.toFixed(1)}
                      </span>
                      <span className="text-lg sm:text-xl text-white/50 font-semibold">
                        / {calculation.externalWeight} weighted marks
                      </span>
                    </div>
                    <p className="text-sm text-white/70 mt-2 leading-relaxed">
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
                    <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tighter">
                      0 Marks Needed
                    </span>
                    <p className="text-sm text-white/70 mt-2 leading-relaxed">
                      Your accumulated internal score ({calculation.internalWeightedMarks.toFixed(1)} marks) already satisfies your goal of {calculation.scaledTargetCutoff.toFixed(1)} marks.
                    </p>
                  </div>
                )}

                {calculation.status === 'IMPOSSIBLE' && (
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl sm:text-5xl font-black text-rose-400 tracking-tighter">
                        {calculation.deficit.toFixed(1)}
                      </span>
                      <span className="text-sm text-rose-300/70">
                        needed (max {calculation.externalWeight} available)
                      </span>
                    </div>
                    <p className="text-sm text-white/70 mt-2 leading-relaxed">
                      Even with full marks on the external exam, your highest possible total is{' '}
                      <strong className="text-white font-bold">{calculation.maxPossibleTotal} / {calculation.applicableTotalWeight}</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Breakdown Mini Card */}
              <div className="p-4 rounded-spatial bg-white/[0.06] border border-white/[0.08] space-y-2.5 text-[13px]">
                <div className="flex justify-between items-center text-white/50">
                  <span>Target Cutoff</span>
                  <span className="font-bold text-white/90">{calculation.targetCutoffMarks}/100</span>
                </div>
                <div className="flex justify-between items-center text-white/50">
                  <span>Active Scope</span>
                  <span className="font-bold text-sky-400/90">{calculation.applicableTotalWeight}%</span>
                </div>
                <div className="flex justify-between items-center text-white/50">
                  <span>Internal Earned</span>
                  <span className="font-bold text-emerald-400/90">
                    {calculation.internalWeightedMarks.toFixed(1)} / {calculation.applicableInternalWeight}
                  </span>
                </div>
                <div className="flex justify-between items-center text-white/50">
                  <span>External Weight</span>
                  <span className="font-bold text-white/90">{calculation.externalWeight}%</span>
                </div>
                <div className="pt-2.5 border-t border-white/[0.08] flex justify-between items-center">
                  <span className="font-semibold text-white/60">Net External Deficit</span>
                  <span
                    className={`font-black text-base ${
                      calculation.deficit <= calculation.externalWeight ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {calculation.deficit > 0 ? `${calculation.deficit.toFixed(1)}` : '0 (Secured)'}
                  </span>
                </div>
              </div>
            </div>

            {/* External Component Breakdown */}
            {calculation.externalComponents.length > 0 && calculation.status === 'ACHIEVABLE' && (
              <div className="pt-5 border-t border-white/[0.08] space-y-3">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.08em] block">
                  Required Score on External Examination Component(s):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {calculation.externalComponents.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3.5 rounded-spatial bg-white/[0.05] border border-white/[0.08] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-[13px] text-white/90 block">
                          {comp.name}
                        </span>
                        <span className="text-[11px] text-white/40">Weight: {comp.weight}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-400">
                          {comp.requiredRawMarks}{' '}
                          <span className="text-xs font-normal text-white/40">/ {comp.maxMarks}</span>
                        </span>
                        <span className="text-[10px] text-white/40 block">
                          ({calculation.requiredExternalPercentage.toFixed(0)}% raw score)
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
