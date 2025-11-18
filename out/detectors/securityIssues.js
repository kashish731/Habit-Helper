"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSecurityIssues = runSecurityIssues;
/**
 * Security detector
 * Detects common security vulnerabilities:
 * - SQL injection risks (string concatenation in queries)
 * - Hardcoded credentials (passwords, API keys, tokens)
 * - Unsafe string operations in SQL/shell commands
 */
// Patterns for detecting hardcoded credentials
const credentialPatterns = [
    /password\s*[:=]\s*["']([^"']+)["']/i,
    /api[_-]?key\s*[:=]\s*["']([^"']+)["']/i,
    /secret\s*[:=]\s*["']([^"']+)["']/i,
    /token\s*[:=]\s*["']([^"']+)["']/i,
    /auth\s*[:=]\s*["']([^"']+)["']/i,
    /apikey\s*[:=]\s*["']([^"']+)["']/i,
    /access[_-]?key\s*[:=]\s*["']([^"']+)["']/i,
    /secret[_-]?key\s*[:=]\s*["']([^"']+)["']/i,
    /db[_-]?password\s*[:=]\s*["']([^"']+)["']/i,
    /private[_-]?key\s*[:=]\s*["']([^"']+)["']/i,
    /bearer\s+[\w-]+/i,
    /aws_access_key_id\s*[:=]/i,
    /aws_secret_access_key\s*[:=]/i
];
// SQL query patterns vulnerable to injection
const sqlPatterns = [
    /query\s*\(\s*["']\s*SELECT.*\+|query\s*\(\s*["']\s*INSERT.*\+/i,
    /execute\s*\(\s*["']\s*SELECT.*\+|execute\s*\(\s*["']\s*UPDATE.*\+/i,
    /sql\s*=\s*["']\s*SELECT.*\+|sql\s*=\s*["']\s*INSERT.*\+/i,
    /new\s+Query\s*\(\s*["']\s*SELECT.*\+/i,
    /db\.run\s*\(\s*["']\s*SELECT.*\+/i,
    /connection\.query\s*\(\s*["']\s*SELECT.*\+/i,
    /PreparedStatement|ResultSet|executeUpdate\s*\(\s*["']/i
];
function runSecurityIssues(document) {
    const habits = [];
    const reportedLines = new Set();
    for (let i = 0; i < document.lineCount; i++) {
        const raw = document.lineAt(i).text;
        const line = raw.trim();
        if (!line || line.startsWith("//"))
            continue;
        // ❌ Detect hardcoded credentials
        for (const pattern of credentialPatterns) {
            const match = pattern.exec(line);
            if (match) {
                const col = raw.indexOf(match[0]);
                const credential = match[1] || match[0];
                // Don't report test/dummy values
                if (credential.length < 5 || credential === "YOUR_KEY_HERE")
                    continue;
                habits.push({
                    id: "hardcoded-credential",
                    message: `Hardcoded credential detected. Move to environment variables or config file.`,
                    line: i,
                    startChar: col >= 0 ? col : 0,
                    endChar: col >= 0 ? col + match[0].length : match[0].length,
                    severity: "error",
                    codeLensTitle: `🔒 Hardcoded credential`
                });
                reportedLines.add(i);
            }
        }
        // ❌ Detect SQL injection risks (string concatenation)
        const sqlInjectionPatterns = [
            /SELECT\s+.*\+\s*["']|INSERT\s+.*\+\s*["']|UPDATE\s+.*\+\s*["']|DELETE\s+.*\+\s*["']/i,
            /query\s*\(\s*["']\s*SELECT.*["']\s*\+/i,
            /execute\s*\(\s*["']\s*SELECT.*["']\s*\+/i,
            /sql\s*=\s*["']\s*SELECT.*["']\s*\+/i,
            /\$\{.*query|`.*\$\{.*query|template.*\$\{.*SELECT/i
        ];
        for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(line)) {
                const col = raw.indexOf("SELECT") >= 0 ? raw.indexOf("SELECT") :
                    raw.indexOf("INSERT") >= 0 ? raw.indexOf("INSERT") :
                        raw.indexOf("UPDATE") >= 0 ? raw.indexOf("UPDATE") :
                            raw.indexOf("DELETE") >= 0 ? raw.indexOf("DELETE") : 0;
                habits.push({
                    id: "sql-injection-risk",
                    message: `SQL injection risk detected. Use parameterized queries instead of string concatenation.`,
                    line: i,
                    startChar: Math.max(0, col),
                    endChar: Math.max(0, col) + 6,
                    severity: "error",
                    codeLensTitle: `🚨 SQL Injection Risk`
                });
                reportedLines.add(i);
            }
        }
        // ❌ Detect unsafe SQL concatenation patterns
        const unsafeSqlPatterns = [
            /query\s*=\s*["']\s*SELECT.*["']\s*\+\s*\w+/i,
            /sql\s*=\s*["']\s*SELECT.*["']\s*\+\s*variables/i,
            /query\s*\+\s*where|query\s*\+\s*filter/i,
            /SELECT\s+.*\s+WHERE\s+.*\+\s*\w+/i
        ];
        for (const pattern of unsafeSqlPatterns) {
            if (pattern.test(line)) {
                const col = raw.indexOf("query") >= 0 ? raw.indexOf("query") :
                    raw.indexOf("sql") >= 0 ? raw.indexOf("sql") :
                        raw.indexOf("SELECT") >= 0 ? raw.indexOf("SELECT") : 0;
                if (!reportedLines.has(i)) {
                    habits.push({
                        id: "unsafe-sql-concatenation",
                        message: `Unsafe SQL concatenation. Use parameterized queries or prepared statements.`,
                        line: i,
                        startChar: Math.max(0, col),
                        endChar: Math.max(0, col) + 5,
                        severity: "error",
                        codeLensTitle: `🚨 Use parameterized queries`
                    });
                    reportedLines.add(i);
                }
            }
        }
        // ❌ Detect inline SQL in code
        if (/(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s+(?:FROM|INTO|TABLE)/i.test(line)) {
            // Check if it's a string literal (likely SQL command)
            if (/(["'`]|query\s*=|execute\s*\(|db\.run)/.test(line)) {
                const col = raw.search(/SELECT|INSERT|UPDATE|DELETE/i);
                if (!reportedLines.has(i)) {
                    habits.push({
                        id: "inline-sql",
                        message: `SQL query detected in code. Consider moving to SQL files or using an ORM.`,
                        line: i,
                        startChar: Math.max(0, col),
                        endChar: Math.max(0, col) + 6,
                        severity: "info",
                        codeLensTitle: `💡 Extract SQL to separate file`
                    });
                    reportedLines.add(i);
                }
            }
        }
        // ❌ Detect other hardcoded sensitive data
        const sensitivePatterns = [
            /sk-[A-Za-z0-9]{20,}/, // OpenAI keys
            /ghp_[A-Za-z0-9]{36}/, // GitHub tokens
            /xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,34}/, // Slack tokens
            /\b(?:admin|root)\b\s*[:=]\s*["'](?!demo|test|example)/, // Admin credentials
        ];
        for (const pattern of sensitivePatterns) {
            const match = pattern.exec(line);
            if (match) {
                const col = raw.indexOf(match[0]);
                if (!reportedLines.has(i)) {
                    habits.push({
                        id: "exposed-sensitive-data",
                        message: `Sensitive data exposed in code. Remove and use environment variables.`,
                        line: i,
                        startChar: Math.max(0, col),
                        endChar: Math.max(0, col) + match[0].length,
                        severity: "error",
                        codeLensTitle: `🔒 Exposed sensitive data`
                    });
                    reportedLines.add(i);
                }
            }
        }
        // ⚠️ Warn about plaintext database connections
        if (/(mongodb|mysql|postgres|redis|sql\s+server):\s*\/\/.*:.*@/i.test(line)) {
            const col = raw.search(/(mongodb|mysql|postgres|redis|sql\s+server):/i);
            if (!reportedLines.has(i)) {
                habits.push({
                    id: "plaintext-db-connection",
                    message: `Database credentials in plaintext. Use environment variables or secure config.`,
                    line: i,
                    startChar: Math.max(0, col),
                    endChar: Math.max(0, col) + 10,
                    severity: "error",
                    codeLensTitle: `🔒 Use secure database config`
                });
                reportedLines.add(i);
            }
        }
    }
    return habits;
}
//# sourceMappingURL=securityIssues.js.map