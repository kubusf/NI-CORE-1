// modules/soundNotifier.js
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('SOUND_NOTIFIER_GUI')) return;

    const { W, isNI, ls, getHero, saveLS, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // --- DOMYŚLNE DŹWIĘKI ---
    const DEFAULT_E2_SOUND = 'https://cronus.margonem.com/sounds/elite2_here.mp3';
    const DEFAULT_BOSS_SOUND = 'https://kaktusdev.gitlab.io/ni-essentials/sfx/detector.mp3';
    const DEFAULT_ENEMY_SOUND = 'https://cronus.margonem.com/sounds/enemy_here.mp3';
    const DEFAULT_ALLY_SOUND = 'https://kaktusdev.gitlab.io/ni-essentials-core/sfx/ni-essentials-ally.mp3';

    if (!ls.soundNotifier) ls.soundNotifier = {};

    const defaults = {
        volume: 80,
        e2: { enabled: true, url: DEFAULT_E2_SOUND },
        heros: { enabled: true, url: DEFAULT_BOSS_SOUND },
        tytan: { enabled: true, url: DEFAULT_BOSS_SOUND },
        kolos: { enabled: true, url: DEFAULT_BOSS_SOUND },
        enemy: { enabled: true, url: DEFAULT_ENEMY_SOUND },
        clanEnemy: { enabled: true, url: DEFAULT_ENEMY_SOUND },
        clanMember: { enabled: false, url: DEFAULT_ALLY_SOUND },
        ally: { enabled: false, url: DEFAULT_ALLY_SOUND },
        stranger: { enabled: false, url: DEFAULT_ENEMY_SOUND }
    };

    for (const [key, val] of Object.entries(defaults)) {
        if (typeof ls.soundNotifier[key] === 'undefined') {
            ls.soundNotifier[key] = val;
        }
    }

    // Automatyczna korekta pamięci przeglądarki
    if (ls.soundNotifier.enemy && ls.soundNotifier.enemy.url === DEFAULT_ALLY_SOUND) {
        ls.soundNotifier.enemy.url = DEFAULT_ENEMY_SOUND;
    }
    if (ls.soundNotifier.clanEnemy && ls.soundNotifier.clanEnemy.url === DEFAULT_ALLY_SOUND) {
        ls.soundNotifier.clanEnemy.url = DEFAULT_ENEMY_SOUND;
    }
    ['clanMember', 'ally'].forEach(k => {
        if (ls.soundNotifier[k] && (ls.soundNotifier[k].url === DEFAULT_ENEMY_SOUND || !ls.soundNotifier[k].url)) {
            ls.soundNotifier[k].url = DEFAULT_ALLY_SOUND;
        }
    });
    saveLS();

    const cfg = ls.soundNotifier;
    cfg.volume = typeof cfg.volume === 'number' ? cfg.volume : 80;

    const getVolumeMultiplier = () => {
        const num = parseFloat(cfg.volume);
        const v = (!isNaN(num) && num >= 0 && num <= 100) ? num : 80;
        return Math.max(0, Math.min(1, v / 100));
    };

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posSoundNotifier = C.getValidPos(ls.posSoundNotifier, baseX, baseY + 360, 215);

    let testingAudio = null;
    let activeTestBtn = null;
    let currentAlertAudio = null;
    let lastAlertTime = 0;
    let lastAlertRank = '';

    // --- BUDOWA GUI OKNA ---
    const soundMain = document.createElement('div');
    soundMain.setAttribute('id', 'SOUND_NOTIFIER_GUI');
    soundMain.className = 'ac-window';
    soundMain.style.width = '215px';
    soundMain.style.left = `${ls.posSoundNotifier.x}px`;
    soundMain.style.top = `${ls.posSoundNotifier.y}px`;

    soundMain.innerHTML = `
        <div class="ac-header">
            <button class="ac-status-btn ${ls.modules.soundNotifier ? 'AC-ON' : 'AC-OFF'}"></button>
            <span class="ac-title" style="left: 20px; right: 20px;">SOUND DETECT</span>
            <button class="ac-close-btn" title="Schowaj okno">&#215;</button>
        </div>
        <div class="ac-body" style="gap: 5px; max-height: 75vh; overflow-y: auto; overflow-x: hidden; padding-right: 4px;">
            <!-- GŁOŚNOŚĆ -->
            <div class="ac-range-header">
                <span>GŁOŚNOŚĆ</span>
                <span class="ac-range-val sound-vol-val">${cfg.volume}%</span>
            </div>
            <input class="ac-range-slider sound-vol-slider" type="range" min="0" max="100" step="1" value="${cfg.volume}">

            <!-- SEKCJA POTWORÓW -->
            <div style="font-size: 8px; font-weight: 800; color: #4de64d; letter-spacing: 0.6px; margin-top: 2px;">POTWORY</div>
            ${createRowHtml('e2', 'ELITA II', cfg.e2)}
            ${createRowHtml('heros', 'HEROS', cfg.heros)}
            ${createRowHtml('tytan', 'TYTAN', cfg.tytan)}
            ${createRowHtml('kolos', 'KOLOS', cfg.kolos)}

            <!-- SEKCJA GRACZY -->
            <div style="font-size: 8px; font-weight: 800; color: #ff4d4d; letter-spacing: 0.6px; margin-top: 4px;">GRACZE</div>
            ${createRowHtml('enemy', 'WROGOWIE', cfg.enemy)}
            ${createRowHtml('clanEnemy', 'WROGIE KLANY', cfg.clanEnemy)}
            ${createRowHtml('clanMember', 'KLANOWICZE', cfg.clanMember)}
            ${createRowHtml('ally', 'SOJUSZNICY', cfg.ally)}
            ${createRowHtml('stranger', 'NIEZNAJOMI', cfg.stranger)}
        </div>
    `;

    function createRowHtml(key, label, data) {
        return `
            <div class="ac-sound-block" data-key="${key}" style="display: flex; flex-direction: column; gap: 3px; background: #0c0c0c; padding: 4px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.12);">
                <div class="ac-row" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <button class="ac-square-btn btn-toggle ${data.enabled ? 'AC-ON' : 'AC-OFF'}" title="Włącz / Wyłącz powiadomienie">
                            ${data.enabled ? C.svg.checkmarkSvg : ''}
                        </button>
                        <span class="ac-toggle-label">${label}</span>
                    </div>
                    <button class="ac-filter-btn btn-test AC-OFF" style="flex: none; width: 42px; height: 16px; font-size: 7px;" title="Przetestuj dźwięk">TEST</button>
                </div>
                <input class="ac-input sound-input" type="text" style="text-align: left; padding: 0 4px; font-size: 8px; font-weight: normal;" placeholder="Link do dźwięku (.mp3, .ogg)..." value="${data.url || ''}">
            </div>
        `;
    }

    document.body.appendChild(soundMain);

    // --- ZDARZENIA OKNA ---
    const statusBtn = soundMain.querySelector('.ac-status-btn');
    statusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.modules.soundNotifier = !ls.modules.soundNotifier;
        saveLS();
        updateAllVisibilities();
    });

    soundMain.querySelector('.ac-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        ls.guiVisible.soundNotifier = false;
        saveLS();
        updateAllVisibilities();
    });

    const volSlider = soundMain.querySelector('.sound-vol-slider');
    const volText = soundMain.querySelector('.sound-vol-val');
    volSlider.addEventListener('input', () => {
        const val = parseInt(volSlider.value, 10);
        cfg.volume = isNaN(val) ? 80 : Math.max(0, Math.min(100, val));
        volText.innerText = `${cfg.volume}%`;

        const currentVolMultiplier = getVolumeMultiplier();
        if (testingAudio) testingAudio.volume = currentVolMultiplier;
        if (currentAlertAudio) currentAlertAudio.volume = currentVolMultiplier;

        saveLS();
    });

    const attachVolumeEnforcer = (audio) => {
        const applyVol = () => {
            try { audio.volume = getVolumeMultiplier(); } catch (e) {}
        };
        applyVol();
        audio.addEventListener('loadedmetadata', applyVol);
        audio.addEventListener('loadeddata', applyVol);
        audio.addEventListener('canplay', applyVol);
        audio.addEventListener('play', applyVol);
        audio.addEventListener('playing', applyVol);
    };

    soundMain.querySelectorAll('.ac-sound-block').forEach(block => {
        const key = block.getAttribute('data-key');
        const btnToggle = block.querySelector('.btn-toggle');
        const btnTest = block.querySelector('.btn-test');
        const inputUrl = block.querySelector('.sound-input');

        btnToggle.addEventListener('click', () => {
            cfg[key].enabled = !cfg[key].enabled;
            btnToggle.className = `ac-square-btn btn-toggle ${cfg[key].enabled ? 'AC-ON' : 'AC-OFF'}`;
            btnToggle.innerHTML = cfg[key].enabled ? C.svg.checkmarkSvg : '';
            saveLS();
        });

        inputUrl.addEventListener('input', () => {
            cfg[key].url = inputUrl.value.trim();
            saveLS();
        });

        btnTest.addEventListener('click', (e) => {
            e.stopPropagation();

            const stopTest = () => {
                if (testingAudio) {
                    testingAudio.pause();
                    testingAudio.currentTime = 0;
                    testingAudio = null;
                }
                if (activeTestBtn) {
                    activeTestBtn.innerText = 'TEST';
                    activeTestBtn.className = 'ac-filter-btn btn-test AC-OFF';
                    activeTestBtn = null;
                }
            };

            if (testingAudio) {
                const wasSame = (activeTestBtn === btnTest);
                stopTest();
                if (wasSame) return;
            }

            const url = cfg[key].url;
            if (!url) return;

            const targetVol = getVolumeMultiplier();
            if (targetVol <= 0) return;

            testingAudio = new Audio();
            attachVolumeEnforcer(testingAudio);
            testingAudio.src = url;

            btnTest.innerText = 'STOP';
            btnTest.className = 'ac-filter-btn btn-test AC-ON';
            activeTestBtn = btnTest;

            testingAudio.onended = stopTest;
            testingAudio.onerror = () => {
                stopTest();
                btnTest.innerText = 'BŁĄD';
                setTimeout(() => { btnTest.innerText = 'TEST'; }, 2000);
            };

            testingAudio.play().catch(() => {
                stopTest();
                btnTest.innerText = 'BŁĄD';
                setTimeout(() => { btnTest.innerText = 'TEST'; }, 2000);
            });
        });
    });

    makeDraggable(soundMain, soundMain.querySelector('.ac-header'), 'posSoundNotifier', ['.ac-close-btn', '.ac-status-btn']);
    registerWindow('soundNotifier', { mainEl: soundMain, statusBtn: statusBtn });

    // --- SYSTEM DŹWIĘKÓW ---
    const playAlert = (category, name) => {
        const soundData = cfg[category];
        if (!soundData || !soundData.enabled || !soundData.url) return;

        const targetVol = getVolumeMultiplier();
        if (targetVol <= 0) return;

        const now = Date.now();
        if (now - lastAlertTime < 800 && lastAlertRank === category) return;
        lastAlertTime = now;
        lastAlertRank = category;

        try {
            if (currentAlertAudio) {
                currentAlertAudio.pause();
                currentAlertAudio.currentTime = 0;
                currentAlertAudio = null;
            }

            const audio = new Audio();
            currentAlertAudio = audio;
            attachVolumeEnforcer(audio);
            audio.src = soundData.url;

            audio.play().catch(e => console.warn('[Sound Notifier] Błąd audio:', e));
            console.log(`%c[Sound Notifier] Wykryto: ${category.toUpperCase()} (${name}) | Głośność: ${Math.round(targetVol * 100)}%`, 'color: #ff3344; font-weight: bold;');
        } catch (e) {
            console.error('[Sound Notifier] Audio Error:', e);
        }
    };

    // --- 1. WYKRYWANIE POTWORÓW ---
    const detectRank = (npc) => {
        if (!npc) return null;
        const d = npc.d || npc;
        const wt = parseInt(d.wt, 10);
        const nick = (d.nick || '').toLowerCase();
        let tip = '';
        if (typeof npc.getTip === 'function') {
            try { tip = (npc.getTip() || '').toLowerCase(); } catch (e) {}
        }
        const mapMode = W.Engine?.map?.d?.mode || W.map?.mode;

        if (/kolos/i.test(tip) || /kolos/i.test(nick) || (wt > 99 && mapMode == 5)) return 'kolos';
        if (/tytan/i.test(tip) || /tytan/i.test(nick) || (wt > 99 && mapMode != 5)) return 'tytan';
        if (/heros/i.test(tip) || /heros/i.test(nick) || (wt > 79 && wt <= 99) || (wt >= 30 && wt <= 39)) return 'heros';
        if (/elita\s*ii/i.test(tip) || /elita\s*ii/i.test(nick) || (wt >= 20 && wt <= 29)) return 'e2';

        return null;
    };

    const alertedNpcIds = new Set();
    const scanMapForMonsters = () => {
        if (!ls.modules.soundNotifier || !isNI || !W.Engine?.npcs?.check) return;
        const npcs = W.Engine.npcs.check();
        if (!npcs) return;

        const currentNpcIds = new Set();
        for (const id in npcs) {
            const npc = npcs[id];
            const numId = parseInt(id, 10);
            currentNpcIds.add(numId);

            const rank = detectRank(npc);
            if (rank && !alertedNpcIds.has(numId)) {
                alertedNpcIds.add(numId);
                playAlert(rank, npc.d?.nick || npc.nick || 'Potwór');
            }
        }

        for (const id of alertedNpcIds) {
            if (!currentNpcIds.has(id)) alertedNpcIds.delete(id);
        }
    };

    // --- 2. ANALIZA GRACZA W CZASIE RZECZYWISTYM ---
    const isInMyParty = (targetId) => {
        if (!targetId) return false;
        const p = isNI ? W.Engine?.party : W.g?.party;
        if (!p) return false;
        try {
            if (typeof p.getMembers === 'function') {
                const members = p.getMembers();
                if (members && (members[targetId] || members[String(targetId)])) return true;
                if (Array.isArray(members) && members.some(m => parseInt(m?.id || m, 10) === targetId)) return true;
            }
            if (typeof p === 'object') {
                if (p[targetId] || p[String(targetId)]) return true;
            }
        } catch (e) {}
        return false;
    };

    const getTargetClan = (rawOther, d) => {
        let id = '';
        let name = '';

        const c = d?.clan || rawOther?.clan;
        if (c && typeof c === 'object') {
            id = c.id ? String(c.id) : '';
            name = c.name ? String(c.name).toLowerCase().trim() : '';
        } else if (typeof c === 'string' && c.trim() !== '') {
            name = c.toLowerCase().trim();
        } else if (typeof c === 'number' && c > 0) {
            id = String(c);
        }

        const cInfo = d?.clanInfo || rawOther?.clanInfo;
        if (cInfo && typeof cInfo === 'object') {
            if (!id && cInfo.id) id = String(cInfo.id);
            if (!name && cInfo.name) name = String(cInfo.name).toLowerCase().trim();
        }

        if (!name && (d?.clanName || rawOther?.clanName)) {
            name = String(d?.clanName || rawOther?.clanName).toLowerCase().trim();
        }
        if (!id && (d?.clanId || rawOther?.clanId)) {
            id = String(d?.clanId || rawOther?.clanId);
        }

        return { id, name, hasClan: Boolean((id && id !== '0') || (name && name !== '')) };
    };

    const getFullPlayerRelation = (rawOther, d) => {
        const id = d?.id || rawOther?.id;
        const numId = parseInt(id, 10);

        if (isNI && W.Engine?.whoIsHere) {
            const wih = W.Engine.whoIsHere;
            try {
                if (typeof wih.getRelation === 'function') {
                    const r = wih.getRelation(numId);
                    if (r) return String(r).toLowerCase().trim();
                }
                if (typeof wih.getList === 'function') {
                    const list = wih.getList();
                    const entry = list && (list[numId] || list[String(numId)]);
                    if (entry?.relation) return String(entry.relation).toLowerCase().trim();
                }
                if (typeof wih.getById === 'function') {
                    const entry = wih.getById(numId);
                    if (entry?.relation) return String(entry.relation).toLowerCase().trim();
                }
            } catch (e) {}
        }

        if (typeof rawOther?.getRelation === 'function') {
            try {
                const r = rawOther.getRelation();
                if (r) return String(r).toLowerCase().trim();
            } catch (e) {}
        }
        if (typeof rawOther?.getClanRelation === 'function') {
            try {
                const r = rawOther.getClanRelation();
                if (r) return String(r).toLowerCase().trim();
            } catch (e) {}
        }

        const rel = d?.relation || rawOther?.relation || '';
        if (rel) return String(rel).toLowerCase().trim();

        const ctip = String(d?.ctip || rawOther?.ctip || '').toLowerCase();
        if (ctip.includes('t_cl-en') || ctip.includes('cl-en') || ctip.includes('clan-enemies')) return 'cl-en';
        if (ctip.includes('t_en') || ctip.includes('enemy')) return 'en';
        if (ctip.includes('t_cl-fr') || ctip.includes('cl-fr') || ctip.includes('clan-friends')) return 'cl-fr';
        if (ctip.includes('t_cl') || ctip.includes('clan-members')) return 'cl';
        if (ctip.includes('t_fr') || ctip.includes('friends')) return 'fr';

        return '';
    };

    const checkClanDiplomacyLive = (targetClan) => {
        if (!targetClan || !targetClan.hasClan) return null;
        const engineClan = isNI ? W.Engine?.clan : W.g?.clan;
        if (!engineClan || typeof engineClan !== 'object') return null;

        const tId = targetClan.id ? String(targetClan.id) : null;
        const tName = targetClan.name ? targetClan.name.toLowerCase().trim() : null;

        if (typeof engineClan.getRelationWithClan === 'function' && tId) {
            try {
                const r = String(engineClan.getRelationWithClan(tId)).toLowerCase();
                if (['ally', 'allies', 'friend', 'friends', 'cl-fr', 'clan-friends', '4', '5'].includes(r)) return 'ally';
                if (['war', 'enemy', 'enemies', 'clan-enemies', 'cl-en', '3'].includes(r)) return 'clanEnemy';
            } catch (e) {}
        }

        const matchesClan = (item) => {
            if (!item) return false;
            if (typeof item === 'object') {
                const iId = String(item.id || item.clan_id || item.clanId || '');
                const iName = String(item.name || item.clan_name || item.clanName || '').toLowerCase().trim();
                if (tId && iId && tId === iId) return true;
                if (tName && iName && tName === iName) return true;
            } else if (typeof item === 'string') {
                const clean = item.toLowerCase().trim();
                if (tName && tName === clean) return true;
                if (tId && tId === clean) return true;
            } else if (typeof item === 'number') {
                if (tId && tId === String(item)) return true;
            }
            return false;
        };

        const allyLists = [
            engineClan.allies, engineClan.friends, engineClan.clanFriends, engineClan.alliances,
            engineClan.d?.allies, engineClan.d?.friends, engineClan.d?.clanFriends, engineClan.d?.alliances
        ];
        for (const list of allyLists) {
            if (!list) continue;
            if (Array.isArray(list)) {
                for (const item of list) {
                    if (matchesClan(item)) return 'ally';
                }
            } else if (typeof list === 'object') {
                for (const [k, v] of Object.entries(list)) {
                    if (tId && String(k) === tId) return 'ally';
                    if (matchesClan(v)) return 'ally';
                }
            }
        }

        const relationsList = [engineClan.relations, engineClan.diplomacy, engineClan.d?.relations, engineClan.d?.diplomacy];
        for (const relObj of relationsList) {
            if (!relObj || typeof relObj !== 'object') continue;
            if (Array.isArray(relObj)) {
                for (const r of relObj) {
                    if (!r || typeof r !== 'object') continue;
                    const rRel = String(r.relation || r.type || r.status || '').toLowerCase();
                    const rId = String(r.id || r.clan_id || r.clanId || '');
                    const rName = String(r.name || r.clan_name || r.clanName || '').toLowerCase().trim();
                    const isMatch = (tId && rId && tId === rId) || (tName && rName && tName === rName);
                    if (isMatch) {
                        if (['ally', 'allies', 'friend', 'friends', 'cl-fr', 'clan-friends', '2', '4', '5'].includes(rRel)) return 'ally';
                        if (['war', 'enemy', 'enemies', 'clan-enemies', 'cl-en', '3'].includes(rRel)) return 'clanEnemy';
                    }
                }
            } else {
                for (const [k, v] of Object.entries(relObj)) {
                    const rRel = String(typeof v === 'object' ? (v?.relation || v?.type || '') : v).toLowerCase();
                    const vName = typeof v === 'object' ? String(v?.name || v?.clanName || '').toLowerCase().trim() : '';
                    const isMatch = (tId && String(k) === tId) || (tName && vName && tName === vName);
                    if (isMatch) {
                        if (['ally', 'allies', 'friend', 'friends', 'cl-fr', 'clan-friends', '2', '4', '5'].includes(rRel)) return 'ally';
                        if (['war', 'enemy', 'enemies', 'clan-enemies', 'cl-en', '3'].includes(rRel)) return 'clanEnemy';
                    }
                }
            }
        }

        return null;
    };

    const isClanMemberLive = (rawOther, d, rel) => {
        if (C.isSameClan(d)) return true;
        if (typeof rawOther?.isClanMember === 'function' && rawOther.isClanMember()) return true;
        if (['cl', 'clan', 'clan-members', 'clan-member'].includes(rel)) return true;
        const ctip = String(d?.ctip || rawOther?.ctip || '').toLowerCase();
        if (ctip.includes('t_cl') && !ctip.includes('t_cl-fr') && !ctip.includes('t_cl-en')) return true;
        return false;
    };

    const isClanEnemyLive = (rawOther, d, rel, targetClan) => {
        if (typeof rawOther?.isClanEnemy === 'function' && rawOther.isClanEnemy()) return true;
        if (['3', 'clan-enemies', 'clan-enemy', 'cl-enemies', 'cl-enemy', 'cl-en', 'cl_en'].includes(rel)) return true;
        const ctip = String(d?.ctip || rawOther?.ctip || '').toLowerCase();
        if (ctip.includes('t_cl-en') || ctip.includes('cl-en') || ctip.includes('clan-enemies')) return true;
        if (checkClanDiplomacyLive(targetClan) === 'clanEnemy') return true;
        return false;
    };

    const isEnemyLive = (rawOther, d, rel) => {
        if (typeof rawOther?.isEnemy === 'function' && rawOther.isEnemy()) return true;
        if (['1', '6', 'enemy', 'enemies', 'en', 'fr-en'].includes(rel)) return true;
        const ctip = String(d?.ctip || rawOther?.ctip || '').toLowerCase();
        if ((ctip.includes('t_en') || ctip.includes('enemy')) && !ctip.includes('t_cl-en') && !ctip.includes('clan-enemies')) return true;
        return false;
    };

    const isAllyLive = (rawOther, d, rel, targetClan) => {
        if (typeof rawOther?.isClanFriend === 'function' && rawOther.isClanFriend()) return true;
        if (typeof rawOther?.isAlly === 'function' && rawOther.isAlly()) return true;
        if (typeof rawOther?.isFriend === 'function' && rawOther.isFriend()) return true;
        const allyKeywords = [
            'clan-friends', 'clan-friend', 'cl-fr', 'cl_fr',
            'clan-allies', 'cl-allies', 'clan-ally', 'ally', 'allies',
            'friends', 'friend', 'fr', 'fr-fr',
            '2', '4', '5'
        ];
        if (allyKeywords.includes(rel)) return true;
        const ctip = String(d?.ctip || rawOther?.ctip || '').toLowerCase();
        if (ctip.includes('t_cl-fr') || ctip.includes('cl-fr') || ctip.includes('clan-friends')) return true;
        if (checkClanDiplomacyLive(targetClan) === 'ally') return true;
        return false;
    };

    // --- 3. KLASYFIKACJA GRACZA ---
    const detectPlayerCategory = (rawOther) => {
        const d = rawOther?.d || rawOther;
        if (!d || !d.id) return null;

        const hero = getHero();
        const myId = parseInt(hero?.id, 10);
        const targetId = parseInt(d.id, 10);
        if (myId && targetId === myId) return null;

        const rel = getFullPlayerRelation(rawOther, d);
        const targetClan = getTargetClan(rawOther, d);

        // 1. Wróg klanowy
        if (isClanEnemyLive(rawOther, d, rel, targetClan)) {
            return 'clanEnemy';
        }

        // 2. Wróg osobisty
        if (isEnemyLive(rawOther, d, rel)) {
            return 'enemy';
        }

        // 3. Członek naszego klanu
        if (isClanMemberLive(rawOther, d, rel)) {
            return 'clanMember';
        }

        // 4. Sojusznik lub przyjaciel
        if (isAllyLive(rawOther, d, rel, targetClan)) {
            return 'ally';
        }

        // Członkowie drużyny niesklasyfikowani wyżej są ignorowani
        if (isInMyParty(targetId)) {
            return null;
        }

        // 5. Każdy inny gracz na mapie to NIEZNAJOMY
        return 'stranger';
    };

    // --- 4. POBIERANIE WSZYSTKICH GRACZY NA MAPIE ---
    const getAllPlayersOnMap = () => {
        const allPlayers = [];
        const seenIds = new Set();

        const addPlayer = (o) => {
            if (!o) return;
            const d = o.d || o;
            const id = d?.id || o.id;
            if (id && !seenIds.has(String(id))) {
                seenIds.add(String(id));
                allPlayers.push(o);
            }
        };

        if (isNI && W.Engine?.others?.check) {
            try {
                const othersObj = W.Engine.others.check();
                if (othersObj && typeof othersObj === 'object') {
                    for (const o of Object.values(othersObj)) addPlayer(o);
                }
            } catch (e) {}
        }

        if (isNI && W.Engine?.whoIsHere?.getList) {
            try {
                const wihList = W.Engine.whoIsHere.getList();
                if (wihList && typeof wihList === 'object') {
                    for (const [id, entry] of Object.entries(wihList)) {
                        addPlayer(entry.d ? entry : { d: entry, id: id });
                    }
                }
            } catch (e) {}
        }

        if (isNI && W.Engine?.others?.getDrawableList) {
            try {
                const drawList = W.Engine.others.getDrawableList();
                if (Array.isArray(drawList)) {
                    for (const o of drawList) addPlayer(o);
                }
            } catch (e) {}
        }

        if (!isNI && W.g?.other) {
            for (const o of Object.values(W.g.other)) addPlayer(o);
        }

        return allPlayers;
    };

    const alertedPlayerIds = new Set();
    const scanMapForPlayers = (incomingOtherPacket = null) => {
        if (!ls.modules.soundNotifier) return;

        let players = getAllPlayersOnMap();

        if (incomingOtherPacket && typeof incomingOtherPacket === 'object') {
            for (const [id, pData] of Object.entries(incomingOtherPacket)) {
                if (pData && typeof pData === 'object' && !pData.del) {
                    players.push({ d: pData, id: id });
                }
            }
        }

        const currentOtherIds = new Set();
        for (const o of players) {
            const d = o.d || o;
            const numId = parseInt(d?.id, 10);
            if (!numId) continue;
            currentOtherIds.add(numId);

            const cat = detectPlayerCategory(o);
            if (cat && !alertedPlayerIds.has(numId)) {
                alertedPlayerIds.add(numId);
                playAlert(cat, d.nick || 'Gracz');
            }
        }

        for (const id of alertedPlayerIds) {
            if (!currentOtherIds.has(id)) alertedPlayerIds.delete(id);
        }
    };

    // --- REAKCJA NA PAKIETY I PĘTLA SKANOWANIA ---
    C.onPacket((d) => {
        if (!d) return;
        if (d.npc) scanMapForMonsters();
        if (d.other) scanMapForPlayers(d.other);
        if (d.town) {
            alertedNpcIds.clear();
            alertedPlayerIds.clear();
        }
    });

    setInterval(() => {
        scanMapForMonsters();
        scanMapForPlayers();
    }, 300);
})();
