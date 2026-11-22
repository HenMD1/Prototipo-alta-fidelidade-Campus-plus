/* ==========================================================
   Candidatos — visão do ofertante
   Casos de uso: "Visualizar estudantes inscritos em oportunidade"
   <<extend>> "Visualizar documentos dos estudantes", e os métodos
   Ofertante.aprovarCandidatura / rejeitarCandidatura.

   Fontes dos candidatos de cada vaga:
   - em análise (fictícios):        radar:triagem
   - pré-selecionados (agenda):     radar:ofertante
   - João na vaga 1:            radar:agenda (tela de entrevistas)
   - João em outras vagas:      radar:minhas (Minhas candidaturas)
   ========================================================== */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clonar = (x) => JSON.parse(JSON.stringify(x));
const OF_ID = Radar.ofertanteId();   // TechSul na demonstração; a empresa criada no teste do zero
const EST = Radar.estudante();
const SELO_EST = Radar.ambiente === "demo" ? "conta demo" : "conta de teste";
const FASES = [
  { id: "analise", nome: "Em análise", cor: "#8a93a6", ajuda: "Confira documentos e compatibilidade" },
  { id: "preselecionado", nome: "Pré-selecionados", cor: "#2453c6", ajuda: "Na etapa de entrevista" },
  { id: "aprovado", nome: "Aprovados", cor: "#16a36a", ajuda: "Termo de compromisso em assinatura" },
  { id: "rejeitado", nome: "Não selecionados", cor: "#d33b3b", ajuda: "Receberam o seu retorno" },
];
const CORES = ["#2b8a4b", "#5b3fbf", "#c2611f", "#1d8f8f", "#b4416b", "#3a6fd8", "#7a4b2a", "#6b3fa0"];
const cor = (n) => CORES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length];
const iniciais = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const vaga = (id) => OPORTUNIDADES.find((o) => o.id === id);

let triagem, ofs, agenda, minhas;
let vagaId = Number(new URLSearchParams(location.search).get("vaga")) || 1;
let abertoChave = null;
let pendenteMotivo = null;   // ação aguardando o texto do modal

/* ---------- Estado ---------- */
function carregar() {
  triagem = Radar.ler("radar:triagem", null) || clonar(TRIAGEM_INICIAL);
  ofs = Radar.ler("radar:ofertante", null) || clonar(OFERTANTE_INICIAL);
  agenda = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
  minhas = Radar.ler("radar:minhas", null) || clonar(CANDIDATURAS_ESTUDANTE);
  // Candidaturas feitas no mural que "Minhas candidaturas" ainda não registrou
  Radar.ler("radar:candidaturas", []).forEach((vid) => {
    if (VINCULADAS_AGENDA[vid] || minhas.some((c) => c.vaga === vid && c.situacao !== "retirada")) return;
    const v = vaga(vid);
    if (!v) return;
    minhas = minhas.filter((c) => c.vaga !== vid);
    minhas.unshift({ id: `m-${vid}`, vaga: vid, etapa: 0, situacao: "andamento", enviadaHaDias: 0,
      docs: v.documentos.map((nome) => ({ nome, status: "pendente" })), historico: [{ haDias: 0, icone: "ti-send", texto: "Inscrição iniciada pelo mural" }] });
  });
}
function salvar() {
  Radar.salvar("radar:triagem", triagem);
  Radar.salvar("radar:ofertante", ofs);
  Radar.salvar("radar:agenda", agenda);
  Radar.salvar("radar:minhas", minhas);
}

function perfilEstudante() {
  const p = Radar.ler("radar:perfil-estudante", null);
  return { curso: p?.curso || EST.curso || "Ciência da Computação", semestre: p?.semestre || EST.semestre || 5, horas: p?.horas || 20, dias: p?.dias || ["seg", "ter", "qua", "qui", "sex"] };
}

// Horários da agenda de uma vaga: ficam na candidatura do estudante real, se houver, ou no registro da vaga.
function horariosDaVaga(vid) {
  return agenda.find((x) => x.oportunidade === vid)?.horarios || ofs.vagas[vid]?.horarios || [];
}
function textoEntrevista(h) {
  return h ? `${Radar.fmtDia(Radar.somarDias(Radar.proximaSegunda(), h.d))}, ${h.ini}` : null;
}

