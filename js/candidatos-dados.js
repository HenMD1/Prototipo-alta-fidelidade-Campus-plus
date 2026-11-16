/* ==========================================================
   Dados fictícios — triagem de candidatos (visão do ofertante)
   Inscritos que ainda estão "em análise" nas vagas da TechSul.
   Os pré-selecionados vêm de ofertante-dados.js (agenda).
   O estudante da demonstração (João) entra aqui quando se
   candidata pelo mural a uma vaga da TechSul.
   ========================================================== */

const TRIAGEM_INICIAL = {
  inscritos: {
    1: [
      { id: "rafaela", nome: "Rafaela Moura", curso: "Ciência da Computação", semestre: 4, horas: 20, dias: ["seg", "ter", "qua", "qui", "sex"], enviadaHaDias: 1, fase: "analise",
        docs: [{ nome: "Histórico escolar", status: "enviado", arquivo: "historico_rafaela.pdf" }, { nome: "Atestado de matrícula", status: "enviado", arquivo: "atestado.pdf" }, { nome: "Currículo", status: "enviado", arquivo: "cv_rafaela_moura.pdf" }] },
      { id: "thiago", nome: "Thiago Ramos", curso: "Engenharia de Computação", semestre: 2, horas: 12, dias: ["ter", "qui"], enviadaHaDias: 2, fase: "analise",
        docs: [{ nome: "Histórico escolar", status: "enviado", arquivo: "historico.pdf" }, { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado_matricula.pdf" }, { nome: "Currículo", status: "pendente" }] },
      { id: "juliana", nome: "Juliana Pacheco", curso: "Sistemas de Informação", semestre: 6, horas: 30, dias: ["seg", "ter", "qua", "qui", "sex"], enviadaHaDias: 3, fase: "analise",
        docs: [{ nome: "Histórico escolar", status: "aprovado", arquivo: "historico_juliana.pdf" }, { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado.pdf" }, { nome: "Currículo", status: "aprovado", arquivo: "curriculo_juliana.pdf" }] },
    ],
    17: [
      { id: "marcos", nome: "Marcos Vieira", curso: "Ciência da Computação", semestre: 5, horas: 20, dias: ["seg", "ter", "qua", "qui", "sex"], enviadaHaDias: 1, fase: "analise",
        docs: [{ nome: "Histórico escolar", status: "enviado", arquivo: "historico_marcos.pdf" }, { nome: "Currículo", status: "enviado", arquivo: "cv_marcos.pdf" }, { nome: "Atestado de matrícula", status: "enviado", arquivo: "atestado.pdf" }] },
      { id: "larissa", nome: "Larissa Campos", curso: "Engenharia de Computação", semestre: 7, horas: 24, dias: ["seg", "ter", "qua", "qui"], enviadaHaDias: 4, fase: "analise",
        docs: [{ nome: "Histórico escolar", status: "aprovado", arquivo: "historico.pdf" }, { nome: "Currículo", status: "aprovado", arquivo: "larissa_campos_cv.pdf" }, { nome: "Atestado de matrícula", status: "aprovado", arquivo: "atestado.pdf" }] },
    ],
  },
  decisoes: {},   // "<vaga>-<candidato>": { fase: "aprovado" | "rejeitado", motivo }
};

// Disciplinas usadas no histórico simulado
const DISCIPLINAS_HISTORICO = [
  ["INF01202", "Algoritmos e Programação", "A"], ["MAT01353", "Cálculo e Geometria Analítica I", "B"],
  ["INF01203", "Estruturas de Dados", "A"], ["INF01107", "Introdução à Arquitetura de Computadores", "B"],
  ["INF01120", "Técnicas de Construção de Programas", "A"], ["INF01127", "Engenharia de Software N", "B"],
];

// Ambiente "do zero": nenhum inscrito de exemplo (use "Simular inscritos" na tela).
if (Radar.ambiente === "zero") TRIAGEM_INICIAL.inscritos = {};

// Inscritos fictícios gerados sob demanda ("Simular inscritos")
const NOMES_FICTICIOS = ["Beatriz Almeida", "Carlos Mendes", "Daniela Rocha", "Eduardo Lima", "Fernanda Torres", "Gustavo Reis", "Isabela Martins", "Lucas Fernandes", "Marina Castro", "Pedro Nogueira"];
const CURSOS_FICTICIOS = ["Ciência da Computação", "Engenharia de Computação", "Sistemas de Informação", "Administração", "Estatística"];
function gerarInscritos(vaga, quantos, ja) {
  const usados = new Set(ja.map((k) => k.nome));
  const livres = NOMES_FICTICIOS.filter((n) => !usados.has(n));
  return livres.slice(0, quantos).map((nome, i) => {
    const compativel = i !== 1;
    return {
      id: `sim-${Date.now()}-${i}`, nome, curso: CURSOS_FICTICIOS[(i + ja.length) % CURSOS_FICTICIOS.length],
      semestre: 3 + ((i * 2) % 5), horas: compativel ? Math.max(vaga.cargaHoraria, 20) : Math.max(4, vaga.cargaHoraria - 8),
      dias: compativel ? [...vaga.dias] : vaga.dias.slice(0, Math.max(1, vaga.dias.length - 2)),
      enviadaHaDias: i, fase: "analise",
      docs: vaga.documentos.map((d, j) => ({ nome: d, status: i === 2 && j === 0 ? "pendente" : "enviado", arquivo: i === 2 && j === 0 ? undefined : `${d.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").trim().replace(/ /g, "_")}.pdf` })),
    };
  });
}
