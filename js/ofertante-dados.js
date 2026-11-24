/* ==========================================================
   Dados fictícios — visão do ofertante (TechSul Sistemas)

   Vaga 1  (Estágio em desenvolvimento web): agenda já publicada.
           A agenda é a MESMA que o estudante vê em agenda.html
           (fica na candidatura de João, em radar:agenda).
           Os demais candidatos são fictícios.
   Vaga 17 (Estágio em DevOps): candidatos aprovados, sem agenda.
           Serve para demonstrar o CT02 (disponibilizar horários).
   ========================================================== */

const OFERTANTE_LOGADO = "techsul";
const ID_ESTUDANTE = "estudante"; // candidato ligado à tela do estudante

const OFERTANTE_INICIAL = {
  vagas: {
    1: {
      candidatos: [
        { id: ID_ESTUDANTE, nome: "João Silva", curso: "Ciência da Computação · 5º semestre" },
        { id: "ana", nome: "Ana Ribeiro", curso: "Engenharia de Computação · 6º semestre", status: "marcada", slot: 106,
          mensagens: [{ de: "candidato", texto: "Obrigada! Confirmo a entrevista.", quando: "há 1 hora" }] },
        { id: "bruno", nome: "Bruno Teixeira", curso: "Ciência da Computação · 4º semestre", status: "marcada", slot: 107, mensagens: [] },
        { id: "camila", nome: "Camila Duarte", curso: "Sistemas de Informação · 7º semestre", status: "marcada", slot: 111, mensagens: [] },
        { id: "diego", nome: "Diego Martins", curso: "Engenharia de Computação · 5º semestre", status: "escolher", mensagens: [] },
        { id: "eduarda", nome: "Eduarda Lopes", curso: "Ciência da Computação · 3º semestre", status: "escolher", mensagens: [] },
      ],
    },
    17: {
      publicada: false,
      formato: "Online · Google Meet", duracao: 30, prazoEscolhaDias: 5,
      horarios: [],
      candidatos: [
        { id: "fernanda", nome: "Fernanda Costa", curso: "Ciência da Computação · 6º semestre", status: "aguardando", mensagens: [] },
        { id: "gabriel", nome: "Gabriel Nunes", curso: "Engenharia de Computação · 7º semestre", status: "aguardando",
          mensagens: [{ de: "candidato", texto: "Olá! Quando serão divulgados os horários das entrevistas?", quando: "ontem" }] },
        { id: "helena", nome: "Helena Prado", curso: "Ciência da Computação · 5º semestre", status: "aguardando", mensagens: [] },
        { id: "igor", nome: "Igor Batista", curso: "Sistemas de Informação · 6º semestre", status: "aguardando", mensagens: [] },
      ],
    },
  },
};

const FORMATOS = [
  "Online · Google Meet",
  "Online · Microsoft Teams",
  "Presencial · Rua dos Andradas, 1234 — sala 502",
];

// Ambiente "do zero": a empresa criada começa sem vagas nem candidatos.
if (Radar.ambiente === "zero") OFERTANTE_INICIAL.vagas = {};

// Cria (se preciso) o registro de agenda/candidatos de uma vaga do ofertante.
function garantirVagaAgenda(of, vid) {
  if (!of.vagas[vid]) {
    of.vagas[vid] = { publicada: false, formato: FORMATOS[0], duracao: 30, prazoEscolhaDias: 5, horarios: [], candidatos: [] };
  }
  return of.vagas[vid];
}
