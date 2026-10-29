/**
 * Solve-session state, independent of the DOM so it can be unit tested.
 *
 * Status flow: idle -> scrambled -> solving -> solved. The timer starts on
 * the first turn after a scramble; whole-cube rotations neither count as
 * moves nor start it. Time accumulates in `elapsedMs` while `runningSince`
 * marks the live segment; `runningSince` is never persisted, so the timer
 * pauses while the page is closed and resumes on the next turn.
 *
 * The cube is persisted as the move history since it was last in the solved
 * position (scramble included) and rebuilt on load, so stored data can never
 * describe an unsolvable cube.
 */

import { SOLVED, applyMove, applyMoves, isSolved } from './cube.js';
import { format, parse } from './notation.js';

const ROTATIONS = new Set(['x', 'y', 'z']);
const STATUSES = new Set(['idle', 'scrambled', 'solving', 'solved']);
export const MAX_STORED_MOVES = 20000;

// The 24 solved orientations, each mapped to a shortest x/y/z sequence reaching it.
const SOLVED_ORIENTATIONS = (() => {
  const map = new Map([[SOLVED, []]]);
  const frontier = [SOLVED];
  while (frontier.length) {
    const state = frontier.shift();
    for (const name of ROTATIONS) {
      const move = { name, amount: 1 };
      const next = applyMove(state, move);
      if (!map.has(next)) {
        map.set(next, map.get(state).concat(move));
        frontier.push(next);
      }
    }
  }
  return map;
})();

export function createSession() {
  return {
    cube: SOLVED, history: [], scramble: '', status: 'idle', moves: 0, elapsedMs: 0, runningSince: null,
  };
}

/** Start a new attempt from a solved cube. @param {import('./cube.js').Move[]} moves */
export function scrambleSession(moves) {
  return {
    ...createSession(),
    cube: applyMoves(SOLVED, moves),
    history: moves.slice(),
    scramble: format(moves),
    status: 'scrambled',
  };
}

/** @returns {number} elapsed solve time in ms at `now` */
export function elapsed(session, now) {
  return session.elapsedMs + (session.runningSince === null ? 0 : now - session.runningSince);
}

/** Apply a user turn and return the next session. */
export function recordMove(session, move, now) {
  const cube = applyMove(session.cube, move);
  // History only has to rebuild the cube from SOLVED, so whenever the cube is
  // solved (in any orientation) it collapses to the rotations reaching that orientation.
  const history = SOLVED_ORIENTATIONS.get(cube) ?? session.history.concat(move);
  if (ROTATIONS.has(move.name)) return { ...session, cube, history };

  if (session.status === 'solved') {
    // Turning a just-solved cube starts fresh free play; the finished attempt's stats are done.
    return { ...createSession(), cube, history, moves: 1 };
  }
  if (session.status === 'idle') {
    // Free play: turning an unscrambled cube is not an attempt.
    return { ...session, cube, history, moves: session.moves + 1 };
  }

  const next = {
    ...session,
    cube,
    history,
    status: 'solving',
    moves: session.moves + 1,
    runningSince: session.runningSince ?? now,
  };
  if (isSolved(cube)) {
    return { ...next, status: 'solved', elapsedMs: elapsed(next, now), runningSince: null };
  }
  return next;
}

/** True when `next` completes an attempt that `prev` was still working on (celebrate). */
export function isNewSolve(prev, next) {
  return (prev.status === 'scrambled' || prev.status === 'solving') && next.status === 'solved';
}

/** Plain object for localStorage; folds the live timer segment into elapsedMs. */
export function toStored(session, now) {
  const { scramble, status, moves } = session;
  return { v: 1, history: format(session.history), scramble, status, moves, elapsedMs: elapsed(session, now) };
}

const parseOrNull = (text) => {
  try {
    return parse(text);
  } catch {
    return null;
  }
};

/** Validate untrusted stored data; returns a session or null. */
export function fromStored(data) {
  if (!data || typeof data !== 'object' || data.v !== 1) return null;
  const { scramble, status, moves, elapsedMs } = data;
  if (!STATUSES.has(status)) return null;
  if (!Number.isSafeInteger(moves) || moves < 0) return null;
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  if (typeof scramble !== 'string' || scramble.length > 500 || !parseOrNull(scramble)) return null;
  if (typeof data.history !== 'string' || data.history.length > MAX_STORED_MOVES * 3) return null;
  const history = parseOrNull(data.history);
  if (!history || history.length > MAX_STORED_MOVES) return null;

  const cube = applyMoves(SOLVED, history);
  // Status must agree with the rebuilt cube.
  if ((status === 'solved') !== isSolved(cube) && status !== 'idle') return null;
  return { cube, history, scramble, status, moves, elapsedMs, runningSince: null };
}
