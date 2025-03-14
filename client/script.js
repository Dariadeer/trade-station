const contentDiv = q('.content');
const itemPanel = contentDiv.querySelector('#ip1');
const itemPanel2 = contentDiv.querySelector('#ip2');
const requestPanel = contentDiv.querySelector('#request-panel');
const requestPanel2 = contentDiv.querySelector('#request-panel2');
const inventoryDiv = contentDiv.querySelector('.inventory');
const inventoryItemsDiv = contentDiv.querySelector('.inventory-items-container');
const addItemDiv = contentDiv.querySelector('#ei');
const addReqDiv = contentDiv.querySelector('#er');
const landingDiv = contentDiv.querySelector('.landing');
const CLI = q('.cli-container');
const overline = q('.underline');
let user;
let inventory;
const tabDivs = qa('.navbar-el');
const tabs = {
    'landing': {
        el: tabDivs[0],
        show: showLanding,
        id: 0
    },
    'artifacts': {
        el: tabDivs[1],
        show: showItemTab,
        id: 1
    },
    'requests': {
        el: tabDivs[2],
        show: showReqTab,
        id: 2
    },
    'deals': {
        el: tabDivs[3],
        show: showDeals,
        id: 3
    },
    'user': {
        el: tabDivs[4],
        show: showInventory,
        id: 4
    }
}

let filter;

let currentItem = localStorage.currentItem ? JSON.parse(localStorage.currentItem) : {
    type: 0,
    quality: 0,
    quantity: 1,
    level: 1,
    id: null
}

let currentReq = localStorage.currentReq ? JSON.parse(localStorage.currentReq) : {
    type: 0,
    minQuality: 0,
    minLevel: 1,
    maxLevel: 12,
    id: null
}

if(localStorage.filter) {
    filter = JSON.parse(localStorage.filter);
} else {
    filter = {
        types: [0, 1, 2, 3, 4, 5],
        minQuality: 0,
        maxQuality: 400,
        minLvl: 1,
        maxLvl: 12
    }
    saveFilters();
}

history.onp

search = () => {};

(async () => {
    clearContent();
    await initMeButton();
    showWelcomeMessage();
    setupCLI();
    editWindowSetup();
    setupInventoryToggle();
    show(contentDiv);
    showState();
    setFilters();
})();

window.onpopstate = showState;


const typeStrings = [
    "Transport",
    "Mining",
    "Weapon",
    "Shield",
    "Combat",
    "Drone"
]

function showMembers() {
    fetch('/api/members')
    .then(
        response => response.json()
    )
    .then(
        data => {
            clearContent();
            const panel = contentDiv.querySelector('.user-portrait-panel');
            panel.innerHTML = "";
            show(panel);
            let t = 0;
            let size = data.length;
            for(let user of data) {
                setTimeout(() => {
                    panel.append(createUserElement(user));
                }, t * 300 / data.length);
                t++;
            }
        }
    )
}

function showWelcomeMessage() {
    if(user) {
        q('#welcome-message').innerHTML = `<h3>Nice to see you, ${user.name}!</h3>`;
        q('#welcome-message').classList.add('logged-in');
    }
}

function showState() {
    const state = window.location.pathname.split('/')[1];
    if(state === '' || !tabs[state]) return showLanding();
    tabs[state].show();
}

function markTabAsSelected(tabName) {
    const tab = tabs[tabName];
    const el = tab.el;

    overline.classList.remove('discord-bg');

    if(tabName === 'user') {
        overline.classList.add('discord-bg')
    }

    if(tabName === 'landing') {
        history.pushState({}, 'Trade Hub | ' + tabName ,'/');
        hide(overline);
    } else {
        history.pushState({tabName}, 'Trade Hub | ' + tabName ,'/' + tabName.toLowerCase());
        if(isHidden(overline)) {
            overline.style.left = el.offsetLeft + 'px';
            overline.style.top = '-20px';
            show(overline);
            setTimeout(() => {overline.style.top = '-10px';}, 100);
        } else {
            show(overline);
            overline.style.left = el.offsetLeft + 'px';
        }
    }
}

