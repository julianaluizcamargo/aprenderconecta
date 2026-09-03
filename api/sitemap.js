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
  ];

  let materiais = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/materiais?ativo=eq.true` +
      `&select=id,criado_em&order=criado_em.desc&limit=2000`,
      { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } },
    );
    const linhas = await r.json();
    if (Array.isArray(linhas)) materiais = linhas;
  } catch (e) {
    materiais = [];   /* sem banco, devolvemos ao menos as telas fixas */
  }

  const linhas = [
    ...fixas.map((x) =>
      `  <url>\n    <loc>${esc(x.u)}</loc>\n    <lastmod>${hoje}</lastmod>\n` +
      `    <changefreq>${x.f}</changefreq>\n    <priority>${x.p}</priority>\n  </url>`),
    ...materiais.map((m) =>
      `  <url>\n    <loc>${esc(SITE + '/m/' + m.id)}</loc>\n` +
      `    <lastmod>${dia(m.criado_em)}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${linhas.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
