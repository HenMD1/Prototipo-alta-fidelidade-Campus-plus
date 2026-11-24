/* ==========================================================
   Mensagens — caixa de entrada (classe Mensagem do diagrama)
   Casos de uso: "Enviar mensagem ao ofertante" (estudante) e
   "Enviar mensagem para estudante/grupo" (ofertante).

   As conversas usam os mesmos dados das outras telas:
   - estudante ↔ ofertante das entrevistas: radar:agenda
   - ofertante ↔ candidatos fictícios:      radar:ofertante
   - outras conversas do estudante:         radar:conversas
   ========================================================== */

const $ = (s) => document.querySelector(s);
const PERFIL = Radar.perfil;                 // "estudante" ou "ofertante"
const ESTUDANTE = Radar.estudante().nome;
const OF_ID = Radar.ofertanteId();
const TIPOS_ANEXO = ["application/pdf", "image/jpeg", "image/png"];
const clonar = (x) => JSON.parse(JSON.stringify(x));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CONVERSAS_INICIAIS = [
  {
    id: "agro", ofertante: "agrodata", vaga: 14, lida: false,
    mensagens: [
      { de: "ofertante", texto: "Parabéns pela aprovação, João! Assim que o termo de compromisso for assinado, enviamos o acesso aos sistemas e o plano de atividades.", quando: "há 1 hora" },
    ],
  },
  {
    id: "ic", ofertante: "inf", vaga: 8, lida: true,
    mensagens: [
      { de: "eu", texto: "Professor, a carta de motivação pode ter mais de uma página?", quando: "ontem" },
      { de: "ofertante", texto: "Pode, mas tente ser objetivo: uma página costuma bastar.", quando: "ontem" },
    ],
  },
];

const RESPOSTAS_AUTOMATICAS = {
  estudante: [
    "Recebemos sua mensagem. Respondemos em breve!",
    "Obrigado pelo contato! Vamos verificar e retornamos ainda hoje.",
  ],
  ofertante: [
    "Obrigado pelo aviso! Vou conferir.",
    "Combinado, obrigado pelo retorno.",
    "Perfeito, fico no aguardo.",
  ],
};

if (Radar.ambiente === "zero") CONVERSAS_INICIAIS.length = 0;

let agenda, ofs, extras;
let atualId = new URLSearchParams(location.search).get("conversa");
let filtro = "todas";
const rascunhos = {};          // texto em digitação por conversa
const digitando = new Set();   // conversas com resposta simulada a caminho

function carregar() {
  agenda = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
  ofs = Radar.ler("radar:ofertante", null) || clonar(OFERTANTE_INICIAL);
  extras = Radar.ler("radar:conversas", null) || clonar(CONVERSAS_INICIAIS);
}
function salvar() {
  Radar.salvar("radar:agenda", agenda);
  Radar.salvar("radar:ofertante", ofs);
  Radar.salvar("radar:conversas", extras);
}

const vaga = (id) => OPORTUNIDADES.find((o) => o.id === id);
const sigla = (of) => of.sigla || of.nome.split(" ").filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const iniciais = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const CORES_PESSOAS = ["#2b8a4b", "#5b3fbf", "#c2611f", "#1d8f8f", "#b4416b", "#3a6fd8", "#7a4b2a", "#6b3fa0"];
const corPessoa = (n) => CORES_PESSOAS[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_PESSOAS.length];

/* ==========================================================
   Conversas como uma lista única, independente da origem
   ========================================================== */
function contextoAgenda(c) {
  const h = c.horarios.find((x) => x.id === c.entrevista);
  return {
    escolher: "Pré-selecionado · ainda não escolheu horário de entrevista",
    aguardando: "Pré-selecionado · aguardando horários de entrevista",
    marcada: h ? `Entrevista marcada: ${Radar.fmtDia(Radar.somarDias(Radar.proximaSegunda(), h.d))} às ${h.ini}` : "Entrevista marcada",
    cancelada: "Candidatura cancelada",
    desistiu: "Desistiu da vaga",
  }[c.status];
}

