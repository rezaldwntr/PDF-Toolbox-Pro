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
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  pageIndex: number;
}

export interface PendingEdit {
  id: string;
  page: number;
  rect: [number, number, number, number]; // [x0, y0, x1, y1] PDF points
  old_text: string;
  new_text: string;
  font_size: number;
  font_family?: string;
  is_bold?: boolean;
  is_italic?: boolean;
  color: string;
  bg_color: string;
}