function showLanding() {

    markTabAsSelected('landing');

    clearContent();

    show(landingDiv);
}

function createUserElement(user) {
    const el = document.createElement('div');
    el.className = 'user-portrait-container';
    el.userId = user.id;
    el.innerHTML = `
        <div class="user-portrait">
            <div class="user-icon">
                <div class="icon">
                    <div class="circle2"></div>
                    <div class="circle"></div>
                </div>
            </div>
            <div class="user-name">${user.name}</div>
        </div>  
    `;
    return el;
}

function showItemTab(){

    console.log('?')

    markTabAsSelected('artifacts');

    clearContent();
    search = showItems;

    const filterDiv = contentDiv.querySelector('#f1');
    filterDiv.classList.add('appear');
    itemPanel.classList.add('appear');
    setTimeout(() => filterDiv.classList.remove('appear'), 800);
    show(itemPanel);
    show(filterDiv);
    itemPanel.innerHTML = "";

    showItems();
}

function showReqTab(){

    markTabAsSelected('requests');

    clearContent();

    search = showReqs;
    const filterDiv = contentDiv.querySelector('#f1');
    filterDiv.classList.add('appear');
    itemPanel.classList.add('appear');
    setTimeout(() => filterDiv.classList.remove('appear'), 800);
    show(itemPanel);
    show(filterDiv);
    itemPanel.innerHTML = "";

    showReqs();
}

function showReqs() {
    itemPanel.innerHTML = `<div class="loader"></div>`;
    fetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(filter),
        headers: {
            "content-type": "application/json",
        }
    })
    .then(
        response => response.json()
    ).then(
        data => {
            console.log(data);

            if(data.items.length === 0) {
                itemPanel.innerHTML = '<div class="no-items-txt">No requests were found...</div>';
                return;
            }

            itemPanel.innerHTML = ``;

            for(let i = 0; i < data.items.length; i++) {

                const art = data.items[i];
                const item = createItemElement(art, data.users);

                itemPanel.append(item);


                setTimeout(() => item.classList.remove('invisible'), 100 + i * 100);
            }
        }
    )
}

async function showDeals() {

    markTabAsSelected('deals');

    clearContent();

    itemPanel.classList.add('appear');
    show(itemPanel);
    itemPanel.innerHTML = '<div class="loader"></div>';


    const res = await (await fetch('/api/deals')).json();

    itemPanel.innerHTML = '';

    if (res.error) {
        itemPanel.innerHTML = `<button class="act-btn discord" onclick="sendToAuth()">Login with Discord to use this function</button>`;
        return;
    }

    console.log(res);

    const deals = res.deals;

    if(deals.length === 0) {
        itemPanel.innerHTML = '<div class="no-items-txt">No deals were found...</div>';
        return;
    }

    for(let deal of deals) {
        const art1 = deal.userA.stock;
        art1.name = deal.userA.name;

        const art2 = deal.userB.stock;
        art2.name = deal.userB.name;

        const item1 = createItemElement(art1), item2 = createItemElement(art2);

        itemPanel.append(createItemPair(item1, item2));

        item1.classList.remove('invisible');
        item2.classList.remove('invisible');
    }
}

function createItemPair(i1, i2) {
    const div = document.createElement('div');
    div.className = 'item-pair';

    const arrow = document.createElement('i');
    arrow.className = 'fa fa-exchange';
    arrow.ariaHidden = 'true';

    div.append(i1, arrow, i2);

    return div;
}

function showItems() {
    itemPanel.innerHTML = `<div class="loader"></div>`;
    fetch('/api/stock', {
        method: 'POST',
        body: JSON.stringify(filter),
        headers: {
            "content-type": "application/json",
        }
    })
    .then(
        response => response.json()
    ).then(
        data => {
            console.log(data);

            if(data.items.length === 0) {
                itemPanel.innerHTML = '<div class="no-items-txt">No items were found...</div>';
                return;
            }

            itemPanel.innerHTML = ``;

            for(let i = 0; i < data.items.length; i++) {

                const art = data.items[i];
                const item = createItemElement(art, data.users);

                itemPanel.append(item);

                item.onclick = () => showUserReqs(art.id);


                setTimeout(() => item.classList.remove('invisible'), 100 + i * 100);
            }
        }
    )
}

