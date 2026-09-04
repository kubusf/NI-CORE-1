// modules/soundNotifier.js - Powiadomienia dźwiękowe o rzadkich potworach
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('SOUND_NOTIFIER_GUI')) return;

    const { W, isNI, ls, saveLS, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // --- USTAWIENIA I DOMYŚLNE DŹWIĘKI ---
    if (!ls.soundNotifier) {
        ls.soundNotifier = {
            volume: 80,
            e2: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
            heros: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' },
            tytan: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
            kolos: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg' }
        };
    }
    if (typeof ls.modules.soundNotifier === 'undefined') ls.modules.soundNotifier = true;
    if (typeof ls.guiVisible.soundNotifier === 'undefined') ls.guiVisible.soundNotifier = true;

    const cfg = ls.soundNotifier;
    cfg.volume = typeof cfg.volume === 'number' ? cfg.volume : 80;

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posSoundNotifier = C.getValidPos(ls.posSoundNotifier, baseX, baseY + 360, 210);

    // --- BUDOWA GUI ---
    const soundMain = document.createElement('div');
    soundMain.setAttribute('id', 'SOUND_NOTIFIER_GUI');
    soundMain.className = 'ac-window';
    soundMain.style.width = '210px';
    soundMain.style.left = `${ls.posSoundNotifier.x}px`;
    soundMain.style.top = `${ls.posSoundNotifier.y}px`;

    soundMain.innerHTML = `
        <div class="ac-header">
            <button class="ac-status-btn ${ls.modules.soundNotifier ? 'AC-ON' : 'AC-OFF'}"></button>
            <span class="ac-title" style="left: 20px; right: 20px;">SOUND DETECT</span>
            <button class="ac-close-btn" title="Schowaj okno">&#215;</button>
        </div>
        <div class="ac-body" style="gap: 6px;">
            <!-- GŁOŚNOŚĆ -->
            <div class="ac-range-header">
                <span>GŁOŚNOŚĆ</span>
                <span class="ac-range-val sound-vol-val">${cfg.volume}%</span>
            </div>
            <input class="ac-range-slider sound-vol-slider" type="range" min="0" max="100" step="5" value="${cfg.volume}">

            <!-- KAFELKI POTWORÓW -->
            ${createRowHtml('e2', 'ELITA II', cfg.e2)}
            ${createRowHtml('heros', 'HEROS', cfg.heros)}
            ${createRowHtml('tytan', 'TYTAN', cfg.tytan)}
            ${createRowHtml('kolos', 'KOLOS', cfg.kolos)}
        </div>
    `;

    function createRowHtml(key, label, data) {
        return `
            <div class="ac-sound-block" data-key="${key}" style="display: flex; flex-direction: column; gap: 3px; background: #0c0c0c; padding: 4px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.12);">
                <div class="ac-row" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <button class="ac-square-btn btn-toggle ${data.enabled ? 'AC-ON' : 'AC-OFF'}" title="Włącz / Wyłącz dźwięk dla tego potwora">
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

    // --- ZDARZENIA GUI ---
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

    // Regulacja głośności
    const volSlider = soundMain.querySelector('.sound-vol-slider');
    const volText = soundMain.querySelector('.sound-vol-val');
    volSlider.addEventListener('input', () => {
        cfg.volume = parseInt(volSlider.value, 10) || 0;
        volText.innerText = `${cfg.volume}%`;
        saveLS();
    });

    // Obsługa wierszy potworów (Checkbox, Input, Przycisk Test)
    let testingAudio = null;
    let activeTestBtn = null;

    soundMain.querySelectorAll('.ac-sound-block').forEach(block => {
        const key = block.getAttribute('data-key');
        const btnToggle = block.querySelector('.btn-toggle');
        const btnTest = block.querySelector('.btn-test');
        const inputUrl = block.querySelector('.sound-input');

        // Włącznik potwora
        btnToggle.addEventListener('click', () => {
            cfg[key].enabled = !cfg[key].enabled;
            btnToggle.className = `ac-square-btn btn-toggle ${cfg[key].enabled ? 'AC-ON' : 'AC-OFF'}`;
            btnToggle.innerHTML = cfg[key].enabled ? C.svg.checkmarkSvg : '';
            saveLS();
        });

        // Wpisywanie linku
        inputUrl.addEventListener('input', () => {
            cfg[key].url = inputUrl.value.trim();
            saveLS();
        });

        // Testowanie dźwięku
        btnTest.addEventListener('click', (e) => {
            e.stopPropagation();
            if (testingAudio) {
                testingAudio.pause();
                testingAudio.currentTime = 0;
                if (activeTestBtn) {
                    activeTestBtn.innerText = 'TEST';
                    activeTestBtn.className = 'ac-filter-btn btn-test AC-OFF';
                }
                if (activeTestBtn === btnTest) {
                    testingAudio = null;
                    activeTestBtn = null;
                    return;
                }
            }

            const url = cfg[key].url;
            if (!url) return;

            testingAudio = new Audio(url);
            testingAudio.volume = (cfg.volume || 80) / 100;
            btnTest.innerText = 'STOP';
            btnTest.className = 'ac-filter-btn btn-test AC-ON';
            activeTestBtn = btnTest;

            testingAudio.onended = () => {
                btnTest.innerText = 'TEST';
                btnTest.className = 'ac-filter-btn btn-test AC-OFF';
                testingAudio = null;
                activeTestBtn = null;
            };

            testingAudio.onerror = () => {
                btnTest.innerText = 'BŁĄD';
                btnTest.className = 'ac-filter-btn btn-test AC-OFF';
                setTimeout(() => { btnTest.innerText = 'TEST'; }, 2000);
                testingAudio = null;
                activeTestBtn = null;
            };

            testingAudio.play().catch(() => {
                btnTest.innerText = 'BŁĄD';
                btnTest.className = 'ac-filter-btn btn-test AC-OFF';
                setTimeout(() => { btnTest.innerText = 'TEST'; }, 2000);
            });
        });
    });

    makeDraggable(soundMain, soundMain.querySelector('.ac-header'), 'posSoundNotifier', ['.ac-close-btn', '.ac-status-btn']);
    registerWindow('soundNotifier', { mainEl: soundMain, statusBtn: statusBtn });

    // --- LOGIKA WYKRYWANIA POTWORÓW ---
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

        // 1. Kolos: waga > 99 na mapie o trybie 5 (instancja kolosa) lub w nazwie/tipie
        if (/kolos/i.test(tip) || /kolos/i.test(nick) || (wt > 99 && mapMode == 5)) {
            return 'kolos';
        }
        // 2. Tytan: waga > 99 poza instancją kolosa lub w nazwie/tipie
        if (/tytan/i.test(tip) || /tytan/i.test(nick) || (wt > 99 && mapMode != 5)) {
            return 'tytan';
        }
        // 3. Heros: waga 80-99 lub 30-39 lub w nazwie/tipie
        if (/heros/i.test(tip) || /heros/i.test(nick) || (wt > 79 && wt <= 99) || (wt >= 30 && wt <= 39)) {
            return 'heros';
        }
        // 4. Elita II: waga 20-29 lub w nazwie/tipie
        if (/elita\s*ii/i.test(tip) || /elita\s*ii/i.test(nick) || (wt >= 20 && wt <= 29)) {
            return 'e2';
        }

        return null;
    };

    const alertedNpcIds = new Set();

    const playAlert = (rank, npcNick) => {
        const soundData = cfg[rank];
        if (!soundData || !soundData.enabled || !soundData.url) return;

        try {
            const audio = new Audio(soundData.url);
            audio.volume = (cfg.volume || 80) / 100;
            audio.play().catch(e => console.warn('[Sound Notifier] Błąd odtwarzania:', e));
            console.log(`%c[Sound Notifier] Wykryto: ${rank.toUpperCase()} (${npcNick})`, 'color: #ff3344; font-weight: bold;');
        } catch (e) {
            console.error('[Sound Notifier] Audio Error:', e);
        }
    };

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

        // Czyszczenie potworów, które już zniknęły lub zginęły
        for (const id of alertedNpcIds) {
            if (!currentNpcIds.has(id)) alertedNpcIds.delete(id);
        }
    };

    // Reagowanie na nowe potwory z pakietów
    C.onPacket((d) => {
        if (d.npc) scanMapForMonsters();
        if (d.town) alertedNpcIds.clear(); // Po zmianie mapy czyścimy pamięć
    });

    if (isNI && W.API?.addCallbackToEvent) {
        try {
            W.API.addCallbackToEvent('newNpc', (npc) => {
                if (!ls.modules.soundNotifier) return;
                const rank = detectRank(npc);
                const numId = parseInt(npc.d?.id, 10);
                if (rank && numId && !alertedNpcIds.has(numId)) {
                    alertedNpcIds.add(numId);
                    playAlert(rank, npc.d?.nick || 'Potwór');
                }
            });
        } catch (e) {}
    }

    setInterval(scanMapForMonsters, 300);
})();
