/* ==========================================================
   Radar — código compartilhado entre as telas
   - Barra superior (navegação, troca de perfil, notificações)
   - Serviço de notificações por perfil (estudante / ofertante)
   - Toast, armazenamento e utilitários de data
   ========================================================== */

const Radar = (() => {
  /* ---------- Ambientes ----------
     "demo": dados de exemplo (João Silva e TechSul).
     "zero": contas criadas pelo usuário para testar do zero. Tudo o que é
             salvo nele usa chaves "radar:zero:*", então a demonstração
             nunca é afetada. */
  const GLOBAIS = ["radar:sessao", "radar:versao"];
  let sessaoBruta = null;
  try { sessaoBruta = JSON.parse(localStorage.getItem("radar:sessao")); } catch { /* sem armazenamento */ }
  const ZERO = sessaoBruta?.ambiente === "zero";
  const OFERTANTE_ZERO = "minha-empresa";   // id da empresa/unidade criada no ambiente do zero

  function chaveReal(chave) {
    if (ZERO && chave.startsWith("radar:") && !GLOBAIS.includes(chave)) return "radar:zero:" + chave.slice(6);
    return chave;
  }

  /* ---------- Armazenamento seguro ---------- */
  function ler(chave, padrao) {
    try {
      const v = JSON.parse(localStorage.getItem(chaveReal(chave)));
      return v ?? padrao;
    } catch { return padrao; }
  }
  function salvar(chave, valor) {
    try { localStorage.setItem(chaveReal(chave), JSON.stringify(valor)); } catch { /* sem armazenamento */ }
  }
  function apagar(chave) {
    try { localStorage.removeItem(chaveReal(chave)); } catch { /* sem armazenamento */ }
  }

  /* ---------- Contas do ambiente do zero ---------- */
  function contas() { return ZERO ? ler("radar:contas", {}) : {}; }
  function conta(p) { return contas()[p] || null; }
  function iniciaisDe(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    return ((partes[0] || "?")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }
  // Estudante logado (na demonstração, sempre João Silva)
  function estudante() {
    if (!ZERO) return { nome: "João Silva", iniciais: "JS", curso: "Ciência da Computação", semestre: 5, matricula: "00312345" };
    const c = conta("estudante");
    if (!c) return { nome: "Estudante", iniciais: "E", curso: "", semestre: null, matricula: "" };
    return { nome: c.nome, iniciais: iniciaisDe(c.nome), curso: c.curso, semestre: c.semestre, matricula: c.cartao };
  }
  // Id do ofertante logado (na demonstração, a TechSul)
  function ofertanteId() { return ZERO ? (conta("ofertante") ? OFERTANTE_ZERO : null) : "techsul"; }

  /* ---------- Datas ---------- */
  const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  function hoje() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function somarDias(data, n) {
    const d = new Date(data);
    d.setDate(d.getDate() + n);
    return d;
  }
  // Primeira segunda-feira depois de hoje: base das agendas de entrevista.
  function proximaSegunda() {
    const h = hoje();
    const falta = ((8 - h.getDay()) % 7) || 7;
    return somarDias(h, falta);
  }
  function fmtDia(d) {
    return `${DIAS_CURTOS[d.getDay()]}, ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  }
  function fmtDiaLongo(d) {
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  }
  function diasAte(d) {
    return Math.round((d - hoje()) / 86400000);
  }

  /* ---------- Toast ---------- */
  let toastEl, toastTimer;
  function toast(msg, icone = "ti-info-circle") {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<i class="ti ${icone}"></i><span>${msg}</span>`;
    toastEl.classList.add("visivel");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("visivel"), 3400);
  }

  /* ---------- Perfis ---------- */
  const PERFIS = {
    estudante: {
      iniciais: "JS", nome: "João Silva", papel: "Estudante · Ciência da Computação",
      inicio: "mural.html",
      nav: [
        { id: "mural", href: "mural.html", icone: "ti-layout-grid", nome: "Mural" },
        { id: "candidaturas", href: "candidaturas.html", icone: "ti-file-check", nome: "Minhas candidaturas" },
        { id: "entrevistas", href: "agenda.html", icone: "ti-calendar-event", nome: "Entrevistas" },
        { id: "mensagens", href: "mensagens.html", icone: "ti-message-circle", nome: "Mensagens" },
      ],
    },
    ofertante: {
      iniciais: "MS", nome: "Mariana Souza", papel: "TechSul Sistemas · Ofertante",
      inicio: "agenda-ofertante.html",
      nav: [
        { id: "vagas", href: "vagas.html", icone: "ti-briefcase", nome: "Minhas vagas" },
        { id: "agenda", href: "agenda-ofertante.html", icone: "ti-calendar-cog", nome: "Agenda de entrevistas" },
        { id: "candidatos", href: "candidatos.html", icone: "ti-users", nome: "Candidatos" },
        { id: "mensagens", href: "mensagens.html?perfil=ofertante", icone: "ti-message-circle", nome: "Mensagens" },
      ],
    },
  };

  if (ZERO) {
    const e = conta("estudante"), o = conta("ofertante");
    if (e) Object.assign(PERFIS.estudante, { nome: e.nome, iniciais: iniciaisDe(e.nome), papel: `Estudante · ${e.curso}` });
    if (o) Object.assign(PERFIS.ofertante, { nome: o.responsavel, iniciais: iniciaisDe(o.responsavel), papel: `${o.empresa} · Ofertante` });
    PERFIS.ofertante.inicio = "vagas.html";
  }

  /* ---------- Notificações (uma caixa por perfil) ---------- */
  const NOTIF_INICIAIS = {
    estudante: [
      { id: 4, icone: "ti-trophy", texto: "Você foi aprovado em <b>Estágio em ciência de dados agrícolas</b>! Assine o termo de compromisso.", quando: "há 1 hora", link: "candidaturas.html?c=c-agro", lida: false },
      { id: 5, icone: "ti-file-alert", texto: "<b>Histórico escolar</b> foi recusado em <b>Iniciação científica em visão computacional</b>. Envie novamente.", quando: "ontem", link: "candidaturas.html?c=c-ic", lida: false },
      { id: 1, icone: "ti-calendar-plus", texto: "<b>TechSul Sistemas</b> disponibilizou horários de entrevista para <b>Estágio em desenvolvimento web</b>.", quando: "há 2 horas", link: "agenda.html?c=1", lida: false },
      { id: 2, icone: "ti-calendar-check", texto: "Sua entrevista com o <b>Instituto de Informática</b> está confirmada.", quando: "ontem", link: "agenda.html?c=2", lida: false },
      { id: 3, icone: "ti-sparkles", texto: "Nova vaga na sua área: <b>Desenvolvedor(a) back-end júnior</b>.", quando: "ontem", link: "mural.html", lida: false },
    ],
    ofertante: [
      { id: 11, icone: "ti-calendar-check", texto: "<b>Ana Ribeiro</b> marcou entrevista para <b>Estágio em desenvolvimento web</b>.", quando: "há 1 hora", link: "agenda-ofertante.html?vaga=1", lida: false },
      { id: 12, icone: "ti-users", texto: "4 candidatos aprovados na pré-seleção de <b>Estágio em DevOps</b> aguardam a agenda de entrevistas.", quando: "há 3 horas", link: "agenda-ofertante.html?vaga=17", lida: false },
    ],
  };
  const chaveNotif = (p) => `radar:notificacoes:${p}`;

  let perfil = "estudante";
  let notificacoes = [];

  function carregarNotificacoes(p) {
    return ler(chaveNotif(p), null) || (ZERO ? [] : structuredClone(NOTIF_INICIAIS[p]));
  }

  // Envia uma notificação para o perfil indicado (por padrão, quem está usando a tela).
  function notificar(texto, icone = "ti-bell", link = null, para = perfil) {
    const item = { id: Date.now() + Math.random(), icone, texto, quando: "agora", link, lida: false };
    if (para === perfil) {
      notificacoes.unshift(item);
      salvar(chaveNotif(perfil), notificacoes);
      renderNotificacoes();
      const sino = document.querySelector(".sino");
      if (sino) { sino.classList.remove("balanca"); void sino.offsetWidth; sino.classList.add("balanca"); }
    } else {
      const outra = carregarNotificacoes(para);
      outra.unshift(item);
      salvar(chaveNotif(para), outra);
    }
  }

  function renderNotificacoes() {
    const cont = document.querySelector(".sino .contador");
    const lista = document.querySelector(".notif-lista");
    if (!cont || !lista) return;
    const n = notificacoes.filter((x) => !x.lida).length;
    cont.textContent = n;
    cont.hidden = n === 0;
    document.querySelector(".sino").setAttribute("aria-label", `Notificações (${n} não lidas)`);
    lista.innerHTML = notificacoes.length
      ? notificacoes.map((x) => `
        <a class="notif-item ${x.lida ? "" : "nova"}" href="${x.link || "#"}" data-id="${x.id}">
          <span class="notif-icone"><i class="ti ${x.icone}"></i></span>
          <span><span class="notif-texto">${x.texto}</span><span class="notif-quando">${x.quando}</span></span>
        </a>`).join("")
      : `<p class="notif-vazia">Você está em dia com tudo.</p>`;
  }

  /* ---------- Barra superior ---------- */
  function montarTopo() {
    const topo = document.querySelector("header.topo");
    if (!topo) return;
    perfil = topo.dataset.perfil || "estudante";
    // No ambiente do zero, cada visão precisa da sua conta criada
    if (ZERO && !conta(perfil)) { location.replace(`index.html?criar=${perfil}`); return; }
    notificacoes = carregarNotificacoes(perfil);
    const u = PERFIS[perfil];
    const ativo = topo.dataset.pagina;

    topo.innerHTML = `
    <div class="topo-interno">
      <a class="marca" href="${u.inicio}">
        <svg class="marca-logo" viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#2453c6"/>
          <circle cx="20" cy="20" r="12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
          <circle cx="20" cy="20" r="7" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>
          <path d="M20 20 L20 8 A12 12 0 0 1 31 15 Z" fill="#fff" fill-opacity=".85"/>
          <circle cx="26" cy="14" r="2" fill="#ffd166"/>
        </svg>
        <span><span class="marca-nome">Radar</span><span class="marca-sub">Oportunidades UFRGS</span></span>
      </a>
      ${ZERO ? '<span class="selo-ambiente" title="Contas criadas por você, separadas da demonstração"><i class="ti ti-flask"></i><span>Teste do zero</span></span>' : ""}
      <nav class="nav" aria-label="Navegação principal">
        ${u.nav.map((n) => `<a href="${n.href}" class="${n.id === ativo ? "ativo" : ""}" ${n.href === "#" ? "data-em-breve" : ""}><i class="ti ${n.icone}"></i> ${n.nome}</a>`).join("")}
      </nav>
      <div class="topo-acoes">
        <div class="troca-perfil" role="group" aria-label="Ver protótipo como">
          <a href="${ZERO && !conta("estudante") ? "index.html?criar=estudante" : PERFIS.estudante.inicio}" class="${perfil === "estudante" ? "ativo" : ""}" title="Ver como estudante"><i class="ti ti-school"></i><span>Estudante</span></a>
          <a href="${ZERO && !conta("ofertante") ? "index.html?criar=ofertante" : PERFIS.ofertante.inicio}" class="${perfil === "ofertante" ? "ativo" : ""}" title="Ver como ofertante"><i class="ti ti-building"></i><span>Ofertante</span></a>
        </div>
        <div class="notif">
          <button class="btn btn-texto btn-icone sino" aria-haspopup="true" aria-expanded="false">
            <i class="ti ti-bell" style="font-size:20px"></i><span class="contador"></span>
          </button>
          <div class="notif-painel" hidden>
            <div class="notif-cabecalho"><strong>Notificações</strong><button class="btn btn-texto" data-marcar-lidas>Marcar como lidas</button></div>
            <div class="notif-lista"></div>
          </div>
        </div>
        <div class="usuario-menu">
          <button class="usuario" aria-haspopup="true" aria-expanded="false" aria-label="Menu da conta">
            <div class="avatar ${perfil}">${u.iniciais}</div>
            <div class="usuario-texto">
              <div class="usuario-nome">${u.nome}</div>
              <div class="usuario-papel">${u.papel}</div>
            </div>
            <i class="ti ti-chevron-down usuario-seta"></i>
          </button>
          <div class="usuario-painel" hidden>
            ${perfil === "estudante" ? '<a href="perfil.html"><i class="ti ti-user-circle"></i> Meu perfil</a>' : '<a href="vagas.html"><i class="ti ti-briefcase"></i> Minhas vagas</a>'}
            <a href="#" data-reiniciar><i class="ti ti-refresh"></i> ${ZERO ? "Recomeçar do zero" : "Reiniciar demonstração"}</a>
            <a href="index.html" data-sair><i class="ti ti-logout"></i> Sair</a>
          </div>
        </div>
      </div>
    </div>`;

    const botaoUsuario = topo.querySelector(".usuario");
    const painelUsuario = topo.querySelector(".usuario-painel");
    botaoUsuario.addEventListener("click", (e) => {
      e.stopPropagation();
      painelUsuario.hidden = !painelUsuario.hidden;
      botaoUsuario.setAttribute("aria-expanded", !painelUsuario.hidden);
    });
    document.addEventListener("click", (e) => {
      if (!painelUsuario.hidden && !e.target.closest(".usuario-menu")) { painelUsuario.hidden = true; botaoUsuario.setAttribute("aria-expanded", "false"); }
    });
    topo.querySelector("[data-sair]").addEventListener("click", () => apagar("radar:sessao"));
    topo.querySelector("[data-reiniciar]").addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm(ZERO
        ? "Recomeçar do zero? Candidaturas, entrevistas, mensagens, vagas criadas e notificações das suas contas de teste serão apagadas. As contas continuam."
        : "Reiniciar a demonstração? Candidaturas, entrevistas, mensagens, vagas criadas e notificações voltam ao estado inicial nas duas visões.")) return;
      reiniciarTudo();
      location.href = location.pathname + (perfil === "ofertante" && location.pathname.endsWith("mensagens.html") ? "?perfil=ofertante" : "");
    });

    const sino = topo.querySelector(".sino");
    const painel = topo.querySelector(".notif-painel");
    sino.addEventListener("click", (e) => {
      e.stopPropagation();
      painel.hidden = !painel.hidden;
      sino.setAttribute("aria-expanded", !painel.hidden);
    });
    document.addEventListener("click", (e) => {
      if (!painel.hidden && !e.target.closest(".notif")) { painel.hidden = true; sino.setAttribute("aria-expanded", "false"); }
    });
    topo.querySelector("[data-marcar-lidas]").addEventListener("click", () => {
      notificacoes.forEach((n) => (n.lida = true));
      salvar(chaveNotif(perfil), notificacoes);
      renderNotificacoes();
    });
    topo.querySelector(".notif-lista").addEventListener("click", (e) => {
      const item = e.target.closest(".notif-item");
      if (!item) return;
      const n = notificacoes.find((x) => x.id == item.dataset.id);
      if (n) { n.lida = true; salvar(chaveNotif(perfil), notificacoes); }
      if (item.getAttribute("href") === "#") { e.preventDefault(); renderNotificacoes(); return; }
      // Mesma página com outro parâmetro: avisa a página para trocar de item sem recarregar.
      const destino = new URL(item.href, location.href);
      if (destino.pathname === location.pathname) {
        e.preventDefault();
        history.replaceState(null, "", destino.search);
        window.dispatchEvent(new Event("radar:navegar"));
        painel.hidden = true;
        renderNotificacoes();
      }
    });
    renderNotificacoes();
  }

  function ativarEmBreve() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-em-breve]");
      if (!a) return;
      e.preventDefault();
      toast("Esta tela será construída na próxima etapa do protótipo.");
    });
  }

  // Volta notificações e estados de todas as telas ao início.
  function reiniciarTudo() {
    ["radar:agenda", "radar:ofertante", "radar:minhas", "radar:candidaturas", "radar:vagas", "radar:conversas", "radar:perfil-estudante", "radar:triagem", chaveNotif("estudante"), chaveNotif("ofertante")].forEach(apagar);
    notificacoes = carregarNotificacoes(perfil);
    renderNotificacoes();
  }

  // Sincroniza com outra aba aberta (ex.: estudante e ofertante lado a lado).
  window.addEventListener("storage", (e) => {
    // Traduz a chave do ambiente do zero e ignora mudanças do outro ambiente
    let chave = e.key;
    if (chave && chave.startsWith("radar:zero:")) { if (!ZERO) return; chave = "radar:" + chave.slice(11); }
    else if (ZERO && chave && !GLOBAIS.includes(chave)) return;
    if (chave === chaveNotif(perfil) || chave === null) {
      notificacoes = carregarNotificacoes(perfil);
      renderNotificacoes();
    }
    window.dispatchEvent(new CustomEvent("radar:sincronizar", { detail: chave }));
  });

  // Ícone da aba do navegador (o mesmo radar da marca)
  function favicon() {
    if (document.querySelector("link[rel='icon']")) return;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='10' fill='%232453c6'/><circle cx='20' cy='20' r='12' fill='none' stroke='white' stroke-opacity='.45' stroke-width='2'/><path d='M20 20 L20 8 A12 12 0 0 1 31 15 Z' fill='white'/><circle cx='26' cy='14' r='2.5' fill='%23ffd166'/></svg>`;
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = `data:image/svg+xml,${svg}`;
    document.head.appendChild(link);
  }

  // Se a estrutura dos dados da demonstração mudou, descarta o estado antigo salvo no navegador.
  const VERSAO_DADOS = 2;
  if (ler("radar:versao", 0) !== VERSAO_DADOS) {
    ["radar:agenda", "radar:ofertante", "radar:minhas", "radar:candidaturas", "radar:vagas", "radar:conversas", "radar:perfil-estudante", "radar:triagem", "radar:notificacoes:estudante", "radar:notificacoes:ofertante", "radar:notificacoes", "radar:favoritos"].forEach(apagar);
    salvar("radar:versao", VERSAO_DADOS);
  }

  favicon();
  montarTopo();
  ativarEmBreve();

  return {
    ler, salvar, apagar, toast, notificar, reiniciarTudo,
    ambiente: ZERO ? "zero" : "demo", conta, contas, estudante, ofertanteId, iniciaisDe, OFERTANTE_ZERO,
    get perfil() { return perfil; },
    hoje, somarDias, proximaSegunda, fmtDia, fmtDiaLongo, diasAte,
  };
})();
