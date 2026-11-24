/* ==========================================================
   Minhas candidaturas — acompanhamento do processo
   - Etapas: inscrição → análise → entrevista → resultado →
     termo de compromisso → início
   - Envio de documentos (e reenvio de documentos recusados)
   - Assinatura do termo de compromisso de estágio
   Candidaturas das vagas 1–3 vêm da tela de entrevistas.
   ========================================================== */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BASE = Radar.proximaSegunda();
const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png"];
const TAMANHO_MAX = 10 * 1024 * 1024;

const clonar = (x) => JSON.parse(JSON.stringify(x));
let proprias, agendaEst;
let aba = "andamento";
let atualId = new URLSearchParams(location.search).get("c");

/* ---------- Estado ---------- */
function carregar() {
  proprias = Radar.ler("radar:minhas", null) || clonar(CANDIDATURAS_ESTUDANTE);
  agendaEst = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
  // Candidaturas iniciadas no mural ("Candidatar-se")
  Radar.ler("radar:candidaturas", []).forEach((vid) => {
    if (VINCULADAS_AGENDA[vid]) return;
    const existente = proprias.find((c) => c.vaga === vid);
    if (existente && existente.situacao !== "retirada") return;
    const nova = novaCandidatura(vid);
    if (existente) proprias[proprias.indexOf(existente)] = nova; else proprias.unshift(nova);
  });
  salvar();
}
function salvar() { Radar.salvar("radar:minhas", proprias); }

function novaCandidatura(vid) {
  const v = vaga(vid);
  return {
    id: `m-${vid}`, vaga: vid, etapa: 0, situacao: "andamento", enviadaHaDias: 0,
    docs: v.documentos.map((nome) => ({ nome, status: "pendente" })),
    historico: [{ haDias: 0, icone: "ti-send", texto: "Inscrição iniciada pelo mural" }],
  };
}

const vaga = (id) => OPORTUNIDADES.find((o) => o.id === id);
const ofertante = (c) => OFERTANTES[vaga(c.vaga).ofertante];
const sigla = (of) => of.sigla || of.nome.split(" ").filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const diaRelativo = (haDias) => haDias === 0 ? "hoje" : haDias === 1 ? "ontem" : Radar.fmtDia(Radar.somarDias(Radar.hoje(), -haDias));

// Candidaturas que andam pela tela de entrevistas: etapa calculada a partir dela.
function vinculadas() {
  return Object.entries(VINCULADAS_AGENDA).map(([vid, cid]) => {
    const a = agendaEst.find((x) => x.id === cid);
    const v = vaga(Number(vid));
    const historico = clonar(HISTORICO_AGENDA[cid]);
    let situacao = "andamento", motivo = null, entrevista = null;
    if (a.status === "marcada") {
      const h = a.horarios.find((x) => x.id === a.entrevista);
      entrevista = { data: Radar.somarDias(BASE, h.d), ini: h.ini, formato: a.formato };
    }
    if (a.status === "cancelada") { situacao = "cancelada"; motivo = a.motivo; historico.push({ haDias: 0, icone: "ti-ban", texto: "Candidatura cancelada: prazo para escolher horário expirou" }); }
    if (a.status === "desistiu") { situacao = "desistiu"; motivo = a.motivo; historico.push({ haDias: 0, icone: "ti-door-exit", texto: "Você desistiu da vaga" }); }
    return {
      id: `a-${cid}`, vaga: Number(vid), etapa: 2, situacao, motivo, vinculada: cid, statusAgenda: a.status,
      prazoEscolha: Radar.somarDias(Radar.hoje(), a.prazoEscolhaDias), entrevista,
      enviadaHaDias: historico[0].haDias,
      docs: v.documentos.map((nome) => ({ nome, status: "aprovado", arquivo: `${nome.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, "_")}.pdf` })),
      historico,
    };
  });
}

// Candidatura própria que já tem agenda de entrevistas (pré-seleção pelo ofertante
// real ou simulado): ganha os dados da entrevista, como as vinculadas.
function enriquecer(c) {
  const a = agendaEst.find((x) => x.oportunidade === c.vaga);
  if (!a) return c;
  const h = a.horarios.find((x) => x.id === a.entrevista);
  const e = { ...c, vinculada: a.id, statusAgenda: a.status, prazoEscolha: Radar.somarDias(Radar.hoje(), a.prazoEscolhaDias),
    entrevista: h ? { data: Radar.somarDias(BASE, h.d), ini: h.ini, formato: a.formato } : null };
  if (c.etapa === 2 && ["desistiu", "cancelada"].includes(a.status)) { e.situacao = a.status; e.motivo = a.motivo; }
  return e;
}

function todas() { return [...vinculadas(), ...proprias.map(enriquecer)]; }