async function showUserReqs(itemId) {
    console.log(await (await fetch('/api/item-owner-requests/' + itemId)).json());
}

function createItemElement(art) {
    const item = document.createElement('div');
    item.className = 'item-container invisible';

    item.innerHTML = `
        <div class="type${art.type}-icon art-icon"></div>
        <div class="type${art.type}">${typeStrings[art.type].toUpperCase()}</div>
        <div class="value-row">
            <div class="level-txt">LVL ${art.level || (art.minLevel === art.maxLevel ? art.minLevel : (art.minLevel + '-' + art.maxLevel))}</div>
            <div class="dividor">&nbsp;|&nbsp;</div>
            <div class="quality-txt">${art.quality !== undefined ? (art.quality + '%') : (art.minQuality + '%+')}</div>
        </div>
        ${art.name ? `<div class="owner-txt">${art.name}</div>` : ''}
        ${art.quantity ? `<div class="quantity-txt">x${art.quantity}</div>` : ''}
    `;
    return item;
}

function createAddItemElement() {
    const item = document.createElement('div');
    item.className = 'item-container invisible';
    item.id = 'add-item';

    item.innerHTML = `
        <div class="add-item-icon art-icon">+</div>
        <div class="add-item-txt">ADD MORE</div>
    `;
    return item;
}

function setFilters() {
    for(let i = 0; i < 6; i++) {
        let el = contentDiv.querySelector('#ft' + i);
        if(!filter.types.includes(i)){
            el.classList.add('inactive');
        } else {
            el.classList.remove('inactive');
        }
        el.onclick = () => {
            el.classList.toggle('inactive');
            if(filter.types.includes(i)){
                filter.types.splice(filter.types.indexOf(i), 1);
            } else {
                filter.types.push(i);
            }
            saveFilters();
        }
    }

    contentDiv.querySelector('#fipmin').value = filter.minQuality;
    contentDiv.querySelector('#fipmax').value = filter.maxQuality;
    contentDiv.querySelector('#filmin').value = filter.minLvl;
    contentDiv.querySelector('#filmax').value = filter.maxLvl;

    contentDiv.querySelector('#fipmin').onchange = () => {
        filter.minQuality = parseInt(contentDiv.querySelector('#fipmin').value);
        saveFilters();
    }

    contentDiv.querySelector('#fipmax').onchange = () => {
        filter.maxQuality = parseInt(contentDiv.querySelector('#fipmax').value);
        saveFilters();
    }

    contentDiv.querySelector('#filmin').onchange = () => {
        filter.minLvl = parseInt(contentDiv.querySelector('#filmin').value);
        saveFilters();
    }
    
    contentDiv.querySelector('#filmax').onchange = () => {
        filter.maxLvl = parseInt(contentDiv.querySelector('#filmax').value);
        saveFilters();
    }
}

function saveFilters() {
    localStorage.filter = JSON.stringify(filter);
}

function resetFilters() {
    filter = {
        types: [0, 1, 2, 3, 4, 5],
        minQuality: 0,
        maxQuality: 400,
        minLvl: 1,
        maxLvl: 12
    }

    saveFilters();
    setFilters();
}

function clearContent() {
    [...contentDiv.children].forEach(element => {
        hide(element);
    });
}

function show(el) {
    el.style.display = 'flex';
}

function hide(el) {
    el.style.display = 'none';
}

function isHidden(el) {
    return el.style.display === 'none';
}

function show2(el) {
    el.classList.remove('none');
}

function hide2(el) {
    el.classList.add('none');
}

async function sendToAuth() {
    window.location.assign(await (await fetch('/login-redirect')).text())
}

async function initMeButton() {
    const data = await (await fetch('/api/me')).json();

    console.log(data);

    switch (data.code) {
        case 0:
            // login btn shows up
            break;
        case 1:
            errorMessage(data.message);
            break;
        default:
            changeProfileButton(data);
            break;
    }
}

