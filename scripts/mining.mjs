// Conversion des données de minage scmdb.net (mining_data-<version>.json) vers le format compact de l'appli :
//   L = [[nom du lieu, système, type], …]
//   R = [[type de minage, nom, rareté, signature, [[index du lieu, part max %, roche porteuse|0, % des roches, 0], …]], …]
// « Part max. » = part de la roche dans le groupe de dépôts du lieu × somme des teneurs max. de l'élément dans la roche.
const GROUP_TYPE = { SpaceShip_Mineables: 'ship', SpaceShip_Mineables_Rare: 'ship', GroundVehicle_Mineables: 'roc', FPS_Mineables: 'fps' };
const clean = s => String(s || '').replace(/\s*\((Ore|Raw)\)\s*$/i, '').trim();
const r1 = x => +x.toFixed(1);

export function buildMining(md, version) {
  const L = md.locations.map(l => [l.locationName, l.system, l.locationType]);
  const R = [], byKey = new Map();
  const elName = (guid, fallback) => { const e = md.mineableElements[guid]; return clean((e && e.name) || fallback); };
  md.locations.forEach((loc, li) => {
    for (const g of loc.groups || []) {
      const type = GROUP_TYPE[g.groupName]; if (!type) continue;
      const deps = (g.deposits || []).filter(d => md.compositions[d.compositionGuid]);
      const tot = deps.reduce((s, d) => s + (+d.relativeProbability || 0), 0); if (!tot) continue;
      for (const d of deps) {
        const comp = md.compositions[d.compositionGuid], share = d.relativeProbability / tot;
        const rock = clean(comp.name).replace(/^Raw\s+/i, '');
        const sums = new Map();   // élément → [nom, somme des teneurs max, guid]
        for (const p of comp.parts || []) {
          const n = elName(p.elementGuid, p.elementName), cur = sums.get(n) || [n, 0, p.elementGuid];
          cur[1] += +p.maxPercent || 0; sums.set(n, cur);
        }
        for (const [n, sum, guid] of sums.values()) {
          const key = type + '|' + n; let r = byKey.get(key);
          if (!r) {
            const e = md.mineableElements[guid] || {};
            r = [type, n, type === 'ship' ? (e.rarity || null) : null, type === 'ship' ? (e.scanSignature || null) : null, []];
            byKey.set(key, r); R.push(r);
          }
          const own = rock.toLowerCase().startsWith(n.toLowerCase()) || sums.size === 1;
          const pct = r1(share * Math.min(100, sum));
          // Un seul relevé par élément et par lieu : celui de la roche où il est le plus présent.
          const prev = r[4].find(x => x[0] === li);
          const entry = [li, pct, own ? 0 : rock, r1(share * 100), 0];
          if (!prev) r[4].push(entry); else if (pct >= prev[1]) r[4][r[4].indexOf(prev)] = entry;
        }
      }
    }
  });
  return { v: version || md.version, L, R };
}
