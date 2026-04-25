(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.popup = AF.popup || {};

    AF.popup.popupAindaAberto = function () {
        try {
            return AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed;
        } catch (e) {
            return false;
        }
    };

    AF.popup.acharLinkAjuste = function () {
        for (var f = 0; f < window.top.frames.length; f++) {
            try {
                var links = Array.from(window.top.frames[f].document.querySelectorAll('a'));
                for (var li = 0; li < links.length; li++) {
                    if ((links[li].innerText || '').includes('Ajuste Jornada Plan')) {
                        return links[li];
                    }
                }
            } catch (e) {}
        }
        return null;
    };

    AF.popup.acharRadioPorNumero = function (num) {
        if (!num) return null;
        try {
            return AF.core.getDoc1().querySelector('input[type=radio][onclick*="submitPage(' + num + ')"]');
        } catch (e) {
            return null;
        }
    };

    AF.popup.aguardarPopupPronto = async function () {
        await new Promise(function (resolve) {
            var tent = 0;
            var iv = setInterval(function () {
                tent++;
                if (tent > 60) {
                    clearInterval(iv);
                    resolve();
                    return;
                }
                try {
                    var popup = AF.estado.ultimoPopup;
                    if (!popup || popup.closed) return;
                    var s = popup.document.getElementById('rpnPeriodo_ddlDatas');
                    if (s && s.options && s.options.length > 0) {
                        clearInterval(iv);
                        resolve();
                    }
                } catch (e) {}
            }, 300);
        });
    };

    AF.popup.aguardarReloadPrincipal = async function () {
        await new Promise(function (resolve) {
            var tent1 = 0;
            var iv1 = setInterval(function () {
                tent1++;
                if (tent1 > 40) {
                    clearInterval(iv1);
                    resolve();
                    return;
                }
                try {
                    if (AF.core.getDoc1().querySelectorAll('input[name^="Irre"]').length === 0) {
                        clearInterval(iv1);

                        var tent2 = 0;
                        var iv2 = setInterval(function () {
                            tent2++;
                            if (tent2 > 40) {
                                clearInterval(iv2);
                                resolve();
                                return;
                            }
                            try {
                                var ir = AF.core.getDoc1().querySelectorAll('input[name^="Irre"]');
                                var tx = AF.core.getDoc1().querySelectorAll('input[type=text]');
                                if (ir.length > 0 || tx.length > 0 || AF.core.paginaVaziaAgora()) {
                                    clearInterval(iv2);
                                    resolve();
                                }
                            } catch (e) {}
                        }, 300);
                    }
                } catch (e) {
                    clearInterval(iv1);
                    resolve();
                }
            }, 300);
        });
    };

    AF.popup.tentarIndiceDatas = function (popup, datasCandidatas, idx) {
        function popupAindaAberto() {
            try {
                return popup && !popup.closed;
            } catch (e) {
                return false;
            }
        }

        if (!popupAindaAberto()) return;

        if (idx >= datasCandidatas.length) {
            sessionStorage.setItem('autopopupSemSucesso', '1');
            try {
                var btnOkFinal = popup.document.getElementById('ppcMsg_btnMsgErro_CD');
                if (btnOkFinal && btnOkFinal.offsetParent) btnOkFinal.click();
            } catch (e) {}
            setTimeout(function () {
                try { popup.close(); } catch (e) {}
            }, 800); // era 300 → agora 800
            return;
        }

        var dataAtual = datasCandidatas[idx];
        var sAtual = null;
        var optsAtual = [];

        try {
            sAtual = popup.document.getElementById('rpnPeriodo_ddlDatas');
            if (!sAtual || !sAtual.options || sAtual.options.length === 0) {
                setTimeout(function () {
                    AF.popup.tentarIndiceDatas(popup, datasCandidatas, idx + 1);
                }, 500);
                return;
            }
            optsAtual = Array.from(sAtual.options);
        } catch (e) {
            setTimeout(function () {
                AF.popup.tentarIndiceDatas(popup, datasCandidatas, idx + 1);
            }, 500);
            return;
        }

        var opAtual = null;
        for (var i = 0; i < optsAtual.length; i++) {
            if ((optsAtual[i].text || '').indexOf(dataAtual) >= 0 ||
                (optsAtual[i].value || '').indexOf(dataAtual) >= 0) {
                opAtual = optsAtual[i];
                break;
            }
        }

        if (!opAtual) {
            AF.popup.tentarIndiceDatas(popup, datasCandidatas, idx + 1);
            return;
        }

        try {
            for (var oo = 0; oo < sAtual.options.length; oo++) {
                sAtual.options[oo].selected = false;
            }
            opAtual.selected = true;
            sAtual.selectedIndex = opAtual.index;
            sAtual.value = opAtual.value;
            sAtual.dispatchEvent(new Event('input', { bubbles: true }));
            sAtual.dispatchEvent(new Event('change', { bubbles: true }));
            sAtual.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch (e) {
            AF.popup.tentarIndiceDatas(popup, datasCandidatas, idx + 1);
            return;
        }

        setTimeout(function () {  // era 900 → agora 1400
            if (!popupAindaAberto()) return;

            var btnG = popup.document.querySelector('input[name="btnGravar"]');
            if (!btnG) return;
            btnG.click();

            var aguardMsg = 0;
            var ivMsg = setInterval(function () {
                aguardMsg++;
                if (aguardMsg > 80) {
                    clearInterval(ivMsg);
                    return;
                }
                try {
                    if (!popupAindaAberto()) {
                        clearInterval(ivMsg);
                        return;
                    }

                    var btnOk = popup.document.getElementById('ppcMsg_btnMsgErro_CD');
                    if (btnOk && btnOk.offsetParent) {
                        clearInterval(ivMsg);
                        btnOk.click();

                        setTimeout(function () { // era 1200 → agora 1700
                            if (!popupAindaAberto()) return;
                            AF.popup.tentarIndiceDatas(popup, datasCandidatas, idx + 1);
                        }, 1700);
                    }
                } catch (e) {
                    clearInterval(ivMsg);
                }
            }, 250);
        }, 1400);
    };

    AF.popup.executarAcaoFolga = async function (acao) {
        if (AF.estado.cancelado) return { ok: false, semAlteracao: true };

        var radio = AF.popup.acharRadioPorNumero(acao.numAbrirPopup);
        if (!radio) {
            AF.core.log('ERRO: Radio nao encontrado (' + acao.numAbrirPopup + ').', '#f87171');
            return { ok: false, semAlteracao: true };
        }

        radio.click();
        await AF.core.esperar(800);

        var link = AF.popup.acharLinkAjuste();
        if (!link) {
            AF.core.log('ERRO: Link Ajuste nao encontrado.', '#f87171');
            return { ok: false, semAlteracao: true };
        }

        sessionStorage.removeItem('autopopupSemSucesso');
        sessionStorage.setItem('autodataTrocar', acao.dataOrigem);
        sessionStorage.setItem('autodataFallback', '');
        sessionStorage.setItem('autodatasCandidatasPopup', JSON.stringify(
            acao.candidatos && acao.candidatos.length ? acao.candidatos : [acao.dataOrigem]
        ));

        AF.estado.ultimoPopup = null;
        link.click();

        AF.core.log(
            'Popup aberto: ausencia ' + acao.dataAusencia + ' <- origem ' + acao.dataOrigem,
            '#89b4fa'
        );

        await AF.popup.aguardarPopupPronto();
        if (AF.estado.cancelado) return { ok: false, semAlteracao: true };

        await new Promise(function (resolve) {
            var tent = 0;
            var iv = setInterval(function () {
                tent++;
                if (tent > 120) {
                    clearInterval(iv);
                    resolve();
                    return;
                }

                try {
                    var popup = AF.estado.ultimoPopup;

                    if (!popup) return;

                    if (popup.closed) {
                        clearInterval(iv);
                        resolve();
                        return;
                    }
                } catch (e) {
                    clearInterval(iv);
                    resolve();
                }
            }, 300);
        });

        if (AF.estado.cancelado) return { ok: false, semAlteracao: true };

        var semSucesso = sessionStorage.getItem('autopopupSemSucesso') === '1';
        if (semSucesso) {
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.core.log('Sem alteracao para ausencia ' + acao.dataAusencia + '.', '#f9e2af');
            await AF.core.esperar(400);
            return { ok: false, semAlteracao: true };
        }

        AF.core.log('Aguardando recarregar pagina principal...', '#89b4fa');
        await AF.popup.aguardarReloadPrincipal();

        return { ok: true, semAlteracao: false };
    };

})();
