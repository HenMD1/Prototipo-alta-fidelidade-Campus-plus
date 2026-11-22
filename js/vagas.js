/* ==========================================================
   Minhas vagas / Cadastrar vaga — visão do ofertante
   Casos de uso: Cadastrar oportunidade (inclui localização,
   carga horária e tipo), Editar oportunidade (inclui notificar
   estudantes) e encerrar inscrições com motivo.
   As vagas salvas aparecem no mural (ver final de dados.js).
   ========================================================== */

const $ = (s) => document.querySelector(s);
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const OF_ID = Radar.ofertanteId();   // TechSul na demonstração; a empresa criada no teste do zero
const OF = OFERTANTES[OF_ID];
const DOCS_COMUNS = ["Histórico escolar", "Atestado de matrícula", "Currículo", "Portfólio", "Carta de motivação", "Comprovante de conta bancária"];
const TURNOS = ["Manhã", "Tarde", "Noite", "Flexível"];
const PASSOS = ["Sobre a vaga", "Rotina e local", "Requisitos e benefícios", "Publicação"];
const ROTULOS = {
  titulo: "Título", tipo: "Tipo de vaga", regime: "Regime de contratação", area: "Área de atuação", descricao: "Descrição",
  vagas: "Número de vagas", cargaHoraria: "Carga horária semanal", dias: "Dias de trabalho", turno: "Turno",
  modalidade: "Modalidade", regiao: "Região", local: "Endereço", permiteNegociacaoHorario: "Negociação de horário",
  cargaSemanaProvas: "Carga na semana de provas", remuneracao: "Remuneração", requisitos: "Requisitos",
  beneficios: "Benefícios", documentos: "Documentos exigidos", prazoData: "Prazo de inscrição",
};

let salvas = Radar.ler("radar:vagas", []);
let form = null, original = null, passo = 0, erros = {};
let destaque = null;

/* ---------- Utilitários ---------- */
const hojeISO = () => iso(Radar.hoje());
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function deISO(s) { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); }
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function minhasVagas() { return OPORTUNIDADES.filter((o) => o.ofertante === OF_ID); }

function gravar(v) {
  const i = salvas.findIndex((x) => x.id === v.id);
  if (i >= 0) salvas[i] = v; else salvas.push(v);
  Radar.salvar("radar:vagas", salvas);
  const j = OPORTUNIDADES.findIndex((o) => o.id === v.id);
  const comDias = { ...v, prazoDias: v.prazoData ? Radar.diasAte(deISO(v.prazoData)) : v.prazoDias, publicadaHaDias: v.publicadaEm ? -Radar.diasAte(deISO(v.publicadaEm)) : v.publicadaHaDias };
  if (j >= 0) OPORTUNIDADES[j] = comDias; else OPORTUNIDADES.push(comDias);
}

function preSelecionados(id) {
  const of = Radar.ler("radar:ofertante", null) || OFERTANTE_INICIAL;
  return of.vagas[id] ? of.vagas[id].candidatos.length : 0;
}
function inscritos(id) {
  const tri = Radar.ler("radar:triagem", null) || TRIAGEM_INICIAL;
  const emAnalise = (tri.inscritos[id] || []).filter((k) => k.fase === "analise").length;
  const minhas = Radar.ler("radar:minhas", null) || CANDIDATURAS_ESTUDANTE;
  const estudanteAnalise = minhas.filter((c) => c.vaga === id && c.situacao === "andamento" && c.etapa <= 1).length;
  return emAnalise + estudanteAnalise + preSelecionados(id);
}
// O estudante da demonstração está inscrito nesta vaga?
function estudanteInscrito(id) {
  if (Radar.ambiente === "demo" && id === 1) return true;
  const minhas = Radar.ler("radar:minhas", []);
  return Radar.ler("radar:candidaturas", []).includes(id) || minhas.some((c) => c.vaga === id && c.situacao !== "retirada");
}

/* ==========================================================
   LISTA DE VAGAS
   ========================================================== */
