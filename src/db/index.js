const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./db.sql', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the db.sql SQLite database.');
  }
});

setup();

async function setup() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id varchar(50) PRIMARY KEY,
    name varchar(50),
    joined DATETIME
    )`);
  await run(`CREATE TABLE IF NOT EXISTS sessions (
    code varchar(50) PRIMARY KEY,
    userId varchar(50),
    until DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id)
    )`);
  await run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER NOT NULL,
    userId varchar(50),
    level INTEGER,
    quality INTEGER,
    quantity INTEGER,
    type INTEGER,
    until DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id),
    PRIMARY KEY (id)
    )`);
  await run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER NOT NULL,
    userId varchar(50),
    type INTEGER,
    minLevel INTEGER,
    maxLevel INTEGER,
    minQuality INTEGER,
    until DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id),
    PRIMARY KEY (id)
    )`);

  // !(await findUser('689380923137196088')) && addUser('689380923137196088', 'Dari');
}

function run(str) {
  return new Promise((resolve, reject) => db.run(str, [], function (err, res) {
    if(err) {
      reject(err);
    } else {
      resolve(this); 
    }
  }))
}

function all(str) {
  return new Promise((resolve, reject) => db.all(str, (err, res) => {
      if(err) {
          reject(err);
      } else {
          resolve(res); 
      }
  }))
}

function formatDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function addUser(id, name) {
  return run(`INSERT INTO users VALUES (${id}, '${name}', '${formatDate(new Date())}')`);
}

async function removeUser(name) {
  return [
    await run(`DELETE FROM sessions WHERE userId=(SELECT id FROM users WHERE name='${name}')`),
    await run(`DELETE FROM stock WHERE userId=(SELECT id FROM users WHERE name='${name}')`),
    run(`DELETE FROM users WHERE name='${name}'`)
  ]
}

function newSession(id, code) {
  return run(`INSERT INTO sessions VALUES ('${code}', '${id}', '${formatDate(new Date(Date.now() + 2592000000))}')`)
}

function getAll(table) {
  return all('SELECT * FROM ' + table);
}

function getSession(code) {
  return all(`SELECT * FROM sessions WHERE code='${code}'`);
}

async function findUser(id) {
  return (await all(`SELECT * FROM users WHERE id='${id}'`)).length === 1;
}

function getUser(id) {
  return all(`SELECT * FROM users WHERE id='${id}'`);
}

function clearSessions() {
  return run(`DELETE FROM sessions`);
}

function terminateSession(code) {
  return run(`DELETE FROM Sessions WHERE code='${code}'`);
}

function getUsersStock(code) {
  return all(`SELECT id,type,level,quality,quantity FROM stock JOIN sessions ON (stock.userId=sessions.userId) WHERE code='${code}'`);
}

function getUsersRequests(code) {
  return all(`SELECT id,type,minLevel,maxLevel,minQuality FROM requests JOIN sessions ON (requests.userId=sessions.userId) WHERE code='${code}'`);
}

function getUserRequests(id) {
  return all(`SELECT id,type,minLevel,maxLevel,minQuality FROM requests WHERE userId = '${id}'`);
}

function getMemberStock(name) {
  return all(`SELECT type,level,quality,quantity,stock.id FROM stock JOIN users ON (stock.userId=users.id) WHERE name='${name}'`);
}

function getStock({types, minQuality, maxQuality, minLvl, maxLvl}) {
  return all(`SELECT stock.id,type,level,quality,quantity,name FROM stock JOIN users ON (stock.userId = users.id) WHERE type IN (${types}) AND (level BETWEEN ${minLvl} AND ${maxLvl}) AND (quality BETWEEN ${minQuality} AND ${maxQuality})`);
}

function getRequests({types, minQuality, maxQuality, minLvl, maxLvl}) {
  return all(`SELECT type,minLevel,maxLevel,minQuality,name FROM requests JOIN users ON (requests.userId = users.id) WHERE type IN (${types}) AND ((minLevel BETWEEN ${minLvl} AND ${maxLvl}) OR (maxLevel BETWEEN ${minLvl} AND ${maxLvl})) AND (minQuality BETWEEN ${minQuality} AND ${maxQuality})`);
}

function addItem({level, quality, quantity, type, userId}) {
  return run(`INSERT INTO stock (userId, type, quantity, quality, level, until) VALUES ('${userId}', '${type}', '${quantity}', '${quality}', '${level}', '${formatDate(new Date(Date.now() + 604800000))}') Returning id`);
}

function getItemOwner(itemId) {
  return all(`SELECT userId FROM stock WHERE id = '${itemId}'`);
}

function getRequestOwner(itemId) {
  return all(`SELECT userId FROM requests WHERE id = '${itemId}'`);
}

function removeItem(itemId) {
  return run(`DELETE FROM stock WHERE id = '${itemId}'`);
}

function removeRequest(requestId) {
  return run(`DELETE FROM requests WHERE id = '${requestId}'`);

}

function getItemCount(userId) {
  return all(`SELECT COUNT() FROM stock WHERE userId='${userId}'`);
}

function getRequestCount(userId) {
  return all(`SELECT COUNT() FROM requests WHERE userId='${userId}'`);
}

function clearStock(userId) {
  if(userId) {
    return run(`DELETE FROM stock WHERE userId='${userId}'`);
  } else {
    return run(`DELETE FROM stock`);
  }
}

function clearRequests(userId) {
  if(userId) {
    return run(`DELETE FROM requests WHERE userId='${userId}'`);
  } else {
    return run(`DELETE FROM requests`);
  }
}

function editItem({id, level, quality, quantity, type,}) {
  return run(`UPDATE stock SET level='${level}', quality='${quality}', quantity='${quantity}', type='${type}' WHERE id='${id}'`);
}

function editRequest({id, minLevel, maxLevel, minQuality, type}) {
  return run(`UPDATE requests SET minLevel = '${minLevel}', maxLevel = '${maxLevel}', minQuality='${minQuality}', type='${type}' WHERE id='${id}'`);
}

function checkExpirationDates() {
  return [
    run(`DELETE FROM stock WHERE until > ${formatDate(new Date())}`),
    run(`DELETE FROM sessions WHERE until > ${formatDate(new Date())}`)
  ]
}

async function isDuplicateItem({id, userId, type, quality, level}) {
  console.log(id, userId);
  console.log(await all(`SELECT * FROM stock WHERE userId = '${userId}' AND type = '${type}' AND quality = '${quality}' AND level = '${level}' AND id != '${id}'`));
  return (await all(`SELECT * FROM stock WHERE userId = '${userId}' AND type = '${type}' AND quality = '${quality}' AND level = '${level}' AND id <> '${id}'`)).length !== 0;
}

async function isDuplicateRequest({id, userId, type, minQuality, minLevel, maxLevel}) {
  return (await all(`SELECT * FROM requests WHERE userId = '${userId}' AND type = '${type}' AND minQuality = '${minQuality}' AND ((minLevel BETWEEN '${minLevel}' AND '${maxLevel}') OR (maxLevel BETWEEN '${minLevel}' AND '${maxLevel}')) AND id <> '${id}'`)).length !== 0;
}

function updateUser(id, name) {
  return run(`UPDATE users SET name = '${name}' WHERE id = '${id}'`);
}

function addRequest({type, minQuality, minLevel, maxLevel, userId}) {
  return run(`INSERT INTO requests (userId, type, minQuality, minLevel, maxLevel, until) VALUES ('${userId}', '${type}', '${minQuality}', '${minLevel}', '${maxLevel}', '${formatDate(new Date(Date.now() + 604800000))}') Returning id`);
}

function findDeals(userId) {
  return all(`SELECT 
        u1.name AS userAName,
        u2.name AS userBName,
        s1.id AS stockAId,
        s1.userId AS stockAUserId,
        s1.level AS stockALevel,
        s1.quality AS stockAQuality,
        s1.quantity AS stockAQuantity,
        s1.type AS stockAType,
        s1.until AS stockAUntil,
        r1.id AS requestAId,
        r1.userId AS requestAUserId,
        r1.type AS requestAType,
        r1.minLevel AS requestAMinLevel,
        r1.maxLevel AS requestAMaxLevel,
        r1.minQuality AS requestAMinQuality,
        r1.until AS requestAUntil,
        s2.id AS stockBId,
        s2.userId AS stockBUserId,
        s2.level AS stockBLevel,
        s2.quality AS stockBQuality,
        s2.quantity AS stockBQuantity,
        s2.type AS stockBType,
        s2.until AS stockBUntil,
        r2.id AS requestBId,
        r2.userId AS requestBUserId,
        r2.type AS requestBType,
        r2.minLevel AS requestBMinLevel,
        r2.maxLevel AS requestBMaxLevel,
        r2.minQuality AS requestBMinQuality,
        r2.until AS requestBUntil
    FROM 
        requests r1
    JOIN 
        stock s1 ON s1.type = r1.type 
                AND s1.level BETWEEN r1.minLevel AND r1.maxLevel 
                AND s1.quality >= r1.minQuality
    JOIN 
        requests r2 ON r2.userId = s1.userId 
                    AND r1.userId != r2.userId
    JOIN 
        stock s2 ON s2.userId = r1.userId 
                AND s2.type = r2.type 
                AND s2.level BETWEEN r2.minLevel AND r2.maxLevel 
                AND s2.quality >= r2.minQuality
    JOIN 
        users u1 ON u1.id = r1.userId
    JOIN 
        users u2 ON u2.id = r2.userId
    WHERE 
        r1.userId = '${userId}';
  `);
}

module.exports = {
  run,
  all,
  addUser,
  newSession,
  getAll,
  removeUser,
  getSession,
  getUser,
  findUser,
  clearSessions,
  terminateSession,
  getUsersStock,
  getStock,
  addItem,
  getMemberStock,
  getItemOwner,
  getRequestOwner,
  removeItem,
  getItemCount,
  getRequestCount,
  clearStock,
  clearRequests,
  editItem,
  isDuplicateItem,
  isDuplicateRequest,
  updateUser,
  addRequest,
  editRequest,
  removeRequest,
  getUsersRequests,
  getRequests,
  findDeals,
  getUserRequests
}