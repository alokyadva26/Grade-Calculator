import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumPath = path.join(__dirname, '../data/curriculum.json');
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

console.log('================================================================');
console.log('TEST SUITE: SELECTABLE & EXCLUDABLE INTERNAL ASSESSMENTS');
console.log('================================================================\n');

// Subject: Competitive Coding-II (24CSP-305)
// Total 100%: External Viva 40%, Mid-Term 15%, 10 Experiments @ 4.5% each (45%)
const ccSubject = curriculum.find(s => s.code === '24CSP-305');
if (!ccSubject) throw new Error('Competitive Coding subject not found');

console.log('SCENARIO: Teacher has announced marks for ONLY 5 of 10 experiments.');
console.log('Student enters Mid-Term (12/15) and 5 Experiments (30/30 each).');
console.log('Experiments 6 to 10 are EXCLUDED.\n');

const userStates = {};

// Mid-Term Test: 12 / 15 -> (12 / 15) * 15% = 12.0%
userStates['CC_MID'] = { rawMarks: 12, isIncluded: true };

// Experiments 1 to 5: 30 / 30 -> 4.5% each = 22.5%
for (let i = 1; i <= 5; i++) {
  userStates[`CC_EXP${i}`] = { rawMarks: 30, isIncluded: true };
}

// Experiments 6 to 10: EXCLUDED (marks unannounced)
for (let i = 6; i <= 10; i++) {
  userStates[`CC_EXP${i}`] = { rawMarks: null, isIncluded: false };
}

// Target: Grade A (88 / 100)
const targetGradeCutoff = 88;

// Test calculation logic
const internals = ccSubject.assessments.filter(a => !a.isExternal);
const externals = ccSubject.assessments.filter(a => a.isExternal);

let excludedWeight = 0;
let completedInternalWeight = 0;
let internalWeightedMarks = 0;

for (const comp of internals) {
  const state = userStates[comp.id] || { rawMarks: null, isIncluded: true };
  if (!state.isIncluded) {
    excludedWeight += comp.weight;
  } else if (state.rawMarks !== null) {
    completedInternalWeight += comp.weight;
    internalWeightedMarks += (state.rawMarks / comp.maxMarks) * comp.weight;
  }
}

const applicableTotalWeight = 100 - excludedWeight;
const scaledTarget = (targetGradeCutoff / 100) * applicableTotalWeight;
const externalWeight = externals.reduce((sum, a) => sum + a.weight, 0); // 40%
const deficit = scaledTarget - internalWeightedMarks;
const reqExtPercentage = (deficit / externalWeight) * 100;
const reqExtRaw = (reqExtPercentage / 100) * externals[0].maxMarks;

console.log(`1. Total Official Weight: 100.0%`);
console.log(`2. Excluded Weight (5 experiments @ 4.5%): ${excludedWeight}% (Expected: 22.5%)`);
console.log(`3. Applicable Syllabus Weight: ${applicableTotalWeight}% (Expected: 77.5%)`);
console.log(`4. Internal Marks Earned: ${internalWeightedMarks}% (Midterm: 12% + 5 Exp: 22.5% = 34.5%)`);
console.log(`5. Scaled Target for A Grade (88% on 77.5% syllabus): ${scaledTarget.toFixed(2)} marks`);
console.log(`6. Required External Deficit: ${deficit.toFixed(2)} weighted marks out of ${externalWeight}%`);
console.log(`7. Required External Raw Marks: ${reqExtRaw.toFixed(2)} / ${externals[0].maxMarks}`);
console.log(`8. Required External %: ${reqExtPercentage.toFixed(1)}%\n`);

if (excludedWeight !== 22.5) throw new Error('Excluded weight mismatch!');
if (applicableTotalWeight !== 77.5) throw new Error('Applicable weight mismatch!');
if (internalWeightedMarks !== 34.5) throw new Error('Internal earned marks mismatch!');
if (Number(scaledTarget.toFixed(2)) !== 68.2) throw new Error('Scaled target mismatch!');
if (Number(deficit.toFixed(2)) !== 33.7) throw new Error('Deficit mismatch!');

console.log('[PASS] Calculation with 5 excluded experiments verified.');

// Re-enabling test: Enable Experiment 6 with 30/30
console.log('\nTEST: Marks for Experiment 6 become available (30/30). Re-enabling Exp 6:');
userStates['CC_EXP6'] = { rawMarks: 30, isIncluded: true };

let reExWeight = 0;
let reInternalEarned = 0;
for (const comp of internals) {
  const state = userStates[comp.id] || { rawMarks: null, isIncluded: true };
  if (!state.isIncluded) reExWeight += comp.weight;
  else if (state.rawMarks !== null) reInternalEarned += (state.rawMarks / comp.maxMarks) * comp.weight;
}
const reApplicable = 100 - reExWeight;
const reScaledTarget = (targetGradeCutoff / 100) * reApplicable;
const reDeficit = reScaledTarget - reInternalEarned;
const reReqRaw = (reDeficit / externalWeight) * externals[0].maxMarks;

console.log(`- New Excluded Weight (4 experiments): ${reExWeight}%`);
console.log(`- New Internal Marks: ${reInternalEarned}% (+4.5% from Exp 6 = 39.0%)`);
console.log(`- New Required External Raw: ${reReqRaw.toFixed(2)} / 40`);

if (reExWeight !== 18.0 || reInternalEarned !== 39.0) {
  throw new Error('Re-enable calculation mismatch!');
}
console.log('[PASS] Re-enabling dynamically updates calculations.\n');

console.log('ALL SELECTABLE ASSESSMENT TESTS PASSED SUCCESSFULLY! (100% Accuracy)');
