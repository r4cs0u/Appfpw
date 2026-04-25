(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.utils = AF.utils || {};

    AF.utils.parseDataBR = function (str) {
        var p = String(str || '').split('/');
        if (p.length !== 3) return null;
        var d = parseInt(p[0], 10);
        var m = parseInt(p[1], 10);
        var a = parseInt(p[2], 10);
        if (!d || !m || !a) return null;
        return new Date(a, m - 1, d);
    };

    AF.utils.fmtDataBR = function (d) {
        if (!d) return '';
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    };

    AF.utils.inicioSemanaBR = function (d) {
        if (!d) return null;
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var dia = x.getDay();
        var diff = dia === 0 ? -6 : 1 - dia;
        x.setDate(x.getDate() + diff);
        return x;
    };

    AF.utils.semanaIdBR = function (d) {
        var ini = AF.utils.inicioSemanaBR(d);
        return ini ? AF.utils.fmtDataBR(ini) : '';
    };

    AF.utils.mesAlvoDaTabela = function () {
        var inputs = Array.from(AF.core.getDoc1().querySelectorAll('input[name^="Irre"]'));
        var menor = null;

        for (var i = 0; i < inputs.length; i++) {
            var dataStr = AF.mapa.obterDataDoInput(inputs[i]);
            var dataObj = AF.utils.parseDataBR(dataStr);
            if (!dataObj) continue;
            if (!menor || dataObj < menor) menor = dataObj;
        }

        if (!menor) {
            var hoje = new Date();
            return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        }

        return new Date(menor.getFullYear(), menor.getMonth(), 1);
    };

    AF.utils.ehMesAlvo = function (dataObj, alvo) {
        return !!dataObj && !!alvo && dataObj.getMonth() === alvo.getMonth() && dataObj.getFullYear() === alvo.getFullYear();
    };

    AF.utils.ehFolgaCabecalho = function (txt) {
        return /Folga/i.test(String(txt || ''));
    };

    AF.utils.ehFeriadoCabecalho = function (txt) {
        return /Feriado/i.test(String(txt || ''));
    };

    AF.utils.ehAusenciaValor = function (txt) {
        return /Aus[eê]ncia de marca[cç][aã]o/i.test(String(txt || ''));
    };

    AF.utils.nomeMes = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
})();
