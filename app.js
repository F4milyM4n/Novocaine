"use strict";
const { useState, useEffect, useCallback, Fragment } = React;
/* ============================================================
   NOVOCAINE TRAINING — prescription + tracking engine
   Standalone build: no npm dependencies. Icons are hand-drawn
   inline SVG (in place of lucide-react), the progress chart is
   a small hand-rolled SVG line chart (in place of recharts),
   and persistence uses localStorage (in place of the Claude
   artifact window.storage API). Everything else — the actual
   prescription math — is unchanged from the source articles.
   ============================================================ */
const STORAGE_KEY = 'novocaine:v1';
/* ---------- inline icon set (replaces lucide-react) ---------- */
const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function Syringe({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("g", { transform: "rotate(-45 12 12)" },
            React.createElement("rect", { x: "2", y: "9", width: "6", height: "6", rx: "1", fill: "currentColor", stroke: "none" }),
            React.createElement("rect", { x: "7", y: "10", width: "12", height: "4", rx: "1.5" }),
            React.createElement("line", { x1: "19", y1: "12", x2: "22", y2: "12", strokeWidth: "2.5" }))));
}
function SettingsIcon({ size = 16, className, style }) {
    const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("circle", { cx: "12", cy: "12", r: "3.2" }),
        teeth.map((a) => (React.createElement("line", { key: a, x1: "12", y1: "4.5", x2: "12", y2: "7", transform: `rotate(${a} 12 12)`, strokeWidth: "2.4" }))),
        React.createElement("circle", { cx: "12", cy: "12", r: "8.4" })));
}
function ChevronRight({ size = 16, className, style }) {
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M9 6l6 6-6 6" }));
}
function ChevronLeft({ size = 16, className, style }) {
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M15 6l-6 6 6 6" }));
}
function Check({ size = 16, className, style }) {
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M5 13l4 4L19 7" }));
}
function SkipForward({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M5 4l10 8-10 8V4z", fill: "currentColor", stroke: "none" }),
        React.createElement("line", { x1: "19", y1: "5", x2: "19", y2: "19", strokeWidth: "2.4" })));
}
function TrendingUp({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M3 17l6-6 4 4 8-8" }),
        React.createElement("path", { d: "M15 7h6v6" })));
}
function X({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
        React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" })));
}
function TimerIcon({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("circle", { cx: "12", cy: "13", r: "8" }),
        React.createElement("line", { x1: "12", y1: "13", x2: "12", y2: "9" }),
        React.createElement("line", { x1: "9", y1: "2", x2: "15", y2: "2" }),
        React.createElement("line", { x1: "17", y1: "5.5", x2: "19", y2: "3.5" })));
}
function Play({ size = 16, className, style }) {
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style },
        React.createElement("path", { d: "M6 4l14 8-14 8V4z", fill: "currentColor" }));
}
function Pause({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style },
        React.createElement("rect", { x: "6", y: "4", width: "4", height: "16", fill: "currentColor" }),
        React.createElement("rect", { x: "14", y: "4", width: "4", height: "16", fill: "currentColor" })));
}
function RotateCcw({ size = 16, className, style }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", className: className, style: style, ...iconBase },
        React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7" }),
        React.createElement("path", { d: "M3 3v5h5" })));
}
const BASE_LISTS = {
    4: ['A', 'B', 'A', 'C'],
    7: ['A', 'LISS', 'B', 'LISS', 'A', 'C', 'LISS'],
    10: ['A', 'LISS', 'LISS', 'B', 'LISS', 'LISS', 'A', 'LISS', 'C', 'LISS'],
};
const BASE_INFO = {
    A: { name: 'S&S', full: 'Swings & Get-Ups', kind: 'Strength', color: '#6b7a4f' },
    B: { name: 'Q&D', full: 'Swings & Pushups (033)', kind: 'Anaerobic', color: '#b8622f' },
    C: { name: 'A+A', full: 'Snatch (+ antagonist)', kind: 'Aerobic', color: '#4a7a8c' },
    LISS: { name: 'LISS', full: 'Low Intensity Steady State', kind: 'Aerobic', color: '#4a7a8c' },
};
const WAVE_GRID = [['L', 'M', 'L'], ['M', 'M', 'L'], ['H', 'H', 'M']];
const WAVE_SEQ = WAVE_GRID.flat();
const LEVEL_COLOR = { L: '#3d6b62', M: '#c99a2e', H: '#a8402f' };
const LEVEL_NAME = { L: 'Low', M: 'Medium', H: 'High' };
const PULLUP_LADDERS = { L: [1, 2, 3], M: [1, 2, 3, 4], H: [1, 2, 3, 4, 5] };
function pullupLadderText(level) {
    const rungs = PULLUP_LADDERS[level];
    const total = rungs.reduce((a, b) => a + b, 0) * 2;
    return `Ladder ${rungs.join('-')} × 2 (${total} reps)`;
}
const DEFAULT_SETTINGS = {
    category: 1,
    microcycleLength: 7,
    strengthScheme: {
        L: { sets: 2, reps: 8, pct: 70 },
        M: { sets: 2, reps: 5, pct: 80 },
        H: { sets: 2, reps: 2, pct: 90 },
    },
    ssSetsWave: { L: 6, M: 8, H: 10 },
    qndRoundsWave: { L: 2, M: 3, H: 4 },
    aaSetsWave: { L: 20, M: 30, H: 40 },
    lissShort: { L: 40, M: 60, H: 80 },
    lissLong: { L: 60, M: 90, H: 120 },
    rpeRule: [
        { max: 6, tmDelta: 5 }, { max: 7, tmDelta: 3 }, { max: 8, tmDelta: 1 },
        { max: 9, tmDelta: 0 }, { max: 99, tmDelta: -3 },
    ],
    exerciseNames: {
        strengthA1: 'Bench Press',
        strengthA2: 'Front Squat',
        strengthB: 'Accessory Lifts',
        strengthC: 'Loaded Carry / Grip Work',
        enduranceA: 'Tempo — 20 min',
        enduranceB: 'Repeats (400–600m or 800m–1k)',
        enduranceC: 'Extended Aerobic',
    },
};
const DEFAULT_PROFILE = { tm: { bench: 0, frontSquat: 0 }, vdot: 0, raceDist: 5000, raceTime: 20 };
const DEFAULT_PROGRESS = { passIndex: 0, sessionIndexInPass: 0, cycleCount: 0, rpeThisCycleH: [] };
/* ---------- math: Daniels-Gilbert VDOT (used only to derive VDOT from a race time) ---------- */
function vo2FromVelocity(v) { return -4.6 + 0.182258 * v + 0.000104 * v * v; }
function pctVO2FromTime(t) { return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t); }
function computeVDOT(distM, timeMin) {
    const v = distM / timeMin;
    return vo2FromVelocity(v) / pctVO2FromTime(timeMin);
}
const VDOT_TABLE = [
    [20, 956, 3.6, 764, 4.5, 683, 5.0], [21, 935, 3.7, 749, 4.6, 668, 5.2], [22, 915, 3.8, 734, 4.7, 653, 5.3],
    [23, 894, 3.9, 718, 4.8, 638, 5.4], [24, 874, 3.9, 703, 4.9, 623, 5.5], [25, 854, 4.0, 688, 5.0, 608, 5.7],
    [26, 834, 4.1, 673, 5.1, 594, 5.8], [27, 815, 4.2, 659, 5.2, 580, 5.9], [28, 796, 4.3, 645, 5.3, 566, 6.1],
    [29, 778, 4.4, 631, 5.5, 552, 6.2], [30, 760, 4.5, 618, 5.6, 539, 6.4], [31, 743, 4.6, 605, 5.7, 526, 6.5],
    [32, 727, 4.7, 593, 5.8, 515, 6.7], [33, 711, 4.8, 581, 5.9, 503, 6.8], [34, 697, 4.9, 570, 6.0, 493, 7.0],
    [35, 683, 5.0, 560, 6.2, 483, 7.1], [36, 670, 5.1, 550, 6.3, 474, 7.3], [37, 659, 5.2, 541, 6.4, 466, 7.4],
    [38, 647, 5.3, 532, 6.5, 458, 7.5], [39, 637, 5.4, 524, 6.6, 450, 7.7], [40, 626, 5.5, 516, 6.7, 443, 7.8],
    [41, 616, 5.6, 508, 6.8, 436, 7.9], [42, 606, 5.7, 501, 6.9, 429, 8.0], [43, 596, 5.8, 494, 7.0, 423, 8.1],
    [44, 587, 5.9, 487, 7.1, 416, 8.3], [45, 578, 6.0, 480, 7.2, 410, 8.4], [46, 570, 6.0, 473, 7.3, 403, 8.5],
    [47, 561, 6.1, 467, 7.4, 397, 8.7], [48, 554, 6.2, 461, 7.5, 391, 8.8], [49, 546, 6.3, 455, 7.6, 384, 9.0],
    [50, 539, 6.4, 449, 7.7, 378, 9.1], [51, 532, 6.5, 443, 7.8, 372, 9.3], [52, 526, 6.5, 438, 7.9, 366, 9.4],
    [53, 519, 6.6, 433, 8.0, 362, 9.5], [54, 513, 6.7, 428, 8.0, 358, 9.6], [55, 507, 6.8, 423, 8.1, 354, 9.7],
    [56, 501, 6.9, 418, 8.2, 350, 9.8], [57, 495, 7.0, 413, 8.3, 346, 10.0], [58, 489, 7.0, 409, 8.4, 342, 10.1],
    [59, 483, 7.1, 404, 8.5, 338, 10.2], [60, 478, 7.2, 400, 8.6, 334, 10.3], [61, 473, 7.3, 396, 8.7, 330, 10.4],
    [62, 468, 7.4, 392, 8.8, 326, 10.6], [63, 463, 7.4, 388, 8.9, 321, 10.7], [64, 458, 7.5, 384, 9.0, 315, 10.9],
    [65, 453, 7.6, 381, 9.1, 308, 11.2], [66, 449, 7.7, 377, 9.1, 301, 11.4], [67, 444, 7.8, 373, 9.2, 295, 11.7],
    [68, 439, 7.8, 369, 9.3, 288, 11.9], [69, 434, 7.9, 366, 9.4, 283, 12.2], [70, 430, 8.0, 362, 9.5, 278, 12.4],
    [71, 426, 8.1, 358, 9.6, 274, 12.6], [72, 421, 8.2, 355, 9.7, 271, 12.7], [73, 417, 8.3, 351, 9.8, 268, 12.9],
    [74, 413, 8.3, 347, 9.9, 265, 13.0], [75, 409, 8.4, 344, 10.0, 262, 13.1], [76, 405, 8.5, 341, 10.1, 260, 13.3],
    [77, 401, 8.6, 338, 10.2, 257, 13.4], [78, 398, 8.7, 335, 10.3, 255, 13.5], [79, 394, 8.7, 333, 10.4, 253, 13.6],
    [80, 391, 8.8, 330, 10.4, 251, 13.7], [81, 388, 8.9, 327, 10.5, 249, 13.8], [82, 384, 9.0, 325, 10.6, 247, 14.0],
    [83, 381, 9.0, 322, 10.7, 244, 14.1], [84, 378, 9.1, 320, 10.8, 242, 14.2], [85, 375, 9.2, 317, 10.9, 240, 14.4],
    [86, 372, 9.3, 315, 11.0, 238, 14.5], [87, 369, 9.3, 312, 11.0, 236, 14.6], [88, 366, 9.4, 310, 11.1, 233, 14.8],
    [89, 364, 9.5, 307, 11.2, 231, 14.9], [90, 361, 9.5, 305, 11.3, 229, 15.0],
];
function fmtPace(sec) {
    let min = Math.floor(sec / 60);
    let s = Math.round(sec % 60);
    if (s === 60) {
        s = 0;
        min += 1;
    }
    return `${min}:${String(s).padStart(2, '0')}/mi`;
}
function paceForZone(vdot, zone) {
    if (!vdot)
        return null;
    const v = Math.max(20, Math.min(90, vdot));
    const secIdx = zone === 'easy' ? 1 : zone === 'threshold' ? 3 : 5;
    const mphIdx = zone === 'easy' ? 2 : zone === 'threshold' ? 4 : 6;
    let lo = VDOT_TABLE[0], hi = VDOT_TABLE[VDOT_TABLE.length - 1];
    for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
        if (VDOT_TABLE[i][0] <= v && VDOT_TABLE[i + 1][0] >= v) {
            lo = VDOT_TABLE[i];
            hi = VDOT_TABLE[i + 1];
            break;
        }
    }
    const frac = hi[0] === lo[0] ? 0 : (v - lo[0]) / (hi[0] - lo[0]);
    const sec = lo[secIdx] + (hi[secIdx] - lo[secIdx]) * frac;
    const mph = lo[mphIdx] + (hi[mphIdx] - lo[mphIdx]) * frac;
    return { pace: fmtPace(sec), mph: mph.toFixed(1) };
}
/* ---------- core prescription engine ---------- */
function buildPassSlots(baseList, category) {
    let sCount = 0, eCount = 0, aOccurrence = 0;
    return baseList.map((letter) => {
        if (letter === 'LISS')
            return { base: 'LISS' };
        let track = null;
        if (category === 1)
            track = 'endurance';
        else if (category === 4)
            track = 'strength';
        else if (category === 2)
            track = letter === 'B' ? 'strength' : 'endurance';
        else if (category === 3)
            track = letter === 'A' ? 'strength' : 'endurance';
        let subLetter;
        if (category === 1 || category === 4)
            subLetter = letter;
        else if (track === 'strength') {
            sCount += 1;
            subLetter = String.fromCharCode(64 + sCount);
        }
        else {
            eCount += 1;
            subLetter = String.fromCharCode(64 + eCount);
        }
        if (letter === 'A')
            aOccurrence += 1;
        return { base: letter, track, subLetter, aOccurrence: letter === 'A' ? aOccurrence : null };
    });
}
function exerciseFor(slot, ex) {
    if (!slot.track)
        return null;
    if (slot.track === 'strength') {
        if (slot.base === 'A')
            return slot.aOccurrence === 1 ? ex.strengthA1 : ex.strengthA2;
        if (slot.base === 'B')
            return ex.strengthB;
        return ex.strengthC;
    }
    if (slot.base === 'A')
        return ex.enduranceA;
    if (slot.base === 'B')
        return ex.enduranceB;
    return ex.enduranceC;
}
function prescriptionFor(baseLetter, level, isTerminalLiss, settings) {
    const s = settings;
    if (baseLetter === 'LISS') {
        const range = isTerminalLiss ? s.lissLong : s.lissShort;
        return { headline: `${range[level]} min`, detail: 'RPE 3–4, conversational effort' };
    }
    if (baseLetter === 'A') {
        const sets = s.ssSetsWave[level];
        return {
            headline: `${sets * 10} swings → ${sets} get-ups`,
            detail: `All ${sets} swing sets first (10 reps each, alternating sides), then all ${sets} get-up sets (1 rep each, alternating sides). Don't mix the two.`,
        };
    }
    if (baseLetter === 'B') {
        const rounds = s.qndRoundsWave[level];
        return {
            headline: `${rounds} round${rounds > 1 ? 's' : ''}`,
            detail: `Each round: 4×5 swings on the :30 (set of 20), rest 1:00, then 4×5 pushups on the :30 (set of 20).`,
        };
    }
    if (baseLetter === 'C') {
        const sets = s.aaSetsWave[level];
        return { headline: `${sets} sets × 5`, detail: 'snatch, alternate sides — new set every 75s' };
    }
    return { headline: '—', detail: '' };
}
/* ---------- interval timer phase builders ---------- */
function buildQndPhases(rounds) {
    const phases = [];
    for (let r = 1; r <= rounds; r++) {
        for (let i = 1; i <= 4; i++)
            phases.push({ label: `Round ${r} — Swings`, sub: `Set ${i}/4 · 5 reps`, seconds: 30 });
        phases.push({ label: `Round ${r} — Rest`, sub: 'before Pushups', seconds: 60 });
        for (let i = 1; i <= 4; i++)
            phases.push({ label: `Round ${r} — Pushups`, sub: `Set ${i}/4 · 5 reps`, seconds: 30 });
        if (r < rounds)
            phases.push({ label: `Round ${r} Complete`, sub: 'Tap Continue when ready for the next round', seconds: null });
    }
    phases.push({ label: 'Complete', sub: `${rounds} round${rounds > 1 ? 's' : ''} done`, seconds: null, done: true });
    return phases;
}
function buildAaPhases(sets) {
    const phases = [];
    for (let i = 1; i <= sets; i++)
        phases.push({ label: `Set ${i}/${sets}`, sub: '5 reps, alternate side', seconds: 75 });
    phases.push({ label: 'Complete', sub: `${sets} sets done`, seconds: null, done: true });
    return phases;
}
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }
    catch (e) { /* audio unavailable */ }
}
function supplementPrescriptionFor(slot, settings) {
    if (!slot || !slot.track)
        return null;
    const name = exerciseFor(slot, settings.exerciseNames);
    if (slot.track === 'strength') {
        if (slot.base !== 'A')
            return { name, mode: 'freeform' };
        const tmKey = slot.aOccurrence === 1 ? 'bench' : 'frontSquat';
        return { name, tmKey, mode: 'strength', includesPullup: true };
    }
    const zone = slot.base === 'C' ? 'easy' : slot.base === 'B' ? 'repetition' : 'threshold';
    return { name, zone, mode: 'endurance' };
}
/* ---------- UI atoms ---------- */
function Badge({ color, children }) {
    return (React.createElement("span", { style: { background: color + '22', color, borderColor: color + '55' }, className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] tracking-wide uppercase font-mono" }, children));
}
function LevelChip({ level }) {
    return React.createElement(Badge, { color: LEVEL_COLOR[level] }, LEVEL_NAME[level]);
}
/* ---------- Interval Timer ---------- */
function IntervalTimer({ title, phases, onClose }) {
    const [idx, setIdx] = useState(0);
    const [remaining, setRemaining] = useState(phases[0].seconds ?? 0);
    const [running, setRunning] = useState(false);
    const phase = phases[idx];
    useEffect(() => {
        if (!running || phase.seconds == null)
            return;
        if (remaining <= 0) {
            playBeep();
            const next = idx + 1;
            if (next < phases.length) {
                setIdx(next);
                setRemaining(phases[next].seconds ?? 0);
                if (phases[next].seconds == null)
                    setRunning(false);
            }
            else {
                setRunning(false);
            }
            return;
        }
        const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
        return () => clearTimeout(t);
    }, [running, remaining, idx, phase, phases]);
    function reset() { setIdx(0); setRemaining(phases[0].seconds ?? 0); setRunning(false); }
    function continueManual() {
        const next = idx + 1;
        if (next < phases.length) {
            setIdx(next);
            setRemaining(phases[next].seconds ?? 0);
            setRunning(phases[next].seconds != null);
        }
    }
    return (React.createElement("div", { className: "fixed inset-0 flex items-center justify-center p-4 z-50", style: { backgroundColor: 'rgba(0,0,0,0.85)' } },
        React.createElement("div", { className: "rounded-sm p-6 max-w-xs w-full text-center border", style: { backgroundColor: '#1d2019', borderColor: '#3d4130', color: '#e7e4d9' } },
            React.createElement("div", { className: "flex items-center justify-between mb-4" },
                React.createElement("span", { className: "font-mono text-[11px] uppercase tracking-widest", style: { color: '#8b9078' } }, title),
                React.createElement("button", { onClick: onClose },
                    React.createElement(X, { size: 16, style: { color: '#8b9078' } }))),
            React.createElement("div", { className: "text-lg font-display mb-0.5", style: { color: '#e7e4d9' } }, phase.label),
            React.createElement("div", { className: "text-xs mb-5", style: { color: '#8b9078' } }, phase.sub),
            phase.seconds != null ? (React.createElement("div", { className: "font-mono text-5xl mb-6 tabular-nums", style: { color: '#c99a2e' } },
                "0:",
                String(remaining).padStart(2, '0'))) : (React.createElement("div", { className: "mb-6" }, phase.done ? React.createElement(Check, { size: 40, className: "mx-auto", style: { color: '#6b7a4f' } }) : React.createElement(TimerIcon, { size: 40, className: "mx-auto", style: { color: '#8b9078' } }))),
            React.createElement("div", { className: "flex gap-2 justify-center" }, phase.done ? (React.createElement("button", { onClick: onClose, className: "flex-1 rounded-sm py-2.5 text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Done")) : phase.seconds == null ? (React.createElement("button", { onClick: continueManual, className: "flex-1 rounded-sm py-2.5 text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Continue")) : (React.createElement(React.Fragment, null,
                React.createElement("button", { onClick: () => setRunning(!running), className: "flex-1 flex items-center justify-center gap-1.5 rounded-sm py-2.5 text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } },
                    running ? React.createElement(Pause, { size: 15 }) : React.createElement(Play, { size: 15 }),
                    " ",
                    running ? 'Pause' : 'Start'),
                React.createElement("button", { onClick: reset, className: "px-3 border rounded-sm", style: { borderColor: '#2c2f26', color: '#8b9078' } },
                    React.createElement(RotateCcw, { size: 16 }))))),
            React.createElement("div", { className: "text-[10px] font-mono mt-4", style: { color: '#5a5f4c' } },
                idx + 1,
                " / ",
                phases.length))));
}
/* ---------- S&S Set Tracker ---------- */
function SsSetTracker({ totalSets }) {
    const [phase, setPhase] = useState('swings');
    const [count, setCount] = useState(0);
    function next() {
        const c = count + 1;
        if (phase === 'swings') {
            if (c >= totalSets) {
                setPhase('getups');
                setCount(0);
            }
            else
                setCount(c);
        }
        else if (phase === 'getups') {
            if (c >= totalSets) {
                setPhase('done');
                setCount(totalSets);
            }
            else
                setCount(c);
        }
    }
    function reset() { setPhase('swings'); setCount(0); }
    const swingSide = count % 2 === 0 ? 'LEFT' : 'RIGHT';
    const getupSide = count % 2 === 0 ? 'LEFT' : 'RIGHT';
    const label = phase === 'done' ? 'Set Tracker · Complete' : phase === 'swings' ? `Swings · ${count}/${totalSets}` : `Get-Ups · ${count}/${totalSets}`;
    return (React.createElement("div", { className: "mt-4 border-t pt-4", style: { borderColor: '#2c2f26' } },
        React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest mb-2", style: { color: '#8b9078' } }, label),
        phase === 'done' ? (React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "text-sm", style: { color: '#6b7a4f' } }, "Swings and get-ups both logged."),
            React.createElement("button", { onClick: reset, className: "px-3 py-1.5 border rounded-sm text-xs font-mono", style: { borderColor: '#2c2f26', color: '#8b9078' } },
                React.createElement(RotateCcw, { size: 12, className: "inline mr-1" }),
                "Reset"))) : phase === 'swings' ? (React.createElement("div", { className: "flex items-center gap-3" },
            React.createElement("div", { className: "flex-1 text-center py-3 rounded-sm font-display text-xl tracking-widest", style: { backgroundColor: '#4a7a8c22', color: '#8fb4c2', border: '2px solid #4a7a8c' } },
                swingSide,
                " \u00B7 SET ",
                count + 1),
            React.createElement("button", { onClick: next, className: "px-4 py-3 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Next"))) : (React.createElement("div", { className: "flex items-center gap-3" },
            React.createElement("div", { className: "flex-1 text-center py-3 rounded-sm font-display text-2xl tracking-widest", style: { backgroundColor: '#6b7a4f22', color: '#a9b98f', border: '2px solid #6b7a4f' } }, getupSide),
            React.createElement("button", { onClick: next, className: "px-4 py-3 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Next")))));
}
/* ---------- Setup Wizard ---------- */
function Setup({ onComplete }) {
    const [step, setStep] = useState(0);
    const [category, setCategory] = useState(1);
    const [microcycleLength, setMicrocycleLength] = useState(7);
    const [tm, setTm] = useState({ bench: '', frontSquat: '' });
    const [raceDist, setRaceDist] = useState(5000);
    const [raceTime, setRaceTime] = useState(20);
    const [vdotMode, setVdotMode] = useState('calc');
    const [manualVdot, setManualVdot] = useState('');
    const categories = [
        { id: 1, label: 'Category 1 — Fail endurance', desc: 'Base + full Endurance supplement' },
        { id: 2, label: 'Category 2 — Pass endurance, relatively weaker there', desc: 'Endurance priority, Strength auxiliary' },
        { id: 3, label: 'Category 3 — Pass strength, relatively weaker there', desc: 'Strength priority, Endurance auxiliary' },
        { id: 4, label: 'Category 4 — Fail a strength event', desc: 'Base + full Strength supplement' },
    ];
    const steps = ['Mission', 'Frequency', 'Training Max', 'Aerobic Baseline'];
    const inputStyle = { backgroundColor: '#1d2019', borderColor: '#2c2f26', color: '#e7e4d9' };
    return (React.createElement("div", { className: "max-w-md mx-auto" },
        React.createElement("div", { className: "flex items-center gap-2 mb-6 font-mono text-[11px] uppercase tracking-widest" }, steps.map((label, i) => (React.createElement(Fragment, { key: label },
            React.createElement("span", { style: { color: i === step ? '#c99a2e' : '#8b9078' } }, label),
            i < steps.length - 1 && React.createElement("span", { style: { opacity: 0.3, color: '#8b9078' } }, "/"))))),
        step === 0 && (React.createElement("div", { className: "space-y-3" },
            React.createElement("h2", { className: "font-display text-2xl mb-1", style: { color: '#e7e4d9' } }, "Identify the mission."),
            React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } }, "Be honest, not aspirational. Where does your fitness test performance actually land?"),
            categories.map((c) => (React.createElement("button", { key: c.id, onClick: () => setCategory(c.id), className: "w-full text-left p-3 rounded-sm transition flex items-start justify-between gap-3", style: category === c.id ? { border: '2px solid #c99a2e', backgroundColor: '#c99a2e1f' } : { border: '1px solid #2c2f26' } },
                React.createElement("div", null,
                    React.createElement("div", { className: "text-sm font-medium", style: { color: category === c.id ? '#f0dba8' : '#e7e4d9' } }, c.label),
                    React.createElement("div", { className: "text-xs mt-0.5", style: { color: '#8b9078' } }, c.desc)),
                category === c.id && React.createElement(Check, { size: 16, style: { color: '#c99a2e' }, className: "shrink-0 mt-0.5" })))))),
        step === 1 && (React.createElement("div", { className: "space-y-3" },
            React.createElement("h2", { className: "font-display text-2xl mb-1", style: { color: '#e7e4d9' } }, "Set your frequency."),
            React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } }, "How many days can you actually recover from, honestly?"),
            [{ n: 4, d: 'Train 2–3 days/week — limited time or recovery' }, { n: 7, d: 'Train 3–5 days/week — the original template' }, { n: 10, d: 'Train 5–7 days/week — high frequency, more LISS to dissipate fatigue' }].map((o) => (React.createElement("button", { key: o.n, onClick: () => setMicrocycleLength(o.n), className: "w-full text-left p-3 rounded-sm transition flex items-start justify-between gap-3", style: microcycleLength === o.n ? { border: '2px solid #c99a2e', backgroundColor: '#c99a2e1f' } : { border: '1px solid #2c2f26' } },
                React.createElement("div", null,
                    React.createElement("div", { className: "text-sm font-medium", style: { color: microcycleLength === o.n ? '#f0dba8' : '#e7e4d9' } },
                        o.n,
                        "-Day Microcycle"),
                    React.createElement("div", { className: "text-xs mt-0.5", style: { color: '#8b9078' } }, o.d)),
                microcycleLength === o.n && React.createElement(Check, { size: 16, style: { color: '#c99a2e' }, className: "shrink-0 mt-0.5" })))))),
        step === 2 && (React.createElement("div", { className: "space-y-4" },
            React.createElement("h2", { className: "font-display text-2xl mb-1", style: { color: '#e7e4d9' } }, "Training max."),
            React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } }, "True working max, not a one-rep ego lift. Loads will be prescribed at 70/80/90% of these. Weighted Pull-Up isn't included here \u2014 it's prescribed as a rep ladder instead."),
            [{ k: 'bench', l: 'Bench Press (lb/kg)' }, { k: 'frontSquat', l: 'Front Squat (lb/kg)' }].map((f) => (React.createElement("div", { key: f.k },
                React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, f.l),
                React.createElement("input", { type: "number", value: tm[f.k], onChange: (e) => setTm({ ...tm, [f.k]: e.target.value }), className: "w-full mt-1 rounded-sm px-3 py-2 font-mono focus:outline-none border", style: inputStyle })))))),
        step === 3 && (React.createElement("div", { className: "space-y-4" },
            React.createElement("h2", { className: "font-display text-2xl mb-1", style: { color: '#e7e4d9' } }, "Aerobic baseline."),
            React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } }, "Threshold and Easy paces are looked up from your VDOT, not re-derived from a formula."),
            React.createElement("div", { className: "flex gap-1 mb-1 rounded-sm p-1 w-fit border", style: { borderColor: '#2c2f26' } }, [['calc', 'Calculate from race'], ['manual', 'Enter VDOT']].map(([id, label]) => (React.createElement("button", { key: id, onClick: () => setVdotMode(id), className: "px-3 py-1.5 text-xs font-mono rounded-sm", style: vdotMode === id ? { backgroundColor: '#c99a2e', color: '#14161a' } : { color: '#8b9078' } }, label)))),
            vdotMode === 'calc' ? (React.createElement(React.Fragment, null,
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                    React.createElement("div", null,
                        React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, "Distance (m)"),
                        React.createElement("input", { type: "number", value: raceDist, onChange: (e) => setRaceDist(Number(e.target.value)), className: "w-full mt-1 rounded-sm px-3 py-2 font-mono focus:outline-none border", style: inputStyle })),
                    React.createElement("div", null,
                        React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, "Time (min)"),
                        React.createElement("input", { type: "number", value: raceTime, onChange: (e) => setRaceTime(Number(e.target.value)), className: "w-full mt-1 rounded-sm px-3 py-2 font-mono focus:outline-none border", style: inputStyle }))),
                React.createElement("div", { className: "text-xs font-mono", style: { color: '#8b9078' } },
                    "VDOT (computed): ",
                    React.createElement("span", { style: { color: '#c99a2e' } }, computeVDOT(raceDist, raceTime).toFixed(1))))) : (React.createElement("div", null,
                React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, "VDOT"),
                React.createElement("input", { type: "number", value: manualVdot, onChange: (e) => setManualVdot(e.target.value), placeholder: "e.g. 45", className: "w-full mt-1 rounded-sm px-3 py-2 font-mono focus:outline-none border", style: inputStyle }))))),
        React.createElement("div", { className: "flex justify-between mt-8" },
            React.createElement("button", { disabled: step === 0, onClick: () => setStep(step - 1), className: "flex items-center gap-1 text-sm disabled:opacity-0 font-mono uppercase tracking-wide", style: { color: '#8b9078' } },
                React.createElement(ChevronLeft, { size: 14 }),
                " Back"),
            step < 3 ? (React.createElement("button", { onClick: () => setStep(step + 1), className: "flex items-center gap-1 px-4 py-2 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } },
                "Next ",
                React.createElement(ChevronRight, { size: 14 }))) : (React.createElement("button", { onClick: () => onComplete({
                    settings: { ...DEFAULT_SETTINGS, category, microcycleLength },
                    profile: { tm: { bench: Number(tm.bench) || 0, frontSquat: Number(tm.frontSquat) || 0 }, vdot: vdotMode === 'manual' ? (Number(manualVdot) || 0) : computeVDOT(raceDist, raceTime), raceDist, raceTime },
                }), className: "flex items-center gap-1 px-4 py-2 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } },
                React.createElement(Syringe, { size: 14 }),
                " Start Program")))));
}
/* ---------- Cycle Track ---------- */
function CycleTrack({ passIndex, sessionIndexInPass, baseList }) {
    return (React.createElement("div", { className: "space-y-3" },
        React.createElement("div", null,
            React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest text-[#8b9078] mb-1.5" },
                "Mesocycle Wave \u00B7 Pass ",
                passIndex + 1,
                " / 9"),
            React.createElement("div", { className: "flex gap-1" }, WAVE_SEQ.map((lvl, i) => (React.createElement("div", { key: i, className: "flex-1 h-2 rounded-[1px]", style: {
                    background: i === passIndex ? LEVEL_COLOR[lvl] : LEVEL_COLOR[lvl] + '33',
                    boxShadow: i === passIndex ? `0 0 0 1px ${LEVEL_COLOR[lvl]}` : 'none',
                } }))))),
        React.createElement("div", null,
            React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest text-[#8b9078] mb-1.5" },
                "This Pass \u00B7 ",
                baseList.length,
                " Sessions"),
            React.createElement("div", { className: "flex gap-1" }, baseList.map((b, i) => (React.createElement("div", { key: i, className: "flex-1 h-8 rounded-[1px] flex items-center justify-center text-[10px] font-mono border", style: {
                    background: i < sessionIndexInPass ? BASE_INFO[b].color + '33' : i === sessionIndexInPass ? BASE_INFO[b].color + '55' : 'transparent',
                    borderColor: i === sessionIndexInPass ? BASE_INFO[b].color : '#2c2f26',
                    color: i <= sessionIndexInPass ? '#e7e4d9' : '#5a5f4c',
                } }, BASE_INFO[b].name)))))));
}
/* ---------- Training Max Progress Chart (hand-rolled SVG, no chart library) ---------- */
function TmProgressChart({ tmHistory }) {
    if (!tmHistory || tmHistory.length === 0) {
        return React.createElement("p", { className: "text-xs", style: { color: '#5a5f4c' } }, "No history yet \u2014 this fills in as you complete setup and cycles.");
    }
    const W = 460, H = 200, padL = 34, padR = 10, padT = 10, padB = 24;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const benchVals = tmHistory.map((h) => h.bench || 0);
    const squatVals = tmHistory.map((h) => h.frontSquat || 0);
    const allVals = [...benchVals, ...squatVals, 0];
    const maxV = Math.max(...allVals, 10) * 1.1;
    const n = tmHistory.length;
    const xFor = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
    const yFor = (v) => padT + innerH - (v / maxV) * innerH;
    const pathFor = (vals) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');
    const gridLines = [0, 0.25, 0.5, 0.75, 1];
    return (React.createElement("div", null,
        React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H },
            gridLines.map((f) => (React.createElement("line", { key: f, x1: padL, x2: W - padR, y1: padT + innerH * (1 - f), y2: padT + innerH * (1 - f), stroke: "#2c2f26", strokeDasharray: "3 3" }))),
            React.createElement("path", { d: pathFor(benchVals), fill: "none", stroke: "#c99a2e", strokeWidth: "2" }),
            React.createElement("path", { d: pathFor(squatVals), fill: "none", stroke: "#6b7a4f", strokeWidth: "2" }),
            benchVals.map((v, i) => React.createElement("circle", { key: 'b' + i, cx: xFor(i), cy: yFor(v), r: "3", fill: "#c99a2e" })),
            squatVals.map((v, i) => React.createElement("circle", { key: 's' + i, cx: xFor(i), cy: yFor(v), r: "3", fill: "#6b7a4f" })),
            tmHistory.map((h, i) => (n <= 8 || i === 0 || i === n - 1 ? (React.createElement("text", { key: i, x: xFor(i), y: H - 6, fontSize: "9", fill: "#8b9078", textAnchor: "middle" }, new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))) : null))),
        React.createElement("div", { className: "flex gap-4 mt-1 text-[11px]", style: { color: '#8b9078' } },
            React.createElement("span", null,
                React.createElement("span", { style: { color: '#c99a2e' } }, "\u25CF"),
                " Bench"),
            React.createElement("span", null,
                React.createElement("span", { style: { color: '#6b7a4f' } }, "\u25CF"),
                " Front Squat"))));
}
/* ---------- Rollover Modal ---------- */
function RolloverModal({ avgRpe, onApply, onDismiss }) {
    const rule = DEFAULT_SETTINGS.rpeRule.find((r) => avgRpe <= r.max) || DEFAULT_SETTINGS.rpeRule[DEFAULT_SETTINGS.rpeRule.length - 1];
    const delta = rule.tmDelta;
    return (React.createElement("div", { className: "fixed inset-0 flex items-center justify-center p-4 z-50", style: { backgroundColor: 'rgba(0,0,0,0.88)' } },
        React.createElement("div", { className: "rounded-sm p-6 max-w-sm w-full border", style: { backgroundColor: '#1d2019', borderColor: '#3d4130' } },
            React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement(TrendingUp, { size: 16, style: { color: '#c99a2e' } }),
                React.createElement("h3", { className: "font-display text-xl", style: { color: '#e7e4d9' } }, "Cycle Complete")),
            React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } },
                "Average RPE across your High-week sessions in Mesocycle 3 was ",
                React.createElement("span", { className: "font-mono", style: { color: '#e7e4d9' } }, avgRpe.toFixed(1)),
                ". Proposed adjustment: ",
                React.createElement("span", { style: { color: delta > 0 ? '#8fac6f' : delta < 0 ? '#c76b52' : '#8b9078' }, className: "font-mono" },
                    delta > 0 ? '+' : '',
                    delta,
                    "%"),
                " training max."),
            React.createElement("div", { className: "flex gap-2 justify-end mt-6" },
                React.createElement("button", { onClick: onDismiss, className: "px-3 py-2 text-sm font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, "Skip"),
                React.createElement("button", { onClick: () => onApply(delta), className: "px-4 py-2 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Apply & Continue")))));
}
/* ---------- Settings Panel ---------- */
function SettingsPanel({ settings, profile, tmHistory, onSave, onClose }) {
    const [s, setS] = useState(JSON.parse(JSON.stringify(settings)));
    const [p, setP] = useState(JSON.parse(JSON.stringify(profile)));
    const [tab, setTab] = useState('settings');
    const labelStyle = { color: '#8b9078' };
    const fieldStyle = { backgroundColor: '#14161a', borderColor: '#2c2f26', color: '#e7e4d9' };
    const whiteFieldStyle = { backgroundColor: '#ffffff', borderColor: '#2c2f26', color: '#000000' };
    return (React.createElement("div", { className: "fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto", style: { backgroundColor: 'rgba(0,0,0,0.88)' } },
        React.createElement("div", { className: "rounded-sm p-6 max-w-lg w-full my-8 border", style: { backgroundColor: '#1d2019', borderColor: '#3d4130' } },
            React.createElement("div", { className: "flex items-center justify-between mb-4" },
                React.createElement("h3", { className: "font-display text-xl", style: { color: '#e7e4d9' } }, "Settings"),
                React.createElement("button", { onClick: onClose },
                    React.createElement(X, { size: 18, style: { color: '#8b9078' } }))),
            React.createElement("div", { className: "flex gap-1 mb-5 border rounded-sm p-1 w-fit", style: { borderColor: '#2c2f26' } }, [['settings', 'Settings'], ['progress', 'Training Max Progress']].map(([id, label]) => (React.createElement("button", { key: id, onClick: () => setTab(id), className: "px-3 py-1.5 text-xs font-mono rounded-sm", style: tab === id ? { backgroundColor: '#c99a2e', color: '#14161a' } : { color: '#8b9078' } }, label)))),
            tab === 'progress' ? (React.createElement(TmProgressChart, { tmHistory: tmHistory })) : (React.createElement("div", { className: "space-y-5 text-sm" },
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: labelStyle }, "Category"),
                    React.createElement("select", { value: s.category, onChange: (e) => setS({ ...s, category: Number(e.target.value) }), className: "w-full mt-1 rounded-sm px-2 py-1.5 border", style: fieldStyle },
                        React.createElement("option", { value: 1 }, "1 \u2014 Base + Endurance"),
                        React.createElement("option", { value: 2 }, "2 \u2014 Endurance priority"),
                        React.createElement("option", { value: 3 }, "3 \u2014 Strength priority"),
                        React.createElement("option", { value: 4 }, "4 \u2014 Base + Strength"))),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: labelStyle }, "Microcycle Length"),
                    React.createElement("select", { value: s.microcycleLength, onChange: (e) => setS({ ...s, microcycleLength: Number(e.target.value) }), className: "w-full mt-1 rounded-sm px-2 py-1.5 border", style: fieldStyle },
                        React.createElement("option", { value: 4 }, "4-Day"),
                        React.createElement("option", { value: 7 }, "7-Day"),
                        React.createElement("option", { value: 10 }, "10-Day"))),
                React.createElement("div", null,
                    React.createElement("div", { className: "text-xs font-mono uppercase tracking-wide mb-1", style: labelStyle }, "Training Max"),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" }, [['bench', 'Bench'], ['frontSquat', 'Front Squat']].map(([k, label]) => (React.createElement("div", { key: k },
                        React.createElement("span", { className: "text-[10px]", style: { color: '#5a5f4c' } }, label),
                        React.createElement("input", { type: "number", value: p.tm[k], onChange: (e) => setP({ ...p, tm: { ...p.tm, [k]: Number(e.target.value) } }), className: "w-full rounded-sm px-2 py-1.5 font-mono border", style: whiteFieldStyle })))))),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs font-mono uppercase tracking-wide", style: labelStyle }, "VDOT"),
                    React.createElement("input", { type: "number", value: p.vdot ? Number(p.vdot.toFixed(1)) : '', onChange: (e) => setP({ ...p, vdot: Number(e.target.value) }), className: "w-full mt-1 rounded-sm px-2 py-1.5 font-mono border", style: whiteFieldStyle })))),
            tab === 'settings' && (React.createElement("div", { className: "flex justify-end gap-2 mt-6" },
                React.createElement("button", { onClick: onClose, className: "px-3 py-2 text-sm font-mono uppercase tracking-wide", style: { color: '#8b9078' } }, "Cancel"),
                React.createElement("button", { onClick: () => onSave(s, p), className: "px-4 py-2 rounded-sm text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Save"))))));
}
/* ---------- Main App ---------- */
function NovocaineApp() {
    const [loaded, setLoaded] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [profile, setProfile] = useState(DEFAULT_PROFILE);
    const [progress, setProgress] = useState(DEFAULT_PROGRESS);
    const [history, setHistory] = useState([]);
    const [tmHistory, setTmHistory] = useState([]);
    const [needsSetup, setNeedsSetup] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [rollover, setRollover] = useState(null);
    const [rpeInput, setRpeInput] = useState(6);
    const [noteInput, setNoteInput] = useState('');
    const [logging, setLogging] = useState(false);
    const [showTimer, setShowTimer] = useState(false);
    const [saveError, setSaveError] = useState(false);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                setSettings(d.settings || DEFAULT_SETTINGS);
                setProfile(d.profile || DEFAULT_PROFILE);
                setProgress(d.progress || DEFAULT_PROGRESS);
                setHistory(d.history || []);
                setTmHistory(d.tmHistory || []);
                setNeedsSetup(false);
            }
        }
        catch (e) { /* no saved state yet */ }
        setLoaded(true);
    }, []);
    const persist = useCallback((next) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        catch (e) {
            setSaveError(true);
        }
    }, []);
    const baseList = BASE_LISTS[settings.microcycleLength];
    const passSlots = buildPassSlots(baseList, settings.category);
    const level = WAVE_SEQ[progress.passIndex % 9];
    const currentIdx = progress.sessionIndexInPass;
    const currentBase = baseList[currentIdx];
    const currentSlot = passSlots[currentIdx];
    const isTerminalLiss = currentBase === 'LISS' && currentIdx === baseList.length - 1;
    const basePrescription = prescriptionFor(currentBase, level, isTerminalLiss, settings);
    const supp = supplementPrescriptionFor(currentSlot, settings);
    const timerPhases = currentBase === 'B' ? buildQndPhases(settings.qndRoundsWave[level])
        : currentBase === 'C' ? buildAaPhases(settings.aaSetsWave[level]) : null;
    function handleSetupComplete({ settings: newSettings, profile: newProfile }) {
        const initialTm = [{ date: new Date().toISOString(), bench: newProfile.tm.bench, frontSquat: newProfile.tm.frontSquat }];
        const next = { settings: newSettings, profile: newProfile, progress: DEFAULT_PROGRESS, history: [], tmHistory: initialTm };
        setSettings(newSettings);
        setProfile(newProfile);
        setProgress(DEFAULT_PROGRESS);
        setHistory([]);
        setTmHistory(initialTm);
        setNeedsSetup(false);
        persist(next);
    }
    function advance(rpe) {
        const entry = {
            date: new Date().toISOString(), passIndex: progress.passIndex, level,
            base: currentBase, baseHeadline: basePrescription.headline,
            supplement: supp ? supp.name : null, note: supp && supp.mode === 'freeform' ? noteInput : null, rpe,
        };
        let nextIdx = currentIdx + 1;
        let nextPass = progress.passIndex;
        let nextCycle = progress.cycleCount;
        let rpeBucket = [...progress.rpeThisCycleH];
        if (level === 'H' && rpe != null)
            rpeBucket.push(rpe);
        let triggerRollover = null;
        if (nextIdx >= baseList.length) {
            nextIdx = 0;
            nextPass = (progress.passIndex + 1) % 9;
            if (nextPass === 0) {
                nextCycle += 1;
                if (rpeBucket.length) {
                    const avg = rpeBucket.reduce((a, b) => a + b, 0) / rpeBucket.length;
                    triggerRollover = avg;
                }
                rpeBucket = [];
            }
        }
        const newProgress = { passIndex: nextPass, sessionIndexInPass: nextIdx, cycleCount: nextCycle, rpeThisCycleH: rpeBucket };
        const newHistory = [entry, ...history].slice(0, 500);
        setProgress(newProgress);
        setHistory(newHistory);
        setLogging(false);
        setNoteInput('');
        persist({ settings, profile, progress: newProgress, history: newHistory, tmHistory });
        if (triggerRollover != null)
            setRollover(triggerRollover);
    }
    function skipSession() { advance(null); }
    function applyRollover(deltaPct) {
        const nextProfile = {
            ...profile,
            tm: Object.fromEntries(Object.entries(profile.tm).map(([k, v]) => [k, Math.round(v * (1 + deltaPct / 100))])),
            vdot: profile.vdot * (1 + deltaPct / 200),
        };
        const nextTmHistory = [...tmHistory, { date: new Date().toISOString(), bench: nextProfile.tm.bench, frontSquat: nextProfile.tm.frontSquat }];
        setProfile(nextProfile);
        setTmHistory(nextTmHistory);
        persist({ settings, profile: nextProfile, progress, history, tmHistory: nextTmHistory });
        setRollover(null);
    }
    if (!loaded)
        return React.createElement("div", { className: "min-h-screen", style: { backgroundColor: '#14161a' } });
    return (React.createElement("div", { className: "min-h-screen", style: { backgroundColor: '#14161a', color: '#e7e4d9', fontFamily: "'Inter', system-ui, sans-serif" } },
        React.createElement("div", { className: "max-w-md mx-auto px-5 py-8" },
            React.createElement("div", { className: "flex items-center justify-between mb-8" },
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement(Syringe, { size: 20, style: { color: '#c99a2e' } }),
                    React.createElement("span", { className: "font-display text-lg tracking-wide" }, "NOVOCAINE")),
                !needsSetup && (React.createElement("button", { onClick: () => setShowSettings(true) },
                    React.createElement(SettingsIcon, { size: 18, style: { color: '#8b9078' } })))),
            needsSetup ? (React.createElement(Setup, { onComplete: handleSetupComplete })) : (React.createElement("div", { className: "space-y-6" },
                React.createElement(CycleTrack, { passIndex: progress.passIndex, sessionIndexInPass: currentIdx, baseList: baseList }),
                React.createElement("div", { className: "border rounded-sm p-5", style: { borderColor: '#2c2f26', background: `linear-gradient(135deg, ${BASE_INFO[currentBase].color}14, transparent)` } },
                    React.createElement("div", { className: "flex items-center justify-between mb-3" },
                        React.createElement(Badge, { color: BASE_INFO[currentBase].color }, BASE_INFO[currentBase].kind),
                        React.createElement(LevelChip, { level: level })),
                    React.createElement("h2", { className: "font-display text-2xl mb-0.5" }, BASE_INFO[currentBase].name),
                    React.createElement("p", { className: "text-xs mb-4", style: { color: '#8b9078' } }, BASE_INFO[currentBase].full),
                    React.createElement("div", { className: "font-mono text-3xl mb-1", style: { color: '#c99a2e' } }, basePrescription.headline),
                    React.createElement("p", { className: "text-sm mb-4", style: { color: '#8b9078' } }, basePrescription.detail),
                    currentBase === 'A' && (React.createElement(SsSetTracker, { key: `ss-${progress.passIndex}-${currentIdx}`, totalSets: settings.ssSetsWave[level] })),
                    timerPhases && (React.createElement("div", { className: "border-t pt-3 mt-1", style: { borderColor: '#2c2f26' } },
                        React.createElement("button", { onClick: () => setShowTimer(true), className: "w-full flex items-center justify-center gap-1.5 rounded-sm py-2.5 text-sm font-medium border", style: { borderColor: '#c99a2e55', color: '#c99a2e' } },
                            React.createElement(TimerIcon, { size: 15 }),
                            " Start Set Timer"))),
                    supp && (React.createElement("div", { className: "border-t pt-3 mt-1", style: { borderColor: '#2c2f26' } },
                        React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest mb-1", style: { color: '#8b9078' } },
                            "Supplement \u2014 ",
                            supp.mode === 'endurance' ? 'Endurance' : 'Strength',
                            " ",
                            currentSlot.subLetter),
                        React.createElement("div", { className: "text-sm", style: { color: '#e7e4d9' } }, supp.name),
                        supp.mode === 'strength' ? (React.createElement(React.Fragment, null,
                            React.createElement("div", { className: "font-mono text-sm mt-0.5", style: { color: '#c99a2e' } }, profile.tm[supp.tmKey]
                                ? `${settings.strengthScheme[level].sets}×${settings.strengthScheme[level].reps} @ ${Math.round(profile.tm[supp.tmKey] * settings.strengthScheme[level].pct / 100 / 5) * 5} (${settings.strengthScheme[level].pct}% TM)`
                                : 'Set training max in Settings'),
                            supp.includesPullup && (React.createElement("div", { className: "mt-2 pt-2 border-t", style: { borderColor: '#2c2f2680' } },
                                React.createElement("div", { className: "text-sm", style: { color: '#e7e4d9' } }, "Weighted Pull-Up"),
                                React.createElement("div", { className: "font-mono text-sm mt-0.5", style: { color: '#c99a2e' } }, pullupLadderText(level)))))) : supp.mode === 'freeform' ? (React.createElement("textarea", { value: noteInput, onChange: (e) => setNoteInput(e.target.value), placeholder: "Log what you did \u2014 exercise, load, sets/reps...", rows: 2, className: "w-full mt-1.5 rounded-sm px-2.5 py-2 text-sm focus:outline-none resize-none border", style: { backgroundColor: '#14161a', borderColor: '#2c2f26', color: '#e7e4d9' } })) : (React.createElement("div", { className: "font-mono text-sm mt-0.5", style: { color: '#c99a2e' } }, (() => {
                            const lookupVdot = supp.zone === 'threshold' ? profile.vdot - 1 : profile.vdot;
                            const p = paceForZone(lookupVdot, supp.zone);
                            if (!p)
                                return 'Set VDOT in Settings';
                            const label = `${p.pace} (${p.mph} mph treadmill)`;
                            return supp.zone === 'easy' ? `Easy pace, RPE 3–4 · ${label}` : label;
                        })())))),
                    !logging ? (React.createElement("div", { className: "flex gap-2 mt-5" },
                        React.createElement("button", { onClick: () => setLogging(true), className: "flex-1 flex items-center justify-center gap-1.5 rounded-sm py-2.5 text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } },
                            React.createElement(Check, { size: 15 }),
                            " Log Complete"),
                        React.createElement("button", { onClick: skipSession, className: "px-3 border rounded-sm", style: { borderColor: '#2c2f26', color: '#8b9078' } },
                            React.createElement(SkipForward, { size: 16 })))) : (React.createElement("div", { className: "mt-5 border-t pt-4", style: { borderColor: '#2c2f26' } },
                        React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest mb-2", style: { color: '#8b9078' } },
                            "RPE \u2014 ",
                            rpeInput),
                        React.createElement("input", { type: "range", min: 1, max: 10, value: rpeInput, onChange: (e) => setRpeInput(Number(e.target.value)), className: "w-full", style: { accentColor: '#c99a2e' } }),
                        React.createElement("div", { className: "flex gap-2 mt-3" },
                            React.createElement("button", { onClick: () => advance(rpeInput), className: "flex-1 rounded-sm py-2.5 text-sm font-medium", style: { backgroundColor: '#c99a2e', color: '#14161a' } }, "Save"),
                            React.createElement("button", { onClick: () => setLogging(false), className: "px-4 border rounded-sm text-sm", style: { borderColor: '#2c2f26', color: '#8b9078' } }, "Cancel"))))),
                history.length > 0 && (React.createElement("div", null,
                    React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest mb-2", style: { color: '#8b9078' } }, "History"),
                    React.createElement("div", { className: "space-y-1.5 max-h-64 overflow-y-auto" }, history.slice(0, 20).map((h, i) => (React.createElement("div", { key: i, className: "border-b pb-1.5", style: { borderColor: '#2c2f26' } },
                        React.createElement("div", { className: "flex items-center justify-between text-xs" },
                            React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement(Badge, { color: BASE_INFO[h.base].color }, BASE_INFO[h.base].name),
                                React.createElement("span", { style: { color: '#8b9078' } }, new Date(h.date).toLocaleDateString())),
                            React.createElement("span", { className: "font-mono", style: { color: '#5a5f4c' } }, h.rpe != null ? `RPE ${h.rpe}` : 'skipped')),
                        h.note && React.createElement("div", { className: "text-[11px] mt-1 pl-0.5", style: { color: '#8b9078' } }, h.note))))))),
                saveError && React.createElement("p", { className: "text-xs", style: { color: '#a8402f' } }, "Couldn't save \u2014 your browser may be blocking local storage.")))),
        showSettings && (React.createElement(SettingsPanel, { settings: settings, profile: profile, tmHistory: tmHistory, onClose: () => setShowSettings(false), onSave: (s, p) => {
                const nextTmHistory = [...tmHistory, { date: new Date().toISOString(), bench: p.tm.bench, frontSquat: p.tm.frontSquat }];
                setSettings(s);
                setProfile(p);
                setTmHistory(nextTmHistory);
                setShowSettings(false);
                persist({ settings: s, profile: p, progress, history, tmHistory: nextTmHistory });
            } })),
        rollover != null && (React.createElement(RolloverModal, { avgRpe: rollover, onApply: applyRollover, onDismiss: () => setRollover(null) })),
        showTimer && timerPhases && (React.createElement(IntervalTimer, { title: BASE_INFO[currentBase].name, phases: timerPhases, onClose: () => setShowTimer(false) }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(NovocaineApp, null));
