/* ==========================================================
   Mural de Oportunidades — lógica de filtros
   Implementa os critérios de aceitação da Etapa 1.
   ========================================================== */

const $ = (sel) => document.querySelector(sel);
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const CARGA_MAX = 40;

const form = $("#form-filtros");
const el = {
  busca: $("#busca"),
  carga: $("#carga"),
  cargaValor: $("#carga-valor"),
  remuneracao: $("#remuneracao"),
  grupoRegiao: $("#grupo-regiao"),
  regiaoDica: $("#regiao-dica"),
  ordenar: $("#ordenar"),
  grade: $("#grade"),
  vazio: $("#vazio"),
  contagem: $("#contagem"),
  ativos: $("#filtros-ativos"),
  ativosVazio: $("#filtros-ativos-vazio"),
  qtdFiltros: $("#qtd-filtros"),
  painel: $("#painel-filtros"),
  detalhes: $("#detalhes"),
};

/* ---------- Favoritos e candidaturas (só nesta sessão) ---------- */
const favoritos = new Set(lerArmazenado("radar:favoritos"));
const iniciadas = new Set(lerArmazenado("radar:candidaturas"));   // candidaturas feitas pelo mural
const candidaturas = vagasInscritas();

// Vagas em que o estudante já está inscrito: as do mural + as de "Minhas candidaturas" (exceto retiradas).
function vagasInscritas() {
  const minhas = Radar.ler("radar:minhas", null) || CANDIDATURAS_ESTUDANTE;
  const s = new Set([...iniciadas, ...Object.keys(VINCULADAS_AGENDA).map(Number)]);
  minhas.forEach((c) => (c.situacao === "retirada" ? s.delete(c.vaga) : s.add(c.vaga)));
  iniciadas.forEach((v) => s.add(v));
  return s;
}

function lerArmazenado(chave) {
  return Radar.ler(chave, []);
}
function salvarArmazenado(chave, conjunto) {
  Radar.salvar(chave, [...conjunto]);
}

/* ---------- Montagem dos controles ---------- */
function chip(name, value, texto) {
  return `<label class="chip"><input type="checkbox" name="${name}" value="${value}"><span>${texto}</span></label>`;
}
$("#opcoes-area").innerHTML = AREAS.map((a) => chip("area", a, a)).join("");
$("#opcoes-tipo").innerHTML = Object.entries(TIPOS).map(([id, t]) => chip("tipo", id, t.nome)).join("");
$("#opcoes-dias").innerHTML = DIAS.map((d) => chip("dia", d.id, d.nome)).join("");
$("#opcoes-regiao").innerHTML = REGIOES.map(
  (r) => `<label><input type="checkbox" name="regiao" value="${r}"> ${r}</label>`
).join("");

/* ---------- Leitura do estado dos filtros ---------- */
function marcados(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
}

function lerFiltros() {
  const modalidade = form.querySelector('input[name="modalidade"]:checked').value;
  return {
    busca: el.busca.value.trim().toLowerCase(),
    areas: marcados("area"),
    tipos: marcados("tipo"),
    cargaMax: Number(el.carga.value),
    dias: marcados("dia"),
    modalidade,
    // Critério: com modalidade remota, o filtro de região é desconsiderado.
    regioes: modalidade === "remota" ? [] : marcados("regiao"),
    remMin: Number(el.remuneracao.value) || 0,
  };
}

/* ---------- Regras de filtragem (critérios de aceitação) ---------- */
function atende(v, f) {
  // Fluxo principal, passo 2: só oportunidades com inscrições abertas.
  if (v.status !== "aberta") return false;

  if (f.busca) {
    const texto = `${v.titulo} ${OFERTANTES[v.ofertante].nome} ${v.area}`.toLowerCase();
    if (!texto.includes(f.busca)) return false;
  }

  // Área de atuação corresponde à selecionada.
  if (f.areas.length && !f.areas.includes(v.area)) return false;

  if (f.tipos.length && !f.tipos.includes(v.tipo)) return false;

  // Carga horária semanal menor ou igual à informada.
  if (v.cargaHoraria > f.cargaMax) return false;

  // Todos os dias de trabalho estão entre os dias selecionados.
  if (f.dias.length && !v.dias.every((d) => f.dias.includes(d))) return false;

  // Modalidade igual à selecionada ("qualquer" aceita ambas).
  if (f.modalidade !== "qualquer" && v.modalidade !== f.modalidade) return false;

  // Vagas presenciais: localização em uma das regiões (nenhuma = qualquer região).
  if (v.modalidade === "presencial" && f.regioes.length && !f.regioes.includes(v.regiao)) return false;

  // Remuneração maior ou igual ao mínimo informado.
  if (v.remuneracao < f.remMin) return false;

  return true;
}