function conversas() {
  const lista = [];
  if (PERFIL === "estudante") {
    agenda.forEach((c) => {
      const v = vaga(c.oportunidade), of = OFERTANTES[v.ofertante];
      const ult = c.mensagens[c.mensagens.length - 1];
      lista.push({
        id: `ag-${c.id}`, nome: of.nome, sub: v.titulo, cor: of.cor, avatar: sigla(of), quadrado: true,
        msgs: c.mensagens.map((m) => ({ ...m, eu: m.de === "eu" })),
        naoLida: !!ult && ult.de === "ofertante" && !c.conversaLida,
        contexto: contextoAgenda(c), link: { href: `agenda.html?c=${c.id}`, rotulo: "Ver entrevista" },
        ref: { tipo: "agenda", obj: c, ofertante: v.ofertante },
      });
    });
    extras.forEach((x) => {
      const v = vaga(x.vaga), of = OFERTANTES[x.ofertante];
      const ult = x.mensagens[x.mensagens.length - 1];
      lista.push({
        id: `ex-${x.id}`, nome: of.nome, sub: v.titulo, cor: of.cor, avatar: sigla(of), quadrado: true,
        msgs: x.mensagens.map((m) => ({ ...m, eu: m.de === "eu" })),
        naoLida: !!ult && ult.de === "ofertante" && !x.lida,
        contexto: x.vaga === 14 ? "Aprovado · termo de compromisso aguardando sua assinatura" : "Inscrição em andamento",
        link: { href: `candidaturas.html?c=${x.vaga === 14 ? "c-agro" : "c-ic"}`, rotulo: "Ver candidatura" },
        ref: { tipo: "extra", obj: x, ofertante: x.ofertante },
      });
    });
  } else {
    Object.entries(ofs.vagas).forEach(([vid, dados]) => {
      const v = vaga(Number(vid));
      if (!v || v.ofertante !== OF_ID) return;
      // Estudante real (conta da demonstração ou conta de teste) pré-selecionado nesta vaga
      const est = dados.candidatos.some((k) => k.id === ID_ESTUDANTE) && agenda.find((c) => c.oportunidade === Number(vid));
      if (est) {
        const ultEst = est.mensagens[est.mensagens.length - 1];
        lista.push({
          id: `${vid}-estudante`, nome: ESTUDANTE, sub: v.titulo, cor: "#1d7a5a", avatar: Radar.estudante().iniciais, vagaId: Number(vid),
          msgs: est.mensagens.map((m) => ({ ...m, eu: m.de === "ofertante" })),
          naoLida: !!ultEst && ultEst.de === "eu" && !est.ofertanteLeu,
          contexto: `${Radar.estudante().curso} · ${contextoAgenda(est)}`, link: { href: `agenda-ofertante.html?vaga=${vid}`, rotulo: "Agenda da vaga" },
          ref: { tipo: "estudante", obj: est }, status: est.status,
        });
      }
      dados.candidatos.filter((k) => k.id !== ID_ESTUDANTE).forEach((k) => {
        const ult = k.mensagens[k.mensagens.length - 1];
        lista.push({
          id: `${vid}-${k.id}`, nome: k.nome, sub: vaga(Number(vid)).titulo, cor: corPessoa(k.nome), avatar: iniciais(k.nome), vagaId: Number(vid),
          msgs: k.mensagens.map((m) => ({ ...m, eu: m.de === "ofertante" })),
          naoLida: !!ult && ult.de === "candidato" && !k.lido,
          contexto: k.curso, link: { href: `agenda-ofertante.html?vaga=${vid}`, rotulo: "Agenda da vaga" },
          ref: { tipo: "candidato", obj: k }, status: k.status,
        });
      });
    });
  }
  return lista;
}

function ordemRecente(lista) {
  // "agora" e conversas não lidas primeiro; depois mantém a ordem de origem
  const peso = (c) => {
    const q = c.msgs.length ? c.msgs[c.msgs.length - 1].quando : "";
    return (c.naoLida ? 0 : 2) + (q === "agora" ? 0 : 1);
  };
  return lista.map((c, i) => [c, i]).sort((a, b) => peso(a[0]) - peso(b[0]) || a[1] - b[1]).map((x) => x[0]);
}

