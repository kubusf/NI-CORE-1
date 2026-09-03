// ==UserScript==
// @name         NI Core
// @version      1.0
// @description  Automatyczna paczka dodatków na NI Margonem
// @author       Kuba
// @match        https://*.margonem.pl/
// @exclude      http*://margonem.*/*
// @exclude      http*://www.margonem.*/*
// @exclude      http*://new.margonem.*/*
// @exclude      http*://forum.margonem.*/*
// @exclude      http*://commons.margonem.*/*
// @exclude      http*://dev-commons.margonem.*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/kubusf/NI-CORE/refs/heads/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/kubusf/NI-CORE/refs/heads/main/loader.user.js
// ==/UserScript==

(function() {
    'use strict';

    const BASE_URL = 'https://raw.githubusercontent.com/kubusf/NI-CORE/refs/heads/main/';

    function fetchCode(path) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${BASE_URL}${path}?t=${Date.now()}`,
                onload: (res) => {
                    if (res.status === 200) resolve(res.responseText);
                    else reject(`HTTP ${res.status}: ${path}`);
                },
                onerror: (err) => reject(err)
            });
        });
    }

    function runScript(code) {
        const runner = new Function('unsafeWindow', 'window', code);
        runner(unsafeWindow, unsafeWindow);
    }

    function waitForGame() {
        return new Promise((resolve) => {
            const check = () => {
                const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
                const isNIReady = typeof W.Engine === 'object' && (W.Engine.allInit || (W.Engine.hero && W.Engine.hero.d));
                const isSIReady = typeof W.g === 'object' && W.hero;
                if (isNIReady || isSIReady) return resolve();
                setTimeout(check, 100);
            };
            check();
        });
    }

    async function start() {
        await waitForGame();
        try {
            const coreCode = await fetchCode('core.js');
            runScript(coreCode);

            const manifestRaw = await fetchCode('manifest.json');
            const modules = JSON.parse(manifestRaw);

            for (const mod of modules) {
                try {
                    const modCode = await fetchCode(mod);
                    runScript(modCode);
                } catch (e) {
                    console.error(`[NI Core] Błąd ładowania ${mod}:`, e);
                }
            }

            console.log('%c[NI Core] Pomyślnie załadowano paczkę!', 'color: #4de64d; font-weight: bold;');
        } catch (e) {
            console.error('[NI Core] Błąd ładowania paczki:', e);
        }
    }

    start();
})();
