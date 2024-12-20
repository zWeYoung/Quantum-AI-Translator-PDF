import React, { useState, KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PlusCircle,
  FileText,
  X,
  Settings,
  CheckCircle,
  XCircle,
  Loader,
  Lock,
} from 'lucide-react';
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

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { translations, removeTranslation, gptConfig, updateGPTConfig } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminKeyModal, setShowAdminKeyModal] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminKeyError, setAdminKeyError] = useState('');
  const [tempConfig, setTempConfig] = useState(gptConfig);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationStep, setValidationStep] = useState<string>('');

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeTranslation(id);
    if (location.pathname === `/translation/${id}`) {
      navigate('/');
    }
  };

  const handleAdminKeySubmit = () => {
    if (adminKey === import.meta.env.VITE_ADMIN_KEY) {
      setShowAdminKeyModal(false);
      setShowSettings(true);
      setAdminKey('');
      setAdminKeyError('');
    } else {
      setAdminKeyError('管理员密钥错误');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdminKeySubmit();
    }
  };

  const validateAPIConfig = async () => {
    setIsValidating(true);
    setValidationStatus(null);
    setValidationMessage('');

    try {
      const baseUrl = tempConfig.baseUrl.replace(/\/$/, '');
      try {
        new URL(baseUrl);
      } catch {
        throw new Error('API 地址格式无效，请输入完整的 URL');
      }

      setValidationStep('验证 API Key');
      if (!tempConfig.apiKey) {
        throw new Error('请输入 API Key');
      }

      setValidationStep('测试 API 连接');
      const response = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        },
        {
          headers: {
            'Authorization': `Bearer ${tempConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.status === 200) {
        setValidationStatus('success');
        setValidationMessage('API 配置验证成功');
      } else {
        throw new Error('API 验证失败');
      }
    } catch (error) {
      setValidationStatus('error');
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setValidationMessage('API Key 无效');
        } else if (error.response?.status === 404) {
          setValidationMessage('API 接口地址无效');
        } else {
          setValidationMessage(error.response?.data?.error?.message || 'API 验证失败，请检查配置');
        }
      } else if (error instanceof Error) {
        setValidationMessage(error.message);
      } else {
        setValidationMessage('验证过程中发生未知错误');
      }
    } finally {
      setIsValidating(false);
      setValidationStep('');
    }
  };

  const handleSaveConfig = () => {
    updateGPTConfig(tempConfig);
    setShowSettings(false);
  };

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-100">翻译记录</h1>
        <Link
          to="/"
          className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          title="新建翻译"
        >
          <PlusCircle className="w-6 h-6 text-blue-400" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {translations.map((translation) => (
          <Link
            key={translation.id}
            to={`/translation/${translation.id}`}
            className={`group flex items-center p-3 rounded-lg mb-2 transition-colors ${
              location.pathname === `/translation/${translation.id}`
                ? 'bg-blue-500/20 text-blue-400'
                : 'hover:bg-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 mr-3" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{translation.fileName}</p>
              <p className="text-sm text-gray-400">
                {new Date(translation.timestamp).toLocaleDateString()} ·{' '}
                {LANGUAGE_NAMES[translation.targetLanguage]}
              </p>
            </div>
            <button
              onClick={(e) => handleRemove(e, translation.id)}
              className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-all"
              title="删除记录"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={() => setShowAdminKeyModal(true)}
          className="flex items-center p-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          title="API 设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showAdminKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-100">管理员验证</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                   请输入管理员密钥
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    setAdminKeyError('');
                  }}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-lg bg-gray-900 border-gray-700 text-gray-100"
                  placeholder=" "
                />
                {adminKeyError && (
                  <p className="mt-2 text-sm text-red-400">{adminKeyError}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAdminKeyModal(false);
                  setAdminKey('');
                  setAdminKeyError('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleAdminKeySubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">API 设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={tempConfig.apiKey}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, apiKey: e.target.value })
                  }
                  className="w-full rounded-lg bg-gray-900 border-gray-700 text-gray-100"
                  placeholder="输入你的 API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={tempConfig.baseUrl}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, baseUrl: e.target.value })
                  }
                  className="w-full rounded-lg bg-gray-900 border-gray-700 text-gray-100"
                  placeholder=" 例如：https://api.openai.com"
                />
              </div>

              {validationStep && (
                <div className="flex items-center text-sm text-gray-400">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {validationStep}
                </div>
              )}

              {validationMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    validationStatus === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  <div className="flex items-center">
                    {validationStatus === 'success' ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {validationMessage}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={validateAPIConfig}
                disabled={isValidating || !tempConfig.apiKey || !tempConfig.baseUrl}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isValidating || !tempConfig.apiKey || !tempConfig.baseUrl
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {isValidating ? '验证中...' : '验证配置'}
              </button>
              <div className="space-x-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isValidating}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                    isValidating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'
                  }`}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;