// Ofertante simulado (empresa sem conta logada) publica uma agenda ao pré-selecionar.
function criarAgendaSimulada(c) {
  if (agendaEst.some((x) => x.oportunidade === c.vaga)) return;
  const v = vaga(c.vaga), of = ofertante(c);
  const id = Math.max(0, ...agendaEst.map((x) => x.id)) + 1;
  const horas = ["09:00", "10:30", "14:00", "15:30", "16:30"];
  const horarios = [];
  let hid = id * 100;
  [0, 1, 2, 3, 4, 7, 8].forEach((d) => horas.forEach((ini, i) => {
    if ((d + i) % 3 === 0) horarios.push({ id: hid++, d, ini, status: (d + i) % 4 === 0 ? "ocupado" : "livre" });
  }));
  agendaEst.push({
    id, oportunidade: c.vaga, status: "escolher", prazoEscolhaDias: 4,
    formato: v.modalidade === "remota" ? "Online · Google Meet" : `Presencial · ${v.local}`, duracao: 30,
    entrevistador: `Equipe de seleção · ${of.nome}`, horarios, entrevista: null, avisos: [],
    mensagens: [{ de: "ofertante", texto: `Olá, ${Radar.estudante().nome.split(" ")[0]}! Você foi pré-selecionado para ${v.titulo}. Escolha um horário para a entrevista na agenda.`, quando: "agora" }],
  });
  Radar.salvar("radar:agenda", agendaEst);
}
const ENCERRADAS = ["nao-selecionado", "cancelada", "desistiu", "retirada"];
const encerrada = (c) => ENCERRADAS.includes(c.situacao);
// Concluída: aprovada e com o termo de compromisso assinado pelas três partes
const concluida = (c) => !encerrada(c) && c.etapa === 5;
const abaDe = (c) => (encerrada(c) ? "encerradas" : concluida(c) ? "concluidas" : "andamento");

/* ---------- Próxima ação (o que o estudante precisa saber/fazer) ---------- */
function proxima(c) {
  const v = vaga(c.vaga), of = ofertante(c);
  if (c.situacao === "nao-selecionado") return { tipo: "neutro", icone: "ti-mood-empty", titulo: "Não foi dessa vez", texto: `${of.nome} encerrou o processo e deixou um retorno para você.` };
  if (c.situacao === "cancelada") return { tipo: "perigo", icone: "ti-ban", titulo: "Candidatura cancelada", texto: c.motivo };
  if (c.situacao === "desistiu") return { tipo: "neutro", icone: "ti-door-exit", titulo: "Você desistiu desta vaga", texto: c.motivo };
  if (c.situacao === "retirada") return { tipo: "neutro", icone: "ti-arrow-back-up", titulo: "Candidatura retirada", texto: c.motivo || "Você saiu deste processo seletivo." };

  if (c.etapa === 0) {
    const faltam = c.docs.filter((d) => d.status === "pendente" || d.status === "recusado");
    const prazo = Radar.fmtDiaLongo(Radar.somarDias(Radar.hoje(), v.prazoDias));
    if (faltam.length) return { tipo: "alerta", icone: "ti-file-upload", titulo: `Envie ${faltam.length === 1 ? "1 documento" : `${faltam.length} documentos`} para concluir a inscrição`, texto: `Faltando: ${faltam.map((d) => d.nome).join(", ")}. Inscrições até ${prazo}.`, botao: { rotulo: "Enviar documentos", acao: "ir-docs" } };
    return { tipo: "info", icone: "ti-file-search", titulo: "Documentos em verificação", texto: "O ofertante está conferindo seus arquivos. Você será notificado do resultado." };
  }
  if (c.etapa === 1) return { tipo: "info", icone: "ti-eye", titulo: "Seu perfil está em análise", texto: `${of.nome} está avaliando os candidatos. Você será notificado quando a pré-seleção for divulgada.` };
  if (c.etapa === 2) {
    if (c.vinculada) {
      if (c.statusAgenda === "escolher") return { tipo: "alerta", icone: "ti-calendar-time", titulo: "Escolha um horário de entrevista", texto: `Você foi pré-selecionado! Escolha até ${Radar.fmtDiaLongo(c.prazoEscolha)}, ou a candidatura é cancelada automaticamente.`, botao: { rotulo: "Escolher horário", href: `agenda.html?c=${c.vinculada}` } };
      if (c.statusAgenda === "aguardando") return { tipo: "info", icone: "ti-hourglass", titulo: "Aguardando os horários de entrevista", texto: "Você foi pré-selecionado. O ofertante ainda vai divulgar a agenda.", botao: { rotulo: "Ver entrevistas", href: `agenda.html?c=${c.vinculada}` } };
      const e = c.entrevista;
      return { tipo: "sucesso", icone: "ti-calendar-check", titulo: `Entrevista: ${Radar.fmtDiaLongo(e.data)}, ${e.ini}`, texto: e.formato, botao: { rotulo: "Ver entrevista", href: `agenda.html?c=${c.vinculada}` } };
    }
    return { tipo: "sucesso", icone: "ti-user-check", titulo: "Você foi pré-selecionado", texto: `${of.nome} vai combinar a entrevista com você e depois divulga o resultado.` };
  }
  if (c.etapa === 4) {
    const a = c.tce.assinaturas;
    if (a.estudante === null) return { tipo: "alerta", icone: "ti-signature", titulo: "Você foi aprovado! Assine o termo de compromisso", texto: `${of.nome} já assinou. Depois da sua assinatura, a universidade valida o termo.`, botao: { rotulo: "Revisar e assinar", acao: "assinar" } };
    return { tipo: "info", icone: "ti-building-bank", titulo: "Aguardando a assinatura da universidade", texto: "A Comissão de Graduação (COMGRAD) está validando o termo de compromisso." };
  }
  if (c.etapa === 5) {
    const inicio = Radar.somarDias(Radar.hoje(), c.tce.inicioEmDias);
    return { tipo: "sucesso", icone: "ti-confetti", titulo: `Tudo pronto! Você começa em ${Radar.fmtDiaLongo(inicio)}`, texto: "O termo de compromisso foi assinado pelas três partes.", botao: { rotulo: "Ver termo", acao: "ver-termo" } };
  }
  return { tipo: "info", icone: "ti-info-circle", titulo: ETAPAS[c.etapa], texto: "" };
}

