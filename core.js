// core.js - NI CORE ENGINE
(function() {
    'use strict';
    const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (W.NICore) return;

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
    if (!ls.modules) ls.modules = { autoX: true, autoParty: true, darkMap: true, mobHighlight: true };
    if (!ls.guiVisible) ls.guiVisible = { autoX: true, autoParty: true, darkMap: true, mobHighlight: false };
    if (typeof ls.hubVisible === 'undefined') ls.hubVisible = true;
    if (typeof ls.expandedHub === 'undefined') ls.expandedHub = true;

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

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posHub = getValidPos(ls.posHub, baseX, baseY, 230);

    const saveLS = () => localStorage.setItem(LS_KEY, JSON.stringify(ls));
    saveLS();

    const sendCmd = (cmd) => {
        if (W._g) {
            W._g(cmd);
        } else if (isNI && W.Engine?.communication?.send) {
            W.Engine.communication.send(cmd);
        }
    };

    // System zdarzeń dla modułów
    const listeners = { packet: [], battleEnd: [], tick: [] };
    const on = (event, cb) => { if (listeners[event]) listeners[event].push(cb); };
    const trigger = (event, data) => { if (listeners[event]) listeners[event].forEach(cb => { try { cb(data); } catch (e) { console.error(e); } }); };

    // Zarządzanie klanem
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

    // UI Helpers
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

    // Obsługa pakietów
    const hookPackets = () => {
        const comm = W.Engine?.communication;
        if (comm && typeof comm.parseJSON === 'function' && !W._autoFastNIHooked) {
            W._autoFastNIHooked = true;
            const origParseJSON = comm.parseJSON;
            comm.parseJSON = function(data) {
                let d = data;
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) {} }
                const result = origParseJSON.apply(this, arguments);
                const targetData = result || d;
                parseClanData(targetData);
                if (targetData?.loot || targetData?.battle?.endBattle || targetData?.f?.endBattle) {
                    trigger('battleEnd', targetData);
                }
                trigger('packet', targetData);
                return result;
            };
        }
    };

    setInterval(() => {
        hookPackets();
        trigger('tick');
    }, 25);

    // ==========================================
    // BUDOWA GŁÓWNEGO HUB-A
    // ==========================================
    const checkmarkSvg = `<svg class="ac-checkmark-svg" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#1cff00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8.5 6.5,12 13,3.5"/></svg>`;
    const plusMinusSvg = `<svg class="ac-plus-minus-svg" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="1" y1="5" x2="9" y2="5"></line><line class="ac-vertical-bar" x1="5" y1="1" x2="5" y2="9"></line></svg>`;
    const guiWindowSvg = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="2"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><circle cx="4.5" cy="4.5" r="0.75" fill="currentColor"/></svg>`;

    const hubMain = document.createElement('div');
    hubMain.setAttribute('id', 'AUTO_COMBO_HUB');
    hubMain.className = 'ac-window';
    hubMain.style.left = `${ls.posHub.x}px`;
    hubMain.style.top = `${ls.posHub.y}px`;

    const hubHeader = document.createElement('div');
    hubHeader.className = 'ac-header';
    hubHeader.innerHTML = `
        <span class="ac-title">NI CORE</span>
        <button class="ac-expand-btn" title="Rozwiń / Zwiń">${plusMinusSvg}</button>
        <button class="ac-close-btn" title="Zamknij">&#215;</button>
    `;
    hubMain.appendChild(hubHeader);

    const hubBody = document.createElement('div');
    hubBody.className = 'ac-body';
    hubMain.appendChild(hubBody);
    document.body.appendChild(hubMain);

    makeDraggable(hubMain, hubHeader, 'posHub', ['.ac-close-btn', '.ac-expand-btn']);

    const expandHubBtn = hubHeader.querySelector('.ac-expand-btn');
    const updateHubExpandState = () => {
        expandHubBtn.classList.toggle('is-expanded', ls.expandedHub);
        hubBody.style.display = ls.expandedHub ? 'flex' : 'none';
    };
    expandHubBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.expandedHub = !ls.expandedHub;
        updateHubExpandState();
        saveLS();
    });
    updateHubExpandState();

    hubHeader.querySelector('.ac-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        ls.hubVisible = false;
        saveLS();
        W.NICore.updateAllVisibilities();
    });

    const registeredModules = {};
    const registerModuleUI = (id, title, desc, onToggle) => {
        const item = document.createElement('div');
        item.className = `ac-hub-item ${ls.modules[id] ? 'AC-ON' : 'AC-OFF'}`;
        item.innerHTML = `
            <div class="ac-hub-row">
                <div class="ac-hub-title-group">
                    <span class="ac-hub-dot ${ls.modules[id] ? 'AC-ON' : 'AC-OFF'}"></span>
                    <span class="ac-hub-item-title">${title}</span>
                </div>
                <button class="ac-hub-gui-btn ${ls.guiVisible[id] ? 'AC-ON' : 'AC-OFF'}" title="Otwórz / Ukryj okno">${guiWindowSvg}</button>
            </div>
            <div class="ac-hub-desc">${desc}</div>
        `;

        item.addEventListener('click', () => {
            ls.modules[id] = !ls.modules[id];
            saveLS();
            if (onToggle) onToggle(ls.modules[id]);
            W.NICore.updateAllVisibilities();
        });

        item.querySelector('.ac-hub-gui-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            ls.guiVisible[id] = !ls.guiVisible[id];
            saveLS();
            W.NICore.updateAllVisibilities();
        });

        hubBody.appendChild(item);
        registeredModules[id] = { item, dot: item.querySelector('.ac-hub-dot'), guiBtn: item.querySelector('.ac-hub-gui-btn') };
    };

    const updateAllVisibilities = () => {
        hubMain.style.display = ls.hubVisible ? 'block' : 'none';
        for (const [id, m] of Object.entries(registeredModules)) {
            m.item.className = `ac-hub-item ${ls.modules[id] ? 'AC-ON' : 'AC-OFF'}`;
            m.dot.className = `ac-hub-dot ${ls.modules[id] ? 'AC-ON' : 'AC-OFF'}`;
            m.guiBtn.className = `ac-hub-gui-btn ${ls.guiVisible[id] ? 'AC-ON' : 'AC-OFF'}`;
        }
        if (ls.hubVisible) bringToFront(hubMain);
        const widgetBtn = document.querySelector(`.widget-button[data-name="auto_combo"], .widget-button .icon.auto_combo`)?.closest('.widget-button');
        if (widgetBtn) widgetBtn.classList.toggle('active', Boolean(ls.hubVisible));
    };

    const toggleHub = () => {
        ls.hubVisible = !ls.hubVisible;
        saveLS();
        updateAllVisibilities();
    };

    // Inicjalizacja kafelka w NI
    const initNIWidget = () => {
        if (!isNI || !W.Engine?.widgetManager) return;
        const widgetName = 'auto_combo';
        const defaultPosition = [6, 'bottom-right-additional'];
        const addWidget = () => {
            try { W.Engine.widgetManager.addKeyToDefaultWidgetSet(widgetName, defaultPosition[0], defaultPosition[1], 'NI CORE', 'green', toggleHub); } catch (e) {}
        };
        const createBtn = () => {
            try {
                if (W.Engine.interfaceStart && Object.keys(W.Engine.widgetManager.getDefaultWidgetSet()).includes(widgetName)) {
                    W.Engine.widgetManager.createOneWidget(widgetName, { [widgetName]: defaultPosition }, true, []);
                    updateAllVisibilities();
                }
            } catch (e) {}
        };
        addWidget();
        if (W.Engine.interfaceStart) createBtn();
        else {
            const c = setInterval(() => { if (W.Engine.interfaceStart) { clearInterval(c); addWidget(); createBtn(); } }, 250);
        }
    };
    if (isNI) initNIWidget();

    // Wstrzyknięcie arkusza CSS (wspólnego dla okienek)
    const style = document.createElement('style');
    style.innerHTML = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Poppins:wght@600;700&display=swap');
.main-buttons-container .widget-button .icon.auto_combo, .widget-button .icon.auto_combo {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2.8 L27 8.2 V18.8 C27 24.2 22 28.2 16 30 C10 28.2 5 24.2 5 18.8 V8.2 Z' fill='%23132216' stroke='%234de64d' stroke-width='1.8' stroke-linejoin='round'/%3E%3Cpath d='M16 9.5 L19.8 16 L16 22.5 L12.2 16 Z' fill='%234de64d'/%3E%3Ccircle cx='16' cy='16' r='2.2' fill='%23ffffff'/%3E%3C/svg%3E");
    background-position: center; background-repeat: no-repeat; background-size: 21px 21px; transition: filter 0.18s, transform 0.15s;
}
.main-buttons-container .widget-button.active .icon.auto_combo, .widget-button.active .icon.auto_combo {
    filter: drop-shadow(0 0 4.5px #4de64d) brightness(1.25); transform: scale(1.05);
}
.ac-window {
    position: absolute; width: 126px; background: #000000; border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 6px; overflow: hidden; box-shadow: 0 0 10px rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.95);
    z-index: 10000; font-family: 'Nunito', 'Poppins', sans-serif; color: #ffffff; user-select: none; box-sizing: border-box; transition: opacity 0.2s ease;
}
#AUTO_COMBO_HUB { width: 220px; }
.ac-header { position: relative; background: #000000; cursor: move; box-sizing: border-box; height: 22px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); }
.ac-title { position: absolute; top: 0; bottom: 0; left: 20px; right: 32px; display: flex; align-items: center; justify-content: center; pointer-events: none; font-size: 8.5px; font-weight: 700; letter-spacing: 0.6px; color: #f2f2f2; text-transform: uppercase; white-space: nowrap; line-height: 1; }
#AUTO_COMBO_HUB .ac-title { left: 8px; right: 32px; font-size: 9px; letter-spacing: 0.8px; }
.ac-status-btn { position: absolute; top: 6px; left: 6px; width: 10px; height: 10px; border-radius: 50%; cursor: pointer; padding: 0; margin: 0; outline: none; box-sizing: border-box; z-index: 2; transition: all 0.2s; }
.ac-status-btn.AC-ON { background: #4de64d !important; border: 1px solid #80ff80 !important; box-shadow: 0 0 6px rgba(77, 230, 77, 0.85) !important; }
.ac-status-btn.AC-OFF { background: #1e1e1e !important; border: 1px solid rgba(255, 255, 255, 0.35) !important; }
.ac-expand-btn { position: absolute; top: 5px; right: 18px; width: 10px; height: 10px; background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.7); z-index: 2; }
.ac-plus-minus-svg { width: 10px; height: 10px; stroke: currentColor; }
.ac-vertical-bar { transform-origin: 5px 5px; transition: transform 0.22s ease, opacity 0.16s ease; }
.ac-expand-btn.is-expanded .ac-vertical-bar { transform: rotate(90deg) scale(0); opacity: 0; }
.ac-close-btn { position: absolute; top: 3px; right: 5px; width: 12px; height: 14px; background: transparent; border: none; cursor: pointer; padding: 0; font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.6); display: flex; align-items: center; justify-content: center; z-index: 2; }
.ac-close-btn:hover { color: #ff4d4d; }
.ac-body { padding: 6px; display: flex; flex-direction: column; gap: 5px; background: #000000; box-sizing: border-box; }
.ac-hub-item { display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border-radius: 5px; box-sizing: border-box; cursor: pointer; user-select: none; transition: all 0.18s ease; }
.ac-hub-item.AC-ON { background: linear-gradient(180deg, rgba(22, 45, 22, 0.85) 0%, rgba(10, 20, 10, 0.95) 100%); border: 1px solid #4de64d; box-shadow: 0 0 7px rgba(77, 230, 77, 0.22); }
.ac-hub-item.AC-OFF { background: #111111; border: 1px solid rgba(255, 255, 255, 0.18); }
.ac-hub-row { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; }
.ac-hub-title-group { display: flex; align-items: center; gap: 6px; pointer-events: none; }
.ac-hub-dot { width: 7px; height: 7px; border-radius: 50%; box-sizing: border-box; }
.ac-hub-dot.AC-ON { background: #4de64d; box-shadow: 0 0 6px #4de64d; }
.ac-hub-dot.AC-OFF { background: #2a2a2a; border: 1px solid rgba(255, 255, 255, 0.3); }
.ac-hub-item-title { font-size: 9.2px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
.ac-hub-gui-btn { width: 17px; height: 17px; background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 3px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ac-hub-gui-btn.AC-ON { color: #4de64d !important; border-color: rgba(77, 230, 77, 0.5) !important; }
.ac-hub-gui-btn.AC-OFF { color: rgba(255, 255, 255, 0.45) !important; }
.ac-hub-desc { font-size: 9.1px; line-height: 12.6px; letter-spacing: 0.15px; color: rgba(255, 255, 255, 0.7); pointer-events: none; font-weight: 600; }
.ac-row { display: flex; align-items: center; gap: 4px; width: 100%; box-sizing: border-box; }
.ac-square-btn { width: 18px; height: 18px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.55); cursor: pointer; padding: 0; outline: none; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #141414; }
.ac-square-btn.AC-ON { background: #1e1e1e !important; box-shadow: 0 0 5px rgba(0, 255, 0, 0.35) !important; }
.ac-input { flex: 1 1 0; min-width: 0; width: 100%; height: 18px; background: #000000; border: 1px solid rgba(255, 255, 255, 0.55); border-radius: 3px; color: #ffffff; font-size: 9.5px; font-weight: bold; text-align: center; outline: none; }
.ac-wide-btn { width: 100%; height: 18px; border-radius: 4px; font-size: 8.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #141414; border: 1px solid rgba(255, 255, 255, 0.35); color: rgba(255, 255, 255, 0.7); outline: none; }
.ac-wide-btn.AC-ON { background: linear-gradient(180deg, #202020 0%, #101010 100%) !important; border: 1px solid #4de64d !important; color: #ffffff !important; box-shadow: 0 0 5px rgba(77, 230, 77, 0.65) !important; }
.ac-filter-row { display: flex; gap: 3px; width: 100%; box-sizing: border-box; }
.ac-filter-btn { flex: 1; height: 18px; border-radius: 3px; font-size: 7.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; background: #141414; border: 1px solid rgba(255, 255, 255, 0.35); color: rgba(255, 255, 255, 0.5); outline: none; }
.ac-filter-btn.AC-ON { background: #1e1e1e !important; border: 1px solid #4de64d !important; color: #ffffff !important; box-shadow: 0 0 5px rgba(77, 230, 77, 0.4) !important; }
.ac-range-header { display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; font-weight: 700; color: rgba(255, 255, 255, 0.7); padding: 0 2px; }
.ac-range-val { color: #4de64d; font-weight: 800; font-size: 8.5px; }
.ac-range-slider { -webkit-appearance: none; width: 100%; height: 5px; background: #1e1e1e; border-radius: 3px; outline: none; border: 1px solid rgba(255, 255, 255, 0.35); cursor: pointer; margin: 2px 0 3px 0; }
.ac-range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #4de64d; cursor: pointer; border: 1px solid #ffffff; }
.ac-toggle-label { font-size: 8.5px; font-weight: 700; color: rgba(255, 255, 255, 0.8); cursor: pointer; flex: 1; }
    `;
    document.head.appendChild(style);

    // Globalny obiekt udostępniany modułom
    W.NICore = {
        W, isNI, ls, getHero, getCharId, getValidPos, saveLS, sendCmd,
        on, trigger, isSameClan, fetchClanMembers, parseClanData,
        makeDraggable, bringToFront, updateAllVisibilities, registerModuleUI,
        svg: { checkmarkSvg, plusMinusSvg, guiWindowSvg }
    };

    setTimeout(fetchClanMembers, 1500);
})();
