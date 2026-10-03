export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatio = 'free' | '1:1' | 'a4' | '16:9';
export type PageSelection = 'all' | 'current' | 'custom';
