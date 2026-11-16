/* ==========================================================
   Dados fictícios — Minhas candidaturas (estudante)
   Classes do diagrama: Candidatura, Documento, Oportunidade.

   Vagas 1, 2 e 3 vêm da tela de entrevistas (radar:agenda):
   a etapa delas é calculada a partir do estado da entrevista.
   As demais ficam guardadas aqui.
   ========================================================== */

const ETAPAS = ["Inscrição", "Análise", "Entrevista", "Resultado", "Termo de compromisso", "Início"];

// Vagas cujo andamento vem da tela de entrevistas: vaga → id da candidatura em agenda-dados.js
const VINCULADAS_AGENDA = { 1: 1, 2: 2, 3: 3 };

const CANDIDATURAS_ESTUDANTE = [
  {
    id: "c-ic", vaga: 8, etapa: 0, situacao: "andamento", enviadaHaDias: 2,
    docs: [
      { nome: "Histórico escolar", status: "recusado", arquivo: "historico.pdf",
        obs: "O arquivo está ilegível. Envie o histórico emitido pelo portal do aluno." },
      { nome: "Carta de motivação", status: "pendente" },
      { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado_matricula.pdf" },
    ],
    historico: [
      { haDias: 2, icone: "ti-send", texto: "Inscrição iniciada" },
      { haDias: 1, icone: "ti-file-x", texto: "Histórico escolar recusado pelo ofertante" },
    ],
  },
  {
    id: "c-prograd", vaga: 11, etapa: 1, situacao: "andamento", enviadaHaDias: 5,
    docs: [
      { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado_matricula.pdf" },
      { nome: "Comprovante de conta bancária", status: "aprovado", arquivo: "comprovante_conta.pdf" },
    ],
    historico: [
      { haDias: 5, icone: "ti-send", texto: "Inscrição enviada" },
      { haDias: 4, icone: "ti-file-check", texto: "Documentos aprovados" },
      { haDias: 4, icone: "ti-eye", texto: "Perfil em análise pela Pró-Reitoria de Graduação" },
    ],
  },
  {
    id: "c-agro", vaga: 14, etapa: 4, situacao: "aprovada", enviadaHaDias: 18,
    docs: [
      { nome: "Histórico escolar", status: "aprovado", arquivo: "historico.pdf" },
      { nome: "Currículo", status: "aprovado", arquivo: "curriculo_joao.pdf" },
    ],
    tce: {
      inicioEmDias: 14, vigenciaMeses: 6, apolice: "Seguro nº 0457.2026.118",
      supervisor: "Rafael Menezes, cientista de dados", orientador: "Profa. Juliana Ferraz (INF)",
      assinaturas: { ofertante: 1, estudante: null, universidade: null }, // dias atrás em que assinou
    },
    historico: [
      { haDias: 18, icone: "ti-send", texto: "Inscrição enviada" },
      { haDias: 12, icone: "ti-user-check", texto: "Aprovado na pré-seleção" },
      { haDias: 6, icone: "ti-video", texto: "Entrevista realizada" },
      { haDias: 2, icone: "ti-trophy", texto: "Aprovado para a vaga" },
      { haDias: 1, icone: "ti-signature", texto: "Termo de compromisso assinado pela AgroData Analytics" },
    ],
  },
  {
    id: "c-pixel", vaga: 6, etapa: 3, situacao: "nao-selecionado", enviadaHaDias: 25,
    docs: [
      { nome: "Portfólio", status: "aprovado", arquivo: "portfolio_joao.pdf" },
      { nome: "Currículo", status: "aprovado", arquivo: "curriculo_joao.pdf" },
      { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado_matricula.pdf" },
    ],
    feedback: "Obrigado pela participação! Seguimos com um candidato com mais experiência em pesquisa com usuários. Seu portfólio foi muito bem avaliado e esperamos ver você em próximas vagas.",
    historico: [
      { haDias: 25, icone: "ti-send", texto: "Inscrição enviada" },
      { haDias: 20, icone: "ti-user-check", texto: "Aprovado na pré-seleção" },
      { haDias: 14, icone: "ti-video", texto: "Entrevista realizada" },
      { haDias: 9, icone: "ti-mood-empty", texto: "Resultado divulgado: não selecionado" },
    ],
  },
];

// Histórico das candidaturas que vêm da tela de entrevistas
const HISTORICO_AGENDA = {
  1: [
    { haDias: 7, icone: "ti-send", texto: "Inscrição enviada" },
    { haDias: 6, icone: "ti-file-check", texto: "Documentos aprovados" },
    { haDias: 0, icone: "ti-user-check", texto: "Aprovado na pré-seleção" },
  ],
  2: [
    { haDias: 10, icone: "ti-send", texto: "Inscrição enviada" },
    { haDias: 3, icone: "ti-user-check", texto: "Aprovado na pré-seleção" },
    { haDias: 1, icone: "ti-calendar-check", texto: "Entrevista marcada" },
  ],
  3: [
    { haDias: 9, icone: "ti-send", texto: "Inscrição enviada" },
    { haDias: 2, icone: "ti-user-check", texto: "Aprovado na pré-seleção" },
  ],
};

// Ambiente "do zero": o estudante criado começa sem candidaturas.
if (Radar.ambiente === "zero") {
  CANDIDATURAS_ESTUDANTE.length = 0;
  Object.keys(VINCULADAS_AGENDA).forEach((k) => delete VINCULADAS_AGENDA[k]);
}
