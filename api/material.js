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

   O desenho da página (o cabeçalho, as cores, o rodapé) mora no
   _pagina.js, junto com a da aula — para as duas não desandarem
   uma da outra com o tempo.
   ============================================================ */

import {
  SUPABASE_URL, SITE,
  esc, moeda, tamanho, jsonSeguro, cortar,
  lerId, idParece, perguntar, pagina, naoAchei,
} from './_pagina.js';

export default async function handler(req, res) {
  const id = lerId(req, 'm');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!idParece(id)) {
    naoAchei(res, {
      chamada: 'Material não encontrado',
      motivo: 'O endereço está errado, ou o material saiu do ar.',
      voltar: '/#loja', rotuloVoltar: 'Ver todos os materiais',
    });
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
    naoAchei(res, {
      chamada: 'Material não encontrado',
      motivo: 'Ele pode ter sido retirado por quem publicou.',
      voltar: '/#loja', rotuloVoltar: 'Ver todos os materiais',
    });
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
