// ------------------------------------------------------------
// Calcul de marge d'une mise à disposition (AI ou ETTI)
// Calé sur des bulletins et factures réels d'août 2026 :
//  - prix facturés arrondis au centime comme sur les factures (taux × coefficient, puis majorations)
//  - IFM puis ICP calculées sur le brut, charges patronales en taux effectif
//  - indemnités non soumises (panier, transport, kilométriques) refacturées au réel par défaut
// ------------------------------------------------------------

export const r2 = (x) => Math.round((Number(x) || 0) * 100 + Number.EPSILON * 100) / 100

// Paramètres par défaut, tirés des bulletins d'août 2026 — à ajuster
export const STRUCTURES = {
  ETTI: { label: 'ETTI', ifm: 10, icp: 10, charges: 28.2, note: 'Charges effectives mesurées : 28,2 % du brut (après réduction générale et déduction heures sup) pour un salaire proche du SMIC. Le taux augmente quand le salaire s\'éloigne du SMIC.' },
  AI: { label: 'AI', ifm: 0, icp: 10, charges: 21.4, note: 'Charges effectives mesurées : 21,4 % du brut, grâce à l\'exonération de l\'association intermédiaire, limitée à 750 heures par an et par salarié ; au-delà, le taux remonte. Pas d\'IFM en AI.' },
}

// unite : 'heure' (par heure normale), 'jour' (par jour travaillé), 'forfait'
const qty = (unite, m) => (unite === 'heure' ? m.heuresNormales : unite === 'jour' ? m.jours : 1)

export function calculerMarge(m) {
  const n = (x) => Number(x) || 0
  const t = n(m.tauxHoraire), coef = n(m.coef)
  const pctNuit = n(m.pctNuit) / 100
  const hN = n(m.heuresNormales), h25 = n(m.heuresSup25), h50 = n(m.heuresSup50), hNuit = n(m.heuresNuit)
  const heures = hN + h25 + h50
  const q = { heuresNormales: hN, jours: n(m.jours) }

  // ---- salaire (éléments soumis à cotisations) ----
  const lignesSalaire = [
    { label: 'Heures normales', qte: hN, paye: t, facture: r2(t * coef) },
    { label: 'Heures sup 125 %', qte: h25, paye: r2(t * 1.25), facture: r2(r2(t * coef) * 1.25) },
    { label: 'Heures sup 150 %', qte: h50, paye: r2(t * 1.5), facture: r2(r2(t * coef) * 1.5) },
    { label: `Complément heures de nuit (${n(m.pctNuit)} %)`, qte: hNuit, paye: r2(t * pctNuit), facture: r2(r2(t * coef) * pctNuit) },
    ...(m.primes || []).filter(p => n(p.montant)).map(p => ({ label: p.label || 'Prime', qte: qty(p.unite, q), paye: n(p.montant), facture: r2(n(p.montant) * coef) })),
  ].filter(l => l.qte)
  lignesSalaire.forEach(l => { l.coutLigne = r2(l.qte * l.paye); l.factureLigne = r2(l.qte * l.facture) })
  const salaire = r2(lignesSalaire.reduce((s, l) => s + l.coutLigne, 0))
  const ifm = r2(salaire * n(m.ifm) / 100)
  const icp = r2((salaire + ifm) * n(m.icp) / 100)
  const brut = r2(salaire + ifm + icp)
  const charges = r2(brut * n(m.charges) / 100)

  // ---- indemnités non soumises ----
  const lignesIndemnites = (m.indemnites || []).filter(i => n(i.montant)).map(i => {
    const qte = qty(i.unite, q), cout = r2(qte * n(i.montant))
    const factureUnit = i.refact === 'coef' ? r2(n(i.montant) * coef) : i.refact === 'non' ? 0 : n(i.montant)
    return { label: i.label || 'Indemnité', qte, paye: n(i.montant), facture: factureUnit, coutLigne: cout, factureLigne: r2(qte * factureUnit) }
  })
  const indemnites = r2(lignesIndemnites.reduce((s, l) => s + l.coutLigne, 0))

  // ---- équipements, accompagnement, structure, aide au poste ----
  const equipement = r2(n(m.equipement))
  const equipementFacture = m.equipementRefacture ? equipement : 0
  const accompagnement = r2(n(m.accompagnementHeure) * heures)
  const structure = r2(n(m.structureHeure) * heures)
  const aide = r2(n(m.aideHeure) * heures)

  const factureSalaire = r2(lignesSalaire.reduce((s, l) => s + l.factureLigne, 0))
  const factureAutres = r2(lignesIndemnites.reduce((s, l) => s + l.factureLigne, 0) + equipementFacture)
  const ca = r2(factureSalaire + factureAutres)
  const cout = r2(brut + charges + indemnites + equipement + accompagnement + structure)
  const marge = r2(ca - cout + aide)

  // coefficient de seuil (marge nulle) et coefficient pour la marge cible, à partir du coût hors facturation
  const coutNet = cout - aide
  const cible = n(m.margeCible) / 100
  const coefPour = (caVoulu) => (salaire > 0 ? (caVoulu - factureAutres) / salaire : null)
  const coefSeuil = coefPour(coutNet)
  const coefCible = cible < 1 ? coefPour(coutNet / (1 - cible)) : null

  return {
    lignesSalaire, lignesIndemnites, heures,
    salaire, ifm, icp, brut, charges, indemnites, equipement, equipementFacture, accompagnement, structure, aide,
    factureSalaire, ca, cout, marge,
    margePct: ca ? marge / ca : 0,
    margeHeure: heures ? marge / heures : 0,
    coefSeuil, coefCible,
  }
}

