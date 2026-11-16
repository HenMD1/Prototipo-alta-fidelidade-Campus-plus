/* ==========================================================
   Agenda de entrevistas — visão do ofertante
   Caso de uso "Agendar entrevista", lado do ofertante:
     - CT02: disponibilizar horários → candidatos notificados
     - CT03: alterar horários → candidatos notificados
     - Fluxo alt. 5: cancelar entrevista com explicação
     - Recebe a escolha do estudante (CT01) e mensagens (CT04/05/06)
   A agenda da vaga 1 é compartilhada com a tela do estudante
   (agenda.html) pelo armazenamento do navegador.
   ========================================================== */

const $ = (s) => document.querySelector(s);
const BASE = Radar.proximaSegunda();
const SEMANAS = 3;
const HORAS = [];
for (let m = 8 * 60; m < 18 * 60; m += 30) HORAS.push(hhmm(m));
const OF_ID = Radar.ofertanteId();            // TechSul na demonstração; a empresa criada no teste do zero
const NOME_OF = OFERTANTES[OF_ID].nome;
const SELO_EST = Radar.ambiente === "demo" ? "conta demo" : "conta de teste";
let VAGAS = [];
const pendentes = {};     // vaga → Map("d|hh:mm" → "add" | "rem")
const cfgPendente = {};   // vaga → { formato, prazoEscolhaDias }

const clonar = (x) => JSON.parse(JSON.stringify(x));
let estudante, of;
carregar();

let vagaId = Number(new URLSearchParams(location.search).get("vaga")) || VAGAS[0];
if (!VAGAS.includes(vagaId)) vagaId = VAGAS[0];
let semana = 0;
let conversaCom = null;
let reservaAberta = null;

/* ---------- Estado ---------- */
function carregar() {
  estudante = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
  of = Radar.ler("radar:ofertante", null) || clonar(OFERTANTE_INICIAL);
  // Vagas com agenda: as abertas do ofertante e as que já têm registro de agenda
  VAGAS = OPORTUNIDADES.filter((o) => o.ofertante === OF_ID && (o.status === "aberta" || of.vagas[o.id])).map((o) => o.id);
  VAGAS.forEach((v) => {
    garantirVagaAgenda(of, v);
    if (!pendentes[v]) pendentes[v] = new Map();
    if (!cfgPendente[v]) cfgPendente[v] = {};
  });
  reconciliar();
}
function salvarTudo() {
  Radar.salvar("radar:agenda", estudante);
  Radar.salvar("radar:ofertante", of);
}

