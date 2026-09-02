/* ============================================================
   A PÁGINA DE CADA MATERIAL
   ------------------------------------------------------------
   Endereço: https://www.aprenderconecta.com.br/m/<id do material>

   POR QUE ISTO EXISTE
   -------------------
   O site inteiro é uma página só, e cada material vive atrás de
   um "#" no endereço. O Google não consegue ler nada depois do
   "#": ele indexa a página inicial e mais nada. Resultado: quem
   pesquisa "atividades de alfabetização BNCC" nunca chega aqui.

   Este arquivo resolve isso. Ele monta, no servidor, uma página
   de verdade para cada material — com título, descrição, imagem
   e preço — que o Google lê, lista, e manda gente.

   A mesma página serve para o WhatsApp: quando alguém compartilha
   o link de um material, aparece o cartão com a capa e o preço.

   Não é uma página diferente para robô e para gente. É a mesma
   para os dois, com o botão levando para a loja.
   ============================================================ */

const SUPABASE_URL = 'https://pmpwkunsyuanrazrmomb.supabase.co';
const CHAVE = 'sb_publishable_eSh0TNQPFfJEb15Oxl6ZIQ_1TA0w-Ko';
const SITE = 'https://www.aprenderconecta.com.br';

/* texto que vem do banco nunca entra cru no HTML */
function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function moeda(v) {
  const n = Number(v) || 0;
  return n <= 0 ? 'Gratuito'
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tamanho(bytes) {
  const b = Number(bytes) || 0;
  if (!b) return '';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
}

/* A ficha do Google vai dentro de uma tag <script>. Se o título de um
   material contiver "</script>", ele FECHA a tag e o resto do texto passa
   a valer como HTML — quem publicasse um material com um título preparado
   conseguiria rodar código na página de todo mundo.

   Trocar < > & pelos códigos equivalentes fecha essa porta. O JSON
   continua válido; o navegador desfaz a troca ao ler. */
function jsonSeguro(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function cortar(t, n) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

/* uma página inteira, sem depender de JavaScript no navegador */
function pagina({ titulo, descricao, capa, corpo, url, robots }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="robots" content="${robots || 'index, follow'}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AprenderConecta">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${esc(capa)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${esc(capa)}">
<meta name="theme-color" content="#0B2545">
<style>
  :root{--ink:#0B2545;--ink2:#41506B;--brand:#1D53A3;--accent:#F08A24;
        --line:#E4EAF3;--paper:#F4F6FA;--surface:#fff;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
       font:400 17px/1.6 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;}
  a{color:var(--brand)}
  .topo{background:var(--ink);padding:16px 0}
  .wrap{max-width:820px;margin:0 auto;padding:0 20px}
  .marca{display:flex;align-items:center;gap:11px;color:#fff;
         text-decoration:none;font-weight:800;font-size:19px}
  .marca i{width:34px;height:34px;border-radius:10px;background:#fff;color:var(--brand);
           display:flex;align-items:center;justify-content:center;font-style:normal}
  .marca span{color:var(--accent)}
  main{padding:34px 0 70px}
  .migalha{font-size:.85rem;color:var(--ink2);margin-bottom:14px}
  h1{font-size:clamp(1.7rem,4.6vw,2.5rem);line-height:1.15;margin:0 0 14px;
     letter-spacing:-.02em;text-wrap:balance}
  .por{color:var(--ink2);margin:0 0 22px;font-size:1rem}
  .cartao{background:var(--surface);border:1px solid var(--line);border-radius:14px;
          overflow:hidden;box-shadow:0 1px 2px rgba(11,37,69,.05)}
  .capa{display:block;width:100%;height:auto;background:#E9EEF6}
  .corpo{padding:24px}
  .tags{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
  .tag{background:#EEF3FB;color:var(--brand);border-radius:999px;
       padding:5px 13px;font-size:.82rem;font-weight:600}
  .desc{white-space:pre-wrap;margin:0 0 22px;color:var(--ink2)}
  .pe{display:flex;align-items:center;justify-content:space-between;gap:16px;
      flex-wrap:wrap;border-top:1px solid var(--line);padding-top:20px}
  .preco{font-size:1.7rem;font-weight:800}
  .gratis{color:#166534}
  .btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
       font-weight:700;padding:13px 26px;border-radius:11px;font-size:1rem}
  .btn.ghost{background:transparent;color:var(--brand);border:1.5px solid var(--line)}
  .sobre{margin-top:34px;font-size:.95rem;color:var(--ink2)}
  footer{border-top:1px solid var(--line);margin-top:44px;padding:26px 0;
         font-size:.88rem;color:var(--ink2)}
</style>
</head>
<body>
  <div class="topo"><div class="wrap">
    <a class="marca" href="${SITE}/"><i>A</i>Aprender<span>Conecta</span></a>
  </div></div>
  <main class="wrap">${corpo}</main>
  <footer><div class="wrap">
    <a href="${SITE}/">AprenderConecta</a> · Conhecimento que conecta pessoas ·
    <a href="${SITE}/#loja">Todos os materiais</a>
  </div></footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------
   DE ONDE VEM O ID
   ------------------------------------------------------------------
   O caminho normal é req.query.id, que a Vercel monta sozinha. Mas
   quando o endereço passa pela regra de reescrita (/m/<id>), esse
   campo às vezes chega vazio, ou chega com o mesmo valor duas vezes
   (uma da rota, outra da query) — e aí vira uma lista, não um texto.

   Então não confiamos em um caminho só: tentamos os três.
   ------------------------------------------------------------------ */
function lerId(req) {
  let q = req && req.query ? req.query.id : null;
  if (Array.isArray(q)) q = q[0];
  if (q) return String(q).trim();

  try {
    const u = new URL(String((req && req.url) || ''), 'https://x');
    const naQuery = u.searchParams.get('id');
    if (naQuery) return String(naQuery).trim();
    const noCaminho = u.pathname.match(/\/m\/([^/?#]+)/);
    if (noCaminho) return decodeURIComponent(noCaminho[1]).trim();
  } catch (e) { /* endereço torto: cai no vazio */ }

  return '';
}

/* pergunta ao banco; devolve { status, corpo } sem estourar */
async function perguntar(caminho) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = JSON.parse(texto); } catch (e) { corpo = texto; }
  return { status: r.status, corpo };
}

export default async function handler(req, res) {
  const id = lerId(req);

  /* ------------------------------------------------------------------
     MODO CONFERÊNCIA
     Abrir /api/material?id=...&diag=1 devolve, em texto puro, o que
     esta função enxergou: o endereço que chegou, o id que ela leu e
     o que o banco respondeu. Serve para descobrir onde travou sem
     ter que adivinhar. Não mostra nada secreto.
     ------------------------------------------------------------------ */
  const conferir = String((req.query && req.query.diag) || '') === '1' ||
                   /[?&]diag=1(?:&|$)/.test(String(req.url || ''));
  if (conferir) {
    const linhas = [
      'endereco que chegou: ' + String(req.url || '(vazio)'),
      'req.query existe:    ' + (req.query ? 'sim' : 'nao'),
      'campos de req.query: ' + (req.query ? Object.keys(req.query).join(', ') : '-'),
      'id lido:             ' + (id || '(vazio)'),
      'id passa na regra:   ' + (/^[0-9a-fA-F-]{20,40}$/.test(id) ? 'sim' : 'NAO'),
    ];
    try {
      const r = await perguntar(
        `materiais?id=eq.${encodeURIComponent(id)}&ativo=eq.true&select=id,titulo`);
      linhas.push('banco respondeu:     HTTP ' + r.status);
      linhas.push('banco devolveu:      ' + JSON.stringify(r.corpo).slice(0, 400));
    } catch (e) {
      linhas.push('banco deu erro:      ' + String(e && e.message || e));
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(linhas.join('\n'));
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!/^[0-9a-fA-F-]{20,40}$/.test(id)) {
    res.status(404).send(pagina({
      titulo: 'Material não encontrado — AprenderConecta',
      descricao: 'Este material não existe ou saiu do ar.',
      capa: `${SITE}/capa-compartilhar.png`,
      url: `${SITE}/#loja`,
      robots: 'noindex, follow',
      corpo: `<h1>Material não encontrado</h1>
        <p class="por">O endereço está errado, ou o material saiu do ar.</p>
        <a class="btn" href="${SITE}/#loja">Ver todos os materiais</a>`,
    }));
    return;
  }

  /* ------------------------------------------------------------------
     Buscar o material. Primeiro tentamos trazer o nome de quem publicou
     junto, numa consulta só. Se essa junção falhar por qualquer motivo,
     não desistimos do material: buscamos ele sozinho e o nome depois.
     Uma página sem o nome do autor é muito melhor que um erro 404.
     ------------------------------------------------------------------ */
  /* Os nomes aqui têm que ser EXATAMENTE os da tabela. Se um só estiver
     errado, o banco recusa a consulta inteira e a página vira 404 — foi
     o que aconteceu quando eu escrevi "capa_url" no lugar de "capa_path". */
  const base = 'id,titulo,descricao,area,nivel,preco,capa_path,tamanho_bytes,' +
               'downloads,criado_em,professor_id';
  let m = null;

  try {
    const r = await perguntar(
      `materiais?id=eq.${encodeURIComponent(id)}&ativo=eq.true` +
      `&select=${encodeURIComponent(base + ',perfis(nome,cidade)')}`);
    if (r.status === 200 && Array.isArray(r.corpo)) m = r.corpo[0] || null;
  } catch (e) { m = null; }

  if (!m) {
    try {
      const r = await perguntar(
        `materiais?id=eq.${encodeURIComponent(id)}&ativo=eq.true` +
        `&select=${encodeURIComponent(base)}`);
      if (r.status === 200 && Array.isArray(r.corpo)) m = r.corpo[0] || null;

      /* e o nome do autor por fora, numa segunda pergunta */
      if (m && m.professor_id) {
        try {
          const p = await perguntar(
            `perfis?id=eq.${encodeURIComponent(m.professor_id)}` +
            `&select=${encodeURIComponent('nome,cidade')}`);
          if (p.status === 200 && Array.isArray(p.corpo) && p.corpo[0]) m.perfis = p.corpo[0];
        } catch (e) { /* sem o nome, tudo bem */ }
      }
    } catch (e) { m = null; }
  }

  if (!m) {
    res.status(404).send(pagina({
      titulo: 'Material não encontrado — AprenderConecta',
      descricao: 'Este material não existe ou saiu do ar.',
      capa: `${SITE}/capa-compartilhar.png`,
      url: `${SITE}/#loja`,
      robots: 'noindex, follow',
      corpo: `<h1>Material não encontrado</h1>
        <p class="por">Ele pode ter sido retirado por quem publicou.</p>
        <a class="btn" href="${SITE}/#loja">Ver todos os materiais</a>`,
    }));
    return;
  }

  const autor = (m.perfis && m.perfis.nome) || 'um professor';
  const cidade = (m.perfis && m.perfis.cidade) || '';
  const pago = Number(m.preco) > 0;
  /* a tabela guarda só o caminho do arquivo; o endereço público é montado
     do mesmo jeito que o site monta (bucket "materiais") */
  const capaPropria = m.capa_path
    ? `${SUPABASE_URL}/storage/v1/object/public/materiais/` +
      String(m.capa_path).split('/').map(encodeURIComponent).join('/')
    : '';
  const capa = capaPropria || `${SITE}/capa-compartilhar.png`;
  const url = `${SITE}/m/${m.id}`;
  const baixados = Number(m.downloads) || 0;

  const descricaoCurta = cortar(
    m.descricao || `${m.titulo} — material de ${m.area} publicado por ${autor} no AprenderConecta.`,
    155,
  );

  /* a ficha que o Google usa para mostrar preço e nota na busca */
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: m.titulo,
    description: cortar(m.descricao || m.titulo, 400),
    image: capa,
    url,
    brand: { '@type': 'Brand', name: 'AprenderConecta' },
    category: m.area,
    offers: {
      '@type': 'Offer',
      price: pago ? Number(m.preco).toFixed(2) : '0.00',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url,
      seller: { '@type': 'Person', name: autor },
    },
  };

  const corpo = `
    <p class="migalha"><a href="${SITE}/">Início</a> ›
       <a href="${SITE}/#loja">Materiais</a> › ${esc(m.area || 'Material')}</p>
    <h1>${esc(m.titulo)}</h1>
    <p class="por">por <strong>${esc(autor)}</strong>${cidade ? ' · ' + esc(cidade) : ''}</p>

    <article class="cartao">
      ${capaPropria ? `<img class="capa" src="${esc(capaPropria)}" alt="Capa de ${esc(m.titulo)}" loading="lazy">` : ''}
      <div class="corpo">
        <div class="tags">
          ${m.area ? `<span class="tag">${esc(m.area)}</span>` : ''}
          ${m.nivel ? `<span class="tag">${esc(m.nivel)}</span>` : ''}
          ${m.tamanho_bytes ? `<span class="tag">${esc(tamanho(m.tamanho_bytes))}</span>` : ''}
          ${baixados ? `<span class="tag">${baixados} download${baixados === 1 ? '' : 's'}</span>` : ''}
        </div>
        <p class="desc">${esc(m.descricao || 'Sem descrição.')}</p>
        <div class="pe">
          <span class="preco ${pago ? '' : 'gratis'}">${esc(moeda(m.preco))}</span>
          <span style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn" href="${SITE}/#loja">${pago ? 'Comprar na loja' : 'Baixar na loja'}</a>
            <a class="btn ghost" href="${SITE}/">Conhecer o site</a>
          </span>
        </div>
      </div>
    </article>

    <p class="sobre">
      Este material foi publicado por ${esc(autor)} no <strong>AprenderConecta</strong>,
      uma plataforma brasileira onde professores publicam aulas, materiais e serviços
      educacionais. ${pago
        ? 'O pagamento é feito pelo site, com Pix ou cartão, e o valor vai direto para quem produziu o material.'
        : 'Este material é gratuito: basta criar uma conta para baixar.'}
    </p>

    <script type="application/ld+json">${jsonSeguro(ficha)}</script>
  `;

  /* o Google e o WhatsApp podem guardar por 10 minutos; a Vercel
     serve a cópia guardada por até um dia enquanto busca a nova */
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(pagina({
    titulo: `${m.titulo} — AprenderConecta`,
    descricao: descricaoCurta,
    capa,
    url,
    corpo,
  }));
}