/* ---------- Lista única de candidatos de uma vaga ---------- */
function candidatos(vid) {
  const v = vaga(vid);
  const lista = [];
  const docsOk = () => v.documentos.map((nome) => ({ nome, status: "aprovado", arquivo: `${nome.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").trim().replace(/ /g, "_")}.pdf` }));

  (triagem.inscritos[vid] || []).forEach((k) => lista.push({
    chave: `t-${k.id}`, origem: "triagem", ref: k, nome: k.nome, curso: k.curso, semestre: k.semestre,
    horas: k.horas, dias: k.dias, docs: k.docs, fase: k.fase, motivo: k.motivo, enviadaHaDias: k.enviadaHaDias,
  }));

  (ofs.vagas[vid]?.candidatos || []).forEach((k) => {
    if (k.id === ID_ESTUDANTE) {
      const c = agenda.find((x) => x.oportunidade === vid);
      if (!c || minhas.some((m) => m.vaga === vid && m.situacao !== "retirada")) return;
      const p = perfilEstudante();
      const h = c.horarios.find((x) => x.id === c.entrevista);
      lista.push({
        chave: "est-agenda", origem: "est-agenda", ref: c, nome: EST.nome, demo: true, ...p, docs: docsOk(),
        fase: ["desistiu", "cancelada"].includes(c.status) ? "rejeitado" : "preselecionado",
        statusAgenda: c.status, entrevista: h ? `${Radar.fmtDia(Radar.somarDias(Radar.proximaSegunda(), h.d))}, ${h.ini}` : null,
        motivo: c.status === "desistiu" ? "O candidato desistiu da vaga." : c.status === "cancelada" ? "Não escolheu horário até o prazo." : null,
        conversa: `${vid}-estudante`,
      });
      return;
    }
    const dec = triagem.decisoes[`${vid}-${k.id}`];
    const [curso, sem] = k.curso.split(" · ");
    const h = horariosDaVaga(vid).find((x) => x.id === k.slot);
    lista.push({
      chave: `p-${k.id}`, origem: "pre", ref: k, nome: k.nome, curso, semestre: parseInt(sem, 10) || null,
      horas: v.cargaHoraria, dias: v.dias, docs: docsOk(), fase: dec?.fase || "preselecionado", motivo: dec?.motivo,
      statusAgenda: k.status, entrevista: h ? `${Radar.fmtDia(Radar.somarDias(Radar.proximaSegunda(), h.d))}, ${h.ini}` : null,
      conversa: `${vid}-${k.id}`,
    });
  });

  minhas.filter((c) => c.vaga === vid && !VINCULADAS_AGENDA[vid] && c.situacao !== "retirada").forEach((c) => {
    const ag = agenda.find((x) => x.oportunidade === vid);
    let fase = c.situacao === "nao-selecionado" ? "rejeitado" : c.etapa >= 4 ? "aprovado" : c.etapa === 2 ? "preselecionado" : "analise";
    if (ag && c.etapa === 2 && ["desistiu", "cancelada"].includes(ag.status)) fase = "rejeitado";
    lista.push({
      chave: "est-minhas", origem: "est-minhas", ref: c, nome: EST.nome, demo: true, ...perfilEstudante(),
      docs: c.docs, fase, motivo: c.feedback || (ag?.status === "desistiu" ? "O candidato desistiu da vaga." : ag?.status === "cancelada" ? "Não escolheu horário até o prazo." : null),
      enviadaHaDias: c.enviadaHaDias, tce: c.tce,
      statusAgenda: ag?.status, entrevista: ag ? textoEntrevista(ag.horarios.find((x) => x.id === ag.entrevista)) : null,
      conversa: ag ? `${vid}-estudante` : null,
    });
  });
  return lista;
}

/* ---------- Compatibilidade com a vaga ---------- */
function compat(k, v) {
  const faltamDias = v.dias.filter((d) => !k.dias.includes(d));
  return {
    carga: k.horas >= v.cargaHoraria,
    dias: faltamDias.length === 0,
    faltamDias: DIAS.filter((d) => faltamDias.includes(d.id)).map((d) => d.nome),
  };
}

function resumoDocs(docs) {
  const n = (s) => docs.filter((d) => d.status === s).length;
  if (n("recusado")) return ["perigo", `${n("recusado")} recusado`];
  if (n("pendente")) return ["alerta", `${n("pendente")} pendente${n("pendente") > 1 ? "s" : ""}`];
  if (n("enviado")) return ["info", `${n("enviado")} para conferir`];
  return ["sucesso", "Documentos ok"];
}