/* ---------- Métricas e lista ---------- */
function renderMetricas() {
  const ts = todas();
  const ativas = ts.filter((c) => abaDe(c) === "andamento");
  const pendentes = ativas.filter((c) => proxima(c).tipo === "alerta").length;
  const entrevistas = ts.filter((c) => c.statusAgenda === "marcada" && !encerrada(c)).length;
  const aprovadas = ts.filter((c) => c.situacao === "aprovada").length;
  $("#metricas").innerHTML = `
    <div class="metrica-c"><span class="ic"><i class="ti ti-progress"></i></span><span><strong>${ativas.length}</strong><small>Em andamento</small></span></div>
    <div class="metrica-c ${pendentes ? "alerta" : ""}"><span class="ic"><i class="ti ti-alert-circle"></i></span><span><strong>${pendentes}</strong><small>Precisam de você</small></span></div>
    <div class="metrica-c"><span class="ic"><i class="ti ti-calendar-event"></i></span><span><strong>${entrevistas}</strong><small>Entrevistas marcadas</small></span></div>
    <div class="metrica-c sucesso"><span class="ic"><i class="ti ti-trophy"></i></span><span><strong>${aprovadas}</strong><small>Aprovações</small></span></div>`;
}

function ordenar(lista) {
  const peso = { alerta: 0, sucesso: 1, info: 2, neutro: 3, perigo: 3 };
  return lista.sort((a, b) => peso[proxima(a).tipo] - peso[proxima(b).tipo] || b.etapa - a.etapa);
}

function renderLista() {
  const ts = todas();
  const grupos = {
    andamento: ordenar(ts.filter((c) => abaDe(c) === "andamento")),
    concluidas: ts.filter((c) => abaDe(c) === "concluidas"),
    encerradas: ts.filter((c) => abaDe(c) === "encerradas"),
  };
  Object.entries(grupos).forEach(([k, l]) => ($(`#qtd-${k}`).textContent = `(${l.length})`));
  document.querySelectorAll(".abas button").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === aba));
  const lista = grupos[aba];

  if (!atualId || !ts.some((c) => c.id === atualId)) atualId = (lista[0] || ts[0])?.id;

  $("#lista").innerHTML = lista.length ? lista.map((c) => {
    const v = vaga(c.vaga), of = ofertante(c), p = proxima(c);
    const fim = encerrada(c);
    return `
    <button class="item-cand ${c.id === atualId ? "ativo" : ""}" data-cand="${c.id}">
      <span class="logo-ofertante" style="background:${of.cor}">${sigla(of)}</span>
      <span class="item-cand-texto">
        <span class="item-cand-titulo">${v.titulo}</span>
        <span class="item-cand-of" style="display:block;margin-bottom:6px">${of.nome}</span>
        <span class="mini-progresso ${fim ? "encerrada" : ""}" aria-label="Etapa ${c.etapa + 1} de 6">${ETAPAS.map((_, i) => `<span class="${i < c.etapa || c.etapa === 5 ? "feito" : i === c.etapa ? "atual" : ""}"></span>`).join("")}</span>
        <span class="acao-linha ${p.tipo}"><i class="ti ${p.icone}"></i>${p.titulo}</span>
      </span>
    </button>`;
  }).join("") : `<p class="lista-vazia">${{ andamento: "Nenhuma candidatura em andamento.", concluidas: "Nenhuma candidatura concluída ainda.", encerradas: "Nenhuma candidatura encerrada." }[aba]}</p>`;
}

