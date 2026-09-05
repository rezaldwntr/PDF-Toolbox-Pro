
export enum View {
  HOME_TAB,
  TOOLS_TAB,
  PROFILE_TAB,

  MERGE,
  SPLIT,
  COMPRESS,
  PDF_TO_WORD,
  PDF_TO_EXCEL,
  PDF_TO_PPT,
  PDF_TO_IMAGE,
  ADD_TEXT,
  ADD_SIGNATURE,
  ORGANIZE,
  
  BLOG,
  FAQ,
  PRIVACY,
  ABOUT,
  CONTACT,
}

export type EnvironmentMode = 'preview' | 'production';

// Deklarasi konstanta yang diinjeksi Vite saat build di Vercel
declare global {
  const __VERCEL_ENV__: string | undefined;
  const __GIT_BRANCH__: string | undefined;
}
