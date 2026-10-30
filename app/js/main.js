import { confetti } from './celebrate.js';
import { SOLVED, applyMoves, isSolved } from './cube.js';
import { parse } from './notation.js';
import { TaskQueue } from './queue.js';
import { randomScramble } from './scramble.js';
import {
  createSession, elapsed, fromStored, isNewSolve, recordMove, scrambleSession, toStored,
} from './session.js';
import { CubeView } from './view.js';

const STORAGE_KEY = 'rubiks:v1';
const MOVE_NAMES = ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S', 'x', 'y', 'z'];
const STATUS_TEXT = {
  idle: 'Free play — scramble to start an attempt.',
  scrambled: 'Scrambled — the timer starts on your first turn.',
  solving: 'Solving…',
  solved: 'Solved!',
};

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function load() {
  try {
    return fromStored(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return null; // corrupt JSON or storage unavailable
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStored(session, Date.now())));
  } catch {
    // Storage full or disabled (e.g. private mode): keep playing without persistence.
  }
}

const formatTime = (ms) => {
  const cs = Math.floor(ms / 10);
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};

let session = load() ?? createSession();
const view = new CubeView($('scene'), { onMove: (move) => turn(move) });
view.render(session.cube);

const queue = new TaskQueue();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function update() {
  $('move-count').textContent = String(session.moves);
  $('scramble-text').textContent = session.scramble || '—';
  $('status').textContent = STATUS_TEXT[session.status];
  updateTimer();
}

function updateTimer() {
  $('timer').textContent = formatTime(elapsed(session, Date.now()));
}

function turn(move) {
  queue.push(async () => {
    const generation = queue.generation;
    const next = recordMove(session, move, Date.now());
    const ms = reducedMotion.matches ? 0 : queue.pending > 1 ? 70 : 160;
    await view.animate(move, ms, next.cube);
    if (generation !== queue.generation) return; // superseded by Reset/Scramble mid-animation
    const prev = session;
    session = next;
    $('banner').hidden = true;
    update();
    save();
    if (isNewSolve(prev, session)) celebrate();
  });
}

function restart(next) {
  queue.clear(); // drop pending turns and cancel the running one's commit
  queue.push(() => {
    session = next;
    view.render(session.cube);
    $('banner').hidden = true;
    update();
    save();
  });
}

function celebrate() {
  $('banner-text').textContent = `Solved in ${plural(session.moves, 'move')} · ${formatTime(session.elapsedMs)}`;
  $('banner').hidden = false;
  $('banner-again').focus();
  if (reducedMotion.matches) return;
  confetti();
  view.spin();
}

function closeBanner() {
  $('banner').hidden = true;
  $('random-scramble').focus(); // don't leave focus on a hidden button
}

function randomScrambleNow() {
  const moves = randomScramble();
  $('scramble-input').value = '';
  setScrambleError('');
  restart(scrambleSession(moves));
}

function setScrambleError(message) {
  $('scramble-error').textContent = message;
  $('scramble-input').setAttribute('aria-invalid', String(Boolean(message)));
}

// Controls
$('random-scramble').addEventListener('click', randomScrambleNow);
$('banner-again').addEventListener('click', randomScrambleNow);
$('banner-close').addEventListener('click', closeBanner);
$('reset').addEventListener('click', () => restart(createSession()));

$('scramble-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('scramble-input').value;
  try {
    const moves = parse(text);
    if (!moves.length) throw new Error('Enter a scramble, e.g. R U R\' U\'');
    if (isSolved(applyMoves(SOLVED, moves))) throw new Error('That scramble leaves the cube solved.');
    setScrambleError('');
    restart(scrambleSession(moves));
  } catch (err) {
    setScrambleError(err.message);
  }
});

const buttons = $('move-buttons');
for (const name of MOVE_NAMES) {
  for (const amount of [1, -1]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = amount === 1 ? name : `${name}'`;
    if (amount === -1) button.setAttribute('aria-label', `${name} prime`);
    button.addEventListener('click', () => turn({ name, amount }));
    buttons.append(button);
  }
}

// Keyboard: letter = clockwise, Shift + letter = prime.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('banner').hidden) {
    closeBanner();
    return;
  }
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea')) return;
  const letter = e.key.length === 1 ? e.key.toLowerCase() : '';
  const name = 'xyz'.includes(letter) ? letter : letter.toUpperCase();
  if (!letter || !MOVE_NAMES.includes(name)) return;
  e.preventDefault();
  turn({ name, amount: e.shiftKey ? -1 : 1 });
});

// Fold live timer time into storage whenever the page may go away.
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
setInterval(() => { if (session.runningSince !== null) updateTimer(); }, 50);

update();