/* ---------- Renderização ---------- */
function minhasVagasDoOfertante() {
  return OPORTUNIDADES.filter((o) => o.ofertante === OF_ID && o.status !== "rascunho");
}

function renderVagas() {
  const vagas = minhasVagasDoOfertante();
  if (!vagas.some((v) => v.id === vagaId)) vagaId = vagas[0]?.id;
  $("#vagas-sel").innerHTML = vagas.map((v) => {
    const n = candidatos(v.id).filter((k) => k.fase === "analise").length;
    return `<button role="tab" data-vaga="${v.id}" aria-selected="${v.id === vagaId}">${esc(v.titulo)}${v.status === "encerrada" ? " (encerrada)" : ""}${n ? `<span class="qtd" title="Em análise">${n}</span>` : ""}</button>`;
  }).join("");
}

function card(k, v) {
  const c = compat(k, v);
  const [tdoc, rdoc] = resumoDocs(k.docs);
  const tags = [];
  if (k.fase === "analise") {
    tags.push(`<span class="etiqueta ${tdoc}">${rdoc}</span>`);
    tags.push(c.carga && c.dias ? '<span class="etiqueta sucesso"><i class="ti ti-check"></i>Compatível</span>' : `<span class="etiqueta alerta"><i class="ti ti-alert-triangle"></i>${!c.dias ? "Conflito de dias" : "Carga menor"}</span>`);
  }
  if (k.fase === "preselecionado") {
    tags.push(k.entrevista ? `<span class="etiqueta sucesso"><i class="ti ti-calendar-check"></i>${k.entrevista}</span>`
      : k.origem === "est-minhas" ? '<span class="etiqueta info">Combinar entrevista</span>'
      : `<span class="etiqueta neutra">${k.statusAgenda === "aguardando" ? "Aguardando agenda" : "Sem horário"}</span>`);
  }
  if (k.fase === "aprovado") tags.push(k.tce?.assinaturas?.estudante !== null && k.tce ? '<span class="etiqueta sucesso">Termo assinado</span>' : '<span class="etiqueta info"><i class="ti ti-signature"></i>Termo em assinatura</span>');
  if (k.fase === "rejeitado") tags.push(`<span class="etiqueta neutra">${k.statusAgenda === "desistiu" ? "Desistiu" : k.statusAgenda === "cancelada" ? "Prazo expirou" : "Retorno enviado"}</span>`);
  return `
    <button class="card-cand" data-chave="${k.chave}">
      <span class="card-topo">
        <span class="av-c" style="background:${k.demo ? "#1d7a5a" : cor(k.nome)}">${iniciais(k.nome)}</span>
        <span><span class="card-nome">${esc(k.nome)}${k.demo ? `<span class="selo-demo">${SELO_EST}</span>` : ""}</span><span class="card-curso" style="display:block">${esc(k.curso)}${k.semestre ? ` · ${k.semestre}º sem.` : ""}</span></span>
      </span>
      <span class="card-tags">${tags.join("")}</span>
    </button>`;
}

function renderQuadro() {
  const v = vaga(vagaId);
  if (!v) {
    $("#quadro").innerHTML = `<div class="coluna" style="grid-column:1/-1;align-items:center;justify-content:center;text-align:center;padding:40px 16px">
      <i class="ti ti-briefcase" style="font-size:40px;color:var(--cor-primaria)"></i>
      <strong style="font-size:17px">Nenhuma vaga ainda</strong>
      <p style="color:var(--texto-2);max-width:420px">Cadastre uma vaga: as candidaturas dos estudantes aparecem aqui para você conferir documentos e pré-selecionar.</p>
      <a class="btn btn-primario" href="vagas.html?nova"><i class="ti ti-plus"></i> Cadastrar vaga</a></div>`;
    $("#simular-inscritos").hidden = true;
    return;
  }
  $("#simular-inscritos").hidden = v.status !== "aberta";
  const termo = $("#busca").value.trim().toLowerCase();
  const todos = candidatos(vagaId).filter((k) => !termo || `${k.nome} ${k.curso}`.toLowerCase().includes(termo));
  $("#quadro").innerHTML = FASES.map((f) => {
    const daFase = todos.filter((k) => k.fase === f.id);
    return `
    <section class="coluna" aria-label="${f.nome}">
      <div class="coluna-cab"><span class="ponto" style="background:${f.cor}"></span>${f.nome}<span class="n">${daFase.length}</span></div>
      <p class="coluna-ajuda">${f.ajuda}</p>
      ${daFase.length ? daFase.map((k) => card(k, v)).join("") : `<div class="coluna-vazia">${termo ? "Ninguém encontrado" : "Nenhum candidato"}</div>`}
    </section>`;
  }).join("");
}

