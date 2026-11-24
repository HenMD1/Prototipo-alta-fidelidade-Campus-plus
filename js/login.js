/* ==========================================================
   Entrada do Radar
   - Login do estudante (cartão UFRGS) e do ofertante (e-mail)
   - Solicitação de acesso para empresas (análise da universidade)
   - Recuperação de senha
   Protótipo: as credenciais são só validadas no formato, e a
   sessão fica no navegador (radar:sessao).
   ========================================================== */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PARAMS = new URLSearchParams(location.search);
let tela = PARAMS.has("criar") ? "criar" : "login";
let aba = (PARAMS.get("perfil") || PARAMS.get("criar")) === "ofertante" ? "ofertante" : "estudante";
const CURSOS = ["Ciência da Computação", "Engenharia de Computação", "Sistemas de Informação", "Engenharia Civil", "Engenharia de Produção",
  "Administração", "Jornalismo", "Publicidade e Propaganda", "Design Visual", "Estatística", "Nutrição", "Matemática"];
const CORES_EMPRESA = ["#7a3fbf", "#c2611f", "#1d8f8f", "#b4416b", "#3a6fd8", "#2b8a4b"];

/* ---------- Contas de teste (ambiente "do zero") ----------
   Ficam em radar:zero:contas, separadas da demonstração.
   A senha só é validada no formato e nunca é guardada. */
function lerZero(chave, padrao) {
  try { return JSON.parse(localStorage.getItem("radar:zero:" + chave)) ?? padrao; } catch { return padrao; }
}
function salvarZero(chave, valor) {
  try { localStorage.setItem("radar:zero:" + chave, JSON.stringify(valor)); } catch { /* sem armazenamento */ }
}
const contasZero = () => lerZero("contas", {});
let erros = {};
let valores = {};
let enviando = false;
let primeiroAcesso = false;

/* ---------- Números do mural (vêm dos dados reais do protótipo) ---------- */
function renderNumeros() {
  const abertas = OPORTUNIDADES.filter((o) => o.status === "aberta");
  const ofertantes = new Set(abertas.map((o) => o.ofertante));
  const vagas = abertas.reduce((s, o) => s + o.vagas, 0);
  $("#numeros").innerHTML = `
    <div><strong>${abertas.length}</strong><span>oportunidades abertas</span></div>
    <div><strong>${vagas}</strong><span>vagas disponíveis</span></div>
    <div><strong>${ofertantes.size}</strong><span>ofertantes autorizados</span></div>`;
}

/* ---------- Campos ---------- */
function campo({ id, rotulo, tipo = "text", icone, placeholder = "", ajuda = "", extraRotulo = "", attrs = "" }) {
  const e = erros[id];
  return `
  <div class="campo-acesso ${e ? "invalido" : ""}">
    <label for="${id}"><span>${rotulo}</span>${extraRotulo}</label>
    <div class="entrada">
      <i class="ti ${icone}"></i>
      <input id="${id}" name="${id}" type="${tipo}" value="${esc(valores[id] || "")}" placeholder="${placeholder}" ${attrs} ${e ? `aria-invalid="true" aria-describedby="erro-${id}"` : ""}>
      ${tipo === "password" ? `<button type="button" class="ver-senha" data-ver="${id}" aria-label="Mostrar senha"><i class="ti ti-eye"></i></button>` : ""}
    </div>
    ${e ? `<p class="erro-campo" id="erro-${id}"><i class="ti ti-alert-circle"></i>${e}</p>` : ajuda ? `<p class="ajuda">${ajuda}</p>` : ""}
  </div>`;
}

function botaoEnviar(rotulo, icone) {
  return `<button type="submit" class="btn btn-primario btn-grande" ${enviando ? "disabled" : ""}>
    ${enviando ? '<i class="ti ti-loader-2 girando"></i> Aguarde…' : `${icone ? `<i class="ti ${icone}"></i> ` : ""}${rotulo}`}</button>`;
}

function blocoTeste() {
  const c = contasZero();
  const atalhos = [
    c.estudante ? `<button type="button" class="btn" data-entrar-teste="estudante"><i class="ti ti-school"></i> ${esc(c.estudante.nome)}</button>` : "",
    c.ofertante ? `<button type="button" class="btn" data-entrar-teste="ofertante"><i class="ti ti-building"></i> ${esc(c.ofertante.empresa)}</button>` : "",
  ].join("");
  return `
    <div class="bloco-teste">
      <strong><i class="ti ti-flask"></i> Testar do zero</strong>
      <p>Crie o seu próprio estudante ou ofertante, sem os dados da demonstração.</p>
      ${atalhos ? `<div class="atalhos-teste"><span>Suas contas de teste:</span>${atalhos}</div>` : ""}
      <button type="button" class="btn btn-texto" data-tela="criar" style="padding:0"><i class="ti ti-user-plus"></i> Criar conta de teste</button>
    </div>`;
}

