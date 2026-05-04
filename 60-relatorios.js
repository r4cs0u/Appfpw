(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    // ── Utilitário: formatar minutos em HH:MM ──────────────────────────

    function fmtMin(t) {
        return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }

    // ── Escapar valor para TSV/Excel (evita #DESPEJAR em valores negativos) ──

    function escaparTSV(v) {
        var s = String(v);
        return s.charAt(0) === '-' ? "'" + s : s;
    }

    // ── Habilitar botão copiar ─────────────────────────────────────────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) { btn.disabled = false; btn.title = titulo || 'Copiar relatorio'; }
        } catch (e) {}
    };

    // ── Relatório de Folgas (40-fases) ────────────────────────────────

    AF.relatorios.gerarFolgas = function (relStats, relLista, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var minutos    = Math.floor(tempoTotal / 60);
        var segundos   = tempoTotal % 60;

        var relFinal = 'RELATORIO FINAL DE EXECUCAO\n';
        relFinal += 'Status: '                    + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        relFinal += 'Gerado em: '                 + new Date().toLocaleString('pt-BR') + '\n';
        relFinal += 'Tempo total: '               + minutos + 'min ' + segundos + 's\n';
        relFinal += 'Folhas processadas: '        + relStats.totalFolhas + '\n';
        relFinal += 'Folhas sem marcacoes: '      + relStats.semMarcacoes + '\n';
        relFinal += 'Folgas alteradas: '          + relStats.folgasAlteradas + '\n';
        relFinal += 'Folgas nao alteradas: '      + relStats.folgasNaoAlteradas + '\n';
        relFinal += 'Linhas 47>48: '              + relStats.linhas47 + '\n';
        relFinal += 'Irregularidades restantes: ' + relStats.irregsRestantes + '\n';
        relFinal += 'Interjornadas restantes: '   + relStats.interjRestantes + '\n\n';

        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('RELATORIO DE EXECUCAO', '#f9fafb');
        AF.core.log('Tempo: ' + minutos + 'min ' + segundos + 's', '#89b4fa');
        AF.core.log('Folhas: ' + relStats.totalFolhas + ' | Folgas: ' + relStats.folgasAlteradas + ' | 47>48: ' + relStats.linhas47, '#89b4fa');
        AF.core.log('Irregs restantes: ' + relStats.irregsRestantes + ' | Interj: ' + relStats.interjRestantes, '#89b4fa');
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        for (var ri = 0; ri < relLista.length; ri++) {
            var re = relLista[ri];
            if (re.pulada) continue;
            var temAlgo = re.folgasAlteradas || re.folgasSemAlteracao || re.linhas47 ||
                          re.irregs || re.interj || re.HE !== '00:00' || re.HEF !== '00:00';
            if (!temAlgo) continue;

            var partes = [];
            partes.push('Folgas:' + re.folgasAlteradas);
            partes.push('Presas:' + re.folgasSemAlteracao);
            partes.push('47>48:'  + re.linhas47);
            partes.push('Irreg:'  + re.irregs);
            partes.push('Interj:' + re.interj);
            if (re.HE  !== '00:00') partes.push('HE100%:'  + re.HE);
            if (re.HEF !== '00:00') partes.push('HEF100%:' + re.HEF);
            partes.push('HEC70%:' + re.HEC);

            relFinal += re.nome + ' | ' + partes.join(' | ') + '\n';
            AF.core.log(re.nome + ' | ' + partes.join(' | '), '#facc15');
        }

        AF.estado.relatorio     = relFinal;
        AF.estado.textoCopiavel = relFinal.replace(/\n/g, '\r\n');
        AF.relatorios.habilitarCopiar('Copiar relatorio final');
        AF.core.log('Relatorio pronto para copiar.', '#a3e635');
    };

    // ── Relatório de Análise (50-analisar) — formato TSV para planilha ───

    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var min = Math.floor(tempoTotal / 60);
        var seg = tempoTotal % 60;

        var totalHEstr  = fmtMin(stats.HEmin);
        var totalHEFstr = fmtMin(stats.HEFmin);

        // ── Cabeçalho corrido ─────────────────────────────────────────
        var rel = 'RELATORIO DE ANALISE - ' + nomeMesStr + '\n';
        rel += 'Status: '               + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '            + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '          + min + 'min ' + seg + 's\n';
        rel += 'Folhas analisadas: '    + (stats.totalFolhas + stats.vazias) + '\n';
        rel += 'Folhas sem marcacoes: ' + stats.vazias + '\n';
        rel += 'Total Folgas: '         + stats.folgasMoviveis + '\n';
        rel += 'Total Irreg: '          + stats.irregs + '\n';
        rel += 'Total Interj: '         + stats.interj + '\n';
        rel += 'Total Cod47: '          + stats.cod47 + '\n';
        rel += 'Total HE100%: '         + totalHEstr + '\n';
        rel += 'Total HEF100%: '        + totalHEFstr + '\n';
        rel += '\n';

        // ── Tabela TSV ───────────────────────────────────────────────
        var T = '\t';
        rel += 'Nome' + T + 'Folgas' + T + 'Irreg' + T + 'Interj' + T + 'Cod47' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < lista.length; ri++) {
            var re = lista[ri];
            if (!re.nome || !re.nome.trim()) continue;

            var folgas = re.folgas != null ? re.folgas : 0;
            var irregs = re.irregs != null ? re.irregs : 0;
            var interj = re.interj != null ? re.interj : 0;
            var cod47  = re.cod47  != null ? re.cod47  : 0;
            var he     = re.HE  || '00:00';
            var hef    = re.HEF || '00:00';
            var hec    = re.HEC || '00:00';

            rel += re.nome.trim()  + T
                +  folgas          + T
                +  irregs          + T
                +  interj          + T
                +  cod47           + T
                +  escaparTSV(he)  + T
                +  escaparTSV(hef) + T
                +  escaparTSV(hec) + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');
        AF.relatorios.habilitarCopiar('Copiar relatorio de analise');

        // ── Log: resumo por pessoa ─────────────────────────────────────
        for (var li = 0; li < lista.length; li++) {
            var le = lista[li];
            if (!le.nome || !le.nome.trim()) continue;
            var lf = le.folgas != null ? le.folgas : 0;
            var li2 = le.irregs != null ? le.irregs : 0;
            var lt = le.interj != null ? le.interj : 0;
            var lc = le.cod47  != null ? le.cod47  : 0;
            var lhe  = le.HE  || '00:00';
            var lhef = le.HEF || '00:00';
            var lhec = le.HEC || '00:00';
            var p = [];
            p.push('Folgas:' + lf);
            p.push('Irreg:'  + li2);
            p.push('Interj:' + lt);
            if (lc)            p.push('Cod47:'   + lc);
            if (lhe  !== '00:00') p.push('HE100%:'  + lhe);
            if (lhef !== '00:00') p.push('HEF100%:' + lhef);
            if (lhec !== '00:00') p.push('HEC70%:'  + lhec);
            AF.core.log('! ' + le.nome.trim() + ' | ' + p.join(' | '), '#facc15');
        }

        // ── Log: encerramento com texto copiavel completo ────────────────
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('ANALISE CONCLUIDA', '#f9fafb');
        AF.core.log('Tempo: ' + min + 'min ' + seg + 's', '#89b4fa');
        AF.core.log('Folhas: ' + (stats.totalFolhas + stats.vazias) + ' | Folgas: ' + stats.folgasMoviveis + ' | Irreg: ' + stats.irregs + ' | Interj: ' + stats.interj + ' | Cod47: ' + stats.cod47, '#89b4fa');
        AF.core.log('HE100%: ' + totalHEstr + ' | HEF100%: ' + totalHEFstr, '#89b4fa');

        // Exibe o texto completo que será copiado (cada linha como entrada no log)
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        var linhasRel = rel.split('\n');
        for (var ki = 0; ki < linhasRel.length; ki++) {
            if (linhasRel[ki].trim()) AF.core.log(linhasRel[ki], '#6b7280');
        }
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        AF.core.log('Relatorio pronto para copiar (formato planilha).', '#a3e635');
    };

})();