/* ---------- Ficha ---------- */
function atual() { return candidatos(vagaId).find((k) => k.chave === abertoChave); }

function renderFicha() {
  const k = atual();
  if (!k) return fecharFicha();
  const v = vaga(vagaId), c = compat(k, v);
  const situacao = {
    analise: ["info", "ti-eye", "Inscrição em análise. Confira os documentos e decida se o candidato segue para a entrevista."],
    preselecionado: k.origem === "est-agenda"
      ? ["info", "ti-calendar", `Pré-selecionado. ${k.entrevista ? `Entrevista: ${k.entrevista}.` : "Ainda não escolheu horário."} O resultado desta vaga fica fora do protótipo: para demonstrar a aprovação, candidate-se pelo mural ao Estágio em DevOps.`]
      : ["info", "ti-calendar", `Pré-selecionado para entrevista. ${k.entrevista ? `Entrevista marcada: ${k.entrevista}.` : "Ainda sem horário marcado."}`],
    aprovado: ["sucesso", "ti-trophy", "Aprovado. O termo de compromisso foi gerado e enviado para assinatura do estudante e da universidade."],
    rejeitado: ["neutro", "ti-mail", k.motivo ? `Retorno enviado: “${esc(k.motivo)}”` : "Candidatura encerrada."],
  }[k.fase];
  const ICONE = { pendente: "ti-file-dots", enviado: "ti-file-search", aprovado: "ti-file-check", recusado: "ti-file-x" };
  const ROT = { pendente: ["neutra", "Aguardando envio"], enviado: ["info", "Para conferir"], aprovado: ["sucesso", "Aprovado"], recusado: ["perigo", "Recusado"] };
  const podeConferir = k.fase === "analise" && k.origem !== "est-agenda";

  $("#ficha").innerHTML = `
    <div class="ficha-cab">
      <span class="av-c" style="background:${k.demo ? "#1d7a5a" : cor(k.nome)}">${iniciais(k.nome)}</span>
      <div class="info"><strong>${esc(k.nome)}</strong><small>${esc(k.curso)}${k.semestre ? ` · ${k.semestre}º semestre` : ""}${k.enviadaHaDias !== undefined ? ` · inscrição ${k.enviadaHaDias === 0 ? "hoje" : `há ${k.enviadaHaDias} ${k.enviadaHaDias === 1 ? "dia" : "dias"}`}` : ""}</small></div>
      <button class="btn btn-texto btn-icone" data-acao="fechar" aria-label="Fechar ficha"><i class="ti ti-x" style="font-size:20px"></i></button>
    </div>
    <div class="ficha-corpo">
      <div class="situacao-box ${situacao[0]}"><i class="ti ${situacao[1]}"></i><span>${situacao[2]}</span></div>

      <section>
        <h3><i class="ti ti-adjustments-check"></i> Compatibilidade com a vaga</h3>
        <div class="compat">
          <div class="${c.carga ? "ok" : "nao"}"><i class="ti ${c.carga ? "ti-circle-check" : "ti-alert-triangle"}"></i><span>Disponível ${k.horas}h por semana<small>A vaga pede ${v.cargaHoraria}h semanais</small></span></div>
          <div class="${c.dias ? "ok" : "nao"}"><i class="ti ${c.dias ? "ti-circle-check" : "ti-alert-triangle"}"></i><span>${c.dias ? "Disponível em todos os dias da vaga" : `Indisponível: ${c.faltamDias.join(", ")}`}<small>Dias da vaga: ${DIAS.filter((d) => v.dias.includes(d.id)).map((d) => d.nome).join(", ")}</small></span></div>
        </div>
      </section>

      <section>
        <h3><i class="ti ti-folder"></i> Documentos</h3>
        <div class="docs-c">${k.docs.map((d, i) => `
          <div class="doc-c">
            <i class="ti ${ICONE[d.status]}"></i>
            <div class="nome">${esc(d.nome)}<small>${d.arquivo ? esc(d.arquivo) : "Ainda não enviado"}</small>${d.obs ? `<small class="obs">${esc(d.obs)}</small>` : ""}</div>
            <span class="etiqueta ${ROT[d.status][0]}">${ROT[d.status][1]}</span>
            <div class="acoes">
              ${d.arquivo && d.status !== "pendente" ? `<button class="btn btn-texto" data-ver-doc="${i}" title="Visualizar" aria-label="Visualizar ${esc(d.nome)}"><i class="ti ti-eye"></i></button><button class="btn btn-texto" data-baixar-doc="${i}" title="Baixar" aria-label="Baixar ${esc(d.nome)}"><i class="ti ti-download"></i></button>` : ""}
              ${podeConferir && d.status === "enviado" ? `<button class="btn btn-texto" data-aprovar-doc="${i}" title="Aprovar documento" style="color:var(--sucesso-tx)"><i class="ti ti-check"></i></button><button class="btn btn-texto" data-recusar-doc="${i}" title="Recusar documento" style="color:var(--perigo)"><i class="ti ti-x"></i></button>` : ""}
            </div>
          </div>`).join("")}
        </div>
      </section>
    </div>
    <div class="ficha-rodape">
      ${k.conversa ? `<a class="btn" href="mensagens.html?perfil=ofertante&conversa=${k.conversa}"><i class="ti ti-message-circle"></i> Mensagem</a>` : ""}
      ${k.fase === "preselecionado" && (k.origem !== "est-minhas" || k.statusAgenda) ? `<a class="btn" href="agenda-ofertante.html?vaga=${vagaId}"><i class="ti ti-calendar-cog"></i> Agenda</a>` : ""}
      <div class="dir">
        ${k.fase === "analise" ? '<button class="btn btn-texto perigo" style="color:var(--perigo)" data-acao="rejeitar">Não selecionar</button><button class="btn btn-primario" data-acao="preselecionar"><i class="ti ti-user-check"></i> Pré-selecionar</button>' : ""}
        ${k.fase === "preselecionado" && k.origem !== "est-agenda" ? '<button class="btn btn-texto perigo" style="color:var(--perigo)" data-acao="rejeitar">Não selecionar</button><button class="btn btn-primario" data-acao="aprovar"><i class="ti ti-trophy"></i> Aprovar</button>' : ""}
      </div>
    </div>`;
}