/* ---------- Telas ---------- */
const TELAS = {
  login() {
    const est = aba === "estudante";
    return `
      <h2>Entrar no Radar</h2>
      <p class="sub">${est ? "Use o seu cartão UFRGS e a mesma senha do portal da universidade." : "Acesso para empresas e unidades acadêmicas com cadastro aprovado."}</p>
      <div class="perfil-abas" role="tablist" aria-label="Tipo de acesso">
        <button type="button" role="tab" data-aba="estudante" aria-selected="${est}"><i class="ti ti-school"></i> Estudante</button>
        <button type="button" role="tab" data-aba="ofertante" aria-selected="${!est}"><i class="ti ti-building"></i> Ofertante</button>
      </div>
      <form class="form-acesso" id="form" novalidate>
        <div class="erro-geral" id="erro-geral" role="alert">${erros.geral ? `<i class="ti ti-alert-circle"></i>${erros.geral}` : ""}</div>
        ${est
          ? campo({ id: "cartao", rotulo: "Cartão UFRGS", icone: "ti-id-badge-2", placeholder: "00312345", ajuda: "8 dígitos, impressos no seu cartão de estudante.", attrs: 'inputmode="numeric" maxlength="8" autocomplete="username"' })
          : campo({ id: "email", rotulo: "E-mail", tipo: "email", icone: "ti-mail", placeholder: "rh@empresa.com.br", attrs: 'autocomplete="username"' })}
        ${campo({ id: "senha", rotulo: "Senha", tipo: "password", icone: "ti-lock", attrs: 'autocomplete="current-password"',
          extraRotulo: `<button type="button" data-tela="recuperar">Esqueci a senha</button>` })}
        <label class="lembrar"><input type="checkbox" id="lembrar" ${valores.lembrar !== false ? "checked" : ""}> Manter conectado neste dispositivo</label>
        ${botaoEnviar("Entrar", "ti-login-2")}
        <div class="divisor">ou</div>
        <button type="button" class="btn demo-acesso" data-demo><i class="ti ti-player-play"></i> Entrar com a conta de demonstração</button>
      </form>
      <div class="rodape-acesso">${est
        ? "Primeiro acesso? Entre com o seu cartão: o Radar cria o seu perfil."
        : 'Sua empresa ainda não tem acesso? <button type="button" data-tela="solicitar">Solicitar cadastro</button>'}</div>
      ${blocoTeste()}`;
  },

  criar() {
    const est = aba === "estudante";
    const existente = contasZero()[aba];
    return `
      <button class="voltar-acesso" data-tela="login"><i class="ti ti-arrow-left"></i> Voltar</button>
      <h2>Criar conta de teste</h2>
      <p class="sub">Para testar o sistema do zero, sem os dados da demonstração.</p>
      <div class="perfil-abas" role="tablist" aria-label="Tipo de conta">
        <button type="button" role="tab" data-aba="estudante" aria-selected="${est}"><i class="ti ti-school"></i> Estudante</button>
        <button type="button" role="tab" data-aba="ofertante" aria-selected="${!est}"><i class="ti ti-building"></i> Ofertante</button>
      </div>
      <div class="info-acesso" style="margin-bottom:14px"><i class="ti ti-flask"></i><span>A conta fica só neste navegador, num ambiente separado da demonstração. Crie um estudante <b>e</b> um ofertante para testar o caminho completo entre os dois.</span></div>
      ${primeiroAcesso && est ? `<div class="info-acesso" style="margin-bottom:14px"><i class="ti ti-user-plus"></i><span>Primeiro acesso com o cartão <b>${esc(valores.cartao)}</b>. Complete seus dados para criar o seu perfil.</span></div>` : ""}
      ${existente ? `<div class="info-acesso" style="margin-bottom:14px;background:var(--alerta-bg);border-color:#f1d7a6;color:var(--alerta-tx)"><i class="ti ti-user-exclamation"></i><span>Você já criou <b>${esc(est ? existente.nome : existente.empresa)}</b>. <button type="button" class="link-inline" data-entrar-teste="${aba}">Entrar com essa conta</button>, ou crie outra: ela substitui a anterior e recomeça os dados do teste.</span></div>` : ""}
      <form class="form-acesso" id="form" novalidate>
        ${est ? `
          ${campo({ id: "nome", rotulo: "Nome completo", icone: "ti-user", placeholder: "Nome e sobrenome", attrs: 'autocomplete="name"' })}
          ${campo({ id: "cartao", rotulo: "Cartão UFRGS", icone: "ti-id-badge-2", placeholder: "8 dígitos", attrs: 'inputmode="numeric" maxlength="8"' })}
          <div class="campo-acesso ${erros.curso ? "invalido" : ""}">
            <label for="curso"><span>Curso</span></label>
            <div class="entrada"><i class="ti ti-school"></i>
              <select id="curso" name="curso"><option value="">Selecione</option>${CURSOS.map((c) => `<option ${c === valores.curso ? "selected" : ""}>${c}</option>`).join("")}</select>
            </div>
            ${erros.curso ? `<p class="erro-campo"><i class="ti ti-alert-circle"></i>${erros.curso}</p>` : ""}
          </div>
          ${campo({ id: "semestre", rotulo: "Semestre atual", tipo: "number", icone: "ti-stairs", placeholder: "1 a 14", attrs: 'min="1" max="14"' })}
        ` : `
          <div class="campo-acesso">
            <label><span>Tipo de ofertante</span></label>
            <div class="tipo-ofertante" role="radiogroup" aria-label="Tipo de ofertante">
              <label><input type="radio" name="tipo" value="Empresa" ${valores.tipo !== "Unidade acadêmica" ? "checked" : ""}> Empresa</label>
              <label><input type="radio" name="tipo" value="Unidade acadêmica" ${valores.tipo === "Unidade acadêmica" ? "checked" : ""}> Unidade da universidade</label>
            </div>
          </div>
          ${campo({ id: "empresa", rotulo: valores.tipo === "Unidade acadêmica" ? "Nome da unidade" : "Nome da empresa", icone: "ti-building", placeholder: valores.tipo === "Unidade acadêmica" ? "Instituto de Física" : "Minha Empresa Ltda." })}
          ${campo({ id: "responsavel", rotulo: "Seu nome (responsável)", icone: "ti-user", placeholder: "Nome e sobrenome", attrs: 'autocomplete="name"' })}
          ${campo({ id: "email", rotulo: "E-mail", tipo: "email", icone: "ti-mail", placeholder: "voce@empresa.com.br", ajuda: "Usado para entrar de novo com esta conta." })}
        `}
        ${campo({ id: "senha", rotulo: "Senha", tipo: "password", icone: "ti-lock", ajuda: "Mínimo de 6 caracteres. No protótipo ela não é guardada.", attrs: 'autocomplete="new-password"' })}
        ${botaoEnviar(est ? "Criar estudante e começar" : "Criar ofertante e começar", "ti-user-plus")}
      </form>`;
  },

  recuperar() {
    const est = aba === "estudante";
    if (est) {
      return `
        <button class="voltar-acesso" data-tela="login"><i class="ti ti-arrow-left"></i> Voltar</button>
        <h2>Recuperar senha</h2>
        <p class="sub">Estudantes entram com a mesma senha do portal da universidade.</p>
        <div class="info-acesso"><i class="ti ti-info-circle"></i><span>Para trocar ou recuperar a senha, use a opção de recuperação do portal do aluno da UFRGS. O Radar não guarda a sua senha.</span></div>
        <div class="rodape-acesso"><button type="button" data-tela="login">Voltar para o login</button></div>`;
    }
    return `
      <button class="voltar-acesso" data-tela="login"><i class="ti ti-arrow-left"></i> Voltar</button>
      <h2>Recuperar senha</h2>
      <p class="sub">Enviaremos um link para criar uma nova senha.</p>
      <form class="form-acesso" id="form" novalidate>
        ${campo({ id: "email", rotulo: "E-mail cadastrado", tipo: "email", icone: "ti-mail", placeholder: "rh@empresa.com.br" })}
        ${botaoEnviar("Enviar link", "ti-send")}
      </form>`;
  },

  recuperado() {
    return `
      <div class="sucesso-acesso">
        <div class="ic"><i class="ti ti-mail-check"></i></div>
        <h2>Confira seu e-mail</h2>
        <p>Se <b>${esc(valores.email)}</b> estiver cadastrado, você receberá um link válido por 30 minutos.</p>
      </div>
      <div class="rodape-acesso"><button type="button" data-tela="login">Voltar para o login</button></div>`;
  },

  solicitar() {
    return `
      <button class="voltar-acesso" data-tela="login"><i class="ti ti-arrow-left"></i> Voltar</button>
      <h2>Solicitar cadastro de empresa</h2>
      <p class="sub">O Radar é um espaço autorizado pela universidade: cada empresa passa por uma análise antes de publicar vagas.</p>
      <form class="form-acesso" id="form" novalidate>
        ${campo({ id: "razao", rotulo: "Razão social", icone: "ti-building", placeholder: "Empresa Exemplo Ltda." })}
        ${campo({ id: "cnpj", rotulo: "CNPJ", icone: "ti-file-certificate", placeholder: "00.000.000/0000-00", attrs: 'inputmode="numeric" maxlength="18"' })}
        ${campo({ id: "responsavel", rotulo: "Nome do responsável", icone: "ti-user", placeholder: "Nome e sobrenome" })}
        ${campo({ id: "email", rotulo: "E-mail corporativo", tipo: "email", icone: "ti-mail", placeholder: "rh@empresa.com.br", ajuda: "Use um e-mail do domínio da empresa." })}
        <button type="button" class="btn btn-texto" data-exemplo style="align-self:flex-start;padding:0"><i class="ti ti-wand"></i> Preencher com dados de exemplo</button>
        ${botaoEnviar("Enviar solicitação", "ti-send")}
      </form>`;
  },

  solicitado() {
    return `
      <div class="sucesso-acesso">
        <div class="ic"><i class="ti ti-circle-check"></i></div>
        <h2>Solicitação enviada</h2>
        <p>Recebemos o pedido de <b>${esc(valores.razao)}</b>. Acompanhe pelo e-mail <b>${esc(valores.email)}</b>.</p>
        <ul class="passos-analise">
          <li><i class="ti ti-search"></i><span>A universidade confere o CNPJ e os dados da empresa (até 5 dias úteis).</span></li>
          <li><i class="ti ti-file-text"></i><span>Você assina o termo de convênio para concessão de estágio.</span></li>
          <li><i class="ti ti-key"></i><span>Liberado o acesso, você cria a senha e publica as primeiras vagas.</span></li>
        </ul>
      </div>
      <div class="rodape-acesso"><button type="button" data-tela="login">Voltar para o login</button></div>`;
  },
};

