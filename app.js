const express = require('express');
const bp = require('body-parser');
const cookieParser = require("cookie-parser");
require('dotenv').config();
const { auth, getUserInfo } = require('./src/discord');
const db = require('./src/db');
const minify = require('express-minify');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// waitForCommand();

const app = express();
const port = process.env.PORT || 4000;

app.use(minify());
app.use(express.static('./client'));
app.use(cookieParser());
app.use(bp.json());

const types = {
    transport: 0,
    miner: 1,
    weapon: 2,
    shield: 3,
    combat: 4,
    drone: 5
};

function update() {
    console.log(new Date().toLocaleTimeString());

    setTimeout(update, 60000)
}

app.post('/api/stock', async (req, res) => {
    const filter = req.body;

    const stock = await db.getStock(filter);

    res.json({
        items: sortItems(stock)
    })
})

app.post('/api/requests', async (req, res) => {
    const filter = req.body;

    const requests = await db.getRequests(filter);

    res.json({
        items: sortRequests(requests)
    })
});

app.get('/api/item-owner-requests/:id', async (req, res) => {
    const itemId = req.params.id;

    const itemOwner = (await db.getItemOwner(itemId))[0];

    if(itemOwner) {
        res.json(await db.getUserRequests(itemOwner.userId));
    } else {
        res.json({
            error: 'Unknown item'
        })
    }
})

app.get('/api/deals', async (req, res) => {

    try {
        const code = req.cookies.code;

        const session = (await db.getSession(code))[0];

        if(!session) {
            return res.json({
                error: 'Failed to authenticate user'
            })
        }

        const result = await db.findDeals(session.userId);
        res.json({
            deals: formatDeals(result)
        })
    } catch (e) {
        res.json({
            error: e.message
        })
    }
})

app.get('/api/members', async (req, res) => {

    const users = await db.getAll('users');

    res.json(users);
})

app.get('/login-redirect', (req, res) => {
    res.send(process.env.LOGIN_URI);
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test!'
    })
});

app.post('/api/remove-item', async (req, res) => {
    const id = req.body.id;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    const itemOwner = (await db.getItemOwner(id))[0];

    if(session && itemOwner && itemOwner.userId === session.userId) {
        try {
           await db.removeItem(id); 
           res.json({
            removedId: id
           })
        } catch (e) {
            res.json({
                error: e.message
            })
        }
    } else {
        res.json({
            error: 'You are not authorized to do that'
        })
    }
})

app.post('/api/remove-request', async (req, res) => {
    const id = req.body.id;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    const requestOwner = (await db.getRequestOwner(id))[0];

    if(session && requestOwner && requestOwner.userId === session.userId) {
        try {
           await db.removeRequest(id); 
           res.json({
            removedId: id
           })
        } catch (e) {
            res.json({
                error: e.message
            })
        }
    } else {
        res.json({
            error: 'You are not authorized to do that'
        })
    }
})

app.post('/api/add-item', async (req, res) => {
    const params = req.body;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    if(!session) {
        return res.json({
            error: 'You are not logged in'
        })
    }

    if((await db.getItemCount(session.userId))[0]['COUNT()'] >= 20) {
        return res.json({
            error: 'You have exceeded the limit of 20 items'
        });
    }

    if (session
        && params.quantity !== null && params.quantity > 0 && params.quantity <= 30
        && params.quality !== null && params.quality >= 0 && params.quality <= 400
        && params.level !== null && params.level > 0 && params.level <= 12
        && params.type !== null && params.type >= 0 && params.type < 6)
    {
        params.userId = session.userId;
        params.id = -1;

        try {

            if(await db.isDuplicateItem(params)) {
                return res.json({
                    error: 'You already have an item with equal parameters'
                })
            }

            params.id = (await db.addItem(params)).lastID;
            delete params.userId;
            res.json(params);
        } catch (e) {
            res.json({
                error: e.message
            })
        }
        
    } else {
        res.json({
            error: 'Bad request parameters'
        })
    }
});

