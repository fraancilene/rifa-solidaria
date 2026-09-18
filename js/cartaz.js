/* =========================================================================
   CARTAZ COM OS NÚMEROS JÁ RESERVADOS
   -------------------------------------------------------------------------
   Desenha, sobre a arte da rifa, uma tarja vinho em cada número que já saiu.
   O número continua legível em branco, para quem recebe o cartaz entender
   de imediato o que ainda está livre.

   A grade foi medida na própria imagem: 15 colunas por 10 linhas, numeradas
   da esquerda para a direita, de cima para baixo (01 a 150).
   ========================================================================= */

(() => {
    "use strict";

    /* Centro de cada número, em pixels da arte original (853 x 1280). */
    const COLUNAS = [
        54.9, 111.4, 165.4, 220.0, 275.0, 329.0, 382.5, 436.0,
        490.1, 546.4, 598.2, 651.4, 704.8, 757.8, 808.6
    ];

    const LINHAS = [
        915.5, 939.5, 964.5, 988.5, 1013.5,
        1037.5, 1062.5, 1087.5, 1111.5, 1136.5
    ];

    /* A célula tem cerca de 54 x 24: a tarja fica um pouco menor para não
       encostar na linha de cima nem na de baixo. */
    const LARGURA = 44;
    const ALTURA = 19;
    const RAIO = 4;

    const COR_TARJA = "#b04066";
    const COR_NUMERO = "#ffffff";


    /* ---------------------------------------------------------------------
       DESENHO
       --------------------------------------------------------------------- */

    function tarja(ctx, x, y) {
        const esquerda = x - LARGURA / 2;
        const topo = y - ALTURA / 2;

        ctx.beginPath();

        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(esquerda, topo, LARGURA, ALTURA, RAIO);
        } else {
            /* Navegador antigo: canto reto resolve igual. */
            ctx.rect(esquerda, topo, LARGURA, ALTURA);
        }

        ctx.fill();
    }

    function desenhar(imagem, reservados) {
        const canvas = document.createElement("canvas");
        canvas.width = imagem.naturalWidth || imagem.width;
        canvas.height = imagem.naturalHeight || imagem.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(imagem, 0, 0);

        const marcados = new Set(
            [...reservados].map(n => Number(n)).filter(Number.isFinite)
        );

        ctx.fillStyle = COR_TARJA;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let numero = 1;

        for (const y of LINHAS) {
            for (const x of COLUNAS) {
                if (marcados.has(numero)) {
                    ctx.fillStyle = COR_TARJA;
                    tarja(ctx, x, y);

                    ctx.fillStyle = COR_NUMERO;
                    ctx.font = "700 13px 'DM Sans', system-ui, sans-serif";
                    ctx.fillText(String(numero).padStart(2, "0"), x, y + 0.5);
                }

                numero += 1;
            }
        }

        return canvas;
    }


    /* ---------------------------------------------------------------------
       CARREGAR A ARTE
       --------------------------------------------------------------------- */

    let arte = null;

    function carregarArte() {
        if (arte) return Promise.resolve(arte);

        return new Promise((resolve, reject) => {
            const fonte = window.CARTAZ_RIFA || "cartaz-rifa.jpg";

            const imagem = new Image();

            imagem.onload = () => {
                arte = imagem;
                resolve(imagem);
            };

            imagem.onerror = () =>
                reject(new Error("Não foi possível carregar a arte do cartaz."));

            imagem.src = fonte;
        });
    }


    /* ---------------------------------------------------------------------
       API
       --------------------------------------------------------------------- */

    const Cartaz = {

        /* Devolve um canvas com a arte e as tarjas já aplicadas. */
        async gerar(reservados) {
            const imagem = await carregarArte();
            return desenhar(imagem, reservados);
        },

        /* Salva o canvas como PNG. */
        baixar(canvas, nome = "rifa-atualizada") {
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = url;
                link.download = `${nome}.png`;
                link.click();

                /* Libera a memória depois que o download começa. */
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, "image/png");
        },

        /* Monta a pré-visualização dentro de #previewCartaz. */
        async mostrar(reservados) {
            const area = document.getElementById("previewCartaz");
            if (!area) return;

            area.dataset.estado = "carregando";

            try {
                const canvas = await this.gerar(reservados);
                canvas.className = "cartaz__imagem";
                canvas.setAttribute(
                    "role", "img"
                );
                canvas.setAttribute(
                    "aria-label",
                    `Cartaz da rifa com ${reservados.length} ` +
                    `${reservados.length === 1 ? "número marcado" : "números marcados"}`
                );

                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "btn btn--primary";
                botao.innerHTML =
                    '<span aria-hidden="true">⤓</span>' +
                    '<span class="btn__label">Baixar cartaz</span>';

                botao.addEventListener("click", () => {
                    const hoje = new Date().toISOString().slice(0, 10);
                    Cartaz.baixar(canvas, `rifa-${hoje}`);

                    if (typeof window.mostrarAviso === "function") {
                        window.mostrarAviso("Cartaz salvo nos seus downloads.");
                    }
                });

                const rodape = document.createElement("div");
                rodape.className = "cartaz__foot";

                const contagem = document.createElement("span");
                contagem.className = "cartaz__count";
                contagem.textContent = reservados.length
                    ? `${reservados.length} de 150 já reservados`
                    : "Nenhum número reservado ainda";

                rodape.append(contagem, botao);

                area.replaceChildren(canvas, rodape);
                area.dataset.estado = "pronto";

            } catch (erro) {
                console.error("Cartaz:", erro);

                area.dataset.estado = "erro";
                area.replaceChildren(
                    Object.assign(document.createElement("p"), {
                        className: "cartaz__erro",
                        textContent:
                            "Não foi possível montar o cartaz. Atualize a página para tentar de novo."
                    })
                );
            }
        }
    };

    window.Cartaz = Cartaz;

})();