function abrirFicha(chave) {
  abertoChave = chave;
  renderFicha();
  $("#ficha").classList.add("aberta");
  $("#ficha").setAttribute("aria-hidden", "false");
  $("#fundo-ficha").hidden = false;
  $("#ficha .btn")?.focus();
}
function fecharFicha() {
  abertoChave = null;
  $("#ficha").classList.remove("aberta");
  $("#ficha").setAttribute("aria-hidden", "true");
  $("#fundo-ficha").hidden = true;
}

function render() {
  renderVagas();
  renderQuadro();
  if (abertoChave) renderFicha();
}

/* ---------- Documento simulado ---------- */
function verDocumento(i) {
  const k = atual(), d = k.docs[i], v = vaga(vagaId);
  let corpo;
  if (/hist/i.test(d.nome)) {
    corpo = `<h4>Histórico escolar</h4><p><b>${esc(k.nome)}</b> · ${esc(k.curso)} · ${k.semestre || "—"}º semestre</p>
      <table><tr><th>Código</th><th>Disciplina</th><th>Conceito</th></tr>${DISCIPLINAS_HISTORICO.slice(0, Math.max(3, Math.min(6, (k.semestre || 3) + 1))).map(([cod, nome, conc]) => `<tr><td>${cod}</td><td>${nome}</td><td>${conc}</td></tr>`).join("")}</table>`;
  } else if (/atestado/i.test(d.nome)) {
    corpo = `<h4>Atestado de matrícula</h4><p>Atestamos que <b>${esc(k.nome)}</b> está regularmente matriculado(a) no curso de <b>${esc(k.curso)}</b> desta universidade no período letivo 2026/2.</p><p>Documento emitido eletronicamente pelo portal do aluno.</p>`;
  } else if (/curr/i.test(d.nome)) {
    corpo = `<h4>${esc(k.nome)}</h4><div class="sec">Formação</div><p>${esc(k.curso)} — UFRGS (${k.semestre || "—"}º semestre)</p>
      <div class="sec">Experiência</div><p>Monitoria acadêmica e projetos de disciplina em equipe.</p>
      <div class="sec">Habilidades</div><p>${v.area === "Dados" ? "Python, SQL, estatística" : "JavaScript, Git, Linux, Python"}; inglês intermediário.</p>`;
  } else {
    corpo = `<h4>${esc(d.nome)}</h4><p>Arquivo enviado pelo candidato: <b>${esc(d.arquivo)}</b>.</p>`;
  }
  $("#md-titulo").textContent = `${d.nome} · ${k.nome}`;
  $("#md-folha").innerHTML = `<div class="marca-doc">Documento simulado pelo protótipo</div>${corpo}`;
  const conferir = k.fase === "analise" && d.status === "enviado" && k.origem !== "est-agenda";
  $("#md-rodape").innerHTML = conferir
    ? `<button class="btn" data-baixar-doc="${i}" style="margin-right:auto"><i class="ti ti-download"></i> Baixar</button><button class="btn" data-fechar>Fechar</button><button class="btn btn-perigo" data-recusar-doc="${i}">Recusar</button><button class="btn btn-primario" data-aprovar-doc="${i}"><i class="ti ti-check"></i> Aprovar documento</button>`
    : `<button class="btn" data-baixar-doc="${i}" style="margin-right:auto"><i class="ti ti-download"></i> Baixar</button><button class="btn btn-primario" data-fechar>Fechar</button>`;
  $("#modal-doc").showModal();
}

