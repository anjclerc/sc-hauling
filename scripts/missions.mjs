// Conversion des missions scmdb (merged-<version>.json) en un fichier compact pour l'onglet Missions de l'appli.
// Les variantes d'une même mission (systèmes, régions, difficulté) sont regroupées :
// même faction, même titre, même échelle de réputation et même plage de rangs.
//
// Sortie : { v, S: échelles de réputation, F: factions, M: missions }
//   S[i] = [nom interne, nom affiché, [noms des rangs], [réputation minimale de chaque rang]]
//   F[i] = nom de la faction
//   M[i] = { t: titre, f: faction, ty: type, ca: catégorie, s: échelle (-1 = aucune), r0: rang min, r1: rang max (null = aucun),
//            u: [récompense min, max] aUEC, bi: coût d'entrée (aUEC), sy: systèmes, n: nombre de variantes, rep: réputation gagnée,
//            il: illégale, once: une seule fois, solo: non partageable,
//            pre: { n: nombre de missions à finir, g: [missions qui débloquent] } | { ev: événement, pts: points },
//            intro: [missions d'introduction à finir], un: [missions débloquées], lk: [blocages de réputation], bp: nb de pools de blueprints }

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

export function buildMissions(md, version) {
  const scopeIds = Object.keys(md.scopes || {});
  const S = scopeIds.map(id => {
    const s = md.scopes[id], ranks = [...(s.ranks || [])].sort((a, b) => a.rankIndex - b.rankIndex);
    return [s.scopeName, s.displayName, ranks.map(r => r.name), ranks.map(r => r.minReputation)];
  });
  const scopeIdx = new Map(scopeIds.map((id, i) => [id, i]));
  const rankOf = new Map();   // guid du rang → [échelle, index]
  scopeIds.forEach((id, si) => (md.scopes[id].ranks || []).forEach(r => rankOf.set(r.guid, [si, r.rankIndex])));

  const facNames = [], facIdx = new Map();
  const fac = guid => {
    const name = clean(md.factions?.[guid]?.name) || 'Sans faction';
    if (!facIdx.has(name)) { facIdx.set(name, facNames.length); facNames.push(name); }
    return facIdx.get(name);
  };

  // Missions retenues : visibles, pas des sous-missions, pas liées à un événement inactif
  const live = (md.contracts || []).filter(c => !c.hideInMobiGlas && !c.parentId &&
    !(c.requiredScenarios?.length && !c.requiredScenarios.some(s => s.enabled)));

  const groups = [], gByKey = new Map(), gOfContract = new Map(), gByDebug = new Map();
  for (const c of live) {
    const st = c.minStanding ? rankOf.get(c.minStanding.guid) : null;
    const mx = c.maxStanding ? rankOf.get(c.maxStanding.guid) : null;
    const s = st ? st[0] : (mx ? mx[0] : (c.minStanding?.scopeGuid ? scopeIdx.get(c.minStanding.scopeGuid) ?? -1 : -1));
    const r0 = st ? st[1] : 0, r1 = mx ? mx[1] : null;
    const f = fac(c.factionGuid), title = clean(c.title) || c.debugName;
    const key = [f, title, s, r0, r1].join('|');
    let g = gByKey.get(key);
    if (!g) {
      g = { t: title, f, ty: clean(c.missionType), ca: c.category, s, r0, r1, u: [Infinity, 0], sy: new Set(), n: 0, rep: 0,
            il: 0, once: 0, solo: 0, _pre: [], _intro: new Set(), _give: new Set(), lk: new Set(), bp: 0, bi: 0, _bps: new Set() };
      gByKey.set(key, g); groups.push(g);
    }
    g.n++;
    if (c.rewardUEC > 0) { g.u[0] = Math.min(g.u[0], c.rewardUEC); g.u[1] = Math.max(g.u[1], c.rewardUEC); }
    for (const sy of (c.systems || c.availableSystems || [])) g.sy.add(sy);
    if (c.illegal) g.il = 1;
    if (c.buyIn > g.bi) g.bi = c.buyIn;
    if (c.onceOnly) g.once = 1;
    if (c.canBeShared === false) g.solo = 1;
    const fr = md.factionRewardsPools?.[c.factionRewardsIndex];
    if (Array.isArray(fr)) { const own = fr.find(x => x.factionGuid === c.factionGuid) || fr[0]; if (own?.amount > g.rep) g.rep = own.amount; }
    const cct = c.prerequisites?.completedContractTags;
    if (cct?.tags?.length) g._pre.push(cct);
    for (const it of (c.requiredIntros || [])) g._intro.add(it.debugName);
    for (const t of (c.completionTags || [])) g._give.add(t.tag);
    for (const l of (c.reputationLockout || [])) g.lk.add(`${clean(l.factionName)} : ${clean(l.minStanding?.name)}${l.maxStanding?.name ? ' – ' + clean(l.maxStanding.name) : ''}`);
    g.bp = Math.max(g.bp, (c.blueprintRewards || []).length);
    for (const br of (c.blueprintRewards || [])) for (const b of (md.blueprintPools?.[br.blueprintPool]?.blueprints || [])) g._bps.add(b.blueprintRecord);
    gOfContract.set(c.id, g); gByDebug.set(c.debugName, g);
  }

  const idx = new Map(groups.map((g, i) => [g, i]));
  const givers = new Map();   // tag → missions qui le donnent
  for (const g of groups) for (const t of g._give) { if (!givers.has(t)) givers.set(t, new Set()); givers.get(t).add(idx.get(g)); }

  const M = groups.map((g, i) => {
    const o = { t: g.t, f: g.f, ty: g.ty, ca: g.ca, s: g.s, r0: g.r0, r1: g.r1,
                u: g.u[1] ? [g.u[0], g.u[1]] : null, sy: [...g.sy].sort(), n: g.n };
    if (g.rep) o.rep = g.rep;
    if (g.il) o.il = 1;
    if (g.bi) o.bi = g.bi;
    if (g.once) o.once = 1;
    if (g.solo) o.solo = 1;
    if (g.bp) o.bp = g.bp;
    if (g.lk.size) o.lk = [...g.lk];
    // Prérequis : la condition la plus courante parmi les variantes
    if (g._pre.length) {
      const p = g._pre[0], ev = md.eventScopes?.[p.tags[0]];
      if (ev) o.pre = { ev: clean(ev.eventName), pts: p.requiredCountValue || 0 };
      else {
        const gs = new Set();
        for (const t of p.tags) for (const j of (givers.get(t) || [])) if (j !== i) gs.add(j);
        if (gs.size) o.pre = { n: p.requiredCountValue || 1, g: [...gs] };
      }
    }
    const intro = [...g._intro].map(d => gByDebug.get(d)).filter(Boolean).map(x => idx.get(x)).filter(j => j !== i);
    if (intro.length) o.intro = [...new Set(intro)];
    return o;
  });
  // Missions débloquées (sens inverse des prérequis)
  M.forEach((o, i) => { for (const j of [...(o.pre?.g || []), ...(o.intro || [])]) (M[j].un ||= []).includes(i) || M[j].un.push(i); });
  const out = { v: version || md.version, S, F: facNames, M };
  // Blueprints offerts par chaque mission (guid → missions), non publié tel quel : sert à relier les deux fichiers
  const bpGroups = new Map();
  groups.forEach((g, i) => { for (const b of g._bps) { if (!bpGroups.has(b)) bpGroups.set(b, []); bpGroups.get(b).push(i); } });
  Object.defineProperty(out, 'bpGroups', { value: bpGroups, enumerable: false });
  return out;
}
