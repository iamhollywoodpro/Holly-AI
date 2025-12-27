'use client';

import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { Language, detectLanguage, setLanguage } from '@/lib/i18n';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
];

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>(detectLanguage());

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCurrentLang(lang);
    setIsOpen(false);
  };

  const currentLanguage = languages.find(l => l.code === currentLang);

  return (
    <div className="relative">
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: cyberpunkTheme.colors.text.secondary }}
      >
        <Globe className="w-5 h-5" />
        <span className="text-2xl">{currentLanguage?.flag}</span>
        <span className="hidden md:inline">{currentLanguage?.name}</span>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div
            className="absolute right-0 top-12 w-64 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            <div 
              className="p-3 border-b"
              style={{ borderColor: cyberpunkTheme.colors.border.primary }}
            >
              <h3 
                className="font-bold"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Select Language
              </h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  style={{
                    backgroundColor: currentLang === lang.code 
                      ? `${cyberpunkTheme.colors.primary.cyan}10`
                      : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <span 
                      style={{ 
                        color: currentLang === lang.code
                          ? cyberpunkTheme.colors.primary.cyan
                          : cyberpunkTheme.colors.text.primary 
                      }}
                    >
                      {lang.name}
                    </span>
                  </div>
                  {currentLang === lang.code && (
                    <Check 
                      className="w-5 h-5"
                      style={{ color: cyberpunkTheme.colors.primary.cyan }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
