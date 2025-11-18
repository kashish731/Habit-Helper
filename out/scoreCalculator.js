"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCodeScore = calculateCodeScore;
exports.getScoreColor = getScoreColor;
exports.getGradeEmoji = getGradeEmoji;
function calculateCodeScore(habits) {
    const errorCount = habits.filter(h => h.severity === "error").length;
    const warningCount = habits.filter(h => h.severity === "warning").length;
    const infoCount = habits.filter(h => h.severity === "info").length;
    // Calculate score: start with 100, deduct points for issues
    // Errors: -10 points each
    // Warnings: -5 points each
    // Info: -2 points each
    let score = 100;
    score -= errorCount * 10;
    score -= warningCount * 5;
    score -= infoCount * 2;
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    // Determine grade
    let grade = "A+";
    let feedback = "Excellent code quality! Keep it up! 🌟";
    if (score >= 95) {
        grade = "A+";
        feedback = "Excellent code quality! Keep it up! 🌟";
    }
    else if (score >= 90) {
        grade = "A";
        feedback = "Great job! Very few issues detected. 👍";
    }
    else if (score >= 80) {
        grade = "B";
        feedback = "Good code quality. Address the warnings to improve. 📈";
    }
    else if (score >= 70) {
        grade = "C";
        feedback = "Fair code quality. Several issues need attention. ⚠️";
    }
    else if (score >= 60) {
        grade = "D";
        feedback = "Poor code quality. Multiple issues need fixing. 🔧";
    }
    else {
        grade = "F";
        feedback = "Critical issues found. Significant refactoring needed! 🚨";
    }
    return {
        totalScore: score,
        errorCount,
        warningCount,
        infoCount,
        grade,
        feedback
    };
}
function getScoreColor(score) {
    if (score >= 90)
        return "#4CAF50"; // Green
    if (score >= 80)
        return "#8BC34A"; // Light Green
    if (score >= 70)
        return "#FFC107"; // Amber
    if (score >= 60)
        return "#FF9800"; // Orange
    return "#F44336"; // Red
}
function getGradeEmoji(grade) {
    switch (grade) {
        case "A+":
        case "A":
            return "✨";
        case "B":
            return "👍";
        case "C":
            return "📈";
        case "D":
            return "⚠️";
        case "F":
            return "🚨";
        default:
            return "📊";
    }
}
//# sourceMappingURL=scoreCalculator.js.map