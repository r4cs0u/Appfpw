window.AutomacaoFolha = window.AutomacaoFolha || {
    estado: {
        cancelado: false,
        ultimoPopup: null,
        relatorio: '',
        textoCopiavel: '',
        winOpenOriginal: null
    },
    core: {},
    utils: {},
    mapa: {},
    popup: {},
    fases: {}
};

(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.core = AF.core || {};

    AF.core.getDocC = function () {
        return window.top.frames[0].document;
    };

    AF.core.getDoc1 = function () {
        return window.top.frames[1].document;
    };

    AF.core.getCabec = function () {
        return window.top.frames[0];
    };

    AF.core.esperar = function (ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    };

    AF.core.norm = function (s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    AF.core.log = function (msg, cor) {
        try {
            var docC = AF.core.getDocC();
            var b = docC.getElementById('log-box');
            if (!b) return;
            var d = docC.createElement('div');
            d.style.marginTop = '3px';
            d.style.color = cor || '#f9fafb';
            d.textContent = '* ' + msg;
            b.appendChild(d);
            b.scrollTop = b.scrollHeight;
        } catch (e) {}
    };

    AF.core.setBotoes = function (rodando) {
        try {
            var docC = AF.core.getDocC();
            var btnA = docC.getElementById('btn-analisar');
            var btnE = docC.getElementById('btn-executar');
            var btnP = docC.getElementById('btn-parar');
            if (btnA) btnA.disabled = rodando;
            if (btnE) btnE.disabled = rodando;
            if (btnP) btnP.disabled = !rodando;
        } catch (e) {}
    };

    AF.core.cancelarTudo = function () {
        AF.estado.cancelado = true;
        try {
            if (AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed) {
                AF.estado.ultimoPopup.close();
            }
        } catch (e) {}
        AF.estado.ultimoPopup = null;
        // Restaura window.open original em todos os frames interceptados
        try {
            var frames = [window.top.frames[0], window.top.frames[1]];
            for (var fi = 0; fi < frames.length; fi++) {
                try {
                    var frame = frames[fi];
                    if (!frame || !frame.window) continue;
                    var stateKey = 'winOpenOriginal_' + frame.location.href.split('/').pop();
                    if (AF.estado[stateKey]) {
                        frame.window.open = AF.estado[stateKey];
                    }
                } catch(e) {}
            }
            // Compatibilidade legada
            if (AF.estado.winOpenOriginal && window.top.frames[0] && window.top.frames[0].window) {
                window.top.frames[0].window.open = AF.estado.winOpenOriginal;
            }
        } catch (e) {}
    };

    AF.core.getSelNome = function () {
        var docC = AF.core.getDocC();
        var sel = docC.getElementById('lstNome');
        if (!sel) sel = docC.querySelector('select[name="lstNome"]');
        return sel;
    };

    AF.core.nomeAtual = function () {
        var sel = AF.core.getSelNome();
        if (!sel) return '';
        var op = sel.options[sel.selectedIndex];
        return op ? (op.text || '').trim() : '';
    };

    AF.core.matAtual = function () {
        var el = AF.core.getDocC().getElementById('txtMatricula');
        return el ? el.value.trim() : '';
    };

    AF.core.paginaVaziaAgora = function () {
        try {
            var bt = AF.core.getDoc1().body ? (AF.core.getDoc1().body.innerText || '') : '';
            return bt.includes('Nenhuma marcação encontrada!') || bt.includes('Não existem informações para serem exibidas!');
        } catch (e) {
            return false;
        }
    };

    AF.core.avancarFuncionario = async function () {
        var sel = AF.core.getSelNome();
        if (!sel) return 'fim';
        if (sel.selectedIndex >= sel.options.length - 1) return 'fim';

        sel.selectedIndex = sel.selectedIndex + 1;

        var cabec = AF.core.getCabec();
        var docC = AF.core.getDocC();

        try {
            cabec.AjustaCodEmpresaEmpregado(docC.yourform.lstNome, docC.yourform.CodEmpresaEmpregado);
        } catch (e) {}

        try {
            cabec.AtualizaFuncionario();
        } catch (e) {
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await AF.core.esperar(6000);

        await new Promise(function (resolve) {
            var t = 0;
            var iv = setInterval(function () {
                t++;
                if (t > 20) { clearInterval(iv); resolve(); return; }
                try {
                    var tx = AF.core.getDoc1().querySelectorAll('input[type=text]');
                    var ir = AF.core.getDoc1().querySelectorAll('input[name^="Irre"]');
                    if (tx.length > 0 || ir.length > 0 || AF.core.paginaVaziaAgora()) {
                        clearInterval(iv);
                        resolve();
                    }
                } catch (e) {}
            }, 500);
        });

        return 'ok';
    };

    AF.core.instalarInterceptorPopup = function () {
        // Intercepta tanto o frame do cabeçalho (0) quanto o do corpo (1)
        var framesToWatch = [window.top.frames[0], window.top.frames[1]];

        for (var fi = 0; fi < framesToWatch.length; fi++) {
            (function(frame) {
                if (!frame || !frame.window) return;

                // Evita instalar duas vezes no mesmo frame
                var stateKey = 'winOpenOriginal_' + frame.location.href.split('/').pop();
                if (AF.estado[stateKey]) return;

                var originalOpen = frame.window.open;
                AF.estado[stateKey] = originalOpen;

                frame.window.open = function (url, nome, opcoes) {
                    if (AF.estado.cancelado) {
                        return originalOpen.call(frame.window, url, nome, opcoes);
                    }

                    var popup = originalOpen.call(frame.window, url, nome, opcoes);
                    if (!popup) return popup;

                    AF.estado.ultimoPopup = popup;
                    sessionStorage.removeItem('autopopupSemSucesso');

                    var dataTrocar = sessionStorage.getItem('autodataTrocar');
                    var datasCandidatas = [];
                    try {
                        datasCandidatas = JSON.parse(sessionStorage.getItem('autodatasCandidatasPopup') || '[]');
                    } catch (e0) {}

                    if (dataTrocar && !datasCandidatas.length) datasCandidatas = [dataTrocar];
                    if (!datasCandidatas.length) return popup;

                    var tent = 0;
                    var iv = setInterval(function () {
                        tent++;
                        if (tent > 120) { clearInterval(iv); return; }

                        try {
                            var s = popup.document.getElementById('rpnPeriodo_ddlDatas');
                            if (!s || !s.options || s.options.length === 0) return;
                            clearInterval(iv);
                            AF.popup.tentarIndiceDatas(popup, datasCandidatas, 0);
                        } catch (e) {}
                    }, 200);

                    return popup;
                };
            })(framesToWatch[fi]);
        }

        // Mantém compatibilidade com winOpenOriginal legado
        if (!AF.estado.winOpenOriginal && window.top.frames[0] && window.top.frames[0].window) {
            AF.estado.winOpenOriginal = window.top.frames[0].window.open;
        }
    };

})();
