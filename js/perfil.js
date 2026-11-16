/* ==========================================================
   Meu perfil — caso de uso "Fazer cadastro estudantil e profissional"
   Atributos da classe Estudante: matrícula, curso, semestre,
   áreas de interesse, disponibilidade (horas e dias) e PcD.
   O perfil vira os filtros do mural ("Usar filtros do meu perfil").
   ========================================================== */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const BEM_VINDO = new URLSearchParams(location.search).has("bemvindo");
const CURSOS = ["Ciência da Computação", "Engenharia de Computação", "Sistemas de Informação", "Engenharia Civil", "Engenharia de Produção",
  "Administração", "Jornalismo", "Publicidade e Propaganda", "Design Visual", "Estatística", "Nutrição", "Matemática"];

const PADRAO = {
  matricula: Radar.estudante().matricula, nome: Radar.estudante().nome, curso: Radar.estudante().curso || "Ciência da Computação", semestre: Radar.estudante().semestre || 5,
  areas: ["Computação"], tipos: ["estagio", "bolsa"], horas: 20, dias: ["seg", "ter", "qua", "qui", "sex"],
  modalidade: "qualquer", regioes: [], remMin: "", pcd: false, acessibilidade: "", curriculo: null, avisos: true,
  aulas: null, // preenchida com a grade do portal (abaixo)
};

// Grade do semestre como viria do portal do aluno (simulado). A agenda de entrevistas
// usa esta grade para avisar quando um horário de entrevista conflita com uma aula.
const GRADE_PORTAL = [
  { dia: "seg", ini: "13:30", fim: "15:10", disciplina: "INF01124 — Estruturas de Dados" },
  { dia: "ter", ini: "10:30", fim: "12:10", disciplina: "INF01127 — Engenharia de Software" },
  { dia: "qua", ini: "13:30", fim: "15:10", disciplina: "INF01124 — Estruturas de Dados" },
  { dia: "qui", ini: "10:30", fim: "12:10", disciplina: "INF01127 — Engenharia de Software" },
];
// Na demonstração a grade já vem importada; numa conta de teste começa vazia (há o botão de importar).
PADRAO.aulas = Radar.ambiente === "demo" ? GRADE_PORTAL.map((a) => ({ ...a })) : [];

const salvo = Radar.ler("radar:perfil-estudante", null);
let p = { ...PADRAO, ...(salvo || {}) };
let original = JSON.stringify(p);
let erros = {};

/* ---------- Compatibilidade: mesma regra dos filtros do mural ---------- */
function compativeis() {
  return OPORTUNIDADES.filter((v) => {
    if (v.status !== "aberta") return false;
    if (p.areas.length && !p.areas.includes(v.area)) return false;
    if (p.tipos.length && !p.tipos.includes(v.tipo)) return false;
    if (v.cargaHoraria > p.horas) return false;
    if (p.dias.length && !v.dias.every((d) => p.dias.includes(d))) return false;
    if (p.modalidade !== "qualquer" && v.modalidade !== p.modalidade) return false;
    if (v.modalidade === "presencial" && p.modalidade !== "remota" && p.regioes.length && !p.regioes.includes(v.regiao)) return false;
    if (p.remMin && v.remuneracao < Number(p.remMin)) return false;
    return true;
  });
}

/* ---------- Renderização ---------- */
const chip = (name, value, texto, marcado) =>
  `<label class="chip"><input type="checkbox" name="${name}" value="${esc(value)}" ${marcado ? "checked" : ""}><span>${esc(texto)}</span></label>`;
const erro = (c) => erros[c] ? `<p class="erro-campo" id="erro-${c}"><i class="ti ti-alert-circle"></i>${erros[c]}</p>` : "";
const cls = (c) => `campo-form ${erros[c] ? "invalido" : ""}`;

function renderCabecalho() {
  $("#cabecalho").innerHTML = `
    <div>
      <h1>${BEM_VINDO ? "Complete seu perfil" : "Meu perfil"}</h1>
      <p>${BEM_VINDO ? "Leva um minuto e ajuda o Radar a mostrar só as vagas que cabem na sua rotina." : "Essas informações aparecem para os ofertantes quando você se candidata e definem os filtros sugeridos no mural."}</p>
    </div>`;
}