function renderLista() {
  const vagas = minhasVagas().sort((a, b) => ({ rascunho: 0, aberta: 1, encerrada: 2 }[a.status] - { rascunho: 0, aberta: 1, encerrada: 2 }[b.status]) || b.id - a.id);
  const abertas = vagas.filter((v) => v.status === "aberta");
  const totalInscritos = vagas.reduce((s, v) => s + inscritos(v.id), 0);
  const STATUS = {
    aberta: (v) => `<span class="etiqueta sucesso"><i class="ti ti-circle-check"></i>Aberta</span><div class="motivo-enc">${v.prazoDias <= 0 ? "Encerra hoje" : `Encerra em ${v.prazoDias} dias`}</div>`,
    encerrada: (v) => `<span class="etiqueta neutra"><i class="ti ti-lock"></i>Encerrada</span><div class="motivo-enc">${esc(v.motivoEncerramento || "")}</div>`,
    rascunho: () => `<span class="etiqueta alerta"><i class="ti ti-pencil"></i>Rascunho</span>`,
  };

  $("#tela").innerHTML = `
  <section class="cabecalho-pagina">
    <div>
      <h1>Minhas vagas</h1>
      <p>Oportunidades publicadas por ${OF.nome} no Radar.</p>
    </div>
    <a class="btn btn-primario" href="?nova" data-rota="nova"><i class="ti ti-plus"></i> Cadastrar vaga</a>
  </section>
  <div class="pagina">
    <div class="resumo-vagas">
      <div><small>Vagas abertas</small><strong>${abertas.length}</strong></div>
      <div><small>Candidatos inscritos</small><strong>${totalInscritos}</strong></div>
      <div><small>Rascunhos</small><strong>${vagas.filter((v) => v.status === "rascunho").length}</strong></div>
      <div><small>Encerradas</small><strong>${vagas.filter((v) => v.status === "encerrada").length}</strong></div>
    </div>
    ${vagas.length ? "" : `<div class="cartao-form" style="text-align:center;padding:40px 24px">
      <i class="ti ti-briefcase" style="font-size:40px;color:var(--cor-primaria)"></i>
      <h2 style="margin-top:8px">Cadastre a primeira vaga</h2>
      <p style="margin:6px auto 16px;max-width:420px">Ela aparece no mural para os estudantes, e as candidaturas chegam na tela Candidatos.</p>
      <a class="btn btn-primario" href="?nova" data-rota="nova"><i class="ti ti-plus"></i> Cadastrar vaga</a></div>`}
    <div class="tabela-vagas" role="table" aria-label="Vagas" ${vagas.length ? "" : "hidden"}>
      <div class="linha-vaga cab" role="row"><span>Vaga</span><span>Situação</span><span>Inscritos</span><span>Rotina</span><span></span></div>
      ${vagas.map((v) => `
      <div class="linha-vaga ${v.id === destaque ? "destaque" : ""}" role="row" data-id="${v.id}">
        <div class="lv-titulo"><strong>${esc(v.titulo)}</strong><span>${[TIPOS[v.tipo].nome, v.area, `${v.vagas} ${v.vagas === 1 ? "vaga" : "vagas"}`].filter(Boolean).map(esc).join(" · ")}</span></div>
        <div>${STATUS[v.status](v)}</div>
        <div class="lv-num">${inscritos(v.id)}<small>${inscritos(v.id) ? `${preSelecionados(v.id)} pré-selecionados` : "nenhum ainda"}</small></div>
        <div class="lv-num">${v.cargaHoraria}h/sem<small>${[v.modalidade === "remota" ? "Remota" : v.regiao, v.remuneracao ? brl.format(v.remuneracao) : ""].filter(Boolean).map(esc).join(" · ") || "a definir"}</small></div>
        <div class="lv-acoes">
          ${v.status !== "rascunho" ? `<a class="btn" href="candidatos.html?vaga=${v.id}" title="Candidatos"><i class="ti ti-users"></i> Candidatos</a>` : ""}
          ${v.status === "aberta" ? `<a class="btn" href="agenda-ofertante.html?vaga=${v.id}" title="Agenda de entrevistas"><i class="ti ti-calendar-cog"></i> Agenda</a>` : ""}
          ${v.status !== "encerrada" ? `<a class="btn" href="?editar=${v.id}" data-rota="editar" data-id="${v.id}"><i class="ti ti-edit"></i> ${v.status === "rascunho" ? "Continuar" : "Editar"}</a>` : ""}
          ${v.status === "aberta" ? `<button class="btn btn-texto perigo" data-acao="encerrar" data-id="${v.id}" style="color:var(--perigo)"><i class="ti ti-lock"></i> Encerrar</button>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>`;
  document.title = "Minhas vagas · Radar UFRGS";
}

/* ---------- Encerrar inscrições (Oportunidade.encerrarInscricoes(motivo)) ---------- */
let encerrandoId = null;
function abrirEncerrar(id) {
  encerrandoId = id;
  const v = OPORTUNIDADES.find((o) => o.id === id);
  $("#me-texto").textContent = `“${v.titulo}” tem ${inscritos(id)} candidatos inscritos. Os pré-selecionados continuam no processo seletivo.`;
  $("#me-motivo").value = "";
  $("#me-outro").value = "";
  $("#me-outro").hidden = true;
  $("#me-erro").textContent = "";
  $("#modal-encerrar").showModal();
}
$("#me-motivo").addEventListener("change", () => {
  $("#me-outro").hidden = $("#me-motivo").value !== "outro";
  $("#me-erro").textContent = "";
});
$("#me-confirmar").addEventListener("click", () => {
  let motivo = $("#me-motivo").value;
  if (motivo === "outro") motivo = $("#me-outro").value.trim();
  if (!motivo || motivo.length < 5) {
    $("#me-erro").textContent = $("#me-motivo").value === "outro" ? "Explique o motivo do encerramento." : "Selecione o motivo do encerramento.";
    return;
  }
  const v = { ...OPORTUNIDADES.find((o) => o.id === encerrandoId), status: "encerrada", motivoEncerramento: motivo };
  gravar(v);
  $("#modal-encerrar").close();
  destaque = v.id;
  renderLista();
  Radar.toast("Inscrições encerradas. A vaga saiu do mural.", "ti-lock");
});

/* ==========================================================
   FORMULÁRIO
   ========================================================== */
function vagaVazia() {
  return {
    titulo: "", tipo: "estagio", regime: "CLT", area: "", descricao: "", vagas: 1,
    cargaHoraria: 20, dias: ["seg", "ter", "qua", "qui", "sex"], turno: "Tarde",
    modalidade: "presencial", regiao: "", local: "", permiteNegociacaoHorario: true, cargaSemanaProvas: 10,
    remuneracao: "", requisitos: [], beneficios: [], documentos: ["Histórico escolar", "Atestado de matrícula", "Currículo"],
    prazoData: iso(Radar.somarDias(Radar.hoje(), 14)), status: "novo",
  };
}

function paraForm(v) {
  return {
    ...vagaVazia(), ...JSON.parse(JSON.stringify(v)),
    turno: v.turno || "Flexível",
    cargaSemanaProvas: v.cargaSemanaProvas ?? Math.floor(v.cargaHoraria / 2),
    permiteNegociacaoHorario: v.permiteNegociacaoHorario ?? true,
    prazoData: v.prazoData || iso(Radar.somarDias(Radar.hoje(), Math.max(1, v.prazoDias))),
    publicadaEm: v.publicadaEm || iso(Radar.somarDias(Radar.hoje(), -(v.publicadaHaDias || 0))),
    local: v.modalidade === "remota" ? "" : v.local,
  };
}

function abrirForm(id) {
  passo = 0; erros = {};
  if (id) {
    const v = OPORTUNIDADES.find((o) => o.id === id && o.ofertante === OF_ID);
    if (!v) return navegar("");
    form = paraForm(v);
    original = paraForm(v);
  } else {
    form = vagaVazia();
    original = null;
  }
  renderForm();
}

const editandoPublicada = () => form && form.id && form.status === "aberta";

function renderForm() {
  const titulo = form.id ? (form.status === "rascunho" ? "Continuar rascunho" : "Editar vaga") : "Cadastrar vaga";
  document.title = `${titulo} · Radar UFRGS`;
  $("#tela").innerHTML = `
  <section class="cabecalho-pagina">
    <div>
      <a class="voltar" href="vagas.html" data-rota="lista"><i class="ti ti-arrow-left"></i> Minhas vagas</a>
      <h1>${titulo}</h1>
      <p>${editandoPublicada() ? "Os candidatos inscritos serão notificados das alterações." : "Preencha os dados em quatro passos. A prévia mostra como os estudantes verão a vaga no mural."}</p>
    </div>
  </section>
  <div class="pagina">
    <div class="form-layout">
      <div>
        <nav class="passos" aria-label="Passos do cadastro" id="passos"></nav>
        <form class="cartao-form" id="form-vaga" novalidate autocomplete="off"></form>
      </div>
      <aside class="previa" aria-label="Prévia">
        <h3>Prévia no mural</h3>
        <div id="previa-cartao"></div>
        <div class="alcance" id="alcance"></div>
      </aside>
    </div>
  </div>`;
  renderPasso();
  renderPrevia();
}

function renderPassos() {
  const comErro = passosComErro();
  $("#passos").innerHTML = PASSOS.map((p, i) => `
    <button type="button" class="passo ${i === passo ? "atual" : i < passo ? "feito" : ""} ${comErro.has(i) && i !== passo ? "com-erro" : ""}" data-passo="${i}" aria-current="${i === passo ? "step" : "false"}">
      <span class="num">${i < passo && !comErro.has(i) ? '<i class="ti ti-check"></i>' : i + 1}</span><span class="txt">${p}</span>
    </button>`).join("");
}

/* ---------- Campos ---------- */
function erroDe(c) { return erros[c] ? `<p class="erro-campo" id="erro-${c}"><i class="ti ti-alert-circle"></i>${erros[c]}</p>` : ""; }
function cls(c) { return `campo-form ${erros[c] ? "invalido" : ""}`; }
function aria(c) { return erros[c] ? `aria-invalid="true" aria-describedby="erro-${c}"` : ""; }

function listaEditavel(campo, placeholder) {
  return `
    <div class="itens-lista">${form[campo].map((item, i) => `<div class="item-lista"><span>${esc(item)}</span><button type="button" data-rem="${campo}" data-i="${i}" aria-label="Remover ${esc(item)}"><i class="ti ti-x"></i></button></div>`).join("")}</div>
    <div class="add-item"><input type="text" id="novo-${campo}" placeholder="${placeholder}" ${aria(campo)}><button type="button" class="btn" data-add="${campo}"><i class="ti ti-plus"></i> Adicionar</button></div>`;
}

function renderPasso() {
  renderPassos();
  const f = form, estagio = f.tipo === "estagio";
  const corpo = [
    () => `
      <h2>Sobre a vaga</h2>
      <p>O título e a área são o que os estudantes usam para encontrar a vaga.</p>
      <div class="grade-campos">
        <div class="${cls("tipo")} cheio">
          <span class="rotulo">Tipo de vaga</span>
          <div class="tipos" role="radiogroup" aria-label="Tipo de vaga">
            <label class="tipo-op"><input type="radio" name="tipo" value="estagio" data-campo="tipo" ${f.tipo === "estagio" ? "checked" : ""}><div><strong><i class="ti ti-briefcase"></i> Estágio</strong>Segue a Lei do Estágio, com termo de compromisso.</div></label>
            <label class="tipo-op"><input type="radio" name="tipo" value="emprego" data-campo="tipo" ${f.tipo === "emprego" ? "checked" : ""}><div><strong><i class="ti ti-building"></i> Emprego</strong>Contratação CLT ou PJ, em jornada compatível com o curso.</div></label>
            <label class="tipo-op" title="Disponível apenas para unidades acadêmicas e administrativas"><input type="radio" name="tipo" value="bolsa" data-campo="tipo" ${f.tipo === "bolsa" ? "checked" : ""} ${OF.tipo === "Empresa" ? "disabled" : ""}><div><strong><i class="ti ti-school"></i> Bolsa institucional</strong>${OF.tipo === "Empresa" ? "Só para unidades da universidade." : "Bolsa de extensão, pesquisa ou apoio."}</div></label>
          </div>
        </div>
        <div class="${cls("titulo")} cheio">
          <label for="f-titulo">Título da vaga</label>
          <input type="text" id="f-titulo" data-campo="titulo" value="${esc(f.titulo)}" maxlength="70" placeholder="Estágio em desenvolvimento mobile" ${aria("titulo")}>
          ${erroDe("titulo")}
        </div>
        <div class="${cls("area")}">
          <label for="f-area">Área de atuação</label>
          <select id="f-area" data-campo="area" ${aria("area")}><option value="">Selecione</option>${AREAS.map((a) => `<option ${a === f.area ? "selected" : ""}>${a}</option>`).join("")}</select>
          ${erroDe("area")}
        </div>
        <div class="${cls("vagas")}">
          <label for="f-vagas">Número de vagas</label>
          <input type="number" id="f-vagas" data-campo="vagas" min="1" max="50" value="${f.vagas}" ${aria("vagas")}>
          ${erroDe("vagas")}
        </div>
        ${f.tipo === "emprego" ? `
        <div class="${cls("regime")}">
          <label for="f-regime">Regime de contratação</label>
          <select id="f-regime" data-campo="regime">${["CLT", "PJ", "Temporário"].map((r) => `<option ${r === f.regime ? "selected" : ""}>${r}</option>`).join("")}</select>
        </div>` : ""}
        <div class="${cls("descricao")} cheio">
          <label for="f-descricao">Descrição das atividades <span class="contador" id="cont-descricao">${f.descricao.length}/600</span></label>
          <textarea id="f-descricao" data-campo="descricao" maxlength="600" placeholder="Conte o que a pessoa vai fazer no dia a dia, com quem vai trabalhar e o que vai aprender." ${aria("descricao")}>${esc(f.descricao)}</textarea>
          ${erroDe("descricao")}
        </div>
      </div>`,

    () => `
      <h2>Rotina e local</h2>
      <p>Esses dados alimentam os filtros do mural: carga horária, dias, modalidade e região.</p>
      <div class="grade-campos">
        <div class="${cls("cargaHoraria")}">
          <label for="f-carga">Carga horária semanal</label>
          <div class="sufixo"><input type="number" id="f-carga" data-campo="cargaHoraria" min="1" max="44" value="${f.cargaHoraria}" ${aria("cargaHoraria")}><span>horas</span></div>
          ${erroDe("cargaHoraria") || `<p class="ajuda" id="ajuda-carga">${ajudaCarga()}</p>`}
        </div>
        <div class="${cls("turno")}">
          <label for="f-turno">Turno</label>
          <select id="f-turno" data-campo="turno">${TURNOS.map((t) => `<option ${t === f.turno ? "selected" : ""}>${t}</option>`).join("")}</select>
        </div>
        <div class="${cls("dias")} cheio">
          <span class="rotulo">Dias de trabalho</span>
          <div class="chips dias" role="group" aria-label="Dias de trabalho">${DIAS.map((d) => `<label class="chip"><input type="checkbox" name="dia" value="${d.id}" data-campo="dias" ${f.dias.includes(d.id) ? "checked" : ""}><span>${d.nome}</span></label>`).join("")}</div>
          ${erroDe("dias")}
        </div>
        ${estagio ? `
        <div class="${cls("cargaSemanaProvas")}">
          <label for="f-provas">Carga na semana de provas</label>
          <div class="sufixo"><input type="number" id="f-provas" data-campo="cargaSemanaProvas" min="0" value="${f.cargaSemanaProvas}" ${aria("cargaSemanaProvas")}><span>horas</span></div>
          ${erroDe("cargaSemanaProvas") || `<p class="ajuda">Pela lei, ao menos metade da carga normal (até ${Math.floor(f.cargaHoraria / 2)}h).</p>`}
        </div>
        <div class="campo-form" style="align-self:center">
          <label class="check-linha"><input type="checkbox" data-campo="permiteNegociacaoHorario" ${f.permiteNegociacaoHorario ? "checked" : ""}> Aceito negociar horários com o estagiário</label>
        </div>` : ""}
        <div class="${cls("modalidade")} cheio">
          <span class="rotulo">Modalidade</span>
          <div class="segmentado" role="radiogroup" aria-label="Modalidade" style="grid-template-columns:repeat(2,1fr);max-width:360px">
            <label><input type="radio" name="modalidade" value="presencial" data-campo="modalidade" ${f.modalidade === "presencial" ? "checked" : ""}><span>Presencial</span></label>
            <label><input type="radio" name="modalidade" value="remota" data-campo="modalidade" ${f.modalidade === "remota" ? "checked" : ""}><span>Remota</span></label>
          </div>
        </div>
        ${f.modalidade === "presencial" ? `
        <div class="${cls("local")}">
          <label for="f-local">Endereço do local de trabalho</label>
          <input type="text" id="f-local" data-campo="local" value="${esc(f.local)}" placeholder="Rua dos Andradas, 1234 — Centro Histórico" ${aria("local")}>
          ${erroDe("local")}
        </div>
        <div class="${cls("regiao")}">
          <label for="f-regiao">Região</label>
          <select id="f-regiao" data-campo="regiao" ${aria("regiao")}><option value="">Selecione</option>${REGIOES.map((r) => `<option ${r === f.regiao ? "selected" : ""}>${r}</option>`).join("")}</select>
          ${erroDe("regiao") || '<p class="ajuda">Usada no filtro de regiões de fácil acesso.</p>'}
        </div>` : ""}
      </div>`,

    () => `
      <h2>Requisitos e benefícios</h2>
      <p>Seja específico: requisitos claros reduzem candidaturas que você teria de recusar.</p>
      <div class="grade-campos">
        <div class="${cls("remuneracao")}">
          <label for="f-rem">${estagio ? "Bolsa mensal" : f.tipo === "bolsa" ? "Valor da bolsa" : "Salário mensal"}</label>
          <div class="prefixo"><span>R$</span><input type="number" id="f-rem" data-campo="remuneracao" min="0" step="50" value="${f.remuneracao}" placeholder="1500" ${aria("remuneracao")}></div>
          ${erroDe("remuneracao") || (estagio ? '<p class="ajuda">No estágio não obrigatório, a bolsa e o auxílio-transporte são obrigatórios.</p>' : "")}
        </div>
        <div></div>
        <div class="${cls("requisitos")} cheio">
          <label for="novo-requisitos">Requisitos</label>
          ${listaEditavel("requisitos", "Cursando Computação a partir do 3º semestre")}
          ${erroDe("requisitos")}
        </div>
        <div class="${cls("beneficios")} cheio">
          <label for="novo-beneficios">Benefícios <span class="opcional">(opcional)</span></label>
          ${listaEditavel("beneficios", "Vale-transporte")}
        </div>
        <div class="${cls("documentos")} cheio">
          <span class="rotulo">Documentos exigidos na candidatura</span>
          <div class="chips" role="group" aria-label="Documentos exigidos">${[...new Set([...DOCS_COMUNS, ...f.documentos])].map((d) => `<label class="chip"><input type="checkbox" name="doc" value="${esc(d)}" data-campo="documentos" ${f.documentos.includes(d) ? "checked" : ""}><span>${esc(d)}</span></label>`).join("")}</div>
          ${erroDe("documentos") || '<p class="ajuda">O estudante envia esses arquivos em Minhas candidaturas.</p>'}
        </div>
      </div>`,

    () => {
      const rem = Number(f.remuneracao) || 0;
      return `
      <h2>Publicação</h2>
      <p>Revise os dados. Ao publicar, a vaga aparece no mural e estudantes da área são avisados.</p>
      <div class="grade-campos" style="margin-bottom:18px">
        <div class="${cls("prazoData")}">
          <label for="f-prazo">Inscrições abertas até</label>
          <input type="date" id="f-prazo" data-campo="prazoData" value="${f.prazoData}" min="${iso(Radar.somarDias(Radar.hoje(), 1))}" ${aria("prazoData")}>
          ${erroDe("prazoData")}
        </div>
      </div>
      <div class="revisao">
        <div class="cheio"><small>Vaga</small><strong>${esc(f.titulo) || "—"}</strong></div>
        <div><small>Tipo</small><strong>${TIPOS[f.tipo].nome}${f.tipo === "emprego" ? ` · ${f.regime}` : ""}</strong></div>
        <div><small>Área</small><strong>${esc(f.area) || "—"}</strong></div>
        <div><small>Rotina</small><strong>${f.cargaHoraria}h semanais · ${DIAS.filter((d) => f.dias.includes(d.id)).map((d) => d.nome).join(", ") || "—"}</strong></div>
        <div><small>Local</small><strong>${f.modalidade === "remota" ? "Remota" : `${esc(f.local) || "—"} (${esc(f.regiao) || "—"})`}</strong></div>
        <div><small>Remuneração</small><strong>${rem ? `${brl.format(rem)}/mês` : "—"}</strong></div>
        <div><small>Vagas</small><strong>${f.vagas}</strong></div>
        <div class="cheio"><small>Documentos exigidos</small><strong>${f.documentos.join(", ") || "—"}</strong></div>
      </div>
      ${f.tipo === "estagio" ? `<div class="dica-lei" style="margin-top:14px"><i class="ti ti-scale"></i><span>Ao aprovar um candidato, o Radar gera o <b>termo de compromisso de estágio</b> com esses dados para assinatura sua, do estudante e da universidade.</span></div>` : ""}`;
    },
  ][passo]();

  const ultimo = passo === PASSOS.length - 1;
  $("#form-vaga").innerHTML = corpo + `
    <div class="navegacao-form">
      ${passo > 0 ? '<button type="button" class="btn" data-nav="voltar"><i class="ti ti-arrow-left"></i> Voltar</button>' : "<span></span>"}
      <div class="dir">
        ${!editandoPublicada() ? '<button type="button" class="btn btn-texto" data-nav="rascunho"><i class="ti ti-device-floppy"></i> Salvar rascunho</button>' : ""}
        ${ultimo
          ? `<button type="submit" class="btn btn-primario"><i class="ti ${editandoPublicada() ? "ti-device-floppy" : "ti-send"}"></i> ${editandoPublicada() ? "Salvar alterações" : "Publicar vaga"}</button>`
          : '<button type="submit" class="btn btn-primario">Continuar <i class="ti ti-arrow-right"></i></button>'}
      </div>
    </div>`;
}

function ajudaCarga() {
  const n = form.dias.length || 1;
  if (form.tipo !== "estagio") return `${Math.round((form.cargaHoraria / n) * 10) / 10}h por dia.`;
  return `${Math.round((form.cargaHoraria / n) * 10) / 10}h por dia. Estágio: máximo de 30h semanais e 6h diárias.`;
}

/* ---------- Validação (inclui as regras da Lei 11.788/2008) ---------- */
const CAMPOS_PASSO = [
  ["titulo", "area", "vagas", "descricao"],
  ["cargaHoraria", "dias", "cargaSemanaProvas", "local", "regiao"],
  ["remuneracao", "requisitos", "documentos"],
  ["prazoData"],
];

function validarPasso(p) {
  const f = form, e = {}, estagio = f.tipo === "estagio";
  if (p === 0) {
    if (f.titulo.trim().length < 8) e.titulo = "Dê um título com pelo menos 8 caracteres.";
    if (!f.area) e.area = "Selecione a área de atuação.";
    if (!(f.vagas >= 1 && f.vagas <= 50)) e.vagas = "Informe entre 1 e 50 vagas.";
    if (f.descricao.trim().length < 40) e.descricao = `Descreva as atividades com pelo menos 40 caracteres (faltam ${40 - f.descricao.trim().length}).`;
  }
  if (p === 1) {
    const n = f.dias.length;
    if (!n) e.dias = "Selecione ao menos um dia de trabalho.";
    if (!(f.cargaHoraria >= 1)) e.cargaHoraria = "Informe a carga horária semanal.";
    else if (estagio && f.cargaHoraria > 30) e.cargaHoraria = "Estágio de graduação: no máximo 30h semanais (Lei 11.788/2008, art. 10).";
    else if (estagio && n && f.cargaHoraria / n > 6) e.cargaHoraria = `Com ${n} ${n === 1 ? "dia" : "dias"} de trabalho, o máximo é ${6 * n}h semanais (limite de 6h diárias).`;
    else if (!estagio && f.cargaHoraria > 44) e.cargaHoraria = "O máximo é de 44h semanais.";
    if (estagio && f.cargaSemanaProvas !== "" && f.cargaSemanaProvas > f.cargaHoraria / 2) e.cargaSemanaProvas = `Na semana de provas, a carga cai pelo menos à metade: no máximo ${Math.floor(f.cargaHoraria / 2)}h (art. 10, §2º).`;
    if (f.modalidade === "presencial") {
      if (f.local.trim().length < 8) e.local = "Informe o endereço do local de trabalho.";
      if (!f.regiao) e.regiao = "Selecione a região.";
    }
  }
  if (p === 2) {
    const r = Number(f.remuneracao);
    if (f.remuneracao === "" || isNaN(r)) e.remuneracao = estagio ? "Informe o valor da bolsa." : "Informe o salário.";
    else if (estagio && r <= 0) e.remuneracao = "No estágio não obrigatório, a bolsa é obrigatória (art. 12).";
    if (!f.requisitos.length) e.requisitos = "Adicione pelo menos um requisito.";
    if (!f.documentos.length) e.documentos = "Selecione pelo menos um documento.";
  }
  if (p === 3) {
    const d = f.prazoData ? Radar.diasAte(deISO(f.prazoData)) : -1;
    if (d < 1) e.prazoData = "O prazo precisa ser a partir de amanhã.";
    else if (d > 120) e.prazoData = "Escolha um prazo de até 120 dias.";
  }
  return e;
}

function passosComErro() {
  const s = new Set();
  CAMPOS_PASSO.forEach((campos, i) => { if (campos.some((c) => erros[c])) s.add(i); });
  return s;
}

function aplicarErros(p, novos) {
  CAMPOS_PASSO[p].forEach((c) => delete erros[c]);
  Object.assign(erros, novos);
}

function focarPrimeiroErro() {
  const el = document.querySelector(".campo-form.invalido input:not([type=checkbox]):not([type=radio]), .campo-form.invalido select, .campo-form.invalido textarea, .campo-form.invalido input");
  if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
}

/* ---------- Prévia e alcance ---------- */
function renderPrevia() {
  const f = form, t = TIPOS[f.tipo];
  const rem = Number(f.remuneracao) || 0;
  const prazo = f.prazoData ? Radar.diasAte(deISO(f.prazoData)) : 14;
  $("#previa-cartao").innerHTML = `
  <article class="cartao">
    <div class="cartao-topo">
      <div class="logo-ofertante" style="background:${OF.cor}">${OF.sigla || Radar.iniciaisDe(OF.nome)}</div>
      <div class="cartao-titulos">
        <h3>${esc(f.titulo) || '<span style="color:var(--texto-3)">Título da vaga</span>'}</h3>
        <div class="ofertante">${OF.nome} <i class="ti ti-rosette-discount-check"></i></div>
      </div>
      <span class="btn btn-texto btn-icone favorito"><i class="ti ti-heart" style="font-size:20px"></i></span>
    </div>
    <div class="cartao-etiquetas">
      <span class="etiqueta ${f.tipo}"><i class="ti ${t.icone}"></i>${t.nome}</span>
      ${f.area ? `<span class="etiqueta" style="background:var(--superficie-2);color:var(--texto-2)">${esc(f.area)}</span>` : ""}
      ${f.tipo === "estagio" && f.permiteNegociacaoHorario ? '<span class="etiqueta" style="background:#eef3fe;color:var(--cor-primaria)"><i class="ti ti-clock-edit"></i>Horário negociável</span>' : ""}
    </div>
    <div class="cartao-info">
      <div><i class="ti ti-cash"></i><span class="valor">${rem ? brl.format(rem) : "R$ —"}</span>/mês</div>
<div><i class="ti ti-clock"></i><span><span class="valor">${f.cargaHoraria || "—"}h</span>/semana${f.turno ? ` · ${f.turno}` : ""}</span></div>
      <div><i class="ti ${f.modalidade === "remota" ? "ti-world" : "ti-map-pin"}"></i>${f.modalidade === "remota" ? "Remota" : `Presencial · ${esc(f.regiao) || "região"}`}</div>
      <div><i class="ti ti-calendar-week"></i><span class="dias-semana">${DIAS.map((d) => `<span class="${f.dias.includes(d.id) ? "on" : ""}">${d.curto}</span>`).join("")}</span></div>
    </div>
    <div class="cartao-rodape">
      <span class="prazo"><i class="ti ti-hourglass"></i>${prazo <= 1 ? "Encerra amanhã" : `Encerra em ${prazo} dias`}</span>
      <span class="btn">Ver detalhes <i class="ti ti-arrow-right"></i></span>
    </div>
  </article>`;

  const dias = DIAS.filter((d) => f.dias.includes(d.id)).map((d) => d.nome).join(", ");
  $("#alcance").innerHTML = `
    <strong><i class="ti ti-radar"></i> Quem vai encontrar esta vaga</strong>
    <p style="color:var(--texto-2);margin-bottom:6px">Estudantes cujos filtros incluam:</p>
    <ul>
      <li>Área ${f.area ? `<b>${esc(f.area)}</b>` : "(selecione)"} ou nenhuma área marcada</li>
      <li>Carga máxima de <b>${f.cargaHoraria || "—"}h</b> ou mais</li>
      <li>Disponibilidade em <b>${dias || "—"}</b></li>
      <li>${f.modalidade === "remota" ? "Modalidade <b>remota</b> ou qualquer" : `Modalidade presencial ou qualquer, na região <b>${esc(f.regiao) || "—"}</b> ou em qualquer região`}</li>
      <li>Remuneração mínima de até <b>${rem ? brl.format(rem) : "—"}</b></li>
    </ul>`;
}

/* ---------- Eventos do formulário ---------- */
function lerCampo(el) {
  const c = el.dataset.campo;
  if (c === "dias") return [...document.querySelectorAll('input[name="dia"]:checked')].map((i) => i.value);
  if (c === "documentos") return [...document.querySelectorAll('input[name="doc"]:checked')].map((i) => i.value);
  if (el.type === "checkbox") return el.checked;
  if (el.type === "number") return el.value === "" ? "" : Number(el.value);
  return el.value;
}

document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-campo]");
  if (!el || !form) return;
  const c = el.dataset.campo;
  form[c] = lerCampo(el);
  if (c === "descricao") $("#cont-descricao").textContent = `${form.descricao.length}/600`;
  if (c === "cargaHoraria" || c === "dias") { const a = $("#ajuda-carga"); if (a) a.textContent = ajudaCarga(); }
  if (c === "tipo" && form.tipo === "estagio") form.cargaSemanaProvas = Math.floor(form.cargaHoraria / 2);
  limparErrosCorrigidos();
  if (c === "tipo" || c === "modalidade") {
    renderPasso();
    document.querySelector(`[data-campo="${c}"][value="${form[c]}"]`)?.focus();
  }
  renderPrevia();
});

