import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PDFPage, processPDF } from '../utils/pdfProcessor';
import { processImage } from '../utils/imageProcessor';
import { Translation, GPTConfig } from '../types';

interface TranslationContextType {
  translations: Translation[];
  gptConfig: GPTConfig;
  addTranslation: (translation: Translation) => void;
  removeTranslation: (id: string) => void;
  updateGPTConfig: (config: GPTConfig) => void;
  processFile: (file: File, sourceLanguage: string, targetLanguage: string) => Promise<Translation>;
  processText: (text: string, sourceLanguage: string, targetLanguage: string) => Promise<Translation>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('保存到 localStorage 失败:', error);
  }
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translations, setTranslations] = useState<Translation[]>(() => 
    loadFromStorage('translations', [])
  );
  
  const [gptConfig, setGPTConfig] = useState<GPTConfig>(() => 
    loadFromStorage('gptConfig', {
      apiKey: '',
      baseUrl: '',
    })
  );

  useEffect(() => {
    saveToStorage('translations', translations);
  }, [translations]);

  useEffect(() => {
    saveToStorage('gptConfig', gptConfig);
  }, [gptConfig]);

  const addTranslation = (translation: Translation) => {
    setTranslations((prev) => [translation, ...prev]);
  };

  const removeTranslation = (id: string) => {
    setTranslations((prev) => prev.filter((t) => t.id !== id));
  };

  const updateGPTConfig = (config: GPTConfig) => {
    const normalizedBaseUrl = config.baseUrl.replace(/\/$/, '');
    setGPTConfig({ ...config, baseUrl: normalizedBaseUrl });
  };

  const processFile = async (
    file: File, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<Translation> => {
    if (!gptConfig.apiKey) {
      throw new Error('请先配置 API Key');
    }

    try {
      let originalText = '';

      if (file.type === 'application/pdf') {
        const pages = await processPDF(file, gptConfig);
        originalText = pages.map(page => 
          `## Page ${page.pageNumber}\n\n${page.text}\n\n`
        ).join('---\n\n');
      } else if (file.type.startsWith('image/')) {
        originalText = await processImage(file, gptConfig);
      } else {
        throw new Error('不支持的文件类型');
      }

      if (!originalText.trim()) {
        throw new Error('未能从文件中提取到文字，请确保文件包含清晰的文本');
      }

      const response = await fetch(`${gptConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gptConfig.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `你是一位专业翻译。请将以下${sourceLanguage === 'auto' ? '' : sourceLanguage}文本翻译成${targetLanguage}。
重要提示：
1. 必须严格保持原文的所有格式，包括换行、空格、缩进等
2. 不要改变原文的段落结构和布局
3. 保持专业术语的准确性
4. 确保翻译自然、地道
5. 不要添加任何额外的解释或注释
6. 直接返回翻译结果，不要包含任何其他内容`
            },
            {
              role: 'user',
              content: originalText
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`翻译请求失败: ${response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0].message.content;

      const translation = {
        id: Date.now().toString(),
        fileName: file.name,
        timestamp: new Date().toISOString(),
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
      };

      addTranslation(translation);
      return translation;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('处理文件时发生错误，请重试');
    }
  };

  const processText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<Translation> => {
    if (!gptConfig.apiKey) {
      throw new Error('请先配置 API Key');
    }

    try {
      const response = await fetch(`${gptConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gptConfig.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `你是一位专业翻译。请将以下${sourceLanguage === 'auto' ? '' : sourceLanguage}文本翻译成${targetLanguage}。
重要提示：
1. 必须严格保持原文的所有格式，包括换行、空格、缩进等
2. 不要改变原文的段落结构和布局
3. 保持专业术语的准确性
4. 确保翻译自然、地道
5. 不要添加任何额外的解释或注释
6. 直接返回翻译结果，不要包含任何其他内容`
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`翻译请求失败: ${response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0].message.content;

      const translation = {
        id: Date.now().toString(),
        fileName: '文本翻译',
        timestamp: new Date().toISOString(),
        originalText: text,
        translatedText,
        sourceLanguage,
        targetLanguage,
      };

      addTranslation(translation);
      return translation;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('翻译过程中发生错误，请重试');
    }
  };

  return (
    <TranslationContext.Provider value={{ 
      translations, 
      gptConfig,
      addTranslation, 
      removeTranslation,
      updateGPTConfig,
      processFile,
      processText
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}