function changeProfileButton(userData) {
    user = userData;
    const navEl = q('#profile');
    navEl.innerHTML = 
    `
    Me&nbsp;<img src="https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp" class="profile-pic" alt="User profile picture">
    `;
    navEl.onclick = showInventory;
}

function showInventory() {
    markTabAsSelected('user');
    clearContent();

    console.log("aa" + user);

    if(!user) {
        return showLanding();
    }

    show(inventoryDiv);
    show(inventoryItemsDiv);
    hide(addItemDiv);
    hide(addReqDiv);
    
    showProfile();

    loadInventoryItems();
}

function showProfile() {
    const profile = inventoryDiv.querySelector('.profile');
    profile.innerHTML = 
    `
    <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp" class="profile-pic" alt="User profile picture">
    <div class="user-info">
        <label class="">${user.name}</label>
        <label class="discord-text">${user.username}</label>
        <label class="quality-txt">Joined ${new Date(user.joined).toLocaleDateString()}</label>
    </div>
    
    <div class="btn-col">
        <button class="act-btn green" onclick="updateUserProfile()">UPDATE</button>
        <button class="act-btn" onclick="logout()">LOG OUT</button>
    </div>
    `;
}

function loadInventoryItems() {
    itemPanel2.innerHTML = `<div class="loader"></div>`;
    fetch('/api/my-inventory')
    .then(
        response => response.json()
    ).then(
        data => {
            if(data.error) {
                return errorMessage(data.error);
            }
            inventory = data;
            showInventoryArtifacts(data);
            showInventoryRequests(data);
        }
    )
}

function showInventoryRequests(data) {
    requestPanel.innerHTML = ``;

    for(let i = 0; i < data.requests.length; i++) {

        const art = data.requests[i];
        const item = createItemElement(art);

        item.id = 'inv-req-' + art.id;

        item.onclick = () => showEditReqWindow(art);

        requestPanel.append(item)

        setTimeout(() => item.classList.remove('invisible'), i * 100 + 100);
    }

    if(data.length >= 5) return;

    const addItemEl = createAddItemElement();

    requestPanel.append(addItemEl);

    setTimeout(() => addItemEl.classList.remove('invisible'), 100 + data.length * 100);

    addItemEl.onclick = showReqWindow;
}

function showInventoryArtifacts(data) {

    itemPanel2.innerHTML = ``;

    for(let i = 0; i < data.items.length; i++) {

        const art = data.items[i];
        const item = createItemElement(art);

        item.id = 'inv-item-' + art.id;

        item.onclick = () => showEditWindow(art);

        itemPanel2.append(item)

        setTimeout(() => item.classList.remove('invisible'), i * 100 + 100);
    }

    if(data.length >= 20) return;

    const addItemEl = createAddItemElement();

    itemPanel2.append(addItemEl);

    setTimeout(() => addItemEl.classList.remove('invisible'), 100 + data.length * 100);

    addItemEl.onclick = showAddWindow;
}

async function removeItem() {
    const res = await (await fetch('/api/remove-item', {
        method: 'POST',
        body: JSON.stringify({
            id: currentItem.id
        }),
        headers: {
            'content-type': 'application/json'
        }
    })).json();

    if(res.error) {
        return errorMessage(res.error);
    }

    inventory.items.splice(inventory.items.indexOf(inventory.items.find(item => item.id === res.removedId), 0))

    itemPanel2.removeChild(itemPanel2.querySelector('#inv-item-' + res.removedId));

    hide(addItemDiv);
    show(inventoryItemsDiv);

}

async function removeReq() {
    const res = await (await fetch('/api/remove-request', {
        method: 'POST',
        body: JSON.stringify({
            id: currentReq.id
        }),
        headers: {
            'content-type': 'application/json'
        }
    })).json();

    if(res.error) {
        return errorMessage(res.error);
    }

    inventory.requests.splice(inventory.requests.indexOf(inventory.requests.find(item => item.id === res.removedId), 0))

    requestPanel.removeChild(requestPanel.querySelector('#inv-req-' + res.removedId));

    hide(addReqDiv);
    show(inventoryItemsDiv);

}

