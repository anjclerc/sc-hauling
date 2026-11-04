// Mise à jour des données que l'API UEX ne fournit pas. Lancé par GitHub Actions (.github/workflows/update-data.yml),
// ou à la main : `node scripts/update-data.mjs` depuis la racine du dépôt (Node 18 ou plus récent).
//
//  - data/mining.json  : minage (minerais, signatures, lieux, pourcentages) d'après scmdb.net, dernière version « live » du jeu.
//                        Le fichier n'est réécrit que si les données changent.
//  - data/sctrade.json : derniers prix relevés par la communauté de SC Trade Tools (14 derniers jours),
//                        pour comparer avec UEX. Seulement si la variable d'environnement SCTT_ENABLED vaut "true".
//  - data/meta.json    : date et résumé de la dernière mise à jour de chaque source.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { buildMining } from './mining.mjs';

const UA = { 'User-Agent': 'SC-Hauling data updater (https://github.com/anjclerc/sc-hauling)' };
const DATA = new URL('../data/', import.meta.url);
const SCTT_DAYS = 14;

async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url} : ${e.message}`);
      await new Promise(res => setTimeout(res, 3000 * i));
    }
  }
}
async function readJson(name) { try { return JSON.parse(await readFile(new URL(name, DATA), 'utf8')); } catch { return null; } }
async function writeJson(name, obj) { await writeFile(new URL(name, DATA), JSON.stringify(obj) + '\n'); }

// ---------- scmdb.net : minage ----------
async function updateMining() {
  const versions = await getJson('https://scmdb.net/data/versions.json');
  const live = versions.map(v => v.version).find(v => /-live\./.test(v));   // la liste commence par la plus récente
  if (!live) throw new Error('aucune version « live » dans versions.json');
  const md = await getJson(`https://scmdb.net/data/mining_data-${live}.json`);
  const mining = buildMining(md, live);
  if (mining.L.length < 10 || mining.R.length < 10) throw new Error(`données de minage suspectes (${mining.L.length} lieux, ${mining.R.length} ressources)`);
  const old = await readJson('mining.json');
  const changed = JSON.stringify(old) !== JSON.stringify(mining);
  if (changed) await writeJson('mining.json', mining);
  console.log(`scmdb : version ${live}, ${mining.L.length} lieux, ${mining.R.length} ressources — ${changed ? 'mis à jour' : 'inchangé'}`);
  return { version: live, locations: mining.L.length, resources: mining.R.length, changed };
}

// ---------- SC Trade Tools : prix relevés par la communauté ----------
async function updateSctrade() {
  const since = new Date(Date.now() - SCTT_DAYS * 864e5).toISOString();
  const base = 'https://sc-trade.tools/api';
  const shops = await getJson(`${base}/commodity/shops`);
  const items = await getJson(`${base}/commodity/items`);
  const shopName = new Map(shops.map(s => [s.name.toLowerCase(), s.name]));
  const itemName = new Map(items.map(s => [s.name.toLowerCase(), s.name]));
  const listings = [];
  for (let page = 0, pages = 1; page < pages && page < 200; page++) {
    const j = await getJson(`${base}/crowdsource/commodity-listings?page=${page}&submitedAtOrAfter=${encodeURIComponent(since)}`);
    pages = j.page.totalPages; listings.push(...j.content);
  }
  // Dernier relevé par lieu × marchandise × sens. SELLS = le magasin vend (le joueur achète) → « b » ; BUYS → « s ».
  const latest = new Map();
  for (const x of listings) {
    const side = x.transaction === 'SELLS' ? 'b' : x.transaction === 'BUYS' ? 's' : null;
    if (!side || !(x.price > 0)) continue;
    const key = `${x.location}|${x.commodity}|${side}`, ts = Date.parse(x.timestamp);
    const prev = latest.get(key);
    if (!prev || ts > prev.ts) latest.set(key, { x, side, ts });
  }
  const locs = [], coms = [], li = new Map(), ci = new Map();
  const idx = (map, arr, v) => { if (!map.has(v)) { map.set(v, arr.length); arr.push(v); } return map.get(v); };
  const rows = [...latest.values()]
    .sort((a, b) => a.x.location.localeCompare(b.x.location) || a.x.commodity.localeCompare(b.x.commodity) || a.side.localeCompare(b.side))
    .map(({ x, side, ts }) => [
      idx(li, locs, shopName.get(x.location) || x.location),
      idx(ci, coms, itemName.get(x.commodity) || x.commodity),
      side, x.price, x.quantity ?? null, x.saturation == null ? null : Math.round(x.saturation * 100), Math.round(ts / 1000)]);
  await writeJson('sctrade.json', { source: 'https://sc-trade.tools', updated: new Date().toISOString(), days: SCTT_DAYS,
    cols: ['lieu', 'marchandise', 'sens (b = achat joueur, s = vente joueur)', 'prix aUEC/SCU', 'quantité SCU', 'saturation %', 'date (s)'],
    L: locs, C: coms, rows });
  console.log(`SC Trade Tools : ${listings.length} relevés sur ${SCTT_DAYS} jours, ${rows.length} prix, ${locs.length} lieux`);
  return { listings: listings.length, prices: rows.length, locations: locs.length };
}

await mkdir(DATA, { recursive: true });
const meta = (await readJson('meta.json')) || {};
const now = new Date().toISOString();
let failed = false;
try { const m = await updateMining(); meta.mining = { ...m, updated: m.changed ? now : (meta.mining?.updated || now) }; delete meta.mining.changed; }
catch (e) { failed = true; console.error('ÉCHEC scmdb :', e.message); }
if (process.env.SCTT_ENABLED === 'true') {
  try { meta.sctrade = { ...(await updateSctrade()), updated: now }; }
  catch (e) { failed = true; console.error('ÉCHEC SC Trade Tools :', e.message); }
} else console.log('SC Trade Tools : désactivé (SCTT_ENABLED ≠ true)');
await writeJson('meta.json', meta);
// En cas d'échec, les fichiers précédents restent en place et l'appli continue avec eux ; le workflow est marqué en échec (mail de GitHub).
if (failed) process.exit(1);
