/* ============================================================
   O MAPA DO SITE
   ------------------------------------------------------------
   Endereço: https://www.aprenderconecta.com.br/sitemap.xml

   É a lista que avisa o Google de tudo o que existe aqui. Sem
   ela, ele descobre as páginas devagar e por acaso; com ela,
   sabe de todas no primeiro dia.

   A lista se atualiza sozinha: cada material novo que alguém
   publicar aparece aqui na próxima vez que o Google passar.
   Você não precisa fazer nada.
   ============================================================ */

const SUPABASE_URL = 'https://pmpwkunsyuanrazrmomb.supabase.co';
const CHAVE = 'sb_publishable_eSh0TNQPFfJEb15Oxl6ZIQ_1TA0w-Ko';
const SITE = 'https://www.aprenderconecta.com.br';

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function dia(d) {
  const t = d ? new Date(d) : new Date();
  return (isNaN(t) ? new Date() : t).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  const hoje = dia();

  /* As telas fixas do site.
     Os endereços com "#" saíram daqui de propósito: o Google joga fora
     tudo o que vem depois do "#", então /#loja e /#aprender chegavam
     nele como cópias da página inicial. Cinco linhas de lixo num mapa
     de sete. Ficaram só os endereços que existem de verdade. */
  const fixas = [
    { u: `${SITE}/`, p: '1.0', f: 'daily' },
    { u: `${SITE}/como-funciona`, p: '0.9', f: 'monthly' },
    { u: `${SITE}/kit`, p: '0.7', f: 'monthly' },
  ];

  async function buscar(caminho) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`,
        { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
      const linhas = await r.json();
      return Array.isArray(linhas) ? linhas : [];
    } catch (e) {
      return [];   /* sem banco, devolvemos ao menos as telas fixas */
    }
  }

  /* Faltava a metade do site aqui. O mapa só listava os materiais, então
     as aulas e os serviços que as pessoas publicavam ficavam invisíveis
     para o Google — o Bruno e o Marcos publicaram aula e não tinham como
     ser achados por ninguém de fora. Agora os três entram. */
  const [materiais, ofertas] = await Promise.all([
    buscar('materiais?ativo=eq.true&select=id,criado_em,professor_id&order=criado_em.desc&limit=2000'),
    buscar('ofertas?ativa=eq.true&select=id,criado_em,professor_id&order=criado_em.desc&limit=2000'),
  ]);

  /* As pessoas também entram no mapa — mas só quem publicou alguma
     coisa. Um perfil vazio no mapa é um convite para o Google visitar
     uma página que não tem o que mostrar, e isso derruba o site inteiro
     no ranking. A data de cada um é a do que ele publicou por último.

     Não precisa de uma consulta nova: quem publicou já está aí em cima,
     na coluna professor_id do que foi publicado. */
  const profissionais = [];
  const vistos = {};
  materiais.concat(ofertas).forEach((x) => {
    const pid = x.professor_id;
    if (!pid) return;
    if (!vistos[pid]) {
      vistos[pid] = { id: pid, criado_em: x.criado_em };
      profissionais.push(vistos[pid]);
    } else if (String(x.criado_em || '') > String(vistos[pid].criado_em || '')) {
      vistos[pid].criado_em = x.criado_em;
    }
  });

  const linhas = [
    ...fixas.map((x) =>
      `  <url>\n    <loc>${esc(x.u)}</loc>\n    <lastmod>${hoje}</lastmod>\n` +
      `    <changefreq>${x.f}</changefreq>\n    <priority>${x.p}</priority>\n  </url>`),
    ...materiais.map((m) =>
      `  <url>\n    <loc>${esc(SITE + '/m/' + m.id)}</loc>\n` +
      `    <lastmod>${dia(m.criado_em)}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
    ...ofertas.map((o) =>
      `  <url>\n    <loc>${esc(SITE + '/a/' + o.id)}</loc>\n` +
      `    <lastmod>${dia(o.criado_em)}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
    ...profissionais.map((p) =>
      `  <url>\n    <loc>${esc(SITE + '/p/' + p.id)}</loc>\n` +
      `    <lastmod>${dia(p.criado_em)}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${linhas.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