/* ---------- Lista ---------- */
function renderAcoesTopo() {
  $("#acoes-topo").innerHTML = PERFIL === "ofertante"
    ? `<button class="btn btn-icone" id="abrir-grupo" title="Mensagem para grupo" aria-label="Mensagem para grupo de candidatos"><i class="ti ti-users-group"></i></button>
       <button class="btn btn-primario btn-icone" id="abrir-nova" title="Nova conversa" aria-label="Nova conversa"><i class="ti ti-edit"></i></button>`
    : "";
}

function renderLista() {
  const termo = $("#busca").value.trim().toLowerCase();
  const todas = conversas();
  const naoLidas = todas.filter((c) => c.naoLida).length;
  $("#qtd-nao-lidas").textContent = naoLidas ? `(${naoLidas})` : "";
  document.querySelectorAll("[data-filtro]").forEach((b) => b.setAttribute("aria-selected", b.dataset.filtro === filtro));

  let lista = todas.filter((c) => c.msgs.length || c.id === atualId);
  if (filtro === "nao-lidas") lista = lista.filter((c) => c.naoLida || c.id === atualId);
  if (termo) lista = lista.filter((c) => `${c.nome} ${c.sub}`.toLowerCase().includes(termo));
  lista = ordemRecente(lista);

  $("#lista").innerHTML = lista.length ? lista.map((c) => {
    const ult = c.msgs[c.msgs.length - 1];
    const previa = ult ? `${ult.eu ? "Você: " : ""}${ult.anexo ? `📎 ${ult.anexo.nome}` : ult.texto}` : "Nenhuma mensagem ainda";
    return `
    <button class="conv ${c.id === atualId ? "ativa" : ""} ${c.naoLida ? "nao-lida" : ""}" data-conv="${c.id}" role="listitem">
      <span class="av ${c.quadrado ? "quadrado" : ""}" style="background:${c.cor}">${c.avatar}</span>
      <span class="conv-corpo">
        <span class="conv-linha"><span class="conv-nome">${esc(c.nome)}</span><span class="conv-quando">${ult ? esc(ult.quando) : ""}</span></span>
        <span class="conv-vaga" style="display:block">${esc(c.sub)}</span>
        <span class="conv-previa" style="display:block">${esc(previa)}</span>
      </span>
      ${c.naoLida ? '<span class="bolinha" aria-label="Não lida"></span>' : ""}
    </button>`;
  }).join("") : `<p class="lista-vazia">${termo ? "Nenhuma conversa encontrada." : filtro === "nao-lidas" ? "Nenhuma conversa não lida." : "Nenhuma conversa ainda."}</p>`;
}

/* ---------- Janela da conversa ---------- */
function respostasRapidas(c) {
  if (PERFIL === "estudante") {
    const s = c.ref.obj.status;
    if (s === "escolher") return ["Nenhum dos horários é compatível com minhas aulas. Há outra opção?", "Posso fazer a entrevista online?"];
    if (s === "aguardando") return ["Olá! Quando serão divulgados os horários de entrevista?"];
    if (s === "marcada") return ["Confirmo minha presença. Obrigado!", "Preciso levar algum documento?"];
    return ["Obrigado pelo retorno!", "Tenho uma dúvida sobre a vaga."];
  }
  if (c.status === "escolher") return ["Lembrete: escolha seu horário de entrevista na agenda.", "Quais dias funcionam melhor para você?"];
  if (c.status === "aguardando") return ["Em breve divulgaremos os horários de entrevista."];
  if (c.status === "marcada") return ["Confirmado! Até a entrevista.", "Traga um documento com foto."];
  return ["Obrigado pelo contato!"];
}

function renderBalao(m) {
  const tamanho = m.anexo ? m.anexo.tamanho : "";
  return `<div class="balao ${m.eu ? "eu" : "outro"}">${m.grupo ? '<span class="selo-grupo"><i class="ti ti-users-group"></i> Mensagem para o grupo</span><br>' : ""}${m.anexo
    ? `<div class="anexo"><i class="ti ti-file-type-pdf"></i><div><strong>${esc(m.anexo.nome)}</strong><span>${esc(tamanho)}</span></div></div>`
    : ""}${esc(m.texto)}<small>${esc(m.quando)}</small></div>`;
}