// Remove só as mensagens de erro já resolvidas, sem redesenhar (mantém o foco no campo).
function limparErrosCorrigidos() {
  const atuais = validarPasso(passo);
  let mudou = false;
  CAMPOS_PASSO[passo].forEach((c) => {
    if (!erros[c] || atuais[c]) return;
    delete erros[c];
    mudou = true;
    const erroEl = document.getElementById(`erro-${c}`);
    const box = erroEl?.closest(".campo-form");
    box?.classList.remove("invalido");
    box?.querySelectorAll("[aria-invalid]").forEach((x) => { x.removeAttribute("aria-invalid"); x.removeAttribute("aria-describedby"); });
    erroEl?.remove();
  });
  if (mudou) renderPassos();
}

function adicionarItem(campo) {
  const input = $(`#novo-${campo}`);
  const v = input.value.trim();
  if (!v) return input.focus();
  if (form[campo].includes(v)) { Radar.toast("Esse item já está na lista.", "ti-info-circle"); return; }
  form[campo].push(v);
  delete erros[campo];
  renderPasso(); renderPrevia();
  $(`#novo-${campo}`).focus();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id && e.target.id.startsWith("novo-")) {
    e.preventDefault();
    adicionarItem(e.target.id.replace("novo-", ""));
  }
});

