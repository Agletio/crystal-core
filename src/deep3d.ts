/** What the download draws in 3D, handed to the seam in `src/deep.ts`. */
import { provideDeep } from './deep';
import { createThreeRenderer, hardwareGL } from './render/three';
import { Camp3d } from './gl/camp';
import { stageQuality } from './gl/stage';
import { enterAbyss } from './abyss';

provideDeep({
  hardware: hardwareGL,
  descent: createThreeRenderer,
  camp: (host, spots) => Camp3d.create(host, spots),
  abyss: enterAbyss,
  quality: stageQuality,
});
