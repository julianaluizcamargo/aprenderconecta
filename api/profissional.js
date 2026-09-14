/* ============================================================
   A PÁGINA DE CADA PROFISSIONAL
   ------------------------------------------------------------
   Endereço: https://www.aprenderconecta.com.br/p/<id da pessoa>

   POR QUE ISTO EXISTE
   -------------------
   "Professora de reforço em Ji-Paraná" é o que as pessoas
   digitam no Google. Não "apostila de alfabetização" — isso elas
   digitam depois. Primeiro procuram gente.

   Até agora o site tinha página para aula e para material, mas
   não para quem dá a aula. Quem procurava um professor da
   própria cidade não tinha como achar ninguém daqui.

   Esta página tem um segundo efeito, menos óbvio e talvez mais
   importante: ela LIGA as outras. As páginas /a/ e /m/ viviam
   soltas, sem nenhum link apontando para elas a não ser o mapa
   do site. Agora cada profissional aponta para tudo o que
   publicou, e o Google segue esses caminhos.

   O QUE NÃO ENTRA AQUI
   --------------------
   O telefone. Ele é público dentro do site, de propósito — é
   assim que aluno e professor se falam. Mas uma página que o
   Google guarda e qualquer robô varre é outra coisa: número de
   WhatsApp em página indexada vira lista de spam. Quem quiser
   falar clica em "Ver perfil no site" e encontra o botão lá.
   ============================================================ */

import {
  SITE,
  esc, moeda, jsonSeguro, cortar,
  lerId, idParece, perguntar, pagina, naoAchei,
} from './_pagina.js';

/* Os nomes das colunas têm que ser EXATAMENTE os da tabela: um só
   errado faz o banco recusar a consulta inteira e a página virar 404.
   Repare que `telefone` não está aqui — veja o cabeçalho. */
const COLS_PERFIL = 'id,nome,cidade,bio,titulo_profissional,papel,criado_em';
const COLS_OFERTA = 'id,titulo,area,nivel,formato,modalidade,valor,cobranca,pagar_pelo_site,tipo';
const COLS_MATERIAL = 'id,titulo,area,nivel,preco';

function plural(n, um, muitos) {
  return n + ' ' + (n === 1 ? um : muitos);
}

