// node_modules/@jev-poker/engine/dist/blinds.js
function fixedBlinds(small, big, ante = 0) {
  if (!Number.isInteger(big) || big <= 0)
    throw new Error("big blind must be a positive integer");
  if (!Number.isInteger(small) || small <= 0 || small > big) {
    throw new Error("small blind must be a positive integer no larger than the big blind");
  }
  if (!Number.isInteger(ante) || ante < 0)
    throw new Error("ante must be a non-negative integer");
  const blinds = { small, big, ante };
  return { blindsFor: () => blinds };
}

// node_modules/@jev-poker/engine/dist/cards.js
var SUITS = ["c", "d", "h", "s"];
var RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
var RANK_CHARS = "23456789TJQKA";
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS)
      deck.push({ rank, suit });
  }
  return deck;
}
function formatCard(card) {
  return `${RANK_CHARS.charAt(card.rank - 2)}${card.suit}`;
}

// node_modules/@jev-poker/engine/dist/evaluator.js
var HAND_CATEGORIES = [
  "high_card",
  "pair",
  "two_pair",
  "three_of_a_kind",
  "straight",
  "flush",
  "full_house",
  "four_of_a_kind",
  "straight_flush"
];
function evaluate5(cards) {
  if (cards.length !== 5)
    throw new Error(`evaluate5 needs 5 cards, got ${cards.length}`);
  const counts = /* @__PURE__ */ new Map();
  for (const card of cards)
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const distinct = groups.map(([rank]) => rank).sort((a, b) => b - a);
  const firstSuit = cards[0]?.suit;
  const isFlush = cards.every((card) => card.suit === firstSuit);
  const straightHigh2 = straightHighCard(distinct);
  const [g0, g1] = groups;
  const count0 = g0?.[1] ?? 0;
  const count1 = g1?.[1] ?? 0;
  let category;
  let ranks;
  if (straightHigh2 !== null && isFlush) {
    category = "straight_flush";
    ranks = [straightHigh2];
  } else if (count0 === 4) {
    category = "four_of_a_kind";
    ranks = groups.map(([rank]) => rank);
  } else if (count0 === 3 && count1 === 2) {
    category = "full_house";
    ranks = groups.map(([rank]) => rank);
  } else if (isFlush) {
    category = "flush";
    ranks = distinct;
  } else if (straightHigh2 !== null) {
    category = "straight";
    ranks = [straightHigh2];
  } else if (count0 === 3) {
    category = "three_of_a_kind";
    ranks = groups.map(([rank]) => rank);
  } else if (count0 === 2 && count1 === 2) {
    category = "two_pair";
    ranks = groups.map(([rank]) => rank);
  } else if (count0 === 2) {
    category = "pair";
    ranks = groups.map(([rank]) => rank);
  } else {
    category = "high_card";
    ranks = distinct;
  }
  return { category, ranks, score: encode(category, ranks) };
}
function evaluateBest(cards) {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateBest needs between 5 and 7 cards, got ${cards.length}`);
  }
  if (cards.length === 5)
    return evaluate5(cards);
  let best = null;
  for (const combo of combinations(cards.length, 5)) {
    const value = evaluate5(combo.map((index) => cards[index]));
    if (best === null || value.score > best.score)
      best = value;
  }
  return best;
}
function straightHighCard(distinct) {
  if (distinct.length !== 5)
    return null;
  const top = distinct[0];
  const bottom = distinct[4];
  if (top - bottom === 4)
    return top;
  if (top === 14 && distinct[1] === 5 && bottom === 2)
    return 5;
  return null;
}
function encode(category, ranks) {
  let score2 = HAND_CATEGORIES.indexOf(category);
  for (let i = 0; i < 5; i++)
    score2 = score2 * 15 + (ranks[i] ?? 0);
  return score2;
}
function* combinations(n, k) {
  const indices = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield [...indices];
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i)
      i--;
    if (i < 0)
      return;
    indices[i] = indices[i] + 1;
    for (let j = i + 1; j < k; j++)
      indices[j] = indices[j - 1] + 1;
  }
}

// node_modules/@jev-poker/engine/dist/rng.js
function createRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  };
}
function randomSeed() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi !== void 0 && typeof cryptoApi.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] ?? 0;
  }
  return Math.floor(Math.random() * 4294967296);
}
function shuffle(items, rng2) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng2.next() * (i + 1));
    const a = result[i];
    result[i] = result[j];
    result[j] = a;
  }
  return result;
}

// node_modules/@jev-poker/engine/dist/pots.js
function buildPots(contributions, eligible) {
  const levels = [
    ...new Set([...contributions].filter(([seat, amount]) => eligible.has(seat) && amount > 0).map(([, amount]) => amount))
  ].sort((a, b) => a - b);
  const pots = [];
  let previous = 0;
  for (const level of levels) {
    let amount = 0;
    for (const [, contributed] of contributions) {
      amount += Math.max(0, Math.min(contributed, level) - previous);
    }
    const eligibleSeats = [...eligible].filter((seat) => (contributions.get(seat) ?? 0) >= level).sort((a, b) => a - b);
    pots.push({ amount, eligible: eligibleSeats });
    previous = level;
  }
  let leftover = 0;
  for (const [, contributed] of contributions)
    leftover += Math.max(0, contributed - previous);
  if (leftover > 0) {
    const last = pots[pots.length - 1];
    if (last !== void 0) {
      pots[pots.length - 1] = { amount: last.amount + leftover, eligible: last.eligible };
    } else {
      const eligibleSeats = [...eligible].sort((a, b) => a - b);
      pots.push({ amount: leftover, eligible: eligibleSeats });
    }
  }
  return pots;
}
function awardPots(pots, scoreOf, oddChipOrder) {
  const awards = [];
  for (const [potIndex, pot] of pots.entries()) {
    if (pot.amount <= 0 || pot.eligible.length === 0)
      continue;
    let winners;
    if (pot.eligible.length === 1) {
      winners = [...pot.eligible];
    } else {
      let best = Number.NEGATIVE_INFINITY;
      winners = [];
      for (const seat of pot.eligible) {
        const score2 = scoreOf(seat).score;
        if (score2 > best) {
          best = score2;
          winners = [seat];
        } else if (score2 === best) {
          winners.push(seat);
        }
      }
    }
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    const ordered = oddChipOrder.filter((seat) => winners.includes(seat));
    for (const seat of winners)
      if (!ordered.includes(seat))
        ordered.push(seat);
    for (const seat of ordered) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      awards.push({ seat, amount: share + extra, potIndex });
    }
  }
  return awards;
}

// node_modules/@jev-poker/engine/dist/types.js
var NO_ACTIONS = {
  canFold: false,
  canCheck: false,
  callAmount: null,
  minRaiseTo: null,
  maxRaiseTo: null
};

// node_modules/@jev-poker/engine/dist/hand.js
var NEXT_STREET = {
  preflop: "flop",
  flop: "turn",
  turn: "river",
  river: "showdown",
  showdown: "showdown"
};
var Hand = class _Hand {
  handNumber;
  button;
  bigBlind;
  events = [];
  players;
  deck;
  board = [];
  currentStreet = "preflop";
  currentBet = 0;
  minRaise;
  toAct = [];
  acting = null;
  complete = false;
  /** Seats that may only call or fold this street because a short (incomplete) all-in
   *  raise came after their turn; a full raise clears this. */
  cannotRaise = /* @__PURE__ */ new Set();
  constructor(options) {
    if (options.seats.length < 2)
      throw new Error("a hand needs at least 2 players");
    if (options.deck.length !== 52)
      throw new Error("deck must have exactly 52 cards");
    if (!options.seats.some((s) => s.seat === options.button)) {
      throw new Error(`button seat ${options.button} is not in the hand`);
    }
    if (new Set(options.seats.map((s) => s.seat)).size !== options.seats.length) {
      throw new Error("seat ids must be unique");
    }
    for (const s of options.seats) {
      if (!Number.isInteger(s.stack) || s.stack <= 0)
        throw new Error(`seat ${s.seat} has no chips`);
    }
    this.handNumber = options.handNumber;
    this.button = options.button;
    this.bigBlind = options.blinds.big;
    this.minRaise = options.blinds.big;
    this.deck = [...options.deck];
    this.players = options.seats.map((s) => ({
      seat: s.seat,
      stack: s.stack,
      holeCards: [this.draw(), this.draw()],
      contributed: 0,
      streetBet: 0,
      folded: false,
      allIn: false
    }));
    const bigBlindSeat = this.postBlinds(options.blinds);
    this.events.push({
      type: "HoleCardsDealt",
      hands: this.players.map((p) => ({ seat: p.seat, cards: p.holeCards }))
    });
    this.currentBet = options.blinds.big;
    this.toAct = this.rotateAfter(bigBlindSeat).filter((seat) => this.isLive(seat));
    const liveCount = this.players.filter((p) => this.isLive(p.seat)).length;
    if (liveCount < 2) {
      this.runOut();
    } else {
      this.advance();
    }
  }
  get isComplete() {
    return this.complete;
  }
  get actingSeat() {
    return this.acting;
  }
  get street() {
    return this.currentStreet;
  }
  /**
   * A deep copy of this hand, made without replaying it: acting on the copy never touches
   * this one. Cards are immutable values, so they are shared; everything mutable is copied.
   */
  clone() {
    const fields = {
      handNumber: this.handNumber,
      button: this.button,
      bigBlind: this.bigBlind,
      events: [...this.events],
      players: this.players.map((p) => ({ ...p })),
      deck: [...this.deck],
      board: [...this.board],
      currentStreet: this.currentStreet,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      toAct: [...this.toAct],
      acting: this.acting,
      complete: this.complete,
      cannotRaise: new Set(this.cannotRaise)
    };
    return Object.assign(Object.create(_Hand.prototype), fields);
  }
  legalActions(seat) {
    if (this.complete || seat !== this.acting)
      return NO_ACTIONS;
    const player = this.player(seat);
    const toCall = Math.max(0, this.currentBet - player.streetBet);
    const canCheck = toCall === 0;
    const maxRaiseTo = player.streetBet + player.stack;
    let minRaiseTo = this.currentBet === 0 ? this.bigBlind : this.currentBet + this.minRaise;
    if (this.cannotRaise.has(seat)) {
      minRaiseTo = null;
    } else if (player.stack <= toCall) {
      minRaiseTo = null;
    } else if (maxRaiseTo < minRaiseTo) {
      minRaiseTo = maxRaiseTo;
    }
    return {
      canFold: !canCheck,
      canCheck,
      callAmount: canCheck ? null : Math.min(toCall, player.stack),
      minRaiseTo,
      maxRaiseTo: minRaiseTo === null ? null : maxRaiseTo
    };
  }
  act(seat, action) {
    if (this.complete)
      throw new Error("hand is complete");
    if (seat !== this.acting)
      throw new Error(`seat ${seat} is not acting`);
    const legal = this.legalActions(seat);
    const player = this.player(seat);
    const before = this.events.length;
    let committed = 0;
    let normalized = action;
    switch (action.type) {
      case "fold":
        if (!legal.canFold)
          throw new Error("cannot fold when checking is free");
        player.folded = true;
        break;
      case "check":
        if (!legal.canCheck)
          throw new Error("cannot check when facing a bet");
        break;
      case "call":
        if (legal.callAmount === null)
          throw new Error("nothing to call");
        committed = this.commit(player, legal.callAmount, true);
        break;
      case "bet":
      case "raise":
      case "allin": {
        if (action.type === "bet" && this.currentBet > 0)
          throw new Error("use raise when facing a bet");
        if (action.type === "raise" && this.currentBet === 0) {
          throw new Error("use bet when nobody has bet");
        }
        const target = action.type === "allin" ? player.streetBet + player.stack : action.amount;
        if (target <= this.currentBet) {
          if (action.type !== "allin")
            throw new Error(`illegal bet size ${target}`);
          committed = this.commit(player, player.stack, true);
          normalized = { type: "call" };
          break;
        }
        if (legal.minRaiseTo === null || legal.maxRaiseTo === null) {
          throw new Error("raising is not allowed");
        }
        const isAllIn = target === legal.maxRaiseTo;
        if (!Number.isInteger(target) || target > legal.maxRaiseTo || target < legal.minRaiseTo && !isAllIn) {
          throw new Error(`illegal bet size ${target}`);
        }
        const kind = this.currentBet === 0 ? "bet" : "raise";
        committed = this.commit(player, target - player.streetBet, true);
        const increment = target - this.currentBet;
        if (increment >= this.minRaise) {
          this.minRaise = increment;
          this.cannotRaise.clear();
        } else {
          for (const other of this.players) {
            if (other.seat !== seat && this.isLive(other.seat) && !this.toAct.includes(other.seat)) {
              this.cannotRaise.add(other.seat);
            }
          }
        }
        this.currentBet = target;
        this.toAct = this.rotateAfter(seat).filter((s) => s !== seat && this.isLive(s));
        normalized = { type: kind, amount: target };
        break;
      }
    }
    this.toAct = this.toAct.filter((s) => s !== seat);
    this.events.push({
      type: "ActionTaken",
      street: this.currentStreet,
      seat,
      action: normalized,
      amount: committed,
      allIn: player.allIn
    });
    this.advance();
    return this.events.slice(before);
  }
  snapshot() {
    return {
      handNumber: this.handNumber,
      button: this.button,
      street: this.currentStreet,
      board: [...this.board],
      players: this.players.map((p) => ({
        seat: p.seat,
        stack: p.stack,
        holeCards: p.holeCards,
        contributed: p.contributed,
        streetBet: p.streetBet,
        folded: p.folded,
        allIn: p.allIn
      })),
      actingSeat: this.acting,
      toAct: [...this.toAct],
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      bigBlind: this.bigBlind,
      pot: this.players.reduce((sum, p) => sum + p.contributed, 0),
      complete: this.complete
    };
  }
  stacks() {
    return this.players.map((p) => ({ id: p.seat, stack: p.stack }));
  }
  draw() {
    const card = this.deck.shift();
    if (card === void 0)
      throw new Error("deck is empty");
    return card;
  }
  player(seat) {
    const player = this.players.find((p) => p.seat === seat);
    if (player === void 0)
      throw new Error(`seat ${seat} is not in this hand`);
    return player;
  }
  isLive(seat) {
    const player = this.player(seat);
    return !player.folded && !player.allIn;
  }
  /** Seats clockwise starting after `seat`, ending with `seat` itself. */
  rotateAfter(seat) {
    const seats = this.players.map((p) => p.seat);
    const index = seats.indexOf(seat);
    if (index < 0)
      throw new Error(`seat ${seat} is not in this hand`);
    return [...seats.slice(index + 1), ...seats.slice(0, index + 1)];
  }
  /** Moves up to `chips` from the player's stack into the pot; returns the amount moved. */
  commit(player, chips, countsForStreet) {
    const amount = Math.min(chips, player.stack);
    player.stack -= amount;
    player.contributed += amount;
    if (countsForStreet)
      player.streetBet += amount;
    if (player.stack === 0)
      player.allIn = true;
    return amount;
  }
  /** Posts antes and blinds; returns the big blind seat. */
  postBlinds(blinds) {
    const posts = [];
    if (blinds.ante > 0) {
      for (const player of this.players) {
        posts.push({
          seat: player.seat,
          kind: "ante",
          amount: this.commit(player, blinds.ante, false)
        });
      }
    }
    const after = this.rotateAfter(this.button);
    const small = this.players.length === 2 ? this.button : after[0];
    const big = this.players.length === 2 ? after[0] : after[1];
    posts.push({
      seat: small,
      kind: "small",
      amount: this.commit(this.player(small), blinds.small, true)
    });
    posts.push({ seat: big, kind: "big", amount: this.commit(this.player(big), blinds.big, true) });
    this.events.push({ type: "BlindsPosted", posts });
    return big;
  }
  advance() {
    const unfolded = this.players.filter((p) => !p.folded);
    if (unfolded.length === 1) {
      this.payout(/* @__PURE__ */ new Map());
      return;
    }
    if (this.toAct.length > 0) {
      this.acting = this.toAct[0] ?? null;
      return;
    }
    if (this.currentStreet === "river") {
      this.showdown();
      return;
    }
    this.dealNextStreet();
    const liveCount = this.players.filter((p) => this.isLive(p.seat)).length;
    if (liveCount < 2) {
      this.runOut();
      return;
    }
    this.acting = this.toAct[0] ?? null;
  }
  /** Deals every remaining street with no further betting, then goes to showdown. */
  runOut() {
    while (this.currentStreet !== "river")
      this.dealNextStreet();
    this.showdown();
  }
  dealNextStreet() {
    this.currentStreet = NEXT_STREET[this.currentStreet];
    for (const player of this.players)
      player.streetBet = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.cannotRaise.clear();
    const count = this.currentStreet === "flop" ? 3 : 1;
    for (let i = 0; i < count; i++)
      this.board.push(this.draw());
    this.toAct = this.rotateAfter(this.button).filter((seat) => this.isLive(seat));
    this.events.push({ type: "StreetDealt", street: this.currentStreet, board: [...this.board] });
  }
  showdown() {
    this.currentStreet = "showdown";
    const unfolded = this.players.filter((p) => !p.folded);
    const values = /* @__PURE__ */ new Map();
    for (const player of unfolded) {
      values.set(player.seat, evaluateBest([...player.holeCards, ...this.board]));
    }
    this.events.push({
      type: "Showdown",
      hands: unfolded.map((p) => ({
        seat: p.seat,
        cards: p.holeCards,
        value: values.get(p.seat)
      }))
    });
    this.payout(values);
  }
  payout(values) {
    const contributions = new Map(this.players.map((p) => [p.seat, p.contributed]));
    const eligible = new Set(this.players.filter((p) => !p.folded).map((p) => p.seat));
    const pots = buildPots(contributions, eligible);
    const awards = awardPots(pots, (seat) => {
      const value = values.get(seat);
      if (value === void 0)
        throw new Error(`no showdown value for seat ${seat}`);
      return value;
    }, this.rotateAfter(this.button));
    for (const award of awards)
      this.player(award.seat).stack += award.amount;
    this.events.push({ type: "PotAwarded", pots, awards });
    this.complete = true;
    this.acting = null;
    this.toAct = [];
  }
};

// node_modules/@jev-poker/engine/dist/table.js
var Table = class {
  config;
  seats;
  /** Number of completed hands; also the next hand's number. */
  handNumber = 0;
  button;
  hand = null;
  rng;
  listeners = /* @__PURE__ */ new Set();
  now;
  startedAt;
  constructor(config, options = {}) {
    if (config.seats.length < 2 || config.seats.length > 6) {
      throw new Error("a table needs 2 to 6 seats");
    }
    if (new Set(config.seats.map((s) => s.id)).size !== config.seats.length) {
      throw new Error("seat ids must be unique");
    }
    if (!Number.isInteger(config.startingStack) || config.startingStack <= 0) {
      throw new Error("starting stack must be a positive integer");
    }
    this.config = config;
    this.seats = [...config.seats].sort((a, b) => a.id - b.id).map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      personaId: s.personaId,
      stack: config.startingStack
    }));
    this.rng = createRng(config.seed ?? randomSeed());
    this.now = options.now ?? (() => Date.now());
    this.startedAt = this.now();
    const first = this.seats[Math.floor(this.rng.next() * this.seats.length)];
    this.button = first.id;
  }
  on(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  get currentHand() {
    return this.hand;
  }
  snapshot() {
    return this.hand?.snapshot() ?? null;
  }
  legalActions(seat) {
    return this.hand?.legalActions(seat) ?? NO_ACTIONS;
  }
  startHand() {
    if (this.hand !== null && !this.hand.isComplete)
      throw new Error("a hand is already in progress");
    const playing = this.seats.filter((s) => s.stack > 0);
    if (playing.length < 2)
      throw new Error("game over: fewer than 2 seats have chips");
    if (this.handNumber > 0)
      this.button = this.nextButton(playing);
    const blinds = this.config.blinds.blindsFor(this.handNumber, this.now() - this.startedAt);
    const hand = new Hand({
      handNumber: this.handNumber,
      button: this.button,
      seats: playing.map((s) => ({ seat: s.id, stack: s.stack })),
      blinds,
      deck: shuffle(createDeck(), this.rng)
    });
    this.hand = hand;
    this.emit({
      type: "HandStarted",
      handNumber: this.handNumber,
      button: this.button,
      blinds,
      seats: playing.map((s) => ({ id: s.id, stack: s.stack }))
    });
    for (const event of hand.events)
      this.emit(event);
    if (hand.isComplete)
      this.finishHand(hand);
    return hand.snapshot();
  }
  act(seat, action) {
    const hand = this.hand;
    if (hand === null || hand.isComplete)
      throw new Error("no hand in progress");
    const events = hand.act(seat, action);
    for (const event of events)
      this.emit(event);
    if (hand.isComplete)
      this.finishHand(hand);
    return events;
  }
  nextButton(playing) {
    const ids = playing.map((s) => s.id);
    return ids.find((id) => id > this.button) ?? ids[0];
  }
  finishHand(hand) {
    for (const { id, stack } of hand.stacks()) {
      const seat = this.seats.find((s) => s.id === id);
      if (seat !== void 0)
        seat.stack = stack;
    }
    if (this.config.format === "cash") {
      for (const seat of this.seats) {
        if (seat.stack === 0) {
          seat.stack = this.config.startingStack;
          this.emit({ type: "SeatRebought", seat: seat.id, amount: seat.stack });
        }
      }
    }
    this.emit({
      type: "HandEnded",
      handNumber: this.handNumber,
      stacks: this.seats.map((s) => ({ id: s.id, stack: s.stack }))
    });
    this.handNumber++;
  }
  emit(event) {
    for (const listener of this.listeners)
      listener(event);
  }
};

// node_modules/@jev-poker/engine/dist/view.js
function positionOf(seat, snapshot) {
  const seats = snapshot.players.map((p) => p.seat);
  const n = seats.length;
  const buttonIndex = seats.indexOf(snapshot.button);
  if (buttonIndex < 0)
    throw new Error("button is not seated");
  const order = seats.map((_, i) => seats[(buttonIndex + 1 + i) % n]);
  const index = order.indexOf(seat);
  if (index < 0)
    throw new Error(`seat ${seat} is not in the hand`);
  if (n === 2)
    return seat === snapshot.button ? "BTN" : "BB";
  if (index === 0)
    return "SB";
  if (index === 1)
    return "BB";
  if (index === n - 1)
    return "BTN";
  if (index === n - 2)
    return "CO";
  if (index === 2)
    return "UTG";
  return "MP";
}
function historyEntry(event) {
  const { action } = event;
  const shoved = event.allIn && (action.type === "bet" || action.type === "raise");
  return { street: event.street, seat: event.seat, action: shoved ? { type: "allin" } : action };
}
function playerView(snapshot, seat, actions) {
  const me = snapshot.players.find((p) => p.seat === seat);
  if (me === void 0)
    throw new Error(`seat ${seat} is not in the hand`);
  return {
    seat,
    street: snapshot.street,
    holeCards: me.holeCards,
    board: snapshot.board,
    stacks: snapshot.players.map((p) => ({
      seat: p.seat,
      stack: p.stack,
      isAllIn: p.allIn,
      folded: p.folded
    })),
    pot: snapshot.pot,
    toCall: Math.min(Math.max(0, snapshot.currentBet - me.streetBet), me.stack),
    currentBet: snapshot.currentBet,
    committedThisStreet: me.streetBet,
    bigBlind: snapshot.bigBlind,
    position: positionOf(seat, snapshot),
    history: actions.map(historyEntry)
  };
}

// oracle.mjs
var RANKS2 = "23456789TJQKA";
var SUITS2 = "cdhs";
var FULL_DECK = [...RANKS2].flatMap((r) => [...SUITS2].map((s) => r + s));
function rng(seed = 1) {
  let state = 2166136261;
  for (const c of String(seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function validate(cards, min = 0, max = 52) {
  if (!Array.isArray(cards) || cards.length < min || cards.length > max)
    throw new Error(`Expected ${min}\u2013${max} cards`);
  const seen = /* @__PURE__ */ new Set();
  for (const card of cards) {
    if (typeof card !== "string" || !/^[2-9TJQKA][cdhs]$/.test(card))
      throw new Error(`Invalid card: ${card}`);
    if (seen.has(card)) throw new Error(`Duplicate card: ${card}`);
    seen.add(card);
  }
}
function classify(hole) {
  validate(hole, 2, 2);
  const a = RANKS2.indexOf(hole[0][0]);
  const b = RANKS2.indexOf(hole[1][0]);
  return RANKS2[Math.max(a, b)] + RANKS2[Math.min(a, b)] + (a === b ? "" : hole[0][1] === hole[1][1] ? "s" : "o");
}
function score(category, values) {
  let result = category;
  for (let i = 0; i < 5; i++) result = result * 15 + (values[i] || 0);
  return result;
}
function straightHigh(mask) {
  if (mask & 1 << 14) mask |= 2;
  for (let high = 14; high >= 5; high--) {
    const need = 31 << high - 4;
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
    const r = RANKS2.indexOf(card[0]) + 2;
    const s = SUITS2.indexOf(card[1]);
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
  if (quads.length) return score(7, [quads[0], singles.find((r) => r !== quads[0])]);
  if (trips.length) {
    const pair = pairs.find((r) => r !== trips[0]);
    if (pair) return score(6, [trips[0], pair]);
  }
  if (flush >= 0) {
    const values = [];
    for (let r = 14; r >= 2; r--) if (suitMasks[flush] & 1 << r) values.push(r);
    return score(5, values);
  }
  const straight = straightHigh(mask);
  if (straight) return score(4, [straight]);
  if (trips.length) return score(3, [trips[0], ...singles.filter((r) => r !== trips[0]).slice(0, 2)]);
  if (pairs.length >= 2) return score(2, [pairs[0], pairs[1], singles.find((r) => r !== pairs[0] && r !== pairs[1])]);
  if (pairs.length) return score(1, [pairs[0], ...singles.filter((r) => r !== pairs[0]).slice(0, 3)]);
  return score(0, singles);
}
function rangeWeight(range, hole) {
  if (typeof range === "function") return range(hole) ? 1 : 0;
  const c = classify(hole);
  if (Array.isArray(range)) return range.includes(c) ? 1 : 0;
  if (range instanceof Set) return range.has(c) ? 1 : 0;
  const weight = range[c] === void 0 ? 0 : range[c];
  if (!Number.isFinite(weight) || weight < 0) throw new Error("Range weights must be finite and nonnegative");
  return weight;
}
function equity(hole, board = [], { samples = 256, seed = 1, range = null } = {}) {
  validate(hole, 2, 2);
  validate(board, 0, 5);
  if (![0, 3, 4, 5].includes(board.length)) throw new Error("Board must contain 0, 3, 4 or 5 cards");
  validate([...hole, ...board]);
  if (!Number.isSafeInteger(samples) || samples <= 0) throw new Error("samples must be a positive safe integer");
  const known = /* @__PURE__ */ new Set([...hole, ...board]);
  const unseen = FULL_DECK.filter((c) => !known.has(c));
  const random = rng(seed);
  let combos = null, cumulative = null, total = 0;
  if (range !== null) {
    if (typeof range !== "function" && typeof range !== "object") throw new Error("Unsupported range");
    combos = [];
    cumulative = [];
    for (let a = 0; a < unseen.length; a++) for (let b = a + 1; b < unseen.length; b++) {
      const opp = [unseen[a], unseen[b]];
      const weight = rangeWeight(range, opp);
      if (weight > 0) {
        combos.push(opp);
        total += weight;
        cumulative.push(total);
      }
    }
    if (!total || !Number.isFinite(total)) throw new Error("Range has no available weighted combinations");
  }
  let wins = 0;
  for (let n = 0; n < samples; n++) {
    let opp, pool;
    if (combos) {
      const target = random() * total;
      let low = 0, high = cumulative.length - 1;
      while (low < high) {
        const middle = low + high >>> 1;
        if (target < cumulative[middle]) high = middle;
        else low = middle + 1;
      }
      opp = combos[low];
      pool = unseen.filter((c) => c !== opp[0] && c !== opp[1]);
    } else {
      pool = unseen.slice();
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

// strategy.mjs
function decide(view, { mode = "expert", samples = 180, seed = 1, tuning = {} } = {}) {
  if (!view || !view.legal) throw Error("Missing legal player view");
  const { aggressionThreshold = 0.67, callMargin = 0.02, potFraction = 0.65 } = tuning;
  if (![aggressionThreshold, callMargin, potFraction].every(Number.isFinite) || aggressionThreshold < 0 || aggressionThreshold > 1 || callMargin < 0 || callMargin > 0.2 || potFraction < 0.1 || potFraction > 2) throw Error("Invalid strategy tuning");
  const l = view.legal;
  const aggressive = (amount) => ({ type: view.currentBet > 0 ? "raise" : "bet", amount });
  const passive = l.canCheck ? { type: "check" } : l.callAmount !== null ? { type: "call" } : { type: "fold" };
  if (mode === "novice") {
    const candidates = [passive];
    if (l.canFold && !l.canCheck) candidates.push({ type: "fold" });
    if (l.minRaiseTo !== null) candidates.push(aggressive(l.minRaiseTo));
    return { action: candidates[Math.floor(rng(seed)() * candidates.length)], mode, reason: "Seeded random legal baseline" };
  }
  if (mode !== "expert") throw Error("Unknown bot mode");
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 1e4) throw Error("Invalid sample count");
  const e = equity(view.holeCards, view.board, { samples, seed }), cost = l.callAmount || 0, potOdds = cost / (view.pot + cost || 1);
  let action = passive;
  if (!l.canCheck && e + callMargin < potOdds) action = { type: "fold" };
  else if (e > aggressionThreshold && l.minRaiseTo !== null) {
    const amount = Math.min(l.maxRaiseTo, Math.max(l.minRaiseTo, view.committedThisStreet + cost + Math.ceil((view.pot + cost) * potFraction)));
    action = aggressive(amount);
  }
  return { action, mode, equity: e, potOdds, samples, tuning: { aggressionThreshold, callMargin, potFraction }, reason: "Public-card Monte Carlo equity and pot odds; no GTO claim" };
}

// engine.mjs
function createGame({ seed = 42, stacks = [200, 200], smallBlind = 1, bigBlind = 2 } = {}) {
  if (!Number.isInteger(seed) || !Array.isArray(stacks) || stacks.length !== 2 || stacks.some((x) => !Number.isSafeInteger(x) || x <= 0) || !Number.isSafeInteger(smallBlind) || !Number.isSafeInteger(bigBlind) || smallBlind < 1 || bigBlind <= smallBlind) throw Error("Invalid game configuration");
  const table = new Table({ format: "tournament", blinds: fixedBlinds(smallBlind, bigBlind), startingStack: 200, seats: [{ id: 0, name: "Player", kind: "human" }, { id: 1, name: "RiverRoo", kind: "cpu" }], seed });
  table.seats.forEach((s, i) => s.stack = stacks[i]);
  let actions = [], events = [], showdown = [], awards = [];
  table.on((e) => {
    events.push(e);
    if (e.type === "ActionTaken") actions.push(e);
    if (e.type === "PotAwarded") awards = e.awards.map((x) => ({ ...x }));
    if (e.type === "Showdown") showdown = e.hands.map((h) => ({ seat: h.seat, cards: h.cards.map(formatCard) }));
  });
  const validateSeat = (seat) => {
    if (seat !== 0 && seat !== 1) throw Error("Invalid seat");
  };
  function playerView2(seat = 0) {
    validateSeat(seat);
    const s = table.snapshot();
    if (!s) return null;
    const v = playerView(s, seat, actions);
    return { ...v, holeCards: v.holeCards.map(formatCard), board: v.board.map(formatCard), legal: table.legalActions(seat) };
  }
  function state(seat = 0) {
    validateSeat(seat);
    const s = table.snapshot();
    if (!s) return { handNumber: table.handNumber, complete: true, street: null, board: [], players: table.seats.map((p) => ({ seat: p.id, stack: p.stack, holeCards: [] })), actingSeat: null, pot: 0, legal: null, history: [], showdown: [] };
    return { handNumber: s.handNumber, button: s.button, street: s.street, board: s.board.map(formatCard), players: s.players.map((p) => ({ ...p, holeCards: p.seat === seat ? p.holeCards.map(formatCard) : showdown.find((h) => h.seat === p.seat)?.cards || [] })), actingSeat: s.actingSeat, pot: s.pot, complete: s.complete, legal: table.legalActions(seat), history: actions.map((e) => ({ street: e.street, seat: e.seat, action: e.action, amount: e.amount, allIn: e.allIn })), showdown: structuredClone(showdown), awards: structuredClone(awards) };
  }
  function start() {
    if (table.snapshot() && !table.snapshot().complete) throw Error("Hand in progress");
    actions = [];
    events = [];
    showdown = [];
    awards = [];
    table.startHand();
    return state();
  }
  function act(seat, action) {
    validateSeat(seat);
    if (!action || !["fold", "check", "call", "bet", "raise", "allin"].includes(action.type)) throw Error("Invalid action");
    if (["bet", "raise"].includes(action.type) && (!Number.isSafeInteger(action.amount) || action.amount <= 0)) throw Error("Invalid amount");
    table.act(seat, action);
    return state();
  }
  function bot(seat, { mode = "expert", samples = 180, tuning = {} } = {}) {
    const s = table.snapshot();
    if (!s || s.complete || s.actingSeat !== seat) throw Error("Not this seat turn");
    const v = playerView2(seat);
    const decision = decide(v, { mode, samples, tuning, seed: seed + ":" + s.handNumber + ":" + actions.length + ":" + seat });
    act(seat, decision.action);
    return { decision, state: state() };
  }
  function playHand({ modes = ["novice", "expert"], maxActions = 300, samples = 180, tunings = [{}, {}] } = {}) {
    if (!table.snapshot() || table.snapshot().complete) start();
    let n = 0;
    while (!table.snapshot().complete) {
      if (++n > maxActions) throw Error("Action bound exceeded");
      bot(table.snapshot().actingSeat, { mode: modes[table.snapshot().actingSeat], samples, tuning: tunings[table.snapshot().actingSeat] });
    }
    return state();
  }
  return { state, playerView: playerView2, start, act, bot, playHand };
}
export {
  createGame
};
