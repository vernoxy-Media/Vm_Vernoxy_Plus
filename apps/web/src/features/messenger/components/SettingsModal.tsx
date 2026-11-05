import React from 'react';
import { resetSettings, updateSettings, useSettings, type MessengerSettings } from '../settings';
import { Modal } from './parts';

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-center gap-4 py-3">
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#4F46E5]' : 'bg-slate-300'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </label>
);

const SIZES: Array<[MessengerSettings['textSize'], string]> = [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']];

/** Personal Messenger preferences, kept in this browser. */
export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const s = useSettings();
  return (
    <Modal
      title="Messenger settings"
      onClose={onClose}
      footer={
        <button type="button" onClick={resetSettings} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
          Reset to default
        </button>
      }
    >
      <div className="divide-y divide-slate-100 px-5">
        <Switch checked={s.enterToSend} onChange={(v) => updateSettings({ enterToSend: v })} label="Enter to send" hint={s.enterToSend ? 'Shift + Enter makes a new line.' : 'Ctrl + Enter sends; Enter makes a new line.'} />
        <Switch checked={s.sound} onChange={(v) => updateSettings({ sound: v })} label="Sound for new messages" />
        <Switch checked={s.preview} onChange={(v) => updateSettings({ preview: v })} label="Show message preview in notifications" hint="Off: notifications only say “New message from …”." />
        <div className="py-3">
          <p className="mb-2 text-sm font-medium text-slate-800">Text size</p>
          <div role="radiogroup" aria-label="Text size" className="grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
            {SIZES.map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={s.textSize === v}
                onClick={() => updateSettings({ textSize: v })}
                className={`h-8 rounded-full text-sm font-semibold transition ${s.textSize === v ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
