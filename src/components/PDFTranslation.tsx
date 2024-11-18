import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, Columns } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { exportToFile } from '../utils/pdfProcessor';
import { marked } from 'marked';

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

export default function PDFTranslation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { translations } = useTranslation();
  const translation = translations.find((t) => t.id === id);
  const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');
  const [renderedContent, setRenderedContent] = useState('');

  useEffect(() => {
    if (translation) {
      const content = activeTab === 'original' 
        ? translation.originalText 
        : translation.translatedText;
      setRenderedContent(marked(content));
    }
  }, [translation, activeTab]);

  if (!translation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg">未找到翻译记录</p>
      </div>
    );
  }

  const handleExport = (type: 'original' | 'translated') => {
    const content = type === 'original' ? translation.originalText : translation.translatedText;
    const langSuffix = type === 'original' ? '原文' : `译文_${translation.targetLanguage}`;
    const filename = `${translation.fileName.replace('.pdf', '')}_${langSuffix}.md`;
    exportToFile(content, filename);
  };

  const handleSwitchToCompareMode = () => {
    navigate(`/translation/${id}`);
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

      <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-6 min-h-0">
        <div className="flex border-b border-gray-700 mb-4">
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'original'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('original')}
          >
            原文
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'translated'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('translated')}
          >
            译文
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
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

        <div className="flex items-center gap-4">
          <button
            onClick={handleSwitchToCompareMode}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors shadow-lg hover:shadow-xl transform duration-200"
          >
            <Columns className="w-5 h-5 inline-block mr-2" />
            点此进入对比模式
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => handleExport('original')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <FileDown className="w-5 h-5 mr-2" />
              导出原文
            </button>
            <button
              onClick={() => handleExport('translated')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <FileDown className="w-5 h-5 mr-2" />
              导出译文
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}