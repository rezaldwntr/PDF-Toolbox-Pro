export interface LanguageItem {
  code: string;
  name: string;
  native: string;
  group: 'popular' | 'world';
}

export const LANGUAGES: LanguageItem[] = [
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', group: 'popular' },
  { code: 'en', name: 'English', native: 'English', group: 'popular' },
  { code: 'ar', name: 'Arabic', native: 'العربية', group: 'popular' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文', group: 'popular' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文', group: 'popular' },
  { code: 'ja', name: 'Japanese', native: '日本語', group: 'popular' },
  { code: 'ko', name: 'Korean', native: '한국어', group: 'popular' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', group: 'popular' },
  { code: 'es', name: 'Spanish', native: 'Español', group: 'world' },
  { code: 'fr', name: 'French', native: 'Français', group: 'world' },
  { code: 'de', name: 'German', native: 'Deutsch', group: 'world' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', group: 'world' },
  { code: 'pt', name: 'Portuguese', native: 'Português', group: 'world' },
  { code: 'ru', name: 'Russian', native: 'Русский', group: 'world' },
  { code: 'it', name: 'Italian', native: 'Italiano', group: 'world' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', group: 'world' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', group: 'world' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย', group: 'world' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', group: 'world' },
  { code: 'tl', name: 'Filipino / Tagalog', native: 'Tagalog', group: 'world' },
  { code: 'pl', name: 'Polish', native: 'Polski', group: 'world' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', group: 'world' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', group: 'world' },
  { code: 'da', name: 'Danish', native: 'Dansk', group: 'world' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', group: 'world' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', group: 'world' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', group: 'world' },
  { code: 'cs', name: 'Czech', native: 'Čeština', group: 'world' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', group: 'world' },
  { code: 'ro', name: 'Romanian', native: 'Română', group: 'world' },
];

export type PageScope = 'all' | 'current' | 'custom';
export type OutputMode = 'pdf' | 'txt';