/* ---------- Detalhe ---------- */
function renderEtapas(c) {
  const fim = encerrada(c);
  return `<div class="etapas" role="list">${ETAPAS.map((nome, i) => {
    let cls = "", conteudo = i + 1;
    if (i < c.etapa || c.etapa === 5) { cls = "feita"; conteudo = '<i class="ti ti-check"></i>'; }
    else if (i === c.etapa) { cls = fim ? "parou" : "atual"; if (fim) conteudo = '<i class="ti ti-x"></i>'; }
    return `<div class="etapa ${cls}" role="listitem" aria-current="${i === c.etapa}"><div class="etapa-bola">${conteudo}</div><div class="etapa-nome">${nome}</div></div>`;
  }).join("")}</div>`;
}

function renderDocs(c) {
  const editavel = !encerrada(c) && c.etapa <= 1;
  const ROTULO = { pendente: ["neutra", "Pendente"], enviado: ["", "Em verificação"], aprovado: ["sucesso", "Aprovado"], recusado: ["perigo", "Recusado"] };
  const ICONE = { pendente: "ti-file-upload", enviado: "ti-file-search", aprovado: "ti-file-check", recusado: "ti-file-x" };
  return `
  <div class="bloco" id="bloco-docs">
    <h3 class="secao"><i class="ti ti-folder"></i> Documentos</h3>
    <p class="secao-sub">PDF, JPG ou PNG de até 10 MB. O ofertante confere cada arquivo.</p>
    <div class="docs">${c.docs.map((d, i) => `
      <div class="doc" data-doc="${i}">
        <span class="doc-ic ${d.status}"><i class="ti ${ICONE[d.status]}"></i></span>
        <div class="doc-info">
          <div class="doc-nome">${d.nome}</div>
          ${d.arquivo ? `<div class="doc-arquivo"><i class="ti ti-paperclip"></i> ${d.arquivo}${d.tamanho ? ` · ${d.tamanho}` : ""}</div>` : ""}
          ${d.obs ? `<div class="doc-obs">${d.obs}</div>` : ""}
        </div>
        <span class="etiqueta ${ROTULO[d.status][0]}" style="${d.status === "enviado" ? "background:#eef3fe;color:var(--cor-primaria)" : ""}">${ROTULO[d.status][1]}</span>
        ${editavel && (d.status === "pendente" || d.status === "recusado") ? `
          <label class="doc-enviar"><input type="file" accept=".pdf,.jpg,.jpeg,.png" data-upload="${i}" aria-label="Enviar ${d.nome}"><span class="btn btn-primario"><i class="ti ti-upload"></i> ${d.status === "recusado" ? "Reenviar" : "Enviar"}</span></label>` : ""}
      </div>`).join("")}
    </div>
  </div>`;
}

function renderTce(c) {
  const v = vaga(c.vaga), of = ofertante(c), t = c.tce, a = t.assinaturas;
  const inicio = Radar.somarDias(Radar.hoje(), t.inicioEmDias);
  const linha = (quem, nome, dias, vez) => {
    const ok = dias !== null;
    return `<div class="assinatura">
      <i class="ti ${ok ? "ti-circle-check feita" : vez ? "ti-pencil vez" : "ti-clock aguarda"}"></i>
      <div><strong>${quem}</strong><small>${nome}</small></div>
      <small>${ok ? `Assinado ${diaRelativo(dias)}` : vez ? "Sua vez" : "Aguardando"}</small>
    </div>`;
  };
  return `
  <div class="bloco">
    <h3 class="secao"><i class="ti ti-file-certificate"></i> Termo de compromisso de estágio</h3>
    <p class="secao-sub">Documento obrigatório assinado por você, pela concedente e pela universidade antes do início.</p>
    <div class="tce-grid">
      <div><small>Início</small><strong style="text-transform:capitalize">${Radar.fmtDiaLongo(inicio)}</strong></div>
      <div><small>Vigência</small><strong>${t.vigenciaMeses} meses</strong></div>
      <div><small>Jornada</small><strong>${v.cargaHoraria}h semanais · ${Math.round((v.cargaHoraria / v.dias.length) * 10) / 10}h/dia</strong></div>
      <div><small>Bolsa</small><strong>${brl.format(v.remuneracao)}/mês</strong></div>
      <div><small>Supervisor na empresa</small><strong>${t.supervisor}</strong></div>
      <div><small>Orientador na UFRGS</small><strong>${t.orientador}</strong></div>
    </div>
    <div class="assinaturas">
      ${linha("Concedente", of.nome, a.ofertante, false)}
      ${linha("Estagiário", `${esc(Radar.estudante().nome)} (você)`, a.estudante, a.estudante === null)}
      ${linha("Instituição de ensino", "UFRGS · Comissão de Graduação", a.universidade, false)}
    </div>
    <div class="acoes-rodape" style="margin-bottom:14px">
      <button class="btn" data-acao="ver-termo"><i class="ti ti-file-text"></i> Ver termo</button>
      ${a.estudante === null ? '<button class="btn btn-primario" data-acao="assinar"><i class="ti ti-signature"></i> Revisar e assinar</button>' : ""}
    </div>
    <div class="instrucoes">
      <strong><i class="ti ti-scale"></i> O que diz a Lei do Estágio (11.788/2008)</strong>
      <ul>
        <li>O termo precisa ser assinado pelas três partes antes do início das atividades.</li>
        <li>A jornada de estudantes de graduação é de no máximo 6 horas diárias e 30 horas semanais.</li>
        <li>No estágio não obrigatório, a bolsa e o auxílio-transporte são obrigatórios.</li>
        <li>A concedente contrata seguro contra acidentes pessoais (${t.apolice}).</li>
        <li>Você entrega relatórios de atividades ao orientador a cada 6 meses, no máximo.</li>
      </ul>
    </div>
  </div>`;
}