const ORDENACOES = {
  recentes: (a, b) => a.publicadaHaDias - b.publicadaHaDias,
  prazo: (a, b) => a.prazoDias - b.prazoDias,
  remuneracao: (a, b) => b.remuneracao - a.remuneracao,
  carga: (a, b) => a.cargaHoraria - b.cargaHoraria,
};

/* ---------- Filtros ativos (pílulas removíveis) ---------- */
function filtrosAtivos(f) {
  const lista = [];
  const desmarcar = (name, value) => () => {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = false;
  };
  if (f.busca) lista.push({ texto: `“${el.busca.value.trim()}”`, remover: () => (el.busca.value = "") });
  f.areas.forEach((a) => lista.push({ texto: a, remover: desmarcar("area", a) }));
  f.tipos.forEach((t) => lista.push({ texto: TIPOS[t].nome, remover: desmarcar("tipo", t) }));
  if (f.cargaMax < CARGA_MAX) lista.push({ texto: `Até ${f.cargaMax}h/semana`, remover: () => (el.carga.value = CARGA_MAX) });
  if (f.dias.length) {
    const nomes = DIAS.filter((d) => f.dias.includes(d.id)).map((d) => d.nome).join(", ");
    lista.push({ texto: `Dias: ${nomes}`, remover: () => form.querySelectorAll('input[name="dia"]').forEach((i) => (i.checked = false)) });
  }
  if (f.modalidade !== "qualquer") {
    lista.push({
      texto: f.modalidade === "remota" ? "Remota" : "Presencial",
      remover: () => (form.querySelector('input[name="modalidade"][value="qualquer"]').checked = true),
    });
  }
  f.regioes.forEach((r) => lista.push({ texto: r, remover: desmarcar("regiao", r) }));
  if (f.remMin) lista.push({ texto: `A partir de ${brl.format(f.remMin)}`, remover: () => (el.remuneracao.value = "") });
  return lista;
}

function renderizarPilulas(container, lista) {
  container.innerHTML = "";
  lista.forEach((item) => {
    const p = document.createElement("span");
    p.className = "pilula";
    p.innerHTML = `${item.texto}<button type="button" aria-label="Remover filtro ${item.texto}"><i class="ti ti-x"></i></button>`;
    p.querySelector("button").addEventListener("click", () => { item.remover(); atualizar(); });
    container.appendChild(p);
  });
}