function baixarDocumento(i) {
  const k = atual(), d = k.docs[i];
  if (!d || !d.arquivo) return;
  Radar.toast(`Download de “${esc(d.arquivo)}” simulado no protótipo.`, "ti-download");
}

/* ---------- Ações sobre o candidato ---------- */
function registrarEstudante(c, icone, texto) { c.historico.push({ haDias: 0, icone, texto }); }

function aprovarDoc(i) {
  const k = atual(), d = k.docs[i];
  d.status = "aprovado"; delete d.obs;
  if (k.origem === "est-minhas") {
    const c = k.ref;
    registrarEstudante(c, "ti-file-check", `Documento aprovado: ${d.nome}`);
    if (c.etapa === 0 && c.docs.every((x) => x.status === "aprovado")) {
      c.etapa = 1;
      registrarEstudante(c, "ti-circle-check", "Inscrição concluída: perfil enviado para análise");
    }
    Radar.notificar(`<b>${d.nome}</b> aprovado em <b>${esc(vaga(vagaId).titulo)}</b>.`, "ti-file-check", `candidaturas.html?c=${c.id}`, "estudante");
  }
  salvar(); render();
  Radar.toast(`${d.nome} aprovado.`, "ti-file-check");
}

function recusarDoc(i, motivo) {
  const k = atual(), d = k.docs[i];
  d.status = "recusado"; d.obs = motivo;
  if (k.origem === "est-minhas") {
    const c = k.ref;
    c.etapa = 0;
    registrarEstudante(c, "ti-file-x", `${d.nome} recusado pelo ofertante`);
    Radar.notificar(`<b>${d.nome}</b> foi recusado em <b>${esc(vaga(vagaId).titulo)}</b>: ${esc(motivo)}`, "ti-file-alert", `candidaturas.html?c=${c.id}`, "estudante");
  }
  salvar(); render();
  Radar.toast(`${d.nome} recusado. Aviso enviado para reenviar o arquivo.`, "ti-file-x");
}

