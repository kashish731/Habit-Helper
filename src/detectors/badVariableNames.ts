import * as vscode from "vscode";
import { Habit } from "../types/types";

/**
 * Optimized multi-language bad variable name detector
 * - supports typed declarations (int x = 0;)
 * - supports untyped assignments (x = 0)
 * - supports pointers/references (*ptr, &ref)
 * - supports destructuring (JS/TS)
 * - avoids class/struct/interface declarations and function signatures
 * - ignores allowed common abbreviations & loop counters in for-loops
 */

const allowedShort = new Set([
  "i", "j", "k", // loop counters
  "id", "db", "ui", "ux", "api", "cfg", "err", "req", "res",
  "min", "max", "sum", "avg", "len"
]);

const badPatterns = [
  /^tmp\d*$/i,
  /^temp\d*$/i,
  /^data\d*$/i,
  /^value\d*$/i,
  /^item\d*$/i,
  /^obj\d*$/i,
  /^var\d*$/i,
  /^.$/ // single-letter (we handle exceptions above)
];

// matches many forms and captures variable name in group 1
// e.g. "private static int x = 10;", "let x = 10", "x = 10", "int *ptr = ..."
const universalAssignmentRegex =
  /(?:^[\s]*(?:public|private|protected|static|final|const|volatile|var|let|const|register|auto)\b[\w\s\*]*)*?(?:[A-Za-z_$][A-Za-z0-9_$\*&\s<>]*\s+)*[*&]?\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:[:=]\s*)/;

/* destructuring: { a, b: alias } or [a, b] */
const destructureRegex = /(?:const|let|var)?\s*[{[]([^}\]]+)[}\]]\s*=/;

function isClassLike(line: string): boolean {
  return /^\s*(class|interface|struct|enum)\b/.test(line);
}

function isFunctionSignature(line: string): boolean {
  // very loose check to avoid function signatures look like "int foo(int x)"
  return /\b[A-Za-z_$][A-Za-z0-9_$\s\<\>\[\]]*\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(.*\)\s*$/.test(line);
}

function isForLoop(line: string): boolean {
  return /\bfor\s*\(|\bfor\s+/.test(line);
}

export function runBadVariableNames(document: vscode.TextDocument): Habit[] {
  const habits: Habit[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const line = raw.trim();
    if (!line) continue;
    if (isClassLike(line) || isFunctionSignature(line)) continue;

    // destructuring e.g. const {a, temp1} = obj;
    const d = destructureRegex.exec(line);
    if (d) {
      const vars = d[1].split(",").map(v => v.trim().split(":")[0].trim());
      for (const v of vars) {
        if (!v) continue;
        if (allowedShort.has(v)) continue;
        if (badPatterns.some(p => p.test(v))) {
          const col = raw.indexOf(v);
          habits.push({
            id: "bad-var-name",
            message: `Bad variable name "${v}". Use a meaningful name.`,
            line: i,
            startChar: col >= 0 ? col : 0,
            endChar: col >= 0 ? col + v.length : v.length,
            severity: "warning",
            codeLensTitle: `⚠️ Bad variable "${v}"`
          });
        }
      }
      continue;
    }

    // if this is a for-loop header, avoid flagging i/j/k except if clearly not loop counters
    const inFor = isForLoop(line);

    const m = universalAssignmentRegex.exec(line);
    if (!m) continue;
    const varName = m[1];

    if (!varName) continue;
    if (allowedShort.has(varName)) {
      // allow i/j/k in for loops only
      if (inFor && ["i","j","k"].includes(varName)) continue;
    }
    // skip uppercase constants (ALL_CAPS)
    if (/^[A-Z0-9_]+$/.test(varName)) continue;

    // check bad name patterns
    const isBad = badPatterns.some(p => p.test(varName));
    if (!isBad) continue;

    // alright: create habit
    const start = raw.indexOf(varName);
    habits.push({
      id: "bad-var-name",
      message: `Bad variable name "${varName}". Use a meaningful name.`,
      line: i,
      startChar: start >= 0 ? start : 0,
      endChar: start >= 0 ? start + varName.length : varName.length,
      severity: "warning",
      codeLensTitle: `⚠️ Bad variable "${varName}"`
    });
  }

  return habits;
}
