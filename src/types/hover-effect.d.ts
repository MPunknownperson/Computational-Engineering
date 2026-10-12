declare module "hover-effect" {
  interface HoverEffectOptions {
    parent: HTMLElement;
    image1: string;
    image2: string;
    displacementImage: string;
    intensity?: number;
    intensity1?: number;
    intensity2?: number;
    angle?: number;
    speedIn?: number;
    speedOut?: number;
    hover?: boolean;
    imagesRatio?: number;
  }

  export default class HoverEffect {
    constructor(options: HoverEffectOptions);
    next(): void;
    previous(): void;
  }
}
