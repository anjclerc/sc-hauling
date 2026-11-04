// Blueprints de fabrication scmdb (crafting_blueprints-<version>.json) → fichier compact pour l'onglet Missions › Blueprints.
// Sortie : { v, B: [{ n: produit, g: catégorie (fpsgear, vehiclegear…), ty: type, st: sous-type, mf: fabricant, t: durée (s),
//                     sl: [[emplacement, 'r' ressource | 'i' objet, nom, quantité, qualité min.]], d: 1 si connu par défaut,
//                     m: [missions qui le donnent (index dans missions.json)] }] }
// Les missions reçoivent en retour M[i].bl = [blueprints offerts].
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

export function buildBlueprints(cb, version, missions) {
  const bpGroups = missions?.bpGroups || new Map();
  const B = [];
  for (const b of (cb.blueprints || [])) {
    const name = clean(b.cigDataError ? (b.suggestedName || b.productName) : b.productName);
    if (!name) continue;
    const tier = (b.tiers || [])[0] || {};
    const o = { n: name, g: b.gear || '', ty: b.type || '', st: b.subtype || '', t: tier.craftTimeSeconds || 0,
                sl: (tier.slots || []).map(sl => { const op = (sl.options || [])[0] || {};
                  return [clean(sl.name), op.type === 'item' ? 'i' : 'r', clean(op.resourceName || op.itemName), +op.quantity || 0, op.minQuality || 0]; }) };
    if (b.manufacturer) o.mf = clean(b.manufacturer);
    if (b.isDefault) o.d = 1;
    const ms = bpGroups.get(b.guid);
    if (ms?.length) o.m = [...new Set(ms)];
    B.push(o);
  }
  B.sort((a, b) => a.n.localeCompare(b.n));
  if (missions?.M) {
    missions.M.forEach(m => { delete m.bl; });
    B.forEach((b, i) => (b.m || []).forEach(j => { const m = missions.M[j]; if (m) (m.bl ||= []).push(i); }));
  }
  return { v: version || cb.version, B };
}