function preselecionar() {
  const k = atual(), v = vaga(vagaId);
  if (!k.docs.every((d) => d.status === "aprovado")) {
    Radar.toast("Aprove todos os documentos antes de pré-selecionar.", "ti-alert-circle");
    return;
  }
  if (k.origem === "est-minhas") {
    const c = k.ref;
    c.etapa = 2;
    registrarEstudante(c, "ti-user-check", "Aprovado na pré-seleção");
    const ov = garantirVagaAgenda(ofs, vagaId);
    let agId = agenda.find((x) => x.oportunidade === vagaId)?.id;
    if (!agId) {
      // A agenda da vaga passa a ficar na candidatura do estudante (como na vaga 1 da demonstração)
      agId = Math.max(0, ...agenda.map((x) => x.id)) + 1;
      const publicada = ov.publicada && (ov.horarios || []).length > 0;
      agenda.push({
        id: agId, oportunidade: vagaId, status: publicada ? "escolher" : "aguardando", prazoEscolhaDias: ov.prazoEscolhaDias || 5,
        formato: ov.formato, duracao: ov.duracao || 30, entrevistador: Radar.conta("ofertante")?.responsavel || "Mariana Souza, tech lead",
        horarios: ov.horarios || [], entrevista: null, avisos: [], mensagens: [], ofertanteLeu: true,
      });
      delete ov.horarios;
      if (!ov.candidatos.some((x) => x.id === ID_ESTUDANTE)) ov.candidatos.unshift({ id: ID_ESTUDANTE, nome: EST.nome, curso: `${EST.curso} · ${EST.semestre}º semestre` });
    }
    const agPub = agenda.find((x) => x.id === agId).status !== "aguardando";
    Radar.notificar(`Você foi pré-selecionado em <b>${esc(v.titulo)}</b>! ${agPub ? "Escolha um horário de entrevista." : `${esc(OFERTANTES[OF_ID].nome)} vai divulgar os horários de entrevista.`}`, "ti-user-check", agPub ? `agenda.html?c=${agId}` : `candidaturas.html?c=${c.id}`, "estudante");
  } else {
    // Entra na agenda de entrevistas da vaga
    const ov = garantirVagaAgenda(ofs, vagaId);
    triagem.inscritos[vagaId] = (triagem.inscritos[vagaId] || []).filter((x) => x !== k.ref);
    const agEst = agenda.find((x) => x.oportunidade === vagaId);
    const agendaPublicada = agEst ? agEst.status !== "aguardando" || agEst.horarios.length > 0 : ov.publicada;
    ov.candidatos.push({ id: k.ref.id, nome: k.nome, curso: `${k.curso} · ${k.semestre}º semestre`, status: agendaPublicada ? "escolher" : "aguardando", mensagens: [] });
    abertoChave = `p-${k.ref.id}`;
  }
  salvar(); render();
  Radar.toast(`Pré-seleção registrada: ${k.nome} entrou na agenda de entrevistas.`, "ti-user-check");
}

function aprovar() {
  const k = atual(), v = vaga(vagaId);
  if (k.origem === "est-minhas") {
    const c = k.ref;
    c.etapa = 4; c.situacao = "aprovada";
    c.tce = { inicioEmDias: 21, vigenciaMeses: 6, apolice: "Seguro nº 0981.2026.034", supervisor: Radar.conta("ofertante") ? `${Radar.conta("ofertante").responsavel}, ${OFERTANTES[OF_ID].nome}` : "Mariana Souza, tech lead", orientador: "Prof. Marcelo Antunes (INF)", assinaturas: { ofertante: 0, estudante: null, universidade: null } };
    registrarEstudante(c, "ti-trophy", "Aprovado para a vaga");
    registrarEstudante(c, "ti-signature", `Termo de compromisso assinado por ${OFERTANTES[OF_ID].nome}`);
    Radar.notificar(`Você foi aprovado em <b>${esc(v.titulo)}</b>! Assine o termo de compromisso.`, "ti-trophy", `candidaturas.html?c=${c.id}`, "estudante");
  } else if (k.origem === "pre") {
    triagem.decisoes[`${vagaId}-${k.ref.id}`] = { fase: "aprovado" };
  } else {
    k.ref.fase = "aprovado";
  }
  salvar(); render();
  Radar.toast(`Aprovação registrada para ${k.nome}. O termo de compromisso foi enviado para assinatura.`, "ti-trophy");
}

function rejeitar(motivo) {
  const k = atual(), v = vaga(vagaId);
  if (k.origem === "est-minhas") {
    const c = k.ref;
    c.etapa = 3; c.situacao = "nao-selecionado"; c.feedback = motivo;
    registrarEstudante(c, "ti-mood-empty", "Resultado divulgado: não selecionado");
    Radar.notificar(`Resultado de <b>${esc(v.titulo)}</b> divulgado.`, "ti-mail", `candidaturas.html?c=${c.id}`, "estudante");
  } else if (k.origem === "pre") {
    triagem.decisoes[`${vagaId}-${k.ref.id}`] = { fase: "rejeitado", motivo };
  } else {
    k.ref.fase = "rejeitado"; k.ref.motivo = motivo;
  }
  salvar(); render();
  Radar.toast(`Retorno enviado a ${k.nome}.`, "ti-mail");
}

