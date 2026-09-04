// modules/itemRenamer.js - Własne nazywanie przedmiotów w Margonem NI
(function() {
    'use strict';
    const C = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NICore;
    if (!C) return;

    const { W, isNI, ls, saveLS } = C;

    // Inicjalizacja bazy nazw w konfiguracji
    if (!ls.itemNames) ls.itemNames = {};
    if (!ls.modules) ls.modules = {};
    if (typeof ls.modules.itemRenamer === 'undefined') ls.modules.itemRenamer = true;

    // --- STYLE CSS DLA ETYKIET I MENU ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Etykieta z nazwą na przedmiocie */
        .ac-item-custom-name {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.85);
            color: #5eff5e;
            font-family: 'Nunito', 'Poppins', sans-serif;
            font-size: 7px;
            font-weight: 800;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 2px;
            line-height: 9.5px;
            height: 9.5px;
            border-bottom: 1px solid rgba(94, 255, 94, 0.4);
            border-radius: 2px 2px 0 0;
            pointer-events: none;
            z-index: 10;
            text-shadow: 0 1px 2px #000000;
            box-sizing: border-box;
            letter-spacing: 0.2px;
        }

        /* Dodatkowa opcja w menu gry */
        .ac-menu-rename-item {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            color: #5eff5e !important;
            font-weight: 700 !important;
            font-size: 10.5px !important;
            transition: background 0.15s;
        }
        .ac-menu-rename-item:hover {
            background: rgba(94, 255, 94, 0.15) !important;
        }
    `;
    document.head.appendChild(style);

    // --- POBIERANIE ID PRZEDMIOTU Z ELEMENTU DOM ---
    const getItemIdFromElement = (el) => {
        if (!el) return null;
        if (el.dataset?.itemId) return el.dataset.itemId;
        if (el.dataset?.id) return el.dataset.id;

        if (el.id && el.id.startsWith('item')) {
            const match = el.id.match(/\d+/);
            if (match) return match[0];
        }

        const classMatch = el.className && typeof el.className === 'string' ? el.className.match(/item-id-(\d+)/) : null;
        if (classMatch) return classMatch[1];

        // Sprawdzenie w Engine.items
        if (isNI && W.Engine?.items?.fetchLocationItems) {
            const locations = ['g', 'h', 'd', 'k', 'm', 'b'];
            for (const loc of locations) {
                const items = W.Engine.items.fetchLocationItems(loc) || [];
                for (const it of items) {
                    const itEl = it.$?.[0] || it.$;
                    if (itEl && (itEl === el || itEl.contains(el))) {
                        return String(it.id);
                    }
                }
            }
        }
        return null;
    };

    // --- NAKŁADANIE ETYKIETY NA PRZEDMIOT ---
    const applyLabelToElement = (el, customName) => {
        if (!el || el.nodeType !== 1) return;
        let badge = el.querySelector('.ac-item-custom-name');

        if (!customName || !ls.modules.itemRenamer) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'ac-item-custom-name';
            el.style.position = 'relative';
            el.appendChild(badge);
        }

        if (badge.innerText !== customName) {
            badge.innerText = customName;
            badge.setAttribute('title', customName);
        }
    };

    // --- AKTUALIZACJA WSZYSTKICH PRZEDMIOTÓW NA EKRANIE ---
    const updateAllItemLabels = () => {
        if (!ls.modules.itemRenamer) {
            document.querySelectorAll('.ac-item-custom-name').forEach(b => b.remove());
            return;
        }

        if (isNI && W.Engine?.items?.fetchLocationItems) {
            const locations = ['g', 'h', 'd', 'k', 'm', 'b'];
            locations.forEach(loc => {
                const items = W.Engine.items.fetchLocationItems(loc) || [];
                items.forEach(it => {
                    const customName = ls.itemNames?.[it.id];
                    const itEl = it.$?.[0] || it.$;
                    if (itEl) applyLabelToElement(itEl, customName);
                });
            });
        }

        // Fallback po ID dla pozostałych okien
        if (ls.itemNames) {
            Object.keys(ls.itemNames).forEach(id => {
                const els = document.querySelectorAll(`#item${id}, [data-item-id="${id}"], .item-id-${id}`);
                els.forEach(el => applyLabelToElement(el, ls.itemNames[id]));
            });
        }
    };

    // --- OKNO WPISYWANIA NAZWY ---
    const openRenameDialog = (itemId, currentName, itemEl) => {
        document.getElementById('AC_RENAME_MODAL')?.remove();

        let originalName = 'Przedmiot #' + itemId;
        let iconSrc = '';

        if (isNI && W.Engine?.items?.getItemById) {
            const itemObj = W.Engine.items.getItemById(itemId);
            if (itemObj) {
                originalName = itemObj.d?.name || itemObj.name || originalName;
                if (itemObj.d?.icon) {
                    const ipath = W.CFG?.ipath || '/obrazki/itemy/';
                    iconSrc = itemObj.d.icon.startsWith('http') ? itemObj.d.icon : ipath + itemObj.d.icon;
                }
            }
        }

        if (!iconSrc && itemEl) {
            const img = itemEl.querySelector('img');
            if (img) iconSrc = img.src;
        }

        const modal = document.createElement('div');
        modal.id = 'AC_RENAME_MODAL';
        modal.className = 'ac-window';
        modal.style.cssText = `
            position: fixed;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 230px;
            z-index: 1000000;
            background: #000000;
            border: 1px solid #4de64d;
            box-shadow: 0 0 25px rgba(0,0,0,0.95), 0 0 10px rgba(77, 230, 77, 0.35);
            padding: 0;
        `;

        modal.innerHTML = `
            <div class="ac-header" style="cursor: default;">
                <span class="ac-title" style="left: 10px; right: 25px;">NAZWIJ PRZEDMIOT</span>
                <button class="ac-close-btn" title="Zamknij">&#215;</button>
            </div>
            <div class="ac-body" style="padding: 8px; gap: 7px;">
                <div style="display: flex; align-items: center; gap: 8px; background: #0c0c0c; padding: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.12);">
                    ${iconSrc ? `<img src="${iconSrc}" style="width: 30px; height: 30px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); object-fit: contain;">` : ''}
                    <div style="font-size: 8.5px; font-weight: 700; color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                        ${originalName}
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <span style="font-size: 7.5px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase;">Wpisz własną nazwę:</span>
                    <input class="ac-input rename-input" type="text" maxlength="20" placeholder="np. Set Ogień, Na Tytana..." value="${currentName || ''}" style="text-align: left; padding: 0 6px; height: 22px; font-size: 9.5px; border-color: #4de64d;">
                </div>

                <div style="display: flex; gap: 4px; margin-top: 4px;">
                    <button class="ac-wide-btn AC-ON btn-save" style="flex: 2; height: 22px; font-size: 8.5px;">ZAPISZ</button>
                    ${currentName ? `<button class="ac-filter-btn btn-delete" style="flex: 1; height: 22px; color: #ff4d4d; border-color: rgba(255,77,77,0.4);" title="Usuń nazwę">USUŃ</button>` : ''}
                    <button class="ac-filter-btn btn-cancel" style="flex: 1; height: 22px;">ANULUJ</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('.rename-input');
        input.focus();
        input.select();

        const save = () => {
            const newName = input.value.trim();
            if (!ls.itemNames) ls.itemNames = {};
            if (newName) {
                ls.itemNames[itemId] = newName;
            } else {
                delete ls.itemNames[itemId];
            }
            saveLS();
            updateAllItemLabels();
            modal.remove();
        };

        modal.querySelector('.btn-save').addEventListener('click', save);
        modal.querySelector('.ac-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());

        const delBtn = modal.querySelector('.btn-delete');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                if (ls.itemNames) delete ls.itemNames[itemId];
                saveLS();
                updateAllItemLabels();
                modal.remove();
            });
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                modal.remove();
            }
        });
    };

    // --- OBSŁUGA MENU PRZY KLIKNIĘCIU PPM ---
    const showCustomContextMenu = (x, y, itemId, currentName, itemEl) => {
        document.getElementById('AC_CUSTOM_ITEM_MENU')?.remove();

        const menu = document.createElement('div');
        menu.id = 'AC_CUSTOM_ITEM_MENU';
        menu.className = 'ac-window';
        menu.style.cssText = `
            position: fixed;
            left: ${Math.min(x, window.innerWidth - 130)}px;
            top: ${Math.min(y, window.innerHeight - 70)}px;
            width: 125px;
            z-index: 999999;
            padding: 4px;
            background: #000000;
            border: 1px solid #4de64d;
            box-shadow: 0 4px 15px rgba(0,0,0,0.95);
        `;

        const btn = document.createElement('button');
        btn.className = 'ac-wide-btn AC-ON';
        btn.style.cssText = 'height: 22px; font-size: 8.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;';
        btn.innerHTML = `<span>🏷️</span> <span>${currentName ? 'ZMIEŃ NAZWĘ' : 'NAZWIJ'}</span>`;
        btn.addEventListener('click', () => {
            menu.remove();
            openRenameDialog(itemId, currentName, itemEl);
        });
        menu.appendChild(btn);

        if (currentName) {
            const delBtn = document.createElement('button');
            delBtn.className = 'ac-wide-btn AC-OFF';
            delBtn.style.cssText = 'height: 19px; font-size: 8px; margin-top: 3px; color: #ff4d4d; border-color: rgba(255, 77, 77, 0.4);';
            delBtn.innerText = 'USUŃ NAZWĘ';
            delBtn.addEventListener('click', () => {
                menu.remove();
                if (ls.itemNames) delete ls.itemNames[itemId];
                saveLS();
                updateAllItemLabels();
            });
            menu.appendChild(delBtn);
        }

        document.body.appendChild(menu);

        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeHandler), 40);
    };

    // Przechwytywanie prawego kliku (PPM) na przedmiocie
    document.addEventListener('contextmenu', (e) => {
        const itemEl = e.target.closest('.item, [data-item-id], [id^="item"], .can-drag');
        if (!itemEl) return;

        const itemId = getItemIdFromElement(itemEl);
        if (!itemId) return;

        const currentName = ls.itemNames?.[itemId] || '';

        // Czekamy chwilę, by sprawdzić, czy gra otworzyła swoje menu kontekstowe
        setTimeout(() => {
            const gameMenu = document.querySelector('.c-menu, .context-menu, .m-context-menu, .menu');
            if (gameMenu && gameMenu.offsetParent !== null && !gameMenu.querySelector('.ac-menu-rename-item')) {
                const opt = document.createElement('div');
                opt.className = 'ac-menu-rename-item';
                opt.innerHTML = `<span>🏷️</span> <span>${currentName ? 'Zmień nazwę' : 'Nazwij'}</span>`;
                opt.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    gameMenu.remove();
                    openRenameDialog(itemId, currentName, itemEl);
                });
                gameMenu.appendChild(opt);
            } else if (!gameMenu) {
                // Jeśli gra nie utworzyła menu, wyświetlamy własne menu pod kursorem
                showCustomContextMenu(e.clientX, e.clientY, itemId, currentName, itemEl);
            }
        }, 35);
    }, false);

    // Aktualizacja etykiet przy pakietach i regularnie
    C.onPacket((d) => {
        if (d.item) setTimeout(updateAllItemLabels, 50);
    });

    setInterval(updateAllItemLabels, 600);
})();
