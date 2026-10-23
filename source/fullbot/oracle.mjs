'use strict';

// Standard high-only Texas Hold'em. No opponent cards or future board are inputs
// to equity: only the acting player's cards, public board, and declared range.
const RANKS = '23456789TJQKA';
const SUITS = 'cdhs';
const FULL_DECK = [...RANKS].flatMap(r => [...SUITS].map(s => r + s));

function deck() { return FULL_DECK.slice(); }
function rng(seed = 1) {
  let state = 2166136261;
  for (const c of String(seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(cards, random = Math.random) {
  const result = cards.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function validate(cards, min = 0, max = 52) {
  if (!Array.isArray(cards) || cards.length < min || cards.length > max)
    throw new Error(`Expected ${min}–${max} cards`);
  const seen = new Set();
  for (const card of cards) {
    if (typeof card !== 'string' || !/^[2-9TJQKA][cdhs]$/.test(card))
      throw new Error(`Invalid card: ${card}`);
    if (seen.has(card)) throw new Error(`Duplicate card: ${card}`);
    seen.add(card);
  }
}
function classify(hole) {
  validate(hole, 2, 2);
  const a = RANKS.indexOf(hole[0][0]);
  const b = RANKS.indexOf(hole[1][0]);
  return RANKS[Math.max(a,b)] + RANKS[Math.min(a,b)] +
    (a === b ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
}
function all169() {
  const result = [];
  for (let a = 12; a >= 0; a--) for (let b = a; b >= 0; b--) {
    if (a === b) result.push(RANKS[a] + RANKS[b]);
    else result.push(RANKS[a] + RANKS[b] + 's', RANKS[a] + RANKS[b] + 'o');
  }
  return result;
}
// Base-15 lexicographic score. Category dominates five ordered kickers.
function score(category, values) {
  let result = category;
  for (let i = 0; i < 5; i++) result = result * 15 + (values[i] || 0);
  return result;
}
function straightHigh(mask) {
  // Rank 2 occupies bit 2, ace bit 14. Also expose ace at bit 1 for wheel.
  if (mask & (1 << 14)) mask |= 2;
  for (let high = 14; high >= 5; high--) {
    const need = 31 << (high - 4);
    if ((mask & need) === need) return high;
  }
  return 0;
}
function rankUnchecked(cards) {
  const counts = new Uint8Array(15);
  const suitCounts = new Uint8Array(4);
  const suitMasks = new Uint16Array(4);
  let mask = 0;
  for (const card of cards) {
    const r = RANKS.indexOf(card[0]) + 2;
    const s = SUITS.indexOf(card[1]);
    counts[r]++;
    suitCounts[s]++;
    suitMasks[s] |= 1 << r;
    mask |= 1 << r;
  }
  let flush = -1;
  for (let s = 0; s < 4; s++) if (suitCounts[s] >= 5) flush = s;
  if (flush >= 0) {
    const high = straightHigh(suitMasks[flush]);
    if (high) return score(8, [high]);
  }
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 14; r >= 2; r--) {
    if (counts[r] === 4) quads.push(r);
    if (counts[r] >= 3) trips.push(r);
    if (counts[r] >= 2) pairs.push(r);
    if (counts[r]) singles.push(r);
  }
  if (quads.length) return score(7, [quads[0], singles.find(r => r !== quads[0])]);
  if (trips.length) {
    const pair = pairs.find(r => r !== trips[0]);
    if (pair) return score(6, [trips[0], pair]);
  }
  if (flush >= 0) {
    const values = [];
    for (let r = 14; r >= 2; r--) if (suitMasks[flush] & (1 << r)) values.push(r);
    return score(5, values);
  }
  const straight = straightHigh(mask);
  if (straight) return score(4, [straight]);
  if (trips.length) return score(3, [trips[0], ...singles.filter(r => r !== trips[0]).slice(0, 2)]);
  if (pairs.length >= 2) return score(2, [pairs[0], pairs[1], singles.find(r => r !== pairs[0] && r !== pairs[1])]);
  if (pairs.length) return score(1, [pairs[0], ...singles.filter(r => r !== pairs[0]).slice(0, 3)]);
  return score(0, singles);
}
function rank(cards) { validate(cards, 5, 7); return rankUnchecked(cards); }
function compare(holeA, holeB, board) {
  validate(holeA, 2, 2); validate(holeB, 2, 2); validate(board, 5, 5);
  validate([...holeA, ...holeB, ...board]);
  return Math.sign(rankUnchecked([...holeA, ...board]) - rankUnchecked([...holeB, ...board]));
}
function rangeWeight(range, hole) {
  if (typeof range === 'function') return range(hole) ? 1 : 0;
  const c = classify(hole);
  if (Array.isArray(range)) return range.includes(c) ? 1 : 0;
  if (range instanceof Set) return range.has(c) ? 1 : 0;
  const weight = range[c] === undefined ? 0 : range[c];
  if (!Number.isFinite(weight) || weight < 0) throw new Error('Range weights must be finite and nonnegative');
  return weight;
}
function equity(hole, board = [], {samples = 256, seed = 1, range = null} = {}) {
  validate(hole, 2, 2); validate(board, 0, 5);
  if (![0,3,4,5].includes(board.length)) throw new Error('Board must contain 0, 3, 4 or 5 cards');
  validate([...hole, ...board]);
  if (!Number.isSafeInteger(samples) || samples <= 0) throw new Error('samples must be a positive safe integer');
  const known = new Set([...hole, ...board]);
  const unseen = FULL_DECK.filter(c => !known.has(c));
  const random = rng(seed);
  let combos = null, cumulative = null, total = 0;
  if (range !== null) {
    if (typeof range !== 'function' && typeof range !== 'object') throw new Error('Unsupported range');
    combos = []; cumulative = [];
    for (let a = 0; a < unseen.length; a++) for (let b = a + 1; b < unseen.length; b++) {
      const opp = [unseen[a], unseen[b]];
      const weight = rangeWeight(range, opp);
      if (weight > 0) { combos.push(opp); total += weight; cumulative.push(total); }
    }
    if (!total || !Number.isFinite(total)) throw new Error('Range has no available weighted combinations');
  }
  let wins = 0;
  for (let n = 0; n < samples; n++) {
    let opp, pool;
    if (combos) {
      const target = random() * total;
      let low = 0, high = cumulative.length - 1;
      while (low < high) { const middle = (low + high) >>> 1; if (target < cumulative[middle]) high = middle; else low = middle + 1; }
      opp = combos[low];
      pool = unseen.filter(c => c !== opp[0] && c !== opp[1]);
    } else {
      pool = unseen.slice();
      // Partial Fisher-Yates samples without replacement, avoiding full shuffles.
      for (let i = 0; i < 2; i++) {
        const j = i + Math.floor(random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      opp = pool.splice(0, 2);
    }
    const runout = board.slice();
    for (let i = 0; runout.length < 5; i++) {
      const j = i + Math.floor(random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      runout.push(pool[i]);
    }
    const a = rankUnchecked([...hole, ...runout]);
    const b = rankUnchecked([...opp, ...runout]);
    wins += a > b ? 1 : a === b ? 0.5 : 0;
  }
  return wins / samples;
}
export {deck, rng, shuffle, classify, all169, rank, compare, equity, validate};