function renderJanela() {
  const c = conversas().find((x) => x.id === atualId);
  $("#caixa").classList.toggle("vendo-conversa", !!c);
  if (!c) {
    $("#janela").innerHTML = `<div class="vazio-janela"><i class="ti ti-messages"></i><strong>Selecione uma conversa</strong>${PERFIL === "ofertante" ? "Ou envie um aviso para um grupo de candidatos." : "Converse com ofertantes das vagas em que você se candidatou."}</div>`;
    return;
  }
  marcarLida(c);
  $("#janela").innerHTML = `
    <div class="janela-cab">
      <button class="btn btn-texto btn-icone voltar-lista" data-acao="voltar" aria-label="Voltar para a lista"><i class="ti ti-arrow-left" style="font-size:20px"></i></button>
      <span class="av ${c.quadrado ? "quadrado" : ""}" style="background:${c.cor}">${c.avatar}</span>
      <div class="info"><strong>${esc(c.nome)}</strong><small>${esc(c.sub)}</small></div>
    </div>
    <div class="contexto"><i class="ti ti-info-circle"></i><span>${esc(c.contexto)}</span><a href="${c.link.href}">${c.link.rotulo} <i class="ti ti-arrow-right"></i></a></div>
    <div class="fio" id="fio">
      ${c.msgs.length ? c.msgs.map(renderBalao).join("") : `<div class="vazio-janela"><i class="ti ti-message-plus"></i><strong>Comece a conversa</strong>As mensagens ficam registradas para os dois lados.</div>`}
      ${digitando.has(c.id) ? `<span class="digitando">${esc(c.nome.split(" ")[0])} está digitando…</span>` : ""}
    </div>
    <form class="compor" id="compor">
      <div class="rapidas">${respostasRapidas(c).map((r) => `<button type="button" data-rapida>${esc(r)}</button>`).join("")}</div>
      <div class="compor-linha">
        <label class="anexar" title="Anexar arquivo (PDF, JPG ou PNG até 10 MB)">
          <input type="file" id="anexo" accept=".pdf,.jpg,.jpeg,.png" aria-label="Anexar arquivo">
          <span class="btn btn-icone"><i class="ti ti-paperclip" style="font-size:18px"></i></span>
        </label>
        <label class="sr-only" for="texto">Mensagem</label>
        <textarea id="texto" rows="1" placeholder="Escreva uma mensagem">${esc(rascunhos[c.id] || "")}</textarea>
        <button class="btn btn-primario btn-icone" type="submit" aria-label="Enviar"><i class="ti ti-send" style="font-size:18px"></i></button>
      </div>
    </form>`;
  const fio = $("#fio");
  fio.scrollTop = fio.scrollHeight;
}

function render() {
  renderLista();
  renderJanela();
  renderLista(); // atualiza "não lida" depois de abrir
}

function marcarLida(c) {
  if (!c.naoLida) return;
  const o = c.ref.obj;
  if (c.ref.tipo === "agenda") o.conversaLida = true;
  if (c.ref.tipo === "extra") o.lida = true;
  if (c.ref.tipo === "estudante") o.ofertanteLeu = true;
  if (c.ref.tipo === "candidato") o.lido = true;
  salvar();
}

/* ---------- Envio ---------- */
function registrar(c, msg) {
  const o = c.ref.obj;
  if (PERFIL === "estudante") {
    o.mensagens.push({ de: "eu", ...msg });
    if (c.ref.tipo === "agenda") o.ofertanteLeu = false;
  } else {
    o.mensagens.push({ de: "ofertante", ...msg });
    if (c.ref.tipo === "estudante") o.conversaLida = false;
  }
}

function avisarOutroLado(c, resumo) {
  if (PERFIL === "estudante" && OF_ID && c.ref.ofertante === OF_ID) {
    Radar.notificar(`<b>${esc(ESTUDANTE)}</b> enviou uma mensagem: “${esc(resumo)}”`, "ti-message-circle", `mensagens.html?perfil=ofertante&conversa=${c.ref.obj.oportunidade}-estudante`, "ofertante");
    return true;
  }
  if (PERFIL === "ofertante" && c.ref.tipo === "estudante") {
    Radar.notificar(`<b>${esc(OFERTANTES[OF_ID].nome)}</b> enviou uma mensagem: “${esc(resumo)}”`, "ti-message-circle", `mensagens.html?conversa=ag-${c.ref.obj.id}`, "estudante");
    return true;
  }
  return false;
}

