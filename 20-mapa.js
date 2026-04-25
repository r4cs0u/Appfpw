(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.mapa = AF.mapa || {};

    AF.mapa.obterDataDoInput = function (inp) {
        var el = inp.closest('tr');
        while (el) {
            var anterior = el.previousElementSibling;
            if (anterior) {
                var texto = (anterior.innerText || anterior.textContent || '');
                var m = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
                if (m) return m[1];
                el = anterior;
                continue;
            }
            var pai = el.parentElement;
            if (!pai) break;
            var paiAnterior = pai.previousElementSibling;
            if (paiAnterior) {
                var filhos = paiAnterior.querySelectorAll('tr');
                if (filhos.length > 0) {
                    var ultima = filhos[filhos.length - 1];
                    var texto2 = (ultima.innerText || ultima.textContent || '');
                    var m2 = texto2.match(/(\d{2}\/\d{2}\/\d{4})/);
                    if (m2) return m2[1];
                    el = ultima;
                    continue;
                }
            }
            el = pai;
        }
        return null;
    };

    AF.mapa.obterCabecalhoDoDia = function (inp) {
        var el = inp.closest('tr');
        while (el) {
            var anterior = el.previousElementSibling;
            if (anterior) {
                var texto = (anterior.innerText || anterior.textContent || '');
                if (/\d{2}\/\d{2}\/\d{4}/.test(texto)) return texto;
                el = anterior;
                continue;
            }
            var pai = el.parentElement;
            if (!pai) break;
            var paiAnterior = pai.previousElementSibling;
            if (paiAnterior) {
                var filhos = paiAnterior.querySelectorAll('tr');
                if (filhos.length > 0) {
                    var ultima = filhos[filhos.length - 1];
                    var texto2 = (ultima.innerText || ultima.textContent || '');
                    if (/\d{2}\/\d{2}\/\d{4}/.test(texto2)) return texto2;
                    el = ultima;
                    continue;
                }
            }
            el = pai;
        }
        return '';
    };

    AF.mapa.mapearFolhaAtual = function () {
        var dataAlvo = AF.utils.mesAlvoDaTabela();
        var ultimoDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth() + 1, 0);
        var ultimaSemanaId = AF.utils.semanaIdBR(ultimoDia);
        var inicioUltimaSemana = AF.utils.inicioSemanaBR(ultimoDia);

        var semanas = {};
        var lista = [];
        var inputs = Array.from(AF.core.getDoc1().querySelectorAll('input[name^="Irre"]'));

        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var dataStr = AF.mapa.obterDataDoInput(inp);
            if (!dataStr) continue;

            var dataObj = AF.utils.parseDataBR(dataStr);
            if (!dataObj) continue;

            var ehMesAlvo = AF.utils.ehMesAlvo(dataObj, dataAlvo);
            var semId = AF.utils.semanaIdBR(dataObj);
            var ehUltimaSem = semId === ultimaSemanaId;

            if (!ehMesAlvo && !ehUltimaSem) continue;

            if (!semanas[semId]) {
                semanas[semId] = {
                    registros: [],
                    folgas: [],
                    folgasVisiveis: [],
                    folgasOcultas: [],
                    ausencias: [],
                    ausenciasMes: [],
                    feriados: [],
                    feriadosSemana: [],
                    datasRegistradas: {}
                };
            }

            var item = {
                inp: inp,
                num: (inp.name || '').replace('Irre', ''),
                dataStr: dataStr,
                dataObj: dataObj,
                valor: String(inp.value || '').trim(),
                cabecalho: AF.mapa.obterCabecalhoDoDia(inp) || '',
                semanaId: semId,
                foraDoMes: !ehMesAlvo
            };

            semanas[semId].registros.push(item);
            semanas[semId].datasRegistradas[item.dataStr] = true;
            lista.push(item);

            if (AF.utils.ehFolgaCabecalho(item.cabecalho)) {
                semanas[semId].folgas.push(item);
                semanas[semId].folgasVisiveis.push(item);
            } else if (AF.utils.ehFeriadoCabecalho(item.cabecalho)) {
                semanas[semId].feriados.push(item);
                semanas[semId].feriadosSemana.push(item);
            } else if (AF.utils.ehAusenciaValor(item.valor)) {
                semanas[semId].ausencias.push(item);
                if (ehMesAlvo) semanas[semId].ausenciasMes.push(item);
            }
        }

        if (inicioUltimaSemana && semanas[ultimaSemanaId]) {
            var semUltima = semanas[ultimaSemanaId];
            for (var d = 0; d < 7; d++) {
                var dt = new Date(
                    inicioUltimaSemana.getFullYear(),
                    inicioUltimaSemana.getMonth(),
                    inicioUltimaSemana.getDate() + d
                );
                var dtStr = AF.utils.fmtDataBR(dt);
                if (!semUltima.datasRegistradas[dtStr]) {
                    semUltima.folgasOcultas.push(dtStr);
                }
            }
        }

        return {
            alvo: dataAlvo,
            ultimaSemanaId: ultimaSemanaId,
            semanas: semanas,
            lista: lista
        };
    };
})();
