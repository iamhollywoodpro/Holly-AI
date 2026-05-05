/**
 * SettingsWindow - Settings window content
 */

'use client';

export interface SettingsWindowProps {
  windowId: string;
}

export default function SettingsWindow({ windowId }: SettingsWindowProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select className="w-full px-3 py-2 border rounded-lg">
            <option>Light</option>
            <option>Dark</option>
            <option>Auto</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Language</label>
          <select className="w-full px-3 py-2 border rounded-lg">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Enable notifications</span>
          </label>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Auto-save</span>
          </label>
        </div>
      </div>
    </div>
  );
}
