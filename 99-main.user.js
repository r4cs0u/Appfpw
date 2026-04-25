// ==UserScript==
// @name         Automacao Folha de Ponto
// @namespace    http://tampermonkey.net/
// @version      8.2
// @match        https://myway.g.globo/WebPonto/just_user/justuser.asp*
// @grant        none
// @run-at       document-idle
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/00-core.js
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/10-utils.js
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/20-mapa.js
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/30-popup.js
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/40-fases.js
// @require      https://raw.githubusercontent.com/r4cs0u/Appfpw/main/50-analisar.js
// ==/UserScript==

(function () {
    'use strict';

    var AF = window.AutomacaoFolha;

    function esperarCabecalho(callback) {
        var tent = 0;
        var iv = setInterval(function () {
            tent++;
            if (tent > 120) { clearInterval(iv); return; }
            try {
                var cabec = window.top.frames[0];
                if (!cabec || !cabec.document || !cabec.document.body) return;
                var sel = cabec.document.getElementById('lstNome');
                if (!sel) sel = cabec.document.querySelector('select[name="lstNome"]');
                if (!sel) return;
                clearInterval(iv);
                callback(cabec, cabec.document, sel);
            } catch (e) {}
        }, 500);
    }

    esperarCabecalho(function (cabec, docC, selNome) {
        var antigo = docC.getElementById('painel-simples');
        if (antigo) antigo.parentNode.removeChild(antigo);

        var painel = docC.createElement('div');
        painel.id = 'painel-simples';
        painel.style.cssText = 'position:fixed;top:4px;right:6px;z-index:999999;background:#111827;color:#f9fafb;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.5);font-family:Arial,sans-serif;font-size:11px;width:320px;height:200px;border:1px solid #374151;overflow:hidden;display:flex;flex-direction:column;';

        painel.innerHTML =
            '<div style="background:#1f2937;padding:3px 8px;font-weight:bold;font-size:11px;border-bottom:1px solid #374151;text-align:center;flex-shrink:0;">Folha de Ponto - Automacao</div>' +
            '<div style="display:flex;flex:1;overflow:hidden;">' +
            '<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;padding:5px 4px;border-right:1px solid #374151;background:#1a2233;min-width:38px;align-items:center;flex-shrink:0;">' +
            '<button id="btn-analisar" title="Analisar mes alvo" style="width:28px;height:28px;border:0;border-radius:6px;background:#2563eb;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#128269;</button>' +
            '<button id="btn-executar" title="Folgas + Gravar" style="width:28px;height:28px;border:0;border-radius:6px;background:#7c3aed;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#9881;&#65039;</button>' +
            '<button id="btn-copiar" title="Copiar relatorio" style="width:28px;height:28px;border:0;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;" disabled>&#128203;</button>' +
            '<div style="width:24px;height:1px;background:#374151;"></div>' +
            '<button id="btn-parar" title="Parar execucao" style="width:28px;height:28px;border:0;border-radius:6px;background:#1f2937;border:1px solid #dc2626;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;" disabled>&#128721;</button>' +
            '</div>' +
            '<div id="log-box" style="flex:1;padding:5px 7px;overflow-y:auto;line-height:1.5;font-size:11px;color:#9ca3af;background:#0b1220;">Aguardando...</div>' +
            '</div>';

        docC.body.appendChild(painel);

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            docC.getElementById('log-box').innerHTML = '';
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            docC.getElementById('log-box').innerHTML = '';
            await AF.fases.processarTodas(docC);
        };

        docC.getElementById('btn-parar').onclick = function () {
            AF.core.cancelarTudo();
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.core.log('PARADO pelo usuario.', '#f87171');
            AF.core.setBotoes(false);
        };

        docC.getElementById('btn-copiar').onclick = function () {
            if (!AF.estado.textoCopiavel) return;
            navigator.clipboard.writeText(AF.estado.textoCopiavel).then(function () {
                AF.core.log('Relatorio copiado!', '#a3e635');
            }).catch(function () {
                AF.core.log('Erro ao copiar.', '#f87171');
            });
        };

        AF.core.log('Pronto para executar.', '#a3e635');
        AF.core.setBotoes(false);
        AF.core.iniciarKeepAlive(2); // refresh do frame 1 a cada 2 minutos
    });
})();
