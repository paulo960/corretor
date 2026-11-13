/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

// Fonte dos dados. Hoje é um arquivo local; no futuro vira uma API
// (ex.: "https://api.seudominio.com.br/links").
const URL_DOS_LINKS = "./links.json";

// Número de WhatsApp de fallback (usado se o JSON falhar ao carregar)
const WHATSAPP_FALLBACK = "https://wa.me/5562999999999";

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  preencherAno();
  carregarDados();
});

/* =========================================================
   FUNÇÕES UTILITÁRIAS
   ========================================================= */

// Coloca o ano atual no rodapé
function preencherAno() {
  const el = document.getElementById("ano");
  if (el) el.textContent = new Date().getFullYear();
}

// Valida se a URL é segura: aceita só http, https, mailto e tel.
function urlSegura(url) {
  if (!url || typeof url !== "string") return false;
  try {
    // URLs mailto: e tel: não têm "host", então validamos por prefixo
    const urlLower = url.trim().toLowerCase();
    if (urlLower.startsWith("mailto:") || urlLower.startsWith("tel:")) return true;

    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Verifica se o link expirou (expira_em pode ser null, ISO 8601 etc.)
function linkExpirado(link) {
  if (!link.expira_em) return false; // sem data = não expira
  const data = new Date(link.expira_em);
  if (isNaN(data.getTime())) return false; // data inválida = trata como sem expiração
  return data.getTime() <= Date.now();
}

// Decide se o link deve aparecer na página
function linkVisivel(link) {
  return link.ativo === true && !linkExpirado(link) && urlSegura(link.url);
}

/* =========================================================
   CARREGAMENTO DOS DADOS
   ========================================================= */

async function carregarDados() {
  try {
    const resposta = await fetch(URL_DOS_LINKS, { cache: "no-store" });
    if (!resposta.ok) throw new Error("Falha ao buscar links.json");

    const dados = await resposta.json();
    renderizarPerfil(dados.perfil);
    renderizarLinks(dados.links);
    esconderCarregando();
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
    mostrarErro();
  }
}

/* =========================================================
   RENDERIZAÇÃO DO PERFIL
   ========================================================= */

function renderizarPerfil(perfil) {
  if (!perfil) return;

  const fotoEl = document.getElementById("perfil-foto");
  const nomeEl = document.getElementById("perfil-nome");
  const subtituloEl = document.getElementById("perfil-subtitulo");

  // Nome (sempre via textContent — evita injeção)
  if (nomeEl) nomeEl.textContent = perfil.nome || "Corretor";

  // Subtítulo
  if (subtituloEl) subtituloEl.textContent = perfil.subtitulo || "";

  // Foto: usa a URL se existir e for segura; senão gera um placeholder
  if (fotoEl) {
    if (perfil.foto && urlSegura(perfil.foto)) {
      fotoEl.src = perfil.foto;
      fotoEl.alt = `Foto de ${perfil.nome || "perfil"}`;
    } else {
      fotoEl.src = gerarPlaceholder(perfil.nome);
      fotoEl.alt = "Avatar padrão";
    }
  }
}

// Gera um SVG inline com a inicial do nome (evita depender de imagem externa)
function gerarPlaceholder(nome) {
  const inicial = (nome || "?").trim().charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" fill="#181D19"/>
      <text x="50%" y="54%" font-family="Sora, sans-serif" font-size="40"
            font-weight="700" fill="#A6D63F" text-anchor="middle"
            dominant-baseline="middle">${inicial}</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

/* =========================================================
   RENDERIZAÇÃO DOS LINKS
   ========================================================= */

function renderizarLinks(links) {
  const container = document.getElementById("lista-links");
  if (!container || !Array.isArray(links)) return;

  // Limpa o container (sem innerHTML por segurança)
  while (container.firstChild) container.removeChild(container.firstChild);

  // Filtra apenas os visíveis (ativo, não expirado, URL segura)
  const visiveis = links.filter(linkVisivel);

  // Cria os botões preservando a ordem do array
  visiveis.forEach((link) => {
    const a = document.createElement("a");
    a.className = "botao" + (link.destaque ? " botao--destaque" : "");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.titulo || "Sem título"; // textContent = segurança
    a.setAttribute("aria-label", link.titulo || "Link");

    // Registra o clique (hoje só console.log)
    a.addEventListener("click", () => registrarClique(link.id));

    container.appendChild(a);
  });
}

/* =========================================================
   REGISTRO DE CLIQUE (stub)
   ========================================================= */

function registrarClique(id) {
  // Hoje: apenas log no console.
  console.log("[clique]", { id, quando: new Date().toISOString() });

  // TODO: quando houver API, trocar o console.log por:
  // navigator.sendBeacon("/api/clique", JSON.stringify({ id, ts: Date.now() }));
  // (sendBeacon é ideal porque não bloqueia a navegação para a nova aba)
}

/* =========================================================
   ESTADOS DE CARREGAMENTO / ERRO
   ========================================================= */

function esconderCarregando() {
  const el = document.getElementById("status-carregando");
  if (el) el.hidden = true;
}

function mostrarErro() {
  const carregando = document.getElementById("status-carregando");
  const erro = document.getElementById("status-erro");
  if (carregando) carregando.hidden = true;
  if (erro) {
    // Atualiza o link de WhatsApp do bloco de erro com o fallback
    const linkWa = erro.querySelector("a");
    if (linkWa) linkWa.href = WHATSAPP_FALLBACK;
    erro.hidden = false;
  }
}