function renderDetalhe() {
  const c = todas().find((x) => x.id === atualId);
  if (!c) {
    $("#detalhe").innerHTML = `<div class="bloco estado"><div class="estado-icone neutro"><i class="ti ti-file-search"></i></div><h3>Nenhuma candidatura ainda</h3><p>Encontre oportunidades compatíveis com a sua rotina no mural.</p><div class="acoes"><a class="btn btn-primario" href="mural.html">Ir para o mural</a></div></div>`;
    return;
  }
  const v = vaga(c.vaga), of = ofertante(c), t = TIPOS[v.tipo], p = proxima(c);
  const podeRetirar = !c.vinculada && !encerrada(c) && c.etapa <= 2;

  $("#detalhe").innerHTML = `
  <div class="bloco vaga-topo">
    <span class="logo-ofertante" style="background:${of.cor}">${sigla(of)}</span>
    <div class="vaga-topo-texto">
      <span class="etiqueta ${v.tipo}"><i class="ti ${t.icone}"></i>${t.nome}</span>
      <h2>${v.titulo}</h2>
      <div class="ofertante">${of.nome} · ${of.tipo}</div>
      <div class="vaga-meta">
        <span><i class="ti ti-cash"></i>${brl.format(v.remuneracao)}/mês</span>
        <span><i class="ti ti-clock"></i>${v.cargaHoraria}h semanais</span>
        <span><i class="ti ${v.modalidade === "remota" ? "ti-world" : "ti-map-pin"}"></i>${v.modalidade === "remota" ? "Remota" : `Presencial · ${v.regiao}`}</span>
        <span><i class="ti ti-send"></i>Inscrição ${diaRelativo(c.enviadaHaDias)}</span>
      </div>
    </div>
    ${c.vinculada ? `<a class="btn" href="agenda.html?c=${c.vinculada}"><i class="ti ti-message-circle"></i> Conversar</a>` : ""}
  </div>

  <div class="bloco">${renderEtapas(c)}</div>

  <div class="proxima ${p.tipo}">
    <i class="ti ${p.icone}"></i>
    <div class="proxima-texto"><strong>${p.titulo}</strong>${p.texto ? `<p>${p.texto}</p>` : ""}
      ${c.feedback ? `<div class="feedback">“${c.feedback}”</div>` : ""}
    </div>
    ${p.botao ? (p.botao.href
      ? `<a class="btn btn-primario" href="${p.botao.href}">${p.botao.rotulo} <i class="ti ti-arrow-right"></i></a>`
      : `<button class="btn btn-primario" data-acao="${p.botao.acao}">${p.botao.rotulo}</button>`) : ""}
  </div>

  ${c.etapa >= 4 && c.tce ? renderTce(c) : ""}
  ${renderDocs(c)}

  <div class="bloco">
    <h3 class="secao" style="margin-bottom:14px"><i class="ti ti-history"></i> Histórico</h3>
    <ol class="linha-tempo">${[...c.historico].reverse().map((h) => `
      <li><span class="lt-ic"><i class="ti ${h.icone}"></i></span><span>${h.texto}<small>${diaRelativo(h.haDias)}</small></span></li>`).join("")}
    </ol>
  </div>

  ${podeRetirar ? `<div class="acoes-rodape"><span></span><button class="btn btn-texto perigo" data-acao="retirar"><i class="ti ti-arrow-back-up"></i> Retirar candidatura</button></div>` : ""}
  ${c.vinculada && !encerrada(c) ? `<div class="acoes-rodape"><span style="font-size:13px;color:var(--texto-3)">Para desistir desta vaga, use a tela de entrevistas.</span><a class="btn btn-texto" href="agenda.html?c=${c.vinculada}">Abrir entrevistas</a></div>` : ""}`;
}

