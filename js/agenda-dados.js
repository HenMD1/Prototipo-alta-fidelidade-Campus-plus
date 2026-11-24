/* ==========================================================
   Dados fictícios — Agendar entrevista
   Classes do diagrama: Candidatura, AgendaEntrevista,
   HorarioEntrevista, Entrevista e Mensagem.

   Os horários usam "d" = dias a partir da próxima segunda-feira
   (0 = segunda desta próxima semana, 7 = segunda da seguinte),
   para que o protótipo funcione em qualquer data.
   ========================================================== */

// Grade de aulas padrão (a mesma que o perfil importa do portal do aluno).
// Usada para avisar conflitos enquanto o estudante não salvou o perfil;
// depois disso, vale a grade cadastrada em perfil.html.
const GRADE_AULAS = [
  { dia: 1, ini: "13:30", fim: "15:10", disciplina: "INF01124 — Estruturas de Dados" },
  { dia: 2, ini: "10:30", fim: "12:10", disciplina: "INF01127 — Engenharia de Software" },
  { dia: 3, ini: "13:30", fim: "15:10", disciplina: "INF01124 — Estruturas de Dados" },
  { dia: 4, ini: "10:30", fim: "12:10", disciplina: "INF01127 — Engenharia de Software" },
];

const CANDIDATURAS_INICIAIS = [
  {
    id: 1, oportunidade: 1, status: "escolher",
    prazoEscolhaDias: 4,
    formato: "Online · Google Meet", duracao: 30,
    entrevistador: "Mariana Souza, tech lead",
    horarios: [
      { id: 101, d: 0, ini: "09:00", status: "livre" },
      { id: 102, d: 0, ini: "09:30", status: "livre" },
      { id: 103, d: 0, ini: "16:00", status: "livre" },
      { id: 104, d: 1, ini: "10:30", status: "livre" },
      { id: 105, d: 1, ini: "14:00", status: "livre" },
      { id: 106, d: 1, ini: "14:30", status: "ocupado" },
      { id: 107, d: 2, ini: "09:00", status: "ocupado" },
      { id: 108, d: 2, ini: "14:30", status: "livre" },
      { id: 109, d: 3, ini: "16:00", status: "livre" },
      { id: 110, d: 3, ini: "16:30", status: "livre" },
      { id: 111, d: 4, ini: "10:00", status: "ocupado" },
      { id: 112, d: 7, ini: "09:00", status: "livre" },
      { id: 113, d: 8, ini: "14:00", status: "livre" },
      { id: 114, d: 9, ini: "10:00", status: "livre" },
      { id: 115, d: 1, ini: "16:00", status: "livre" },
    ],
    entrevista: null, avisos: [],
    mensagens: [
      { de: "ofertante", texto: "Olá, João! Você foi aprovado na pré-seleção. Escolha um horário para a entrevista técnica na agenda.", quando: "há 2 horas" },
    ],
  },
  {
    id: 2, oportunidade: 2, status: "marcada",
    prazoEscolhaDias: 2,
    formato: "Presencial · Campus do Vale, prédio 43412, sala 205", duracao: 20,
    entrevistador: "Prof. Carlos Lima",
    horarios: [
      { id: 201, d: 1, ini: "13:00", status: "ocupado" },
      { id: 202, d: 1, ini: "13:20", status: "livre" },
      { id: 203, d: 1, ini: "16:00", status: "meu" },
      { id: 204, d: 3, ini: "08:30", status: "livre" },
      { id: 205, d: 3, ini: "16:20", status: "ocupado" },
    ],
    entrevista: 203, avisos: [],
    mensagens: [
      { de: "ofertante", texto: "João, sua entrevista está confirmada. Traga um documento com foto.", quando: "ontem" },
      { de: "eu", texto: "Combinado, professor. Obrigado!", quando: "ontem" },
    ],
  },
  {
    id: 3, oportunidade: 3, status: "aguardando",
    prazoEscolhaDias: 6, // aqui: data prevista para divulgar os selecionados
    formato: "Online · Microsoft Teams", duracao: 45,
    entrevistador: "Equipe de Recrutamento Finvest",
    horarios: [], entrevista: null, avisos: [], solicitouHorarios: false,
    mensagens: [],
  },
];

// Ambiente "do zero": nenhuma entrevista de exemplo.
if (Radar.ambiente === "zero") CANDIDATURAS_INICIAIS.length = 0;
