// modules/soundNotifier.js - Powiadomienia dźwiękowe o potworach i graczach
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('SOUND_NOTIFIER_GUI')) return;

    const { W, isNI, ls, getHero, saveLS, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // --- DOMYŚLNE DŹWIĘKI ---
    const DEFAULT_E2_SOUND = 'https://cronus.margonem.com/sounds/elite2_here.mp3';
    const DEFAULT_BOSS_SOUND = 'https://kaktusdev.gitlab.io/ni-essentials/sfx/detector.mp3';
    const DEFAULT_PLAYER_SOUND = 'https://cronus.margonem.com/sounds/enemy_here.mp3';

    if (!ls.soundNotifier) {
        ls.soundNotifier = {
            volume: 80,
            e2: { enabled: true, url: DEFAULT_E2_SOUND },
            heros: { enabled: true, url: DEFAULT_BOSS_SOUND },
            tytan: { enabled: true, url: DEFAULT_BOSS_SOUND },
            kolos: { enabled: true, url: DEFAULT_BOSS_SOUND },
            enemy: { enabled: true, url: DEFAULT_PLAYER_SOUND },
            clanEnemy: { enabled: true, url: DEFAULT_PLAYER_SOUND },
            stranger: { enabled: false, url: DEFAULT_PLAYER_SOUND }
        };
    }

    // Automatyczna aktualizacja starych domyślnych linków (jeśli ktoś ich sam nie zmienił na własne)
    const isOldTestSound = (url) => !url || (typeof url === 'string' && url.includes('actions.google.com'));
    if (isOldTestSound(ls.soundNotifier.e2?.url)) ls.soundNotifier.e2.url = DEFAULT_E2_SOUND;
    if (isOldTestSound(ls.soundNotifier.heros?.url)) ls.soundNotifier.heros.url = DEFAULT_BOSS_SOUND;
    if (isOldTestSound(ls.soundNotifier.tytan?.url)) ls.soundNotifier.tytan.url = DEFAULT_BOSS_SOUND;
    if (isOldTestSound(ls.soundNotifier.kolos?.url)) ls.soundNotifier.kolos.url = DEFAULT_BOSS_SOUND;

    const isOldPlayerSound = (url) => !url || (typeof url === 'string' && (url.includes('kaktusdev.gitlab.io') || url.includes('actions.google.com')));
    if (!ls.soundNotifier.enemy || isOldPlayerSound(ls.soundNotifier.enemy?.url)) ls.soundNotifier.enemy = { enabled: true, url: DEFAULT_PLAYER_SOUND };
    if (!ls.soundNotifier.clanEnemy || isOldPlayerSound(ls.soundNotifier.clanEnemy?.url)) ls.soundNotifier.clanEnemy = { enabled: true, url: DEFAULT_PLAYER_SOUND };
    if (!ls.soundNotifier.stranger || isOldPlayerSound(ls.soundNotifier.stranger?.url)) ls.soundNotifier.stranger = { enabled: false, url: DEFAULT_PLAYER_SOUND };

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
            <div style="font-size: 8px; font-weight: 800; color: #ff4d4d; letter-spacing: 0.6px; margin-top: 4px;">GRACZE (PVP)</div>
            ${createRowHtml('enemy', 'WROGOWIE', cfg.enemy)}
            ${createRowHtml('clanEnemy', 'WROGIE KLANY', cfg.clanEnemy)}
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

    // --- 2. WYKRYWANIE GRACZY ---
    const detectPlayerCategory = (rawOther) => {
        const d = rawOther?.d || rawOther;
        if (!d || !d.id) return null;

        const hero = getHero();
        const myId = parseInt(hero?.id, 10);
        const targetId = parseInt(d.id, 10);
        if (myId && targetId === myId) return null;

        if (C.isSameClan(d)) return null;

        let rel = d.relation || rawOther.relation || '';
        if (!rel && typeof rawOther.getRelation === 'function') {
            try { rel = rawOther.getRelation(); } catch (e) {}
        }
        rel = String(rel).toLowerCase().trim();

        const isFriendOrAlly = [
            'clan-members', 'clan-friends', 'friends', 'friend',
            'cl-fr', 'cl', 'clan', 'fr', '2', '4', '5'
        ].includes(rel);

        if (isFriendOrAlly) return null;

        if (['3', 'clan-enemies', 'clan-enemy', 'cl-enemies', 'cl-enemy', 'cl-en'].includes(rel)) {
            return 'clanEnemy';
        }

        if (['1', '6', 'enemy', 'enemies', 'en'].includes(rel)) {
            return 'enemy';
        }

        if (['', '0', 'other'].includes(rel) || !rel) {
            return 'stranger';
        }

        return null;
    };

    const alertedPlayerIds = new Set();
    const scanMapForPlayers = () => {
        if (!ls.modules.soundNotifier) return;

        let rawOthers = [];
        if (isNI && W.Engine?.others?.getDrawableList) {
            rawOthers = W.Engine.others.getDrawableList().filter(o => o && (o.d || o.id));
        } else if (W.g && W.g.other) {
            rawOthers = Object.values(W.g.other);
        }

        const currentOtherIds = new Set();
        for (const o of rawOthers) {
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
        if (d.npc) scanMapForMonsters();
        if (d.other) scanMapForPlayers();
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