function render() {
  renderMetricas();
  renderLista();
  renderDetalhe();
}

/* ---------- Ações ---------- */
function propria() { return proprias.find((c) => c.id === atualId); }
function registrar(c, icone, texto) { c.historico.push({ haDias: 0, icone, texto }); }

// Documento enviado → o ofertante confere (simulado) → inscrição concluída quando tudo estiver aprovado.
function enviarDocumento(c, i, arquivo) {
  const d = c.docs[i];
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return Radar.toast("Formato não aceito. Envie um PDF, JPG ou PNG.", "ti-alert-circle");
  if (arquivo.size > TAMANHO_MAX) return Radar.toast("O arquivo passa de 10 MB. Envie uma versão menor.", "ti-alert-circle");
  d.status = "enviado";
  d.arquivo = arquivo.name;
  d.tamanho = arquivo.size > 1024 * 1024 ? `${(arquivo.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(arquivo.size / 1024))} KB`;
  delete d.obs;
  registrar(c, "ti-upload", `Documento enviado: ${d.nome}`);
  salvar(); render();
  Radar.toast(`${d.nome} enviado. O ofertante vai conferir o arquivo.`, "ti-upload");

  setTimeout(() => {
    carregar();
    const cc = proprias.find((x) => x.id === c.id);
    const dd = cc && cc.docs[i];
    if (!dd || dd.status !== "enviado") return;
    dd.status = "aprovado";
    registrar(cc, "ti-file-check", `Documento aprovado: ${dd.nome}`);
    if (cc.etapa === 0 && cc.docs.every((x) => x.status === "aprovado")) {
      cc.etapa = 1;
      registrar(cc, "ti-circle-check", "Inscrição concluída: perfil enviado para análise");
      Radar.notificar(`Inscrição concluída em <b>${vaga(cc.vaga).titulo}</b>. Seu perfil está em análise.`, "ti-circle-check", `candidaturas.html?c=${cc.id}`);
    } else {
      Radar.toast(`${dd.nome} aprovado pelo ofertante.`, "ti-file-check");
    }
    salvar(); render();
  }, 2500);
}

function abrirTermo(c, assinando) {
  const v = vaga(c.vaga), of = ofertante(c), t = c.tce, a = t.assinaturas;
  const inicio = Radar.somarDias(Radar.hoje(), t.inicioEmDias);
  const fim = Radar.somarDias(inicio, t.vigenciaMeses * 30);
  const dias = DIAS.filter((d) => v.dias.includes(d.id)).map((d) => d.nome.toLowerCase()).join(", ");
  const ass = (nome, x) => `<div>${nome}<br>${x !== null ? `<span class="ok">✓ Assinado eletronicamente ${diaRelativo(x)}</span>` : "<span>Aguardando assinatura</span>"}</div>`;
  $("#mt-titulo").textContent = assinando ? "Revisar e assinar o termo" : "Termo de compromisso de estágio";
  $("#mt-documento").innerHTML = `
    <h4>Termo de compromisso de estágio</h4>
    <div class="sub">Estágio não obrigatório · Lei nº 11.788/2008</div>
    <p>As partes abaixo celebram este termo: <b>${of.nome}</b>, como <b>concedente</b>; <b>${esc(Radar.estudante().nome)}</b>, estudante de ${esc(Radar.estudante().curso)}, como <b>estagiário</b>; e a <b>Universidade Federal do Rio Grande do Sul</b>, como <b>instituição de ensino</b>.</p>
    <p><span class="clausula">1. Objeto.</span> Realização de estágio na atividade “${v.titulo}”: ${v.descricao.charAt(0).toLowerCase() + v.descricao.slice(1)}</p>
    <p><span class="clausula">2. Vigência.</span> De ${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}, podendo ser rescindido por qualquer das partes.</p>
    <p><span class="clausula">3. Jornada.</span> ${v.cargaHoraria} horas semanais, às ${dias}, compatíveis com o horário das aulas, respeitado o limite de 6 horas diárias.</p>
    <p><span class="clausula">4. Bolsa e benefícios.</span> Bolsa mensal de ${brl.format(v.remuneracao)} e auxílio-transporte. ${v.beneficios.join("; ")}.</p>
    <p><span class="clausula">5. Seguro.</span> A concedente mantém seguro contra acidentes pessoais em favor do estagiário: ${t.apolice}.</p>
    <p><span class="clausula">6. Acompanhamento.</span> Supervisão de ${t.supervisor} e orientação de ${t.orientador}, com relatório de atividades semestral.</p>
    <div class="assin">${ass(of.nome, a.ofertante)}${ass(esc(Radar.estudante().nome), a.estudante)}${ass("UFRGS · COMGRAD", a.universidade)}</div>`;
  $("#mt-assinar").hidden = !assinando;
  $("#mt-concordo").checked = false;
  $("#mt-erro").textContent = "";
  $("#mt-rodape").innerHTML = assinando
    ? `<button class="btn" data-fechar>Agora não</button><button class="btn btn-primario" id="mt-assinar-btn"><i class="ti ti-signature"></i> Assinar eletronicamente</button>`
    : `<button class="btn" data-acao-termo="baixar"><i class="ti ti-download"></i> Baixar PDF</button><button class="btn btn-primario" data-fechar>Fechar</button>`;
  $("#modal-termo").showModal();
}

