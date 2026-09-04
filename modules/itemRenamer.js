// modules/itemRenamer.js - Własne nazywanie przedmiotów w Margonem NI
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C) return;

    const { W, isNI, ls, saveLS } = C;

    if (!ls.itemNames) ls.itemNames = {};
    if (!ls.modules) ls.modules = {};
    if (typeof ls.modules.itemRenamer === 'undefined') ls.modules.itemRenamer = true;

    // --- STYLE CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Etykieta na przedmiocie */
        .ac-item-custom-name {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: rgba(0, 0, 0, 0.85) !important;
            color: #5eff5e !important;
            font-family: 'Nunito', 'Poppins', sans-serif !important;
            font-size: 7px !important;
            font-weight: 800 !important;
            text-align: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            padding: 0 1px !important;
            line-height: 9.5px !important;
            height: 9.5px !important;
            border-bottom: 1px solid rgba(94, 255, 94, 0.4) !important;
            border-radius: 2px 2px 0 0 !important;
            pointer-events: none !important;
            z-index: 15 !important;
            text-shadow: 0 1px 2px #000 !important;
            box-sizing: border-box !important;
        }

        .ac-rename-opt-btn {
            color: #5eff5e !important;
            font-weight: bold !important;
        }
    `;
    document.head.appendChild(style);

    // --- POBIERANIE DANYCH PRZEDMIOTU ---
    const getItemFromElement = (el) => {
        if (!el) return null;
        const itemEl = el.closest('.item, [data-item-id], [id^="item"], .can-drag');
        if (!itemEl) return null;

        // 1. Z silnika gry
        if (isNI && W.Engine?.items?.fetchLocationItems) {
            const locations = ['g', 'h', 'd', 'k', 'm', 'b'];
            for (const loc of locations) {
                const items = W.Engine.items.fetchLocationItems(loc) || [];
                for (const it of items) {
                    const dom = it.$?.[0] || it.$;
                    if (dom && (dom === itemEl || dom.contains(itemEl) || itemEl.contains(dom))) {
                        return { id: String(it.id), name: it.d?.name || it.name, itemObj: it, el: itemEl };
                    }
                }
            }
        }

        // 2. Po ID w atrybutach
        let id = itemEl.dataset?.itemId || itemEl.dataset?.id;
        if (!id && itemEl.id && itemEl.id.startsWith('item')) {
            const m = itemEl.id.match(/\d+/);
            if (m) id = m[0];
        }

        if (id) {
            let name = 'Przedmiot #' + id;
            if (isNI && W.Engine?.items?.getItemById) {
                const it = W.Engine.items.getItemById(id);
                if (it) name = it.d?.name || it.name || name;
            }
            return { id: String(id), name, itemObj: null, el: itemEl };
        }

        return null;
    };

    // --- NAKŁADANIE PODPISU NA PRZEDMIOT ---
    const applyLabel = (el, name) => {
        if (!el || el.nodeType !== 1) return;
        let badge = el.querySelector('.ac-item-custom-name');

        if (!name || !ls.modules.itemRenamer) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'ac-item-custom-name';
            el.style.position = 'relative';
            el.appendChild(badge);
        }

        if (badge.innerText !== name) {
            badge.innerText = name;
        }
    };

    const updateAllLabels = () => {
        if (!ls.modules.itemRenamer) {
            document.querySelectorAll('.ac-item-custom-name').forEach(b => b.remove());
            return;
        }

        if (isNI && W.Engine?.items?.fetchLocationItems) {
            const locations = ['g', 'h', 'd', 'k', 'm', 'b'];
            locations.forEach(loc => {
                const items = W.Engine.items.fetchLocationItems(loc) || [];
                items.forEach(it => {
                    const custom = ls.itemNames?.[it.id];
                    const el = it.$?.[0] || it.$;
                    if (el) applyLabel(el, custom);
                });
            });
        }

        if (ls.itemNames) {
            Object.entries(ls.itemNames).forEach(([id, custom]) => {
                document.querySelectorAll(`#item${id}, [data-item-id="${id}"]`).forEach(el => applyLabel(el, custom));
            });
        }
    };

    // --- OKNO WPISYWANIA NAZWY ---
    const openRenameModal = (itemId, currentName, itemName) => {
        document.getElementById('AC_RENAME_MODAL')?.remove();

        const modal = document.createElement('div');
        modal.id = 'AC_RENAME_MODAL';
        modal.className = 'ac-window';
        modal.style.cssText = `
            position: fixed;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 220px;
            z-index: 9999999;
            background: #000000;
            border: 1px solid #4de64d;
            box-shadow: 0 0 25px rgba(0,0,0,0.95), 0 0 10px rgba(77, 230, 77, 0.4);
            padding: 0;
        `;

        modal.innerHTML = `
            <div class="ac-header" style="cursor: default;">
                <span class="ac-title" style="left: 10px; right: 25px;">NAZWIJ PRZEDMIOT</span>
                <button class="ac-close-btn" title="Zamknij">&#215;</button>
            </div>
            <div class="ac-body" style="padding: 8px; gap: 6px;">
                <div style="background: #0c0c0c; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); font-size: 8.5px; font-weight: bold; color: #ffffff; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${itemName || ('Przedmiot #' + itemId)}
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <span style="font-size: 7.5px; font-weight: 700; color: rgba(255,255,255,0.7);">Wpisz własną nazwę:</span>
                    <input class="ac-input rename-field" type="text" maxlength="20" placeholder="np. Ogień, PvP, TP..." value="${currentName || ''}" style="text-align: left; padding: 0 6px; height: 22px; font-size: 9.5px; border-color: #4de64d;">
                </div>
                <div style="display: flex; gap: 4px; margin-top: 3px;">
                    <button class="ac-wide-btn AC-ON btn-save" style="flex: 2; height: 22px; font-size: 8.5px;">ZAPISZ</button>
                    ${currentName ? `<button class="ac-filter-btn btn-del" style="flex: 1; height: 22px; color: #ff4d4d; border-color: rgba(255,77,77,0.4);">USUŃ</button>` : ''}
                    <button class="ac-filter-btn btn-close" style="flex: 1; height: 22px;">ANULUJ</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('.rename-field');
        input.focus();
        input.select();

        const save = () => {
            const val = input.value.trim();
            if (!ls.itemNames) ls.itemNames = {};
            if (val) {
                ls.itemNames[itemId] = val;
            } else {
                delete ls.itemNames[itemId];
            }
            saveLS();
            updateAllLabels();
            modal.remove();
        };

        modal.querySelector('.btn-save').addEventListener('click', save);
        modal.querySelector('.ac-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-close').addEventListener('click', () => modal.remove());

        const delBtn = modal.querySelector('.btn-del');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                if (ls.itemNames) delete ls.itemNames[itemId];
                saveLS();
                updateAllLabels();
                modal.remove();
            });
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') { e.preventDefault(); modal.remove(); }
        });
    };

    // --- WSTRZYKIWANIE OPCJI DO OFICJALNEGO MENU MARGONEM (Engine.cMenu) ---
    const hookMargonemMenu = () => {
        if (!isNI || !W.Engine?.cMenu) return;
        const cMenu = W.Engine.cMenu;
        if (cMenu._renamerHooked) return;
        cMenu._renamerHooked = true;

        const origInit = cMenu.init;
        cMenu.init = function(data, options) {
            const res = origInit.apply(this, arguments);
            try {
                // Sprawdzamy czy menu otwiera się dla przedmiotu
                let itId = null;
                let itName = '';

                if (options?.item) {
                    itId = String(options.item.id);
                    itName = options.item.d?.name || options.item.name;
                } else if (cMenu.target?.item) {
                    itId = String(cMenu.target.item.id);
                    itName = cMenu.target.item.d?.name || cMenu.target.item.name;
                } else if (cMenu.target && cMenu.target.id) {
                    itId = String(cMenu.target.id);
                }

                if (itId && /^\d+$/.test(itId)) {
                    const menuEl = cMenu.$?.[0] || document.querySelector('.c-menu, .menu, [class*="c-menu"]');
                    if (menuEl && !menuEl.querySelector('.ac-rename-opt-btn')) {
                        const curName = ls.itemNames?.[itId] || '';
                        const opt = document.createElement('li');
                        opt.className = 'ac-rename-opt-btn';
                        opt.style.cssText = 'cursor:pointer; display:flex; align-items:center; gap:6px; padding:5px 10px; color:#5eff5e; font-weight:bold; font-size:11px;';
                        opt.innerHTML = `<span>🏷️</span> <span>${curName ? 'Zmień nazwę' : 'Nazwij'}</span>`;

                        opt.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            if (typeof cMenu.close === 'function') cMenu.close();
                            else menuEl.remove();
                            openRenameModal(itId, curName, itName);
                        });

                        const list = menuEl.querySelector('ul') || menuEl;
                        list.appendChild(opt);
                    }
                }
            } catch (err) {}
            return res;
        };
    };

    // --- METODA BEZPOŚREDNIA (Shift + PPM lub Alt + PPM na dowolny przedmiot) ---
    document.addEventListener('mousedown', (e) => {
        // Prawy przycisk myszy (button 2) z wciśniętym klawiszem Shift LUB Alt
        if (e.button === 2 && (e.shiftKey || e.altKey)) {
            const itemData = getItemFromElement(e.target);
            if (itemData) {
                e.preventDefault();
                e.stopPropagation();
                const curName = ls.itemNames?.[itemData.id] || '';
                openRenameModal(itemData.id, curName, itemData.name);
            }
        }
    }, true);

    // Reakcja na pakiety i interwał
    setInterval(() => {
        hookMargonemMenu();
        updateAllLabels();
    }, 400);

    C.onPacket((d) => {
        if (d.item) setTimeout(updateAllLabels, 60);
    });
})();
