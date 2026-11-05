import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumPath = path.join(__dirname, '../data/curriculum.json');
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

export const GRADE_POINTS = {
  'A+': 10,
  'A': 9,
  'B+': 8,
  'B': 7,
  'C+': 6,
  'C': 5,
  'D': 4,
  'F': 0,
};

export function calculateSGPA(subjectGrades, includeMNG = false) {
  let totalCredits = 0;
  let totalGradePointsEarned = 0;

  for (const subject of curriculum) {
    const isMNG = subject.category.includes('MNG') || subject.category.includes('Non-Graded');
    if (isMNG && !includeMNG) {
      continue;
    }

    const grade = subjectGrades[subject.code] || 'A+';
    const points = GRADE_POINTS[grade] ?? 10;
    const creds = subject.credits;

    totalCredits += creds;
    totalGradePointsEarned += creds * points;
  }

  const sgpa = totalCredits > 0 ? Number((totalGradePointsEarned / totalCredits).toFixed(2)) : 0;
  return {
    sgpa,
    totalCredits,
    totalGradePointsEarned: Number(totalGradePointsEarned.toFixed(2)),
  };
}

console.log('Testing SGPA Calculation Engine...\n');

// Test 1: All A+ (10 points) on 19 graded credits
const allAPlus = {};
for (const s of curriculum) allAPlus[s.code] = 'A+';
const res1 = calculateSGPA(allAPlus, false);
console.log(`Test 1 (All A+): SGPA = ${res1.sgpa} (Expected: 10.00), Credits = ${res1.totalCredits} (Expected: 19)`);
if (res1.sgpa !== 10.00 || res1.totalCredits !== 19) throw new Error('Test 1 failed');

// Test 2: All A (9 points) on 19 graded credits
const allA = {};
for (const s of curriculum) allA[s.code] = 'A';
const res2 = calculateSGPA(allA, false);
console.log(`Test 2 (All A): SGPA = ${res2.sgpa} (Expected: 9.00), Credits = ${res2.totalCredits} (Expected: 19)`);
if (res2.sgpa !== 9.00 || res2.totalCredits !== 19) throw new Error('Test 2 failed');

// Test 3: Realistic mixed scenario
// Prob & Stats (4 cr): A+ (10) -> 40
// PBL Java (3 cr): A (9) -> 27
// ServiceNow (3 cr): A+ (10) -> 30
// Comp Networks (3 cr): A (9) -> 27
// Big Data (3 cr): B+ (8) -> 24
// Comp Coding (2 cr): A+ (10) -> 20
// Full Stack (1 cr): A+ (10) -> 10
// Total points = 40+27+30+27+24+20+10 = 178
// SGPA = 178 / 19 = 9.3684 -> 9.37
const mixed = {
  '24SMT-341': 'A+',
  '24CSH-301': 'A',
  '24CSH-318': 'A+',
  '24CST-302': 'A',
  '24CST-331': 'B+',
  '24CSP-305': 'A+',
  '24CSP-304': 'A+',
};
const res3 = calculateSGPA(mixed, false);
console.log(`Test 3 (Mixed): SGPA = ${res3.sgpa} (Expected: 9.37), Total Points = ${res3.totalGradePointsEarned}`);
if (res3.sgpa !== 9.37) throw new Error(`Test 3 failed: got ${res3.sgpa}`);

console.log('\nALL SGPA TESTS PASSED SUCCESSFULLY!');

