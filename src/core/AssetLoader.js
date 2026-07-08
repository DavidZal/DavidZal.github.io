import { IMAGE_PATHS } from '../config/constants.js';

export class AssetLoader {
  constructor() {
    this.images = {};
    this.loaded = false;
  }

  async loadAll(onProgress) {
    const total = IMAGE_PATHS.length;
    let loaded = 0;

    const promises = IMAGE_PATHS.map((filename) => {
      const key = filename.replace(/\.(jpg|png)$/, '');
      return this._loadImage(`/images/${filename}`).then((img) => {
        this.images[key] = img;
        this.images[filename] = img;
        loaded++;
        onProgress?.(loaded / total);
      });
    });

    await Promise.all(promises);

    // Legacy image key aliases
    this.images.pathV = this.images.path1;
    this.images.pathH = this.images.path2;
    this.images.pathB = this.images.path3;
    this.images.fightCloud = this.images.cloud1;

    this.loaded = true;
    return this.images;
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  get(key) {
    return this.images[key];
  }
}
