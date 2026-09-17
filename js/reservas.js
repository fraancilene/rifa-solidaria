/* =========================================================================
   RESERVAS — listagem, busca, filtros, ordenação e exportação
   -------------------------------------------------------------------------
   Somente frontend: lê a tabela rifa_numeros do Supabase e monta a visão
   agrupada por pessoa. Nenhuma escrita acontece nesta página.
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

    const tabela = el("reservasTabela");
    const areaTabela = el("areaTabela");
    const rodapeTabela = el("rodapeTabela");
    const contador = el("contador");

    const estadoCarregando = el("estadoCarregando");
    const estadoErro = el("estadoErro");
    const estadoVazio = el("estadoVazio");
    const estadoSemResultado = el("estadoSemResultado");

    const campoBusca = el("campoBusca");
    const limparBusca = el("limparBusca");
    const campoOrdem = el("campoOrdem");
    const avisos = el("avisos");


    /* ---------------------------------------------------------------------
       ESTADO DA TELA
       --------------------------------------------------------------------- */

    let pessoas = [];        // dados agrupados, já processados
    let totalDeNumeros = 0;  // quantos números a rifa tem ao todo
    let carregadoEm = null;

    const filtros = {
        busca: "",
        situacao: "todos",
        ordem: "nome",
        direcao: "asc"
    };


    /* ---------------------------------------------------------------------
       FORMATAÇÃO
       --------------------------------------------------------------------- */

    const moeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const hora = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const dois = numero => String(numero).padStart(2, "0");

    /* Remove acentos para que "Joao" encontre "João". */
    const normalizar = texto =>
        String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "");

    const iniciais = nome =>
        nome
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(parte => parte[0] || "")
            .join("")
            .toUpperCase() || "?";

    /* Evita que um nome com < ou > quebre o HTML montado por string. */
    const escapar = texto =>
        String(texto).replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]);


    /* ---------------------------------------------------------------------
       AVISOS (substituem o alert)
       --------------------------------------------------------------------- */

    function mostrarAviso(mensagem, tipo = "ok") {
        const aviso = document.createElement("div");
        aviso.className = `toast toast--${tipo}`;
        aviso.textContent = mensagem;

        avisos.appendChild(aviso);

        setTimeout(() => {
            aviso.style.opacity = "0";
            setTimeout(() => aviso.remove(), 300);
        }, 3000);
    }

    /* Deixa disponível para o painel de tema reaproveitar. */
    window.mostrarAviso = mostrarAviso;


    /* ---------------------------------------------------------------------
       TROCA DE ESTADO DA LISTA
       --------------------------------------------------------------------- */

    function mostrarEstado(qual) {
        estadoCarregando.hidden = qual !== "carregando";
        estadoErro.hidden = qual !== "erro";
        estadoVazio.hidden = qual !== "vazio";
        estadoSemResultado.hidden = qual !== "sem-resultado";
        areaTabela.hidden = qual !== "lista";
        rodapeTabela.hidden = qual !== "lista";
    }


    /* ---------------------------------------------------------------------
       CARREGAR DO SUPABASE
       --------------------------------------------------------------------- */

    async function carregar() {
        mostrarEstado("carregando");
        contador.textContent = "";

        const { data, error } = await banco
            .from("rifa_numeros")
            .select("numero, nome, status")
            .order("numero", { ascending: true });

        if (error) {
            console.error("Erro ao carregar reservas:", error);
            el("mensagemErro").textContent =
                error.message || "Verifique a conexão e tente novamente.";
            mostrarEstado("erro");
            return;
        }

        totalDeNumeros = data.length;
        carregadoEm = new Date();

        pessoas = agrupar(data);

        if (pessoas.length === 0) {
            atualizarIndicadores();
            mostrarEstado("vazio");
            return;
        }

        atualizarIndicadores();
        renderizar();
    }


    /* ---------------------------------------------------------------------
       AGRUPAR OS NÚMEROS POR PESSOA
       --------------------------------------------------------------------- */

    function agrupar(linhas) {
        const mapa = new Map();

        for (const linha of linhas) {
            /* Só entram números que alguém reservou ou já pagou. */
            if (linha.status !== "reservado" && linha.status !== "pago") continue;

            const nome = (linha.nome || "").trim() || "Sem nome";

            if (!mapa.has(nome)) {
                mapa.set(nome, {
                    nome,
                    numeros: [],
                    pagos: 0,
                    pendentes: 0
                });
            }

            const pessoa = mapa.get(nome);

            pessoa.numeros.push({
                numero: linha.numero,
                pago: linha.status === "pago"
            });

            if (linha.status === "pago") pessoa.pagos += 1;
            else pessoa.pendentes += 1;
        }

        return [...mapa.values()].map(pessoa => {
            pessoa.numeros.sort((a, b) => a.numero - b.numero);
            pessoa.quantidade = pessoa.numeros.length;
            pessoa.total = pessoa.quantidade * VALOR_POR_NUMERO;
            pessoa.menorNumero = pessoa.numeros[0].numero;

            pessoa.situacao =
                pessoa.pendentes === 0 ? "pago" :
                pessoa.pagos === 0 ? "reservado" : "misto";

            /* Índice pré-calculado para a busca ficar instantânea. */
            pessoa.indice =
                normalizar(pessoa.nome) + " " +
                pessoa.numeros.map(n => dois(n.numero)).join(" ");

            return pessoa;
        });
    }


    /* ---------------------------------------------------------------------
       INDICADORES DO TOPO
       --------------------------------------------------------------------- */

    function atualizarIndicadores() {
        const reservados = pessoas.reduce((soma, p) => soma + p.quantidade, 0);
        const pagos = pessoas.reduce((soma, p) => soma + p.pagos, 0);
        const arrecadado = reservados * VALOR_POR_NUMERO;
        const confirmado = pagos * VALOR_POR_NUMERO;

        el("statTotal").textContent = moeda.format(arrecadado);
        el("statTotalDica").textContent =
            `${moeda.format(VALOR_POR_NUMERO)} por número`;

        el("statNumeros").textContent = reservados;
        el("statPessoas").textContent = pessoas.length;

        el("statMedia").textContent = pessoas.length
            ? `${(reservados / pessoas.length).toFixed(1).replace(".", ",")} números por pessoa`
            : "Nenhuma pessoa ainda";

        el("statPagos").textContent = pagos;
        el("statPagosDica").textContent = pagos
            ? `${moeda.format(confirmado)} confirmados`
            : "Nenhum pagamento confirmado";

        /* Progresso da rifa */
        const percentual = totalDeNumeros
            ? Math.round((reservados / totalDeNumeros) * 100)
            : 0;

        el("statProgressoBarra").style.width = `${percentual}%`;
        el("statProgressoTexto").textContent =
            `${percentual}% de ${totalDeNumeros} números`;

        const barra = document.querySelector(".progress");
        if (barra) barra.setAttribute("aria-valuenow", String(percentual));
    }


    /* ---------------------------------------------------------------------
       FILTRAR E ORDENAR
       --------------------------------------------------------------------- */

    function filtrar() {
        const busca = normalizar(filtros.busca.trim());

        let lista = pessoas.filter(pessoa => {
            if (filtros.situacao === "pago" && pessoa.pagos === 0) return false;
            if (filtros.situacao === "reservado" && pessoa.pendentes === 0) return false;
            if (busca && !pessoa.indice.includes(busca)) return false;
            return true;
        });

        const sentido = filtros.direcao === "asc" ? 1 : -1;

        lista.sort((a, b) => {
            switch (filtros.ordem) {
                case "quantidade":
                    return (b.quantidade - a.quantidade) * sentido ||
                           a.nome.localeCompare(b.nome, "pt-BR");
                case "total":
                    return (b.total - a.total) * sentido ||
                           a.nome.localeCompare(b.nome, "pt-BR");
                case "recente":
                    return (a.menorNumero - b.menorNumero) * sentido;
                default:
                    return a.nome.localeCompare(b.nome, "pt-BR") * sentido;
            }
        });

        return lista;
    }


    /* ---------------------------------------------------------------------
       DESENHAR A LISTA
       --------------------------------------------------------------------- */

    const ROTULOS = {
        pago: "Pago",
        reservado: "Aguardando",
        misto: "Parcial"
    };

    const CLASSES = {
        pago: "badge--paid",
        reservado: "badge--pending",
        misto: "badge--mixed"
    };

    function renderizar() {
        if (pessoas.length === 0) {
            mostrarEstado("vazio");
            return;
        }

        const lista = filtrar();

        if (lista.length === 0) {
            el("textoSemResultado").textContent = filtros.busca
                ? `Nada encontrado para "${filtros.busca}".`
                : "Nenhuma pessoa nessa situação.";
            contador.textContent = "0 de " + pessoas.length;
            mostrarEstado("sem-resultado");
            return;
        }

        const html = lista.map(pessoa => {
            const chips = pessoa.numeros
                .map(n =>
                    `<span class="chip${n.pago ? " chip--paid" : ""}"${
                        n.pago ? ' title="Pago"' : ""
                    }>${dois(n.numero)}</span>`
                )
                .join("");

            const nome = escapar(pessoa.nome);

            const editar = `
                <span class="row-actions">
                    <button type="button" class="icon-button" data-editar="${nome}"
                            title="Editar o nome de ${nome}"
                            aria-label="Editar o nome de ${nome}">✎</button>
                </span>
            `;

            return `
                <tr>
                    <td class="name-cell" data-label="Pessoa">
                        <span class="cell-name">
                            <span class="avatar" aria-hidden="true">${escapar(iniciais(pessoa.nome))}</span>
                            <span>${nome}</span>
                        </span>
                        ${editar}
                    </td>
                    <td class="num-cell" data-label="Números">
                        <span class="num-chips">${chips}</span>
                    </td>
                    <td class="cell-qty" data-label="Quantidade">${pessoa.quantidade}</td>
                    <td class="cell-total" data-label="Total">${moeda.format(pessoa.total)}</td>
                    <td data-label="Situação">
                        <button type="button" class="badge ${CLASSES[pessoa.situacao]}"
                                data-editar="${nome}"
                                title="Alterar a situação de ${nome}">
                            ${ROTULOS[pessoa.situacao]}
                        </button>
                    </td>
                    <td class="actions-cell">${editar}</td>
                </tr>
            `;
        }).join("");

        tabela.innerHTML = html;

        /* Totais do rodapé, considerando o filtro aplicado */
        const numeros = lista.reduce((soma, p) => soma + p.quantidade, 0);
        const valor = numeros * VALOR_POR_NUMERO;

        el("rodapePessoas").textContent =
            `${lista.length} de ${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"}`;
        el("rodapeNumeros").textContent = numeros;
        el("rodapeValor").textContent = moeda.format(valor);

        el("atualizadoEm").textContent = carregadoEm
            ? `Atualizado às ${hora.format(carregadoEm)}`
            : "";

        contador.textContent =
            lista.length === pessoas.length
                ? `${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"}`
                : `${lista.length} de ${pessoas.length}`;

        mostrarEstado("lista");
    }


    /* ---------------------------------------------------------------------
       EXPORTAR CSV
       --------------------------------------------------------------------- */

    function exportar() {
        const lista = filtrar();

        if (lista.length === 0) {
            mostrarAviso("Não há nada para exportar.", "error");
            return;
        }

        const campo = valor => `"${String(valor).replace(/"/g, '""')}"`;

        const linhas = [
            ["Pessoa", "Números", "Quantidade", "Total (R$)", "Situação"].map(campo).join(";"),
            ...lista.map(pessoa => [
                pessoa.nome,
                pessoa.numeros.map(n => dois(n.numero)).join(" "),
                pessoa.quantidade,
                pessoa.total.toFixed(2).replace(".", ","),
                ROTULOS[pessoa.situacao]
            ].map(campo).join(";"))
        ];

        /* O BOM faz o Excel abrir os acentos corretamente. */
        const conteudo = "﻿" + linhas.join("\r\n");
        const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const data = new Date().toISOString().slice(0, 10);
        const link = document.createElement("a");
        link.href = url;
        link.download = `reservas-rifa-${data}.csv`;
        link.click();

        URL.revokeObjectURL(url);
        mostrarAviso(`${lista.length} registros exportados.`);
    }


    /* ---------------------------------------------------------------------
       RENOMEAR UMA PESSOA
       -------------------------------------------------------------------
       Grava o novo nome em todos os números daquela pessoa de uma vez.
       Se o nome digitado já existir, os dois registros passam a ser um só.
       --------------------------------------------------------------------- */

    const dialogo = el("dialogoNome");
    const formulario = el("formularioNome");
    const campoNome = el("campoNome");
    const dicaDialogo = el("dicaDialogo");
    const salvarNome = el("salvarNome");
    const areaNumeros = el("numerosSituacao");
    const resumoSituacao = el("resumoSituacao");

    let emEdicao = null;
    let situacoes = new Map();   // numero -> pago (rascunho, só grava ao salvar)

    function abrirEdicao(nome) {
        emEdicao = pessoas.find(p => p.nome === nome);
        if (!emEdicao) return;

        el("tituloDialogo").textContent = `Editar “${emEdicao.nome}”`;

        el("descricaoDialogo").textContent =
            `${emEdicao.quantidade} ` +
            `${emEdicao.quantidade === 1 ? "número" : "números"} • ` +
            `${moeda.format(emEdicao.total)}`;

        campoNome.value = emEdicao.nome === "Sem nome" ? "" : emEdicao.nome;

        situacoes = new Map(emEdicao.numeros.map(n => [n.numero, n.pago]));

        montarNumeros();
        conferirNome();

        dialogo.showModal();
        campoNome.focus();
        campoNome.select();
    }


    /* ---- Botões de situação, um por número ---- */

    function montarNumeros() {
        areaNumeros.innerHTML = "";

        for (const [numero, pago] of situacoes) {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "num-toggle";
            botao.dataset.numero = String(numero);
            botao.setAttribute("aria-pressed", String(pago));
            botao.setAttribute(
                "aria-label",
                `Número ${dois(numero)}: ${pago ? "pago" : "pendente"}`
            );

            const rotulo = document.createElement("span");
            rotulo.textContent = dois(numero);
            botao.appendChild(rotulo);

            areaNumeros.appendChild(botao);
        }

        atualizarResumoSituacao();
    }

    function atualizarResumoSituacao() {
        const total = situacoes.size;
        const pagos = [...situacoes.values()].filter(Boolean).length;

        resumoSituacao.textContent =
            `${pagos} de ${total} ${total === 1 ? "pago" : "pagos"} • ` +
            `${moeda.format(pagos * VALOR_POR_NUMERO)} confirmados`;

        resumoSituacao.removeAttribute("data-tipo");
    }

    function alternarNumero(botao) {
        const numero = Number(botao.dataset.numero);
        const pago = !situacoes.get(numero);

        situacoes.set(numero, pago);

        botao.setAttribute("aria-pressed", String(pago));
        botao.setAttribute(
            "aria-label",
            `Número ${dois(numero)}: ${pago ? "pago" : "pendente"}`
        );

        atualizarResumoSituacao();
    }

    function marcarTodos(pago) {
        for (const numero of situacoes.keys()) situacoes.set(numero, pago);
        montarNumeros();
    }

    areaNumeros.addEventListener("click", evento => {
        const botao = evento.target.closest(".num-toggle");
        if (botao) alternarNumero(botao);
    });

    el("marcarTodosPagos").addEventListener("click", () => marcarTodos(true));
    el("marcarTodosPendentes").addEventListener("click", () => marcarTodos(false));

    /* Avisa, enquanto a pessoa digita, se o nome vai se juntar a outro. */
    function conferirNome() {
        const novo = campoNome.value.trim();

        if (!novo || !emEdicao) {
            dicaDialogo.textContent = "";
            dicaDialogo.removeAttribute("data-tipo");
            return;
        }

        const igual = pessoas.find(
            p => p !== emEdicao && normalizar(p.nome) === normalizar(novo)
        );

        if (igual) {
            dicaDialogo.textContent =
                `“${igual.nome}” já existe com ${igual.quantidade} ` +
                `${igual.quantidade === 1 ? "número" : "números"}. ` +
                `Os dois vão virar um registro só.`;
            dicaDialogo.dataset.tipo = "aviso";
        } else {
            dicaDialogo.textContent = "";
            dicaDialogo.removeAttribute("data-tipo");
        }
    }

    async function gravar(evento) {
        evento.preventDefault();

        if (!emEdicao) return;

        const novo = campoNome.value.trim();

        if (!novo) {
            dicaDialogo.textContent = "Digite um nome.";
            dicaDialogo.dataset.tipo = "erro";
            campoNome.focus();
            return;
        }

        const anterior = emEdicao.nome;
        const mudouNome = novo !== anterior;

        /* Quais números mudaram de situação */
        const viraramPagos = [];
        const viraramPendentes = [];

        for (const item of emEdicao.numeros) {
            const agora = situacoes.get(item.numero);
            if (agora === item.pago) continue;
            (agora ? viraramPagos : viraramPendentes).push(item.numero);
        }

        if (!mudouNome && viraramPagos.length === 0 && viraramPendentes.length === 0) {
            dialogo.close();
            return;
        }

        salvarNome.disabled = true;
        salvarNome.textContent = "Salvando…";

        /* Uma escrita por grupo de mudança, em vez de uma por número */
        const escritas = [];

        if (mudouNome) {
            escritas.push(
                banco
                    .from("rifa_numeros")
                    .update({ nome: novo })
                    .in("numero", emEdicao.numeros.map(n => n.numero))
            );
        }

        if (viraramPagos.length) {
            escritas.push(
                banco.from("rifa_numeros").update({ status: "pago" }).in("numero", viraramPagos)
            );
        }

        if (viraramPendentes.length) {
            escritas.push(
                banco.from("rifa_numeros").update({ status: "reservado" }).in("numero", viraramPendentes)
            );
        }

        const respostas = await Promise.all(escritas);
        const falha = respostas.find(r => r && r.error);

        salvarNome.disabled = false;
        salvarNome.textContent = "Salvar";

        if (falha) {
            console.error("Erro ao salvar a reserva:", falha.error);
            dicaDialogo.textContent =
                falha.error.message || "Não foi possível salvar. Tente novamente.";
            dicaDialogo.dataset.tipo = "erro";
            return;
        }

        dialogo.close();

        /* Uma frase só, dizendo o que de fato mudou */
        const partes = [];

        if (mudouNome) partes.push(`“${anterior}” agora é “${novo}”`);

        if (viraramPagos.length) {
            partes.push(
                `${viraramPagos.length} ${viraramPagos.length === 1 ? "número marcado" : "números marcados"} como pago`
            );
        }

        if (viraramPendentes.length) {
            partes.push(
                `${viraramPendentes.length} ${viraramPendentes.length === 1 ? "número devolvido" : "números devolvidos"} para pendente`
            );
        }

        mostrarAviso(partes.join(" • ") + ".");

        await carregar();
    }

    campoNome.addEventListener("input", conferirNome);
    formulario.addEventListener("submit", gravar);
    el("cancelarNome").addEventListener("click", () => dialogo.close());

    /* Um só ouvinte na tabela: as linhas são recriadas a cada filtro. */
    tabela.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-editar]");
        if (botao) abrirEdicao(botao.dataset.editar);
    });


    /* ---------------------------------------------------------------------
       EVENTOS
       --------------------------------------------------------------------- */

    /* Busca com pequeno atraso para não redesenhar a cada tecla */
    let timerBusca;

    campoBusca.addEventListener("input", () => {
        limparBusca.hidden = campoBusca.value === "";

        clearTimeout(timerBusca);
        timerBusca = setTimeout(() => {
            filtros.busca = campoBusca.value;
            renderizar();
        }, 160);
    });

    campoBusca.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && campoBusca.value) {
            evento.preventDefault();
            zerarBusca();
        }
    });

    function zerarBusca() {
        campoBusca.value = "";
        filtros.busca = "";
        limparBusca.hidden = true;
        renderizar();
    }

    limparBusca.addEventListener("click", () => {
        zerarBusca();
        campoBusca.focus();
    });


    /* Filtros por situação */
    document.querySelectorAll("[data-filtro]").forEach(botao => {
        botao.addEventListener("click", () => {
            filtros.situacao = botao.dataset.filtro;

            document.querySelectorAll("[data-filtro]").forEach(outro => {
                outro.setAttribute("aria-pressed", String(outro === botao));
            });

            renderizar();
        });
    });


    /* Ordenação pelo seletor */
    campoOrdem.addEventListener("change", () => {
        filtros.ordem = campoOrdem.value;
        filtros.direcao = "asc";
        sincronizarCabecalho();
        renderizar();
    });


    /* Ordenação clicando no cabeçalho da tabela */
    document.querySelectorAll("th[data-coluna] button").forEach(botao => {
        botao.addEventListener("click", () => {
            const coluna = botao.closest("th").dataset.coluna;

            if (filtros.ordem === coluna) {
                filtros.direcao = filtros.direcao === "asc" ? "desc" : "asc";
            } else {
                filtros.ordem = coluna;
                filtros.direcao = "asc";
            }

            campoOrdem.value = coluna;
            sincronizarCabecalho();
            renderizar();
        });
    });

    function sincronizarCabecalho() {
        document.querySelectorAll("th[data-coluna]").forEach(th => {
            if (th.dataset.coluna === filtros.ordem) {
                th.setAttribute(
                    "aria-sort",
                    filtros.direcao === "asc" ? "ascending" : "descending"
                );
            } else {
                th.removeAttribute("aria-sort");
            }
        });
    }


    /* Botões da barra superior e dos estados */
    el("botaoAtualizar").addEventListener("click", async evento => {
        const botao = evento.currentTarget;
        botao.disabled = true;
        await carregar();
        botao.disabled = false;
        mostrarAviso("Lista atualizada.");
    });

    el("botaoExportar").addEventListener("click", exportar);
    el("botaoImprimir").addEventListener("click", () => window.print());
    el("botaoTentarNovamente").addEventListener("click", carregar);

    el("botaoLimparFiltros").addEventListener("click", () => {
        filtros.situacao = "todos";

        document.querySelectorAll("[data-filtro]").forEach(botao => {
            botao.setAttribute("aria-pressed", String(botao.dataset.filtro === "todos"));
        });

        zerarBusca();
    });


    /* Atalho: "/" foca a busca */
    document.addEventListener("keydown", evento => {
        const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");

        if (evento.key === "/" && !digitando) {
            evento.preventDefault();
            campoBusca.focus();
        }
    });


    /* Recarrega quando a aba volta a ficar visível depois de um tempo */
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible" || !carregadoEm) return;

        const minutos = (Date.now() - carregadoEm.getTime()) / 60000;
        if (minutos > 2) carregar();
    });


    /* ---------------------------------------------------------------------
       INÍCIO
       --------------------------------------------------------------------- */

    carregar();
})();
