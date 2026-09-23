// Rendu et impression des documents rédigés par l'assistant (rapport mensuel, briefing de réunion)
import { formatDateTime } from './constants'

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Markdown minimal (titres, listes, gras) → HTML, contenu échappé au préalable.
// keep = impression : chaque rubrique ## forme un bloc non coupé entre deux pages.
export function mdToHtml(md, { keep = false } = {}) {
  const blocks = []; let list = null
  for (const raw of String(md || '').split('\n')) {
    const line = esc(raw).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    const li = line.match(/^\s*[-*]\s+(.*)$/)
    if (li) { if (!list) { list = []; blocks.push({ t: 'ul', items: list }) } list.push(li[1]); continue }
    list = null
    if (/^###\s+/.test(line)) blocks.push({ t: 'h3', html: line.replace(/^###\s+/, '') })
    else if (/^#{1,2}\s+/.test(line)) blocks.push({ t: 'h2', html: line.replace(/^#{1,2}\s+/, '') })
    else if (line.trim()) blocks.push({ t: 'p', html: line })
  }
  const render = (b) => b.t === 'ul' ? `<ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul>` : `<${b.t}>${b.html}</${b.t}>`
  if (!keep) return blocks.map(render).join('\n')
  const out = []; let open = false
  for (const b of blocks) {
    if (b.t === 'h2') { if (open) out.push('</section>'); out.push('<section class="rub">'); open = true }
    out.push(render(b))
  }
  if (open) out.push('</section>')
  return out.join('\n')
}

// Impression A4 : logos GERMA, tableau d'indicateurs facultatif, pied de page sur chaque page,
// sans les en-têtes du navigateur (about:blank, date)
export function printDocument({ title, generatedAt, kpiHeader, kpiRows = [], markdown }) {
  const w = window.open('', '_blank'); if (!w) return
  const origin = window.location.origin
  const kpi = kpiRows.length ? `<table class="kpi"><tr>${kpiHeader.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${kpiRows.map(r => `<tr>${r.map(c => `<td>${esc(c ?? '—')}</td>`).join('')}</tr>`).join('')}</table>` : ''
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)} — GERMA Emploi</title><style>
    @page{size:A4;margin:0}
    body{font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;font-size:12.5px;margin:0}
    table.page{width:100%;border-collapse:collapse}
    table.page>thead td{height:14mm}
    table.page>tfoot td{height:16mm;vertical-align:bottom;padding:0 18mm 7mm;font-size:10px;color:#6b7280}
    table.page>tbody>tr>td{padding:0 18mm}
    h1{font-size:21px;margin:0 0 2px}
    h2{font-size:15px;color:#2D6A4F;margin:18px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px}
    h3{font-size:13px;margin:10px 0 4px}
    p{margin:5px 0}ul{margin:5px 0;padding-left:20px}li{margin:2px 0}
    p,li{break-inside:avoid}
    section.rub{break-inside:avoid;page-break-inside:avoid}
    h2,h3{break-after:avoid;page-break-after:avoid}
    .entete{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #2D6A4F}
    .logos{display:flex;gap:8px}.logos img{height:48px;width:auto}
    table.kpi{border-collapse:collapse;width:100%;margin:10px 0 4px;break-inside:avoid}
    table.kpi td,table.kpi th{border:1px solid #e5e7eb;padding:4px 8px;text-align:left}table.kpi th{background:#f3f4f6}
    .sub{color:#6b7280;font-size:11px;margin:0 0 6px}
  </style></head><body><table class="page"><thead><tr><td></td></tr></thead><tfoot><tr><td>GERMA Emploi — ${esc(title)}</td></tr></tfoot><tbody><tr><td>
    <div class="entete"><div><h1>${esc(title)}</h1><p class="sub">GERMA Emploi · généré le ${formatDateTime(generatedAt)}</p></div><div class="logos"><img src="${origin}/logo_etti.jpg" alt="GERMA Emploi ETTI"><img src="${origin}/logo_ai.jpg" alt="GERMA Emploi AI"></div></div>
    ${kpi}
    ${mdToHtml(markdown, { keep: true })}
  </td></tr></tbody></table></body></html>`)
  w.document.close(); w.focus()
  const imgs = [...w.document.images]
  Promise.all(imgs.map(img => img.complete ? 1 : new Promise(r => { img.onload = r; img.onerror = r }))).then(() => setTimeout(() => w.print(), 150))
}