export default async function handler(req, res) {
  const id = lerId(req, 'p');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!idParece(id)) {
    naoAchei(res, {
      chamada: 'Perfil não encontrado',
      motivo: 'O endereço está errado, ou esta pessoa não está mais no site.',
      voltar: '/#profissionais', rotuloVoltar: 'Ver todos os profissionais',
    });
    return;
  }

  let pe = null;
  try {
    const r = await perguntar(
      `perfis?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(COLS_PERFIL)}`);
    if (r.status === 200 && Array.isArray(r.corpo)) pe = r.corpo[0] || null;
  } catch (e) { pe = null; }

  if (!pe) {
    naoAchei(res, {
      chamada: 'Perfil não encontrado',
      motivo: 'Esta pessoa pode ter saído do site.',
      voltar: '/#profissionais', rotuloVoltar: 'Ver todos os profissionais',
    });
    return;
  }

  /* o que a pessoa publicou — as duas consultas em paralelo */
  let ofertas = [];
  let materiais = [];
  try {
    const [ro, rm] = await Promise.all([
      perguntar(`ofertas?professor_id=eq.${encodeURIComponent(id)}&ativa=eq.true` +
                `&select=${encodeURIComponent(COLS_OFERTA)}&order=criado_em.desc&limit=100`),
      perguntar(`materiais?professor_id=eq.${encodeURIComponent(id)}&ativo=eq.true` +
                `&select=${encodeURIComponent(COLS_MATERIAL)}&order=criado_em.desc&limit=100`),
    ]);
    if (ro.status === 200 && Array.isArray(ro.corpo)) ofertas = ro.corpo;
    if (rm.status === 200 && Array.isArray(rm.corpo)) materiais = rm.corpo;
  } catch (e) { /* sem a lista, a página ainda vale pelo nome e pela cidade */ }

  const aulas = ofertas.filter((o) => String(o.tipo || 'aula') !== 'servico');
  const servicos = ofertas.filter((o) => String(o.tipo || 'aula') === 'servico');
  const totalPublicado = ofertas.length + materiais.length;

  const nome = pe.nome || 'Profissional';
  const cidade = pe.cidade || '';
  const titulo = pe.titulo_profissional || '';
  const url = `${SITE}/p/${pe.id}`;
  const capa = `${SITE}/capa-compartilhar.png`;

  /* Um perfil sem nada publicado não some — quem compartilhou o próprio
     link merece ver a página. Mas ele também não entra no Google: uma
     página sem conteúdo só atrapalha quem pesquisa. */
  const robots = totalPublicado > 0 ? 'index, follow' : 'noindex, follow';

  const areas = [];
  ofertas.concat(materiais).forEach((x) => {
    if (x.area && areas.indexOf(x.area) === -1) areas.push(x.area);
  });

  const resumo = [];
  if (aulas.length) resumo.push(plural(aulas.length, 'aula', 'aulas'));
  if (servicos.length) resumo.push(plural(servicos.length, 'serviço', 'serviços'));
  if (materiais.length) resumo.push(plural(materiais.length, 'material', 'materiais'));

  const descricaoCurta = cortar(
    pe.bio ||
    `${nome}${titulo ? ', ' + titulo : ''}${cidade ? ', de ' + cidade : ''}` +
    (resumo.length ? `, tem ${resumo.join(', ')} no AprenderConecta.`
                   : ' está no AprenderConecta.'),
    155,
  );

  function linhaOferta(o) {
    const v = Number(o.valor) || 0;
    const preco = v > 0
      ? moeda(v) + (o.cobranca ? '<small>/' + esc(String(o.cobranca).toLowerCase()) + '</small>' : '')
      : '<span class="gratis">Gratuito</span>';
    const etiquetas = [o.formato, o.modalidade, o.nivel].filter(Boolean);
    return `<li style="padding:14px 0;border-top:1px solid var(--line);">
      <a href="${SITE}/a/${o.id}" style="font-weight:700;text-decoration:none;">${esc(o.titulo)}</a>
      <div style="font-size:.88rem;color:var(--ink2);margin-top:4px;">
        ${esc(etiquetas.join(' · '))}${etiquetas.length ? ' · ' : ''}<b>${preco}</b>
      </div>
    </li>`;
  }

  function linhaMaterial(m) {
    const v = Number(m.preco) || 0;
    const preco = v > 0 ? moeda(v) : '<span class="gratis">Gratuito</span>';
    return `<li style="padding:14px 0;border-top:1px solid var(--line);">
      <a href="${SITE}/m/${m.id}" style="font-weight:700;text-decoration:none;">${esc(m.titulo)}</a>
      <div style="font-size:.88rem;color:var(--ink2);margin-top:4px;">
        ${esc([m.area, m.nivel].filter(Boolean).join(' · '))} · <b>${preco}</b>
      </div>
    </li>`;
  }

  function bloco(titulo2, itens, montar) {
    if (!itens.length) return '';
    return `<div class="corpo" style="border-top:1px solid var(--line);">
      <h2 style="font-size:1.05rem;margin:0 0 4px;">${esc(titulo2)}</h2>
      <ul style="list-style:none;padding:0;margin:0;">${itens.map(montar).join('')}</ul>
    </div>`;
  }

  /* A ficha do Google. ProfilePage é justamente "esta página é o perfil
     de alguém"; a Person dentro dela é a pessoa. Sem telefone, sem
     endereço de rua — só a cidade, que é o que ajuda quem procura. */
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: nome,
      url,
      description: cortar(pe.bio || descricaoCurta, 400),
      jobTitle: titulo || undefined,
      knowsAbout: areas.length ? areas : undefined,
      address: cidade
        ? { '@type': 'PostalAddress', addressLocality: cidade, addressCountry: 'BR' }
        : undefined,
      worksFor: { '@type': 'Organization', name: 'AprenderConecta', url: SITE + '/' },
    },
  };

  const corpo = `
    <p class="migalha"><a href="${SITE}/">Início</a> ›
       <a href="${SITE}/#profissionais">Profissionais</a> › ${esc(cidade || 'Brasil')}</p>
    <h1>${esc(nome)}</h1>
    <p class="por">${esc([titulo, cidade].filter(Boolean).join(' · ') || 'Profissional da educação')}</p>

    <article class="cartao">
      <div class="corpo">
        <div class="tags">
          ${areas.map((a) => `<span class="tag">${esc(a)}</span>`).join('')}
          ${resumo.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <p class="desc">${esc(pe.bio || 'Esta pessoa ainda não escreveu uma apresentação.')}</p>
        <div class="pe">
          <span></span>
          <span style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn" href="${SITE}/#perfil/${pe.id}">Falar com ${esc(String(nome).split(' ')[0])}</a>
            <a class="btn ghost" href="${SITE}/#profissionais">Ver outros profissionais</a>
          </span>
        </div>
      </div>
      ${bloco('Aulas', aulas, linhaOferta)}
      ${bloco('Serviços', servicos, linhaOferta)}
      ${bloco('Materiais', materiais, linhaMaterial)}
    </article>

    <p class="sobre">
      ${esc(nome)} publica ${resumo.length ? resumo.join(', ') : 'seu trabalho'} no
      <strong>AprenderConecta</strong>, uma plataforma brasileira onde professores
      publicam aulas, materiais e serviços educacionais. Para combinar horário ou
      tirar dúvidas, abra o perfil dentro do site.
    </p>

    <script type="application/ld+json">${jsonSeguro(ficha)}</script>
  `;

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(pagina({
    titulo: `${nome}${titulo ? ' — ' + titulo : ''}${cidade ? ' — ' + cidade : ''} | AprenderConecta`,
    descricao: descricaoCurta,
    capa,
    url,
    robots,
    corpo,
  }));
}
