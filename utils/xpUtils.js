const XP_THRESHOLDS = [
    { xp: 0 },
    { xp: 500 },
    { xp: 1000 },
    { xp: 1500 },
    { xp: 2000 },
    { xp: 3000 },
    { xp: 10000 }
];

function getLevelIndexFromXp(xp) {
    let idx = 0;
    for (let i = 0; i < XP_THRESHOLDS.length; i++) {
        if (xp >= XP_THRESHOLDS[i].xp) idx = i;
    }
    return idx;
}

function buildProgressBar(currentXp, currentThresholdXp, nextThresholdXp) {
    if (nextThresholdXp === null) {
        return "🟢🟢🟢🟢🟢🟢🟢🟢 100%";
    }

    const span = nextThresholdXp - currentThresholdXp;
    const gained = currentXp - currentThresholdXp;
    let percent = span <= 0 ? 1 : gained / span;

    percent = Math.min(Math.max(percent, 0), 1);

    const segments = 8;
    const perSegment = 1 / segments;
    let bar = "";

    for (let i = 0; i < segments; i++) {
        const threshold = perSegment * (i + 1);
        bar += percent >= threshold ? "🟢" : "🔴";
    }

    const pctDisplay = Math.round(percent * 100);
    return `${bar} ${pctDisplay}%`;
}

module.exports = { XP_THRESHOLDS, getLevelIndexFromXp, buildProgressBar };
