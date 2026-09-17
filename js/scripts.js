/* =========================================================================
   CONTROLE DOS NÚMEROS — seleção e registro das reservas
   ========================================================================= */

(() => {
    "use strict";

    /* ---------------------------------------------------------------------
       CONFIGURAÇÃO
       --------------------------------------------------------------------- */

    const SUPABASE_URL = "https://ndtykmmfntaoixbskglw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_D7dMRtUAABCSP3g6znZSEg_3n-cqYiz";

    const VALOR_POR_NUMERO = 10;

    const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


    /* ---------------------------------------------------------------------
       ELEMENTOS
       --------------------------------------------------------------------- */

    const el = id => document.getElementById(id);

    const numbersGrid = el("numbersGrid");
    const resumoNumeros = el("numerosSelecionados");
    const resumoTotal = el("totalSelecionado");
    const nomeParticipante = el("nomeParticipante");
    const botaoSalvar = el("salvarReservaButton");
    const avisos = el("avisos");


    /* ---------------------------------------------------------------------
       ESTADO
       --------------------------------------------------------------------- */

    let selecionados = [];


    /* ---------------------------------------------------------------------
       FORMATAÇÃO
       --------------------------------------------------------------------- */

    const moeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const dois = numero => String(numero).padStart(2, "0");


    /* ---------------------------------------------------------------------
       AVISOS (no lugar do alert)
       --------------------------------------------------------------------- */

    function mostrarAviso(mensagem, tipo = "ok") {
        if (!avisos) {
            console.log(mensagem);
            return;
        }

        const aviso = document.createElement("div");
        aviso.className = `toast toast--${tipo}`;
        aviso.textContent = mensagem;

        avisos.appendChild(aviso);

        setTimeout(() => {
            aviso.style.opacity = "0";
            setTimeout(() => aviso.remove(), 300);
        }, 3600);
    }

    window.mostrarAviso = mostrarAviso;


    /* ---------------------------------------------------------------------
       CARREGAR OS NÚMEROS
       --------------------------------------------------------------------- */

    async function carregarNumeros() {
        numbersGrid.setAttribute("aria-busy", "true");

        const { data, error } = await banco
            .from("rifa_numeros")
            .select("numero, status, nome")
            .order("numero", { ascending: true });

        numbersGrid.removeAttribute("aria-busy");

        if (error) {
            console.error("Erro ao carregar números:", error);

            numbersGrid.innerHTML = `
                <p class="erro-rifa">
                    Não foi possível carregar os números. Verifique a conexão.
                </p>
            `;

            return;
        }

        const fragmento = document.createDocumentFragment();

        for (const item of data) {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.textContent = dois(item.numero);

            if (item.status === "disponivel") {
                botao.className = "available";
                botao.setAttribute("aria-pressed", "false");
                botao.setAttribute("aria-label", `Número ${dois(item.numero)}, disponível`);

                botao.addEventListener("click", () => alternar(item.numero, botao));

            } else {
                botao.className = "reserved";
                botao.disabled = true;
                botao.setAttribute(
                    "aria-label",
                    `Número ${dois(item.numero)}, reservado${item.nome ? ` para ${item.nome}` : ""}`
                );

                if (item.nome) botao.title = `Reservado para ${item.nome}`;
            }

            fragmento.appendChild(botao);
        }

        numbersGrid.replaceChildren(fragmento);

        atualizarResumo();
    }


    /* ---------------------------------------------------------------------
       SELECIONAR / DESSELECIONAR
       --------------------------------------------------------------------- */

    function alternar(numero, botao) {
        const indice = selecionados.indexOf(numero);

        if (indice !== -1) {
            selecionados.splice(indice, 1);
            botao.classList.remove("selected");
            botao.classList.add("available");
            botao.setAttribute("aria-pressed", "false");
        } else {
            selecionados.push(numero);
            botao.classList.remove("available");
            botao.classList.add("selected");
            botao.setAttribute("aria-pressed", "true");
        }

        atualizarResumo();
    }


    /* ---------------------------------------------------------------------
       RESUMO
       --------------------------------------------------------------------- */

    function atualizarResumo() {
        if (selecionados.length === 0) {
            resumoNumeros.textContent = "Nenhum número selecionado";
            resumoTotal.textContent = moeda.format(0);
            botaoSalvar.disabled = false;
            return;
        }

        const ordenados = [...selecionados].sort((a, b) => a - b);

        resumoNumeros.textContent = ordenados.map(dois).join(", ");
        resumoTotal.textContent = moeda.format(selecionados.length * VALOR_POR_NUMERO);
    }


    /* ---------------------------------------------------------------------
       SALVAR A RESERVA
       --------------------------------------------------------------------- */

    async function salvarReserva() {
        if (selecionados.length === 0) {
            mostrarAviso("Selecione pelo menos um número.", "error");
            return;
        }

        const nome = nomeParticipante.value.trim();

        if (!nome) {
            mostrarAviso("Digite o nome da pessoa.", "error");
            nomeParticipante.focus();
            return;
        }

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando…";

        const { data, error } = await banco.rpc("salvar_reserva", {
            p_numeros: selecionados,
            p_nome: nome
        });

        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar reserva";

        if (error) {
            console.error("Erro ao salvar reserva:", error);
            mostrarAviso(error.message || "Não foi possível salvar a reserva.", "error");

            /* Alguém pode ter reservado o número no meio do caminho. */
            selecionados = [];
            await carregarNumeros();
            return;
        }

        const salvos = data.map(item => dois(item.numero)).join(", ");
        const total = moeda.format(selecionados.length * VALOR_POR_NUMERO);

        mostrarAviso(`Reserva de ${nome} salva: ${salvos} — ${total}`);

        selecionados = [];
        nomeParticipante.value = "";

        await carregarNumeros();
    }


    /* ---------------------------------------------------------------------
       COPIAR A CHAVE PIX
       --------------------------------------------------------------------- */

    async function copiarPix() {
        const chave = el("chavePix").textContent.trim();

        try {
            await navigator.clipboard.writeText(chave);
            mostrarAviso("Chave PIX copiada!");
        } catch {
            /* Alguns navegadores bloqueiam a área de transferência em http. */
            const campo = document.createElement("textarea");
            campo.value = chave;
            campo.setAttribute("readonly", "");
            campo.style.position = "fixed";
            campo.style.opacity = "0";
            document.body.appendChild(campo);
            campo.select();

            const deuCerto = document.execCommand("copy");
            campo.remove();

            mostrarAviso(
                deuCerto ? "Chave PIX copiada!" : "Copie a chave manualmente: " + chave,
                deuCerto ? "ok" : "error"
            );
        }
    }


    /* ---------------------------------------------------------------------
       EVENTOS
       --------------------------------------------------------------------- */

    botaoSalvar.addEventListener("click", salvarReserva);

    el("botaoCopiarPix").addEventListener("click", copiarPix);

    nomeParticipante.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            salvarReserva();
        }
    });


    /* ---------------------------------------------------------------------
       INÍCIO
       --------------------------------------------------------------------- */

    carregarNumeros();
})();
