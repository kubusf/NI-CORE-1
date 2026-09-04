// modules/showCollisions.js - Wizualizacja wyłącznie fizycznych kolizji mapy (bez potworów/NPC)
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
            color: '#ff2828'
        };
    }
    if (typeof ls.modules.showCollisions === 'undefined') ls.modules.showCollisions = true;
    if (typeof ls.guiVisible.showCollisions === 'undefined') ls.guiVisible.showCollisions = false;

    const cfg = ls.showCollisions;
    cfg.alpha = Math.min(Math.max(parseInt(cfg.alpha, 10) || 35, 10), 80);
    if (typeof cfg.showBorders === 'undefined') cfg.showBorders = true;
    if (!cfg.color) cfg.color = '#ff2828';

    const hexToRgb = (hex) => {
        let c = String(hex || '#ff2828').replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    };

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
            <!-- KONTURY -->
            <div class="ac-row">
                <button class="ac-square-btn btn-borders ${cfg.showBorders ? 'AC-ON' : 'AC-OFF'}" title="Włącz / Wyłącz obramowanie kratek">
                    ${cfg.showBorders ? C.svg.checkmarkSvg : ''}
                </button>
                <span class="ac-toggle-label lbl-borders">KONTURY</span>
            </div>

            <!-- WYBÓR KOLORU -->
            <div class="ac-range-header" style="margin-top: 3px;">
                <span>KOLOR</span>
            </div>
            <div class="ac-filter-row col-palette" style="gap: 3px; align-items: center;">
                <button class="ac-color-dot" data-col="#ff2828" style="background:#ff2828;" title="Czerwony"></button>
                <button class="ac-color-dot" data-col="#ffe600" style="background:#ffe600;" title="Żółty"></button>
                <button class="ac-color-dot" data-col="#00e5ff" style="background:#00e5ff;" title="Błękitny"></button>
                <button class="ac-color-dot" data-col="#00e676" style="background:#00e676;" title="Zielony"></button>
                <button class="ac-color-dot" data-col="#d500f9" style="background:#d500f9;" title="Fioletowy"></button>
                <label style="margin:0; padding:0; display:flex; cursor:pointer;" title="Własny kolor">
                    <input type="color" class="col-picker-input" value="${cfg.color}" style="opacity:0; width:0; height:0; position:absolute;">
                    <div class="ac-color-custom-btn" style="background:${cfg.color}; width:16px; height:16px; border-radius:3px; border:1px solid #fff; box-sizing:border-box;"></div>
                </label>
            </div>

            <!-- SUWAK WIDOCZNOŚCI -->
            <div class="ac-range-header" style="margin-top: 3px;">
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

    // Style dla palety kolorów
    const palStyle = document.createElement('style');
    palStyle.innerHTML = `
        .ac-color-dot {
            width: 16px;
            height: 16px;
            border-radius: 3px;
            border: 1px solid rgba(255,255,255,0.3);
            cursor: pointer;
            padding: 0;
            margin: 0;
            outline: none;
            flex: 1;
            transition: transform 0.12s, border-color 0.15s;
        }
        .ac-color-dot:hover {
            transform: scale(1.18);
            border-color: #ffffff;
        }
        .ac-color-dot.active {
            border: 1.5px solid #ffffff !important;
            box-shadow: 0 0 5px #ffffff;
        }
    `;
    document.head.appendChild(palStyle);

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

    // Kontury
    const btnBorders = colMain.querySelector('.btn-borders');
    const toggleBorders = () => {
        cfg.showBorders = !cfg.showBorders;
        btnBorders.className = `ac-square-btn btn-borders ${cfg.showBorders ? 'AC-ON' : 'AC-OFF'}`;
        btnBorders.innerHTML = cfg.showBorders ? C.svg.checkmarkSvg : '';
        saveLS();
    };
    btnBorders.addEventListener('click', toggleBorders);
    colMain.querySelector('.lbl-borders').addEventListener('click', toggleBorders);

    // Wybór koloru
    const colorDots = colMain.querySelectorAll('.ac-color-dot');
    const customColorBtn = colMain.querySelector('.ac-color-custom-btn');
    const customColorInput = colMain.querySelector('.col-picker-input');

    const updateColorVisuals = (chosenCol) => {
        colorDots.forEach(b => b.classList.toggle('active', b.getAttribute('data-col') === chosenCol));
        customColorBtn.style.background = chosenCol;
        customColorInput.value = chosenCol;
    };

    const setColor = (newCol) => {
        cfg.color = newCol;
        updateColorVisuals(newCol);
        saveLS();
    };

    colorDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            setColor(dot.getAttribute('data-col'));
        });
    });

    customColorInput.addEventListener('input', () => {
        setColor(customColorInput.value);
    });

    updateColorVisuals(cfg.color);

    // Suwak przezroczystości
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

    // --- ODCZYT WYŁĄCZNIE FIZYCZNYCH ŚCIAN Z SERWERA ---
    // Całkowicie pomijamy Engine.map.col.check, który dokładał potwory
    const isStaticMapBlocked = (x, y, mapD) => {
        if (!mapD || !mapD.col || !mapD.x) return false;
        if (x < 0 || x >= mapD.x || y < 0 || y >= mapD.y) return true;

        const idx = x + y * mapD.x;
        const char = mapD.col.charAt(idx);
        // '0' oznacza w Margonem wolne pole. Wszystko inne ('1', '2') to ściana/woda.
        return char !== '0' && char !== '';
    };

    // --- RYSOWANIE SIATKI NA CANVASIE ---
    const drawCollisions = (ctx) => {
        if (!ls.modules.showCollisions || !isNI || !W.Engine?.map?.d) return;

        const mapD = W.Engine.map.d;
        if (!mapD.x || !mapD.y || !mapD.col) return;

        const offset = W.Engine.map.offset || [0, 0];
        const shift = (W.Engine.mapShift?.getShift ? W.Engine.mapShift.getShift() : null) || [0, 0];
        const totalOffsetX = offset[0] + shift[0];
        const totalOffsetY = offset[1] + shift[1];

        const size = typeof W.Engine.getCanvasViewSize === 'function'
            ? W.Engine.getCanvasViewSize()
            : { width: ctx.canvas?.width || window.innerWidth, height: ctx.canvas?.height || window.innerHeight };

        const startX = Math.max(0, Math.floor(totalOffsetX / 32));
        const endX = Math.min(mapD.x - 1, Math.ceil((totalOffsetX + size.width) / 32));
        const startY = Math.max(0, Math.floor(totalOffsetY / 32));
        const endY = Math.min(mapD.y - 1, Math.ceil((totalOffsetY + size.height) / 32));

        // Zbieramy pozycje wszystkich NPC i potworów – nigdy nie nakładamy na nie kolizji
        const npcTiles = new Set();
        if (W.Engine?.npcs?.check) {
            const npcs = W.Engine.npcs.check();
            if (npcs) {
                for (const id in npcs) {
                    const d = npcs[id]?.d || npcs[id];
                    if (d && typeof d.x === 'number' && typeof d.y === 'number') {
                        npcTiles.add(`${d.x},${d.y}`);
                    }
                }
            }
        }

        const alpha = Math.min(Math.max((cfg.alpha || 35) / 100, 0.05), 0.95);
        const borderAlpha = Math.min(alpha + 0.3, 1);
        const rgb = hexToRgb(cfg.color);

        ctx.save();
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.strokeStyle = `rgba(${Math.min(255, rgb.r + 35)}, ${Math.min(255, rgb.g + 35)}, ${Math.min(255, rgb.b + 35)}, ${borderAlpha})`;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                // Jeśli na polu stoi potwór/NPC -> BEZWZGLĘDNIE POMIJAMY
                if (npcTiles.has(`${x},${y}`)) continue;

                if (isStaticMapBlocked(x, y, mapD)) {
                    const screenX = Math.round(x * 32 - totalOffsetX);
                    const screenY = Math.round(y * 32 - totalOffsetY);

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

    // --- HOOK MAPY ---
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
