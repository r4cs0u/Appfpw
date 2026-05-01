(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.sons = AF.sons || {};

    // ── Cria contexto de áudio sob demanda ─────────────────────────────

    function getCtx() {
        if (!AF.sons._ctx || AF.sons._ctx.state === 'closed') {
            AF.sons._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (AF.sons._ctx.state === 'suspended') {
            AF.sons._ctx.resume();
        }
        return AF.sons._ctx;
    }

    // ── Toca um beep simples ───────────────────────────────────────────
    // freq      : frequência em Hz
    // duracao   : duração em segundos
    // volume    : ganho inicial (0.0 a 1.0)
    // forma     : 'sine' | 'square' | 'triangle' | 'sawtooth'

    function beep(freq, duracao, volume, forma) {
        try {
            var ctx  = getCtx();
            var osc  = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type            = forma || 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume || 0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duracao);
        } catch (e) {}
    }

    // ── Sequência de beeps ─────────────────────────────────────────────
    // notas: array de { freq, dur, vol, forma, delay }
    // offsetMs: atraso inicial opcional em ms antes de começar a sequência

    function sequencia(notas, offsetMs) {
        var acumulado = (offsetMs || 0) / 1000;
        for (var i = 0; i < notas.length; i++) {
            (function (nota, offset) {
                setTimeout(function () {
                    beep(nota.freq, nota.dur, nota.vol || 0.25, nota.forma);
                }, offset);
            })(notas[i], acumulado * 1000);
            acumulado += notas[i].delay || notas[i].dur;
        }
    }

    // ── Catálogo de sons ───────────────────────────────────────────────

    var catalogo = {

        // Início de qualquer processo — dois bipes ascendentes
        inicio: function () {
            sequencia([
                { freq: 600, dur: 0.15, delay: 0.18 },
                { freq: 900, dur: 0.20 }
            ]);
        },

        // Fim bem-sucedido — jingle positivo Dó-Mi-Sol
        // offsetMs: 800ms de espera para não colidir com o som de 'copia'
        // que é disparado logo antes por habilitarCopiar()
        fim: function () {
            sequencia([
                { freq: 523, dur: 0.12, delay: 0.14 },   // Dó
                { freq: 659, dur: 0.12, delay: 0.14 },   // Mi
                { freq: 784, dur: 0.25 }                 // Sol
            ], 800);
        },

        // Relatório pronto para copiar — clique duplo suave
        copia: function () {
            sequencia([
                { freq: 1000, dur: 0.08, vol: 0.2, delay: 0.12 },
                { freq: 1000, dur: 0.08, vol: 0.2 }
            ]);
        },

        // Parada pelo usuário — bipe descendente suave (700Hz → 550Hz)
        parada: function () {
            sequencia([
                { freq: 700, dur: 0.15, delay: 0.18 },
                { freq: 550, dur: 0.40, vol: 0.25, forma: 'sine' }
            ]);
        }
    };

    // ── API pública ────────────────────────────────────────────────────
    // AF.sons.tocar('inicio' | 'fim' | 'copia' | 'parada')

    AF.sons.tocar = function (tipo) {
        try {
            if (catalogo[tipo]) catalogo[tipo]();
        } catch (e) {}
    };

})();