/* ---------- Modal de motivo (recusar documento / não selecionar) ---------- */
function pedirMotivo(tipo, i) {
  const k = atual();
  pendenteMotivo = { tipo, i };
  const doc = tipo === "doc";
  $("#mm-titulo").textContent = doc ? `Recusar ${k.docs[i].nome}?` : `Não selecionar ${k.nome}?`;
  $("#mm-texto").textContent = doc ? "O candidato recebe o motivo e pode enviar o arquivo de novo." : "A candidatura é encerrada e o candidato recebe o seu retorno. Um retorno respeitoso e específico ajuda o estudante nas próximas seleções.";
  $("#mm-rotulo").textContent = doc ? "Motivo da recusa" : "Retorno ao candidato";
  $("#mm-motivo").placeholder = doc ? "O arquivo está ilegível. Envie o documento emitido pelo portal do aluno." : "Agradecemos o interesse! Nesta seleção priorizamos candidatos com disponibilidade às sextas.";
  $("#mm-motivo").value = "";
  $("#mm-erro").textContent = "";
  $("#mm-confirmar").innerHTML = doc ? '<i class="ti ti-file-x"></i> Recusar documento' : '<i class="ti ti-send"></i> Enviar retorno';
  $("#modal-doc").open && $("#modal-doc").close();
  $("#modal-motivo").showModal();
  setTimeout(() => $("#mm-motivo").focus(), 50);
}

$("#mm-confirmar").addEventListener("click", () => {
  const texto = $("#mm-motivo").value.trim();
  if (texto.length < 10) { $("#mm-erro").textContent = "Escreva pelo menos uma frase explicando ao candidato."; $("#mm-motivo").focus(); return; }
  $("#modal-motivo").close();
  if (pendenteMotivo.tipo === "doc") recusarDoc(pendenteMotivo.i, texto); else rejeitar(texto);
});
$("#mm-motivo").addEventListener("input", () => ($("#mm-erro").textContent = ""));

/* ---------- Eventos ---------- */
$("#vagas-sel").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vaga]");
  if (!b) return;
  vagaId = Number(b.dataset.vaga);
  history.replaceState(null, "", `?vaga=${vagaId}`);
  fecharFicha();
  render();
});
$("#busca").addEventListener("input", renderQuadro);
// Gera inscritos fictícios na vaga aberta (útil para testar do zero)
$("#simular-inscritos").addEventListener("click", () => {
  const v = vaga(vagaId);
  const lista = triagem.inscritos[vagaId] || (triagem.inscritos[vagaId] = []);
  const todosNomes = candidatos(vagaId).map((k) => ({ nome: k.nome }));
  const novos = gerarInscritos(v, 3, todosNomes);
  if (!novos.length) return Radar.toast("Todos os candidatos fictícios já se inscreveram nesta vaga.", "ti-info-circle");
  lista.push(...novos);
  salvar(); render();
  Radar.toast(`${novos.length} inscrições simuladas chegaram em “${v.titulo}”.`, "ti-users-plus");
});
$("#quadro").addEventListener("click", (e) => {
  const b = e.target.closest("[data-chave]");
  if (b) abrirFicha(b.dataset.chave);
});
$("#fundo-ficha").addEventListener("click", fecharFicha);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && abertoChave && !document.querySelector("dialog[open]")) fecharFicha(); });

document.addEventListener("click", (e) => {
  if (!abertoChave) return;
  const ver = e.target.closest("[data-ver-doc]");
  if (ver) return verDocumento(Number(ver.dataset.verDoc));
  const baixar = e.target.closest("[data-baixar-doc]");
  if (baixar) return baixarDocumento(Number(baixar.dataset.baixarDoc));
  if (ver) return verDocumento(Number(ver.dataset.verDoc));
  const ap = e.target.closest("[data-aprovar-doc]");
  if (ap) { $("#modal-doc").open && $("#modal-doc").close(); return aprovarDoc(Number(ap.dataset.aprovarDoc)); }
  const rc = e.target.closest("[data-recusar-doc]");
  if (rc) return pedirMotivo("doc", Number(rc.dataset.recusarDoc));
  const a = e.target.closest("#ficha [data-acao]");
  if (!a) return;
  if (a.dataset.acao === "fechar") fecharFicha();
  if (a.dataset.acao === "preselecionar") preselecionar();
  if (a.dataset.acao === "aprovar") aprovar();
  if (a.dataset.acao === "rejeitar") pedirMotivo("candidato");
});
document.querySelectorAll("dialog.modal").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); }));

window.addEventListener("radar:sincronizar", (e) => {
  if (["radar:triagem", "radar:ofertante", "radar:agenda", "radar:minhas", "radar:candidaturas", "radar:vagas", null].includes(e.detail)) { carregar(); render(); }
});

carregar();
render();
