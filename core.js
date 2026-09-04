// core.js - Baza NI Core
(function() {
    'use strict';
    const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (document.getElementById('AUTO_COMBO_HUB')) return;

    // Wersja paczki dodatków
    const CORE_VERSION = 'v1.0.0';

    const isNI = typeof W.Engine === 'object';
    const getHero = () => (isNI ? W.Engine.hero?.d : W.hero);

    const LS_KEY = 'AUTO_COMBO_CONFIG';
    const getCharId = () => {
        const hero = getHero();
        if (hero?.id) return String(hero.id);
        if (typeof W.getCookie === 'function') return W.getCookie('mchar_id') || 'default';
        const m = document.cookie.match(/mchar_id=([^;]+)/);
        return m ? m[1] : 'default';
    };

    let ls = JSON.parse(localStorage.getItem(LS_KEY)) || {};

    // Domyślnie przy 1. instalacji wszystkie moduły są WYŁĄCZONE
    if (!ls.modules) ls.modules = {};
    if (typeof ls.modules.autoX === 'undefined') ls.modules.autoX = false;
    if (typeof ls.modules.autoParty === 'undefined') ls.modules.autoParty = false;
    if (typeof ls.modules.darkMap === 'undefined') ls.modules.darkMap = false;
    if (typeof ls.modules.mobHighlight === 'undefined') ls.modules.mobHighlight = false;
    if (typeof ls.modules.soundNotifier === 'undefined') ls.modules.soundNotifier = false;
    if (typeof ls.modules.showCollisions === 'undefined') ls.modules.showCollisions = false;

    // Tylko Hub jest widoczny przy 1. instalacji
    if (typeof ls.hubVisible === 'undefined') ls.hubVisible = true;
    if (typeof ls.expandedHub === 'undefined') ls.expandedHub = true;

    // Wszystkie podokna GUI domyślnie ZAMKNIĘTE
    if (!ls.guiVisible) ls.guiVisible = {};
    if (typeof ls.guiVisible.autoX === 'undefined') ls.guiVisible.autoX = false;
    if (typeof ls.guiVisible.autoParty === 'undefined') ls.guiVisible.autoParty = false;
    if (typeof ls.guiVisible.darkMap === 'undefined') ls.guiVisible.darkMap = false;
    if (typeof ls.guiVisible.mobHighlight === 'undefined') ls.guiVisible.mobHighlight = false;
    if (typeof ls.guiVisible.soundNotifier === 'undefined') ls.guiVisible.soundNotifier = false;
    if (typeof ls.guiVisible.showCollisions === 'undefined') ls.guiVisible.showCollisions = false;

    const getValidPos = (posObj, defaultX, defaultY, width = 130) => {
        const screenW = window.innerWidth || document.documentElement.clientWidth || 1200;
        const screenH = window.innerHeight || document.documentElement.clientHeight || 800;
        const x = parseInt(posObj?.x, 10);
        const y = parseInt(posObj?.y, 10);
        return {
            x: (!isNaN(x) && x >= 0 && x <= screenW - width) ? x : defaultX,
            y: (!isNaN(y) && y >= 0 && y <= screenH - 60) ? y : defaultY
        };
    };

    // Funkcja wyliczająca środek ekranu dla dowolnego okna
    const getCenterPos = (width = 126, height = 150) => {
        const screenW = window.innerWidth || document.documentElement.clientWidth || 1200;
        const screenH = window.innerHeight || document.documentElement.clientHeight || 800;
        return {
            x: Math.max(10, Math.round((screenW - width) / 2)),
            y: Math.max(10, Math.round((screenH - height) / 2))
        };
    };

    // Wyśrodkowanie okien przy pierwszym uruchomieniu
    const centerHub = getCenterPos(234, 300);
    ls.posHub = getValidPos(ls.posHub, centerHub.x, centerHub.y, 234);

    const centerDefault = getCenterPos(126, 130);
    const centerSound = getCenterPos(215, 360);

    if (!ls.posAutoX) ls.posAutoX = getValidPos(ls.posAutoX, centerDefault.x, centerDefault.y, 126);
    if (!ls.posAutoParty) ls.posAutoParty = getValidPos(ls.posAutoParty, centerDefault.x, centerDefault.y, 126);
    if (!ls.posDarkMap) ls.posDarkMap = getValidPos(ls.posDarkMap, centerDefault.x, centerDefault.y, 126);
    if (!ls.posMobHighlight) ls.posMobHighlight = getValidPos(ls.posMobHighlight, centerDefault.x, centerDefault.y, 126);
    if (!ls.posShowCollisions) ls.posShowCollisions = getValidPos(ls.posShowCollisions, centerDefault.x, centerDefault.y, 126);
    if (!ls.posSoundNotifier) ls.posSoundNotifier = getValidPos(ls.posSoundNotifier, centerSound.x, centerSound.y, 215);

    const saveLS = () => localStorage.setItem(LS_KEY, JSON.stringify(ls));
    saveLS();

    const sendCmd = (cmd) => {
        if (W._g) {
            W._g(cmd);
        } else if (isNI && W.Engine?.communication?.send) {
            W.Engine.communication.send(cmd);
        }
    };

    // Klan
    const clanMemberIds = new Set();
    const clanMemberNicks = new Set();
    let lastClanFetch = 0;

    const getHeroClanInfo = () => {
        const hero = getHero();
        let id = null, name = null;
        if (hero) {
            const c = hero.clan;
            if (c && typeof c === 'object') { id = c.id ? String(c.id) : null; name = c.name ? String(c.name).toLowerCase().trim() : null; }
            else if (typeof c === 'string' && c.trim() !== '') name = c.toLowerCase().trim();
            else if (typeof c === 'number' && c > 0) id = String(c);
            if (hero.clanInfo && typeof hero.clanInfo === 'object') {
                if (!id && hero.clanInfo.id) id = String(hero.clanInfo.id);
                if (!name && hero.clanInfo.name) name = String(hero.clanInfo.name).toLowerCase().trim();
            }
            if (!name && hero.clanName) name = String(hero.clanName).toLowerCase().trim();
            if (!id && hero.clanId) id = String(hero.clanId);
        }
        const engineClan = isNI ? W.Engine?.clan : W.g?.clan;
        if (engineClan && typeof engineClan === 'object') {
            if (!id && engineClan.id) id = String(engineClan.id);
            if (!name && engineClan.name) name = String(engineClan.name).toLowerCase().trim();
        }
        return { id, name, hasClan: Boolean((id && id !== '0') || (name && name !== '')) };
    };

    const getPlayerClanInfo = (p) => {
        if (!p) return { id: null, name: null, hasClan: false };
        let id = null, name = null;
        const c = p.clan;
        if (c && typeof c === 'object') { id = c.id ? String(c.id) : null; name = c.name ? String(c.name).toLowerCase().trim() : null; }
        else if (typeof c === 'string' && c.trim() !== '') name = c.toLowerCase().trim();
        else if (typeof c === 'number' && c > 0) id = String(c);
        if (p.clanInfo && typeof p.clanInfo === 'object') {
            if (!id && p.clanInfo.id) id = String(p.clanInfo.id);
            if (!name && p.clanInfo.name) name = String(p.clanInfo.name).toLowerCase().trim();
        }
        if (!name && p.clanName) name = String(p.clanName).toLowerCase().trim();
        if (!id && p.clanId) id = String(p.clanId);
        return { id, name, hasClan: Boolean((id && id !== '0') || (name && name !== '')) };
    };

    const fetchClanMembers = () => {
        const heroClan = getHeroClanInfo();
        if (!heroClan.hasClan) return;
        const now = Date.now();
        if (now - lastClanFetch < 12000) return;
        lastClanFetch = now;
        sendCmd('clan&a=members');
    };

    const parseClanData = (d) => {
        if (!d) return;
        if (d.members2 && Array.isArray(d.members2)) {
            for (let i = 0; i < d.members2.length; i += 10) {
                const id = parseInt(d.members2[i], 10);
                const nick = d.members2[i + 1];
                if (id && !isNaN(id)) clanMemberIds.add(id);
                if (nick && typeof nick === 'string') clanMemberNicks.add(nick.toLowerCase().trim());
            }
        }
        if (d.members && typeof d.members === 'object') {
            if (Array.isArray(d.members)) {
                d.members.forEach(m => {
                    if (m && typeof m === 'object') {
                        if (m.id) clanMemberIds.add(parseInt(m.id, 10));
                        if (m.nick) clanMemberNicks.add(String(m.nick).toLowerCase().trim());
                    } else if (typeof m === 'number' || typeof m === 'string') {
                        const num = parseInt(m, 10);
                        if (num && !isNaN(num)) clanMemberIds.add(num);
                    }
                });
            } else {
                Object.entries(d.members).forEach(([id, m]) => {
                    const numId = parseInt(id, 10);
                    if (numId && !isNaN(numId)) clanMemberIds.add(numId);
                    if (m && m.nick) clanMemberNicks.add(String(m.nick).toLowerCase().trim());
                });
            }
        }
    };

    const isSameClan = (p) => {
        const heroClan = getHeroClanInfo();
        if (!heroClan.hasClan) return false;
        const pId = parseInt(p.id, 10);
        if (pId && clanMemberIds.has(pId)) return true;
        const pNick = (p.nick || '').toLowerCase().trim();
        if (pNick && clanMemberNicks.has(pNick)) return true;
        const pClan = getPlayerClanInfo(p);
        if (pClan.hasClan) {
            if (heroClan.id && pClan.id && heroClan.id === pClan.id) return true;
            if (heroClan.name && pClan.name && heroClan.name === pClan.name) return true;
        }
        return false;
    };

    // UI Helpers & Icons
    const checkmarkSvg = `<svg class="ac-checkmark-svg" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#38c268" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8.5 6.5,12 13,3.5"/></svg>`;
    const plusMinusSvg = `<svg class="ac-plus-minus-svg" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="1" y1="5" x2="9" y2="5"></line><line class="ac-vertical-bar" x1="5" y1="1" x2="5" y2="9"></line></svg>`;
    const guiWindowSvg = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="2"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><circle cx="4.5" cy="4.5" r="0.75" fill="currentColor"/></svg>`;

    // Dedykowane ikony dla kafelków w Hubie i na mapie
    const iconAutoX = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="3" x2="5.5" y2="10.5"/><polyline points="10 3 13 3 13 6"/><line x1="4.5" y1="9.5" x2="6.5" y2="11.5"/><line x1="3" y1="13" x2="4.5" y2="11.5"/><line x1="3" y1="13" x2="1.5" y2="14.5"/><line x1="3" y1="3" x2="10.5" y2="10.5"/><polyline points="6 3 3 3 3 6"/><line x1="9.5" y1="11.5" x2="11.5" y2="9.5"/><line x1="13" y1="13" x2="11.5" y2="11.5"/><line x1="13" y1="13" x2="14.5" y2="14.5"/></svg>`;
    const iconAutoParty = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 13.5v-1a2.5 2.5 0 0 0-2.5-2.5h-4A2.5 2.5 0 0 0 2 12.5v1"/><circle cx="6.5" cy="5" r="2.2"/><path d="M13.5 13.5v-1a2.3 2.3 0 0 0-1.7-2.2"/><path d="M10 2.8a2.2 2.2 0 0 1 0 4.4"/></svg>`;
    const iconDarkMap = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5 4.5 4.5 0 0 0 13.5 9.2Z"/></svg>`;
    const iconMobHighlight = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><line x1="8" y1="1" x2="8" y2="3.5"/><line x1="8" y1="12.5" x2="8" y2="15"/><line x1="1" y1="8" x2="3.5" y2="8"/><line x1="12.5" y1="8" x2="15" y2="8"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>`;
    const iconSound = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="2 5.5 5.5 5.5 9 2.5 9 13.5 5.5 10.5 2 10.5 2 5.5" stroke-linejoin="round"/><path d="M11.5 5.5a3.8 3.8 0 0 1 0 5"/><path d="M13.5 3.5a6.5 6.5 0 0 1 0 9"/></svg>`;
    const iconCollisions = `<svg class="ac-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="8" y1="2.5" x2="8" y2="8"/><line x1="5" y1="8" x2="5" y2="13.5"/><line x1="11" y1="8" x2="11" y2="13.5"/></svg>`;

    let highestZ = 10000;
    const bringToFront = (el) => { if (!el) return; highestZ += 1; el.style.zIndex = String(highestZ); };

    const makeDraggable = (mainEl, headerEl, posKey, ignoreSelectors = []) => {
        let isDragging = false, startX, startY, initialLeft, initialTop;
        mainEl.addEventListener('mousedown', () => bringToFront(mainEl));
        headerEl.addEventListener('mousedown', (e) => {
            for (const sel of ignoreSelectors) { if (e.target.closest(sel)) return; }
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initialLeft = mainEl.offsetLeft; initialTop = mainEl.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            mainEl.style.left = `${initialLeft + (e.clientX - startX)}px`;
            mainEl.style.top = `${initialTop + (e.clientY - startY)}px`;
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                ls[posKey].x = parseInt(mainEl.style.left, 10) || 0;
                ls[posKey].y = parseInt(mainEl.style.top, 10) || 0;
                saveLS();
            }
        });
    };

    const packetListeners = [];
    const onPacket = (cb) => packetListeners.push(cb);

    // ==========================================
    // DOCK IKON W PRAWYM DOLNYM ROGU GRY (NI)
    // ==========================================
    const activeDock = document.createElement('div');
    activeDock.setAttribute('id', 'AUTO_COMBO_ACTIVE_DOCK');
    activeDock.className = 'ac-active-dock';

    // Funkcja podpinająca Dock do kontenera okna gry Margonem NI
    const attachDock = () => {
        const gameContainer = document.querySelector('.game-window-positioner');
        if (gameContainer) {
            if (activeDock.parentElement !== gameContainer) {
                gameContainer.appendChild(activeDock);
            }
            return true;
        }
        if (!activeDock.parentElement) {
            document.body.appendChild(activeDock);
        }
        return false;
    };

    if (!attachDock()) {
        const dockInterval = setInterval(() => {
            if (attachDock()) clearInterval(dockInterval);
        }, 200);
    }

    const modulesDefinition = [
        { key: 'autoX', title: 'AUTO X', desc: 'Automatyczne atakowanie przeciwników z szybką walką.', icon: iconAutoX },
        { key: 'autoParty', title: 'AUTO PARTY', desc: 'Zapraszanie, auto-akceptacja oraz rozwiązywanie grupy.', icon: iconAutoParty },
        { key: 'darkMap', title: 'DARK MAP', desc: 'Przyciemnianie okna mapy i gry.', icon: iconDarkMap },
        { key: 'mobHighlight', title: 'MOB HIGHLIGHT', desc: 'Podświetlanie grup potworów i ramki Elit II.', icon: iconMobHighlight },
        { key: 'soundNotifier', title: 'SOUND DETECT', desc: 'Powiadomienia dźwiękowe o E2, Herosach, Tytanach i graczach.', icon: iconSound },
        { key: 'showCollisions', title: 'KOLIZJE', desc: 'Podświetlanie zablokowanych pól mapy.', icon: iconCollisions }
    ];

    const dockButtons = {};
    modulesDefinition.forEach(mod => {
        const btn = document.createElement('button');
        btn.className = 'ac-dock-btn';
        btn.setAttribute('aria-label', mod.title);
        btn.innerHTML = `${mod.icon}<span class="ac-dock-tooltip">${mod.title}</span>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            ls.guiVisible[mod.key] = !ls.guiVisible[mod.key];
            saveLS();
            updateAllVisibilities();
        });
        activeDock.appendChild(btn);
        dockButtons[mod.key] = btn;
    });

    // ==========================================
    // BUDOWA GŁÓWNEGO HUB-A (6 KAFELKÓW)
    // ==========================================
    const hubMain = document.createElement('div');
    hubMain.setAttribute('id', 'AUTO_COMBO_HUB');
    hubMain.className = 'ac-window';
    hubMain.style.left = `${ls.posHub.x}px`;
    hubMain.style.top = `${ls.posHub.y}px`;

    const hubHeader = document.createElement('div');
    hubHeader.className = 'ac-header';

    const hubTitle = document.createElement('span');
    hubTitle.className = 'ac-title';
    hubTitle.innerText = 'NI CORE';
    hubHeader.appendChild(hubTitle);

    const expandHubBtn = document.createElement('button');
    expandHubBtn.className = 'ac-expand-btn';
    expandHubBtn.innerHTML = plusMinusSvg;
    hubHeader.appendChild(expandHubBtn);

    const hubCloseBtn = document.createElement('button');
    hubCloseBtn.className = 'ac-close-btn';
    hubCloseBtn.innerHTML = '&#215;';
    hubCloseBtn.setAttribute('title', 'Zamknij menu');
    hubCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.hubVisible = false;
        saveLS();
        updateAllVisibilities();
    });
    hubHeader.appendChild(hubCloseBtn);
    hubMain.appendChild(hubHeader);

    const hubBody = document.createElement('div');
    hubBody.className = 'ac-body';

    // Obsługa płynnego scrollowania kółkiem myszy
    hubBody.addEventListener('wheel', (e) => {
        e.stopPropagation();
        e.preventDefault();
        hubBody.scrollTop += e.deltaY;
    }, { passive: false });

    function createHubItem(modKey, titleText, descText, iconSvg) {
        const item = document.createElement('div');
        item.className = `ac-hub-item ${ls.modules[modKey] ? 'AC-ON' : 'AC-OFF'}`;
        item.setAttribute('title', `Kliknij kafelek, aby włączyć lub wyłączyć ${titleText}`);
        item.addEventListener('click', () => {
            ls.modules[modKey] = !ls.modules[modKey];
            saveLS();
            updateAllVisibilities();
        });

        const row = document.createElement('div');
        row.className = 'ac-hub-row';
        const titleGroup = document.createElement('div');
        titleGroup.className = 'ac-hub-title-group';

        if (iconSvg) {
            const iconWrapper = document.createElement('span');
            iconWrapper.className = 'ac-hub-item-icon-wrapper';
            iconWrapper.innerHTML = iconSvg;
            titleGroup.appendChild(iconWrapper);
        }

        const title = document.createElement('span');
        title.className = 'ac-hub-item-title';
        title.innerText = titleText;
        titleGroup.appendChild(title);
        row.appendChild(titleGroup);

        const guiBtn = document.createElement('button');
        guiBtn.className = `ac-hub-gui-btn ${ls.guiVisible[modKey] ? 'AC-ON' : 'AC-OFF'}`;
        guiBtn.setAttribute('title', `Otwórz / Ukryj okno ${titleText}`);
        guiBtn.innerHTML = guiWindowSvg;
        guiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ls.guiVisible[modKey] = !ls.guiVisible[modKey];
            saveLS();
            updateAllVisibilities();
        });
        row.appendChild(guiBtn);
        item.appendChild(row);

        const desc = document.createElement('div');
        desc.className = 'ac-hub-desc';
        desc.innerText = descText;
        item.appendChild(desc);

        return { item, guiBtn };
    }

    const hubItems = {};
    modulesDefinition.forEach(mod => {
        const hItem = createHubItem(mod.key, mod.title, mod.desc, mod.icon);
        hubBody.appendChild(hItem.item);
        hubItems[mod.key] = hItem;
    });

    hubMain.appendChild(hubBody);

    // ==========================================
    // DOLNY PASEK Z WERSJĄ PACZKI (FOOTER)
    // ==========================================
    const hubFooter = document.createElement('div');
    hubFooter.className = 'ac-hub-footer';

    const footerLabel = document.createElement('span');
    footerLabel.className = 'ac-hub-footer-label';
    footerLabel.innerText = 'WERSJA PACZKI';
    hubFooter.appendChild(footerLabel);

    const footerVer = document.createElement('span');
    footerVer.className = 'ac-hub-footer-ver';
    footerVer.innerText = CORE_VERSION;
    hubFooter.appendChild(footerVer);

    hubMain.appendChild(hubFooter);

    document.body.appendChild(hubMain);
    makeDraggable(hubMain, hubHeader, 'posHub', ['.ac-close-btn', '.ac-expand-btn']);

    const updateHubExpandState = () => {
        expandHubBtn.classList.toggle('is-expanded', ls.expandedHub);
        expandHubBtn.setAttribute('title', ls.expandedHub ? 'Zwiń menu' : 'Rozwiń menu');
        hubBody.style.display = ls.expandedHub ? 'flex' : 'none';
        hubFooter.style.display = ls.expandedHub ? 'flex' : 'none';
    };
    expandHubBtn.addEventListener('click', (e) => { e.stopPropagation(); ls.expandedHub = !ls.expandedHub; updateHubExpandState(); saveLS(); });
    updateHubExpandState();

    const registeredWindows = {};
    const registerWindow = (key, data) => {
        registeredWindows[key] = data;
        updateAllVisibilities();
    };

    const updateAllVisibilities = () => {
        attachDock();
        hubMain.style.display = ls.hubVisible ? 'block' : 'none';

        modulesDefinition.forEach(mod => {
            const isModActive = Boolean(ls.modules[mod.key]);
            const isGuiOpen = Boolean(ls.guiVisible[mod.key]);

            const hObj = hubItems[mod.key];
            if (hObj) {
                hObj.item.className = `ac-hub-item ${isModActive ? 'AC-ON' : 'AC-OFF'}`;
                hObj.guiBtn.className = `ac-hub-gui-btn ${isGuiOpen ? 'AC-ON' : 'AC-OFF'}`;
            }

            const dockBtn = dockButtons[mod.key];
            if (dockBtn) {
                dockBtn.style.display = isModActive ? 'flex' : 'none';
                dockBtn.classList.toggle('is-open', isGuiOpen);
            }
        });

        for (const [key, win] of Object.entries(registeredWindows)) {
            if (win.mainEl) {
                win.mainEl.style.display = ls.guiVisible[key] ? 'block' : 'none';
                win.mainEl.style.opacity = ls.modules[key] ? '1' : '0.5';
                if (ls.guiVisible[key]) bringToFront(win.mainEl);
            }
            if (win.statusBtn) {
                win.statusBtn.className = `ac-status-btn ${ls.modules[key] ? 'AC-ON' : 'AC-OFF'}`;
            }
        }

        if (ls.hubVisible) bringToFront(hubMain);
        const widgetBtn = document.querySelector(`.widget-button[data-name="auto_combo"], .widget-button .icon.auto_combo`)?.closest('.widget-button');
        if (widgetBtn) widgetBtn.classList.toggle('active', Boolean(ls.hubVisible));
    };

    let lastToggleTime = 0;
    const toggleHub = () => {
        const now = Date.now();
        if (now - lastToggleTime < 180) return;
        lastToggleTime = now;
        ls.hubVisible = !ls.hubVisible;
        saveLS();
        updateAllVisibilities();
    };

    // Widget NI
    const initNIWidget = () => {
        if (!isNI || !W.Engine?.widgetManager) return;
        const widgetName = 'auto_combo';
        const defaultPosition = [6, 'bottom-right-additional'];
        const addWidgetToDefaultWidgetSet = () => {
            try { W.Engine.widgetManager.addKeyToDefaultWidgetSet(widgetName, defaultPosition[0], defaultPosition[1], 'NI CORE', 'green', toggleHub); } catch (e) {}
        };
        const createButtonNI = () => {
            try {
                if (W.Engine.interfaceStart && Object.keys(W.Engine.widgetManager.getDefaultWidgetSet()).includes(widgetName)) {
                    let widgetPos = defaultPosition;
                    try {
                        if (W.Engine.serverStorage && W.Engine.widgetManager.getPathToHotWidgetVersion) {
                            const sPos = W.Engine.serverStorage.get(W.Engine.widgetManager.getPathToHotWidgetVersion());
                            if (sPos && sPos[widgetName]) widgetPos = sPos[widgetName];
                        }
                    } catch (e) {}
                    const existing = document.querySelector(`.widget-button[data-name="${widgetName}"], .widget-button .icon.${widgetName}`);
                    if (existing) existing.closest('.widget-button')?.remove();
                    W.Engine.widgetManager.createOneWidget(widgetName, { [widgetName]: widgetPos }, true, []);
                    attachDock();
                    updateAllVisibilities();
                }
            } catch (e) {}
        };

        const origAddWidgetButtons = W.Engine.widgetManager.addWidgetButtons;
        if (origAddWidgetButtons && !W._autoComboWidgetHooked) {
            W._autoComboWidgetHooked = true;
            W.Engine.widgetManager.addWidgetButtons = function() {
                const res = origAddWidgetButtons.apply(this, arguments);
                addWidgetToDefaultWidgetSet();
                createButtonNI();
                W.Engine.widgetManager.addWidgetButtons = origAddWidgetButtons;
                return res;
            };
        }
        addWidgetToDefaultWidgetSet();
        if (W.Engine.interfaceStart) {
            createButtonNI();
            attachDock();
        } else {
            const checkStart = setInterval(() => {
                if (W.Engine.interfaceStart) {
                    clearInterval(checkStart);
                    addWidgetToDefaultWidgetSet();
                    createButtonNI();
                    attachDock();
                }
            }, 250);
        }
    };
    if (isNI) initNIWidget();

    // Pakiety
    const hookPackets = () => {
        const comm = W.Engine?.communication;
        if (comm && typeof comm.parseJSON === 'function' && !W._autoFastNIHooked) {
            W._autoFastNIHooked = true;
            const origParseJSON = comm.parseJSON;
            comm.parseJSON = function(data) {
                let d = data;
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) {} }

                let isPartyAsk = false;
                if (d && typeof d === 'object') {
                    if (ls.modules.autoParty && ls.party && ls.party.autoAccept && d.ask) {
                        const askRe = typeof d.ask === 'object' ? (d.ask.re || '') : String(d.ask);
                        if (askRe.includes('party&a=accept')) {
                            isPartyAsk = true;
                            const cmd = askRe.includes('answer=') ? `${askRe}1` : `${askRe}&answer=1`;
                            sendCmd(cmd);
                            delete d.ask;
                            if (typeof data === 'string') { try { arguments[0] = JSON.stringify(d); } catch (err) {} }
                        }
                    }
                }

                const result = origParseJSON.apply(this, arguments);
                if (isPartyAsk && result && typeof result === 'object' && result.ask) delete result.ask;

                const targetData = result || d;
                parseClanData(targetData);
                packetListeners.forEach(fn => { try { fn(targetData); } catch (e) {} });
                return result;
            };
        }
    };

    setInterval(hookPackets, 25);

    // Arkusz stylów
    const style = document.createElement('style');
    style.innerHTML = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Poppins:wght@600;700&display=swap');

.main-buttons-container .widget-button .icon.auto_combo,
.widget-button .icon.auto_combo {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='bgGrad' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%2318241b'/%3E%3Cstop offset='100%25' stop-color='%230b110c'/%3E%3C/linearGradient%3E%3ClinearGradient id='coreGrad' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2348d672'/%3E%3Cstop offset='100%25' stop-color='%231f8f4a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M16 2.8 L27 8.2 V18.8 C27 24.2 22 28.2 16 30 C10 28.2 5 24.2 5 18.8 V8.2 Z' fill='url(%23bgGrad)' stroke='%2338c268' stroke-width='1.8' stroke-linejoin='round'/%3E%3Ccircle cx='16' cy='16' r='6.6' fill='none' stroke='%2338c268' stroke-width='1.2' stroke-dasharray='4.2 2.2' opacity='0.75'/%3E%3Cpath d='M16 9.5 L19.8 16 L16 22.5 L12.2 16 Z' fill='url(%23coreGrad)'/%3E%3Ccircle cx='16' cy='16' r='2.2' fill='%23ffffff'/%3E%3Cline x1='16' y1='4.5' x2='16' y2='7.5' stroke='%2338c268' stroke-width='1.8' stroke-linecap='round'/%3E%3Cline x1='16' y1='24.5' x2='16' y2='27.5' stroke='%2338c268' stroke-width='1.8' stroke-linecap='round'/%3E%3Ccircle cx='9.5' cy='10.5' r='1.2' fill='%2338c268'/%3E%3Ccircle cx='22.5' cy='10.5' r='1.2' fill='%2338c268'/%3E%3C/svg%3E");
    background-position: center;
    background-repeat: no-repeat;
    background-size: 21px 21px;
    transition: filter 0.18s, transform 0.15s;
}

.main-buttons-container .widget-button.active .icon.auto_combo,
.widget-button.active .icon.auto_combo {
    filter: drop-shadow(0 0 4px #38c268) brightness(1.2);
    transform: scale(1.05);
}

/* ==========================================
   DOCK IKON W PRAWYM DOLNYM ROGU GRY (NI)
   ========================================== */
.ac-active-dock {
    position: absolute;
    bottom: 10px;
    right: 10px;
    display: flex;
    flex-direction: row-reverse;
    gap: 6px;
    z-index: 9998;
    pointer-events: auto;
    user-select: none;
}

.ac-dock-btn {
    position: relative;
    width: 27px;
    height: 27px;
    border-radius: 5px;
    background: linear-gradient(180deg, #1f2127 0%, #131418 100%);
    border: 1px solid rgba(56, 194, 104, 0.45);
    color: #38c268;
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7), 0 0 5px rgba(56, 194, 104, 0.25);
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.ac-dock-btn svg {
    width: 14px;
    height: 14px;
    display: block;
    transition: transform 0.15s ease;
}

.ac-dock-btn:hover {
    transform: translateY(-2px);
    border-color: #52e385;
    background: linear-gradient(180deg, #262932 0%, #181a20 100%);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.8), 0 0 8px rgba(56, 194, 104, 0.45);
    color: #ffffff;
}

.ac-dock-btn:hover svg {
    transform: scale(1.1);
}

.ac-dock-btn:active {
    transform: translateY(0) scale(0.94);
}

.ac-dock-btn.is-open {
    background: linear-gradient(180deg, #243b2b 0%, #16241a 100%);
    border-color: #38c268;
    box-shadow: 0 0 8px rgba(56, 194, 104, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* Dymek z nazwą modułu po najechaniu */
.ac-dock-tooltip {
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    background: #17181c;
    border: 1px solid rgba(56, 194, 104, 0.55);
    color: #e2e4e9;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 3px 6px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.85), 0 0 6px rgba(56, 194, 104, 0.25);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
    z-index: 10001;
    font-family: inherit;
    line-height: 1;
}

.ac-dock-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px 4px 0 4px;
    border-style: solid;
    border-color: rgba(56, 194, 104, 0.55) transparent transparent transparent;
}

.ac-dock-btn:hover .ac-dock-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}

/* Styl bazowy okien */
.ac-window {
    position: absolute;
    width: 126px;
    background: #17181c;
    border: 1px solid rgba(82, 88, 102, 0.45);
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    z-index: 10000;
    font-family: 'Nunito', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #e2e4e9;
    user-select: none;
    box-sizing: border-box;
    transition: opacity 0.2s ease;
}

/* ==========================================
   NOWY STYL HUB-A ZGODNY Z MARGONEM NI
   ========================================== */
#AUTO_COMBO_HUB {
    width: 234px;
    background: linear-gradient(180deg, #1b1c22 0%, #131417 100%);
    border: 1px solid #363a43;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.09);
    border-radius: 6px;
}

#AUTO_COMBO_HUB .ac-header {
    background: linear-gradient(180deg, #262931 0%, #1e2026 100%);
    height: 25px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.65);
}

#AUTO_COMBO_HUB .ac-title {
    left: 10px;
    right: 36px;
    justify-content: flex-start;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.9px;
    color: #e4e7eb;
}

#AUTO_COMBO_HUB .ac-body {
    padding: 6px 5px 6px 6px;
    gap: 4px;
    max-height: 185px;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    background: #121316;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.35);
}

#AUTO_COMBO_HUB .ac-body::-webkit-scrollbar {
    width: 5px !important;
}

#AUTO_COMBO_HUB .ac-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.35) !important;
    border-radius: 3px;
}

#AUTO_COMBO_HUB .ac-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.22) !important;
    border-radius: 3px;
    transition: background 0.15s;
}

#AUTO_COMBO_HUB .ac-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4) !important;
}

/* Dolny pasek z wersją (Footer) */
.ac-hub-footer {
    height: 22px;
    padding: 0 8px;
    background: linear-gradient(180deg, #181a1f 0%, #121316 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    user-select: none;
}

.ac-hub-footer-label {
    font-size: 7.8px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: #6d7380;
    text-transform: uppercase;
}

.ac-hub-footer-ver {
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.4px;
    color: #38c268;
    background: rgba(56, 194, 104, 0.12);
    border: 1px solid rgba(56, 194, 104, 0.3);
    border-radius: 3px;
    padding: 1px 5px;
    line-height: 1;
}

/* Kafelki w Hubie */
.ac-hub-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 8px;
    border-radius: 4px;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0 !important;
    transition: all 0.15s ease;
}

.ac-hub-item.AC-ON {
    background: linear-gradient(180deg, rgba(32, 54, 38, 0.72) 0%, rgba(18, 32, 22, 0.82) 100%);
    border: 1px solid rgba(56, 194, 104, 0.55);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.ac-hub-item.AC-ON:hover {
    background: linear-gradient(180deg, rgba(40, 68, 48, 0.82) 0%, rgba(24, 42, 29, 0.9) 100%);
    border-color: rgba(72, 214, 114, 0.85);
    box-shadow: 0 2px 7px rgba(56, 194, 104, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.ac-hub-item.AC-OFF {
    background: #17191d;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.ac-hub-item.AC-OFF:hover {
    background: #1e2026;
    border-color: rgba(255, 255, 255, 0.15);
}

.ac-hub-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
}

.ac-hub-title-group {
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
}

.ac-hub-item-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: color 0.15s, filter 0.15s;
}

.ac-item-icon {
    width: 13px;
    height: 13px;
    display: block;
}

.ac-hub-item.AC-ON .ac-hub-item-icon-wrapper {
    color: #38c268;
    filter: drop-shadow(0 0 3px rgba(56, 194, 104, 0.5));
}

.ac-hub-item.AC-OFF .ac-hub-item-icon-wrapper {
    color: #626875;
}

.ac-hub-item.AC-OFF:hover .ac-hub-item-icon-wrapper {
    color: #9299a6;
}

.ac-hub-item-title {
    font-size: 9.3px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: color 0.15s;
}

.ac-hub-item.AC-ON .ac-hub-item-title {
    color: #e5f8ec;
}

.ac-hub-item.AC-OFF .ac-hub-item-title {
    color: #8c93a0;
}

.ac-hub-gui-btn {
    width: 18px;
    height: 18px;
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.ac-hub-gui-btn:hover {
    background: rgba(255, 255, 255, 0.12) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    color: #ffffff !important;
}

.ac-hub-gui-btn.AC-ON {
    color: #38c268 !important;
    border-color: rgba(56, 194, 104, 0.4) !important;
    background: rgba(56, 194, 104, 0.12) !important;
}

.ac-hub-gui-btn.AC-OFF {
    color: rgba(255, 255, 255, 0.4) !important;
}

.ac-hub-desc {
    font-size: 8.8px;
    line-height: 12px;
    letter-spacing: 0.2px;
    text-align: left;
    padding: 0 0 1px 0;
    box-sizing: border-box;
    transition: color 0.15s;
    font-weight: 600;
    pointer-events: none;
}

.ac-hub-item.AC-ON .ac-hub-desc {
    color: rgba(215, 235, 220, 0.82);
}

.ac-hub-item.AC-OFF .ac-hub-desc {
    color: #646a77;
}

/* Paski nagłówków i bazowe elementy GUI */
.ac-header {
    position: relative;
    background: #21232a;
    cursor: move;
    box-sizing: border-box;
    height: 23px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.5);
}

.ac-title {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 20px;
    right: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    color: #c9cdd4;
    text-transform: uppercase;
    white-space: nowrap;
    line-height: 1;
}

#AUTO_X_GUI .ac-title { left: 20px; right: 20px; }
#AUTO_PARTY_GUI .ac-title { left: 20px; right: 32px; }
#DARK_MAP_GUI .ac-title { left: 20px; right: 20px; }
#MOB_HIGHLIGHT_GUI .ac-title { left: 20px; right: 20px; }
#SOUND_NOTIFIER_GUI .ac-title { left: 20px; right: 20px; }
#SHOW_COLLISIONS_GUI .ac-title { left: 20px; right: 20px; }

.ac-status-btn {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    z-index: 2;
    transition: background 0.18s, box-shadow 0.18s, border-color 0.18s, transform 0.12s;
}

.ac-status-btn:hover { transform: scale(1.18); }
.ac-status-btn:active { transform: scale(0.92); }

.ac-status-btn.AC-ON {
    background: #38c268 !important;
    border: 1px solid #73e89a !important;
    box-shadow: 0 0 5px rgba(56, 194, 104, 0.8) !important;
}

.ac-status-btn.AC-OFF {
    background: #252830 !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    box-shadow: none !important;
}

.ac-status-btn.AC-OFF:hover {
    border-color: rgba(255, 255, 255, 0.4) !important;
    background: #2d313b !important;
}

.ac-expand-btn {
    position: absolute;
    top: 5px;
    right: 18px;
    width: 12px;
    height: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.15s, transform 0.12s;
    box-sizing: content-box;
    z-index: 2;
}

.ac-expand-btn:hover { color: #ffffff; }
.ac-expand-btn:active { transform: scale(0.92); }

.ac-plus-minus-svg {
    position: relative;
    z-index: 1;
    width: 10px;
    height: 10px;
    display: block;
    stroke: currentColor;
    pointer-events: none;
}

.ac-vertical-bar {
    transform-origin: 5px 5px;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.16s ease;
}

.ac-expand-btn.is-expanded .ac-vertical-bar {
    transform: rotate(90deg) scale(0);
    opacity: 0;
}

.ac-close-btn {
    position: absolute;
    top: 4px;
    right: 5px;
    width: 12px;
    height: 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    line-height: 14px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, transform 0.12s;
    outline: none;
    box-sizing: content-box;
    z-index: 2;
}

.ac-close-btn:hover { color: #ff5555; transform: scale(1.15); }

.ac-body {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: #17181c;
    box-sizing: border-box;
}

.ac-toggle-label {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: rgba(255, 255, 255, 0.75);
    user-select: none;
    cursor: pointer;
    flex: 1;
    transition: color 0.15s;
}

.ac-toggle-label:hover {
    color: #ffffff;
}

.ac-row {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
}

.ac-square-btn {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    flex-shrink: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.ac-checkmark-svg {
    display: block;
    transform-origin: 50% 50%;
    animation: ac-check-from-center 0.24s cubic-bezier(0.25, 1.25, 0.5, 1) forwards;
}

@keyframes ac-check-from-center {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px rgba(56, 194, 104, 0.6)); }
}

.ac-square-btn.AC-ON {
    background: #1f2722 !important;
    border-color: rgba(56, 194, 104, 0.65) !important;
    box-shadow: 0 0 4px rgba(56, 194, 104, 0.3) !important;
}

.ac-square-btn.AC-ON:hover {
    background: #25332a !important;
    border-color: #38c268 !important;
}

.ac-square-btn.AC-OFF {
    background: #131417 !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
}

.ac-square-btn.AC-OFF:hover {
    background: #1c1e24 !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
}

.ac-input {
    flex: 1 1 0;
    min-width: 0;
    width: 100%;
    height: 18px;
    line-height: 16px;
    background: #121316;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    color: #e2e4e9;
    font-size: 9.5px;
    font-weight: bold;
    font-family: inherit;
    text-align: center;
    padding: 0 2px;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.ac-input:hover { border-color: rgba(255, 255, 255, 0.4); }
.ac-input:focus { border-color: #38c268; box-shadow: 0 0 4px rgba(56, 194, 104, 0.4); }

.ac-expanded-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
}

.ac-filter-row {
    display: flex;
    gap: 3px;
    width: 100%;
    box-sizing: border-box;
}

.ac-filter-btn {
    flex: 1 1 0;
    min-width: 0;
    height: 18px;
    border-radius: 3px;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.3px;
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.ac-filter-btn.AC-ON {
    background: #1f2e23 !important;
    border: 1px solid #38c268 !important;
    color: #ffffff !important;
    box-shadow: 0 0 4px rgba(56, 194, 104, 0.35) !important;
}

.ac-filter-btn.AC-ON:hover {
    background: #25382a !important;
    border-color: #4fe080 !important;
}

.ac-filter-btn.AC-OFF {
    background: #131417 !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    color: rgba(255, 255, 255, 0.45) !important;
}

.ac-filter-btn.AC-OFF:hover {
    background: #1d1f25 !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
}

.ac-wide-btn {
    width: 100%;
    height: 18px;
    border-radius: 3px;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.ac-wide-btn.AC-ON {
    background: linear-gradient(180deg, #243529 0%, #17241b 100%) !important;
    border: 1px solid #38c268 !important;
    color: #ffffff !important;
    box-shadow: 0 0 5px rgba(56, 194, 104, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.ac-wide-btn.AC-ON:hover {
    background: linear-gradient(180deg, #2b4031 0%, #1e2f23 100%) !important;
    border-color: #4fe080 !important;
}

.ac-wide-btn.AC-OFF {
    background: #131417 !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    color: rgba(255, 255, 255, 0.6) !important;
}

.ac-wide-btn.AC-OFF:hover {
    background: #1e2026 !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
}

.ac-range-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: rgba(255, 255, 255, 0.65);
    padding: 0 2px;
}

.ac-range-val {
    color: #38c268;
    font-weight: 800;
    font-size: 8.5px;
}

.ac-range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 5px;
    background: #131417;
    border-radius: 3px;
    outline: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    margin: 2px 0 3px 0;
    box-sizing: border-box;
}

.ac-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #38c268;
    cursor: pointer;
    border: 1px solid #ffffff;
    box-shadow: 0 0 4px rgba(56, 194, 104, 0.8);
    transition: transform 0.12s;
}

.ac-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}

.ac-range-slider::-moz-range-thumb {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #38c268;
    cursor: pointer;
    border: 1px solid #ffffff;
    box-shadow: 0 0 4px rgba(56, 194, 104, 0.8);
}
`;
    document.head.appendChild(style);

    W.NICore = {
        W, isNI, ls, getHero, getCharId, saveLS, sendCmd, getValidPos, getCenterPos,
        isSameClan, fetchClanMembers, parseClanData,
        makeDraggable, bringToFront, updateAllVisibilities, registerWindow,
        onPacket,
        version: CORE_VERSION,
        svg: { checkmarkSvg, plusMinusSvg, guiWindowSvg }
    };

    setTimeout(fetchClanMembers, 1500);
})();