function render() {
  const n = compativeis().length;
  const horasDia = p.dias.length ? p.horas / p.dias.length : 0;
  $("#form").innerHTML = `
    ${BEM_VINDO ? `<div class="boas-vindas"><i class="ti ti-confetti"></i><div><strong>Boas-vindas ao Radar, ${esc(p.nome.split(" ")[0])}!</strong><p>Seu nome e matrícula vêm do cadastro da universidade. Conte o que você procura.</p></div></div>` : ""}

    <section class="secao-perfil">
      <h2><i class="ti ti-school"></i> Dados acadêmicos</h2>
      <p>Usados para conferir requisitos das vagas, como curso e semestre mínimo.</p>
      <div class="grade-campos">
        <div class="campo-form"><span class="rotulo">Nome</span><div class="campo-fixo"><i class="ti ti-lock"></i>${esc(p.nome)}</div></div>
        <div class="campo-form"><span class="rotulo">Cartão UFRGS</span><div class="campo-fixo"><i class="ti ti-lock"></i>${esc(p.matricula)}</div></div>
        <div class="${cls("curso")}">
          <label for="curso">Curso</label>
          <select id="curso" name="curso" ${erros.curso ? 'aria-invalid="true"' : ""}><option value="">Selecione</option>${CURSOS.map((c) => `<option ${c === p.curso ? "selected" : ""}>${c}</option>`).join("")}</select>
          ${erro("curso")}
        </div>
        <div class="${cls("semestre")}">
          <label for="semestre">Semestre atual</label>
          <input type="number" id="semestre" name="semestre" min="1" max="14" value="${p.semestre}" ${erros.semestre ? 'aria-invalid="true"' : ""}>
          ${erro("semestre")}
        </div>
      </div>
    </section>

    <section class="secao-perfil">
      <h2><i class="ti ti-target-arrow"></i> O que você procura</h2>
      <p>Marque quantas áreas e tipos quiser.</p>
      <div class="grade-campos">
        <div class="${cls("areas")} cheio">
          <span class="rotulo">Áreas de interesse</span>
          <div class="chips" role="group" aria-label="Áreas de interesse">${AREAS.map((a) => chip("areas", a, a, p.areas.includes(a))).join("")}</div>
          ${erro("areas")}
        </div>
        <div class="${cls("tipos")} cheio">
          <span class="rotulo">Tipos de oportunidade</span>
          <div class="chips" role="group" aria-label="Tipos de oportunidade">${Object.entries(TIPOS).map(([id, t]) => chip("tipos", id, t.nome, p.tipos.includes(id))).join("")}</div>
          ${erro("tipos")}
        </div>
      </div>
    </section>

    <section class="secao-perfil">
      <h2><i class="ti ti-calendar-time"></i> Disponibilidade</h2>
      <p>Pense na sua grade de aulas deste semestre.</p>
      <div class="grade-campos">
        <div class="campo-form cheio">
          <label for="horas">Horas por semana disponíveis</label>
          <div class="faixa"><input type="range" id="horas" name="horas" min="4" max="40" step="2" value="${p.horas}"><output id="horas-valor">até ${p.horas}h</output></div>
          ${p.tipos.includes("estagio") && horasDia > 6 ? `<p class="ajuda">Estágios têm no máximo 6h por dia: com ${p.dias.length} ${p.dias.length === 1 ? "dia" : "dias"}, um estágio terá até ${6 * p.dias.length}h semanais.</p>` : ""}
        </div>
        <div class="${cls("dias")} cheio">
          <span class="rotulo">Dias disponíveis</span>
          <div class="chips dias" role="group" aria-label="Dias disponíveis">${DIAS.map((d) => chip("dias", d.id, d.nome, p.dias.includes(d.id))).join("")}</div>
          ${erro("dias")}
        </div>
        <div class="campo-form">
          <span class="rotulo">Modalidade preferida</span>
          <div class="segmentado" role="radiogroup" aria-label="Modalidade preferida">
            ${[["presencial", "Presencial"], ["remota", "Remota"], ["qualquer", "Qualquer"]].map(([v, t]) => `<label><input type="radio" name="modalidade" value="${v}" ${p.modalidade === v ? "checked" : ""}><span>${t}</span></label>`).join("")}
          </div>
        </div>
        <div class="campo-form">
          <label for="remMin">Remuneração mínima <span class="opcional">(opcional)</span></label>
          <div class="prefixo"><span>R$</span><input type="number" id="remMin" name="remMin" min="0" step="50" value="${p.remMin}" placeholder="0"></div>
        </div>
        ${p.modalidade !== "remota" ? `
        <div class="campo-form cheio">
          <span class="rotulo">Regiões de fácil acesso <span class="opcional">(nenhuma = qualquer região)</span></span>
          <div class="chips" role="group" aria-label="Regiões">${REGIOES.map((r) => chip("regioes", r, r, p.regioes.includes(r))).join("")}</div>
        </div>` : ""}
      </div>
    </section>

    <section class="secao-perfil" id="grade">
      <h2><i class="ti ti-calendar-week"></i> Grade de aulas</h2>
      <p>Importada do portal do aluno. Ajuste se algo mudou: a agenda de entrevistas avisa quando um horário conflita com uma aula.</p>
      <div class="aulas ${erros.aulas ? "invalido" : ""}">
        ${p.aulas.length ? `<div class="aula-cab"><span>Dia</span><span>Início</span><span>Fim</span><span>Disciplina</span><span></span></div>` : ""}
        ${p.aulas.map((a, i) => `
        <div class="aula-linha">
          <select data-aula="${i}" data-campo="dia" aria-label="Dia da aula ${i + 1}">${DIAS.map((d) => `<option value="${d.id}" ${d.id === a.dia ? "selected" : ""}>${d.nome}</option>`).join("")}</select>
          <input type="time" data-aula="${i}" data-campo="ini" value="${a.ini}" step="600" aria-label="Início da aula ${i + 1}">
          <input type="time" data-aula="${i}" data-campo="fim" value="${a.fim}" step="600" aria-label="Fim da aula ${i + 1}">
          <input type="text" data-aula="${i}" data-campo="disciplina" value="${esc(a.disciplina)}" placeholder="Disciplina" aria-label="Disciplina da aula ${i + 1}">
          <button type="button" class="btn btn-texto btn-icone" data-rem-aula="${i}" aria-label="Remover aula ${i + 1}"><i class="ti ti-trash"></i></button>
        </div>`).join("") || '<p class="ajuda">Nenhuma aula cadastrada. Sem grade, a agenda não consegue avisar conflitos.</p>'}
        ${erro("aulas")}
      </div>
      <div class="aulas-acoes">
        <button type="button" class="btn" data-add-aula><i class="ti ti-plus"></i> Adicionar aula</button>
        <button type="button" class="btn btn-texto" data-importar-grade><i class="ti ti-download"></i> Importar de novo do portal</button>
      </div>
    </section>

    <section class="secao-perfil">
      <h2><i class="ti ti-id"></i> Currículo e acessibilidade</h2>
      <p>Opcional. O currículo é anexado automaticamente quando uma vaga pedir.</p>
      <div class="grade-campos">
        <div class="campo-form cheio">
          <div class="anexo-cv">
            <i class="ti ti-file-cv ic"></i>
            <div class="nome">${p.curriculo ? `<b>${esc(p.curriculo.nome)}</b><small>${esc(p.curriculo.tamanho)}</small>` : "Nenhum currículo enviado<small>PDF de até 5 MB</small>"}</div>
            <label><input type="file" id="curriculo" accept=".pdf" aria-label="Enviar currículo em PDF"><span class="btn"><i class="ti ti-upload"></i> ${p.curriculo ? "Trocar" : "Enviar"}</span></label>
          </div>
        </div>
        <div class="campo-form cheio">
          <label class="check-linha"><input type="checkbox" name="pcd" ${p.pcd ? "checked" : ""}> Sou pessoa com deficiência e quero informar recursos de acessibilidade</label>
        </div>
        ${p.pcd ? `
        <div class="campo-form cheio">
          <label for="acessibilidade">Recursos de que você precisa <span class="opcional">(visível só para ofertantes de vagas em que você se candidatar)</span></label>
          <textarea id="acessibilidade" name="acessibilidade" placeholder="Intérprete de Libras na entrevista, leitor de tela, mesa adaptada…">${esc(p.acessibilidade)}</textarea>
        </div>` : ""}
        <div class="campo-form cheio">
          <label class="check-linha"><input type="checkbox" name="avisos" ${p.avisos ? "checked" : ""}> Avisar quando surgirem vagas compatíveis com este perfil</label>
        </div>
      </div>
    </section>

    <div class="barra-salvar">
      <span id="compat"><i class="ti ti-radar"></i> <b>${n}</b> ${n === 1 ? "vaga aberta combina" : "vagas abertas combinam"} com este perfil agora.</span>
      <div class="dir">
        ${BEM_VINDO ? '<a class="btn btn-texto" href="mural.html">Pular por enquanto</a>' : ""}
        <button type="submit" class="btn btn-primario"><i class="ti ti-device-floppy"></i> ${BEM_VINDO ? "Salvar e ver vagas" : "Salvar perfil"}</button>
      </div>
    </div>`;
}

