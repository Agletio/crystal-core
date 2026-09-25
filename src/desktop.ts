/**
 * THE DOWNLOAD: the web game with its 3D half handed over. `deep3d` is
 * imported FIRST because a module's imports are evaluated in order and the
 * game boots the moment `web` is — a seam filled after that is never asked.
 */
import './deep3d';
import './web';
