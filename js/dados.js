/* ==========================================================
   Dados fictícios do protótipo
   Espelham as classes Oportunidade / VagaEstagio / VagaEmprego /
   BolsaInstitucional e Ofertante (Empresa / UnidadeAcademica)
   do diagrama de classes da Etapa 1.

   Algumas vagas foram escolhidas para reproduzir os casos de teste:
   - CT01: vagas de 12h, 20h e 30h
   - CT02: nenhuma vaga trabalha só terça e quinta
   - CT05: vagas de R$ 700, R$ 800 e R$ 1.400
   ========================================================== */

const DIAS = [
  { id: "seg", curto: "S", nome: "Seg" },
  { id: "ter", curto: "T", nome: "Ter" },
  { id: "qua", curto: "Q", nome: "Qua" },
  { id: "qui", curto: "Q", nome: "Qui" },
  { id: "sex", curto: "S", nome: "Sex" },
  { id: "sab", curto: "S", nome: "Sáb" },
];

const AREAS = ["Computação", "Dados", "Engenharia", "Administração", "Comunicação", "Design", "Saúde", "Educação"];

const REGIOES = ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Região Metropolitana"];

const TIPOS = {
  estagio: { nome: "Estágio", icone: "ti-briefcase" },
  emprego: { nome: "Emprego", icone: "ti-building" },
  bolsa:   { nome: "Bolsa institucional", icone: "ti-school" },
};

const OFERTANTES = {
  techsul:   { nome: "TechSul Sistemas",            tipo: "Empresa",             cor: "#2453c6" },
  inf:       { nome: "Instituto de Informática",    tipo: "Unidade acadêmica",   cor: "#5b3fbf", sigla: "INF" },
  finvest:   { nome: "Finvest Investimentos",       tipo: "Empresa",             cor: "#0f6e56" },
  fabico:    { nome: "Fabico",                      tipo: "Unidade acadêmica",   cor: "#b4416b", sigla: "FAB" },
  horizonte: { nome: "Construtora Horizonte",       tipo: "Empresa",             cor: "#c2611f" },
  pixel:     { nome: "Pixel Lab Studio",            tipo: "Empresa",             cor: "#d0457a" },
  vida:      { nome: "Hospital Vida Plena",         tipo: "Empresa",             cor: "#1d8f8f" },
  nuvem:     { nome: "Nuvem Gaúcha Software",       tipo: "Empresa",             cor: "#3a6fd8" },
  cafe:      { nome: "Café Bom Fim",                tipo: "Empresa",             cor: "#7a4b2a" },
  prograd:   { nome: "Pró-Reitoria de Graduação",   tipo: "Unidade acadêmica",   cor: "#44506a", sigla: "PRG" },
  redesul:   { nome: "Rede Sul Supermercados",      tipo: "Empresa",             cor: "#c43c3c" },
  clinica:   { nome: "Clínica Bem Cuidar",          tipo: "Empresa",             cor: "#2b8a4b" },
  agrodata:  { nome: "AgroData Analytics",          tipo: "Empresa",             cor: "#5d8a1e" },
  mat:       { nome: "Instituto de Matemática",     tipo: "Unidade acadêmica",   cor: "#6b3fa0", sigla: "MAT" },
};