function render(focar) {
  $("#cartao-acesso").innerHTML = TELAS[tela]();
  const alvo = focar || document.querySelector('.campo-acesso.invalido input') || (tela !== "login" ? document.querySelector("#cartao-acesso input") : null);
  alvo?.focus();
}

/* ---------- Validação ---------- */
function cnpjValido(v) {
  const n = v.replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const dig = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = [...base].reduce((t, c, i) => t + Number(c) * pesos[i], 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  return dig(n.slice(0, 12)) === Number(n[12]) && dig(n.slice(0, 13)) === Number(n[13]);
}
function mascaraCnpj(v) {
  const n = v.replace(/\D/g, "").slice(0, 14);
  return n.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

function validar() {
  const e = {};
  if (tela === "login") {
    if (aba === "estudante") {
      if (!/^\d{8}$/.test(valores.cartao || "")) e.cartao = "Informe os 8 dígitos do cartão UFRGS.";
    } else if (!EMAIL.test(valores.email || "")) e.email = "Informe um e-mail válido.";
    if (!valores.senha) e.senha = "Informe a senha.";
    else if (valores.senha.length < 6) e.senha = "A senha tem pelo menos 6 caracteres.";
  }
  if (tela === "criar") {
    if (aba === "estudante") {
      if ((valores.nome || "").trim().split(/\s+/).length < 2) e.nome = "Informe nome e sobrenome.";
      if (!/^\d{8}$/.test(valores.cartao || "")) e.cartao = "Informe os 8 dígitos do cartão UFRGS.";
      if (!valores.curso) e.curso = "Selecione o curso.";
      if (!(Number(valores.semestre) >= 1 && Number(valores.semestre) <= 14)) e.semestre = "Informe um semestre entre 1 e 14.";
    } else {
      if ((valores.empresa || "").trim().length < 3) e.empresa = "Informe o nome.";
      if ((valores.responsavel || "").trim().split(/\s+/).length < 2) e.responsavel = "Informe nome e sobrenome.";
      if (!EMAIL.test(valores.email || "")) e.email = "Informe um e-mail válido.";
    }
    if (!valores.senha || valores.senha.length < 6) e.senha = "Use pelo menos 6 caracteres.";
  }
  if (tela === "recuperar" && !EMAIL.test(valores.email || "")) e.email = "Informe um e-mail válido.";
  if (tela === "solicitar") {
    if ((valores.razao || "").trim().length < 3) e.razao = "Informe a razão social.";
    if (!cnpjValido(valores.cnpj || "")) e.cnpj = "CNPJ inválido. Confira os 14 dígitos.";
    if ((valores.responsavel || "").trim().split(/\s+/).length < 2) e.responsavel = "Informe nome e sobrenome.";
    if (!EMAIL.test(valores.email || "")) e.email = "Informe um e-mail válido.";
    else if (/@(gmail|hotmail|outlook|yahoo|bol|uol)\./i.test(valores.email)) e.email = "Use o e-mail corporativo, não um e-mail pessoal.";
  }
  return e;
}

/* ---------- Envio ---------- */
function entrar(perfil, ambiente = "demo") {
  const sessao = { perfil, ambiente, desde: new Date().toISOString(), lembrar: valores.lembrar !== false };
  Radar.salvar("radar:sessao", sessao);
  if (perfil === "estudante") {
    const temPerfil = ambiente === "zero" ? lerZero("perfil-estudante", null) : JSON.parse(localStorage.getItem("radar:perfil-estudante") || "null");
    location.href = temPerfil ? "mural.html" : "perfil.html?bemvindo";
  } else {
    location.href = ambiente === "zero" ? "vagas.html" : "agenda-ofertante.html";
  }
}

// Login: se o cartão/e-mail for de uma conta de teste, entra no ambiente do zero
const CARTAO_DEMO = "00312345";
const EMAIL_DEMO = "mariana.souza@techsul.com.br";

// Para onde o login leva: conta de teste, demonstração ou primeiro acesso
function ambienteDoLogin() {
  const c = contasZero();
  if (aba === "estudante") {
    if (c.estudante && c.estudante.cartao === valores.cartao) return "zero";
    return valores.cartao === CARTAO_DEMO ? "demo" : "novo";
  }
  const email = (valores.email || "").toLowerCase();
  if (c.ofertante && c.ofertante.email.toLowerCase() === email) return "zero";
  return email === EMAIL_DEMO ? "demo" : "novo";
}

function criarConta() {
  const contas = contasZero();
  let conta;
  if (aba === "estudante") {
    conta = { nome: valores.nome.trim().replace(/\s+/g, " "), cartao: valores.cartao, curso: valores.curso, semestre: Number(valores.semestre), criadaEm: new Date().toISOString() };
  } else {
    const nome = valores.empresa.trim().replace(/\s+/g, " ");
    const sigla = nome.split(" ").filter((p) => p.length > 2 && !/^(ltda|s\.?a\.?|me|eireli)$/i.test(p)).slice(0, 3).map((p) => p[0]).join("").toUpperCase() || nome.slice(0, 2).toUpperCase();
    conta = { empresa: nome, tipo: valores.tipo || "Empresa", responsavel: valores.responsavel.trim().replace(/\s+/g, " "), email: valores.email.trim(),
      sigla, cor: (contas.ofertante && contas.ofertante.cor) || CORES_EMPRESA[Math.floor(Math.random() * CORES_EMPRESA.length)], criadaEm: new Date().toISOString() };
  }
  if (contas[aba]) {
    Object.keys(localStorage).filter((k) => k.startsWith("radar:zero:") && k !== "radar:zero:contas").forEach((k) => localStorage.removeItem(k));
  }
  contas[aba] = conta;
  salvarZero("contas", contas);
  // Notificação de boas-vindas na caixa do novo perfil
  const notifs = lerZero(`notificacoes:${aba}`, []);
  notifs.unshift({ id: Date.now(), icone: "ti-confetti", lida: false, quando: "agora",
    texto: aba === "estudante" ? "Conta de teste criada. Complete o perfil e procure vagas no mural." : "Conta de teste criada. Cadastre a primeira vaga para receber candidatos.",
    link: aba === "estudante" ? "perfil.html" : "vagas.html?nova" });
  salvarZero(`notificacoes:${aba}`, notifs);
  valores.lembrar = true;
  const sessao = { perfil: aba, ambiente: "zero", desde: new Date().toISOString(), lembrar: true };
  Radar.salvar("radar:sessao", sessao);
  location.href = aba === "estudante" ? "perfil.html?bemvindo" : "vagas.html?nova";
}

function enviar() {
  erros = validar();
  if (Object.keys(erros).length) { render(); return; }
  enviando = true; render();
  // Simula a ida ao servidor
  setTimeout(() => {
    enviando = false;
    if (tela === "login") {
      const destino = ambienteDoLogin();
      if (destino !== "novo") return entrar(aba, destino);
      if (aba === "estudante") {
        // Primeiro acesso com este cartão: cria a conta (de teste) já com o cartão preenchido
        tela = "criar"; primeiroAcesso = true;
        valores = { cartao: valores.cartao, lembrar: valores.lembrar };
        history.replaceState(null, "", "?criar=estudante");
        render();
      } else {
        erros = { geral: 'E-mail sem cadastro. Use a conta de demonstração ou <button type="button" class="link-inline" data-tela="criar">crie uma conta de teste</button>.' };
        render();
      }
      return;
    }
    if (tela === "criar") return criarConta();
    if (tela === "recuperar") { tela = "recuperado"; render(); return; }
    if (tela === "solicitar") { tela = "solicitado"; render(); }
  }, 900);
}

/* ---------- Eventos ---------- */
const cartao = $("#cartao-acesso");
cartao.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "lembrar") { valores.lembrar = el.checked; return; }
  if (el.name === "tipo") { valores.tipo = el.value; render(); return; }
  if (!el.name) return;
  if (el.name === "cartao") el.value = el.value.replace(/\D/g, "").slice(0, 8);
  if (el.name === "cnpj") el.value = mascaraCnpj(el.value);
  valores[el.name] = el.value;
  if (erros[el.name] || erros.geral) {
    delete erros[el.name]; delete erros.geral;
    const box = el.closest(".campo-acesso");
    box.classList.remove("invalido");
    el.removeAttribute("aria-invalid");
    box.querySelector(".erro-campo")?.remove();
    $("#erro-geral") && ($("#erro-geral").innerHTML = "");
  }
});
cartao.addEventListener("submit", (e) => { e.preventDefault(); if (!enviando) enviar(); });
cartao.addEventListener("click", (e) => {
  const abaBtn = e.target.closest("[data-aba]");
  if (abaBtn) {
    aba = abaBtn.dataset.aba; erros = {}; valores = { lembrar: valores.lembrar }; primeiroAcesso = false;
    history.replaceState(null, "", tela === "criar" ? `?criar=${aba}` : aba === "ofertante" ? "?perfil=ofertante" : location.pathname);
    render(); return;
  }
  const t = e.target.closest("[data-tela]");
  if (t) { tela = t.dataset.tela; erros = {}; primeiroAcesso = false; if (tela === "login") valores = { lembrar: valores.lembrar }; render(); return; }
  const ver = e.target.closest("[data-ver]");
  if (ver) {
    const input = document.getElementById(ver.dataset.ver);
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    ver.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
    ver.innerHTML = `<i class="ti ${mostrar ? "ti-eye-off" : "ti-eye"}"></i>`;
    return;
  }
  const teste = e.target.closest("[data-entrar-teste]");
  if (teste) { aba = teste.dataset.entrarTeste; valores.lembrar = true; entrar(aba, "zero"); return; }
  if (e.target.closest("[data-demo]")) {
    // Conta de demonstração: João (estudante) ou Mariana Souza, da TechSul (ofertante)
    valores = aba === "estudante" ? { cartao: "00312345", senha: "demonstracao", lembrar: true } : { email: "mariana.souza@techsul.com.br", senha: "demonstracao", lembrar: true };
    erros = {}; render(); enviar(); return;
  }
  if (e.target.closest("[data-exemplo]")) {
    valores = { ...valores, razao: "Empresa Exemplo Tecnologia Ltda.", cnpj: "11.222.333/0001-81", responsavel: "Paula Ferreira", email: "paula@empresaexemplo.com.br" };
    erros = {}; render(); return;
  }
});

// Já está conectado? Vai direto para a tela inicial do perfil.
const sessao = Radar.ler("radar:sessao", null);
if (sessao && sessao.lembrar && !PARAMS.has("sair") && !PARAMS.has("criar")) {
  location.replace(sessao.perfil === "ofertante" ? (sessao.ambiente === "zero" ? "vagas.html" : "agenda-ofertante.html") : "mural.html");
} else {
  renderNumeros();
  render();
}
