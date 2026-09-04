// modules/showCollisions.js - Wizualizacja siatki kolizji na Nowym Interfejsie
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C || document.getElementById('SHOW_COLLISIONS_GUI')) return;

    const { W, isNI, ls, saveLS, makeDraggable, updateAllVisibilities, registerWindow } = C;

    // --- USTAWIENIA DOMYŚLNE ---
    if (!ls.showCollisions) {
        ls.showCollisions = {
            alpha: 35,
            showBorders: true,
            showNpc: true
        };
    }
    if (typeof ls.modules.showCollisions === 'undefined') ls.modules.showCollisions = true;
    if (typeof ls.guiVisible.showCollisions === 'undefined') ls.guiVisible.showCollisions = false;

    const cfg = ls.showCollisions;
    cfg.alpha = Math.min(Math.max(parseInt(cfg.alpha, 10) || 35, 10), 80);
    if (typeof cfg.showBorders === 'undefined') cfg.showBorders = true;
    if (typeof cfg.showNpc === 'undefined') cfg.showNpc = true;

    const baseX = parseInt(ls.pos?.x, 10) || 120;
    const baseY = parseInt(ls.pos?.y, 10) || 120;
    ls.posShowCollisions = C.getValidPos(ls.posShowCollisions, baseX, baseY + 360, 130);

    // --- BUDOWA GUI OKNA ---
    const colMain = document.createElement('div');
    colMain.setAttribute('id', 'SHOW_COLLISIONS_GUI');
    colMain.className = 'ac-window';
    colMain.style.left = `${ls.posShowCollisions.x}px`;
    colMain.style.top = `${ls.posShowCollisions.y}px`;

    colMain.innerHTML = `
        <div class="ac-header">
            <button class="ac-status-btn ${ls.modules.showCollisions ? 'AC-ON' : 'AC-OFF'}"></button>
            <span class="ac-title">KOLIZJE</span>
            <button class="ac-close-btn" title="Schowaj okno">&#215;</button>
        </div>
        <div class="ac-body">
            <!-- OPCJA: KONTURY -->
            <div class="ac-row">
                <button class="ac-square-btn btn-borders ${cfg.showBorders ? 'AC-ON' : 'AC-OFF'}" title="Włącz / Wyłącz obramowanie kratek">
                    ${cfg.showBorders ? C.svg.checkmarkSvg : ''}
                </button>
                <span class="ac-toggle-label lbl-borders">KONTURY</span>
            </div>

            <!-- OPCJA: KOLIZJE NPC -->
            <div class="ac-row">
                <button class="ac-square-btn btn-npc ${cfg.showNpc ? 'AC-ON' : 'AC-OFF'}" title="Włącz / Wyłącz podświetlenie kolizji potworów/NPC">
                    ${cfg.showNpc ? C.svg.checkmarkSvg : ''}
                </button>
                <span class="ac-toggle-label lbl-npc">NPC / MOBY</span>
            </div>

            <!-- SUWAK PRZEŹROCZYSTOŚCI -->
            <div class="ac-range-header" style="margin-top: 2px;">
                <span>WIDOCZNOŚĆ</span>
                <span class="ac-range-val col-val">${cfg.alpha}%</span>
            </div>
            <input class="ac-range-slider col-slider" type="range" min="10" max="80" step="5" value="${cfg.alpha}">

            <!-- PRESETY -->
            <div class="ac-filter-row">
                <button class="ac-filter-btn btn-20">20%</button>
                <button class="ac-filter-btn btn-35">35%</button>
                <button class="ac-filter-btn btn-55">55%</button>
            </div>
        </div>
    `;

    document.body.appendChild(colMain);

    // --- OBSŁUGA ZDARZEŃ GUI ---
    const statusBtn = colMain.querySelector('.ac-status-btn');
    statusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ls.modules.showCollisions = !ls.modules.showCollisions;
        saveLS();
        updateAllVisibilities();
    });

    colMain.querySelector('.ac-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        ls.guiVisible.showCollisions = false;
        saveLS();
        updateAllVisibilities();
    });

    const btnBorders = colMain.querySelector('.btn-borders');
    const toggleBorders = () => {
        cfg.showBorders = !cfg.showBorders;
        btnBorders.className = `ac-square-btn btn-borders ${cfg.showBorders ? 'AC-ON' : 'AC-OFF'}`;
        btnBorders.innerHTML = cfg.showBorders ? C.svg.checkmarkSvg : '';
        saveLS();
    };
    btnBorders.addEventListener('click', toggleBorders);
    colMain.querySelector('.lbl-borders').addEventListener('click', toggleBorders);

    const btnNpc = colMain.querySelector('.btn-npc');
    const toggleNpc = () => {
        cfg.showNpc = !cfg.showNpc;
        btnNpc.className = `ac-square-btn btn-npc ${cfg.showNpc ? 'AC-ON' : 'AC-OFF'}`;
        btnNpc.innerHTML = cfg.showNpc ? C.svg.checkmarkSvg : '';
        saveLS();
    };
    btnNpc.addEventListener('click', toggleNpc);
    colMain.querySelector('.lbl-npc').addEventListener('click', toggleNpc);

    const colSlider = colMain.querySelector('.col-slider');
    const colValText = colMain.querySelector('.col-val');
    colSlider.addEventListener('input', () => {
        cfg.alpha = parseInt(colSlider.value, 10) || 35;
        colValText.innerText = `${cfg.alpha}%`;
        saveLS();
    });

    const setAlphaPreset = (val) => {
        cfg.alpha = val;
        colSlider.value = String(val);
        colValText.innerText = `${val}%`;
        saveLS();
    };
    colMain.querySelector('.btn-20').addEventListener('click', () => setAlphaPreset(20));
    colMain.querySelector('.btn-35').addEventListener('click', () => setAlphaPreset(35));
    colMain.querySelector('.btn-55').addEventListener('click', () => setAlphaPreset(55));

    makeDraggable(colMain, colMain.querySelector('.ac-header'), 'posShowCollisions', ['.ac-close-btn', '.ac-status-btn']);
    registerWindow('showCollisions', { mainEl: colMain, statusBtn: statusBtn });

    // --- LOGIKA SPRAWDZANIA KOLIZJI ---
    const isMapTileBlocked = (x, y) => {
        // 1. Sprawdzenie przez silnik NI
        if (W.Engine?.map?.col?.check) {
            return Boolean(W.Engine.map.col.check(x, y));
        }
        // 2. Fallback na ciąg znaków mapy
        const mapD = W.Engine?.map?.d || W.map;
        if (mapD && mapD.col && mapD.x) {
            return mapD.col.charAt(x + y * mapD.x) === '1';
        }
        return false;
    };

    // --- RYSOWANIE SIATKI KOLIZJI NA CANVASIE ---
    const drawCollisions = (ctx) => {
        if (!ls.modules.showCollisions || !isNI || !W.Engine?.map?.d) return;

        const mapD = W.Engine.map.d;
        if (!mapD.x || !mapD.y) return;

        const offset = W.Engine.map.offset || [0, 0];
        const shift = (W.Engine.mapShift?.getShift ? W.Engine.mapShift.getShift() : null) || [0, 0];
        const totalOffsetX = offset[0] + shift[0];
        const totalOffsetY = offset[1] + shift[1];

        const size = typeof W.Engine.getCanvasViewSize === 'function'
            ? W.Engine.getCanvasViewSize()
            : { width: ctx.canvas?.width || window.innerWidth, height: ctx.canvas?.height || window.innerHeight };

        // Obliczamy kafelki widoczne w oknie gry (optymalizacja wydajności)
        const startX = Math.max(0, Math.floor(totalOffsetX / 32));
        const endX = Math.min(mapD.x - 1, Math.ceil((totalOffsetX + size.width) / 32));

        const startY = Math.max(0, Math.floor(totalOffsetY / 32));
        const endY = Math.min(mapD.y - 1, Math.ceil((totalOffsetY + size.height) / 32));

        // Zbieramy pozycje NPC z kolizją
        const npcTiles = new Set();
        if (cfg.showNpc && W.Engine?.npcs?.check) {
            const npcs = W.Engine.npcs.check();
            if (npcs) {
                for (const id in npcs) {
                    const d = npcs[id]?.d || npcs[id];
                    if (d && typeof d.x === 'number' && typeof d.y === 'number') {
                        // Ignorujemy przejścia/dialogowce bez kolizji fizycznej jeśli typ = 4
                        if (d.type !== 4) {
                            npcTiles.add(`${d.x},${d.y}`);
                        }
                    }
                }
            }
        }

        const alpha = Math.min(Math.max((cfg.alpha || 35) / 100, 0.05), 0.95);
        const borderAlpha = Math.min(alpha + 0.25, 1);

        ctx.save();

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const isBlocked = isMapTileBlocked(x, y);
                const isNpc = npcTiles.has(`${x},${y}`);

                if (isBlocked || isNpc) {
                    const screenX = Math.round(x * 32 - totalOffsetX);
                    const screenY = Math.round(y * 32 - totalOffsetY);

                    // Pomarańczowy dla NPC, czerwony dla zwykłych ścian/wody
                    if (isNpc && !isBlocked) {
                        ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`;
                        ctx.strokeStyle = `rgba(255, 160, 0, ${borderAlpha})`;
                    } else {
                        ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`;
                        ctx.strokeStyle = `rgba(255, 60, 60, ${borderAlpha})`;
                    }

                    ctx.fillRect(screenX, screenY, 32, 32);

                    if (cfg.showBorders) {
                        ctx.lineWidth = 1;
                        ctx.strokeRect(screenX + 0.5, screenY + 0.5, 31, 31);
                    }
                }
            }
        }

        ctx.restore();
    };

    // --- HOOK SILNIKA RYSOWANIA MAPY NI ---
    const hookMapDraw = () => {
        if (!isNI || W._collisionDrawHooked) return;

        const tryHook = () => {
            if (W.Engine?.map && typeof W.Engine.map.draw === 'function' && !W._collisionDrawHooked) {
                W._collisionDrawHooked = true;
                const origDraw = W.Engine.map.draw;

                W.Engine.map.draw = function(ctx) {
                    const res = origDraw.apply(this, arguments);
                    try {
                        if (ls.modules.showCollisions && ctx) {
                            drawCollisions(ctx);
                        }
                    } catch (e) {}
                    return res;
                };
                return true;
            }
            return false;
        };

        if (!tryHook()) {
            const h = setInterval(() => {
                if (tryHook()) clearInterval(h);
            }, 100);
        }
    };

    hookMapDraw();
})();
