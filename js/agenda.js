/* ==========================================================
   Entrevistas — caso de uso "Agendar entrevista com ofertante"
   Fluxo principal:
     1-2. Ofertante cadastra horários (dados / simulação)
     3.   Estudante abre a notificação de horários disponíveis
     4.   Estudante seleciona um horário
     5.   A agenda é atualizada removendo o horário
     6.   A entrevista é marcada e ambos são notificados
   Fluxos alternativos 1–6 implementados abaixo.
   ========================================================== */

const $ = (s) => document.querySelector(s);
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BASE = Radar.proximaSegunda();

/* ---------- Estado ---------- */
const clonar = (x) => JSON.parse(JSON.stringify(x));
let candidaturas = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
let atualId = Number(new URLSearchParams(location.search).get("c")) || candidaturas[0]?.id;
let selecionado = null;               // id do horário selecionado (ainda não confirmado)
let semana = 0;                       // 0 = próxima semana, 1 = a seguinte
let ocultarConflitos = false;
let conversaAberta = false;

function salvar() { Radar.salvar("radar:agenda", candidaturas); }

// Avisos às vagas do ofertante logado (TechSul na demonstração, a empresa criada no
// ambiente do zero) chegam na caixa dele; os outros ofertantes são simulados.
const NOME_ESTUDANTE = Radar.estudante().nome;
const ofertanteReal = (c) => vagaDe(c).ofertante === Radar.ofertanteId();
function avisarOfertante(c, texto, icone) {
  if (!ofertanteReal(c)) return;
  Radar.notificar(texto, icone, `agenda-ofertante.html?vaga=${c.oportunidade}`, "ofertante");
}
function atual() { return candidaturas.find((c) => c.id === atualId) || candidaturas[0]; }
function vagaDe(c) { return OPORTUNIDADES.find((o) => o.id === c.oportunidade); }
function ofertanteDe(c) { return OFERTANTES[vagaDe(c).ofertante]; }
function sigla(of) { return of.sigla || of.nome.split(" ").filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join("").toUpperCase(); }

