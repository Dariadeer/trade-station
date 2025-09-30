const axios = require('axios');
const { findUser, newSession, addUser } = require('../db');

async function auth (req, res) {

    const { code } = req.query;

    console.log(code);

    try {
        const resp = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: process.env.REDIRECT_URI,
                code
            }),
            {
            headers:
            {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    
        const userData = (await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${resp.data.access_token}`,
            },
            })).data;

        console.log(userData);

        if(await findUser(userData.id)) {
            
        } else {
            await addUser(userData.id, userData.global_name);
        }

        newSession(userData.id, code);
        
    } catch (e) {
        console.log(e);
    }

    res.cookie('code', code, { maxAge: 2592000000, httpOnly: true });
    console.log('REDIRECTING...');
    res.redirect('/');
}

async function getUserInfo(id) {
    console.log('ID:', id);    
    const res = await axios.get(`https://discord.com/api/v9/users/${id + ''}`, {
        headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
    })

    return res.data;
}

module.exports = {
    auth,
    getUserInfo
}