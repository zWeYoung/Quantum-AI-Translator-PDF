export interface GPTConfig {
  apiKey: string;
  baseUrl: string;
}

export interface Translation {
  id: string;
  fileName: string;
  timestamp: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  sourceLanguage: string;
}