const OPORTUNIDADES = [
  {
    id: 1, tipo: "estagio", ofertante: "techsul", area: "Computação",
    titulo: "Estágio em desenvolvimento web",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Centro", local: "Rua dos Andradas, 1234 — Centro Histórico",
    remuneracao: 1400, prazoDias: 14, publicadaHaDias: 1, vagas: 2, status: "aberta",
    descricao: "Atuação no time de produto, desenvolvendo funcionalidades de um sistema web de gestão escolar com React e Node.js, com acompanhamento de um desenvolvedor sênior.",
    requisitos: ["Cursando Ciência ou Engenharia da Computação a partir do 3º semestre", "Noções de HTML, CSS e JavaScript", "Disponibilidade de 4h por dia"],
    beneficios: ["Vale-transporte", "Auxílio alimentação de R$ 25/dia", "Possibilidade de efetivação"],
    documentos: ["Histórico escolar", "Atestado de matrícula", "Currículo"],
    turno: "Tarde", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
  },
  {
    id: 2, tipo: "bolsa", ofertante: "inf", area: "Computação",
    titulo: "Bolsa de apoio técnico em laboratórios",
    cargaHoraria: 12, dias: ["seg", "qua", "sex"],
    modalidade: "presencial", regiao: "Zona Leste", local: "Campus do Vale — Prédio 43412",
    remuneracao: 800, prazoDias: 9, publicadaHaDias: 3, vagas: 3, status: "aberta",
    descricao: "Suporte aos laboratórios de ensino do Instituto: manutenção das máquinas, instalação de softwares das disciplinas e atendimento a professores e alunos.",
    requisitos: ["Estar regularmente matriculado na UFRGS", "Não possuir outra bolsa institucional", "Conhecimentos básicos de Linux"],
    beneficios: ["Certificado de atividade", "Horário flexível entre as aulas"],
    documentos: ["Atestado de matrícula", "Comprovante de conta bancária"],
    turno: "Flexível",
  },
  {
    id: 3, tipo: "estagio", ofertante: "finvest", area: "Dados",
    titulo: "Estágio em análise de dados financeiros",
    cargaHoraria: 30, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 2000, prazoDias: 4, publicadaHaDias: 6, vagas: 1, status: "aberta",
    descricao: "Construção de painéis e relatórios de indicadores de carteira de investimentos, com SQL e Python.",
    requisitos: ["Cursando Estatística, Economia, Computação ou áreas afins", "SQL intermediário", "Python (pandas)"],
    beneficios: ["Auxílio home office", "Plano de saúde", "Bolsa de estudos em cursos de dados"],
    documentos: ["Histórico escolar", "Currículo", "Atestado de matrícula"],
    turno: "Tarde", permiteNegociacaoHorario: false, cargaSemanaProvas: 15,
  },
  {
    id: 4, tipo: "bolsa", ofertante: "fabico", area: "Comunicação",
    titulo: "Bolsa de extensão — rádio universitária",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui"],
    modalidade: "presencial", regiao: "Centro", local: "Campus Saúde — Rua Ramiro Barcelos, 2705",
    remuneracao: 700, prazoDias: 11, publicadaHaDias: 2, vagas: 2, status: "aberta",
    descricao: "Produção de pautas, roteiros e edição de áudio para programas semanais do projeto de extensão de rádio.",
    requisitos: ["Cursando Jornalismo, Publicidade ou Relações Públicas", "Conhecimento de edição de áudio"],
    beneficios: ["Certificado de extensão", "Horas complementares"],
    documentos: ["Atestado de matrícula", "Portfólio (opcional)"],
    turno: "Tarde",
  },
  {
    id: 5, tipo: "estagio", ofertante: "horizonte", area: "Engenharia",
    titulo: "Estágio em engenharia civil — obras",
    cargaHoraria: 30, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Zona Norte", local: "Av. Assis Brasil, 8000 — Sarandi",
    remuneracao: 1800, prazoDias: 20, publicadaHaDias: 5, vagas: 2, status: "aberta",
    descricao: "Acompanhamento de obra residencial: controle de cronograma, medições, diário de obra e apoio ao engenheiro responsável.",
    requisitos: ["Cursando Engenharia Civil a partir do 6º semestre", "AutoCAD", "CNH B (desejável)"],
    beneficios: ["Vale-transporte", "Refeição no local", "Seguro de vida"],
    documentos: ["Histórico escolar", "Atestado de matrícula", "Currículo"],
    turno: "Manhã", permiteNegociacaoHorario: false, cargaSemanaProvas: 15,
  },
  {
    id: 6, tipo: "estagio", ofertante: "pixel", area: "Design",
    titulo: "Estágio em UX/UI design",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "sex"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 1200, prazoDias: 2, publicadaHaDias: 9, vagas: 1, status: "aberta",
    descricao: "Criação de protótipos no Figma, condução de testes de usabilidade e apoio na manutenção do design system de clientes do estúdio.",
    requisitos: ["Cursando Design, Computação ou Comunicação", "Figma", "Portfólio com ao menos 2 projetos"],
    beneficios: ["Auxílio home office", "Horário flexível"],
    documentos: ["Portfólio", "Currículo", "Atestado de matrícula"],
    turno: "Flexível", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
  },
  {
    id: 7, tipo: "estagio", ofertante: "vida", area: "Administração",
    titulo: "Estágio administrativo — gestão hospitalar",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Zona Sul", local: "Av. Wenceslau Escobar, 1500 — Tristeza",
    remuneracao: 1100, prazoDias: 16, publicadaHaDias: 4, vagas: 1, status: "aberta",
    descricao: "Apoio ao setor de suprimentos: cotações, controle de estoque e elaboração de relatórios gerenciais.",
    requisitos: ["Cursando Administração ou Engenharia de Produção", "Excel intermediário"],
    beneficios: ["Vale-transporte", "Refeitório no local"],
    documentos: ["Histórico escolar", "Atestado de matrícula"],
    turno: "Manhã", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
  },
  {
    id: 8, tipo: "bolsa", ofertante: "inf", area: "Computação",
    titulo: "Iniciação científica em visão computacional",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui"],
    modalidade: "presencial", regiao: "Zona Leste", local: "Campus do Vale — Laboratório de Computação Gráfica",
    remuneracao: 700, prazoDias: 25, publicadaHaDias: 0, vagas: 1, status: "aberta",
    descricao: "Participação em projeto de pesquisa sobre detecção de objetos em imagens agrícolas usando redes neurais.",
    requisitos: ["Média harmônica acima de 7", "Python", "Ter cursado Algoritmos e Programação"],
    beneficios: ["Bolsa CNPq", "Participação em artigos científicos"],
    documentos: ["Histórico escolar", "Carta de motivação", "Atestado de matrícula"],
    turno: "Tarde",
  },
  {
    id: 9, tipo: "emprego", ofertante: "nuvem", area: "Computação",
    titulo: "Desenvolvedor(a) back-end júnior",
    cargaHoraria: 30, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 3200, prazoDias: 12, publicadaHaDias: 2, vagas: 1, status: "aberta", regime: "CLT",
    descricao: "Desenvolvimento de APIs em Java/Spring para plataforma de logística, em jornada reduzida compatível com a graduação.",
    requisitos: ["Cursando os últimos 3 semestres de Computação", "Java", "Git", "Banco de dados relacional"],
    beneficios: ["Plano de saúde e odontológico", "Vale-refeição", "Gympass"],
    documentos: ["Currículo", "Atestado de matrícula"],
    turno: "Flexível",
  },
  {
    id: 10, tipo: "estagio", ofertante: "cafe", area: "Comunicação",
    titulo: "Estágio em marketing digital",
    cargaHoraria: 16, dias: ["ter", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Centro", local: "Rua Fernandes Vieira, 300 — Bom Fim",
    remuneracao: 900, prazoDias: 8, publicadaHaDias: 7, vagas: 1, status: "aberta",
    descricao: "Planejamento de conteúdo para redes sociais, fotografia de produtos e acompanhamento de métricas de engajamento.",
    requisitos: ["Cursando Publicidade, Jornalismo ou Design", "Familiaridade com Instagram e Canva"],
    beneficios: ["Vale-transporte", "Café e lanche no local"],
    documentos: ["Portfólio", "Atestado de matrícula"],
    turno: "Tarde", permiteNegociacaoHorario: true, cargaSemanaProvas: 8,
  },
  {
    id: 11, tipo: "bolsa", ofertante: "prograd", area: "Administração",
    titulo: "Bolsa administrativa — atendimento ao estudante",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Centro", local: "Campus Centro — Prédio da Reitoria",
    remuneracao: 800, prazoDias: 6, publicadaHaDias: 8, vagas: 4, status: "aberta",
    descricao: "Atendimento presencial e por e-mail a estudantes sobre matrícula, trancamento e documentação acadêmica.",
    requisitos: ["Estar regularmente matriculado na UFRGS", "Boa comunicação escrita"],
    beneficios: ["Auxílio transporte", "Certificado de atividade"],
    documentos: ["Atestado de matrícula", "Comprovante de conta bancária"],
    turno: "Manhã",
  },
  {
    id: 12, tipo: "estagio", ofertante: "redesul", area: "Computação",
    titulo: "Estágio em suporte de TI",
    cargaHoraria: 30, dias: ["seg", "ter", "qua", "qui", "sex", "sab"],
    modalidade: "presencial", regiao: "Região Metropolitana", local: "Av. Guilherme Schell, 5000 — Canoas",
    remuneracao: 1300, prazoDias: 18, publicadaHaDias: 10, vagas: 2, status: "aberta",
    descricao: "Atendimento de chamados, manutenção de equipamentos de caixa e apoio à infraestrutura de rede das lojas.",
    requisitos: ["Cursando Computação, Engenharia ou curso técnico em TI", "Noções de redes"],
    beneficios: ["Vale-transporte", "Desconto nas lojas"],
    documentos: ["Atestado de matrícula", "Currículo"],
    turno: "Noite", permiteNegociacaoHorario: false, cargaSemanaProvas: 15,
  },
  {
    id: 13, tipo: "estagio", ofertante: "clinica", area: "Saúde",
    titulo: "Estágio em nutrição clínica",
    cargaHoraria: 20, dias: ["seg", "qua", "qui", "sex"],
    modalidade: "presencial", regiao: "Zona Norte", local: "Av. Cristóvão Colombo, 2200 — Floresta",
    remuneracao: 1000, prazoDias: 10, publicadaHaDias: 3, vagas: 1, status: "aberta",
    descricao: "Acompanhamento de consultas, elaboração de planos alimentares sob supervisão e organização de prontuários.",
    requisitos: ["Cursando Nutrição a partir do 5º semestre"],
    beneficios: ["Vale-transporte", "Supervisão de nutricionista"],
    documentos: ["Histórico escolar", "Atestado de matrícula"],
    turno: "Manhã", permiteNegociacaoHorario: false, cargaSemanaProvas: 10,
  },
  {
    id: 14, tipo: "estagio", ofertante: "agrodata", area: "Dados",
    titulo: "Estágio em ciência de dados agrícolas",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 1500, prazoDias: 22, publicadaHaDias: 1, vagas: 2, status: "aberta",
    descricao: "Modelagem preditiva de produtividade de safras a partir de dados de satélite e estações meteorológicas.",
    requisitos: ["Python", "Estatística básica", "Interesse em agronegócio"],
    beneficios: ["Auxílio home office", "Horário flexível"],
    documentos: ["Histórico escolar", "Currículo"],
    turno: "Flexível", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
  },
  {
    id: 15, tipo: "bolsa", ofertante: "mat", area: "Educação",
    titulo: "Monitoria de Cálculo I",
    cargaHoraria: 12, dias: ["seg", "qua"],
    modalidade: "presencial", regiao: "Zona Leste", local: "Campus do Vale — Instituto de Matemática",
    remuneracao: 600, prazoDias: 5, publicadaHaDias: 4, vagas: 6, status: "aberta",
    descricao: "Atendimento a alunos em horários de plantão de dúvidas e apoio na correção de listas de exercícios.",
    requisitos: ["Aprovação em Cálculo I com conceito A ou B"],
    beneficios: ["Certificado de monitoria", "Horas complementares"],
    documentos: ["Histórico escolar", "Atestado de matrícula"],
    turno: "Tarde",
  },
  {
    id: 17, tipo: "estagio", ofertante: "techsul", area: "Computação",
    titulo: "Estágio em DevOps e infraestrutura",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 1500, prazoDias: 3, publicadaHaDias: 12, vagas: 1, status: "aberta",
    descricao: "Apoio na automação de deploys, monitoramento de servidores e manutenção de pipelines de integração contínua.",
    requisitos: ["Cursando Computação a partir do 4º semestre", "Linux", "Noções de Docker e Git"],
    beneficios: ["Auxílio home office", "Possibilidade de efetivação"],
    documentos: ["Histórico escolar", "Currículo", "Atestado de matrícula"],
    turno: "Tarde", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
  },
  {
    // Encerrada: não aparece no mural (só vagas com inscrições abertas são exibidas).
    id: 16, tipo: "estagio", ofertante: "techsul", area: "Computação",
    titulo: "Estágio em testes de software",
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
    modalidade: "remota", regiao: null, local: "Remoto",
    remuneracao: 1300, prazoDias: -2, publicadaHaDias: 20, vagas: 1, status: "encerrada",
    motivoEncerramento: "Prazo de inscrição expirado.",
    descricao: "Escrita de testes automatizados.", requisitos: [], beneficios: [], documentos: [],
    turno: "Tarde", permiteNegociacaoHorario: false, cargaSemanaProvas: 10,
  },
];

/* ----------------------------------------------------------
   Vagas cadastradas ou editadas pelo ofertante (vagas.html).
   Ficam no navegador e substituem/complementam a lista acima,
   para aparecerem no mural e nas outras telas.
   ---------------------------------------------------------- */
(function aplicarVagasSalvas() {
  let salvas = [];
  salvas = Radar.ler("radar:vagas", []);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  salvas.forEach((v) => {
    const vaga = { ...v };
    if (vaga.prazoData) {
      const [a, m, d] = vaga.prazoData.split("-").map(Number);
      vaga.prazoDias = Math.round((new Date(a, m - 1, d) - hoje) / 86400000);
    }
    if (vaga.publicadaEm) {
      const [a, m, d] = vaga.publicadaEm.split("-").map(Number);
      vaga.publicadaHaDias = Math.max(0, Math.round((hoje - new Date(a, m - 1, d)) / 86400000));
    }
    const i = OPORTUNIDADES.findIndex((o) => o.id === vaga.id);
    if (i >= 0) OPORTUNIDADES[i] = vaga; else OPORTUNIDADES.push(vaga);
  });
})();

/* ----------------------------------------------------------
   Ambiente "do zero": a empresa/unidade criada pelo usuário
   vira um ofertante como os outros.
   ---------------------------------------------------------- */
if (Radar.ambiente === "zero") {
  const c = Radar.conta("ofertante");
  OFERTANTES[Radar.OFERTANTE_ZERO] = c
    ? { nome: c.empresa, tipo: c.tipo, cor: c.cor || "#7a3fbf", sigla: c.sigla }
    : { nome: "Empresa de teste", tipo: "Empresa", cor: "#7a3fbf", sigla: "ET" };
}