function enviar(msg) {
  const c = conversas().find((x) => x.id === atualId);
  registrar(c, { ...msg, quando: "agora" });
  rascunhos[c.id] = "";
  salvar();
  const resumo = msg.anexo ? `📎 ${msg.anexo.nome}` : msg.texto.length > 70 ? msg.texto.slice(0, 70) + "…" : msg.texto;
  const real = avisarOutroLado(c, resumo);
  render();
  $("#texto")?.focus();
  // Do outro lado há uma pessoa fictícia: simula uma resposta
  if (!real) simularResposta(c.id);
}

function simularResposta(id) {
  digitando.add(id);
  setTimeout(() => { if (atualId === id) renderJanela(); }, 700);
  setTimeout(() => {
    digitando.delete(id);
    carregar();
    const c = conversas().find((x) => x.id === id);
    if (!c) return;
    const opcoes = RESPOSTAS_AUTOMATICAS[PERFIL];
    const texto = opcoes[Math.floor(Math.random() * opcoes.length)];
    const o = c.ref.obj;
    if (PERFIL === "estudante") { o.mensagens.push({ de: "ofertante", texto, quando: "agora" }); if (c.ref.tipo === "agenda") o.conversaLida = atualId === id; else o.lida = atualId === id; }
    else { o.mensagens.push({ de: "candidato", texto, quando: "agora" }); o.lido = atualId === id; }
    salvar();
    if (atualId !== id) Radar.notificar(`<b>${esc(c.nome)}</b> respondeu: “${texto}”`, "ti-message-circle", `mensagens.html${PERFIL === "ofertante" ? "?perfil=ofertante&" : "?"}conversa=${id}`);
    render();
  }, 2600);
}

/* ---------- Mensagem para grupo (ofertante) ---------- */
const GRUPOS = [
  { id: "todos", nome: "Todos os aprovados na pré-seleção", filtro: (s) => !["desistiu", "cancelada"].includes(s) },
  { id: "sem-horario", nome: "Quem ainda não escolheu horário", filtro: (s) => s === "escolher" || s === "aguardando" },
  { id: "marcada", nome: "Quem já tem entrevista marcada", filtro: (s) => s === "marcada" },
];

function destinatarios(vid, grupoId) {
  const g = GRUPOS.find((x) => x.id === grupoId);
  return conversas().filter((c) => c.vagaId === vid && g.filtro(c.status));
}

function renderGrupos() {
  const vid = Number($("#mg-vaga").value);
  const sel = document.querySelector('input[name="grupo"]:checked')?.value || "todos";
  $("#mg-grupos").innerHTML = GRUPOS.map((g) => {
    const n = destinatarios(vid, g.id).length;
    return `<label class="${n ? "" : "vazio"}"><input type="radio" name="grupo" value="${g.id}" ${g.id === sel ? "checked" : ""}><span>${g.nome}</span><small>${n} ${n === 1 ? "pessoa" : "pessoas"}</small></label>`;
  }).join("");
  const n = destinatarios(vid, sel).length;
  $("#mg-rotulo").textContent = n ? `Enviar para ${n}` : "Enviar";
}

function abrirGrupo() {
  $("#mg-vaga").innerHTML = Object.keys(ofs.vagas).map((vid) => `<option value="${vid}">${esc(vaga(Number(vid)).titulo)}</option>`).join("");
  $("#mg-texto").value = "";
  $("#mg-erro").textContent = "";
  renderGrupos();
  $("#modal-grupo").showModal();
}

function enviarGrupo() {
  const vid = Number($("#mg-vaga").value);
  const grupo = document.querySelector('input[name="grupo"]:checked').value;
  const texto = $("#mg-texto").value.trim();
  const alvo = destinatarios(vid, grupo);
  if (!alvo.length) { $("#mg-erro").textContent = "Nenhum candidato neste grupo. Escolha outro grupo."; return; }
  if (texto.length < 5) { $("#mg-erro").textContent = "Escreva a mensagem para o grupo."; $("#mg-texto").focus(); return; }
  alvo.forEach((c) => registrar(c, { texto, quando: "agora", grupo: true }));
  salvar();
  alvo.filter((c) => c.ref.tipo === "estudante").forEach((c) => avisarOutroLado(c, texto.length > 70 ? texto.slice(0, 70) + "…" : texto));
  $("#modal-grupo").close();
  render();
  Radar.toast(`Mensagem enviada para ${alvo.length} ${alvo.length === 1 ? "candidato" : "candidatos"}.`, "ti-users-group");
}

