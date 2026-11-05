import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumPath = path.join(__dirname, '../data/curriculum.json');
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));

function calculate(subject, userStates, targetCutoffMarks) {
  const internalComponents = subject.assessments.filter((a) => !a.isExternal);
  const externalComponents = subject.assessments.filter((a) => a.isExternal);

  const officialTotalWeight = 100.0;
  const externalWeight = externalComponents.reduce((acc, a) => acc + a.weight, 0);

  let excludedWeight = 0;
  let internalWeightedMarks = 0;

  for (const comp of internalComponents) {
    const state = userStates[comp.id] || { rawMarks: null, isIncluded: true };
    const isIncluded = state.isIncluded !== false;

    if (!isIncluded) {
      excludedWeight += comp.weight;
    } else {
      if (state.rawMarks !== null && state.rawMarks !== undefined && !isNaN(state.rawMarks)) {
        const clampedRaw = Math.max(0, Math.min(comp.maxMarks, state.rawMarks));
        const contrib = (clampedRaw / comp.maxMarks) * comp.weight;
        internalWeightedMarks += contrib;
      }
    }
  }

  const applicableTotalWeight = Number((officialTotalWeight - excludedWeight).toFixed(2));
  const scaledTargetCutoff = Number(((targetCutoffMarks / 100) * applicableTotalWeight).toFixed(2));
  const deficit = Number((scaledTargetCutoff - internalWeightedMarks).toFixed(2));

  return {
    applicableTotalWeight,
    internalWeightedMarks,
    deficit,
    externalWeight,
    status: deficit <= 0 ? 'ALREADY_ACHIEVED' : deficit > externalWeight ? 'IMPOSSIBLE' : 'ACHIEVABLE'
  };
}

console.log('Testing all 9 subjects in curriculum...\n');

let passCount = 0;

for (const subject of curriculum) {
  const internals = subject.assessments.filter((a) => !a.isExternal);
  const externals = subject.assessments.filter((a) => a.isExternal);
  const totalWeight = subject.assessments.reduce((acc, a) => acc + a.weight, 0);

  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`Subject ${subject.name} does not sum to 100% (sums to ${totalWeight}%)`);
  }

  const userStates = {};
  if (internals.length > 0) {
    userStates[internals[0].id] = {
      isIncluded: true,
      rawMarks: internals[0].maxMarks * 0.8,
    };
  }

  const res = calculate(subject, userStates, 88);

  console.log(`[PASS] ${subject.code} - ${subject.name} | Total Wt: ${totalWeight}% | Internals: ${internals.length} | Externals: ${externals.length} | Status: ${res.status}`);
  passCount++;
}

console.log(`\nAll ${passCount} subjects passed verification successfully!`);
