# CU External Marks Calculator

A focused, lightweight, **100% client-side tool** for Chandigarh University students to answer one essential question:

> **"How many marks do I need in my external examination to achieve my desired target grade?"**

---

## 🌟 What This Calculator Does

1. **Subject Selection**: Choose any of your 9 official semester subjects (extracted directly from CU course lecture-plan PDFs).
2. **Enter Internal Marks**: Only the relevant internal assessments for that course appear (MST-1, MST-2, Quizzes, Assignments, Practical Experiments, etc.). Enter what you have obtained; pending tests can be left blank.
3. **Choose Target Grade / Assumed Cutoff**: Select `A+ (95)`, `A (88)`, `B+ (80)`, `B (70)`, `C (55)`, or enter a **Custom Goal** (e.g. 85/100). Grade cutoffs can be edited inline to match your relative grading assumptions.
4. **Instant External Exam Requirement**:
   - Computes your accumulated internal weighted score (e.g. `32.0 / 40.0`).
   - Calculates the exact raw marks needed in the external examination (e.g. `56.0 / 60`).
   - Displays the required percentage (e.g. `93.3%`).
   - Flags whether the goal is **ACHIEVABLE**, **ALREADY SECURED**, or **IMPOSSIBLE** (displaying the maximum possible score).
   - For hybrid courses with multiple final exams (like PBL Java or ServiceNow), breaks down the score required per external component.

---

## 📚 9 Course Assessment Schemes

| Subject Code | Subject Name | Internal Weight | External Exam Weight | External Component(s) |
|---|---|:---:|:---:|---|
| `24TDP-311` | Soft Skills-III | 60% | 40% | External Viva / Voce (Max 40) |
| `24TDT-312` | Aptitude-III | 40% | 60% | External Theory (Max 60) |
| `24CSH-301` | Project Based Learning in Java | 50% | 50% | End Term Theory (30% / Max 60) + Practical Eval (20% / Max 40) |
| `24CSH-318` | ServiceNow-I | 55% | 45% | Mini Project Report (25% / Max 50) + Demo (20% / Max 40) |
| `24SMT-341` | Probability and Statistics | 40% | 60% | External Theory (Max 60) |
| `24CSP-305` | Competitive Coding-II | 60% | 40% | External Viva / Voce (Max 40) |
| `24CST-331` | Big Data Fundamentals (SWAYAM) | 40% | 60% | External Theory (Max 60) |
| `24CST-302` | Computer Networks | 40% | 60% | External Theory (Max 60) |
| `24CSP-304` | Full Stack Development - II | 60% | 40% | External Viva / Voce (Max 40) |

---

## 🧮 Calculation Example

**Subject**: *Probability and Statistics (`24SMT-341`)*
- Internal Weightage: $40\%$
- External Weightage: $60\%$ (Max 60 Marks)
- User enters internal marks totaling: $32.0 / 40.0$
- Selected Target A Grade: $88 / 100$
- **Deficit**: $88 - 32 = 56.0$ weighted marks
- **Required External Raw Score**: $56.0 / 60$ ($93.3\%$)
- **Status**: Achievable

---

## 🚀 Running the App

```bash
# Start local development server
pnpm run dev

# Run math verification test
node src/test/verifySimplifiedCalculator.js

# Build production bundle
pnpm run build
```