/* ---------- Validação ---------- */
function validar() {
  const e = {};
  if (!p.curso) e.curso = "Selecione o seu curso.";
  if (!(p.semestre >= 1 && p.semestre <= 14)) e.semestre = "Informe um semestre entre 1 e 14.";
  if (!p.areas.length) e.areas = "Marque pelo menos uma área de interesse.";
  if (!p.tipos.length) e.tipos = "Marque pelo menos um tipo de oportunidade.";
  if (!p.dias.length) e.dias = "Marque pelo menos um dia disponível.";
  const ruim = p.aulas.findIndex((a) => !a.ini || !a.fim || a.fim <= a.ini);
  if (ruim >= 0) e.aulas = `Aula ${ruim + 1}: o horário de fim precisa ser depois do início.`;
  return e;
}

/* ---------- Eventos ---------- */
const MULTI = ["areas", "tipos", "dias", "regioes"];
$("#form").addEventListener("input", (e) => {
  const el = e.target;
  // Linhas da grade de aulas
  if (el.dataset.aula !== undefined) {
    p.aulas[Number(el.dataset.aula)][el.dataset.campo] = el.value;
    if (erros.aulas) { delete erros.aulas; document.querySelector(".aulas")?.classList.remove("invalido"); document.querySelector(".aulas .erro-campo")?.remove(); }
    return;
  }
  if (!el.name) return;
  if (MULTI.includes(el.name)) p[el.name] = [...document.querySelectorAll(`input[name="${el.name}"]:checked`)].map((i) => i.value);
  else if (el.type === "checkbox") p[el.name] = el.checked;
  else if (el.type === "number" || el.type === "range") p[el.name] = el.value === "" ? "" : Number(el.value);
  else p[el.name] = el.value;
  if (el.name === "horas") { $("#horas-valor").textContent = `até ${p.horas}h`; }
  delete erros[el.name];
  // Redesenha só quando a estrutura muda; nos demais casos atualiza a contagem
  if (["pcd", "modalidade", "tipos", "dias"].includes(el.name) || (el.name === "horas" && p.tipos.includes("estagio"))) {
    const foco = el.type === "radio" || el.type === "checkbox" ? `input[name="${el.name}"][value="${el.value}"]` : `#${el.id}`;
    render();
    document.querySelector(foco)?.focus();
  } else {
    const box = el.closest(".campo-form");
    box?.classList.remove("invalido"); box?.querySelector(".erro-campo")?.remove();
    const n = compativeis().length;
    $("#compat").innerHTML = `<i class="ti ti-radar"></i> <b>${n}</b> ${n === 1 ? "vaga aberta combina" : "vagas abertas combinam"} com este perfil agora.`;
  }
});

