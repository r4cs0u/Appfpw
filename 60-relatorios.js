(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    // ── Utilitário: formatar minutos em HH:MM ──────────────────────

    function fmtMin(t) {
        return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }

    // ── Normalizar hora: garante formato HH:MM ─────────────────────

    function normHora(v) {
        var s = String(v || '00:00').trim();
        var neg = s.charAt(0) === '-';
        var base = neg ? s.slice(1) : s;
        var partes = base.split(':');
        var h   = (partes[0] || '00').padStart(2, '0');
        var min = (partes[1] || '00').padStart(2, '0');
        return (neg ? '-' : '') + h + ':' + min;
    }

    // ── Escapar para Excel: prefixo ' em valores negativos ───────────

    function xls(v) {
        var s = String(v);
        return s.charAt(0) === '-' ? "'" + s : s;
    }

    // ── Habilitar botão copiar ─────────────────────────────────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) { btn.disabled = false; btn.title = titulo || 'Copiar relatorio'; }
        } catch (e) {}
    };

    // ── Relatório do Executar (40-fases) — TSV ─────────────────────
    //
    // relStats: { totalFolhas, semMarcacoes, folgasAlteradas,
    //             folgasNaoAlteradas, irregsRestantes, interjRestantes, linhas47 }
    // relLista: [{ nome, folgasAlteradas, folgasSemAlteracao, linhas47,
    //              irregs, interj, HE, HEF, HEC, pulada }]
    //
    // Ordem das colunas: Folgas Mov. | Cod 47 Ajust. | Folgas Presas | Irregularidades | Interjornada

    AF.relatorios.gerarFolgas = function (relStats, relLista, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var minutos    = Math.floor(tempoTotal / 60);
        var segundos   = tempoTotal % 60;

        // ── Cabeçalho corrido ────────────────────────────────────
        var rel = 'RELATORIO DE EXECUCAO\n';
        rel += 'Status: '                    + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '                 + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '               + minutos + 'min ' + segundos + 's\n';
        rel += 'Folhas processadas: '        + relStats.totalFolhas + '\n';
        rel += 'Folhas sem marcacoes: '      + relStats.semMarcacoes + '\n';
        rel += 'Folgas Mov.: '               + relStats.folgasAlteradas + '\n';
        rel += 'Cod 47 Ajust.: '             + relStats.linhas47 + '\n';
        rel += 'Folgas Presas: '             + relStats.folgasNaoAlteradas + '\n';
        rel += 'Irregularidades restantes: ' + relStats.irregsRestantes + '\n';
        rel += 'Interjornadas restantes: '   + relStats.interjRestantes + '\n\n';

        // ── Tabela TSV ─────────────────────────────────────────────
        var T = '\t';
        rel += 'Nome' + T + 'Folgas Mov.' + T + 'Cod 47 Ajust.' + T + 'Folgas Presas' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < relLista.length; ri++) {
            var re = relLista[ri];
            if (re.pulada) continue;

            var he  = normHora(re.HE);
            var hef = normHora(re.HEF);
            var hec = normHora(re.HEC);

            var temAlgo = re.folgasAlteradas || re.folgasSemAlteracao || re.linhas47 ||
                          re.irregs || re.interj || he !== '00:00' || hef !== '00:00';
            if (!temAlgo) continue;

            rel += re.nome.trim()        + T
                +  re.folgasAlteradas    + T
                +  re.linhas47           + T
                +  re.folgasSemAlteracao + T
                +  re.irregs             + T
                +  re.interj             + T
                +  xls(he)               + T
                +  xls(hef)              + T
                +  xls(hec)              + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');
        AF.relatorios.habilitarCopiar('Copiar relatorio de execucao');

        // ── Log resumo ───────────────────────────────────────────────
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('RELATORIO DE EXECUCAO', '#f9fafb');
        AF.core.log('Tempo: ' + minutos + 'min ' + segundos + 's', '#89b4fa');
        AF.core.log('Folgas Mov.: ' + relStats.folgasAlteradas + ' | Cod 47 Ajust.: ' + relStats.linhas47 + ' | Folgas Presas: ' + relStats.folgasNaoAlteradas, '#89b4fa');
        AF.core.log('Irregularidades: ' + relStats.irregsRestantes + ' | Interjornada: ' + relStats.interjRestantes, '#89b4fa');
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        for (var li = 0; li < relLista.length; li++) {
            var le = relLista[li];
            if (le.pulada) continue;
            var lhe  = normHora(le.HE);
            var lhef = normHora(le.HEF);
            var lhec = normHora(le.HEC);
            var temAlgoL = le.folgasAlteradas || le.folgasSemAlteracao || le.linhas47 ||
                           le.irregs || le.interj || lhe !== '00:00' || lhef !== '00:00';
            if (!temAlgoL) continue;
            var p = [];
            p.push('Folgas Mov.:'    + le.folgasAlteradas);
            p.push('Cod 47 Ajust.:' + le.linhas47);
            p.push('Folgas Presas:' + le.folgasSemAlteracao);
            p.push('Irregularidades:' + le.irregs);
            p.push('Interjornada:'  + le.interj);
            if (lhe  !== '00:00') p.push('HE100%:'  + lhe);
            if (lhef !== '00:00') p.push('HEF100%:' + lhef);
            if (lhec !== '00:00') p.push('HEC70%:'  + lhec);
            AF.core.log('! ' + le.nome.trim() + ' | ' + p.join(' | '), '#facc15');
        }

        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        var linhasRel = rel.split('\n');
        for (var ki = 0; ki < linhasRel.length; ki++) {
            if (linhasRel[ki].trim()) AF.core.log(linhasRel[ki], '#6b7280');
        }
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('Relatorio pronto para copiar.', '#a3e635');
    };

    // ── Relatório do Analisar (50-analisar) — TSV ───────────────────
    //
    // stats: { totalFolhas, vazias, folgasMoviveis, irregs, interj, cod47, HEmin, HEFmin }
    // lista: [{ nome, folgas, irregs, interj, cod47, HE, HEF, HEC }]
    //
    // Ordem das colunas: Folgas p/ Mov. | Cod 47 p/ Ajustar | Irregularidades | Interjornada

    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var min = Math.floor(tempoTotal / 60);
        var seg = tempoTotal % 60;

        var totalHEstr  = fmtMin(stats.HEmin);
        var totalHEFstr = fmtMin(stats.HEFmin);

        // ── Cabeçalho corrido ────────────────────────────────────
        var rel = 'RELATORIO DE ANALISE - ' + nomeMesStr + '\n';
        rel += 'Status: '               + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '            + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '          + min + 'min ' + seg + 's\n';
        rel += 'Folhas analisadas: '    + (stats.totalFolhas + stats.vazias) + '\n';
        rel += 'Folhas sem marcacoes: ' + stats.vazias + '\n';
        rel += 'Total Folgas p/ Mov.: '      + stats.folgasMoviveis + '\n';
        rel += 'Total Cod 47 p/ Ajustar: '   + stats.cod47 + '\n';
        rel += 'Total Irregularidades: '     + stats.irregs + '\n';
        rel += 'Total Interjornada: '        + stats.interj + '\n';
        rel += 'Total HE100%: '              + totalHEstr + '\n';
        rel += 'Total HEF100%: '             + totalHEFstr + '\n\n';

        // ── Tabela TSV ─────────────────────────────────────────────
        var T = '\t';
        rel += 'Nome' + T + 'Folgas p/ Mov.' + T + 'Cod 47 p/ Ajustar' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < lista.length; ri++) {
            var re = lista[ri];
            if (!re.nome || !re.nome.trim()) continue;

            var folgas = re.folgas != null ? re.folgas : 0;
            var irregs = re.irregs != null ? re.irregs : 0;
            var interj = re.interj != null ? re.interj : 0;
            var cod47  = re.cod47  != null ? re.cod47  : 0;
            var he     = normHora(re.HE);
            var hef    = normHora(re.HEF);
            var hec    = normHora(re.HEC);

            rel += re.nome.trim() + T
                +  folgas         + T
                +  cod47          + T
                +  irregs         + T
                +  interj         + T
                +  xls(he)        + T
                +  xls(hef)       + T
                +  xls(hec)       + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');
        AF.relatorios.habilitarCopiar('Copiar relatorio de analise');

        // ── Log resumo por pessoa ─────────────────────────────────
        for (var li = 0; li < lista.length; li++) {
            var le = lista[li];
            if (!le.nome || !le.nome.trim()) continue;
            var lf   = le.folgas != null ? le.folgas : 0;
            var li2  = le.irregs != null ? le.irregs : 0;
            var lt   = le.interj != null ? le.interj : 0;
            var lc   = le.cod47  != null ? le.cod47  : 0;
            var lhe  = normHora(le.HE);
            var lhef = normHora(le.HEF);
            var lhec = normHora(le.HEC);
            var p = [];
            if (lf) p.push('Folgas p/ Mov.:'     + lf);
            if (lc) p.push('Cod 47 p/ Ajustar:' + lc);
            p.push('Irregularidades:' + li2);
            p.push('Interjornada:'    + lt);
            if (lhe  !== '00:00') p.push('HE100%:'  + lhe);
            if (lhef !== '00:00') p.push('HEF100%:' + lhef);
            if (lhec !== '00:00') p.push('HEC70%:'  + lhec);
            AF.core.log('! ' + le.nome.trim() + ' | ' + p.join(' | '), '#facc15');
        }

        // ── Log encerramento + texto copiável ────────────────────────
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('ANALISE CONCLUIDA', '#f9fafb');
        AF.core.log('Tempo: ' + min + 'min ' + seg + 's', '#89b4fa');
        AF.core.log('Folgas p/ Mov.: ' + stats.folgasMoviveis + ' | Cod 47 p/ Ajustar: ' + stats.cod47 + ' | Irregularidades: ' + stats.irregs + ' | Interjornada: ' + stats.interj, '#89b4fa');
        AF.core.log('HE100%: ' + totalHEstr + ' | HEF100%: ' + totalHEFstr, '#89b4fa');
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        var linhasRel = rel.split('\n');
        for (var ki = 0; ki < linhasRel.length; ki++) {
            if (linhasRel[ki].trim()) AF.core.log(linhasRel[ki], '#6b7280');
        }
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('Relatorio pronto para copiar.', '#a3e635');
    };

})();
