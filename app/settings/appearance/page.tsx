'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect } from 'react';

export default function AppearancePage() {
  const { settings, updateSettings, loadSettings, isSaving } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  const handleThemeChange = async (theme: 'dark' | 'light' | 'auto') => {
    await updateSettings({ appearance: { ...settings.appearance, theme } });
    // Show success toast
    const event = new CustomEvent('show-toast', {
      detail: { message: '✅ Theme updated', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  const handleColorSchemeChange = async (colorScheme: any) => {
    await updateSettings({ appearance: { ...settings.appearance, colorScheme } });
    const event = new CustomEvent('show-toast', {
      detail: { message: '✅ Color scheme updated', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  const handleFontSizeChange = async (fontSize: 'small' | 'medium' | 'large') => {
    await updateSettings({ appearance: { ...settings.appearance, fontSize } });
    const event = new CustomEvent('show-toast', {
      detail: { message: '✅ Font size updated', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Appearance</h2>
        <p className="text-gray-400">Customize how HOLLY looks and feels</p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'auto'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme)}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.appearance.theme === theme
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">
                  {theme === 'dark' && '🌙'}
                  {theme === 'light' && '☀️'}
                  {theme === 'auto' && '🔄'}
                </div>
                <div className="text-sm text-white capitalize">{theme}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Color Scheme</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'purple-pink', label: 'Purple/Pink', colors: ['#A855F7', '#EC4899'] },
            { value: 'blue', label: 'Blue', colors: ['#3B82F6', '#06B6D4'] },
            { value: 'green', label: 'Green', colors: ['#10B981', '#34D399'] },
            { value: 'red', label: 'Red', colors: ['#EF4444', '#F87171'] },
          ].map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => handleColorSchemeChange(scheme.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.appearance.colorScheme === scheme.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm text-white">{scheme.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Font Size</label>
        <div className="grid grid-cols-3 gap-3">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleFontSizeChange(size)}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.appearance.fontSize === size
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`text-white capitalize ${
                size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'
              }`}>
                {size}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Compact Mode</div>
            <div className="text-xs text-gray-400">Reduce spacing for denser UI</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                appearance: { ...settings.appearance, compactMode: !settings.appearance.compactMode },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.appearance.compactMode ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.appearance.compactMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Animations</div>
            <div className="text-xs text-gray-400">Enable particle effects and transitions</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                appearance: { ...settings.appearance, animations: !settings.appearance.animations },
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.appearance.animations ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.appearance.animations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-sm text-purple-400 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
