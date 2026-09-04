// modules/soundNotifier.js - Powiadomienia dźwiękowe z automatycznym wyłączaniem
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('SOUND_NOTIFIER_GUI')) return;

    const { W, isNI, ls, saveLS, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // --- USTAWIENIA I DŹWIĘKI ---
    if (!ls.soundNotifier) {
        ls.soundNotifier = {
            volume: 80,
            duration: 5,
            e2: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
            heros: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' },
            tytan: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
            kolos: { enabled: true, url: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg' }
        };
    }
    if (typeof ls.soundNotifier.duration === 'undefined') ls.soundNotifier.duration = 5;

    const cfg = ls.soundNotifier;
    cfg.volume = typeof cfg.volume === 'number' ? cfg.volume : 80;
    cfg.duration = typeof cfg.duration === 'number' ? cfg.duration : 5;

    const getVolumeMultiplier = () => {
        const v = typeof cfg.volume === 'number' ? cfg.volume : 80;
        return Math.max(0, Math.min(100, v)) / 100;
    };

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posSoundNotifier = C.getValidPos(ls.posSoundNotifier, baseX, baseY + 360, 210);

    let testingAudio = null;
    let activeTestBtn = null;
    let testTimeout = null;

    let currentAlertAudio = null;
    let alertTimeout = null;

    // --- BUDOWA GUI OKNA ---
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
            <input class="ac-range-slider sound-vol-slider" type="range" min="0" max="100" step="1" value="${cfg.volume}">

            <!-- CZAS TRWANIA -->
            <div class="ac-range-header" style="margin-top: 1px;">
                <span>CZAS TRWANIA</span>
                <span class="ac-range-val sound-dur-val">${cfg.duration}s</span>
            </div>
            <input class="ac-range-slider sound-dur-slider" type="range" min="1" max="20" step="1" value="${cfg.duration}">

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

    // Regulacja głośności
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

    // Regulacja czasu trwania dźwięku (1 - 20 sekund)
    const durSlider = soundMain.querySelector('.sound-dur-slider');
    const durText = soundMain.querySelector('.sound-dur-val');
    durSlider.addEventListener('input', () => {
        const val = parseInt(durSlider.value, 10);
        cfg.duration = isNaN(val) ? 5 : Math.max(1, Math.min(20, val));
        durText.innerText = `${cfg.duration}s`;
        saveLS();
    });

    // Obsługa wierszy z linkami i przycisku TEST
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
                if (testTimeout) clearTimeout(testTimeout);
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

            testingAudio = new Audio(url);
            testingAudio.volume = getVolumeMultiplier();
            btnTest.innerText = 'STOP';
            btnTest.className = 'ac-filter-btn btn-test AC-ON';
            activeTestBtn = btnTest;

            // Automatyczne wyłączenie testu po zadanym czasie
            const maxDurationMs = (cfg.duration || 5) * 1000;
            testTimeout = setTimeout(stopTest, maxDurationMs);

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

        if (/kolos/i.test(tip) || /kolos/i.test(nick) || (wt > 99 && mapMode == 5)) return 'kolos';
        if (/tytan/i.test(tip) || /tytan/i.test(nick) || (wt > 99 && mapMode != 5)) return 'tytan';
        if (/heros/i.test(tip) || /heros/i.test(nick) || (wt > 79 && wt <= 99) || (wt >= 30 && wt <= 39)) return 'heros';
        if (/elita\s*ii/i.test(tip) || /elita\s*ii/i.test(nick) || (wt >= 20 && wt <= 29)) return 'e2';

        return null;
    };

    const alertedNpcIds = new Set();

    const playAlert = (rank, npcNick) => {
        const soundData = cfg[rank];
        if (!soundData || !soundData.enabled || !soundData.url) return;

        try {
            if (alertTimeout) clearTimeout(alertTimeout);
            if (currentAlertAudio) {
                currentAlertAudio.pause();
                currentAlertAudio.currentTime = 0;
            }

            currentAlertAudio = new Audio(soundData.url);
            currentAlertAudio.volume = getVolumeMultiplier();
            currentAlertAudio.play().catch(e => console.warn('[Sound Notifier] Błąd audio:', e));

            // Zatrzymanie dźwięku po kilku sekundach
            const maxDurationMs = (cfg.duration || 5) * 1000;
            alertTimeout = setTimeout(() => {
                if (currentAlertAudio) {
                    currentAlertAudio.pause();
                    currentAlertAudio.currentTime = 0;
                }
            }, maxDurationMs);

            currentAlertAudio.onended = () => {
                if (alertTimeout) clearTimeout(alertTimeout);
            };

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

        for (const id of alertedNpcIds) {
            if (!currentNpcIds.has(id)) alertedNpcIds.delete(id);
        }
    };

    C.onPacket((d) => {
        if (d.npc) scanMapForMonsters();
        if (d.town) alertedNpcIds.clear();
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