/* ---------- Nova conversa (ofertante) ---------- */
function abrirNova() {
  const semConversa = conversas().filter((c) => !c.msgs.length);
  $("#mn-candidato").innerHTML = semConversa.length
    ? semConversa.map((c) => `<option value="${c.id}">${esc(c.nome)} · ${esc(c.sub)}</option>`).join("")
    : '<option value="">Você já conversa com todos os candidatos</option>';
  $("#mn-erro").textContent = "";
  $("#modal-nova").showModal();
}

/* ---------- Eventos ---------- */
function abrirConversa(id) {
  atualId = id;
  const p = new URLSearchParams(location.search);
  p.set("conversa", id);
  history.replaceState(null, "", `?${p}`);
  render();
}

$("#lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-conv]");
  if (b) abrirConversa(b.dataset.conv);
});
$("#busca").addEventListener("input", renderLista);
document.querySelector(".filtro-conv").addEventListener("click", (e) => {
  const b = e.target.closest("[data-filtro]");
  if (b) { filtro = b.dataset.filtro; renderLista(); }
});

$("#janela").addEventListener("click", (e) => {
  if (e.target.closest("[data-acao='voltar']")) {
    atualId = null;
    const p = new URLSearchParams(location.search); p.delete("conversa");
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
    render();
  }
  const r = e.target.closest("[data-rapida]");
  if (r) { $("#texto").value = r.textContent; rascunhos[atualId] = r.textContent; $("#texto").focus(); }
});
$("#janela").addEventListener("input", (e) => {
  if (e.target.id !== "texto") return;
  rascunhos[atualId] = e.target.value;
  e.target.style.height = "auto";
  e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
});
$("#janela").addEventListener("keydown", (e) => {
  if (e.target.id === "texto" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#compor").requestSubmit(); }
});
$("#janela").addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = $("#texto").value.trim();
  if (!texto) { $("#texto").focus(); return; }
  enviar({ texto });
});
$("#janela").addEventListener("change", (e) => {
  if (e.target.id !== "anexo" || !e.target.files[0]) return;
  const f = e.target.files[0];
  if (!TIPOS_ANEXO.includes(f.type)) return Radar.toast("Formato não aceito. Envie um PDF, JPG ou PNG.", "ti-alert-circle");
  if (f.size > 10 * 1024 * 1024) return Radar.toast("O arquivo passa de 10 MB.", "ti-alert-circle");
  const tamanho = f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`;
  enviar({ texto: $("#texto").value.trim(), anexo: { nome: f.name, tamanho } });
});

document.addEventListener("click", (e) => {
  if (e.target.closest("#abrir-grupo")) abrirGrupo();
  if (e.target.closest("#abrir-nova")) abrirNova();
});
document.querySelectorAll("dialog.modal").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); }));
$("#mg-vaga").addEventListener("change", renderGrupos);
$("#mg-grupos").addEventListener("change", () => { $("#mg-erro").textContent = ""; renderGrupos(); });
$("#mg-texto").addEventListener("input", () => ($("#mg-erro").textContent = ""));
$("#mg-enviar").addEventListener("click", enviarGrupo);
$("#mn-abrir").addEventListener("click", () => {
  const id = $("#mn-candidato").value;
  if (!id) { $("#mn-erro").textContent = "Não há candidatos sem conversa."; return; }
  $("#modal-nova").close();
  abrirConversa(id);
  $("#texto")?.focus();
});

// Notificação que aponta para esta página / outra aba mudou algo
window.addEventListener("radar:navegar", () => {
  atualId = new URLSearchParams(location.search).get("conversa");
  render();
});
window.addEventListener("radar:sincronizar", (e) => {
  if (["radar:agenda", "radar:ofertante", "radar:conversas", null].includes(e.detail)) { carregar(); render(); }
});

carregar();
renderAcoesTopo();
if (!atualId && window.matchMedia("(min-width: 801px)").matches) {
  atualId = ordemRecente(conversas().filter((c) => c.msgs.length))[0]?.id || null;
}
render();