/* ---------- Horários ---------- */
function dataDe(h) { return Radar.somarDias(BASE, h.d); }
function minutos(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function hhmm(min) { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }
function fimDe(h, c) { return hhmm(minutos(h.ini) + c.duracao); }
function descrever(h, c) { return `${Radar.fmtDia(dataDe(h))} · ${h.ini}–${fimDe(h, c)}`; }

// Compatibilidade com a rotina do estudante: conflito com alguma aula?
// A grade vem do perfil do estudante (perfil.html, seção "Grade de aulas").
// Enquanto o perfil não foi salvo, usa a grade padrão do portal (GRADE_AULAS).
const NUM_DIA = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
function gradeAulas() {
  const perfil = Radar.ler("radar:perfil-estudante", null);
  if (!perfil || !Array.isArray(perfil.aulas)) return GRADE_AULAS;
  return perfil.aulas
    .filter((a) => a.ini && a.fim && a.fim > a.ini)
    .map((a) => ({ dia: NUM_DIA[a.dia], ini: a.ini, fim: a.fim, disciplina: a.disciplina || "Aula" }));
}

function conflito(h, c) {
  const dia = dataDe(h).getDay();
  const ini = minutos(h.ini), fim = ini + c.duracao;
  return gradeAulas().find((a) => a.dia === dia && ini < minutos(a.fim) && fim > minutos(a.ini));
}

function conflitoEntrevista(h, c) {
  const tDia = dataDe(h).getTime();
  const ini1 = minutos(h.ini), fim1 = ini1 + c.duracao;
  for (const outra of candidaturas) {
    if (!outra || outra.id === c.id || outra.status !== "marcada" || !outra.entrevista) continue;
    const hOutra = outra.horarios.find((x) => x.id === outra.entrevista);
    if (!hOutra) continue;
    if (dataDe(hOutra).getTime() !== tDia) continue;
    const ini2 = minutos(hOutra.ini), fim2 = ini2 + (outra.duracao || 30);
    if (ini1 < fim2 && fim1 > ini2) {
      return { candidatura: outra, horario: hOutra, vaga: vagaDe(outra), ofertante: ofertanteDe(outra) };
    }
  }
  return null;
}

function escaparICS(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatarDataICS(dataObj, hhmmStr) {
  const [hh, mm] = hhmmStr.split(":").map(Number);
  const d = new Date(dataObj);
  d.setHours(hh, mm, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function gerarEbaixarICS(c, h) {
  const v = vagaDe(c);
  const of = ofertanteDe(c);
  const data = dataDe(h);
  const dtStart = formatarDataICS(data, h.ini);
  const dtEnd = formatarDataICS(data, fimDe(h, c));
  const dtStamp = formatarDataICS(new Date(), `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`);
  const uid = `campusplus-entrevista-${c.id}-${h.id}-${Date.now()}@ufrgs.br`;
  const summary = escaparICS(`Entrevista: ${v.titulo} — ${of.nome}`);
  const description = escaparICS(
    `Entrevista referente à oportunidade "${v.titulo}" (${of.nome}).\n` +
    `Formato/Local: ${c.formato}\n` +
    `Duração: ${c.duracao} min\n` +
    `Entrevistador: ${c.entrevistador}`
  );
  const location = escaparICS(c.formato);

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campus+ Radar de Oportunidades//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([linhas], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = `${v.titulo}-${of.nome}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.href = url;
  a.download = `entrevista-${slug || c.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function prazoEscolha(c) { return Radar.somarDias(Radar.hoje(), c.prazoEscolhaDias); }

/* ---------- Lista lateral ---------- */
const STATUS = {
  escolher:   (c) => `<span class="etiqueta alerta"><i class="ti ti-clock-exclamation"></i>Escolha até ${Radar.fmtDia(prazoEscolha(c))}</span>`,
  marcada:    (c) => `<span class="etiqueta sucesso"><i class="ti ti-calendar-check"></i>${descreverEntrevistaCurta(c)}</span>`,
  aguardando: ()  => `<span class="etiqueta neutra"><i class="ti ti-hourglass"></i>Aguardando horários</span>`,
  cancelada:  ()  => `<span class="etiqueta perigo"><i class="ti ti-ban"></i>Candidatura cancelada</span>`,
  desistiu:   ()  => `<span class="etiqueta neutra"><i class="ti ti-door-exit"></i>Você desistiu</span>`,
};

function descreverEntrevistaCurta(c) {
  const h = c.horarios.find((x) => x.id === c.entrevista);
  return h ? `${Radar.fmtDia(dataDe(h))}, ${h.ini}` : "Entrevista marcada";
}

function renderLista() {
  $("#lista").innerHTML = candidaturas.map((c) => {
    const v = vagaDe(c), of = ofertanteDe(c);
    return `
    <button class="item-cand ${c.id === atualId ? "ativo" : ""}" data-cand="${c.id}" aria-current="${c.id === atualId}">
      <span class="logo-ofertante" style="background:${of.cor}">${sigla(of)}</span>
      <span class="item-cand-texto">
        <span class="item-cand-titulo">${v.titulo}</span>
        <span class="item-cand-of" style="display:block">${of.nome}</span>
        ${STATUS[c.status](c)}
      </span>
    </button>`;
  }).join("");
}

/* ---------- Detalhe ---------- */
function renderTopoVaga(c) {
  const v = vagaDe(c), of = ofertanteDe(c), t = TIPOS[v.tipo];
  const naoLidas = c.mensagens.length && c.mensagens[c.mensagens.length - 1].de === "ofertante" && !c.conversaLida;
  return `
  <div class="bloco vaga-topo">
    <span class="logo-ofertante" style="background:${of.cor}">${sigla(of)}</span>
    <div class="vaga-topo-texto">
      <span class="etiqueta ${v.tipo}"><i class="ti ${t.icone}"></i>${t.nome}</span>
      <h2>${v.titulo}</h2>
      <div class="ofertante">${of.nome} · ${of.tipo}</div>
      <div class="vaga-meta">
        <span><i class="ti ${c.formato.startsWith("Online") ? "ti-video" : "ti-map-pin"}"></i>${c.formato}</span>
        <span><i class="ti ti-clock"></i>${c.duracao} min</span>
        <span><i class="ti ti-user"></i>${c.entrevistador}</span>
      </div>
    </div>
    <button class="btn btn-conversa" data-acao="conversa">
      <i class="ti ti-message-circle"></i> Conversar
      ${naoLidas ? '<span class="ponto" aria-label="Mensagem nova"></span>' : ""}
    </button>
  </div>`;
}

function renderAvisos(c) {
  return `<div class="avisos">${c.avisos.map((a) => `
    <div class="aviso ${a.tipo}">
      <i class="ti ${a.icone}"></i>
      <div class="aviso-corpo">${a.texto}
        ${a.acao === "confirmar-presenca" ? `<div class="aviso-acoes"><button class="btn btn-primario" data-acao="confirmar-presenca" data-aviso="${a.id}"><i class="ti ti-check"></i> Ainda posso comparecer</button><button class="btn" data-acao="remarcar">Escolher outro horário</button></div>` : ""}
      </div>
      ${a.acao ? "" : `<button class="btn btn-texto btn-icone fechar-aviso" data-acao="fechar-aviso" data-aviso="${a.id}" aria-label="Dispensar aviso"><i class="ti ti-x"></i></button>`}
    </div>`).join("")}</div>`;
}

function renderEscolher(c) {
  const prazo = prazoEscolha(c);
  const faltam = Radar.diasAte(prazo);
  const ultimaSemana = Math.max(0, ...c.horarios.map((h) => Math.floor(h.d / 7)));
  semana = Math.min(semana, ultimaSemana);
  const ini = Radar.somarDias(BASE, semana * 7);
  const fim = Radar.somarDias(ini, 4);
  const sel = c.horarios.find((h) => h.id === selecionado);
  const livres = c.horarios.filter((h) => h.status === "livre").length;

  const colunas = [0, 1, 2, 3, 4].map((i) => {
    const d = semana * 7 + i;
    const data = Radar.somarDias(BASE, d);
    const doDia = c.horarios
      .filter((h) => h.d === d)
      .filter((h) => !(ocultarConflitos && h.status === "livre" && conflito(h, c)))
      .sort((a, b) => minutos(a.ini) - minutos(b.ini));
    const slots = doDia.map((h) => {
      const aula = h.status === "livre" && conflito(h, c);
      const ent = h.status === "livre" && conflitoEntrevista(h, c);
      const temConflito = Boolean(aula || ent);
      const classes = ["slot", h.status === "ocupado" ? "ocupado" : "", temConflito ? "conflito" : "", h.id === selecionado ? "selecionado" : ""].join(" ");
      const partesTitulo = [];
      if (aula) partesTitulo.push(`Conflita com sua aula: ${aula.disciplina} (${aula.ini}–${aula.fim})`);
      if (ent) partesTitulo.push(`Conflita com entrevista de ${ent.vaga.titulo} (${ent.horario.ini}–${fimDe(ent.horario, ent.candidatura)})`);
      const titulo = h.status === "ocupado" ? "Horário já reservado por outro candidato"
        : partesTitulo.length ? partesTitulo.join(" · ") : "Disponível";
      const rotuloCurto = aula && ent ? '<i class="ti ti-alert-triangle"></i> aula + entrevista'
        : aula ? '<i class="ti ti-alert-triangle"></i> aula'
        : ent ? '<i class="ti ti-alert-triangle"></i> entrevista'
        : `até ${fimDe(h, c)}`;
      return `<button class="${classes}" data-slot="${h.id}" title="${titulo}" ${h.status === "ocupado" ? 'aria-disabled="true"' : ""} aria-pressed="${h.id === selecionado}">
        ${h.ini}<small>${rotuloCurto}</small>
        ${h.novo ? '<span class="selo-novo">novo</span>' : ""}
      </button>`;
    }).join("");
    return `
    <div class="dia-col">
      <div class="dia-cab"><strong>${data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</strong><small>${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small></div>
      <div class="dia-slots">${slots || '<span class="dia-vazio">Sem horários</span>'}</div>
    </div>`;
  }).join("");

  return `
  <div class="bloco">
    <div class="agenda-topo">
      <div>
        <h3>Escolha um horário para a entrevista</h3>
        <p class="prazo-escolha ${faltam <= 2 ? "urgente" : ""}"><i class="ti ti-hourglass"></i>
          Escolha até ${Radar.fmtDiaLongo(prazo)} · ${faltam <= 0 ? "último dia" : faltam === 1 ? "falta 1 dia" : `faltam ${faltam} dias`}.
          Depois disso a candidatura é cancelada automaticamente.</p>
      </div>
      <div class="nav-semana">
        <button class="btn btn-icone" data-acao="semana-ant" aria-label="Semana anterior" ${semana === 0 ? "disabled" : ""}><i class="ti ti-chevron-left"></i></button>
        <span>${ini.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
        <button class="btn btn-icone" data-acao="semana-prox" aria-label="Próxima semana" ${semana >= ultimaSemana ? "disabled" : ""}><i class="ti ti-chevron-right"></i></button>
      </div>
    </div>
    <div class="legenda">
      <span><span class="amostra livre"></span>Disponível</span>
      <span><span class="amostra conflito"></span>Conflita com suas aulas <a href="perfil.html#grade" style="font-weight:600">(editar grade)</a></span>
      <span><span class="amostra ocupado"></span>Reservado</span>
      <span><span class="amostra selecionado"></span>Selecionado</span>
      <label><input type="checkbox" data-acao="ocultar" ${ocultarConflitos ? "checked" : ""}> Ocultar horários que conflitam com minhas aulas</label>
    </div>
    <div class="semana">${colunas}</div>
    ${sel ? (() => {
      const cAula = conflito(sel, c);
      const cEnt = conflitoEntrevista(sel, c);
      const avisosConflito = [];
      if (cAula) avisosConflito.push(`conflita com uma aula (${cAula.disciplina})`);
      if (cEnt) avisosConflito.push(`conflita com outra entrevista (${cEnt.vaga.titulo}, ${cEnt.horario.ini}–${fimDe(cEnt.horario, cEnt.candidatura)})`);
      return `<div class="barra-confirmar pronta"><span>Horário selecionado: <strong>${Radar.fmtDiaLongo(dataDe(sel))}, ${sel.ini}–${fimDe(sel, c)}</strong>${avisosConflito.length ? ` · <span style='color:var(--alerta-tx)'>${avisosConflito.join(" e ")}</span>` : ""}</span>
         <button class="btn btn-primario" data-acao="confirmar"><i class="ti ti-calendar-check"></i> Confirmar horário</button></div>`;
    })()
      : `<div class="barra-confirmar"><span><i class="ti ti-hand-click"></i> ${livres ? `Selecione um dos ${livres} horários disponíveis.` : "Não há horários livres no momento."}</span></div>`}
  </div>

  <div class="bloco alternativas">
    <div>
      <h3>Nenhum horário é compatível com sua rotina?</h3>
      <p>Explique sua situação ao ofertante e sugira alternativas pela conversa.</p>
    </div>
    <div class="acoes">
      <button class="btn" data-acao="sem-horario"><i class="ti ti-message-circle"></i> Falar com o ofertante</button>
      <button class="btn btn-texto perigo" data-acao="desistir">Desistir da vaga</button>
    </div>
  </div>`;
}

function renderMarcada(c) {
  const h = c.horarios.find((x) => x.id === c.entrevista);
  const data = dataDe(h);
  return `
  <div class="bloco estado">
    <div class="estado-icone sucesso"><i class="ti ti-calendar-check"></i></div>
    <h3>Entrevista marcada</h3>
    <p>${ofertanteDe(c).nome} foi notificado. Você recebe um lembrete um dia antes.</p>
    <div class="resumo-entrevista">
      <div><small>Data</small><strong style="text-transform:capitalize">${Radar.fmtDiaLongo(data)}</strong></div>
      <div><small>Horário</small><strong>${h.ini}–${fimDe(h, c)}</strong></div>
      <div><small>Formato</small><strong>${c.formato}</strong></div>
      <div><small>Entrevistador</small><strong>${c.entrevistador}</strong></div>
    </div>
    <div class="acoes">
      ${c.adicionadoCalendario
        ? '<button class="btn" disabled><i class="ti ti-calendar-check"></i> Entrevista adicionada ao calendário</button>'
        : '<button class="btn btn-primario" data-acao="calendario"><i class="ti ti-calendar-plus"></i> Adicionar ao calendário</button>'}
      <button class="btn" data-acao="remarcar"><i class="ti ti-calendar-repeat"></i> Trocar horário</button>
      <button class="btn btn-texto perigo" data-acao="desistir">Desistir da vaga</button>
    </div>
  </div>`;
}

function renderAguardando(c) {
  const divulgacao = prazoEscolha(c);
  return `
  <div class="bloco estado">
    <div class="estado-icone neutro"><i class="ti ti-hourglass"></i></div>
    <h3>O ofertante ainda não disponibilizou horários</h3>
    <p>Os selecionados devem ser divulgados até <strong>${Radar.fmtDiaLongo(divulgacao)}</strong>.
      Você será notificado assim que a agenda de entrevistas for publicada.</p>
    <div class="acoes">
      ${c.solicitouHorarios
        ? `<span class="etiqueta sucesso" style="padding:8px 12px"><i class="ti ti-check"></i>Solicitação enviada ao ofertante</span>
           <button class="btn" data-acao="conversa"><i class="ti ti-message-circle"></i> Abrir conversa</button>`
        : `<button class="btn btn-primario" data-acao="solicitar"><i class="ti ti-send"></i> Solicitar horários ao ofertante</button>`}
      <button class="btn btn-texto perigo" data-acao="desistir">Desistir da vaga</button>
    </div>
  </div>`;
}

function renderEncerrada(c, desistiu) {
  return `
  <div class="bloco estado">
    <div class="estado-icone ${desistiu ? "neutro" : "perigo"}"><i class="ti ${desistiu ? "ti-door-exit" : "ti-ban"}"></i></div>
    <h3>${desistiu ? "Você desistiu desta vaga" : "Candidatura cancelada"}</h3>
    <p>${c.motivo}</p>
    <div class="acoes"><a class="btn btn-primario" href="mural.html"><i class="ti ti-layout-grid"></i> Ver outras oportunidades</a></div>
  </div>`;
}

function renderDetalhe() {
  const c = atual();
  const corpo = {
    escolher: renderEscolher,
    marcada: renderMarcada,
    aguardando: renderAguardando,
    cancelada: (x) => renderEncerrada(x, false),
    desistiu: (x) => renderEncerrada(x, true),
  }[c.status](c);
  $("#detalhe").innerHTML = renderTopoVaga(c) + renderAvisos(c) + corpo;
}

function render() {
  if (!candidaturas.length) {
    $("#lista").innerHTML = '<p style="font-size:14px;color:var(--texto-3);padding:8px 4px">Nenhuma candidatura na etapa de entrevista.</p>';
    $("#detalhe").innerHTML = `<div class="bloco estado"><div class="estado-icone neutro"><i class="ti ti-calendar-event"></i></div>
      <h3>Nenhuma entrevista por enquanto</h3>
      <p>Quando um ofertante pré-selecionar você, a agenda de entrevistas aparece aqui para você escolher um horário.</p>
      <div class="acoes"><a class="btn btn-primario" href="mural.html"><i class="ti ti-layout-grid"></i> Procurar vagas</a><a class="btn" href="candidaturas.html">Minhas candidaturas</a></div></div>`;
    return;
  }
  renderLista();
  renderDetalhe();
  if (conversaAberta) renderConversa();
}

/* ---------- Ações do estudante ---------- */
function selecionarCandidatura(id) {
  atualId = id;
  selecionado = null;
  semana = 0;
  history.replaceState(null, "", `?c=${id}`);
  render();
}

function aviso(c, tipo, icone, texto, acao) {
  c.avisos.unshift({ id: Date.now() + Math.random(), tipo, icone, texto, acao });
}

function confirmarHorario() {
  const c = atual();
  const h = c.horarios.find((x) => x.id === selecionado);
  if (!h || h.status !== "livre") return;
  h.status = "meu";                 // passo 5: sai da agenda dos demais
  h.novo = false;
  c.entrevista = h.id;
  c.adicionadoCalendario = false;
  c.status = "marcada";             // passo 6
  c.avisos = c.avisos.filter((a) => a.tipo !== "perigo");
  selecionado = null;
  salvar();
  $("#modal-confirmar").close();
  Radar.notificar(`Entrevista marcada com <b>${ofertanteDe(c).nome}</b>: ${descrever(h, c)}.`, "ti-calendar-check", `agenda.html?c=${c.id}`);
  avisarOfertante(c, `<b>${NOME_ESTUDANTE}</b> marcou entrevista para ${descrever(h, c)}.`, "ti-calendar-check");
  Radar.toast("Entrevista marcada. O ofertante foi notificado.", "ti-circle-check");
  render();
}

function liberarHorario(c) {
  const h = c.horarios.find((x) => x.id === c.entrevista);
  if (h) h.status = "livre";
  c.entrevista = null;
}

function enviarMensagem(c, texto) {
  c.mensagens.push({ de: "eu", texto, quando: "agora" });
  c.ofertanteLeu = false;
  salvar();
  avisarOfertante(c, `<b>${NOME_ESTUDANTE}</b> enviou uma mensagem: “${texto.length > 70 ? texto.slice(0, 70) + "…" : texto}”`, "ti-message-circle");
  Radar.toast(`Mensagem enviada. ${ofertanteDe(c).nome} foi notificado.`, "ti-send");
  render();
  simularResposta(c);
}

// Fluxo alternativo 1: estudante sem horário compatível → ofertante abre novos horários.
function simularResposta(c) {
  if (ofertanteReal(c)) return;   // do outro lado há uma pessoa: ela responde pela tela dela
  if (Radar.ambiente !== "demo" || c.id !== 1) return respostaGenerica(c);
  if (c.status !== "escolher" || c.respondeu) return;
  c.respondeu = true;
  setTimeout(() => {
    if (conversaAberta && atualId === c.id) $("#mensagens").insertAdjacentHTML("beforeend", '<span class="digitando">Mariana está digitando…</span>');
  }, 900);
  setTimeout(() => {
    c.mensagens.push({ de: "ofertante", texto: "Sem problemas! Abri dois horários na sexta de manhã. Veja se algum serve para você.", quando: "agora" });
    c.conversaLida = conversaAberta && atualId === c.id;
    adicionarHorarios(c, [{ d: 4, ini: "08:30" }, { d: 4, ini: "09:00" }]);
    aviso(c, "info", "ti-calendar-plus", `<b>${ofertanteDe(c).nome}</b> adicionou 2 novos horários na agenda (marcados como <b>novo</b>).`);
    salvar();
    Radar.notificar(`<b>${ofertanteDe(c).nome}</b> respondeu e adicionou novos horários de entrevista.`, "ti-calendar-plus", `agenda.html?c=${c.id}`);
    render();
  }, 2600);
}

function respostaGenerica(c) {
  setTimeout(() => {
    c.mensagens.push({ de: "ofertante", texto: "Recebemos sua mensagem. Respondemos em breve!", quando: "agora" });
    c.conversaLida = conversaAberta && atualId === c.id;
    salvar();
    if (!c.conversaLida) Radar.notificar(`<b>${ofertanteDe(c).nome}</b> respondeu sua mensagem.`, "ti-message-circle", `agenda.html?c=${c.id}`);
    render();
  }, 2400);
}

function adicionarHorarios(c, novos) {
  let prox = Math.max(0, ...c.horarios.map((h) => h.id)) + 1;
  novos.forEach((n) => {
    if (!c.horarios.some((h) => h.d === n.d && h.ini === n.ini)) {
      c.horarios.push({ id: prox++, d: n.d, ini: n.ini, status: "livre", novo: true });
    }
  });
}

/* ---------- Eventos simulados (painel de apresentação) ---------- */
const EVENTOS = {
  // Critério de aceitação: notificar alterações feitas por outros estudantes.
  reserva(c) {
    if (c.status !== "escolher") return "Abra uma candidatura com horários para escolher.";
    const livres = c.horarios.filter((h) => h.status === "livre");
    if (!livres.length) return "Não há horários livres para reservar.";
    const h = livres.find((x) => x.id === selecionado) || livres[Math.floor(Math.random() * livres.length)];
    h.status = "ocupado"; h.novo = false;
    const eraMeu = h.id === selecionado;
    if (eraMeu) selecionado = null;
    aviso(c, eraMeu ? "alerta" : "info", "ti-user-check",
      eraMeu
        ? `O horário que você tinha selecionado (<b>${descrever(h, c)}</b>) acabou de ser reservado por outro candidato. Escolha outro.`
        : `Outro candidato reservou <b>${descrever(h, c)}</b>. A agenda foi atualizada.`);
    Radar.notificar(`Agenda de <b>${ofertanteDe(c).nome}</b> atualizada: ${descrever(h, c)} foi reservado por outro candidato.`, "ti-user-check", `agenda.html?c=${c.id}`);
    return null;
  },

  // Fluxo alternativo 3 / CT03: ofertante muda a agenda; estudantes são notificados.
  altera(c) {
    if (c.status === "cancelada" || c.status === "desistiu") return "Esta candidatura já foi encerrada.";
    const of = ofertanteDe(c).nome;
    const antes = c.horarios.length;
    adicionarHorarios(c, [{ d: 2, ini: "17:00" }, { d: 3, ini: "09:30" }, { d: 9, ini: "15:00" }]);
    const adicionados = c.horarios.length - antes;
    const removivel = c.horarios.find((h) => h.status === "livre" && !h.novo && h.id !== selecionado);
    if (removivel) c.horarios = c.horarios.filter((h) => h !== removivel);

    if (c.status === "aguardando") {
      c.status = "escolher";
      c.prazoEscolhaDias = 3;
      aviso(c, "info", "ti-calendar-plus", `<b>${of}</b> publicou a agenda de entrevistas. Escolha um horário.`);
    } else if (c.status === "marcada") {
      const h = c.horarios.find((x) => x.id === c.entrevista);
      aviso(c, "alerta", "ti-calendar-cog",
        `<b>${of}</b> alterou a agenda de entrevistas. Seu horário (<b>${descrever(h, c)}</b>) continua reservado. Confirme que ainda pode comparecer.`,
        "confirmar-presenca");
    } else {
      aviso(c, "info", "ti-calendar-cog",
        `<b>${of}</b> alterou a agenda: ${adicionados} ${adicionados === 1 ? "novo horário" : "novos horários"} (marcados como <b>novo</b>)${removivel ? ` e ${descrever(removivel, c)} foi removido` : ""}.`);
    }
    Radar.notificar(`<b>${of}</b> alterou os horários de entrevista.`, "ti-calendar-cog", `agenda.html?c=${c.id}`);
    return null;
  },

  // Fluxo alternativo 5: ofertante cancela a entrevista com uma explicação.
  cancela(c) {
    if (c.status !== "marcada") return "Abra uma candidatura com entrevista marcada.";
    const h = c.horarios.find((x) => x.id === c.entrevista);
    const quando = descrever(h, c);
    const motivo = "Tivemos um imprevisto na equipe e precisamos remarcar. Desculpe o transtorno!";
    c.horarios = c.horarios.filter((x) => x !== h);   // o ofertante removeu o horário
    c.entrevista = null;
    c.adicionadoCalendario = false;
    c.status = "escolher";
    c.prazoEscolhaDias = 3;
    c.mensagens.push({ de: "ofertante", texto: motivo, quando: "agora" });
    c.conversaLida = false;
    aviso(c, "perigo", "ti-calendar-x", `<b>${ofertanteDe(c).nome}</b> cancelou sua entrevista de <b>${quando}</b>.<br>Motivo: “${motivo}”<br>Escolha outro horário disponível.`);
    Radar.notificar(`<b>${ofertanteDe(c).nome}</b> cancelou sua entrevista de ${quando}. Escolha outro horário.`, "ti-calendar-x", `agenda.html?c=${c.id}`);
    return null;
  },

  // Fluxo alternativo 6 / CT07: prazo expirou sem escolha → candidatura cancelada.
  expira(c) {
    if (c.status !== "escolher") return "Abra uma candidatura que ainda aguarda a escolha de horário.";
    c.status = "cancelada";
    c.motivo = `Você não escolheu um horário de entrevista até o prazo (${Radar.fmtDia(prazoEscolha(c))}). A candidatura foi cancelada automaticamente pelo sistema.`;
    c.avisos = [];
    selecionado = null;
    Radar.notificar(`Sua candidatura para <b>${vagaDe(c).titulo}</b> foi cancelada: o prazo para escolher o horário expirou.`, "ti-ban", `agenda.html?c=${c.id}`);
    return null;
  },

  reiniciar() {
    Radar.reiniciarTudo();
    candidaturas = clonar(CANDIDATURAS_INICIAIS);
    selecionado = null; semana = 0;
    Radar.toast("Demonstração reiniciada.", "ti-refresh");
    return null;
  },
};

/* ---------- Conversa ---------- */
function respostasRapidas(c) {
  const of = ofertanteDe(c).nome;
  if (c.status === "escolher") return [
    "Nenhum dos horários é compatível com minhas aulas. Seria possível um horário na sexta?",
    "Posso fazer a entrevista online em outro horário?",
  ];
  if (c.status === "aguardando") return [
    "Olá! O prazo de divulgação está próximo. Poderia disponibilizar os horários de entrevista?",
  ];
  if (c.status === "marcada") return ["Confirmo minha presença. Obrigado!", "Preciso levar algum documento?"];
  return [];
}

function renderConversa() {
  const c = atual(), of = ofertanteDe(c);
  c.conversaLida = true;
  $("#conversa-cab").innerHTML = `
    <span class="logo-ofertante" style="background:${of.cor}">${sigla(of)}</span>
    <span><strong>${of.nome}</strong><small>${vagaDe(c).titulo}</small></span>
    <button class="btn btn-texto btn-icone" data-acao="fechar-conversa" aria-label="Fechar conversa"><i class="ti ti-x" style="font-size:20px"></i></button>`;
  $("#mensagens").innerHTML = c.mensagens.length
    ? c.mensagens.map((m) => `<div class="msg ${m.de}">${m.texto}<small>${m.quando}</small></div>`).join("")
    : `<p class="msg-vazia"><i class="ti ti-message-circle" style="font-size:28px;display:block;margin-bottom:6px"></i>Nenhuma mensagem ainda.<br>Tire suas dúvidas sobre a vaga com ${of.nome}.</p>`;
  $("#mensagens").scrollTop = $("#mensagens").scrollHeight;
  $("#respostas-rapidas").innerHTML = respostasRapidas(c).map((r) => `<button type="button">${r}</button>`).join("");
}

function abrirConversa(textoInicial = "") {
  conversaAberta = true;
  renderConversa();
  $("#conversa").classList.add("aberta");
  $("#conversa").setAttribute("aria-hidden", "false");
  $("#fundo-gaveta").hidden = false;
  $("#conversa-texto").value = textoInicial;
  setTimeout(() => $("#conversa-texto").focus(), 250);
  salvar();
  renderLista(); renderDetalhe();
}

function fecharConversa() {
  conversaAberta = false;
  $("#conversa").classList.remove("aberta");
  $("#conversa").setAttribute("aria-hidden", "true");
  $("#fundo-gaveta").hidden = true;
}

/* ---------- Ligações de eventos ---------- */
$("#lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cand]");
  if (b) selecionarCandidatura(Number(b.dataset.cand));
});

$("#detalhe").addEventListener("click", (e) => {
  const c = atual();
  const slot = e.target.closest("[data-slot]");
  if (slot) {
    const h = c.horarios.find((x) => x.id === Number(slot.dataset.slot));
    if (h.status === "ocupado") {
      slot.classList.remove("saiu"); void slot.offsetWidth; slot.classList.add("saiu");
      return Radar.toast("Este horário já foi reservado por outro candidato.", "ti-lock");
    }
    selecionado = selecionado === h.id ? null : h.id;
    return renderDetalhe();
  }

  const b = e.target.closest("[data-acao]");
  if (!b) return;
  switch (b.dataset.acao) {
    case "semana-ant": semana = Math.max(0, semana - 1); renderDetalhe(); break;
    case "semana-prox": semana += 1; renderDetalhe(); break;
    case "ocultar": ocultarConflitos = b.checked; renderDetalhe(); break;
    case "confirmar": {
      const h = c.horarios.find((x) => x.id === selecionado);
      const aula = conflito(h, c);
      const ent = conflitoEntrevista(h, c);
      const alertas = [];
      if (aula) alertas.push(`Conflita com ${aula.disciplina} (${aula.ini}–${aula.fim})`);
      if (ent) alertas.push(`Conflita com outra entrevista em "${ent.vaga.titulo}" (${ent.horario.ini}–${fimDe(ent.horario, ent.candidatura)})`);
      $("#mc-resumo").innerHTML = `
        <div><small>Data</small><strong style="text-transform:capitalize">${Radar.fmtDiaLongo(dataDe(h))}</strong></div>
        <div><small>Horário</small><strong>${h.ini}–${fimDe(h, c)}</strong></div>
        <div style="grid-column:1/-1"><small>Formato</small><strong>${c.formato}</strong></div>
        ${alertas.length ? `<div style="grid-column:1/-1;background:var(--alerta-bg);border-color:#f1d7a6"><small style="color:var(--alerta-tx)">Atenção</small><strong style="color:var(--alerta-tx)">${alertas.join(" · ")}</strong></div>` : ""}`;
      $("#modal-confirmar").showModal();
      break;
    }
    case "remarcar":
      if (c.entrevista) avisarOfertante(c, `<b>${NOME_ESTUDANTE}</b> liberou o horário ${descrever(c.horarios.find((x) => x.id === c.entrevista), c)} para escolher outro.`, "ti-calendar-repeat");
      liberarHorario(c);
      c.adicionadoCalendario = false;
      c.status = "escolher";
      c.avisos = c.avisos.filter((a) => a.acao !== "confirmar-presenca");
      salvar(); render();
      Radar.toast("Horário liberado. Escolha um novo horário na agenda.", "ti-calendar-repeat");
      break;
    case "calendario": {
      const h = c.horarios.find((x) => x.id === c.entrevista);
      if (h) gerarEbaixarICS(c, h);
      c.adicionadoCalendario = true;
      salvar();
      render();
      Radar.toast("Arquivo .ics gerado e entrevista adicionada ao calendário.", "ti-calendar-check");
      break;
    }
    case "conversa": abrirConversa(); break;
    case "sem-horario": abrirConversa(respostasRapidas(c)[0]); break;
    case "solicitar":
      c.solicitouHorarios = true;
      enviarMensagem(c, respostasRapidas(c)[0]);
      break;
    case "desistir":
      $("#md-motivo").value = "";
      $("#md-erro").textContent = "";
      $("#modal-desistir").showModal();
      break;
    case "confirmar-presenca":
      c.avisos = c.avisos.filter((a) => String(a.id) !== b.dataset.aviso);
      salvar(); render();
      Radar.toast("Presença confirmada. O ofertante foi notificado.", "ti-check");
      break;
    case "fechar-aviso":
      c.avisos = c.avisos.filter((a) => String(a.id) !== b.dataset.aviso);
      salvar(); renderDetalhe();
      break;
  }
});

// Modais
document.querySelectorAll("dialog.modal").forEach((d) => {
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); });
});
$("#mc-confirmar").addEventListener("click", confirmarHorario);

// Fluxo alternativo 2: desistência, com mensagem obrigatória ao ofertante.
$("#md-motivo").addEventListener("input", () => ($("#md-erro").textContent = ""));
$("#md-confirmar").addEventListener("click", () => {
  const texto = $("#md-motivo").value.trim();
  if (texto.length < 10) {
    $("#md-erro").textContent = "Escreva uma mensagem ao ofertante explicando a desistência.";
    $("#md-motivo").focus();
    return;
  }
  const c = atual();
  liberarHorario(c);
  c.adicionadoCalendario = false;
  selecionado = null;
  c.status = "desistiu";
  c.avisos = [];
  c.motivo = `Sua candidatura saiu da lista de aprovados. Mensagem enviada ao ofertante: “${texto}”`;
  c.mensagens.push({ de: "eu", texto, quando: "agora" });
  c.ofertanteLeu = false;
  salvar();
  avisarOfertante(c, `<b>${NOME_ESTUDANTE}</b> desistiu da vaga: “${texto}”`, "ti-door-exit");
  $("#modal-desistir").close();
  Radar.toast(`Desistência registrada. ${ofertanteDe(c).nome} foi notificado.`, "ti-door-exit");
  render();
});

// Conversa
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
  enviarMensagem(atual(), texto);
});
$("#conversa-texto").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#conversa-form").requestSubmit(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && conversaAberta) fecharConversa(); });

// Painel de simulação
$("#demo-botao").addEventListener("click", () => {
  const p = $("#demo-painel");
  p.hidden = !p.hidden;
  $("#demo-botao").setAttribute("aria-expanded", !p.hidden);
});
$("#demo-painel").addEventListener("click", (e) => {
  const b = e.target.closest("[data-evento]");
  if (!b) return;
  const cAtual = atual();
  if (!cAtual && b.dataset.evento !== "reiniciar") return Radar.toast("Ainda não há entrevistas para simular.", "ti-info-circle");
  const erro = EVENTOS[b.dataset.evento](cAtual);
  if (erro) return Radar.toast(erro, "ti-info-circle");
  salvar(); render();
  $("#demo-painel").hidden = true;
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".demo")) $("#demo-painel").hidden = true;
});

// Clique numa notificação que aponta para esta mesma página
window.addEventListener("radar:navegar", () => {
  const id = Number(new URLSearchParams(location.search).get("c"));
  if (id) selecionarCandidatura(id);
});

// Outra aba (ex.: o ofertante) alterou a agenda: recarrega o estado.
window.addEventListener("radar:sincronizar", (e) => {
  if (e.detail !== "radar:agenda" && e.detail !== null) return;
  candidaturas = Radar.ler("radar:agenda", null) || clonar(CANDIDATURAS_INICIAIS);
  const c = atual();
  if (selecionado && !c.horarios.some((h) => h.id === selecionado && h.status === "livre")) selecionado = null;
  render();
});

render();
