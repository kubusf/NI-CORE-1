// modules/autoParty.js
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('AUTO_PARTY_GUI')) return;

    const { W, isNI, ls, saveLS, sendCmd, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // Domyślny bind pod opuszczanie grupy to klawisz 'B'
    if (!ls.party) ls.party = { enabled: true, autoMob: false, hotkey: 'B' };
    if (typeof ls.party.invEnabled === 'undefined') ls.party.invEnabled = true;
    if (typeof ls.party.invHotkey === 'undefined') ls.party.invHotkey = 'V';
    if (typeof ls.party.autoAccept === 'undefined') ls.party.autoAccept = false;
    if (typeof ls.party.inviteClan === 'undefined') ls.party.inviteClan = true;
    if (typeof ls.party.inviteAlly === 'undefined') ls.party.inviteAlly = true;
    if (typeof ls.party.inviteOther === 'undefined') ls.party.inviteOther = false;
    if (typeof ls.expandedParty === 'undefined') ls.expandedParty = false;

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posAutoParty = C.getValidPos(ls.posAutoParty, Math.min(baseX + 230, (window.innerWidth || 1200) - 135), baseY + 120, 130);

    // GUI: AUTO PARTY
    const autoPartyMain = document.createElement('div');
    autoPartyMain.setAttribute('id', 'AUTO_PARTY_GUI');
    autoPartyMain.className = 'ac-window';
    autoPartyMain.style.left = `${ls.posAutoParty.x}px`;
    autoPartyMain.style.top = `${ls.posAutoParty.y}px`;

    const autoPartyHeader = document.createElement('div');
    autoPartyHeader.className = 'ac-header';

    const autoPartyStatusBtn = document.createElement('button');
    autoPartyStatusBtn.className = `ac-status-btn ${ls.modules.autoParty ? 'AC-ON' : 'AC-OFF'}`;
    autoPartyStatusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.modules.autoParty = !ls.modules.autoParty;
        saveLS();
        updateAllVisibilities();
    });
    autoPartyHeader.appendChild(autoPartyStatusBtn);

    const autoPartyTitle = document.createElement('span');
    autoPartyTitle.className = 'ac-title';
    autoPartyTitle.innerText = 'AUTO PARTY';
    autoPartyHeader.appendChild(autoPartyTitle);

    const expandPartyBtn = document.createElement('button');
    expandPartyBtn.className = 'ac-expand-btn';
    expandPartyBtn.innerHTML = C.svg.plusMinusSvg;
    autoPartyHeader.appendChild(expandPartyBtn);

    const autoPartyCloseBtn = document.createElement('button');
    autoPartyCloseBtn.className = 'ac-close-btn';
    autoPartyCloseBtn.innerHTML = '&#215;';
    autoPartyCloseBtn.setAttribute('title', 'Schowaj okno');
    autoPartyCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.guiVisible.autoParty = false;
        saveLS();
        updateAllVisibilities();
    });
    autoPartyHeader.appendChild(autoPartyCloseBtn);
    autoPartyMain.appendChild(autoPartyHeader);

    const autoPartyBody = document.createElement('div');
    autoPartyBody.className = 'ac-body';

    const partyLeaveRow = document.createElement('div');
    partyLeaveRow.className = 'ac-row';

    const partyToggleBtn = document.createElement('button');
    partyToggleBtn.className = `ac-square-btn ${ls.party.enabled ? 'AC-ON' : 'AC-OFF'}`;
    partyToggleBtn.setAttribute('title', 'Włącz / Wyłącz skrót opuszczania grupy');
    partyToggleBtn.innerHTML = ls.party.enabled ? C.svg.checkmarkSvg : '';
    partyToggleBtn.addEventListener('click', () => {
        ls.party.enabled = !ls.party.enabled;
        partyToggleBtn.className = `ac-square-btn ${ls.party.enabled ? 'AC-ON' : 'AC-OFF'}`;
        partyToggleBtn.innerHTML = ls.party.enabled ? C.svg.checkmarkSvg : '';
        saveLS();
    });
    partyLeaveRow.appendChild(partyToggleBtn);

    let bindingTarget = null;
    const inputKey = document.createElement('input');
    inputKey.className = 'ac-input';
    inputKey.setAttribute('type', 'text');
    inputKey.setAttribute('readonly', 'true');
    inputKey.setAttribute('title', 'Kliknij i wciśnij klawisz opuszczania grupy');
    inputKey.value = (ls.party.hotkey || 'B').toUpperCase();
    inputKey.addEventListener('click', () => {
        bindingTarget = 'disband';
        inputKey.value = '...';
        inputKey.style.borderColor = '#1cff00';
    });
    inputKey.addEventListener('blur', () => {
        if (bindingTarget === 'disband') {
            bindingTarget = null;
            inputKey.value = (ls.party.hotkey || 'B').toUpperCase();
            inputKey.style.borderColor = 'rgba(255, 255, 255, 0.55)';
        }
    });
    partyLeaveRow.appendChild(inputKey);
    autoPartyBody.appendChild(partyLeaveRow);

    const partyInvRow = document.createElement('div');
    partyInvRow.className = 'ac-row';

    const invToggleBtn = document.createElement('button');
    invToggleBtn.className = `ac-square-btn ${ls.party.invEnabled ? 'AC-ON' : 'AC-OFF'}`;
    invToggleBtn.setAttribute('title', 'Włącz / Wyłącz skrót zapraszania graczy na mapie');
    invToggleBtn.innerHTML = ls.party.invEnabled ? C.svg.checkmarkSvg : '';
    invToggleBtn.addEventListener('click', () => {
        ls.party.invEnabled = !ls.party.invEnabled;
        invToggleBtn.className = `ac-square-btn ${ls.party.invEnabled ? 'AC-ON' : 'AC-OFF'}`;
        invToggleBtn.innerHTML = ls.party.invEnabled ? C.svg.checkmarkSvg : '';
        saveLS();
    });
    partyInvRow.appendChild(invToggleBtn);

    const inputInvKey = document.createElement('input');
    inputInvKey.className = 'ac-input';
    inputInvKey.setAttribute('type', 'text');
    inputInvKey.setAttribute('readonly', 'true');
    inputInvKey.setAttribute('title', 'Kliknij i wciśnij klawisz zapraszania do grupy');
    inputInvKey.value = (ls.party.invHotkey || 'V').toUpperCase();
    inputInvKey.addEventListener('click', () => {
        bindingTarget = 'invite';
        inputInvKey.value = '...';
        inputInvKey.style.borderColor = '#1cff00';
    });
    inputInvKey.addEventListener('blur', () => {
        if (bindingTarget === 'invite') {
            bindingTarget = null;
            inputInvKey.value = (ls.party.invHotkey || 'V').toUpperCase();
            inputInvKey.style.borderColor = 'rgba(255, 255, 255, 0.55)';
        }
    });
    partyInvRow.appendChild(inputInvKey);
    autoPartyBody.appendChild(partyInvRow);

    const partyExpanded = document.createElement('div');
    partyExpanded.className = 'ac-expanded-container';

    const filterRow = document.createElement('div');
    filterRow.className = 'ac-filter-row';

    const clanBtn = document.createElement('button');
    clanBtn.className = `ac-filter-btn ${ls.party.inviteClan ? 'AC-ON' : 'AC-OFF'}`;
    clanBtn.innerText = 'KLAN';
    clanBtn.setAttribute('title', 'Zapraszaj członków klanu');
    clanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.party.inviteClan = !ls.party.inviteClan;
        clanBtn.className = `ac-filter-btn ${ls.party.inviteClan ? 'AC-ON' : 'AC-OFF'}`;
        saveLS();
    });
    filterRow.appendChild(clanBtn);

    const allyBtn = document.createElement('button');
    allyBtn.className = `ac-filter-btn ${ls.party.inviteAlly ? 'AC-ON' : 'AC-OFF'}`;
    allyBtn.innerText = 'SOJ';
    allyBtn.setAttribute('title', 'Zapraszaj sojuszników i przyjaciół spoza klanu');
    allyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.party.inviteAlly = !ls.party.inviteAlly;
        allyBtn.className = `ac-filter-btn ${ls.party.inviteAlly ? 'AC-ON' : 'AC-OFF'}`;
        saveLS();
    });
    filterRow.appendChild(allyBtn);

    const otherBtn = document.createElement('button');
    otherBtn.className = `ac-filter-btn ${ls.party.inviteOther ? 'AC-ON' : 'AC-OFF'}`;
    otherBtn.innerText = 'INNI';
    otherBtn.setAttribute('title', 'Zapraszaj innych / nieznajomych');
    otherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.party.inviteOther = !ls.party.inviteOther;
        otherBtn.className = `ac-filter-btn ${ls.party.inviteOther ? 'AC-ON' : 'AC-OFF'}`;
        saveLS();
    });
    filterRow.appendChild(otherBtn);
    partyExpanded.appendChild(filterRow);

    const autoAcceptBtn = document.createElement('button');
    autoAcceptBtn.className = `ac-wide-btn ${ls.party.autoAccept ? 'AC-ON' : 'AC-OFF'}`;
    autoAcceptBtn.setAttribute('title', 'Automatycznie akceptuj przychodzące zaproszenia do drużyny');
    autoAcceptBtn.innerText = 'AUTO ACC';
    autoAcceptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.party.autoAccept = !ls.party.autoAccept;
        autoAcceptBtn.className = `ac-wide-btn ${ls.party.autoAccept ? 'AC-ON' : 'AC-OFF'}`;
        saveLS();
    });
    partyExpanded.appendChild(autoAcceptBtn);

    const mobBtn = document.createElement('button');
    mobBtn.className = `ac-wide-btn ${ls.party.autoMob ? 'AC-ON' : 'AC-OFF'}`;
    mobBtn.setAttribute('title', 'Automatycznie opuść/rozwiąż grupę po walce');
    mobBtn.innerText = 'AUTO QUIT';
    mobBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.party.autoMob = !ls.party.autoMob;
        mobBtn.className = `ac-wide-btn ${ls.party.autoMob ? 'AC-ON' : 'AC-OFF'}`;
        saveLS();
    });
    partyExpanded.appendChild(mobBtn);

    autoPartyBody.appendChild(partyExpanded);
    autoPartyMain.appendChild(autoPartyBody);
    document.body.appendChild(autoPartyMain);
    makeDraggable(autoPartyMain, autoPartyHeader, 'posAutoParty', ['.ac-close-btn', '.ac-expand-btn', '.ac-status-btn']);

    const updatePartyExpandState = () => {
        expandPartyBtn.classList.toggle('is-expanded', ls.expandedParty);
        expandPartyBtn.setAttribute('title', ls.expandedParty ? 'Zwiń opcje' : 'Rozwiń opcje');
        partyExpanded.style.display = ls.expandedParty ? 'flex' : 'none';
    };
    expandPartyBtn.addEventListener('click', (e) => { e.stopPropagation(); ls.expandedParty = !ls.expandedParty; updatePartyExpandState(); saveLS(); });
    updatePartyExpandState();

    registerWindow('autoParty', { mainEl: autoPartyMain, statusBtn: autoPartyStatusBtn });

    // Logika Auto Party
    const getPartyInfo = () => {
        const myId = parseInt(W.Engine?.hero?.d?.id || W.g?.hero?.id || W.hero?.id, 10);
        let inParty = false, isLeader = false;
        const eParty = W.Engine?.party;
        if (eParty) {
            if (typeof eParty.getLeaderId === 'function') {
                const lid = parseInt(eParty.getLeaderId(), 10);
                if (!isNaN(lid) && lid > 0) { inParty = true; if (lid === myId) isLeader = true; }
            }
            if (typeof eParty.getMembers === 'function') {
                try {
                    const m = eParty.getMembers();
                    if (m instanceof Map && m.size > 0) {
                        inParty = true;
                        if (m.has(myId)) { const me = m.get(myId); if (me?.r == 1 || me?.leader) isLeader = true; }
                    } else if (Array.isArray(m) && m.length > 0) {
                        inParty = true;
                        const me = m.find(x => (x.id || x.d?.id) === myId);
                        if (me?.r == 1 || me?.leader) isLeader = true;
                    } else if (typeof m === 'object' && m !== null && Object.keys(m).length > 0) {
                        inParty = true;
                        const me = m[myId] || m[String(myId)];
                        if (me?.r == 1 || me?.leader) isLeader = true;
                    }
                } catch (e) {}
            }
        }
        return { inParty, isLeader, myId };
    };

    const isHeInParty = (targetId) => {
        if (isNI && W.Engine?.party) {
            try {
                if (typeof W.Engine.party.getMembers === 'function') {
                    const m = W.Engine.party.getMembers();
                    if (m instanceof Map) return m.has(targetId) || m.has(String(targetId));
                    if (Array.isArray(m)) return m.some(x => parseInt(x?.id || x?.d?.id, 10) === targetId);
                    if (typeof m === 'object' && m !== null) return Boolean(m[targetId] || m[String(targetId)]);
                }
            } catch (e) {}
        }
        return false;
    };

    const handlePartyAction = () => {
        if (!ls.modules.autoParty) return;
        const { isLeader, myId } = getPartyInfo();
        sendCmd(isLeader ? 'party&a=disband' : 'party&a=rm&id=' + myId);
    };

    let lastPartyActionTime = 0;
    const triggerAutoPartyAction = () => {
        if (!ls.modules.autoParty || !ls.party.autoMob) return;
        const now = Date.now();
        if (now - lastPartyActionTime < 1800) return;
        lastPartyActionTime = now;
        handlePartyAction();
        setTimeout(handlePartyAction, 350);
    };

    // Bezpieczne sprawdzanie klanu – wyklucza błąd, gdy gracze nie mają klanu
    const checkSameClan = (p) => {
        try {
            const myClan = W.Engine?.hero?.d?.clan;
            const otherClan = p?.clan;
            if (myClan && otherClan) {
                if (typeof C.isSameClan === 'function') return C.isSameClan(p);
                const myClanName = typeof myClan === 'object' ? myClan.name : myClan;
                const otherClanName = typeof otherClan === 'object' ? otherClan.name : otherClan;
                return Boolean(myClanName && otherClanName && myClanName === otherClanName);
            }
        } catch (e) {}
        return false;
    };

    const shouldInvitePlayer = (p) => {
        const rel = String(p.relation || p.rel || '').toLowerCase().trim();

        // 1. Wrogi klan / wrogowie na liście - nigdy nie zapraszaj
        if (['clan-enemies', 'enemy', 'enemies', 'cl-en', 'en', 'fr-en', '1', '3', '6'].includes(rel)) {
            return false;
        }

        // 2. Członkowie naszego klanu
        const isClanMember = ['clan-members', 'cl', 'clan', '2'].includes(rel) || checkSameClan(p);
        if (isClanMember) {
            return Boolean(ls.party.inviteClan);
        }

        // 3. Przyjaciele i sojusznicy klanowi
        const isAlly = ['clan-friends', 'friends', 'friend', 'cl-fr', 'fr', 'fr-fr', '4', '5'].includes(rel);
        if (isAlly) {
            return Boolean(ls.party.inviteAlly);
        }

        // 4. Każdy inny (obcy / neutralny gracz)
        return Boolean(ls.party.inviteOther);
    };

    const inviteAllOnMap = () => {
        if (!ls.modules.autoParty) return;
        const { myId } = getPartyInfo();
        let players = [];

        // Pobieramy wszystkich graczy z całej mapy
        if (isNI) {
            if (W.Engine?.others?.check) {
                const othersObj = W.Engine.others.check();
                players = Object.values(othersObj).filter(o => o?.d).map(o => o.d);
            } else if (W.Engine?.others?.getDrawableList) {
                players = W.Engine.others.getDrawableList().filter(o => o?.d).map(o => o.d);
            }
        }

        const targets = players.filter(p => {
            const pId = parseInt(p.id, 10);
            return pId && pId !== myId && !isHeInParty(pId) && shouldInvitePlayer(p);
        });

        targets.forEach((t, idx) => setTimeout(() => sendCmd(`party&a=inv&id=${t.id}`), idx * 110));
    };

    const closePartyPrompt = () => {
        try {
            document.querySelectorAll('.m-prompt, .alert-box, .ask-box, .mAlert, .alert-interface').forEach(p => {
                if (p.closest('.border-window, .config-window')) return;
                const txt = (p.innerText || '').toLowerCase();
                if ((txt.includes('drużyn') || txt.includes('grup')) && (txt.includes('zaprasza') || txt.includes('dołącz'))) {
                    p.style.display = 'none';
                    p.querySelector('.button.green, .btn-accept, .btn.green, .ok, .accept, [data-answer="1"]')?.click();
                    p.remove();
                }
            });
        } catch (e) {}
    };

    try {
        const partyObserver = new MutationObserver(() => {
            if (ls.modules.autoParty && ls.party.autoAccept) closePartyPrompt();
        });
        partyObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}

    // Skróty klawiszowe
    document.addEventListener('keydown', (e) => {
        if (bindingTarget) {
            e.preventDefault(); e.stopPropagation();
            if (['Control', 'Shift', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
            const newKey = e.key === ' ' ? 'Spacja' : e.key.toUpperCase();
            if (bindingTarget === 'disband') {
                ls.party.hotkey = newKey; inputKey.value = newKey; inputKey.style.borderColor = 'rgba(255, 255, 255, 0.55)'; inputKey.blur();
            } else if (bindingTarget === 'invite') {
                ls.party.invHotkey = newKey; inputInvKey.value = newKey; inputInvKey.style.borderColor = 'rgba(255, 255, 255, 0.55)'; inputInvKey.blur();
            }
            bindingTarget = null; saveLS(); return;
        }

        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA'].includes(tag) || e.ctrlKey || e.altKey || e.metaKey) return;

        const pressed = e.key.toLowerCase();
        const configuredDisband = (ls.party.hotkey || 'b').toLowerCase();
        const configuredInv = (ls.party.invHotkey || 'v').toLowerCase();

        if (ls.modules.autoParty) {
            if (ls.party.enabled && (pressed === configuredDisband || ((configuredDisband === 'spacja' || configuredDisband === 'space') && e.code === 'Space'))) {
                e.preventDefault(); handlePartyAction(); return;
            }
            if (ls.party.invEnabled && (pressed === configuredInv || ((configuredInv === 'spacja' || configuredInv === 'space') && e.code === 'Space'))) {
                e.preventDefault(); inviteAllOnMap(); return;
            }
        }
    });

    C.onPacket((d) => {
        if (ls.modules.autoParty && ls.party.autoAccept && d.ask) {
            try {
                const askRe = typeof d.ask === 'object' ? (d.ask.re || '') : String(d.ask);
                if (askRe.includes('party&a=accept')) {
                    sendCmd(askRe.includes('answer=') ? `${askRe}1` : `${askRe}&answer=1`);
                    closePartyPrompt();
                }
            } catch (e) {}
        }
        const isEnd = (d.loot || (d.battle && d.battle.endBattle) || (d.f && d.f.endBattle));
        if (isEnd && ls.modules.autoParty) triggerAutoPartyAction();
    });

    setInterval(() => {
        if (ls.modules.autoParty && ls.party.autoAccept) closePartyPrompt();
    }, 100);
})();
