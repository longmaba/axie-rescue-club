import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(await readFile('public/assets/characters/manifest.json', 'utf8'));
const report = [];
for (const model of manifest.models) {
  const bytes = await readFile(`public/${model.localPath}`);
  if (bytes.toString('utf8', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2) throw new Error(`${model.id}: invalid GLB header`);
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`${model.id}: truncated GLB`);
  if (createHash('sha256').update(bytes).digest('hex') !== model.sha256) throw new Error(`${model.id}: checksum changed`);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const animations = (gltf.animations ?? []).map(animation => animation.name);
  for (const name of ['Idle', 'Walk', 'Run']) if (!animations.includes(name)) throw new Error(`${model.id}: missing ${name}`);
  const external = [...(gltf.images ?? []), ...(gltf.buffers ?? [])].filter(resource => resource.uri && !resource.uri.startsWith('data:'));
  if (external.length) throw new Error(`${model.id}: unexpected external resources`);
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  }
  report.push({
    id: model.id, bytes: bytes.length, triangles,
    meshes: gltf.meshes?.length ?? 0, materials: gltf.materials?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    animationDurations: (gltf.animations ?? []).map(animation => ({
      name: animation.name,
      seconds: Math.max(...animation.samplers.map(sampler => gltf.accessors[sampler.input].max?.[0] ?? 0))
    }))
  });
}
console.log(JSON.stringify({ verified: true, commit: manifest.commit, totalBytes: report.reduce((sum, model) => sum + model.bytes, 0), models: report }, null, 2));
