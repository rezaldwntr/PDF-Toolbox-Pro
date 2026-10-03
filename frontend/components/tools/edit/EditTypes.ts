export type EditMode = 'find_replace' | 'block_edits';
export type PageSelection = 'all' | 'current' | 'custom';

export interface TextBlockItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pageIndex: number;
}

export interface PendingEdit {
  id: string;
  page: number;
  rect: [number, number, number, number]; // [x0, y0, x1, y1] PDF points
  old_text: string;
  new_text: string;
  font_size: number;
  color: string;
  bg_color: string;
}
