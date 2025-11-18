import * as vscode from "vscode";
import { Habit } from "../types/types";

/**
 * Error handling detector
 * Detects missing error handling across multiple languages:
 * - Missing try-catch blocks
 * - Unhandled promise rejections (.then without .catch)
 * - Async functions without try-catch
 * - Missing error checks after function calls
 * - Unhandled exceptions in callbacks
 * - Missing null/undefined checks
 */

export function runErrorHandling(document: vscode.TextDocument): Habit[] {
  const habits: Habit[] = [];

  // Track promises and their catches
  const promiseCalls = new Map<number, boolean>();
  const thenWithoutCatch = new Set<number>();

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const line = raw.trim();

    if (!line || line.startsWith("//")) continue;

    // ❌ .then() without .catch()
    const thenMatch = /\.then\s*\(/;
    const catchMatch = /\.catch\s*\(/;
    
    if (thenMatch.test(line) && !catchMatch.test(line)) {
      // Look ahead for catch on next lines
      let hasCatchNearby = false;
      for (let j = i + 1; j < Math.min(i + 5, document.lineCount); j++) {
        if (/\.catch\s*\(/.test(document.lineAt(j).text)) {
          hasCatchNearby = true;
          break;
        }
      }

      if (!hasCatchNearby) {
        const col = raw.indexOf(".then");
        habits.push({
          id: "unhandled-promise",
          message: `Promise .then() without .catch(). Add error handling.`,
          line: i,
          startChar: col >= 0 ? col : 0,
          endChar: col >= 0 ? col + 5 : 5,
          severity: "warning",
          codeLensTitle: `⚠️ Missing .catch() handler`
        });
      }
    }

    // ❌ async/await without try-catch
    if (/async\s+function|async\s*\(|async\s*=>/.test(line)) {
      let hasTryBlock = false;
      
      // Look for try block in next 20 lines
      for (let j = i; j < Math.min(i + 20, document.lineCount); j++) {
        if (/^\s*try\s*\{/.test(document.lineAt(j).text)) {
          hasTryBlock = true;
          break;
        }
      }

      if (!hasTryBlock && (line.includes("await") || !line.endsWith("{"))) {
        const col = raw.indexOf("async");
        habits.push({
          id: "async-without-try",
          message: `Async function detected. Wrap await calls in try-catch blocks.`,
          line: i,
          startChar: col >= 0 ? col : 0,
          endChar: col >= 0 ? col + 5 : 5,
          severity: "warning",
          codeLensTitle: `⚠️ Async without try-catch`
        });
      }
    }

    // ❌ Function call without error check (common patterns)
    const functionCallPatterns = [
      /(?:readFile|fetch|request|query|exec|spawn|fork|mkdir|rmdir|unlink)\s*\(/i,
      /JSON\.parse\s*\(/,
      /parseInt\s*\(/,
      /parseFloat\s*\(/,
      /eval\s*\(/
    ];

    for (const pattern of functionCallPatterns) {
      if (pattern.test(line)) {
        // Check if error handling is nearby
        let hasErrorHandling = false;

        for (let j = Math.max(0, i - 2); j <= Math.min(i + 3, document.lineCount - 1); j++) {
          const checkLine = document.lineAt(j).text;
          if (/try\s*\{|\.catch|err|error|Error|throw/.test(checkLine)) {
            hasErrorHandling = true;
            break;
          }
        }

        if (!hasErrorHandling) {
          const funcName = pattern.source.match(/\b(\w+)\b/)?.[1] || "function";
          const col = raw.indexOf(funcName);
          habits.push({
            id: "unhandled-function-call",
            message: `${funcName}() can throw errors. Add try-catch or error handling.`,
            line: i,
            startChar: col >= 0 ? col : 0,
            endChar: col >= 0 ? col + funcName.length : funcName.length,
            severity: "warning",
            codeLensTitle: `⚠️ Missing error handling: ${funcName}`
          });
        }
      }
    }

    // ❌ Callback without error parameter
    const callbackMatch = /(\(\s*(err|error|e)?\s*\)\s*=>|function\s*\(\s*(err|error|e)?\s*\))/;
    if (/\.map|\.forEach|\.filter|\.then|\.on|addEventListener|callback/.test(line)) {
      if (!callbackMatch.test(line)) {
        const col = raw.indexOf("=>");
        if (col < 0) continue;
        
        habits.push({
          id: "callback-missing-error",
          message: `Callback should have error parameter. Use (err) => or (error) => pattern.`,
          line: i,
          startChar: col >= 0 ? col : 0,
          endChar: col >= 0 ? col + 2 : 2,
          severity: "info",
          codeLensTitle: `💡 Add error parameter to callback`
        });
      }
    }

    // ❌ Missing null/undefined checks before method calls
    const methodCallPatterns = [
      /\.\w+\s*\(.*\)/,
      /\[.*\]\./,
      /\w+\.\w+\s*\(/
    ];

    for (const pattern of methodCallPatterns) {
      if (pattern.test(line)) {
        // Check if there's a null check nearby
        let hasNullCheck = false;
        
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const checkLine = document.lineAt(j).text;
          if (/if\s*\(|null|undefined|!|typeof/.test(checkLine)) {
            hasNullCheck = true;
            break;
          }
        }

        if (!hasNullCheck && !line.includes("if") && !line.includes("?")) {
          const col = raw.indexOf(".");
          if (col > 0) {
            habits.push({
              id: "missing-null-check",
              message: `Consider null/undefined check before calling method.`,
              line: i,
              startChar: col,
              endChar: col + 1,
              severity: "info",
              codeLensTitle: `💡 Add null check`
            });
          }
        }
      }
    }

    // ❌ throw without try-catch context
    if (/throw\s+new\s+\w+Error|throw\s+/.test(line)) {
      // Check if we're inside a try block
      let insideTry = false;
      let braceCount = 0;

      for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
        const checkLine = document.lineAt(j).text;
        if (/try\s*\{/.test(checkLine)) {
          insideTry = true;
          break;
        }
        if (/catch\s*\(/.test(checkLine)) break;
      }

      if (!insideTry) {
        const col = raw.indexOf("throw");
        habits.push({
          id: "throw-without-context",
          message: `Throwing error outside try block. Ensure caller can catch it.`,
          line: i,
          startChar: col >= 0 ? col : 0,
          endChar: col >= 0 ? col + 5 : 5,
          severity: "info",
          codeLensTitle: `💡 Verify error will be caught`
        });
      }
    }

    // ❌ C++ error codes not checked
    if (/int\s+result|status|errno|code\s*=/.test(line) && /=\s*[\w:]+\s*\(/.test(line)) {
      // Check if result is checked
      let isChecked = false;
      for (let j = i + 1; j < Math.min(i + 5, document.lineCount); j++) {
        if (/if\s*\(.*result|if\s*\(.*status|if\s*\(.*errno/.test(document.lineAt(j).text)) {
          isChecked = true;
          break;
        }
      }

      if (!isChecked) {
        const col = raw.indexOf("=");
        habits.push({
          id: "unchecked-return-code",
          message: `Function return code should be checked for errors.`,
          line: i,
          startChar: col >= 0 ? col : 0,
          endChar: col >= 0 ? col + 1 : 1,
          severity: "warning",
          codeLensTitle: `⚠️ Check return code`
        });
      }
    }

    // ❌ fopen() without NULL check for file pointer
    if (/fopen\s*\(/i.test(line)) {
      // Extract variable name being assigned
      const assignMatch = line.match(/(\w+)\s*=\s*fopen\s*\(/i);
      if (assignMatch) {
        const varName = assignMatch[1];
        
        // Check if this variable is checked for NULL in next lines
        let hasNullCheck = false;
        for (let j = i + 1; j < Math.min(i + 5, document.lineCount); j++) {
          const checkLine = document.lineAt(j).text;
          if (
            new RegExp(`if\\s*\\(\\s*!?${varName}|if\\s*\\(\\s*${varName}\\s*!=|if\\s*\\(\\s*${varName}\\s*==\\s*NULL`, 'i').test(checkLine) ||
            /if\s*\(\s*!?fp|if\s*\(\s*fp\s*!=|if\s*\(\s*fp\s*==\s*NULL/.test(checkLine)
          ) {
            hasNullCheck = true;
            break;
          }
        }

        if (!hasNullCheck) {
          const col = raw.toLowerCase().indexOf("fopen");
          habits.push({
            id: "fopen-no-null-check",
            message: `fopen() may return NULL on error. Check if ${varName} is not NULL before using it.`,
            line: i,
            startChar: col >= 0 ? col : 0,
            endChar: col >= 0 ? col + 5 : 5,
            severity: "error",
            codeLensTitle: `🚨 Check fopen() result for NULL`
          });
        }
      }
    }

    // ❌ File operations without error handling (C/C++)
    const fileOpPatterns = [
      /fclose\s*\(/i,
      /fprintf\s*\(/i,
      /fscanf\s*\(/i,
      /fread\s*\(/i,
      /fwrite\s*\(/i,
      /open\s*\(/i,
      /close\s*\(/i,
      /read\s*\(/i,
      /write\s*\(/i
    ];

    for (const pattern of fileOpPatterns) {
      if (pattern.test(line)) {
        // Check if error handling is nearby
        let hasErrorHandling = false;
        
        for (let j = Math.max(0, i - 1); j <= Math.min(i + 3, document.lineCount - 1); j++) {
          const checkLine = document.lineAt(j).text.toLowerCase();
          if (/if\s*\(|!=|==|null|error|throw|perror/.test(checkLine)) {
            hasErrorHandling = true;
            break;
          }
        }

        if (!hasErrorHandling) {
          const funcMatch = line.match(/(fclose|fprintf|fscanf|fread|fwrite|open|close|read|write)/i);
          const funcName = funcMatch ? funcMatch[1] : "file operation";
          const col = raw.toLowerCase().indexOf(funcName.toLowerCase());
          
          habits.push({
            id: "file-op-no-error-check",
            message: `${funcName}() should have error checking. File operations can fail.`,
            line: i,
            startChar: col >= 0 ? col : 0,
            endChar: col >= 0 ? col + funcName.length : funcName.length,
            severity: "error",
            codeLensTitle: `🚨 Add error check: ${funcName}`
          });
        }
      }
    }
  }

  return habits;
}
