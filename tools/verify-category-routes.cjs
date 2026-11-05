const assert = require('node:assert/strict');

const base = process.env.INSTITUTIONAL_BASE_URL || 'https://maxibasquetlaplata.com.ar';
const routes = [
  ['Maxi +35 A', '/35-a/', '+35 A'],
  ['Maxi +35 B', '/35-b/', '+35 B'],
  ['Maxi +48', '/48/', '+48'],
  ['Femenino', '/femenino/', 'Femenino'],
];

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

(async () => {
  for (const [name, route, heading] of routes) {
    const response = await fetch(`${base}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
    const html = await response.text();
    const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    assert.ok(headingMatch, `${name}: heading missing`);
    const headingText = headingMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(headingText, heading, `${name}: unexpected heading ${headingText}`);
    assert.match(html, /<iframe\b[^>]+src=/i, `${name}: iframe missing`);
  }
  console.log('INSTITUTIONAL_CATEGORY_ROUTES_OK');
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
