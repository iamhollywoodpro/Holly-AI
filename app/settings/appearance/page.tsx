'use client';

import { useSettings } from '@/lib/settings/settings-store';
import { useEffect } from 'react';
import { SettingsSkeletonLoader } from '@/components/ui/SkeletonLoader';

export default function AppearancePage() {
  const { settings, updateSettings, loadSettings, isSaving, isLoading } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  if (isLoading) {
    return <SettingsSkeletonLoader />;
  }

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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Atmospheric Protocols</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Calibrate the visual resonance of the sentient grid</p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-4">LUMINANCE STATE</label>
        <div className="grid grid-cols-3 gap-4">
          {(['dark', 'light', 'auto'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme)}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                settings.appearance.theme === theme
                  ? 'border-[#66CCCC] bg-[#66CCCC]/10 shadow-[0_0_20px_rgba(102,204,204,0.15)]'
                  : 'border-white/5 bg-[#1E1B18] hover:border-[#66CCCC]/20 text-[#8C8476]'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-2">
                  {theme === 'dark' && '🌑'}
                  {theme === 'light' && '🌕'}
                  {theme === 'auto' && '🌓'}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${settings.appearance.theme === theme ? 'text-[#66CCCC]' : 'text-[#8C8476]'}`}>
                  {theme === 'dark' ? 'Sovereign Void' : theme === 'light' ? 'Aurelian Day' : 'Adaptive Flow'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div>
        <label className="block text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-4">RESONANCE SPECTRUM</label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'sovereign', label: 'Aurelian Breath', colors: ['#66CCCC', '#F5F0E8'] },
            { value: 'crimson', label: 'Crimson Flow', colors: ['#C7B8EA', '#0A0908'] },
            { value: 'obsidian', label: 'Obsidian Pulse', colors: ['#12110F', '#8C8476'] },
            { value: 'emerald', label: 'Sovereign Glade', colors: ['#1F3D30', '#66CCCC'] },
          ].map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => handleColorSchemeChange(scheme.value)}
              className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                settings.appearance.colorScheme === scheme.value
                  ? 'border-[#66CCCC] bg-[#66CCCC]/10 shadow-[0_0_20px_rgba(102,204,204,0.15)]'
                  : 'border-white/5 bg-[#1E1B18] hover:border-[#66CCCC]/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-lg border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${settings.appearance.colorScheme === scheme.value ? 'text-[#66CCCC]' : 'text-[#8C8476]'}`}>
                  {scheme.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-4">TYPOGRAPHIC SCALE</label>
        <div className="grid grid-cols-3 gap-4">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleFontSizeChange(size)}
              className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                settings.appearance.fontSize === size
                  ? 'border-[#66CCCC] bg-[#66CCCC]/10 shadow-[0_0_20px_rgba(102,204,204,0.15)]'
                  : 'border-white/5 bg-[#1E1B18] hover:border-[#66CCCC]/20'
              }`}
            >
              <div className={`font-black uppercase tracking-widest ${
                settings.appearance.fontSize === size ? 'text-[#66CCCC]' : 'text-[#8C8476]'
              } ${
                size === 'small' ? 'text-[9px]' : size === 'large' ? 'text-[12px]' : 'text-[10px]'
              }`}>
                {size}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Architectural Density</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Reduce spatial margins for a concentrated experience</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                appearance: { ...settings.appearance, compactMode: !settings.appearance.compactMode },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.appearance.compactMode ? 'bg-[#66CCCC]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.appearance.compactMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#F5F0E8] uppercase tracking-widest">Neural Dynamics</div>
            <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Enable organic transitions and particle drift</div>
          </div>
          <button
            onClick={() =>
              updateSettings({
                appearance: { ...settings.appearance, animations: !settings.appearance.animations },
              })
            }
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-500 ${
              settings.appearance.animations ? 'bg-[#66CCCC]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-[#F5F0E8] transition-transform duration-500 ${
                settings.appearance.animations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="text-[10px] text-[#66CCCC] font-black uppercase tracking-widest flex items-center gap-3">
          <div className="w-3.5 h-3.5 border-2 border-[#66CCCC] border-t-transparent rounded-full animate-spin" />
          Synchronizing Resonance...
        </div>
      )}
    </div>
  );
}
