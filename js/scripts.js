// =========================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================

const SUPABASE_URL =
    "https://ndtykmmfntaoixbskglw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_D7dMRtUAABCSP3g6znZSEg_3n-cqYiz";


const { createClient } = supabase;


const banco = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =========================================
// CONFIGURAÇÕES
// =========================================

const valorPorNumero = 10;


// =========================================
// ELEMENTOS
// =========================================

const numbersGrid =
    document.getElementById("numbersGrid");


const numerosSelecionadosElemento =
    document.getElementById(
        "numerosSelecionados"
    );


const totalSelecionadoElemento =
    document.getElementById(
        "totalSelecionado"
    );


const nomeParticipante =
    document.getElementById(
        "nomeParticipante"
    );


const salvarReservaButton =
    document.getElementById(
        "salvarReservaButton"
    );


// =========================================
// NÚMEROS SELECIONADOS
// =========================================

let numerosSelecionados = [];


// =========================================
// CARREGAR NÚMEROS
// =========================================

async function carregarNumeros() {

    numbersGrid.innerHTML = "";


    const { data, error } = await banco

        .from("rifa_numeros")

        .select(
            "numero, status, nome"
        )

        .order(
            "numero",
            {
                ascending: true
            }
        );


    // =====================================
    // ERRO
    // =====================================

    if (error) {

        console.error(
            "Erro ao carregar números:",
            error
        );


        numbersGrid.innerHTML = `

            <p class="erro-rifa">

                Não foi possível carregar
                os números.

            </p>

        `;

        return;
    }


    // =====================================
    // CRIAR BOTÕES
    // =====================================

    data.forEach(item => {

        const botao =
            document.createElement(
                "button"
            );


        const numeroFormatado =
            String(item.numero)
                .padStart(2, "0");


        botao.textContent =
            numeroFormatado;


        // =================================
        // DISPONÍVEL
        // =================================

        if (
            item.status === "disponivel"
        ) {

            botao.classList.add(
                "available"
            );


            botao.addEventListener(
                "click",
                () => selecionarNumero(
                    item.numero,
                    botao
                )
            );

        }


        // =================================
        // RESERVADO
        // =================================

        else {

            botao.classList.add(
                "reserved"
            );


            botao.disabled = true;


            if (item.nome) {

                botao.title =
                    `Reservado para ${item.nome}`;

            }

        }


        numbersGrid.appendChild(
            botao
        );

    });


    atualizarResumo();
}


// =========================================
// SELECIONAR NÚMERO
// =========================================

function selecionarNumero(
    numero,
    botao
) {

    const indice =
        numerosSelecionados.indexOf(
            numero
        );


    // =====================================
    // DESMARCAR
    // =====================================

    if (indice !== -1) {

        numerosSelecionados.splice(
            indice,
            1
        );


        botao.classList.remove(
            "selected"
        );


        botao.classList.add(
            "available"
        );

    }


    // =====================================
    // MARCAR
    // =====================================

    else {

        numerosSelecionados.push(
            numero
        );


        botao.classList.remove(
            "available"
        );


        botao.classList.add(
            "selected"
        );

    }


    atualizarResumo();
}


// =========================================
// ATUALIZAR RESUMO
// =========================================

function atualizarResumo() {

    if (
        numerosSelecionados.length === 0
    ) {

        numerosSelecionadosElemento.textContent =
            "Nenhum número selecionado";


        totalSelecionadoElemento.textContent =
            "R$ 0,00";


        return;
    }


    const numerosOrdenados =
        [...numerosSelecionados]
            .sort(
                (a, b) => a - b
            );


    const numerosFormatados =
        numerosOrdenados.map(
            numero =>
                String(numero)
                    .padStart(2, "0")
        );


    const total =
        numerosSelecionados.length *
        valorPorNumero;


    numerosSelecionadosElemento.textContent =
        numerosFormatados.join(", ");


    totalSelecionadoElemento.textContent =
        `R$ ${total
            .toFixed(2)
            .replace(".", ",")}`;
}


// =========================================
// SALVAR RESERVA
// =========================================

async function salvarReserva() {

    // =====================================
    // VERIFICAR NÚMEROS
    // =====================================

    if (
        numerosSelecionados.length === 0
    ) {

        alert(
            "Selecione pelo menos um número."
        );

        return;
    }


    // =====================================
    // VERIFICAR NOME
    // =====================================

    const nome =
        nomeParticipante.value.trim();


    if (!nome) {

        alert(
            "Digite o nome da pessoa."
        );


        nomeParticipante.focus();


        return;
    }


    // =====================================
    // DESABILITAR BOTÃO
    // =====================================

    salvarReservaButton.disabled =
        true;


    salvarReservaButton.textContent =
        "Salvando...";


    // =====================================
    // ENVIAR PARA O SUPABASE
    // =====================================

    const { data, error } =
        await banco.rpc(
            "salvar_reserva",
            {
                p_numeros:
                    numerosSelecionados,

                p_nome:
                    nome
            }
        );


    // =====================================
    // ERRO
    // =====================================

    if (error) {

        console.error(
            "Erro ao salvar reserva:",
            error
        );


        alert(
            error.message ||
            "Não foi possível salvar a reserva."
        );


        salvarReservaButton.disabled =
            false;


        salvarReservaButton.textContent =
            "Salvar reserva";


        await carregarNumeros();


        return;
    }


    // =====================================
    // SUCESSO
    // =====================================

    const numerosSalvos =
        data
            .map(item =>
                String(item.numero)
                    .padStart(2, "0")
            )
            .join(", ");


    const total =
        numerosSelecionados.length *
        valorPorNumero;


    alert(

        `Reserva salva com sucesso!\n\n` +

        `Pessoa: ${nome}\n` +

        `Números: ${numerosSalvos}\n` +

        `Total: R$ ${total
            .toFixed(2)
            .replace(".", ",")}`

    );


    // =====================================
    // LIMPAR SELEÇÃO
    // =====================================

    numerosSelecionados = [];


    nomeParticipante.value = "";


    atualizarResumo();


    salvarReservaButton.disabled =
        false;


    salvarReservaButton.textContent =
        "Salvar reserva";


    // =====================================
    // RECARREGAR NÚMEROS
    // =====================================

    await carregarNumeros();
}


// =========================================
// EVENTO DO BOTÃO
// =========================================

salvarReservaButton.addEventListener(
    "click",
    salvarReserva
);


// =========================================
// INICIAR
// =========================================

carregarNumeros();