$("#form").addEventListener("click", (e) => {
  if (e.target.closest("[data-add-aula]")) {
    const ultima = p.aulas[p.aulas.length - 1];
    p.aulas.push({ dia: ultima ? ultima.dia : "seg", ini: "08:30", fim: "10:10", disciplina: "" });
    render();
    document.querySelector(`[data-aula="${p.aulas.length - 1}"][data-campo="dia"]`)?.focus();
  }
  const rem = e.target.closest("[data-rem-aula]");
  if (rem) {
    p.aulas.splice(Number(rem.dataset.remAula), 1);
    delete erros.aulas;
    render();
    document.querySelector("[data-add-aula]")?.focus();
  }
  if (e.target.closest("[data-importar-grade]")) {
    p.aulas = GRADE_PORTAL.map((a) => ({ ...a }));
    delete erros.aulas;
    render();
    Radar.toast("Grade importada do portal do aluno (simulado).", "ti-download");
  }
});

$("#form").addEventListener("change", (e) => {
  if (e.target.id !== "curriculo" || !e.target.files[0]) return;
  const f = e.target.files[0];
  if (f.type !== "application/pdf") return Radar.toast("Envie o currículo em PDF.", "ti-alert-circle");
  if (f.size > 5 * 1024 * 1024) return Radar.toast("O arquivo passa de 5 MB.", "ti-alert-circle");
  p.curriculo = { nome: f.name, tamanho: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB` };
  render();
  Radar.toast("Currículo anexado.", "ti-file-check");
});

$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  erros = validar();
  if (Object.keys(erros).length) {
    render();
    const aulaRuim = p.aulas.findIndex((a) => !a.ini || !a.fim || a.fim <= a.ini);
    const alvo = document.querySelector(".campo-form.invalido select, .campo-form.invalido input")
      || document.querySelector(`[data-aula="${aulaRuim}"][data-campo="fim"]`);
    alvo?.focus(); alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  Radar.salvar("radar:perfil-estudante", p);
  original = JSON.stringify(p);
  if (BEM_VINDO) { location.href = "mural.html?usar-perfil"; return; }
  Radar.toast("Perfil atualizado.", "ti-circle-check");
});

window.addEventListener("beforeunload", (e) => { if (!BEM_VINDO && JSON.stringify(p) !== original) e.preventDefault(); });

renderCabecalho();
render();