function updateUserProfile() {
    fetch('/api/update-me').then(res => res.json()).then(
        data => {

            if(data.error) {
                return errorMessage(data.error);
            }

            user = data;
            showProfile();
        }
    )
}

async function editReq() {

    console.log(currentItem);

    const res = await (await fetch('/api/edit-request', {
        method: 'POST',
        body: JSON.stringify(currentReq),
        headers: {
            'content-type': 'application/json'
        }
    })).json();

    if(res.error) return errorMessage(res.error);

    Object.assign(inventory.requests.find(req => req.id === res.id), res);

    console.log(res);

    const item = createItemElement(res);
    requestPanel.querySelector('#inv-req-'+res.id).replaceWith(item);
    item.id = 'inv-req-' + res.id;
    item.onclick = () => showEditReqWindow(res);
    item.classList.remove('invisible')

    hide(addReqDiv);
    show(inventoryItemsDiv);

}

async function editItem() {

    console.log(currentItem);

    const res = await (await fetch('/api/edit-item', {
        method: 'POST',
        body: JSON.stringify(currentItem),
        headers: {
            'content-type': 'application/json'
        }
    })).json();

    if(res.error) return errorMessage(res.error);

    Object.assign(inventory.items.find(item => item.id === res.id), res);

    console.log(res);

    const item = createItemElement(res);
    itemPanel2.querySelector('#inv-item-'+res.id).replaceWith(item);
    item.id = 'inv-item-' + res.id;
    item.onclick = () => showEditWindow(res);
    item.classList.remove('invisible')

    hide(addItemDiv);
    show(inventoryItemsDiv);

}

function showReqWindow() {
    hide(inventoryItemsDiv);
    show(addReqDiv);

    show(addReqDiv.querySelector('#addr'));
    hide(addReqDiv.querySelector('#deleter'));
    hide(addReqDiv.querySelector('#editr'));

    addReqDiv.querySelector('#rl').textContent = 'New Request';

    updateEditTypeR();
    updateEditMinLevelR();
    updateEditMaxLevelR();
    updateEditQualityR();
}

function showAddWindow() {
    hide(inventoryItemsDiv);
    show(addItemDiv);

    show(addItemDiv.querySelector('#add'));
    hide(addItemDiv.querySelector('#delete'));
    hide(addItemDiv.querySelector('#edit'));

    addItemDiv.querySelector('#il').textContent = 'New Item';

    updateEditType();
    updateEditQuantity();
    updateEditLevel();
    updateEditQuality();
}

function showEditReqWindow(item) {
    hide(inventoryItemsDiv);
    show(addReqDiv);

    hide(addReqDiv.querySelector('#addr'));
    show(addReqDiv.querySelector('#deleter'));
    show(addReqDiv.querySelector('#editr'));

    addReqDiv.querySelector('#rl').textContent = 'Edit Request';

    Object.assign(currentReq, item);

    updateEditTypeR();
    updateEditMinLevelR();
    updateEditMaxLevelR();
    updateEditQualityR();
}

function showEditWindow(item) {
    hide(inventoryItemsDiv);
    show(addItemDiv);

    hide(addItemDiv.querySelector('#add'));
    show(addItemDiv.querySelector('#delete'));
    show(addItemDiv.querySelector('#edit'));

    addItemDiv.querySelector('.item-label').textContent = 'Edit Item';

    Object.assign(currentItem, item);

    updateEditType();
    updateEditQuantity();
    updateEditLevel();
    updateEditQuality();
}