// Catalogue d'EPI de départ (prix indicatifs HT, à ajuster par la direction)
export const EPI_DEFAUT = [
  { nom: 'Chaussures de sécurité S3', prix: 45 },
  { nom: 'Gants de manutention (paire)', prix: 4 },
  { nom: 'Gants anti-coupure (paire)', prix: 8 },
  { nom: 'Gilet haute visibilité', prix: 6 },
  { nom: 'Casque de chantier', prix: 12 },
  { nom: 'Lunettes de protection', prix: 5 },
  { nom: 'Bouchons d\'oreilles (boîte)', prix: 10 },
  { nom: 'Casque antibruit', prix: 20 },
  { nom: 'Masque FFP2 (boîte de 20)', prix: 15 },
  { nom: 'Pantalon de travail', prix: 30 },
  { nom: 'Veste de travail', prix: 35 },
  { nom: 'Vêtement de pluie', prix: 25 },
  { nom: 'Genouillères', prix: 15 },
]
export const PARAMS_DEFAUT = Object.fromEntries(Object.entries(STRUCTURES).map(([k, v]) => [k, { ifm: v.ifm, icp: v.icp, charges: v.charges }]))

// Exemples calés sur des factures réelles (août 2026), anonymisés
export const EXEMPLES = [
  {
    nom: 'Exemple ETTI — agent de valorisation, semaine de 45 h avec nuit',
    structure: 'ETTI', tauxHoraire: 12.31, coef: 1.82, heuresNormales: 35, heuresSup25: 8, heuresSup50: 2, heuresNuit: 6, pctNuit: 25, jours: 6,
    primes: [{ label: 'Prime 13e mois', montant: 1.03, unite: 'heure' }, { label: 'Prime de douche', montant: 3.08, unite: 'jour' }],
    indemnites: [{ label: 'Prime panier', montant: 7.26, unite: 'jour', refact: 'reel' }, { label: 'Prime de transport', montant: 2.78, unite: 'jour', refact: 'reel' }],
    factureReelle: 1268.15,
  },
  {
    nom: 'Exemple AI — agent d\'entretien des locaux, 40 h',
    structure: 'AI', tauxHoraire: 12.31, coef: 1.88, heuresNormales: 40, heuresSup25: 0, heuresSup50: 0, heuresNuit: 0, pctNuit: 25, jours: 7,
    primes: [],
    indemnites: [{ label: 'Indemnité kilométrique', montant: 5, unite: 'jour', refact: 'reel' }],
    factureReelle: 960.60,
  },
]
