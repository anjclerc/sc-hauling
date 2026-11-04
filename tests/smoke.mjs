// Test rapide de l'appli (lancé par GitHub Actions à chaque publication) : la page s'ouvre en français et en anglais,
// sur ordinateur et téléphone, chaque onglet s'affiche sans erreur JavaScript et sans défilement horizontal.
// Les API (UEX) et les données (data/*.json) sont simulées ou lues dans le dépôt : aucun appel réseau réel.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const now = Math.floor(Date.now() / 1000);
const term = (id, nick, sys, planet, extra = {}) => ({ id, nickname: nick, name: nick, displayname: nick, star_system_name: sys, planet_name: planet, orbit_name: planet,
  is_available_live: 1, max_container_size: 32, type: 'commodity', ...extra });
const UEX = {
  terminals: [term(1, 'ARC-L1', 'Stanton', 'ArcCorp', { space_station_name: 'ARC-L1 Wide Forest Station', id_space_station: 1 }),
              term(2, 'TDD Area 18', 'Stanton', 'ArcCorp', { city_name: 'Area 18', id_city: 1 }),
              term(3, 'Lorville CBD', 'Stanton', 'Hurston', { city_name: 'Lorville', id_city: 1 }),
              term(4, 'HDMS-Ryder', 'Stanton', 'Hurston', { moon_name: 'Ita', outpost_name: 'HDMS-Ryder', max_container_size: 16 })],
  commodities: [{ id: 5, name: 'Aluminum', kind: 'Metal' }, { id: 9, name: 'Laranite', kind: 'Metal' }, { id: 11, name: 'Quantainium', kind: 'Mineral' }]
    .map(c => ({ ...c, is_illegal: 0, is_available_live: 1, is_available: 1 })),
  commodities_prices_all: [[5, 1, 2958, 0], [5, 2, 0, 3800], [9, 3, 27000, 0], [9, 2, 0, 30500], [9, 4, 0, 31000], [11, 4, 0, 88000]]
    .map(([c, t, b, s], i) => ({ id: i + 1, id_commodity: c, id_terminal: t, price_buy: b, price_buy_avg: b, price_sell: s, price_sell_avg: s, scu_buy: b ? 100 : 0,
      status_buy: b ? 4 : 0, status_sell: s ? 2 : 0, container_sizes: '1,2,4,8,16', date_modified: now - 3600 })),
  vehicles: [{ id: 1, name: 'Cutlass Black', scu: 46 }],
  terminals_distances: { distance: '20' },
};
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const errors = [];
const browser = await chromium.launch();
for (const [locale, width] of [['fr-FR', 1200], ['en-US', 390]]) {
  const ctx = await browser.newContext({ locale, viewport: { width, height: 1200 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${locale} : ${e.message}`));
  await page.route('https://api.uexcorp.uk/**', r => {
    const key = r.request().url().split('/2.0/')[1].split('?')[0].replace(/\/$/, '');
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ status: 'ok', data: UEX[key] ?? [] }) });
  });
  await page.route('https://anjclerc.github.io/**', r => {
    const path = r.request().url().split('/sc-hauling/')[1].split(/[?#]/)[0];
    if (!path || path === 'index.html') return r.fulfill({ status: 200, contentType: 'text/html', body: html });
    try { return r.fulfill({ status: 200, contentType: path.endsWith('.json') ? 'application/json' : 'application/octet-stream', body: readFileSync(new URL(path, ROOT)) }); }
    catch { return r.fulfill({ status: 404, body: '' }); }
  });
  await page.route('**/config.js', r => r.fulfill({ status: 200, body: '' }));
  await page.addInitScript(() => localStorage.setItem('sch.welcomed', 'true'));
  await page.goto('https://anjclerc.github.io/sc-hauling/');
  await page.waitForTimeout(1500);
  for (const tab of ['resources', 'contracts', 'signatures', 'location', 'missions', 'checks', 'settings']) {
    await page.click(`nav button[data-tab=${tab}]`); await page.waitForTimeout(700);
    if (tab === 'missions') { await page.click('.msmode button[data-msmode=bp]'); await page.waitForTimeout(1200); await page.click('.msmode button[data-msmode=missions]'); await page.waitForTimeout(500); }
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > width + 2) errors.push(`${locale} ${width}px : défilement horizontal dans l'onglet ${tab} (${sw}px)`);
  }
  const missions = await page.$$eval('#msBody details.msitem', d => d.length);
  if (!missions) errors.push(`${locale} : aucune mission affichée`);
  console.log(`${locale} ${width}px : ${missions} missions affichées`);
  await ctx.close();
}
await browser.close();
if (errors.length) { console.error('ÉCHEC :\n' + errors.join('\n')); process.exit(1); }
console.log('Tout est OK.');
