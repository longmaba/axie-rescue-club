// Downloads only the characters used by this Axie Vibeathon project.
// The repository's limited-use permission is preserved beside the assets.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const repo = 'jaatster/axie-3d-assets';
const revision = '4eec7d9ccb1d0c962afc110e7be35d44e3d6356b';
const base = `https://raw.githubusercontent.com/${repo}/${revision}/`;
async function bytes(path) {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const catalog = JSON.parse((await bytes('assets/catalog.json')).toString());
const ids = ['kibo', 'pomodoro', 'bing', 'sapidae-f-a'];
await mkdir('public/assets/characters', { recursive: true });
const models = await Promise.all(ids.map(async id => {
  const entry = catalog.models.find(model => model.id === id);
  if (!entry) throw new Error(`No catalog entry: ${id}`);
  const content = await bytes(`assets/${entry.path}`);
  const sha256 = createHash('sha256').update(content).digest('hex');
  if (sha256 !== entry.sha256) throw new Error(`Checksum mismatch: ${id}`);
  await writeFile(`public/assets/characters/${id}.glb`, content);
  return { ...entry, source: base + `assets/${entry.path}`, localPath: `assets/characters/${id}.glb` };
}));
for (const file of ['RIGHTS.md', 'THIRD_PARTY_NOTICES.md']) {
  await writeFile(`public/assets/characters/${file}`, await bytes(file));
}
await writeFile('public/assets/characters/manifest.json', JSON.stringify({
  repository: `https://github.com/${repo}`, commit: revision, models
}, null, 2) + '\n');
console.log(JSON.stringify({ commit: revision, models: models.map(({ id, bytes, animations }) => ({ id, bytes, animations })) }, null, 2));
