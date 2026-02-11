export interface Language {
  code: string
  name: string
  nativeName: string
  rtl?: boolean
}

// Comprehensive 175+ language list matching HeyGen's supported languages
export const SUPPORTED_LANGUAGES: Language[] = [
  // Major Global Languages
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-BR', name: 'Portuguese (Brazilian)', nativeName: 'Português (Brasil)' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },

  // Asian Languages
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'zh-yue', name: 'Cantonese', nativeName: '粵語' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek' },

  // Middle Eastern & RTL Languages
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true },
  { code: 'ku', name: 'Kurdish', nativeName: 'کوردی', rtl: true },

  // African Languages
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda' },

  // Spanish Variants
  { code: 'es-MX', name: 'Spanish (Mexican)', nativeName: 'Español (México)' },
  { code: 'es-AR', name: 'Spanish (Argentine)', nativeName: 'Español (Argentina)' },
  { code: 'es-CO', name: 'Spanish (Colombian)', nativeName: 'Español (Colombia)' },

  // English Variants
  { code: 'en-GB', name: 'English (British)', nativeName: 'English (UK)' },
  { code: 'en-AU', name: 'English (Australian)', nativeName: 'English (AU)' },
  { code: 'en-IN', name: 'English (Indian)', nativeName: 'English (India)' },

  // French Variants
  { code: 'fr-CA', name: 'French (Canadian)', nativeName: 'Français (Canada)' },
  { code: 'fr-BE', name: 'French (Belgian)', nativeName: 'Français (Belgique)' },

  // Arabic Variants
  { code: 'ar-EG', name: 'Arabic (Egyptian)', nativeName: 'العربية (مصر)', rtl: true },
  { code: 'ar-SA', name: 'Arabic (Saudi)', nativeName: 'العربية (السعودية)', rtl: true },
  { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'العربية (الإمارات)', rtl: true },
  { code: 'ar-MA', name: 'Arabic (Moroccan)', nativeName: 'العربية (المغرب)', rtl: true },

  // Chinese Variants
  { code: 'zh-SG', name: 'Chinese (Singaporean)', nativeName: '中文 (新加坡)' },

  // Portuguese Variants
  { code: 'pt-PT', name: 'Portuguese (European)', nativeName: 'Português (Portugal)' },

  // Additional European Languages
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },

  // Central Asian & Turkic Languages
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татар' },

  // Southeast Asian Additional
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },

  // South Asian Additional
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', rtl: true },

  // Pacific & Other
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
]

export const RTL_LANGUAGES = new Set(
  SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
)

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)
}

export function getLanguageName(code: string): string {
  return getLanguageByCode(code)?.name ?? code
}

export function isRtl(code: string): boolean {
  return RTL_LANGUAGES.has(code)
}
