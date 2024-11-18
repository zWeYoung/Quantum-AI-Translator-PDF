import React, { useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

const LANGUAGE_NAMES: Record<string, string> = {
  zh: '中文 (简体中文)',
  en: 'English (英语)',
  es: 'Español (西班牙语)',
  fr: 'Français (法语)',
  de: 'Deutsch (德语)',
  ru: 'Русский (俄语)',
  ja: '日本語 (日语)',
  ko: '한국어 (韩语)',
  it: 'Italiano (意大利语)',
  pt: 'Português (葡萄牙语)',
  nl: 'Nederlands (荷兰语)',
  tr: 'Türkçe (土耳其语)',
  ar: 'العربية (阿拉伯语)',
  hi: 'हिन्दी (印地语)',
  th: 'ไทย (泰语)',
  vi: 'Tiếng Việt (越南语)'
};

export default function Translation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { translations } = useTranslation();
  const translation = translations.find((t) => t.id === id);

  const originalRef = useRef<HTMLPreElement>(null);
  const translatedRef = useRef<HTMLPreElement>(null);
  const scrollingRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const syncScroll = useCallback((source: HTMLPreElement, target: HTMLPreElement) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const sourceRect = source.getBoundingClientRect();
      const sourceScrollHeight = source.scrollHeight - sourceRect.height;
      const targetScrollHeight = target.scrollHeight - target.getBoundingClientRect().height;
      
      if (sourceScrollHeight <= 0 || targetScrollHeight <= 0) return;
      
      const scrollPercentage = source.scrollTop / sourceScrollHeight;
      target.scrollTop = scrollPercentage * targetScrollHeight;
    });
  }, []);

  useEffect(() => {
    const original = originalRef.current;
    const translated = translatedRef.current;
    if (!original || !translated) return;

    const handleScroll = (source: HTMLPreElement, target: HTMLPreElement, scrollerId: string) => {
      if (scrollingRef.current && scrollingRef.current !== scrollerId) return;
      scrollingRef.current = scrollerId;
      syncScroll(source, target);
      setTimeout(() => {
        if (scrollingRef.current === scrollerId) {
          scrollingRef.current = null;
        }
      }, 50);
    };

    const originalScrollHandler = () => handleScroll(original, translated, 'original');
    const translatedScrollHandler = () => handleScroll(translated, original, 'translated');

    original.addEventListener('scroll', originalScrollHandler, { passive: true });
    translated.addEventListener('scroll', translatedScrollHandler, { passive: true });

    return () => {
      original.removeEventListener('scroll', originalScrollHandler);
      translated.removeEventListener('scroll', translatedScrollHandler);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [syncScroll]);

  if (!translation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg">未找到翻译记录</p>
      </div>
    );
  }

  const handleSwitchToPDFMode = () => {
    navigate(`/pdf-translation/${id}`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-100">
            {translation.fileName}
          </h1>
          <span className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            {LANGUAGE_NAMES[translation.targetLanguage]}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {new Date(translation.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">原文</h2>
          <pre
            ref={originalRef}
            className="flex-1 overflow-y-auto p-6 bg-gray-600 rounded-lg font-sans whitespace-pre-wrap break-words text-base leading-relaxed text-gray-100 scroll-smooth"
          >
            {translation.originalText}
          </pre>
        </div>

        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">译文</h2>
          <pre
            ref={translatedRef}
            className="flex-1 overflow-y-auto p-6 bg-gray-600 rounded-lg font-sans whitespace-pre-wrap break-words text-base leading-relaxed text-gray-100 scroll-smooth"
          >
            {translation.translatedText}
          </pre>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center px-4 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回翻译页面
        </button>

        <button
          onClick={handleSwitchToPDFMode}
          className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors shadow-lg hover:shadow-xl transform duration-200"
        >
          <FileDown className="w-5 h-5 inline-block mr-2" />
          点此进入下载文档模式
        </button>
      </div>
    </div>
  );
}