function editWindowSetup() {
    q('#tp').onclick = () => {
        currentItem.type = (currentItem.type + 1) % 6;
        updateEditType();
    }

    q('#tm').onclick = () => {
        currentItem.type = (currentItem.type + 5) % 6;
        updateEditType();
    }

    q('#qnm').onclick = () => {
        currentItem.quantity = Math.max(currentItem.quantity - 1, 0);
        updateEditQuantity();
    }

    q('#qnp').onclick = () => {
        currentItem.quantity = Math.min(parseInt(q('#qni').value) + 1  , 30);
        updateEditQuantity();
    }

    q('#qni').oninput = () => {
        let val = parseInt(q('#qni').value);
        if(isNaN(val)) return q('#qni').value = '';
        currentItem.quantity = Math.min(Math.max(val, 0), 30);
        updateEditQuantity();
    }

    q('#lm').onclick = () => {
        currentItem.level = Math.max(currentItem.level - 1, 0);
        updateEditLevel();
    }

    q('#lp').onclick = () => {
        currentItem.level = Math.min(currentItem.level + 1, 12);
        updateEditLevel();
    }

    q('#li').oninput = () => {
        let val = parseInt(q('#li').value);
        if(isNaN(val)) return q('#li').value = '';
        currentItem.level = Math.min(Math.max(val, 1), 12);
        updateEditLevel();
    }

    q('#qli').oninput = () => {
        let val = parseInt(q('#qli').value);
        if(isNaN(val)) return q('#qli').value = '';
        currentItem.quality = Math.min(Math.max(val, 0), 400);
        updateEditQuality();
    }

    // --- Requests ---

    q('#rtp').onclick = () => {
        currentReq.type = (currentReq.type + 1) % 6;
        updateEditTypeR();
    }

    q('#rtm').onclick = () => {
        currentReq.type = (currentReq.type + 5) % 6;
        updateEditTypeR();
    }

    q('#lirmin').oninput = () => {
        let val = parseInt(q('#lirmin').value);
        if(isNaN(val)) return q('#lirmin').value = '';
        currentReq.minLevel = Math.min(Math.max(val, 1), 12);
        updateEditMinLevelR();
    }

    q('#lirmax').oninput = () => {
        let val = parseInt(q('#lirmax').value);
        if(isNaN(val)) return q('#lirmax').value = '';
        currentReq.maxLevel = Math.min(Math.max(val, 1), 12);
        updateEditMaxLevelR();
    }

    q('#qlir').oninput = () => {
        let val = parseInt(q('#qlir').value);
        if(isNaN(val)) return q('#qlir').value = '';
        currentReq.minQuality = Math.min(Math.max(val, 0), 400);
        updateEditQualityR();
    }
}

function updateEditQualityR() {
    q('#qlir').value = currentReq.minQuality;
    saveCurrentReq();
}

function updateEditMinLevelR() {
    q('#lirmin').value = currentReq.minLevel;
    saveCurrentReq();
}

function updateEditMaxLevelR() {
    q('#lirmax').value = currentReq.maxLevel;
    saveCurrentReq();
}

function updateEditTypeR() {
    q('#rti').className = `type${currentReq.type}-icon art-icon`;
    q('#rtt').className = `type${currentReq.type}`
    q('#rtt').textContent = typeStrings[currentReq.type].toUpperCase();
    saveCurrentReq();
}

function updateEditQuality() {
    q('#qli').value = currentItem.quality;
    saveCurrentItem();
}

function updateEditQuantity() {
    q('#qni').value = currentItem.quantity;
    saveCurrentItem();
}

function updateEditLevel() {
    q('#li').value = currentItem.level;
    saveCurrentItem();
}

function updateEditType() {
    q('#ti').className = `type${currentItem.type}-icon art-icon`;
    q('#tt').className = `type${currentItem.type}`
    q('#tt').textContent = typeStrings[currentItem.type].toUpperCase();
    saveCurrentItem();
}

function saveCurrentItem() {
    localStorage.currentItem = JSON.stringify(currentItem);
}

function saveCurrentReq() {
    localStorage.currentReq = JSON.stringify(currentReq);
}

function toggleCLI() {
    CLI.classList.toggle('none');
}

