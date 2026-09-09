/* ============================================================
   A PÁGINA DE CADA AULA (e de cada serviço)
   ------------------------------------------------------------
   Endereço: https://www.aprenderconecta.com.br/a/<id da oferta>

   POR QUE ISTO EXISTE
   -------------------
   Os materiais já tinham a página deles (/m/<id>) e por isso
   apareciam no Google. As aulas não tinham nada.

   Isso pesou de verdade: o Bruno publicou uma aula e o Marcos
   também, e nenhuma das duas tinha como ser achada por quem
   procura "professor de reforço em Ji-Paraná". O trabalho deles
   existia só para quem já estava dentro do site.

   Agora cada aula tem uma página de verdade, com o nome de quem
   dá, a cidade, o formato e o preço — que o Google lê e que o
   WhatsApp mostra em cartão quando o link é compartilhado.
   ============================================================ */

import {
  SITE,
  esc, moeda, jsonSeguro, cortar,
  lerId, idParece, perguntar, pagina, naoAchei,
} from './_pagina.js';

/* Os nomes das colunas têm que ser EXATAMENTE os da tabela ofertas:
   basta um errado para o banco recusar a consulta inteira e a página
   virar 404. Esta lista foi tirada das consultas que o site já faz. */
const BASE = 'id,titulo,descricao,area,nivel,formato,modalidade,valor,cobranca,' +
             'pagar_pelo_site,tipo,prazo_dias,criado_em,professor_id';

function porUnidade(o) {
  const c = String(o.cobranca || '').trim();
  return c ? '/' + c.toLowerCase() : '';
}

