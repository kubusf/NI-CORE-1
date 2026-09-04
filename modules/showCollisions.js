// modules/showCollisions.js - Wizualizacja fizycznych kolizji mapy
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

    const cfg = ls.showCollisions;
    cfg.alpha = Math.min(Math.max(parseInt(cfg.alpha, 10) || 35, 10), 100);
    if (typeof cfg.showBorders === 'undefined') cfg.showBorders = true;
    if (!cfg.color || typeof cfg.color !== 'string' || !cfg.color.startsWith('#') || cfg.color.length !== 7) {
        cfg.color = '#ff2828';
    }

    if (typeof ls.modules.showCollisions === 'undefined') ls.modules.showCollisions = true;
    if (typeof ls.guiVisible.showCollisions === 'undefined') ls.guiVisible.showCollisions = true;

    const hexToRgb = (hex) => {
        let c = String(hex || '#ff2828').replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        if (isNaN(num)) return { r: 255, g: 40, b: 40 };
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
            <div class="ac-filter-row" style="align-items: center;">
                <label style="margin: 0; padding: 0; display: flex; cursor: pointer; width: 100%;" title="Wybierz własny kolor">
                    <input type="color" class="col-picker-input" value="${cfg.color}" style="opacity: 0; width: 0; height: 0; position: absolute;">
                    <div class="ac-color-custom-btn" style="background: ${cfg.color}; width: 100%; height: 20px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.4); box-sizing: border-box;"></div>
                </label>
            </div>

            <!-- SUWAK WIDOCZNOŚCI -->
            <div class="ac-range-header" style="margin-top: 3px;">
                <span>WIDOCZNOŚĆ</span>
                <span class="ac-range-val col-val">${cfg.alpha}%</span>
            </div>
            <input class="ac-range-slider col-slider" type="range" min="10" max="100" step="5" value="${cfg.alpha}">
        </div>
    `;

    document.body.appendChild(colMain);

    // Style kafelka wyboru koloru
    const palStyle = document.createElement('style');
    palStyle.innerHTML = `
        .ac-color-custom-btn {
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ac-color-custom-btn:hover {
            border-color: #ffffff !important;
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
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
    const customColorBtn = colMain.querySelector('.ac-color-custom-btn');
    const customColorInput = colMain.querySelector('.col-picker-input');

    const updateColorVisuals = (chosenCol) => {
        const safeCol = (chosenCol && chosenCol.startsWith('#') && chosenCol.length === 7) ? chosenCol : '#ff2828';
        if (customColorBtn) customColorBtn.style.background = safeCol;
        try {
            if (customColorInput) customColorInput.value = safeCol;
        } catch (err) {}
    };

    const setColor = (newCol) => {
        cfg.color = newCol;
        updateColorVisuals(newCol);
        saveLS();
    };

    customColorInput.addEventListener('input', () => {
        setColor(customColorInput.value);
    });

    updateColorVisuals(cfg.color);

    // Suwak widoczności
    const colSlider = colMain.querySelector('.col-slider');
    const colValText = colMain.querySelector('.col-val');
    colSlider.addEventListener('input', () => {
        cfg.alpha = parseInt(colSlider.value, 10) || 35;
        colValText.innerText = `${cfg.alpha}%`;
        saveLS();
    });

    makeDraggable(colMain, colMain.querySelector('.ac-header'), 'posShowCollisions', ['.ac-close-btn', '.ac-status-btn']);
    registerWindow('showCollisions', { mainEl: colMain, statusBtn: statusBtn });

    // --- INTEGRACJA Z HUBEM (GŁÓWNYM MENU) ---
    const attachToHub = () => {
        const hubBody = document.querySelector('#AUTO_COMBO_HUB .ac-body');
        if (!hubBody || document.getElementById('AC_HUB_ITEM_COLLISIONS')) return;

        const hubItem = document.createElement('div');
        hubItem.setAttribute('id', 'AC_HUB_ITEM_COLLISIONS');
        hubItem.className = `ac-hub-item ${ls.modules.showCollisions ? 'AC-ON' : 'AC-OFF'}`;
        hubItem.setAttribute('title', 'Kliknij kafelek, aby włączyć lub wyłączyć Kolizje');
        hubItem.addEventListener('click', () => {
            ls.modules.showCollisions = !ls.modules.showCollisions;
            saveLS();
            updateAllVisibilities();
        });

        const hubRow = document.createElement('div');
        hubRow.className = 'ac-hub-row';
        const titleGroup = document.createElement('div');
        titleGroup.className = 'ac-hub-title-group';
        const dot = document.createElement('span');
        dot.className = `ac-hub-dot ${ls.modules.showCollisions ? 'AC-ON' : 'AC-OFF'}`;
        titleGroup.appendChild(dot);
        const title = document.createElement('span');
        title.className = 'ac-hub-item-title';
        title.innerText = 'KOLIZJE';
        titleGroup.appendChild(title);
        hubRow.appendChild(titleGroup);

        const guiBtn = document.createElement('button');
        guiBtn.className = `ac-hub-gui-btn ${ls.guiVisible.showCollisions ? 'AC-ON' : 'AC-OFF'}`;
        guiBtn.setAttribute('title', 'Otwórz / Ukryj okno Kolizje');
        guiBtn.innerHTML = C.svg.guiWindowSvg;
        guiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ls.guiVisible.showCollisions = !ls.guiVisible.showCollisions;
            saveLS();
            updateAllVisibilities();
        });
        rowAppend(hubRow, guiBtn);
        hubItem.appendChild(hubRow);

        const desc = document.createElement('div');
        desc.className = 'ac-hub-desc';
        desc.innerText = 'Podświetlanie zablokowanych pól mapy (ścian, wody i przeszkód).';
        hubItem.appendChild(desc);

        hubBody.appendChild(hubItem);

        function rowAppend(p, c) { p.appendChild(c); }

        const updateTile = () => {
            const isModOn = Boolean(ls.modules.showCollisions);
            const isGuiOn = Boolean(ls.guiVisible.showCollisions);
            hubItem.className = `ac-hub-item ${isModOn ? 'AC-ON' : 'AC-OFF'}`;
            dot.className = `ac-hub-dot ${isModOn ? 'AC-ON' : 'AC-OFF'}`;
            guiBtn.className = `ac-hub-gui-btn ${isGuiOn ? 'AC-ON' : 'AC-OFF'}`;
        };

        const origUpdate = C.updateAllVisibilities;
        C.updateAllVisibilities = () => {
            origUpdate();
            updateTile();
        };
        updateTile();
    };

    setTimeout(attachToHub, 200);

    // --- RYSOWANIE SIATKI NA CANVASIE ---
    const drawCollisions = (ctx) => {
        if (!ls.modules.showCollisions || !isNI || !W.Engine?.map) return;

        const mapD = W.Engine.map.d;
        if (!mapD || !mapD.col || !mapD.x) return;

        const offset = W.Engine.map.offset || [0, 0];
        const shift = (W.Engine.mapShift?.getShift ? W.Engine.mapShift.getShift() : null) || [0, 0];
        const totalOffsetX = offset[0] + shift[0];
        const totalOffsetY = offset[1] + shift[1];

        const size = typeof W.Engine.getCanvasViewSize === 'function'
            ? W.Engine.getCanvasViewSize()
            : { width: ctx.canvas?.width || window.innerWidth, height: ctx.canvas?.height || window.innerHeight };

        const maxX = mapD.x - 1;
        const maxY = mapD.y ? mapD.y - 1 : 999;

        const startX = Math.max(0, Math.floor(totalOffsetX / 32));
        const endX = Math.min(maxX, Math.ceil((totalOffsetX + size.width) / 32));
        const startY = Math.max(0, Math.floor(totalOffsetY / 32));
        const endY = Math.min(maxY, Math.ceil((totalOffsetY + size.height) / 32));

        const alpha = Math.min(Math.max((cfg.alpha || 35) / 100, 0.05), 1);
        const borderAlpha = Math.min(alpha + 0.3, 1);
        const rgb = hexToRgb(cfg.color);

        ctx.save();
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.strokeStyle = `rgba(${Math.min(255, rgb.r + 35)}, ${Math.min(255, rgb.g + 35)}, ${Math.min(255, rgb.b + 35)}, ${borderAlpha})`;

        const colStr = mapD.col;
        const mapWidth = mapD.x;

        for (let y = startY; y <= endY; y++) {
            const rowOffset = y * mapWidth;
            for (let x = startX; x <= endX; x++) {
                // Bezpośrednie sprawdzenie fizycznej kolizji mapy (nie reaguje na motyle, ptaki ani potwory)
                if (colStr.charAt(rowOffset + x) === '1') {
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
        if (!isNI) return;

        const tryHook = () => {
            if (W.Engine?.map && typeof W.Engine.map.draw === 'function') {
                if (W._collisionDrawHooked) return true;
                W._collisionDrawHooked = true;
                const origDraw = W.Engine.map.draw;

                W.Engine.map.draw = function(ctx) {
                    const res = origDraw.apply(this, arguments);
                    try {
                        if (ls.modules.showCollisions && ctx) {
                            drawCollisions(ctx);
                        }
                    } catch (e) {
                        console.error('[ShowCollisions Error]', e);
                    }
                    return res;
                };
                console.log('%c[NI Core] Kolizje podpięte pomyślnie!', 'color: #4de64d; font-weight: bold;');
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