function setupCLI() {

    document.addEventListener('keydown', (e) => (e.ctrlKey || e.metaKey) && e.key === 'k' && toggleCLI());

    const cliInput = CLI.querySelector('.cli-input');
    cliInput.addEventListener('keydown', async (e) => {
        if(e.key === 'Enter') {
            const cliOutput = CLI.querySelector('.cli');
            cliOutput.innerHTML += `<div class="cli-output">> ${cliInput.value}</div>`;
            const result = await (await fetch('/cmd', {
                method: 'POST',
                body: JSON.stringify({
                    cmd: cliInput.value
                }),
                headers: {
                    "content-type": "application/json",
                }
            })).text();
            cliInput.value = '';
            const resultObj = JSON.parse(result);
            if(resultObj.error) {
                cliOutput.innerHTML += `<div class="cli-output cli-error">${resultObj.error}</div>`;
            } else {
                cliOutput.innerHTML += `<div class="cli-output">${JSON.stringify(resultObj, null, 4).replaceAll(/\"(.*)\"\:/g, '<label class="cli-attribute">$1</label>:').replaceAll(/: (\".*\")/g, ': <label class="cli-string">$1</label>').replaceAll(/: ([0-9]*)/g, ': <label class="cli-number">$1</label>')}</div>`;
            }
        }
    })
}

function toggleExampleDealDiv() {
    const exampleContainer = q('#example-deal');
    const exampleLink = q('#example-trigger');

    if(isHidden(exampleContainer)) {
        show(exampleContainer);
        exampleLink.textContent = '(Hide)';
    } else {
        hide(exampleContainer);
        exampleLink.textContent = '(Show)';
    }

    
}

async function addReq() {
    const res = await (await fetch('/api/add-request', {
        method: 'POST',
        body: JSON.stringify(currentReq),
        headers: {
            "content-type": "application/json",
        }
    })).json();

    if(res.error) {
        return errorMessage(res.error);
    }

    inventory.requests.push(res)

    hide(addReqDiv);
    show(inventoryItemsDiv);

    const item = createItemElement(res);
    item.classList.remove('invisible')

    item.onclick = () => showEditReqWindow(res);
    item.id = 'inv-req-' + res.id;

    requestPanel.append(item);

    const addItemEl = requestPanel.querySelector('#add-item');
    requestPanel.removeChild(addItemEl);
    requestPanel.append(addItemEl);
}

async function addItem() {
    const res = await (await fetch('/api/add-item', {
        method: 'POST',
        body: JSON.stringify(currentItem),
        headers: {
            "content-type": "application/json",
        }
    })).json();

    if(res.error) {
        return errorMessage(res.error);
    }

    inventory.items.push(res)

    hide(addItemDiv);
    show(inventoryItemsDiv);

    const item = createItemElement(res);
    item.classList.remove('invisible')

    item.onclick = () => showEditWindow(res);
    item.id = 'inv-item-' + res.id;

    itemPanel2.append(item);

    const addItemEl = itemPanel2.querySelector('#add-item');
    itemPanel2.removeChild(addItemEl);
    itemPanel2.append(addItemEl);
}

function logout() {
    fetch('/api/logout').then(res => res.json()).then(
        data => {
            if(data.code) {
                location.reload(true);
            } else {
                errorMessage(data.message);
            }
        }
    );
}

function errorMessage(message) {

    console.error(message);

    const errorDiv = q('.error-message');

    if(errorDiv.timeout1) clearTimeout(errorDiv.timeout1);
    if(errorDiv.timeout2) clearTimeout(errorDiv.timeout2);
    
    errorDiv.classList.remove('fading2');
    errorDiv.textContent = message;
    errorDiv.timeout1 = setTimeout(() => errorDiv.classList.add('fading2'), 100);
    errorDiv.timeout2 = setTimeout(() => hide(errorDiv), 3000);
    show(errorDiv);
}

function setupInventoryToggle() {

    const yi = q('#yi'), yr = q('#yr')

    yi.onclick = () => {
        yi.classList.remove('inactive');
        yr.classList.add('inactive');
        show(itemPanel2);
        hide(requestPanel);
    }

    yr.onclick = () => {
        yr.classList.remove('inactive');
        yi.classList.add('inactive');
        hide(itemPanel2);
        show(requestPanel);
    }
}

function q(query) {
    return document.querySelector(query);
}

function qa(query) {
    return document.querySelectorAll(query);
}