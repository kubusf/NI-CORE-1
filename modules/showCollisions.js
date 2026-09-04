// modules/showCollisions.js - Wizualizacja fizycznych kolizji mapy
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C) return;

    // Usuwamy ewentualne stare okno przy przeładowaniu
    const oldGui = document.getElementById('SHOW_COLLISIONS_GUI');
    if (oldGui) oldGui.remove();

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
    if (typeof ls.guiVisible.showCollisions === 'undefined') ls.guiVisible.showCollisions = false;

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

    // Style kafelka koloru
    if (!document.getElementById('AC_COLLISIONS_STYLE')) {
        const palStyle = document.createElement('style');
        palStyle.id = 'AC_COLLISIONS_STYLE';
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
    }

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

    // --- PRECYZYJNE SPRAWDZANIE ŚCIAN (BEZ WPŁYWU MOTYLI I POTWORÓW) ---
    const isWallOnly = (x, y) => {
        // 1. Sprawdzenie w silniku Margonem NI (bit 1 to fizyczna ściana)
        if (W.Engine?.map?.col?.check) {
            const c = W.Engine.map.col.check(x, y);
            return Boolean(c && ((c === 1) || (c & 1)));
        }

        // 2. Zapasowe sprawdzenie w danych mapy
        const mapD = W.Engine?.map?.d;
        if (mapD && mapD.col && mapD.x) {
            const idx = y * mapD.x + x;
            return mapD.col.charAt(idx) === '1';
        }

        return false;
    };

    // --- RYSOWANIE SIATKI NA CANVASIE ---
    const drawCollisions = (ctx) => {
        if (!ls.modules?.showCollisions || !W.Engine?.map) return;

        const mapD = W.Engine.map.d;
        const offset = W.Engine.map.offset || [0, 0];
        const shift = (W.Engine.mapShift?.getShift ? W.Engine.mapShift.getShift() : null) || [0, 0];
        const totalOffsetX = offset[0] + shift[0];
        const totalOffsetY = offset[1] + shift[1];

        const size = typeof W.Engine.getCanvasViewSize === 'function'
            ? W.Engine.getCanvasViewSize()
            : { width: ctx.canvas?.width || window.innerWidth, height: ctx.canvas?.height || window.innerHeight };

        const maxX = mapD?.x ? mapD.x - 1 : 999;
        const maxY = mapD?.y ? mapD.y - 1 : 999;

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

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isWallOnly(x, y)) {
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

    // Zawsze podpinamy najnowszą funkcję pod obiekt window
    W._ac_drawCollisions = drawCollisions;

    // --- HOOK MAPY ---
    const hookMapDraw = () => {
        const tryHook = () => {
            if (W.Engine?.map && typeof W.Engine.map.draw === 'function') {
                if (!W._collisionDrawHooked) {
                    W._collisionDrawHooked = true;
                    const origDraw = W.Engine.map.draw;

                    W.Engine.map.draw = function(ctx) {
                        const res = origDraw.apply(this, arguments);
                        try {
                            if (typeof W._ac_drawCollisions === 'function' && ctx) {
                                W._ac_drawCollisions(ctx);
                            }
                        } catch (e) {
                            console.error('[ShowCollisions Error]', e);
                        }
                        return res;
                    };
                    console.log('%c[NI Core] Kolizje podpięte pomyślnie!', 'color: #4de64d; font-weight: bold;');
                }
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
