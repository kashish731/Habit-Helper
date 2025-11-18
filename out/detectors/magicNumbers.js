"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMagicNumbers = runMagicNumbers;
/**
 * Magic number detector (SAFE VERSION):
 *
 * Only detects:
 *  - very large numeric constants (>= 500)
 *  - suspicious constants (1024, 404, 1337, 999)
 *  - repeated numeric constants (appearing 2+ times)
 *
 * Completely ignores:
 *  - simple assignments (x = 10)
 *  - loop bounds (for, while)
 *  - if/while conditions (if x > 120)
 *  - array indices (arr[10])
 *  - small numbers (0–50)
 *  - years (1900–2099)
 */
const suspiciousConstants = new Set([1024, 404, 1337, 999]);
const numberRegex = /(?<![\w.])(-?\d+)(?![\w.])/g;
function isLoopOrCondition(line) {
    return (/\bfor\s*\(.*\)/.test(line) ||
        /\bwhile\s*\(.*\)/.test(line) ||
        /\bif\s*\(.*\)/.test(line) ||
        /\belse if\s*\(.*\)/.test(line));
}
function runMagicNumbers(document) {
    const habits = [];
    const seen = new Map();
    // First pass → count occurrences
    for (let i = 0; i < document.lineCount; i++) {
        let m;
        const line = document.lineAt(i).text;
        while ((m = numberRegex.exec(line)) !== null) {
            const n = parseInt(m[1], 10);
            seen.set(n, (seen.get(n) ?? 0) + 1);
        }
    }
    // Second pass → detect magic numbers
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        const line = raw.trim();
        let m;
        // Ignore conditions & loops entirely
        if (isLoopOrCondition(line))
            continue;
        // Ignore array indices
        if (/\[\s*\d+\s*\]/.test(line))
            continue;
        while ((m = numberRegex.exec(raw)) !== null) {
            const val = parseInt(m[1], 10);
            // Skip small numbers
            if (Math.abs(val) <= 50)
                continue;
            // Skip years
            if (val >= 1900 && val <= 2099)
                continue;
            // Skip simple assignments e.g. int x = 10;
            if (/^\s*\w[\w\s<>]*=\s*-?\d+\s*;?$/.test(line))
                continue;
            const isRepeated = (seen.get(val) ?? 0) >= 2;
            const isSuspicious = suspiciousConstants.has(val);
            const isLarge = Math.abs(val) >= 500;
            // Only warn when it's meaningful
            if (!isRepeated && !isSuspicious && !isLarge)
                continue;
            habits.push({
                id: "magic-number",
                message: `Magic number ${val} detected — consider extracting a constant.`,
                line: i,
                startChar: m.index,
                endChar: m.index + m[0].length,
                severity: "info",
                codeLensTitle: `💡 Magic number ${val}`
            });
        }
    }
    return habits;
}
//# sourceMappingURL=magicNumbers.js.map