document.addEventListener("click", (e) => {
  // Rotas internas (lista / nova / editar)
  const rota = e.target.closest("[data-rota]");
  if (rota) {
    e.preventDefault();
    if (rota.dataset.rota === "lista") return sair();
    return navegar(rota.dataset.rota === "nova" ? "?nova" : `?editar=${rota.dataset.id}`);
  }
  const enc = e.target.closest("[data-acao='encerrar']");
  if (enc) return abrirEncerrar(Number(enc.dataset.id));
  if (!form) return;

  const add = e.target.closest("[data-add]");
  if (add) return adicionarItem(add.dataset.add);
  const rem = e.target.closest("[data-rem]");
  if (rem) { form[rem.dataset.rem].splice(Number(rem.dataset.i), 1); renderPasso(); renderPrevia(); return; }

  const p = e.target.closest("[data-passo]");
  if (p) return irPara(Number(p.dataset.passo));
  const nav = e.target.closest("[data-nav]");
  if (nav && nav.dataset.nav === "voltar") { passo--; renderPasso(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (nav && nav.dataset.nav === "rascunho") salvarRascunho();
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "form-vaga") return;
  e.preventDefault();
  if (passo < PASSOS.length - 1) return irPara(passo + 1);
  concluir();
});

// Avançar exige o passo atual válido; voltar é livre.
function irPara(alvo) {
  if (alvo <= passo) { passo = alvo; renderPasso(); return; }
  for (let i = passo; i < alvo; i++) {
    const e = validarPasso(i);
    aplicarErros(i, e);
    if (Object.keys(e).length) { passo = i; renderPasso(); focarPrimeiroErro(); return; }
  }
  passo = alvo;
  renderPasso();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Salvar, publicar e editar ---------- */
function montarVaga(status) {
  const f = form;
  return {
    id: f.id || Math.max(99, ...OPORTUNIDADES.map((o) => o.id)) + 1,
    tipo: f.tipo, ofertante: OF_ID, area: f.area, titulo: f.titulo.trim(),
    cargaHoraria: Number(f.cargaHoraria), dias: DIAS.map((d) => d.id).filter((d) => f.dias.includes(d)),
    turno: f.turno, modalidade: f.modalidade,
    regiao: f.modalidade === "remota" ? null : f.regiao,
    local: f.modalidade === "remota" ? "Remoto" : f.local.trim(),
    remuneracao: Number(f.remuneracao) || 0,
    prazoData: f.prazoData, publicadaEm: f.publicadaEm || hojeISO(),
    vagas: Number(f.vagas), status,
    ...(f.tipo === "emprego" ? { regime: f.regime } : {}),
    ...(f.tipo === "estagio" ? { permiteNegociacaoHorario: f.permiteNegociacaoHorario, cargaSemanaProvas: f.cargaSemanaProvas === "" ? null : Number(f.cargaSemanaProvas) } : {}),
    descricao: f.descricao.trim(), requisitos: [...f.requisitos], beneficios: [...f.beneficios], documentos: [...f.documentos],
  };
}

function salvarRascunho() {
  if (form.titulo.trim().length < 3) {
    passo = 0; erros.titulo = "Dê um título para salvar o rascunho."; renderPasso(); focarPrimeiroErro(); return;
  }
  const v = montarVaga("rascunho");
  gravar(v);
  form.id = v.id; form.status = "rascunho";
  destaque = v.id;
  Radar.toast("Rascunho salvo. Ele não aparece no mural.", "ti-device-floppy");
  original = JSON.parse(JSON.stringify(form));
  navegar("");
}

function validarTudo() {
  for (let i = 0; i < PASSOS.length; i++) {
    const e = validarPasso(i);
    aplicarErros(i, e);
    if (Object.keys(e).length) { passo = i; renderPasso(); focarPrimeiroErro(); Radar.toast(`Revise o passo “${PASSOS[i]}”.`, "ti-alert-circle"); return false; }
  }
  return true;
}

function mudancas() {
  if (!original) return [];
  const campos = Object.keys(ROTULOS).filter((c) => JSON.stringify(form[c]) !== JSON.stringify(original[c]));
  return [...new Set(campos.map((c) => (c === "local" || c === "regiao" ? "local" : c)))];
}

function concluir() {
  if (!validarTudo()) return;
  if (editandoPublicada()) {
    const m = mudancas();
    if (!m.length) { Radar.toast("Nenhuma alteração para salvar.", "ti-info-circle"); return; }
    const n = inscritos(form.id);
    $("#ma-texto").textContent = n
      ? `Os ${n} candidatos inscritos serão notificados destas alterações:`
      : "Estas alterações aparecem imediatamente no mural:";
    $("#ma-lista").innerHTML = m.map((c) => `<li>${ROTULOS[c]}</li>`).join("");
    $("#modal-alteracoes").showModal();
    return;
  }
  publicar();
}

function publicar() {
  const v = montarVaga("aberta");
  v.publicadaEm = hojeISO();
  gravar(v);
  // Anúncio de oportunidade para estudantes da área (o estudante da demonstração é de Computação)
  const areasEstudante = (Radar.ler("radar:perfil-estudante", null) || {}).areas || ["Computação", "Dados"];
  if (areasEstudante.includes(v.area)) {
    Radar.notificar(`Nova vaga na sua área: <b>${esc(v.titulo)}</b> (${OF.nome}).`, "ti-sparkles", "mural.html", "estudante");
  }
  destaque = v.id;
  form = null;
  navegar("");
  Radar.toast("Vaga publicada no mural.", "ti-send");
}

$("#ma-confirmar").addEventListener("click", () => {
  const m = mudancas();
  const v = montarVaga("aberta");
  gravar(v);
  // Caso de uso "Editar oportunidades" <<include>> "Notificar estudantes da alteração"
  if (estudanteInscrito(v.id)) {
    Radar.notificar(`<b>${OF.nome}</b> alterou a vaga <b>${esc(v.titulo)}</b>: ${m.map((c) => ROTULOS[c].toLowerCase()).join(", ")}.`, "ti-edit", "candidaturas.html", "estudante");
  }
  $("#modal-alteracoes").close();
  destaque = v.id;
  form = null;
  navegar("");
  Radar.toast(`Alterações salvas. ${inscritos(v.id)} candidatos foram notificados.`, "ti-bell");
});

/* ---------- Navegação ---------- */
function temAlteracoes() {
  if (!form) return false;
  const base = original || vagaVazia();
  return JSON.stringify({ ...form, status: 0 }) !== JSON.stringify({ ...base, status: 0 });
}
function sair() {
  if (temAlteracoes() && !confirm("Sair sem salvar? As alterações feitas serão perdidas.")) return;
  form = null;
  navegar("");
}
function navegar(busca) {
  history.pushState(null, "", busca ? busca : location.pathname);
  rotear();
}
function rotear() {
  const p = new URLSearchParams(location.search);
  if (p.has("nova")) return abrirForm(null);
  if (p.has("editar")) return abrirForm(Number(p.get("editar")));
  form = null;
  renderLista();
  window.scrollTo({ top: 0 });
}
window.addEventListener("popstate", rotear);
window.addEventListener("beforeunload", (e) => { if (temAlteracoes()) e.preventDefault(); });
document.querySelectorAll("dialog.modal").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); }));
window.addEventListener("radar:sincronizar", () => { if (!form) { salvas = Radar.ler("radar:vagas", []); renderLista(); } });

rotear();
