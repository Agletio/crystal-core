/**
 * A CLIP PLAYED ON A BODY IT WAS NOT MADE FOR. Every clip in the bank is kept
 * the way its source rig played it, beside that rig's REST pose; a bone of the
 * body it lands on keeps its OWN rest wherever the source kept the source's:
 *
 *   q_body = C(parent)⁻¹ · q_source · C(bone),   C = G_source⁻¹ · G_body
 *
 * with G the rest rotation from the armature down. Meshy fits each skeleton to
 * its own mesh, so two rigs' LOCAL rests differ by tens of degrees at the head;
 * copied straight across, a hunched body stood bolt upright and a straight one
 * stared at the sky. The hips' travel is scaled by the two hips' heights and,
 * but in a fall, loses its drift: the sim owns where a body is.
 */
import * as THREE from 'three';

/** The 24-bone chain every Meshy biped shares once the husk's is renamed. */
export const PARENT: Record<string, string> = {
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot',
  Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01',
  LeftShoulder: 'Spine', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  neck: 'Spine', Head: 'neck', head_end: 'Head', headfront: 'Head',
};

export interface Bank {
  clips: Map<string, THREE.AnimationClip>;
  rests: Record<string, Record<string, number[]>>; // source -> bone -> local rest quaternion
  hips: Record<string, number[]>; // source -> the hips' rest position, armature units
  of: Record<string, string>; // clip -> source
}

export interface Skeleton {
  rest: Map<string, THREE.Quaternion>; // local
  hips: THREE.Vector3;
  unit: number; // metres an armature unit: Meshy's armature is in centimetres
}

/** A body's own rest, read off its bones before anything has moved them. */
export function skeletonOf(root: THREE.Object3D): Skeleton {
  const rest = new Map<string, THREE.Quaternion>();
  const hips = new THREE.Vector3();
  let unit = 1;
  root.traverse((o) => {
    if (o.name === 'Hips' || PARENT[o.name]) rest.set(o.name, o.quaternion.clone());
    if (o.name === 'Hips') (hips.copy(o.position), (unit = o.parent?.scale.x ?? 1));
  });
  return { rest, hips, unit };
}

function globals(local: (bone: string) => THREE.Quaternion | undefined): Map<string, THREE.Quaternion> {
  const out = new Map<string, THREE.Quaternion>();
  const walk = (bone: string): THREE.Quaternion | undefined => {
    const had = out.get(bone);
    if (had) return had;
    const q = local(bone);
    if (!q) return undefined;
    const up = PARENT[bone] ? walk(PARENT[bone]) : new THREE.Quaternion();
    if (!up) return undefined;
    const g = up.clone().multiply(q);
    out.set(bone, g);
    return g;
  };
  for (const bone of ['Hips', ...Object.keys(PARENT)]) walk(bone);
  return out;
}

/** Metres a second the source's hips travel across a clip: what its feet depict. */
export function depicted(clip: THREE.AnimationClip, unit: number): number {
  const track = clip.tracks.find((t) => t.name === 'Hips.position');
  if (!track || clip.duration <= 0) return 0;
  const v = track.values;
  const n = v.length;
  return (Math.hypot(v[n - 3] - v[0], v[n - 1] - v[2]) * unit) / clip.duration;
}

/** `name` from the bank, made to play on `body`. `keepDrift` for a fall. */
export function retarget(bank: Bank, name: string, body: Skeleton, keepDrift = false): THREE.AnimationClip | null {
  const clip = bank.clips.get(name);
  const source = bank.of[name];
  const rests = bank.rests[source];
  if (!clip || !rests) return null;
  const from = globals((b) => (rests[b] ? new THREE.Quaternion().fromArray(rests[b]) : undefined));
  const to = globals((b) => body.rest.get(b));
  const change = new Map<string, THREE.Quaternion>();
  for (const [bone, g] of from) {
    const t = to.get(bone);
    if (t) change.set(bone, g.clone().invert().multiply(t));
  }
  const tracks: THREE.KeyframeTrack[] = [];
  const q = new THREE.Quaternion();
  for (const track of clip.tracks) {
    const [bone, path] = track.name.split('.');
    const c = change.get(bone);
    if (!c) continue;
    if (path === 'quaternion') {
      const up = PARENT[bone] ? change.get(PARENT[bone]) : new THREE.Quaternion();
      if (!up) continue;
      const upInv = up.clone().invert();
      const values = new Float32Array(track.values.length);
      for (let i = 0; i < values.length; i += 4) {
        q.fromArray(track.values, i);
        q.premultiply(upInv).multiply(c).normalize();
        q.toArray(values, i);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(track.name, Array.from(track.times), Array.from(values)));
    } else if (path === 'position' && bone === 'Hips') {
      const sh = bank.hips[source];
      if (!sh) continue;
      const k = body.hips.y / sh[1];
      const v = track.values;
      const n = track.times.length;
      const values = new Float32Array(v.length);
      const t0 = track.times[0];
      const span = Math.max(1e-6, track.times[n - 1] - t0);
      for (let i = 0; i < n; i++) {
        const along = keepDrift ? 0 : (track.times[i] - t0) / span;
        const dx = keepDrift ? 0 : (v[(n - 1) * 3] - v[0]) * along;
        const dz = keepDrift ? 0 : (v[(n - 1) * 3 + 2] - v[2]) * along;
        values[i * 3] = body.hips.x + (v[i * 3] - dx - sh[0]) * k;
        values[i * 3 + 1] = body.hips.y + (v[i * 3 + 1] - sh[1]) * k;
        values[i * 3 + 2] = body.hips.z + (v[i * 3 + 2] - dz - sh[2]) * k;
      }
      tracks.push(new THREE.VectorKeyframeTrack(track.name, Array.from(track.times), Array.from(values)));
    }
  }
  const out = new THREE.AnimationClip(name, clip.duration, tracks);
  out.userData = { speed: depicted(clip, (body.hips.y / (bank.hips[source]?.[1] ?? body.hips.y)) * body.unit) };
  return out;
}
