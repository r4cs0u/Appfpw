(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.analisar = AF.analisar || {};

    // ── Conta folgas a movimentar ──────────────────────────────────────

    AF.analisar.contarFolgas = function () {
        var mapa = AF.mapa.mapearFolhaAtual();
        var chaves = Object.keys(mapa.semanas);
        var total = 0;

        for (var i = 0; i < chaves.length; i++) {
            var semana = mapa.semanas[chaves[i]];

            for (var j = 0; j < semana.folgas.length; j++) {
                var folga = semana.folgas[j];
                if (folga.foraDoMes) continue;
                if (semana.ausencias.length > 0 || semana.feriados.length > 0) {
                    total++;
                }
            }

            var temAusenciaMes = (semana.ausenciasMes && semana.ausenciasMes.length > 0);
            if (temAusenciaMes) {
                total += (semana.folgasVisiveis || []).filter(function (f) { return f.foraDoMes; }).length;
                total += (semana.folgasOcultas || []).length;
            }
        }

        return total;
    };

    // ── Conta irregularidades ─────────────────────────────────────────

    AF.analisar.contarIrregs = function () {
        var inputs = Array.from(AF.core.getDoc1().querySelectorAll('input[name^="Irre"]'));
        var marc = 0, he = 0, smES = 0;
        var alvo = AF.utils.mesAlvoDaTabela();

        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var dataStr = AF.mapa.obterDataDoInput(inp);
            var dataObj = AF.utils.parseDataBR(dataStr);
            if (!dataObj || !AF.utils.ehMesAlvo(dataObj, alvo)) continue;
            var v = AF.core.norm(inp.value);
            if (v.includes('marcacao irregular')) marc++;
            if (v.includes('hora extra irregular')) he++;
            if (v.includes('s/marc') || v.includes('smarc')) smES++;
        }

        return { marc: marc, he: he, smES: smES, total: marc + he + smES };
    };

    // ── Conta interjornadas ───────────────────────────────────────────

    AF.analisar.contarInterj = function () {
        var alvo = AF.utils.mesAlvoDaTabela();
        var linhas = Array.from(AF.core.getDoc1().querySelectorAll('tr'));
        var interj = 0;

        for (var j = 0; j < linhas.length; j++) {
            var txt = (linhas[j].innerText || linhas[j].textContent || '');
            var mData = txt.match(/\d{2}\/\d{2}\/\d{4}/);
            if (!mData) continue;
            var dataObj = AF.utils.parseDataBR(mData[0]);
            if (!dataObj || !AF.utils.ehMesAlvo(dataObj, alvo)) continue;
            if (txt.includes('Interjornada')) interj++;
        }

        return interj;
    };

    // ── Conta códigos 47 ──────────────────────────────────────────────

    AF.analisar.contarCod47 = function () {
        var alvo = AF.utils.mesAlvoDaTabela();
        var campos = Array.from(AF.core.getDoc1().querySelectorAll('input[type=text]'));
        var count = 0;

        for (var i = 0; i < campos.length; i++) {
            var inp = campos[i];
            if (!inp.value || inp.value.trim() !== '47') continue;
            var dataStr = AF.mapa.obterDataDoInput(inp);
            var dataObj = AF.utils.parseDataBR(dataStr);
            if (dataObj && AF.utils.ehMesAlvo(dataObj, alvo)) count++;
        }

        return count;
    };

    // ── Soma HE (cod 2) e HEF (cod 27) ───────────────────────────────
    // Aceita formatos HH:MM e HH:MM:SS (segundos ignorados)

    AF.analisar.somarHorasExtras = function () {
        try {
            var doc1 = AF.core.getDoc1();
            var totalHEmin = 0, totalHEFmin = 0;

            Array.from(doc1.querySelectorAll('select[id^="lstNome"]')).forEach(function (sel) {
                var opt = sel.options[sel.selectedIndex];
                if (!opt) return;
                var cod = opt.value;
                var isHEP = cod === '2';
                var isHEF = cod === '27';
                if (!isHEP && !isHEF) return;

                var n = sel.id.replace('lstNome', '');
                var inp = doc1.querySelector('input[name="HorasInf' + n + '"]');
                var raw = inp ? inp.value.replace('*', '').trim() : '';
                var m = raw.match(/^(\d+):(\d+)(?::\d+)?$/);
                if (!m) return;
                var min = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                if (isHEF) totalHEFmin += min;
                else       totalHEmin  += min;
            });

            function fmtMin(t) {
                return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
            }

            return { HE: fmtMin(totalHEmin), HEF: fmtMin(totalHEFmin), HEmin: totalHEmin, HEFmin: totalHEFmin };
        } catch (e) {
            return { HE: '00:00', HEF: '00:00', HEmin: 0, HEFmin: 0 };
        }
    };

    // ── Lê saldo de compensação (frame 2, txtSaldo) ───────────────────
    // Aceita formatos HH:MM e HH:MM:SS (segundos ignorados)

    AF.analisar.lerSaldoHEC = function () {
        try {
            var doc2 = window.top.frames[2].document;
            var inp = doc2.getElementById('txtSaldo');
            if (!inp) return '00:00';
            var raw = inp.value.trim();
            var negativo = raw.charAt(0) === '-';
            var m = raw.replace('-', '').replace('*', '').trim().match(/^(\d+):(\d+)(?::\d+)?$/);
            if (!m) return '00:00';
            var h   = String(parseInt(m[1], 10)).padStart(2, '0');
            var min = String(parseInt(m[2], 10)).padStart(2, '0');
            return (negativo ? '-' : '') + h + ':' + min;
        } catch (e) {
            return '00:00';
        }
    };

    // ── Análise completa de uma folha ─────────────────────────────────

    AF.analisar.analisarFolhaAtual = function () {
        if (AF.core.paginaVaziaAgora()) {
            return { vazia: true, folgas: 0, irregs: 0, interj: 0, cod47: 0, HE: '00:00', HEF: '00:00', HEC: '00:00', HEmin: 0, HEFmin: 0 };
        }

        var irregs   = AF.analisar.contarIrregs();
        var extras   = AF.analisar.somarHorasExtras();
        var saldoHEC = AF.analisar.lerSaldoHEC();

        return {
            vazia:  false,
            folgas: AF.analisar.contarFolgas(),
            irregs: irregs.total,
            interj: AF.analisar.contarInterj(),
            cod47:  AF.analisar.contarCod47(),
            HE:     extras.HE,
            HEF:    extras.HEF,
            HEC:    saldoHEC,
            HEmin:  extras.HEmin,
            HEFmin: extras.HEFmin
        };
    };

    // ── Loop principal de análise ─────────────────────────────────────

    AF.analisar.analisarTodas = async function () {
        AF.estado.cancelado = false;
        AF.estado.rodando = true;
        AF.core.setBotoes(true);
        AF.core.getDocC().getElementById('log-box').innerHTML = '';
        AF.sons.tocar('inicio');

        var alvo = AF.utils.mesAlvoDaTabela
            ? (function () {
                try { return AF.utils.mesAlvoDaTabela(); } catch (e) { return new Date(); }
            })()
            : new Date();

        var nomeMesStr = AF.utils.nomeMes[alvo.getMonth()] + ' ' + alvo.getFullYear();
        AF.core.log('Analisando ' + nomeMesStr + '...', '#89b4fa');

        var stats = {
            totalFolhas: 0,
            vazias: 0,
            folgasMoviveis: 0,
            irregs: 0,
            interj: 0,
            cod47: 0,
            HEmin: 0,
            HEFmin: 0
        };
        var lista = [];

        var sel = AF.core.getSelNome();
        if (!sel) {
            AF.core.log('ERRO: Lista de funcionarios nao encontrada.', '#f87171');
            AF.core.setBotoes(false);
            return;
        }

        var nomeInicial = AF.core.nomeAtual();
        var inicioExec  = Date.now();
        var total       = 0;

        while (true) {
            if (AF.estado.cancelado) break;

            var nome = AF.core.nomeAtual();
            var r    = AF.analisar.analisarFolhaAtual();
            total++;

            if (r.vazia) {
                stats.vazias++;
                AF.core.log('- ' + nome, '#4b5563');
            } else {
                stats.totalFolhas++;
                stats.folgasMoviveis += r.folgas;
                stats.irregs         += r.irregs;
                stats.interj         += r.interj;
                stats.cod47          += r.cod47;
                stats.HEmin          += r.HEmin;
                stats.HEFmin         += r.HEFmin;

                // log de progresso por folha (mantido aqui intencionalmente)
                var temAlgo = r.folgas || r.irregs || r.interj || r.cod47 ||
                              r.HE !== '00:00' || r.HEF !== '00:00';
                if (temAlgo) {
                    var partes = [];
                    if (r.folgas)            partes.push('Folgas:' + r.folgas);
                    partes.push('Irreg:'  + r.irregs);
                    partes.push('Interj:' + r.interj);
                    if (r.cod47)             partes.push('Cod47:'   + r.cod47);
                    if (r.HE  !== '00:00')   partes.push('HE100%:'  + r.HE);
                    if (r.HEF !== '00:00')   partes.push('HEF100%:' + r.HEF);
                    if (r.HEC !== '00:00')   partes.push('HEC70%:'  + r.HEC);
                    AF.core.log('! ' + nome + ' | ' + partes.join(' | '), '#facc15');
                } else {
                    AF.core.log('OK ' + nome, '#6b7280');
                }

                lista.push({
                    nome:   nome,
                    folgas: r.folgas,
                    irregs: r.irregs,
                    interj: r.interj,
                    cod47:  r.cod47,
                    HE:     r.HE,
                    HEF:    r.HEF,
                    HEC:    r.HEC
                });
            }

            if (AF.estado.cancelado) break;

            var res = await AF.core.avancarFuncionario();
            if (AF.estado.cancelado) break;
            if (res === 'fim') { AF.core.log('Fim da lista.', '#a3e635'); break; }
            if (AF.core.nomeAtual() === nomeInicial) { AF.core.log('Concluido.', '#a3e635'); break; }
        }

        var tempoMs = Date.now() - inicioExec;
        AF.relatorios.gerarAnalise(stats, lista, nomeMesStr, tempoMs, AF.estado.cancelado);

        if (!AF.estado.cancelado) AF.sons.tocar('fim');

        AF.core.setBotoes(false);
        AF.estado.rodando = false;
    };

})();
