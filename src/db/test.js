const db = require('./');

(async() => {
    console.log((await db.findDeals("689380923137196088")));
})();
