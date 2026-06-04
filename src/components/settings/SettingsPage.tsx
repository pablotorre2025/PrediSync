import { useState } from 'react';
import { GeneralSettings } from './GeneralSettings';
import { AISettings } from './AISettings';
import { BibleSettings } from './BibleSettings';
import { LabelSettings } from './LabelSettings';

type Tab = 'general' | 'ia' | 'biblias' | 'labels';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general');
  return (
    <div className="settings">
      <h2>Ajustes</h2>
      <div className="settings-tabs">
        <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>General</button>
        <button className={tab === 'ia' ? 'active' : ''} onClick={() => setTab('ia')}>IA y tipos de sermón</button>
        <button className={tab === 'biblias' ? 'active' : ''} onClick={() => setTab('biblias')}>Biblias</button>
        <button className={tab === 'labels' ? 'active' : ''} onClick={() => setTab('labels')}>Smart Labels</button>
      </div>
      {tab === 'general' && <GeneralSettings />}
      {tab === 'ia' && <AISettings />}
      {tab === 'biblias' && <BibleSettings />}
      {tab === 'labels' && <LabelSettings />}
    </div>
  );
}
