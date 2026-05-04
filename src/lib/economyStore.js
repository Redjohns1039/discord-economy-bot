const fs = require("node:fs");
const path = require("node:path");

const DB_PATH = path.join(__dirname, "..", "..", "data", "economy.json");

function ensureDbFile() {
  const dbDir = path.dirname(DB_PATH);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialDb = { guilds: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

function readDb() {
  ensureDbFile();

  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");

    if (!parsed.guilds || typeof parsed.guilds !== "object") {
      parsed.guilds = {};
    }

    return parsed;
  } catch {
    const fallback = { guilds: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function sanitizeInt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.floor(number));
}

function ensureGuild(db, guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = { users: {} };
  }

  if (!db.guilds[guildId].users || typeof db.guilds[guildId].users !== "object") {
    db.guilds[guildId].users = {};
  }

  return db.guilds[guildId];
}

function normalizeUserRecord(user, displayName) {
  const now = new Date().toISOString();
  let changed = false;

  const legacyWallet = sanitizeInt(user.wallet);
  const legacyBank = sanitizeInt(user.bank);

  const rawBalance =
    user.balance === undefined ? legacyWallet + legacyBank : sanitizeInt(user.balance);
  const normalizedBalance = sanitizeInt(rawBalance);

  if (user.balance !== normalizedBalance) {
    user.balance = normalizedBalance;
    changed = true;
  }

  if (displayName && user.lastKnownName !== displayName) {
    user.lastKnownName = displayName;
    changed = true;
  }

  if (user.lastKnownName === undefined) {
    user.lastKnownName = null;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(user, "wallet")) {
    delete user.wallet;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(user, "bank")) {
    delete user.bank;
    changed = true;
  }

  if (!user.updatedAt) {
    user.updatedAt = now;
    changed = true;
  }

  if (changed) {
    user.updatedAt = now;
  }

  return changed;
}

function ensureUser(db, guildId, userId, displayName) {
  const guild = ensureGuild(db, guildId);
  let changed = false;

  if (!guild.users[userId]) {
    guild.users[userId] = {
      balance: 0,
      lastKnownName: displayName || null,
      updatedAt: new Date().toISOString()
    };
    changed = true;
  }

  const user = guild.users[userId];
  if (normalizeUserRecord(user, displayName)) {
    changed = true;
  }

  return { user, changed };
}

function snapshot(user) {
  return {
    balance: sanitizeInt(user.balance)
  };
}

function getBalance(guildId, userId, displayName) {
  const db = readDb();
  const { user, changed } = ensureUser(db, guildId, userId, displayName);

  if (changed) {
    writeDb(db);
  }

  return snapshot(user);
}

function listAllBalances(guildId) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  let dirty = false;

  const balances = Object.entries(guild.users)
    .map(([userId, user]) => {
      if (normalizeUserRecord(user, user.lastKnownName || null)) {
        dirty = true;
      }

      return {
        userId,
        balance: sanitizeInt(user.balance),
        lastKnownName: user.lastKnownName || "Bilinmeyen"
      };
    })
    .filter((entry) => entry.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  if (dirty) {
    writeDb(db);
  }

  return balances;
}

function addMoney(guildId, userId, displayName, amount) {
  const safeAmount = sanitizeInt(amount);
  const db = readDb();
  const { user } = ensureUser(db, guildId, userId, displayName);

  user.balance += safeAmount;
  user.updatedAt = new Date().toISOString();

  writeDb(db);
  return snapshot(user);
}

function removeMoney(guildId, userId, displayName, amount) {
  const safeAmount = sanitizeInt(amount);
  const db = readDb();
  const { user } = ensureUser(db, guildId, userId, displayName);

  const removed = Math.min(user.balance, safeAmount);
  user.balance -= removed;
  user.updatedAt = new Date().toISOString();

  writeDb(db);

  return {
    removed,
    ...snapshot(user)
  };
}

function setMoney(guildId, userId, displayName, amount) {
  const safeAmount = sanitizeInt(amount);
  const db = readDb();
  const { user } = ensureUser(db, guildId, userId, displayName);

  user.balance = safeAmount;
  user.updatedAt = new Date().toISOString();

  writeDb(db);
  return snapshot(user);
}

function resetAllBalances(guildId) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  const now = new Date().toISOString();

  let processedUsers = 0;
  let resetUsers = 0;
  let totalRemoved = 0;
  let dirty = false;

  for (const user of Object.values(guild.users)) {
    if (normalizeUserRecord(user, user.lastKnownName || null)) {
      dirty = true;
    }

    processedUsers += 1;

    const currentBalance = sanitizeInt(user.balance);
    if (currentBalance > 0) {
      totalRemoved += currentBalance;
      user.balance = 0;
      user.updatedAt = now;
      resetUsers += 1;
      dirty = true;
    }
  }

  if (dirty) {
    writeDb(db);
  }

  return {
    processedUsers,
    resetUsers,
    totalRemoved
  };
}

function pay(guildId, fromUser, toUser, amount) {
  const safeAmount = sanitizeInt(amount);

  if (fromUser.id === toUser.id) {
    return {
      ok: false,
      reason: "SELF_PAYMENT"
    };
  }

  const db = readDb();
  const senderState = ensureUser(db, guildId, fromUser.id, fromUser.displayName);
  const receiverState = ensureUser(db, guildId, toUser.id, toUser.displayName);
  const sender = senderState.user;
  const receiver = receiverState.user;

  if (sender.balance < safeAmount) {
    if (senderState.changed || receiverState.changed) {
      writeDb(db);
    }

    return {
      ok: false,
      reason: "INSUFFICIENT_FUNDS",
      sender: snapshot(sender)
    };
  }

  sender.balance -= safeAmount;
  receiver.balance += safeAmount;
  const now = new Date().toISOString();
  sender.updatedAt = now;
  receiver.updatedAt = now;

  writeDb(db);

  return {
    ok: true,
    amount: safeAmount,
    sender: snapshot(sender),
    receiver: snapshot(receiver)
  };
}

module.exports = {
  getBalance,
  listAllBalances,
  addMoney,
  removeMoney,
  setMoney,
  resetAllBalances,
  pay
};