app.post('/api/add-request', async (req, res) => {
    const params = req.body;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    if((await db.getRequestCount(session.userId))[0]['COUNT()'] >= 5) {
        return res.json({
            error: 'You have exceeded the limit of 5 requests'
        });
    }

    if (session
        && params.minQuality !== null && params.minQuality >= 0 && params.minQuality <= 400
        && params.minLevel !== null && params.minLevel > 0 && params.minLevel <= 12
        && params.maxLevel !== null && params.maxLevel > 0 && params.maxLevel <= 12
        && params.minLevel <= params.maxLevel
        && params.type !== null && params.type >= 0 && params.type < 6)
    {
        params.userId = session.userId;
        params.id = -1;

        try {

            if(await db.isDuplicateRequest(params)) {
                return res.json({
                    error: 'You already have a request with equal parameters'
                })
            }

            params.id = (await db.addRequest(params)).lastID;
            delete params.userId;
            res.json(params);
        } catch (e) {
            res.json({
                error: e.message
            })
        }
        
    } else {
        res.json({
            error: 'Bad request parameters'
        })
    }
});

app.post('/api/edit-item', async (req, res) => {
    const params = req.body;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    if (session
        && params.quantity !== null && params.quantity > 0 && params.quantity <= 30
        && params.quality !== null && params.quality >= 0 && params.quality <= 400
        && params.level !== null && params.level > 0 && params.level <= 12
        && params.type !== null && params.type >= 0 && params.type < 6
    )
    {
        params.userId = session.userId;
        try {

            if(await db.isDuplicateItem(params)) {
                return res.json({
                    error: 'You already have an item with equal parameters'
                })
            }   

            await db.editItem(params);
            delete params.userId;
            res.json(params);
        } catch (e) {
            res.json({
                error: e.message
            })
        }
        
    } else {
        res.json({
            error: 'Bad request parameters'
        })
    }
})

app.post('/api/edit-request', async (req, res) => {
    const params = req.body;
    const { code } = req.cookies;
    const session = (await db.getSession(code))[0];

    if (session
        && params.minQuality !== null && params.minQuality >= 0 && params.minQuality <= 400
        && params.minLevel !== null && params.minLevel > 0 && params.minLevel <= 12
        && params.maxLevel !== null && params.maxLevel > 0 && params.maxLevel <= 12
        && params.minLevel <= params.maxLevel
        && params.type !== null && params.type >= 0 && params.type < 6)
    {
        params.userId = session.userId;
        try {

            if(await db.isDuplicateRequest(params)) {
                return res.json({
                    error: 'You already have a request with equal parameters'
                })
            }   

            delete params.userId;
            delete params.isTrusted;
            await db.editRequest(params);
            res.json(params);
        } catch (e) {
            res.json({
                error: e.message
            })
        }
        
    } else {
        res.json({
            error: 'Bad request parameters'
        })
    }
})

app.post('/cmd', async (req, res) => {
    const cmd = req.body.cmd;

    const session = await db.getSession(req.cookies.code);

    if(session[0] && session[0].userId === "689380923137196088") {
        return res.json(await clientCommand(cmd));
    }

    res.json({
        error: 'You are not Authorized to use the CLI'
    })

})

app.get('/api/update-me', async (req, res) => {

    try {

        const session = (await db.getSession(req.cookies.code))[0];

        if(!session) {
            return res.json({
                error: 'You are not logged in to perform this action'
            })
        }

        const userData = await getUserInfo(session.userId);
        console.log(await db.updateUser(session.userId, userData.global_name));
        const user = (await db.getUser(session.userId))[0];
        const info = Object.assign(userData, user);
        res.json(info);
    } catch (e) {
        res.json({
            error: e.message
        })
    }
})

app.get('/api/me', async (req, res) => {

    try {
        const { code } = req.cookies;

        if(!code) {
            return res.json({
                code: 0,
                message: 'You are not logged in'
            });
        }

        const session = (await db.getSession(code))[0];

        if(session) {
            const user = (await db.getUser(session.userId))[0];
            const info = Object.assign(await getUserInfo(session.userId), user);
            res.json(info);
        } else {
            res.clearCookie('code');
            res.json({
                code: 1,
                message: 'You are either not invited or your session is expired'
            });
        }
    } catch (e) {
        res.json({
            error: e
        })
    }
});

app.get('/api/auth', auth);

app.get('/api/logout', async (req, res) => {
    try {
        await db.terminateSession(req.cookies.code);
        res.clearCookie('code');
        res.json({
            code: 1,
            message: 'Success'
        })
    } catch (error) {
        res.json({
            code: 0,
            message: error.message
        })
    } 
});



app.get('/api/my-inventory', async (req, res) => {

    const code = req.cookies.code;

    if(!code) {
        return res.json({
            error: 'You are not logged in'
        });
    }

    try {
        const items = await db.getUsersStock(req.cookies.code);
        const requests = await db.getUsersRequests(req.cookies.code);

        console.log(requests);

        res.json({
            code: 2,
            items: items,
            requests
        });
    } catch (error) {
        res.json({
            error: error.message
        })
    }
})

