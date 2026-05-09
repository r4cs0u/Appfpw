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

    // ── Feriados RJ ────────────────────────────────────────────────────
    // Calcula Páscoa pelo algoritmo de Meeus/Jones/Butcher e deriva
    // os feriados móveis. Combina com fixos nacionais e municipais RJ.
    // Retorna um Set de strings 'DD/MM/YYYY'.

    AF.utils.calcularFeriadosRJ = function (ano) {
        // Páscoa
        var a = ano % 19;
        var b = Math.floor(ano / 100);
        var c = ano % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
        var diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
        var pascoa = new Date(ano, mesPascoa - 1, diaPascoa);

        function somarDias(base, dias) {
            var r = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            r.setDate(r.getDate() + dias);
            return r;
        }

        var fmt = AF.utils.fmtDataBR;
        var feriados = new Set();

        // Móveis
        feriados.add(fmt(somarDias(pascoa, -48))); // Carnaval Seg
        feriados.add(fmt(somarDias(pascoa, -47))); // Carnaval Ter
        feriados.add(fmt(somarDias(pascoa, -2)));  // Sexta-feira Santa
        feriados.add(fmt(pascoa));                  // Páscoa
        feriados.add(fmt(somarDias(pascoa, 60)));  // Corpus Christi

        // Fixos nacionais
        var fixos = [
            [1,  1],  // Confraternização Universal
            [21, 4],  // Tiradentes
            [1,  5],  // Dia do Trabalho
            [7,  9],  // Independência
            [12, 10], // Nossa Sra. Aparecida
            [2,  11], // Finados
            [15, 11], // Proclamação da República
            [20, 11], // Consciência Negra
            [25, 12]  // Natal
        ];

        // Fixos municipais / estaduais RJ
        var fixosRJ = [
            [20, 1],  // São Sebastião (município RJ)
            [23, 4],  // São Jorge (município RJ)
            [8,  12]  // Nossa Sra. Conceição
        ];

        var todos = fixos.concat(fixosRJ);
        for (var i = 0; i < todos.length; i++) {
            feriados.add(fmt(new Date(ano, todos[i][1] - 1, todos[i][0])));
        }

        return feriados;
    };

})();