/* ---------- Cartões ---------- */
function iniciais(nome, sigla) {
  if (sigla) return sigla;
  return nome.split(" ").filter((p) => p.length > 2 || p === p.toUpperCase()).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function textoPrazo(dias) {
  if (dias <= 0) return "Encerra hoje";
  if (dias === 1) return "Encerra amanhã";
  return `Encerra em ${dias} dias`;
}

function dataPrazo(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function miniDias(dias) {
  return `<span class="dias-semana" aria-label="Dias: ${DIAS.filter((d) => dias.includes(d.id)).map((d) => d.nome).join(", ")}">${
    DIAS.map((d) => `<span class="${dias.includes(d.id) ? "on" : ""}" title="${d.nome}">${d.curto}</span>`).join("")
  }</span>`;
}

function textoLocal(v) {
  return v.modalidade === "remota" ? "Remota" : `Presencial · ${v.regiao}`;
}

function cartao(v) {
  const of = OFERTANTES[v.ofertante];
  const tipo = TIPOS[v.tipo];
  const fav = favoritos.has(v.id);
  const inscrito = candidaturas.has(v.id);
  return `
  <article class="cartao" data-id="${v.id}">
    <div class="cartao-topo">
      <div class="logo-ofertante" style="background:${of.cor}">${iniciais(of.nome, of.sigla)}</div>
      <div class="cartao-titulos">
        <h3>${v.titulo}</h3>
        <div class="ofertante">${of.nome} <i class="ti ti-rosette-discount-check" title="Ofertante verificado pela universidade"></i></div>
      </div>
      <button class="btn btn-texto btn-icone favorito ${fav ? "ativo" : ""}" data-acao="favoritar" aria-pressed="${fav}" aria-label="Favoritar">
        <i class="ti ${fav ? "ti-heart-filled" : "ti-heart"}" style="font-size:20px"></i>
      </button>
    </div>
    <div class="cartao-etiquetas">
      <span class="etiqueta ${v.tipo}"><i class="ti ${tipo.icone}"></i>${tipo.nome}</span>
      <span class="etiqueta" style="background:var(--superficie-2);color:var(--texto-2)">${v.area}</span>
      ${inscrito ? '<span class="etiqueta sucesso"><i class="ti ti-check"></i>Inscrito</span>' : ""}
    </div>
    <div class="cartao-info">
      <div><i class="ti ti-cash"></i><span class="valor">${brl.format(v.remuneracao)}</span>/mês</div>
      <div><i class="ti ti-clock"></i><span class="valor">${v.cargaHoraria}h</span>/semana</div>
      <div><i class="ti ${v.modalidade === "remota" ? "ti-world" : "ti-map-pin"}"></i>${textoLocal(v)}</div>
      <div><i class="ti ti-calendar-week"></i>${miniDias(v.dias)}</div>
    </div>
    <div class="cartao-rodape">
      <span class="prazo ${v.prazoDias <= 4 ? "urgente" : ""}"><i class="ti ti-hourglass"></i>${textoPrazo(v.prazoDias)}</span>
      <button class="btn" data-acao="detalhes">Ver detalhes <i class="ti ti-arrow-right"></i></button>
    </div>
  </article>`;
}

/* ---------- Atualização geral ---------- */
function atualizar() {
  const f = lerFiltros();

  // Critério: quando a modalidade é remota, o filtro de região não é exibido.
  el.grupoRegiao.hidden = f.modalidade === "remota";
  el.regiaoDica.textContent = f.regioes.length ? `${f.regioes.length} selecionada(s)` : "Qualquer";
  el.cargaValor.textContent = f.cargaMax >= CARGA_MAX ? "Qualquer" : `até ${f.cargaMax}h`;

  const resultado = OPORTUNIDADES.filter((v) => atende(v, f)).sort(ORDENACOES[el.ordenar.value]);
  const ativos = filtrosAtivos(f);

  el.contagem.innerHTML = resultado.length === 1
    ? "<strong>1</strong> oportunidade com inscrições abertas"
    : `<strong>${resultado.length}</strong> oportunidades com inscrições abertas`;
  el.qtdFiltros.textContent = ativos.length ? `(${ativos.length})` : "";

  renderizarPilulas(el.ativos, ativos);

  if (resultado.length) {
    el.grade.innerHTML = resultado.map(cartao).join("");
    el.grade.hidden = false;
    el.vazio.hidden = true;
  } else {
    // Critério: mensagem de "nenhuma oportunidade" + sugestão de remover filtros.
    el.grade.innerHTML = "";
    el.grade.hidden = true;
    el.vazio.hidden = false;
    renderizarPilulas(el.ativosVazio, ativos);
  }
}

function limparFiltros() {
  form.reset();
  el.busca.value = "";
  el.remuneracao.value = "";
  el.carga.value = CARGA_MAX;
  atualizar();
}

/* ---------- Modal de detalhes ---------- */
function abrirDetalhes(id) {
  const v = OPORTUNIDADES.find((o) => o.id === id);
  const of = OFERTANTES[v.ofertante];
  const tipo = TIPOS[v.tipo];
  const aberta = v.status === "aberta";
  const inscrito = candidaturas.has(v.id);

  el.detalhes.innerHTML = `
    <div class="det-cabecalho">
      <div class="logo-ofertante" style="background:${of.cor}">${iniciais(of.nome, of.sigla)}</div>
      <div>
        <span class="etiqueta ${v.tipo}" style="margin-bottom:6px"><i class="ti ${tipo.icone}"></i>${tipo.nome}${v.regime ? ` · ${v.regime}` : ""}</span>
        <h2 id="det-titulo">${v.titulo}</h2>
        <div class="ofertante">${of.nome} · ${of.tipo} <i class="ti ti-rosette-discount-check" title="Ofertante verificado pela universidade"></i></div>
      </div>
      <button class="btn btn-texto btn-icone det-fechar" data-acao="fechar" aria-label="Fechar"><i class="ti ti-x" style="font-size:20px"></i></button>
    </div>
    <div class="det-corpo">
      ${aberta ? "" : `<div class="etiqueta alerta" style="border-radius:var(--raio);padding:10px 12px;font-size:14px"><i class="ti ti-lock"></i>Inscrições encerradas: ${v.motivoEncerramento}</div>`}
      <div class="det-resumo">
        <div><small>Remuneração</small><strong>${brl.format(v.remuneracao)}/mês</strong></div>
        <div><small>Carga horária</small><strong>${v.cargaHoraria}h semanais</strong></div>
        <div><small>Dias de trabalho</small><strong>${DIAS.filter((d) => v.dias.includes(d.id)).map((d) => d.nome).join(", ")}</strong></div>
        <div><small>Modalidade</small><strong>${textoLocal(v)}</strong></div>
        <div><small>Local</small><strong>${v.local}</strong></div>
        <div><small>Vagas</small><strong>${v.vagas}</strong></div>
      </div>
      <section class="det-secao"><h3>Sobre a oportunidade</h3><p>${v.descricao}</p></section>
      <section class="det-secao"><h3>Requisitos</h3><ul>${v.requisitos.map((r) => `<li>${r}</li>`).join("")}</ul></section>
      <section class="det-secao"><h3>Benefícios</h3><ul>${v.beneficios.map((b) => `<li>${b}</li>`).join("")}</ul></section>
      <section class="det-secao"><h3>Documentos para a candidatura</h3>
        <ul class="det-docs">${v.documentos.map((d) => `<li><i class="ti ti-file-text"></i>${d}</li>`).join("")}</ul>
      </section>
    </div>
    <div class="det-rodape">
      <span class="prazo"><i class="ti ti-hourglass"></i>Inscrições até ${dataPrazo(v.prazoDias)}</span>
      <div style="display:flex;gap:8px">
        <button class="btn" data-acao="mensagem"><i class="ti ti-message-circle"></i> Falar com ofertante</button>
        ${!aberta ? "" : inscrito
          ? '<button class="btn" disabled><i class="ti ti-check"></i> Candidatura enviada</button>'
          : '<button class="btn btn-primario" data-acao="candidatar"><i class="ti ti-send"></i> Candidatar-se</button>'}
      </div>
    </div>`;

  el.detalhes.dataset.id = id;
  el.detalhes.showModal();
}

/* ---------- Eventos ---------- */
const toast = Radar.toast;
form.addEventListener("input", atualizar);
form.addEventListener("change", atualizar);
el.busca.addEventListener("input", atualizar);
el.ordenar.addEventListener("change", atualizar);
$("#limpar-filtros").addEventListener("click", limparFiltros);
$("#limpar-filtros-vazio").addEventListener("click", limparFiltros);

$("#abrir-filtros").addEventListener("click", (e) => {
  const aberto = el.painel.classList.toggle("aberto");
  e.currentTarget.setAttribute("aria-expanded", aberto);
});

el.grade.addEventListener("click", (e) => {
  const botao = e.target.closest("[data-acao]");
  if (!botao) return;
  const id = Number(botao.closest(".cartao").dataset.id);
  if (botao.dataset.acao === "favoritar") {
    favoritos.has(id) ? favoritos.delete(id) : favoritos.add(id);
    salvarArmazenado("radar:favoritos", favoritos);
    toast(favoritos.has(id) ? "Adicionada aos favoritos" : "Removida dos favoritos", "ti-heart");
    atualizar();
  } else if (botao.dataset.acao === "detalhes") {
    abrirDetalhes(id);
  }
});

el.detalhes.addEventListener("click", (e) => {
  if (e.target === el.detalhes) return el.detalhes.close(); // clique fora do conteúdo
  const botao = e.target.closest("[data-acao]");
  if (!botao) return;
  const id = Number(el.detalhes.dataset.id);
  if (botao.dataset.acao === "fechar") el.detalhes.close();
  if (botao.dataset.acao === "candidatar") {
    candidaturas.add(id);
    iniciadas.add(id);
    salvarArmazenado("radar:candidaturas", iniciadas);
    abrirDetalhes(id);
    atualizar();
    toast('Candidatura iniciada. Envie os documentos em <a href="candidaturas.html?c=m-' + id + '" style="color:#fff;text-decoration:underline">Minhas candidaturas</a>.', "ti-circle-check");
  }
  if (botao.dataset.acao === "mensagem") {
    // Conversa existente com o ofertante desta vaga (só depois da candidatura)
    const agendaEst = Radar.ler("radar:agenda", null);
    const ag = agendaEst ? agendaEst.find((x) => x.oportunidade === id) : (VINCULADAS_AGENDA[id] ? { id: VINCULADAS_AGENDA[id] } : null);
    const conversa = ag ? `ag-${ag.id}` : Radar.ambiente === "demo" ? { 14: "ex-agro", 8: "ex-ic" }[id] : null;
    if (conversa) location.href = `mensagens.html?conversa=${conversa}`;
    else toast("A conversa com o ofertante fica disponível depois que você se candidata.", "ti-message-circle");
  }
});

/* ---------- Filtros a partir do perfil do estudante ---------- */
let perfilAplicado = false;

function aplicarPerfil() {
  const p = Radar.ler("radar:perfil-estudante", null);
  if (!p) return;
  form.reset();
  el.busca.value = "";
  el.carga.value = Math.min(CARGA_MAX, p.horas);
  el.remuneracao.value = p.remMin || "";
  const marcar = (name, valores) => valores.forEach((v) => { const i = form.querySelector(`input[name="${name}"][value="${v}"]`); if (i) i.checked = true; });
  marcar("area", p.areas); marcar("tipo", p.tipos); marcar("dia", p.dias); marcar("regiao", p.regioes);
  form.querySelector(`input[name="modalidade"][value="${p.modalidade}"]`).checked = true;
  perfilAplicado = true;
  atualizar();
  renderAvisoPerfil();
}

function renderAvisoPerfil() {
  const p = Radar.ler("radar:perfil-estudante", null);
  const caixa = $("#aviso-perfil");
  if (!p) {
    caixa.innerHTML = `<div class="aviso-perfil"><i class="ti ti-user-circle"></i><span>Complete seu perfil para ver primeiro as vagas que cabem na sua rotina.</span><a class="btn" href="perfil.html?bemvindo">Completar perfil</a></div>`;
  } else if (perfilAplicado) {
    caixa.innerHTML = `<div class="aviso-perfil ativo"><i class="ti ti-user-check"></i><span>Mostrando vagas compatíveis com o seu perfil: ${p.horas}h semanais, ${p.areas.join(", ")}.</span><button class="btn" data-perfil="todas">Ver todas as vagas</button><a class="btn btn-texto" href="perfil.html">Editar perfil</a></div>`;
  } else {
    caixa.innerHTML = `<div class="aviso-perfil"><i class="ti ti-sparkles"></i><span>Quer ver só as vagas compatíveis com a sua disponibilidade?</span><button class="btn btn-primario" data-perfil="aplicar">Usar filtros do meu perfil</button></div>`;
  }
}

$("#aviso-perfil").addEventListener("click", (e) => {
  const b = e.target.closest("[data-perfil]");
  if (!b) return;
  if (b.dataset.perfil === "aplicar") { aplicarPerfil(); toast("Filtros do seu perfil aplicados.", "ti-user-check"); }
  else { perfilAplicado = false; limparFiltros(); renderAvisoPerfil(); }
});
// Qualquer mudança manual nos filtros deixa de ser "o perfil"
const sairDoPerfil = () => { if (perfilAplicado) { perfilAplicado = false; renderAvisoPerfil(); } };
form.addEventListener("input", sairDoPerfil);
document.addEventListener("click", (e) => { if (e.target.closest(".pilula button, #limpar-filtros, #limpar-filtros-vazio")) sairDoPerfil(); });

atualizar();
if (new URLSearchParams(location.search).has("usar-perfil")) {
  aplicarPerfil();
  history.replaceState(null, "", location.pathname);
} else {
  renderAvisoPerfil();
}
