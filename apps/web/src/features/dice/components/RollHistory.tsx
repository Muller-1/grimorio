import { t } from '@/lib/i18n';
import type { RollEntry } from '../store';
import { RollResultView } from './RollResultView';

export function RollHistory({ entries }: { entries: RollEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted">{t.dice.historyEmpty}</p>;
  return (
    <ol className="divide-y divide-border">
      {entries.map((entry, i) => (
        <li key={entry.id} className="py-2.5" data-testid={`roll.history.${i}`}>
          <RollResultView entry={entry} compact />
        </li>
      ))}
    </ol>
  );
}