app.get('/*', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
})

app.listen(port, () => console.log(`Server is running on port localhost:${port}`));

app.listen(port, process.env.PUBLIC_IP, () => console.log(`Server is running on http://${process.env.PUBLIC_IP}:${port}`));

function waitForCommand() {
    rl.question('', async cmd => {

        const words = cmd.split(' ');

        if(words.length === 0) {
            console.log('INVALID COMMAND')
            return waitForCommand();
        }
        
        const operand = words[0];

        switch (operand) {
            case 'adu':
                if(!lengthCheck(3, words)) return;
                const name = words[1], id = words[2];
                showResult(db.addUser(id, name));
                break;
            case 'shu':
                showResult(db.getAll('users'));
                break;
            case 'rmu':
                if(!lengthCheck(2, words)) return;
                showResult(db.removeUser(words[1]));
                break;
            case 'shs':
                showResult(db.getAll('sessions'));
                break;
            case 'cls':
                showResult(db.clearSessions());
                break;
        }

        waitForCommand();
    })
}

async function clientCommand(cmd) {

    const words = cmd.split(' ');

    if(words.length === 0) {
        return {
            error: 'Empty command'
        }
    }
    
    const operand = words[0];

    const errorMsg = {
        error: 'Invalid arguments'
    };
    const successMsg = {
        status: 'Success'
    };

    try {
        switch (operand) {
            case 'adu':
                if(!lengthCheck2(3, words)) return errorMsg;
                const name = words[1], id = words[2];
                return await db.addUser(id, name);
            case 'shu':
                return await db.getAll('users');
            case 'rmu':
                if(!lengthCheck2(2, words)) return errorMsg;
                return await db.removeUser(words[1]);
            case 'shs':
                return await db.getAll('sessions');
            case 'cls':
                return await db.clearSessions();
            case 'ustck':
                return await db.getMemberStock(words[1]);
            case 'clstck':
                return await db.clearStock(words[1]);
            case 'shstck':
                return await db.getAll('stock');
            case 'shr':
                return await db.getAll('requests');
            case 'clr':
                return await db.clearRequests(words[1]);
            default:
                return {
                    error: 'Unrecognized operand'
                }
        }
    } catch (error) {
        return {
            error: error.message
        }
    }

    
}

function lengthCheck2(n, words) {
    return n >= words.length;
}

function lengthCheck(n, words) {
    if(words.length < n) {
        console.log('INVALID ARGUMENTS');
        waitForCommand();
        return;
    }

    return true;
}

async function showResult(result) {
    try {
        console.log(await result);
    } catch (error) {
        console.log(error.message);
    }
}

function sortItems(items) {
    return items.sort((a, b) => 
        a.type !== b.type ? a.type - b.type :
        a.level !== b.level ? b.level - a.level :
        a.quality !== b.quality ? b.quality - a.quality :
        a.quantity - b.quantity
    );
}

function sortRequests(items) {
    return items.sort((a, b) => 
        a.type !== b.type ? a.type - b.type :
        a.minLevel !== b.minLevel ? a.minLevel - b.minLevel :
        a.maxLevel !== b.maxLevel ? a.maxLevel - b.maxLevel :
        a.minQuality - b.minQuality
    );
}

function formatDeals(rows) {
    return rows.map(row => ({
      userA: {
        name: row.userAName,
        request: {
          id: row.requestAId,
          type: row.requestAType,
          minLevel: row.requestAMinLevel,
          maxLevel: row.requestAMaxLevel,
          minQuality: row.requestAMinQuality,
          until: row.requestAUntil,
        },
        stock: {
          id: row.stockBId,
          level: row.stockBLevel,
          quality: row.stockBQuality,
          quantity: row.stockBQuantity,
          type: row.stockBType,
          until: row.stockBUntil,
        },
      },
      userB: {
        name: row.userBName,
        request: {
          id: row.requestBId,
          type: row.requestBType,
          minLevel: row.requestBMinLevel,
          maxLevel: row.requestBMaxLevel,
          minQuality: row.requestBMinQuality,
          until: row.requestBUntil,
        },
        stock: {
          id: row.stockAId,
          level: row.stockALevel,
          quality: row.stockAQuality,
          quantity: row.stockAQuantity,
          type: row.stockAType,
          until: row.stockAUntil,
        },
      },
    }));
  };