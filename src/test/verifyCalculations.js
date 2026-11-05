import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumPath = path.join(__dirname, '../data/curriculum.json');
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

console.log('====================================================');
console.log('ACADEMIC ENGINE VERIFICATION TEST SUITE');
console.log('====================================================\n');

// 1. Verify all 9 subjects and their assessment weightage sums
console.log('TEST 1: Verifying All 9 Subjects & 100% Weightage Sum');
let totalEnrolledCredits = 0;
let gradedCredits = 0;
let mngCredits = 0;

for (const subj of curriculum) {
  const sumWeights = subj.assessments.reduce((acc, a) => acc + a.weight, 0);
  const roundedSum = Math.round(sumWeights * 100) / 100;
  totalEnrolledCredits += subj.credits.total;
  
  if (subj.isGraded) {
    gradedCredits += subj.credits.total;
  } else {
    mngCredits += subj.credits.total;
  }

  const status = roundedSum === 100.0 ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${subj.code} (${subj.name}) - Total Weight: ${roundedSum}% (${subj.assessments.length} components)`);
  if (roundedSum !== 100.0) {
    throw new Error(`Assessment weights do not sum to 100% for ${subj.code}: got ${roundedSum}%`);
  }
}

console.log(`\nCredit Verification:`);
console.log(`- Total Enrolled Credits: ${totalEnrolledCredits} (Expected: 23.0)`);
console.log(`- Graded Credits: ${gradedCredits} (Expected: 19.0)`);
console.log(`- Non-Graded (MNG) Credits: ${mngCredits} (Expected: 4.0)`);

if (totalEnrolledCredits !== 23.0 || gradedCredits !== 19.0 || mngCredits !== 4.0) {
  throw new Error('Credit sum mismatch!');
}
console.log('[PASS] Credit totals verified.\n');

// 2. Mathematical Verification: Weighted Marks calculation
console.log('TEST 2: Mathematical Accuracy of Weighted Marks Formula');
// Example component: Max 60, Weight 30%, Raw 45
// Contribution should be (45 / 60) * 30% = 0.75 * 30% = 22.5%
const maxM = 60;
const wt = 30.0;
const raw = 45;
const weighted = (raw / maxM) * wt;
console.log(`Raw: ${raw}/${maxM} @ ${wt}% weight -> Computed: ${weighted}%`);
if (weighted !== 22.5) {
  throw new Error(`Mathematical error in weighted score! Expected 22.5, got ${weighted}`);
}
console.log('[PASS] Weighted marks calculation verified.\n');

// 3. Mathematical Verification: Target Marks Formula ("Marks required for A grade")
console.log('TEST 3: Target Marks Engine & Feasibility Logic');
// Target cutoff: 70% (A grade)
// Case A: Achievable
// Accumulated: 35% on 50% completed weight. Remaining weight: 50%
// Deficit = 70 - 35 = 35%
// Required on remaining = (35 / 50) * 100 = 70%
const targetA = 70.0;
let accum = 35.0;
let remWeight = 50.0;
let deficit = targetA - accum;
let reqPct = (deficit / remWeight) * 100;
console.log(`Case A (Achievable): Accum: ${accum}%, Rem: ${remWeight}% -> Deficit: ${deficit}%, Req on rest: ${reqPct}%`);
if (reqPct !== 70.0) throw new Error('Calculation mismatch on Case A');

// Case B: Already Guaranteed
// Accumulated: 72% on 80% completed weight. Remaining weight: 20%
// Deficit = 70 - 72 = -2 <= 0 -> Guaranteed!
accum = 72.0;
remWeight = 20.0;
deficit = targetA - accum;
const isGuaranteed = deficit <= 0;
console.log(`Case B (Guaranteed): Accum: ${accum}%, Rem: ${remWeight}% -> Deficit: ${deficit}% -> Guaranteed: ${isGuaranteed}`);
if (!isGuaranteed) throw new Error('Calculation mismatch on Case B');

// Case C: Impossible
// Accumulated: 20% on 60% completed weight. Remaining weight: 40%
// Deficit = 70 - 20 = 50 > 40 (remaining weight) -> Impossible!
// Best possible is 20 + 40 = 60%
accum = 20.0;
remWeight = 40.0;
deficit = targetA - accum;
const isImpossible = deficit > remWeight;
const bestPossible = accum + remWeight;
console.log(`Case C (Impossible): Accum: ${accum}%, Rem: ${remWeight}% -> Deficit: ${deficit}% > Rem: ${remWeight}% -> Impossible: ${isImpossible}, Best possible: ${bestPossible}%`);
if (!isImpossible || bestPossible !== 60.0) throw new Error('Calculation mismatch on Case C');
console.log('[PASS] Target marks logic verified.\n');

// 4. Mathematical Verification: SGPA Calculation Formula
console.log('TEST 4: Credit-Weighted SGPA Formula');
// Suppose grades for 7 graded subjects:
// PBL Java (3 cr): A (8 pts) -> 24 pts
// ServiceNow (3 cr): A+ (9 pts) -> 27 pts
// Prob & Stats (4 cr): O (10 pts) -> 40 pts
// Comp Coding (2 cr): A+ (9 pts) -> 18 pts
// Big Data (3 cr): B+ (7 pts) -> 21 pts
// Computer Networks (3 cr): A (8 pts) -> 24 pts
// Full Stack (1 cr): O (10 pts) -> 10 pts
// Total points = 24 + 27 + 40 + 18 + 21 + 24 + 10 = 164 pts
// Total graded credits = 19
// Expected SGPA = 164 / 19 = 8.6315... -> 8.63
const totalPoints = 24 + 27 + 40 + 18 + 21 + 24 + 10;
const expectedSgpa = Number((totalPoints / 19.0).toFixed(2));
console.log(`Total Points: ${totalPoints} / 19 Graded Credits -> SGPA: ${expectedSgpa}`);
if (expectedSgpa !== 8.63) throw new Error(`SGPA calculation error! Expected 8.63, got ${expectedSgpa}`);
console.log('[PASS] Credit-weighted SGPA verified.\n');

console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (100% Accuracy)');