function assinarTermo() {
  if (!$("#mt-concordo").checked) {
    $("#mt-erro").textContent = "Marque que você leu e concorda com o termo para assinar.";
    return;
  }
  const c = propria();
  c.tce.assinaturas.estudante = 0;
  registrar(c, "ti-signature", "Você assinou o termo de compromisso");
  salvar();
  $("#modal-termo").close();
  render();
  Radar.toast("Termo assinado. Agora a universidade valida o documento.", "ti-signature");
  // A COMGRAD valida e assina (simulado)
  setTimeout(() => {
    carregar();
    const cc = proprias.find((x) => x.id === c.id);
    if (!cc || cc.tce.assinaturas.universidade !== null) return;
    cc.tce.assinaturas.universidade = 0;
    cc.etapa = 5;
    registrar(cc, "ti-building-bank", "Termo validado e assinado pela universidade");
    registrar(cc, "ti-confetti", "Termo de compromisso emitido");
    if (atualId === cc.id) aba = "concluidas";
    salvar();
    Radar.notificar(`Termo de compromisso de <b>${vaga(cc.vaga).titulo}</b> emitido. Seu estágio está confirmado!`, "ti-file-certificate", `candidaturas.html?c=${cc.id}`);
    render();
  }, 3500);
}

/* ---------- Eventos simulados ---------- */
const EVENTOS = {
  avancar(c) {
    if (!c) return "Esta candidatura avança pela tela de Entrevistas.";
    if (encerrada(c)) return "Esta candidatura já foi encerrada.";
    const titulo = vaga(c.vaga).titulo;
    if (c.etapa === 0) {
      c.docs.forEach((d) => { d.status = "aprovado"; d.arquivo = d.arquivo || "documento.pdf"; delete d.obs; });
      c.etapa = 1;
      registrar(c, "ti-file-check", "Documentos aprovados");
      Radar.notificar(`Documentos aprovados em <b>${titulo}</b>. Seu perfil está em análise.`, "ti-file-check", `candidaturas.html?c=${c.id}`);
    } else if (c.etapa === 1) {
      c.etapa = 2;
      registrar(c, "ti-user-check", "Aprovado na pré-seleção");
      if (vaga(c.vaga).ofertante !== Radar.ofertanteId()) {
        criarAgendaSimulada(c);
        registrar(c, "ti-calendar-plus", "Agenda de entrevistas disponível");
      }
      Radar.notificar(`Você foi pré-selecionado em <b>${titulo}</b>!`, "ti-user-check", `candidaturas.html?c=${c.id}`);
    } else if (c.etapa === 2) {
      c.etapa = 4;
      c.situacao = "aprovada";
      c.tce = { inicioEmDias: 21, vigenciaMeses: 6, apolice: "Seguro nº 0981.2026.034", supervisor: "Coordenação da unidade", orientador: "Prof. Marcelo Antunes (INF)", assinaturas: { ofertante: 0, estudante: null, universidade: null } };
      registrar(c, "ti-trophy", "Aprovado para a vaga");
      registrar(c, "ti-signature", `Termo de compromisso assinado por ${ofertante(c).nome}`);
      Radar.notificar(`Você foi aprovado em <b>${titulo}</b>! Assine o termo de compromisso.`, "ti-trophy", `candidaturas.html?c=${c.id}`);
    } else {
      return c.etapa === 4 ? "Agora é a sua vez: assine o termo de compromisso." : "Esta candidatura já está concluída.";
    }
    return null;
  },
  "recusar-doc"(c) {
    if (!c) return "Os documentos desta candidatura já foram aprovados pela tela de Entrevistas.";
    if (encerrada(c) || c.etapa > 1) return "Só é possível recusar documentos durante a inscrição ou a análise.";
    const d = c.docs.find((x) => x.status === "aprovado" || x.status === "enviado");
    if (!d) return "Não há documentos enviados para recusar.";
    d.status = "recusado";
    d.obs = "Documento com mais de 30 dias. Envie uma versão atualizada.";
    c.etapa = 0;
    registrar(c, "ti-file-x", `${d.nome} recusado pelo ofertante`);
    Radar.notificar(`<b>${d.nome}</b> foi recusado em <b>${vaga(c.vaga).titulo}</b>. Envie novamente.`, "ti-file-alert", `candidaturas.html?c=${c.id}`);
    return null;
  },
  "nao-selecionar"(c) {
    if (!c) return "Esta candidatura avança pela tela de Entrevistas.";
    if (encerrada(c) || c.etapa > 2 || c.etapa === 0) return "Use em uma candidatura em análise ou com entrevista.";
    c.etapa = 3;
    c.situacao = "nao-selecionado";
    c.feedback = "Agradecemos o seu interesse! Nesta seleção priorizamos candidatos de semestres mais avançados. Continue de olho nas próximas oportunidades.";
    registrar(c, "ti-mood-empty", "Resultado divulgado: não selecionado");
    Radar.notificar(`Resultado de <b>${vaga(c.vaga).titulo}</b> divulgado.`, "ti-mail", `candidaturas.html?c=${c.id}`);
    return null;
  },
  reiniciar() {
    Radar.reiniciarTudo();
    carregar();
    atualId = null; aba = "andamento";
    Radar.toast("Demonstração reiniciada.", "ti-refresh");
    return null;
  },
};

