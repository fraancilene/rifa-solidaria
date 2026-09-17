/* =========================================================================
   PAINEL DE TEMA — "designer" da paleta
   -------------------------------------------------------------------------
   Monta sozinho um painel lateral que permite ajustar as cores da marca,
   o arredondamento, a escala tipográfica e o modo claro/escuro, com
   pré-visualização imediata na própria página.

   Como usar: basta incluir <script src="js/tema.js" defer></script>.
   Não depende de nada e não precisa de backend.
   ========================================================================= */

(() => {
    "use strict";

    const CHAVE = "rifa:tema";

    /* ---------------------------------------------------------------------
       Variáveis que o painel controla. São as mesmas declaradas no :root
       do style.css — todo o resto do site é derivado delas.
       --------------------------------------------------------------------- */

    const CORES = [
        { var: "--brand",       nome: "Cor principal",  dica: "Títulos, botões e destaques" },
        { var: "--brand-deep",  nome: "Tom profundo",   dica: "Cabeçalho e rodapé" },
        { var: "--brand-soft",  nome: "Tom claro",      dica: "Estados de hover" },
        { var: "--accent",      nome: "Dourado",        dica: "Ação principal e seleção" },
        { var: "--accent-soft", nome: "Dourado claro",  dica: "Textos sobre a cor principal" },
        { var: "--canvas",      nome: "Fundo",          dica: "Cor de base das páginas" }
    ];

    const PADRAO = {
        "--brand": "#b04066",
        "--brand-deep": "#8d3356",
        "--brand-soft": "#d1799b",
        "--accent": "#e0b567",
        "--accent-soft": "#f7e0b0",
        "--canvas": "#fff9fb",
        "--r": "14px",
        "--scale": "1",
        tema: "auto"
    };

    /* As quatro primeiras são claras; as duas últimas ficam para quem
       preferir um visual mais fechado. */
    const PALETAS = [
        {
            nome: "Rosé",
            cores: {
                "--brand": "#b04066", "--brand-deep": "#8d3356", "--brand-soft": "#d1799b",
                "--accent": "#e0b567", "--accent-soft": "#f7e0b0", "--canvas": "#fff9fb"
            }
        },
        {
            nome: "Pêssego",
            cores: {
                "--brand": "#c05640", "--brand-deep": "#9c4130", "--brand-soft": "#e08a72",
                "--accent": "#e5bc6a", "--accent-soft": "#f8e3b6", "--canvas": "#fffaf6"
            }
        },
        {
            nome: "Lilás",
            cores: {
                "--brand": "#8253ab", "--brand-deep": "#66408a", "--brand-soft": "#ae8bcc",
                "--accent": "#e0b567", "--accent-soft": "#f7e0b0", "--canvas": "#fdfaff"
            }
        },
        {
            nome: "Menta",
            cores: {
                "--brand": "#2f8266", "--brand-deep": "#256a53", "--brand-soft": "#69b39a",
                "--accent": "#dcb463", "--accent-soft": "#f5e0ae", "--canvas": "#f8fdfa"
            }
        },
        {
            nome: "Azul",
            cores: {
                "--brand": "#3f6bb5", "--brand-deep": "#325594", "--brand-soft": "#7d9fd8",
                "--accent": "#e0b567", "--accent-soft": "#f7e0b0", "--canvas": "#f9fbff"
            }
        },
        {
            nome: "Vinho",
            cores: {
                "--brand": "#7a1735", "--brand-deep": "#4e0f22", "--brand-soft": "#9d3d5a",
                "--accent": "#d5a84b", "--accent-soft": "#f0d58b", "--canvas": "#fff9f3"
            }
        }
    ];


    /* ---------------------------------------------------------------------
       ESTADO
       --------------------------------------------------------------------- */

    let estado = { ...PADRAO };

    function carregar() {
        try {
            const salvo = localStorage.getItem(CHAVE);
            if (salvo) estado = { ...PADRAO, ...JSON.parse(salvo) };
        } catch {
            /* Navegação privada ou armazenamento bloqueado: segue no padrão. */
        }
    }

    function salvar() {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(estado));
        } catch {
            /* Sem persistência: o tema vale só para esta visita. */
        }
    }

    function aplicar() {
        const raiz = document.documentElement;

        for (const chave of Object.keys(estado)) {
            if (chave.startsWith("--")) {
                raiz.style.setProperty(chave, estado[chave]);
            }
        }

        if (estado.tema === "auto") {
            raiz.removeAttribute("data-theme");
        } else {
            raiz.setAttribute("data-theme", estado.tema);
        }
    }

    /* Aplica antes da primeira pintura para não piscar o tema errado. */
    carregar();
    aplicar();


    /* O painel em si só pode ser montado quando o <body> existir. */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarPainel, { once: true });
    } else {
        iniciarPainel();
    }


    function iniciarPainel() {


    /* ---------------------------------------------------------------------
       CONSTRUÇÃO DA INTERFACE
       --------------------------------------------------------------------- */

    function montar() {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "theme-toggle";
        botao.id = "themeToggle";
        botao.setAttribute("aria-label", "Abrir o painel de aparência");
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-controls", "themePanel");
        botao.innerHTML = "<span aria-hidden=\"true\">🎨</span>";

        const fundo = document.createElement("div");
        fundo.className = "theme-backdrop";
        fundo.dataset.open = "false";

        const painel = document.createElement("aside");
        painel.className = "theme-panel";
        painel.id = "themePanel";
        painel.dataset.open = "false";
        painel.setAttribute("role", "dialog");
        painel.setAttribute("aria-modal", "true");
        painel.setAttribute("aria-label", "Aparência do site");

        painel.innerHTML = `
            <header class="theme-panel__head">
                <h2>Aparência</h2>
                <button type="button" class="btn btn--ghost btn--icon" data-acao="fechar"
                        aria-label="Fechar o painel">✕</button>
            </header>

            <div class="theme-panel__body">

                <section class="theme-group">
                    <h3>Modo</h3>
                    <div class="segmented" role="group" aria-label="Modo de cor">
                        <button type="button" data-tema="auto"  aria-pressed="false">Sistema</button>
                        <button type="button" data-tema="light" aria-pressed="false">Claro</button>
                        <button type="button" data-tema="dark"  aria-pressed="false">Escuro</button>
                    </div>
                </section>

                <section class="theme-group">
                    <h3>Paletas prontas</h3>
                    <div class="theme-presets" id="themePresets"></div>
                </section>

                <section class="theme-group">
                    <h3>Cores da marca</h3>
                    <div id="themeSwatches"></div>
                </section>

                <section class="theme-group">
                    <h3>Forma e texto</h3>

                    <label class="theme-range">
                        <span class="theme-range__label">
                            <span>Arredondamento</span>
                            <span id="valorRaio">14px</span>
                        </span>
                        <input type="range" id="rangeRaio" min="0" max="28" step="2">
                    </label>

                    <label class="theme-range">
                        <span class="theme-range__label">
                            <span>Tamanho do texto</span>
                            <span id="valorEscala">100%</span>
                        </span>
                        <input type="range" id="rangeEscala" min="90" max="125" step="5">
                    </label>
                </section>

            </div>

            <footer class="theme-panel__foot">
                <button type="button" class="btn" data-acao="restaurar">Restaurar</button>
                <button type="button" class="btn btn--primary" data-acao="copiar">Copiar CSS</button>
            </footer>
        `;

        document.body.append(botao, fundo, painel);

        return { botao, fundo, painel };
    }

    const { botao, fundo, painel } = montar();


    /* ---- Amostras de cor ---- */

    const areaCores = painel.querySelector("#themeSwatches");

    for (const cor of CORES) {
        const linha = document.createElement("label");
        linha.className = "swatch";

        linha.innerHTML = `
            <input type="color" data-var="${cor.var}"
                   aria-label="${cor.nome}: ${cor.dica}">
            <span class="swatch__meta">
                <span class="swatch__name">${cor.nome}</span>
                <span class="swatch__value" data-valor="${cor.var}"></span>
            </span>
        `;

        areaCores.appendChild(linha);
    }


    /* ---- Paletas prontas ---- */

    const areaPaletas = painel.querySelector("#themePresets");

    PALETAS.forEach((paleta, indice) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "preset";
        item.dataset.paleta = String(indice);
        item.setAttribute("aria-pressed", "false");

        item.innerHTML = `
            <span class="preset__colors" aria-hidden="true">
                <i style="background:${paleta.cores["--brand-deep"]}"></i>
                <i style="background:${paleta.cores["--brand"]}"></i>
                <i style="background:${paleta.cores["--brand-soft"]}"></i>
                <i style="background:${paleta.cores["--accent"]}"></i>
            </span>
            <span>${paleta.nome}</span>
        `;

        areaPaletas.appendChild(item);
    });


    /* ---------------------------------------------------------------------
       SINCRONIZAÇÃO DOS CONTROLES
       --------------------------------------------------------------------- */

    const rangeRaio = painel.querySelector("#rangeRaio");
    const rangeEscala = painel.querySelector("#rangeEscala");
    const valorRaio = painel.querySelector("#valorRaio");
    const valorEscala = painel.querySelector("#valorEscala");

    function sincronizar() {
        painel.querySelectorAll("input[type=color]").forEach(campo => {
            const valor = estado[campo.dataset.var];
            campo.value = valor;
            painel.querySelector(`[data-valor="${campo.dataset.var}"]`).textContent = valor;
        });

        painel.querySelectorAll("[data-tema]").forEach(btn => {
            btn.setAttribute("aria-pressed", String(btn.dataset.tema === estado.tema));
        });

        painel.querySelectorAll("[data-paleta]").forEach(btn => {
            const cores = PALETAS[Number(btn.dataset.paleta)].cores;
            const igual = Object.keys(cores).every(k => cores[k] === estado[k]);
            btn.setAttribute("aria-pressed", String(igual));
        });

        const raio = parseInt(estado["--r"], 10);
        rangeRaio.value = String(raio);
        valorRaio.textContent = `${raio}px`;

        const escala = Math.round(parseFloat(estado["--scale"]) * 100);
        rangeEscala.value = String(escala);
        valorEscala.textContent = `${escala}%`;
    }

    sincronizar();


    function atualizar(mudancas) {
        estado = { ...estado, ...mudancas };
        aplicar();
        salvar();
        sincronizar();
    }


    /* ---- Eventos ---- */

    painel.addEventListener("input", evento => {
        const alvo = evento.target;

        if (alvo.matches("input[type=color]")) {
            atualizar({ [alvo.dataset.var]: alvo.value });
        }

        if (alvo === rangeRaio) {
            atualizar({ "--r": `${alvo.value}px` });
        }

        if (alvo === rangeEscala) {
            atualizar({ "--scale": String(Number(alvo.value) / 100) });
        }
    });

    painel.addEventListener("click", evento => {
        const modo = evento.target.closest("[data-tema]");
        if (modo) atualizar({ tema: modo.dataset.tema });

        const paleta = evento.target.closest("[data-paleta]");
        if (paleta) atualizar(PALETAS[Number(paleta.dataset.paleta)].cores);

        const acao = evento.target.closest("[data-acao]");
        if (!acao) return;

        if (acao.dataset.acao === "fechar")    fechar();
        if (acao.dataset.acao === "restaurar") atualizar({ ...PADRAO });
        if (acao.dataset.acao === "copiar")    copiarCSS();
    });


    /* ---------------------------------------------------------------------
       ABRIR / FECHAR
       --------------------------------------------------------------------- */

    let ultimoFoco = null;

    function abrir() {
        ultimoFoco = document.activeElement;
        painel.dataset.open = "true";
        fundo.dataset.open = "true";
        botao.setAttribute("aria-expanded", "true");
        painel.querySelector("[data-acao=fechar]").focus();
        document.addEventListener("keydown", aoTeclar);
    }

    function fechar() {
        painel.dataset.open = "false";
        fundo.dataset.open = "false";
        botao.setAttribute("aria-expanded", "false");
        document.removeEventListener("keydown", aoTeclar);
        if (ultimoFoco) ultimoFoco.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === "Escape") {
            fechar();
            return;
        }

        /* Mantém o foco dentro do painel enquanto ele está aberto. */
        if (evento.key !== "Tab") return;

        const focaveis = painel.querySelectorAll(
            "button, input, select, a[href], [tabindex]:not([tabindex='-1'])"
        );

        if (focaveis.length === 0) return;

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    }

    botao.addEventListener("click", () => {
        painel.dataset.open === "true" ? fechar() : abrir();
    });

    fundo.addEventListener("click", fechar);


    /* ---------------------------------------------------------------------
       COPIAR O CSS GERADO
       --------------------------------------------------------------------- */

    function montarCSS() {
        const linhas = CORES.map(c => `    ${c.var}: ${estado[c.var]};`);

        return [
            "/* Paleta gerada pelo painel de aparência — cole no :root do style.css */",
            ":root {",
            ...linhas,
            `    --r: ${estado["--r"]};`,
            `    --scale: ${estado["--scale"]};`,
            "}"
        ].join("\n");
    }

    async function copiarCSS() {
        const css = montarCSS();

        try {
            await navigator.clipboard.writeText(css);
            avisar("Paleta copiada. É só colar no style.css.", "ok");
        } catch {
            /* Sem permissão de área de transferência: mostra para copiar à mão. */
            window.prompt("Copie a paleta abaixo:", css);
        }
    }


    /* ---------------------------------------------------------------------
       AVISOS
       --------------------------------------------------------------------- */

    function avisar(mensagem, tipo = "ok") {
        if (typeof window.mostrarAviso === "function") {
            window.mostrarAviso(mensagem, tipo);
            return;
        }

        let area = document.querySelector(".toasts");

        if (!area) {
            area = document.createElement("div");
            area.className = "toasts";
            area.setAttribute("role", "status");
            area.setAttribute("aria-live", "polite");
            document.body.appendChild(area);
        }

        const aviso = document.createElement("div");
        aviso.className = `toast toast--${tipo}`;
        aviso.textContent = mensagem;
        area.appendChild(aviso);

        setTimeout(() => aviso.remove(), 3200);
    }

    /* Disponibiliza os avisos para as páginas que não têm um próprio. */
    if (typeof window.mostrarAviso !== "function") {
        window.mostrarAviso = avisar;
    }

    /* Atalho: Shift + P abre o painel. */
    document.addEventListener("keydown", evento => {
        const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
        if (digitando) return;

        if (evento.shiftKey && evento.key.toLowerCase() === "p") {
            evento.preventDefault();
            painel.dataset.open === "true" ? fechar() : abrir();
        }
    });

    } /* fim de iniciarPainel */
})();