function hhmm(min) { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }
function minutos(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function dataDe(d) { return Radar.somarDias(BASE, d); }
function chave(d, t) { return `${d}|${t}`; }
function primeiroNome(n) { return n.split(" ")[0]; }
function iniciais(n) { return n.split(" ").map((p) => p[0]).slice(0, 2).join(""); }

// Candidatura do estudante real nesta vaga (João na demonstração ou a conta de teste).
// Quando existe, ela guarda a agenda compartilhada da vaga.
function candEst(v = vagaId) {
  if (!(of.vagas[v]?.candidatos || []).some((k) => k.id === ID_ESTUDANTE)) return null;
  return estudante.find((c) => c.oportunidade === v) || null;
}

// Agenda da vaga, com a mesma "forma" em todos os casos.
function agenda(v = vagaId) {
  const c = candEst(v);
  if (c) {
    return { horarios: c.horarios, formato: c.formato, duracao: c.duracao, prazoEscolhaDias: c.prazoEscolhaDias, publicada: of.vagas[v]?.publicada ?? true, ref: c };
  }
  const x = of.vagas[v];
  return { horarios: x.horarios, formato: x.formato, duracao: x.duracao, prazoEscolhaDias: x.prazoEscolhaDias, publicada: x.publicada, ref: x };
}

// Lista de candidatos com status calculado (João vem da tela do estudante).
function candidatos(v = vagaId) {
  return of.vagas[v].candidatos.map((k) => {
    if (k.id !== ID_ESTUDANTE) return k;
    const c = candEst(v);
    if (!c) return k;
    return { ...k, nome: Radar.estudante().nome, status: c.status, slot: c.entrevista, estudante: true };
  });
}

function descrever(h, v = vagaId) {
  return `${Radar.fmtDia(dataDe(h.d))} · ${h.ini}–${hhmm(minutos(h.ini) + agenda(v).duracao)}`;
}

// Mantém candidatos fictícios coerentes com reservas feitas na tela do estudante.
function reconciliar() {
  VAGAS.forEach((v) => {
    const ag = agenda(v);
    const ocupados = new Set(ag.horarios.filter((h) => h.status === "ocupado").map((h) => h.id));
    const ficticios = of.vagas[v].candidatos.filter((k) => k.id !== ID_ESTUDANTE);
    ficticios.forEach((k) => {
      if (k.status === "marcada" && !ocupados.has(k.slot)) { k.status = "escolher"; k.slot = null; }
    });
    const atribuidos = new Set(ficticios.map((k) => k.slot));
    ocupados.forEach((id) => {
      if (atribuidos.has(id)) return;
      const livre = ficticios.find((k) => k.status === "escolher");
      if (livre) { livre.status = "marcada"; livre.slot = id; }
    });
  });
}

function reservaDe(h) {
  if (h.status === "meu") return candidatos().find((k) => k.estudante);
  return candidatos().find((k) => k.slot === h.id && k.id !== ID_ESTUDANTE) || { nome: "Candidato", curso: "", id: null };
}

/* ---------- Abas de vagas ---------- */
function renderAbas() {
  $("#vagas-abas").innerHTML = VAGAS.map((v) => {
    const vaga = OPORTUNIDADES.find((o) => o.id === v);
    const cs = candidatos(v);
    const marcadas = cs.filter((k) => k.status === "marcada").length;
    const ag = agenda(v);
    return `<button class="aba-vaga" role="tab" aria-selected="${v === vagaId}" data-vaga="${v}">
      <strong>${vaga.titulo}</strong>
      <span class="sub">${cs.length} aprovados · ${marcadas} entrevistas marcadas</span>
      ${ag.publicada ? '<span class="etiqueta sucesso"><i class="ti ti-check"></i>Agenda publicada</span>' : '<span class="etiqueta alerta"><i class="ti ti-alert-circle"></i>Sem agenda</span>'}
    </button>`;
  }).join("");
}

/* ---------- Configuração ---------- */
function renderConfig() {
  const ag = agenda(), cfg = cfgPendente[vagaId];
  const formatos = FORMATOS.includes(ag.formato) ? FORMATOS : [ag.formato, ...FORMATOS];
  const formato = cfg.formato ?? ag.formato;
  $("#cfg-formato").innerHTML = formatos.map((f) => `<option ${f === formato ? "selected" : ""}>${f}</option>`).join("");
  const prazo = Radar.somarDias(Radar.hoje(), cfg.prazoEscolhaDias ?? ag.prazoEscolhaDias);
  $("#cfg-prazo").value = isoData(prazo);
  $("#cfg-prazo").min = isoData(Radar.somarDias(Radar.hoje(), 1));
  $("#cfg-formato").parentElement.classList.toggle("alterado", cfg.formato !== undefined);
  $("#cfg-prazo").parentElement.classList.toggle("alterado", cfg.prazoEscolhaDias !== undefined);
}
function isoData(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- Métricas ---------- */
function projecao() {
  const ag = agenda(), p = pendentes[vagaId];
  const adds = [...p.values()].filter((x) => x === "add").length;
  const rems = [...p.values()].filter((x) => x === "rem").length;
  const livres = ag.horarios.filter((h) => h.status === "livre").length - rems + adds;
  return { adds, rems, livres };
}

function renderMetricas() {
  const cs = candidatos();
  const ativos = cs.filter((k) => !["desistiu", "cancelada"].includes(k.status));
  const marcadas = cs.filter((k) => k.status === "marcada").length;
  const semHorario = ativos.filter((k) => k.status !== "marcada").length;
  const { livres } = projecao();
  const falta = semHorario > livres;
  $("#metricas").innerHTML = `
    <div class="metrica"><small>Horários abertos</small><strong>${livres}</strong></div>
    <div class="metrica"><small>Entrevistas marcadas</small><strong>${marcadas}</strong></div>
    <div class="metrica ${falta ? "alerta" : ""}"><small>Candidatos sem horário</small><strong>${semHorario}</strong></div>
    <div class="metrica"><small>Candidatos ativos</small><strong>${ativos.length}</strong></div>`;

  const ag = agenda();
  let aviso = "";
  if (!ag.publicada && !ag.horarios.length) {
    aviso = `<div class="aviso info"><i class="ti ti-calendar-plus"></i><div class="aviso-corpo">Esta vaga ainda não tem agenda de entrevistas. Marque seus horários livres na grade e publique: os <b>${ativos.length} candidatos</b> aprovados serão notificados para escolher um horário.</div></div>`;
  } else if (falta) {
    aviso = `<div class="aviso alerta"><i class="ti ti-alert-triangle"></i><div class="aviso-corpo">Há <b>${semHorario} candidatos sem entrevista</b> e só <b>${livres} ${livres === 1 ? "horário aberto" : "horários abertos"}</b>. Abra mais horários para que todos possam escolher.</div></div>`;
  }
  $("#alerta-capacidade").innerHTML = aviso;
}

/* ---------- Grade ---------- */
function estadoCelula(d, t) {
  const ag = agenda();
  const h = ag.horarios.find((x) => x.d === d && x.ini === t);
  const p = pendentes[vagaId].get(chave(d, t));
  if (h && (h.status === "ocupado" || h.status === "meu")) return { tipo: "reservado", h };
  if (h) return { tipo: p === "rem" ? "rem" : "livre", h };
  return { tipo: p === "add" ? "add" : "vazio", h: null };
}

function renderGrade() {
  const ini = semana * 7;
  const dias = [0, 1, 2, 3, 4].map((i) => ini + i);
  $("#sem-rotulo").textContent = `${dataDe(ini).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${dataDe(ini + 4).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  $("#sem-ant").disabled = semana === 0;
  $("#sem-prox").disabled = semana >= SEMANAS - 1;

  let html = '<div></div>' + dias.map((d) => {
    const data = dataDe(d);
    return `<div class="gh-cab"><strong>${data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</strong><small>${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small></div>`;
  }).join("");

  HORAS.forEach((t) => {
    html += `<div class="gh-hora ${t.endsWith(":00") ? "cheia" : ""}">${t}</div>`;
    dias.forEach((d) => {
      const e = estadoCelula(d, t);
      let texto = "+ abrir", extra = "", rotulo = `${Radar.fmtDia(dataDe(d))} ${t}: fechado`;
      if (e.tipo === "livre") { texto = "aberto"; extra = e.h.novo ? "novo" : ""; rotulo = `${Radar.fmtDia(dataDe(d))} ${t}: aberto`; }
      if (e.tipo === "add") { texto = "+ abrir"; rotulo += " (será aberto)"; }
      if (e.tipo === "rem") { texto = "fechar"; rotulo = `${Radar.fmtDia(dataDe(d))} ${t}: será fechado`; }
      if (e.tipo === "reservado") {
        const k = reservaDe(e.h);
        texto = primeiroNome(k.nome);
        extra = k.estudante ? "estudante" : "";
        rotulo = `${Radar.fmtDia(dataDe(d))} ${t}: entrevista com ${k.nome}`;
      }
      html += `<button class="cel ${e.tipo} ${extra}" data-d="${d}" data-t="${t}" aria-label="${rotulo}" title="${rotulo}">${e.tipo === "reservado" ? '<i class="ti ti-user"></i>' : ""}${texto}</button>`;
    });
  });
  $("#grade").innerHTML = html;
}

/* ---------- Barra de publicação ---------- */
function renderBarra() {
  const { adds, rems } = projecao();
  const cfg = cfgPendente[vagaId];
  const mudouCfg = Object.keys(cfg).length > 0;
  const ag = agenda();
  const total = adds + rems + (mudouCfg ? 1 : 0);
  $("#barra-publicar").hidden = total === 0;
  if (!total) return;
  const ativos = candidatos().filter((k) => !["desistiu", "cancelada"].includes(k.status)).length;
  const partes = [];
  if (adds) partes.push(`<span class="mudanca-add">+${adds} ${adds === 1 ? "horário" : "horários"}</span>`);
  if (rems) partes.push(`<span class="mudanca-rem">−${rems} ${rems === 1 ? "horário" : "horários"}</span>`);
  if (cfg.formato !== undefined) partes.push("formato alterado");
  if (cfg.prazoEscolhaDias !== undefined) partes.push("prazo alterado");
  $("#resumo-mudancas").innerHTML = `${partes.join(" · ")} — ao publicar, <b>${ativos} candidatos</b> serão notificados.`;
  $("#publicar-rotulo").textContent = ag.publicada ? "Publicar alterações" : "Publicar agenda";
}

/* ---------- Candidatos ---------- */
const STATUS_CAND = {
  marcada: (k) => {
    const h = agenda().horarios.find((x) => x.id === k.slot);
    return `<span class="etiqueta sucesso"><i class="ti ti-calendar-check"></i>${h ? `${Radar.fmtDia(dataDe(h.d))} · ${h.ini}` : "Marcada"}</span>`;
  },
  escolher: () => '<span class="etiqueta alerta"><i class="ti ti-clock"></i>Ainda não escolheu</span>',
  aguardando: () => '<span class="etiqueta neutra"><i class="ti ti-hourglass"></i>Aguardando agenda</span>',
  desistiu: () => '<span class="etiqueta neutra"><i class="ti ti-door-exit"></i>Desistiu</span>',
  cancelada: () => '<span class="etiqueta perigo"><i class="ti ti-ban"></i>Cancelada: prazo expirou</span>',
};

function naoLida(k) {
  if (k.estudante) {
    const c = candEst(), ult = c.mensagens[c.mensagens.length - 1];
    return ult && ult.de === "eu" && !c.ofertanteLeu;
  }
  const ult = k.mensagens[k.mensagens.length - 1];
  return ult && ult.de === "candidato" && !k.lido;
}

function renderCandidatos() {
  const cs = candidatos();
  $("#cand-qtd").textContent = `${cs.length}`;
  $("#lista-candidatos").innerHTML = cs.map((k) => `
    <div class="cand">
      <div class="avatar ${k.estudante ? "estudante" : ""}">${iniciais(k.nome)}</div>
      <div class="cand-info">
        <div class="cand-nome">${k.nome} ${k.estudante ? `<span class="selo-voce" title="Este candidato é a conta usada na tela do estudante">${SELO_EST}</span>` : ""}</div>
        <div class="cand-curso">${k.curso}</div>
        ${STATUS_CAND[k.status](k)}
      </div>
      <div class="cand-acoes">
        ${k.status === "marcada" ? `<button class="btn btn-texto btn-icone" data-acao="ver" data-cand="${k.id}" aria-label="Ver entrevista de ${k.nome}" title="Ver entrevista"><i class="ti ti-calendar-event"></i></button>` : ""}
        ${k.status === "escolher" ? `<button class="btn btn-texto btn-icone" data-acao="lembrar" data-cand="${k.id}" aria-label="Lembrar ${k.nome} de escolher um horário" title="Lembrar de escolher horário"><i class="ti ti-alarm"></i></button>` : ""}
        <button class="btn btn-texto btn-icone" data-acao="conversa" data-cand="${k.id}" aria-label="Conversar com ${k.nome}" title="Conversar">
          <i class="ti ti-message-circle"></i>${naoLida(k) ? '<span class="ponto"></span>' : ""}
        </button>
      </div>
    </div>`).join("");
}

function render() {
  if (!VAGAS.length) {
    document.querySelector(".of-layout").innerHTML = `<div class="bloco" style="grid-column:1/-1;text-align:center;padding:48px 24px">
      <i class="ti ti-calendar-plus" style="font-size:42px;color:var(--cor-primaria)"></i>
      <h3 style="font-size:19px;margin-top:8px">Nenhuma vaga aberta</h3>
      <p style="color:var(--texto-2);margin:6px auto 16px;max-width:440px">Cadastre uma vaga em Minhas vagas. Depois, monte aqui a agenda de entrevistas para os candidatos pré-selecionados.</p>
      <a class="btn btn-primario" href="vagas.html?nova"><i class="ti ti-plus"></i> Cadastrar vaga</a></div>`;
    $("#vagas-abas").innerHTML = "";
    return;
  }
  renderAbas();
  renderConfig();
  renderMetricas();
  renderGrade();
  renderBarra();
  renderCandidatos();
  if (conversaCom) renderConversa();
}

/* ---------- Edição da grade (clique e arraste) ---------- */
let arrastando = false, modoArraste = null, ultimaCel = null;

// Aplica o modo a todas as células entre a última e a atual (movimento rápido do mouse pula células).
function aplicarIntervalo(d, t) {
  if (ultimaCel && ultimaCel.d === d) {
    const [a, b] = [HORAS.indexOf(ultimaCel.t), HORAS.indexOf(t)].sort((x, y) => x - y);
    HORAS.slice(a, b + 1).forEach((h) => aplicar(d, h, modoArraste));
  } else {
    aplicar(d, t, modoArraste);
  }
  ultimaCel = { d, t };
}

function modoPara(d, t) {
  const e = estadoCelula(d, t);
  return e.tipo === "livre" || e.tipo === "add" ? "fechar" : "abrir";
}

function aplicar(d, t, modo) {
  const e = estadoCelula(d, t);
  const p = pendentes[vagaId], k = chave(d, t);
  if (e.tipo === "reservado") return;
  if (e.h) modo === "fechar" ? p.set(k, "rem") : p.delete(k);   // horário já publicado
  else modo === "abrir" ? p.set(k, "add") : p.delete(k);        // horário novo
}

function atualizarEdicao() { renderGrade(); renderMetricas(); renderBarra(); }

$("#grade").addEventListener("pointerdown", (ev) => {
  const cel = ev.target.closest(".cel");
  if (!cel || ev.button !== 0) return;
  const d = Number(cel.dataset.d), t = cel.dataset.t;
  if (cel.classList.contains("reservado")) return abrirReserva(estadoCelula(d, t).h);
  modoArraste = modoPara(d, t);
  ultimaCel = null;
  aplicarIntervalo(d, t);
  if (ev.pointerType === "mouse") { arrastando = true; ev.preventDefault(); }
  atualizarEdicao();
});
$("#grade").addEventListener("pointerover", (ev) => {
  if (!arrastando) return;
  const cel = ev.target.closest(".cel");
  if (!cel || cel.classList.contains("reservado")) return;
  aplicarIntervalo(Number(cel.dataset.d), cel.dataset.t);
  atualizarEdicao();
});
document.addEventListener("pointerup", () => { arrastando = false; });
// Teclado: Enter/Espaço sobre uma célula
$("#grade").addEventListener("click", (ev) => {
  if (ev.detail !== 0) return;
  const cel = ev.target.closest(".cel");
  if (!cel) return;
  const d = Number(cel.dataset.d), t = cel.dataset.t;
  if (cel.classList.contains("reservado")) return abrirReserva(estadoCelula(d, t).h);
  aplicar(d, t, modoPara(d, t));
  atualizarEdicao();
  $(`.cel[data-d="${d}"][data-t="${t}"]`)?.focus();
});

$("#sem-ant").addEventListener("click", () => { semana = Math.max(0, semana - 1); renderGrade(); });
$("#sem-prox").addEventListener("click", () => { semana = Math.min(SEMANAS - 1, semana + 1); renderGrade(); });

$("#cfg-formato").addEventListener("change", (e) => {
  const cfg = cfgPendente[vagaId];
  if (e.target.value === agenda().formato) delete cfg.formato; else cfg.formato = e.target.value;
  renderConfig(); renderBarra();
});
$("#cfg-prazo").addEventListener("change", (e) => {
  const cfg = cfgPendente[vagaId];
  if (!e.target.value) return renderConfig();
  const [a, m, d] = e.target.value.split("-").map(Number);
  const dias = Radar.diasAte(new Date(a, m - 1, d));
  if (dias < 1) { Radar.toast("O prazo precisa ser a partir de amanhã.", "ti-alert-circle"); return renderConfig(); }
  if (dias === agenda().prazoEscolhaDias) delete cfg.prazoEscolhaDias; else cfg.prazoEscolhaDias = dias;
  renderConfig(); renderBarra();
});

/* ---------- Publicar (CT02 / CT03) ---------- */
function publicar() {
  const ag = agenda(), p = pendentes[vagaId], cfg = cfgPendente[vagaId];
  const vaga = OPORTUNIDADES.find((o) => o.id === vagaId);
  const primeira = !ag.publicada;
  let prox = Math.max(1000, ...ag.horarios.map((h) => h.id)) + 1;
  let adds = 0, rems = 0;

  ag.horarios.forEach((h) => { h.novo = false; });
  p.forEach((op, k) => {
    const [d, t] = k.split("|");
    const dn = Number(d);
    const idx = ag.horarios.findIndex((h) => h.d === dn && h.ini === t);
    if (op === "add" && idx === -1) { ag.horarios.push({ id: prox++, d: dn, ini: t, status: "livre", novo: true }); adds++; }
    if (op === "rem" && idx !== -1 && ag.horarios[idx].status === "livre") { ag.horarios.splice(idx, 1); rems++; }
  });
  if (cfg.formato !== undefined) ag.ref.formato = cfg.formato;
  if (cfg.prazoEscolhaDias !== undefined) ag.ref.prazoEscolhaDias = cfg.prazoEscolhaDias;

  const ativos = candidatos().filter((k) => !["desistiu", "cancelada"].includes(k.status));

  const cEst = candEst(vagaId);
  if (cEst) {
    // Avisa o estudante na tela dele (mesma lógica do fluxo alternativo 3).
    const c = cEst;
    const detalhes = [
      adds ? `${adds} ${adds === 1 ? "novo horário" : "novos horários"} (marcados como <b>novo</b>)` : "",
      rems ? `${rems} ${rems === 1 ? "horário removido" : "horários removidos"}` : "",
      cfg.formato !== undefined ? `formato agora: <b>${cfg.formato}</b>` : "",
      cfg.prazoEscolhaDias !== undefined ? `novo prazo para escolher: <b>${Radar.fmtDia(Radar.somarDias(Radar.hoje(), cfg.prazoEscolhaDias))}</b>` : "",
    ].filter(Boolean).join(", ");
    if (c.status === "marcada") {
      const h = c.horarios.find((x) => x.id === c.entrevista);
      c.avisos.unshift({ id: Date.now(), tipo: "alerta", icone: "ti-calendar-cog", acao: "confirmar-presenca",
        texto: `<b>${NOME_OF}</b> alterou a agenda de entrevistas (${detalhes}). Seu horário (<b>${descrever(h)}</b>) continua reservado. Confirme que ainda pode comparecer.` });
    } else if (c.status === "escolher" || c.status === "aguardando") {
      c.status = "escolher";
      c.avisos.unshift({ id: Date.now(), tipo: "info", icone: "ti-calendar-cog", texto: primeira || c.status === "aguardando"
        ? `<b>${NOME_OF}</b> publicou a agenda de entrevistas. Escolha um dos horários disponíveis.`
        : `<b>${NOME_OF}</b> alterou a agenda: ${detalhes}.` });
    }
    if (!["desistiu", "cancelada"].includes(c.status)) {
      Radar.notificar(`<b>${NOME_OF}</b> ${primeira ? "publicou" : "alterou"} os horários de entrevista de <b>${vaga.titulo}</b>.`, "ti-calendar-cog", `agenda.html?c=${c.id}`, "estudante");
    }
  }
  of.vagas[vagaId].publicada = true;
  of.vagas[vagaId].candidatos.forEach((k) => { if (k.status === "aguardando") k.status = "escolher"; });

  p.clear();
  cfgPendente[vagaId] = {};
  salvarTudo();
  render();
  Radar.toast(`${primeira ? "Agenda publicada" : "Alterações publicadas"}. ${ativos.length} candidatos foram notificados.`, "ti-send");
  if (primeira) simularPrimeiraEscolha(vagaId);
}

// Depois da primeira publicação, um candidato fictício escolhe um horário (o ofertante é notificado).
function simularPrimeiraEscolha(v) {
  setTimeout(() => {
    const ag = agenda(v);
    const k = of.vagas[v].candidatos.find((x) => x.status === "escolher");
    const h = ag.horarios.filter((x) => x.status === "livre").sort((a, b) => a.d - b.d || minutos(a.ini) - minutos(b.ini))[0];
    if (!k || !h) return;
    h.status = "ocupado"; h.novo = false;
    k.status = "marcada"; k.slot = h.id;
    salvarTudo();
    Radar.notificar(`<b>${k.nome}</b> marcou entrevista para ${descrever(h, v)}.`, "ti-calendar-check", `agenda-ofertante.html?vaga=${v}`);
    if (v === vagaId) render(); else renderAbas();
  }, 3500);
}

$("#publicar").addEventListener("click", publicar);
$("#descartar").addEventListener("click", () => {
  pendentes[vagaId].clear();
  cfgPendente[vagaId] = {};
  render();
  Radar.toast("Alterações descartadas.", "ti-arrow-back-up");
});
window.addEventListener("beforeunload", (e) => {
  if (VAGAS.some((v) => pendentes[v].size || Object.keys(cfgPendente[v]).length)) e.preventDefault();
});

/* ---------- Entrevista reservada (fluxo alternativo 5) ---------- */
function abrirReserva(h) {
  reservaAberta = h;
  const k = reservaDe(h);
  const ag = agenda();
  $("#mr-titulo").textContent = `Entrevista com ${k.nome}`;
  $("#mr-resumo").innerHTML = `
    <div><small>Data</small><strong style="text-transform:capitalize">${Radar.fmtDiaLongo(dataDe(h.d))}</strong></div>
    <div><small>Horário</small><strong>${h.ini}–${hhmm(minutos(h.ini) + ag.duracao)}</strong></div>
    <div><small>Formato</small><strong>${ag.formato}</strong></div>
    <div><small>Candidato</small><strong>${k.curso || "—"}</strong></div>`;
  modoReserva(false);
  $("#modal-reserva").showModal();
}

function modoReserva(cancelando) {
  $("#mr-cancelar").hidden = !cancelando;
  $("#mr-motivo").value = "";
  $("#mr-erro").textContent = "";
  $("#mr-rodape").innerHTML = cancelando
    ? `<button class="btn" data-mr="voltar">Voltar</button><button class="btn btn-perigo" data-mr="confirmar-cancelamento"><i class="ti ti-calendar-x"></i> Cancelar entrevista</button>`
    : `<button class="btn btn-texto perigo" data-mr="cancelar" style="margin-right:auto">Cancelar entrevista</button><button class="btn" data-mr="mensagem"><i class="ti ti-message-circle"></i> Mensagem</button><button class="btn btn-primario" data-mr="fechar">Fechar</button>`;
  if (cancelando) setTimeout(() => $("#mr-motivo").focus(), 50);
}

function cancelarEntrevista(motivo) {
  const h = reservaAberta, ag = agenda();
  const k = reservaDe(h);
  const quando = descrever(h);
  ag.horarios.splice(ag.horarios.indexOf(h), 1);   // o horário sai da agenda
  if (k.estudante) {
    const c = candEst();
    c.entrevista = null;
    c.status = "escolher";
    c.prazoEscolhaDias = Math.max(c.prazoEscolhaDias, 3);
    c.mensagens.push({ de: "ofertante", texto: motivo, quando: "agora" });
    c.conversaLida = false;
    c.avisos.unshift({ id: Date.now(), tipo: "perigo", icone: "ti-calendar-x",
      texto: `<b>${NOME_OF}</b> cancelou sua entrevista de <b>${quando}</b>.<br>Motivo: “${motivo}”<br>Escolha outro horário disponível.` });
    Radar.notificar(`<b>${NOME_OF}</b> cancelou sua entrevista de ${quando}. Escolha outro horário.`, "ti-calendar-x", `agenda.html?c=${candEst()?.id}`, "estudante");
  } else if (k.id) {
    const real = of.vagas[vagaId].candidatos.find((x) => x.id === k.id);
    real.status = "escolher"; real.slot = null;
    real.mensagens.push({ de: "ofertante", texto: motivo, quando: "agora" });
  }
  salvarTudo();
  $("#modal-reserva").close();
  render();
  Radar.toast(`Entrevista cancelada. ${k.nome} foi notificado para escolher outro horário.`, "ti-calendar-x");
}

$("#modal-reserva").addEventListener("click", (e) => {
  if (e.target.id === "modal-reserva") return $("#modal-reserva").close();
  const b = e.target.closest("[data-mr]");
  if (!b) return;
  const acao = b.dataset.mr;
  if (acao === "fechar") $("#modal-reserva").close();
  if (acao === "cancelar") modoReserva(true);
  if (acao === "voltar") modoReserva(false);
  if (acao === "mensagem") { const k = reservaDe(reservaAberta); $("#modal-reserva").close(); if (k.id) abrirConversa(k.id); }
  if (acao === "confirmar-cancelamento") {
    const motivo = $("#mr-motivo").value.trim();
    if (motivo.length < 10) {
      $("#mr-erro").textContent = "Escreva uma explicação para o candidato (mínimo de 10 caracteres).";
      return $("#mr-motivo").focus();
    }
    cancelarEntrevista(motivo);
  }
});
$("#mr-motivo").addEventListener("input", () => ($("#mr-erro").textContent = ""));

/* ---------- Candidatos: lembrar, ver, conversar ---------- */
$("#lista-candidatos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-acao]");
  if (!b) return;
  const k = candidatos().find((x) => x.id === b.dataset.cand);
  if (b.dataset.acao === "conversa") abrirConversa(k.id);
  if (b.dataset.acao === "ver") {
    const h = agenda().horarios.find((x) => x.id === k.slot);
    semana = Math.floor(h.d / 7);
    renderGrade();
    abrirReserva(h);
  }
  if (b.dataset.acao === "lembrar") {
    const prazo = Radar.fmtDia(Radar.somarDias(Radar.hoje(), agenda().prazoEscolhaDias));
    if (k.estudante) {
      Radar.notificar(`<b>${NOME_OF}</b> lembrou você de escolher um horário de entrevista até ${prazo}.`, "ti-alarm", `agenda.html?c=${candEst()?.id}`, "estudante");
    }
    Radar.toast(`Lembrete enviado a ${k.nome}.`, "ti-alarm");
  }
});

/* ---------- Conversa ---------- */
function mensagensDe(id) {
  if (id === ID_ESTUDANTE) return candEst().mensagens.map((m) => ({ ...m, meu: m.de === "ofertante" }));
  return of.vagas[vagaId].candidatos.find((k) => k.id === id).mensagens.map((m) => ({ ...m, meu: m.de === "ofertante" }));
}

function renderConversa() {
  const k = candidatos().find((x) => x.id === conversaCom);
  if (!k) return fecharConversa();
  if (k.estudante) candEst().ofertanteLeu = true;
  else of.vagas[vagaId].candidatos.find((x) => x.id === k.id).lido = true;
  salvarTudo();
  const msgs = mensagensDe(k.id);
  $("#conversa-cab").innerHTML = `
    <div class="avatar ${k.estudante ? "estudante" : ""}" style="width:38px;height:38px;font-size:12px">${iniciais(k.nome)}</div>
    <span><strong>${k.nome}</strong><small>${OPORTUNIDADES.find((o) => o.id === vagaId).titulo}</small></span>
    <button class="btn btn-texto btn-icone" data-acao="fechar-conversa" aria-label="Fechar conversa"><i class="ti ti-x" style="font-size:20px"></i></button>`;
  $("#mensagens").innerHTML = msgs.length
    ? msgs.map((m) => `<div class="msg ${m.meu ? "eu" : "ofertante"}">${m.texto}<small>${m.quando}</small></div>`).join("")
    : `<p class="msg-vazia"><i class="ti ti-message-circle" style="font-size:28px;display:block;margin-bottom:6px"></i>Nenhuma mensagem ainda.</p>`;
  $("#mensagens").scrollTop = $("#mensagens").scrollHeight;
  const prazo = Radar.fmtDia(Radar.somarDias(Radar.hoje(), agenda().prazoEscolhaDias));
  $("#respostas-rapidas").innerHTML = [
    "Abri novos horários na agenda. Veja se algum serve para você.",
    `Lembrete: escolha seu horário de entrevista até ${prazo}.`,
    "Quais dias e horários funcionam melhor para você?",
  ].map((r) => `<button type="button">${r}</button>`).join("");
  renderCandidatos();
}

function abrirConversa(id) {
  conversaCom = id;
  renderConversa();
  $("#conversa").classList.add("aberta");
  $("#conversa").setAttribute("aria-hidden", "false");
  $("#fundo-gaveta").hidden = false;
  setTimeout(() => $("#conversa-texto").focus(), 250);
}
function fecharConversa() {
  conversaCom = null;
  $("#conversa").classList.remove("aberta");
  $("#conversa").setAttribute("aria-hidden", "true");
  $("#fundo-gaveta").hidden = true;
}

$("#fundo-gaveta").addEventListener("click", fecharConversa);
$("#conversa-cab").addEventListener("click", (e) => { if (e.target.closest("[data-acao='fechar-conversa']")) fecharConversa(); });
$("#respostas-rapidas").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") { $("#conversa-texto").value = e.target.textContent; $("#conversa-texto").focus(); }
});
$("#conversa-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = $("#conversa-texto").value.trim();
  if (!texto) return $("#conversa-texto").focus();
  $("#conversa-texto").value = "";
  if (conversaCom === ID_ESTUDANTE) {
    const c = candEst();
    c.mensagens.push({ de: "ofertante", texto, quando: "agora" });
    c.conversaLida = false;
    Radar.notificar(`<b>${NOME_OF}</b> enviou uma mensagem: “${texto.length > 70 ? texto.slice(0, 70) + "…" : texto}”`, "ti-message-circle", `agenda.html?c=${candEst()?.id}`, "estudante");
  } else {
    of.vagas[vagaId].candidatos.find((k) => k.id === conversaCom).mensagens.push({ de: "ofertante", texto, quando: "agora" });
  }
  salvarTudo();
  renderConversa();
  Radar.toast("Mensagem enviada. O candidato foi notificado.", "ti-send");
});
$("#conversa-texto").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#conversa-form").requestSubmit(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && conversaCom) fecharConversa(); });

/* ---------- Troca de vaga e sincronização ---------- */
function selecionarVaga(v) {
  vagaId = v;
  semana = 0;
  history.replaceState(null, "", `?vaga=${v}`);
  fecharConversa();
  render();
}
$("#vagas-abas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vaga]");
  if (b) selecionarVaga(Number(b.dataset.vaga));
});
window.addEventListener("radar:navegar", () => {
  const v = Number(new URLSearchParams(location.search).get("vaga"));
  if (VAGAS.includes(v)) selecionarVaga(v);
});

// A tela do estudante (em outra aba) mudou algo: recarrega e descarta pendências que perderam sentido.
window.addEventListener("radar:sincronizar", (e) => {
  if (!["radar:agenda", "radar:ofertante", null].includes(e.detail)) return;
  carregar();
  VAGAS.forEach((v) => {
    pendentes[v].forEach((op, k) => {
      const [d, t] = k.split("|");
      const h = agenda(v).horarios.find((x) => x.d === Number(d) && x.ini === t);
      if ((op === "add" && h) || (op === "rem" && (!h || h.status !== "livre"))) pendentes[v].delete(k);
    });
  });
  render();
});

render();
