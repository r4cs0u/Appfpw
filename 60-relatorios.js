(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    // ── Utilitário: formatar minutos em HH:MM ──────────────────────────

    function fmtMin(t) {
        return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }

    // ── Habilitar botão copiar ─────────────────────────────────────────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) { btn.disabled = false; btn.title = titulo || 'Copiar relatorio'; }
            AF.sons.tocar('copia');
        } catch (e) {}
    };

    // ── Relatório de Folgas (40-fases) ────────────────────────────────
    //
    // @param {object} relStats  - contadores acumulados do loop
    // @param {Array}  relLista  - array de objetos por funcionário
    // @param {number} tempoMs   - tempo total em milissegundos
    // @param {boolean} cancelado

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

    // ── Relatório de Análise (50-analisar) ────────────────────────────
    //
    // @param {object} stats     - contadores acumulados do loop
    // @param {Array}  lista     - array de objetos por funcionário
    // @param {string} nomeMesStr
    // @param {number} tempoMs   - tempo total em milissegundos
    // @param {boolean} cancelado

    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var min = Math.floor(tempoTotal / 60);
        var seg = tempoTotal % 60;

        var totalHEstr  = fmtMin(stats.HEmin);
        var totalHEFstr = fmtMin(stats.HEFmin);

        var rel = 'RELATORIO DE ANALISE - ' + nomeMesStr + '\n';
        rel += 'Status: '               + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '            + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '          + min + 'min ' + seg + 's\n';
        rel += 'Folhas analisadas: '    + (stats.totalFolhas + stats.vazias) + '\n';
        rel += 'Folhas sem marcacoes: ' + stats.vazias + '\n';
        rel += 'Folgas a movimentar: '  + stats.folgasMoviveis + '\n';
        rel += 'Irregularidades: '      + stats.irregs + '\n';
        rel += 'Interjornadas: '        + stats.interj + '\n';
        rel += 'Codigos 47: '           + stats.cod47 + '\n';
        rel += 'Total HE100%: '         + totalHEstr + '\n';
        rel += 'Total HEF100%: '        + totalHEFstr + '\n\n';

        for (var ri = 0; ri < lista.length; ri++) {
            var re = lista[ri];
            var temAlgoRel = re.folgas || re.irregs || re.interj || re.cod47 ||
                             re.HE !== '00:00' || re.HEF !== '00:00';
            if (!temAlgoRel) continue;

            var p = [];
            if (re.folgas)          p.push('Folgas:' + re.folgas);
            p.push('Irreg:'  + re.irregs);
            p.push('Interj:' + re.interj);
            if (re.cod47)           p.push('Cod47:'  + re.cod47);
            if (re.HE  !== '00:00') p.push('HE100%:'  + re.HE);
            if (re.HEF !== '00:00') p.push('HEF100%:' + re.HEF);
            if (re.HEC !== '00:00') p.push('HEC70%:'  + re.HEC);

            rel += re.nome + ' | ' + p.join(' | ') + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');
        AF.relatorios.habilitarCopiar('Copiar relatorio de analise');

        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('ANALISE CONCLUIDA', '#f9fafb');
        AF.core.log('Tempo: ' + min + 'min ' + seg + 's', '#89b4fa');
        AF.core.log('Folhas: ' + (stats.totalFolhas + stats.vazias) + ' | Folgas: ' + stats.folgasMoviveis + ' | Irreg: ' + stats.irregs + ' | Interj: ' + stats.interj + ' | Cod47: ' + stats.cod47, '#89b4fa');
        AF.core.log('HE100%: ' + totalHEstr + ' | HEF100%: ' + totalHEFstr, '#89b4fa');
        AF.core.log('Relatorio pronto para copiar.', '#a3e635');
    };

})();