/* ---------- Ligações ---------- */
$("#lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cand]");
  if (!b) return;
  atualId = b.dataset.cand;
  history.replaceState(null, "", `?c=${atualId}`);
  render();
});
document.querySelector(".abas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-aba]");
  if (!b) return;
  aba = b.dataset.aba;
  atualId = null;
  render();
});

$("#detalhe").addEventListener("click", (e) => {
  const b = e.target.closest("[data-acao]");
  if (!b) return;
  const c = todas().find((x) => x.id === atualId);
  if (b.dataset.acao === "ir-docs") { $("#bloco-docs").scrollIntoView({ behavior: "smooth", block: "center" }); $("#bloco-docs input[type=file]")?.focus(); }
  if (b.dataset.acao === "assinar") abrirTermo(c, true);
  if (b.dataset.acao === "ver-termo") abrirTermo(c, false);
  if (b.dataset.acao === "retirar") { $("#mr-motivo").value = ""; $("#modal-retirar").showModal(); }
});
$("#detalhe").addEventListener("change", (e) => {
  const input = e.target.closest("[data-upload]");
  if (!input || !input.files[0]) return;
  enviarDocumento(propria(), Number(input.dataset.upload), input.files[0]);
});

document.querySelectorAll("dialog.modal").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); }));
$("#modal-termo").addEventListener("click", (e) => {
  if (e.target.closest("#mt-assinar-btn")) assinarTermo();
  if (e.target.closest("[data-acao-termo='baixar']")) Radar.toast("Download do termo simulado no protótipo.", "ti-download");
});
$("#mt-concordo").addEventListener("change", () => ($("#mt-erro").textContent = ""));

$("#mr-confirmar").addEventListener("click", () => {
  const c = propria();
  c.situacao = "retirada";
  c.motivo = $("#mr-motivo").value.trim() ? `Motivo informado: “${$("#mr-motivo").value.trim()}”` : null;
  registrar(c, "ti-arrow-back-up", "Você retirou a candidatura");
  salvar();
  Radar.salvar("radar:candidaturas", Radar.ler("radar:candidaturas", []).filter((v) => v !== c.vaga));
  $("#modal-retirar").close();
  aba = "encerradas";
  render();
  Radar.toast("Candidatura retirada.", "ti-arrow-back-up");
});

// Simulação
$("#demo-botao").addEventListener("click", () => {
  const p = $("#demo-painel");
  p.hidden = !p.hidden;
  $("#demo-botao").setAttribute("aria-expanded", !p.hidden);
});
$("#demo-painel").addEventListener("click", (e) => {
  const b = e.target.closest("[data-evento]");
  if (!b) return;
  const erro = EVENTOS[b.dataset.evento](propria());
  if (erro) return Radar.toast(erro, "ti-info-circle");
  salvar();
  const cAtual = atualId && todas().find((x) => x.id === atualId);
  if (cAtual) aba = abaDe(cAtual);
  render();
  $("#demo-painel").hidden = true;
});
document.addEventListener("click", (e) => { if (!e.target.closest(".demo")) $("#demo-painel").hidden = true; });

// Notificação que aponta para esta página / outra aba mudou algo
window.addEventListener("radar:navegar", () => {
  atualId = new URLSearchParams(location.search).get("c");
  const c = todas().find((x) => x.id === atualId);
  if (c) aba = abaDe(c);
  render();
});
window.addEventListener("radar:sincronizar", (e) => {
  if (["radar:minhas", "radar:agenda", "radar:candidaturas", null].includes(e.detail)) { carregar(); render(); }
});

carregar();
{
  const c = atualId && todas().find((x) => x.id === atualId);
  if (c) aba = abaDe(c);
}
render();