export default async function handler(req, res) {
  const id = lerId(req, 'a');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!idParece(id)) {
    naoAchei(res, {
      chamada: 'Aula não encontrada',
      motivo: 'O endereço está errado, ou a aula saiu do ar.',
      voltar: '/#aprender', rotuloVoltar: 'Ver todas as aulas',
    });
    return;
  }

  /* Mesmo cuidado da página de material: primeiro com o nome de quem
     publicou, e se a junção falhar, a oferta sozinha e o nome depois.
     Uma página sem o nome é melhor do que um 404. */
  let o = null;
  try {
    const r = await perguntar(
      `ofertas?id=eq.${encodeURIComponent(id)}&ativa=eq.true` +
      `&select=${encodeURIComponent(BASE + ',perfis(nome,cidade)')}`);
    if (r.status === 200 && Array.isArray(r.corpo)) o = r.corpo[0] || null;
  } catch (e) { o = null; }

  if (!o) {
    try {
      const r = await perguntar(
        `ofertas?id=eq.${encodeURIComponent(id)}&ativa=eq.true` +
        `&select=${encodeURIComponent(BASE)}`);
      if (r.status === 200 && Array.isArray(r.corpo)) o = r.corpo[0] || null;

      if (o && o.professor_id) {
        try {
          const p = await perguntar(
            `perfis?id=eq.${encodeURIComponent(o.professor_id)}` +
            `&select=${encodeURIComponent('nome,cidade')}`);
          if (p.status === 200 && Array.isArray(p.corpo) && p.corpo[0]) o.perfis = p.corpo[0];
        } catch (e) { /* sem o nome, tudo bem */ }
      }
    } catch (e) { o = null; }
  }

  if (!o) {
    naoAchei(res, {
      chamada: 'Aula não encontrada',
      motivo: 'Ela pode ter sido retirada por quem publicou.',
      voltar: '/#aprender', rotuloVoltar: 'Ver todas as aulas',
    });
    return;
  }

  const servico = String(o.tipo || 'aula') === 'servico';
  const oQueE = servico ? 'serviço' : 'aula';
  const autor = (o.perfis && o.perfis.nome) || 'um professor';
  const cidade = (o.perfis && o.perfis.cidade) || '';
  const valor = Number(o.valor) || 0;
  const pagoAqui = valor > 0 && o.pagar_pelo_site === true;
  const url = `${SITE}/a/${o.id}`;
  const volta = servico ? '/#servicos' : '/#aprender';
  const capa = `${SITE}/capa-compartilhar.png`;

  const descricaoCurta = cortar(
    o.descricao ||
    `${o.titulo} — ${oQueE} de ${o.area || 'educação'} com ${autor}` +
    (cidade ? `, em ${cidade}` : '') + ', no AprenderConecta.',
    155,
  );

  /* A ficha do Google. Serviço e aula não são a mesma coisa para ele:
     um curso tem @type Course, um serviço tem Service. Marcar errado é
     pior do que não marcar, então cada um vai com o seu. */
  const ficha = servico
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: o.titulo,
        description: cortar(o.descricao || o.titulo, 400),
        url,
        serviceType: o.formato || 'Serviço educacional',
        areaServed: cidade || 'Brasil',
        provider: { '@type': 'Person', name: autor },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: o.titulo,
        description: cortar(o.descricao || o.titulo, 400),
        url,
        inLanguage: 'pt-BR',
        educationalLevel: o.nivel || undefined,
        provider: { '@type': 'Organization', name: 'AprenderConecta', url: SITE + '/' },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: /presencial/i.test(String(o.modalidade || '')) ? 'onsite' : 'online',
          courseWorkload: 'PT1H',
          instructor: { '@type': 'Person', name: autor },
        },
      };

  /* preço só entra na ficha quando ele é de verdade cobrável aqui;
     anunciar preço numa aula que o site não vende é enganar o Google
     e, pior, quem clica no resultado */
  if (pagoAqui) {
    ficha.offers = {
      '@type': 'Offer',
      price: valor.toFixed(2),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url,
      category: o.cobranca || undefined,
    };
  } else if (valor === 0) {
    ficha.isAccessibleForFree = true;
  }

  const preco = valor > 0
    ? `${moeda(valor)}<small style="font-size:1rem;font-weight:600;color:var(--ink2)">${esc(porUnidade(o))}</small>`
    : '<span class="gratis">Gratuito</span>';

  /* O que o botão diz depende de como a aula é paga — e o terceiro
     caso é o das ofertas antigas, com preço e sem pagamento pelo site.
     Elas não podem ficar sem nada: quem chega precisa entender que o
     combinado é direto com quem dá a aula. */
  const chamada = pagoAqui
    ? `Contratar no site`
    : (valor === 0 ? 'Participar' : 'Falar com ' + String(autor).split(' ')[0]);

  const explicacao = pagoAqui
    ? 'O pagamento é feito aqui pelo site, com Pix ou cartão, e o valor vai direto para quem dá a aula.'
    : (valor === 0
        ? `Esta ${oQueE} é gratuita: basta ter uma conta no site para participar.`
        : `O valor e o horário desta ${oQueE} são combinados diretamente com ${esc(autor)}.`);

  const corpo = `
    <p class="migalha"><a href="${SITE}/">Início</a> ›
       <a href="${SITE}${volta}">${servico ? 'Serviços' : 'Aulas'}</a> › ${esc(o.area || 'Educação')}</p>
    <h1>${esc(o.titulo)}</h1>
    <p class="por">com <strong>${esc(autor)}</strong>${cidade ? ' · ' + esc(cidade) : ''}</p>

    <article class="cartao">
      <div class="corpo">
        <div class="tags">
          ${o.area ? `<span class="tag">${esc(o.area)}</span>` : ''}
          ${o.nivel ? `<span class="tag">${esc(o.nivel)}</span>` : ''}
          ${o.formato ? `<span class="tag">${esc(o.formato)}</span>` : ''}
          ${o.modalidade ? `<span class="tag">${esc(o.modalidade)}</span>` : ''}
          ${servico && o.prazo_dias ? `<span class="tag">entrega em ${esc(o.prazo_dias)} dia${Number(o.prazo_dias) === 1 ? '' : 's'}</span>` : ''}
        </div>
        <p class="desc">${esc(o.descricao || 'Sem descrição.')}</p>
        <div class="pe">
          <span class="preco ${valor > 0 ? '' : 'gratis'}">${preco}</span>
          <span style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn" href="${SITE}${volta}">${esc(chamada)}</a>
            <a class="btn ghost" href="${SITE}/">Conhecer o site</a>
          </span>
        </div>
      </div>
    </article>

    <p class="sobre">
      Esta ${oQueE} foi publicada por ${esc(autor)}${cidade ? `, de ${esc(cidade)},` : ''}
      no <strong>AprenderConecta</strong>, uma plataforma brasileira onde professores
      publicam aulas, materiais e serviços educacionais. ${explicacao}
    </p>

    <script type="application/ld+json">${jsonSeguro(ficha)}</script>
  `;

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(pagina({
    titulo: `${o.titulo} — ${autor} — AprenderConecta`,
    descricao: descricaoCurta,
    capa,
    url,
    corpo,
  }));
}
