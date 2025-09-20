import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SourceItem } from '@/types/analytics';

export interface EntryDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceItem | null;
}

export function EntryDetailsDrawer({ open, onOpenChange, source }: EntryDetailsDrawerProps): React.ReactElement {
  const ts = React.useMemo(() => {
    if (!source?.timestamp) return '';
    try { return new Date(source.timestamp).toISOString().replace('T', ' ').slice(0, 16); } catch { return String(source.timestamp); }
  }, [source?.timestamp]);

  const copyAsText = async () => {
    try {
      const parts: string[] = [];
      if (!source) return;
      parts.push(`${source.activity || source.place || 'Hendelse'} (${ts})`);
      if (source.note) parts.push(`Notat: ${source.note}`);
      if (source.emotions?.length) {
        parts.push(`Følelser: ${source.emotions.map(e => `${e.emotion}${typeof e.intensity === 'number' ? ` (${e.intensity})` : ''}`).join(', ')}`);
      }
      if (source.sensory?.length) {
        parts.push(`Sensorikk: ${source.sensory.map(s => `${s.type || s.response || 'sensor'}` + (s.response ? `: ${s.response}` : '') + (typeof s.intensity === 'number' ? ` (${s.intensity})` : '')).join(', ')}`);
      }
      if (source.environment) {
        const envParts: string[] = [];
        if (source.environment.lighting) envParts.push(`lys: ${source.environment.lighting}`);
        if (typeof source.environment.noiseLevel === 'number') envParts.push(`støy: ${source.environment.noiseLevel}`);
        if (typeof source.environment.temperature === 'number') envParts.push(`temperatur: ${source.environment.temperature}`);
        if (typeof source.environment.humidity === 'number') envParts.push(`fukt: ${source.environment.humidity}`);
        if (source.environment.timeOfDay) envParts.push(`tid: ${source.environment.timeOfDay}`);
        if (typeof source.environment.studentCount === 'number') envParts.push(`elever: ${source.environment.studentCount}`);
        if (envParts.length) parts.push(`Miljø: ${envParts.join(', ')}`);
        if (source.environment.notes) parts.push(`Miljønotat: ${source.environment.notes}`);
      }
      await navigator.clipboard.writeText(parts.join('\n'));
    } catch {
      // no-op
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Detaljer</SheetTitle>
        </SheetHeader>
        {!source && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Ingen kilde valgt</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Ingen data</CardContent>
          </Card>
        )}
        {source && (
          <div className="mt-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>{[source.activity, source.place].filter(Boolean).join(' / ') || 'Hendelse'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">{ts}</div>
              </CardContent>
            </Card>
            {source.note && (
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>Notat</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="whitespace-pre-wrap break-words">{source.note}</div>
                  </CardContent>
                </Card>
              </section>
            )}
            {source.emotions?.length ? (
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>Følelser</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="mt-1 text-sm list-disc pl-5">
                      {source.emotions.map((e) => (
                        <li key={e.id}>{e.emotion}{typeof e.intensity === 'number' ? ` (intensitet ${e.intensity})` : ''}{e.notes ? ` – ${e.notes}` : ''}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            ) : null}
            {source.sensory?.length ? (
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>Sensorikk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="mt-1 text-sm list-disc pl-5">
                      {source.sensory.map((s) => (
                        <li key={s.id}>{s.type || s.response || 'sensor'}{s.response ? `: ${s.response}` : ''}{typeof s.intensity === 'number' ? ` (intensitet ${s.intensity})` : ''}{s.notes ? ` – ${s.notes}` : ''}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            ) : null}
            {(source.place || source.socialContext || source.environment) ? (
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle>Miljødetaljer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <div className="text-sm text-muted-foreground">
                      {[source.place, source.socialContext].filter(Boolean).join(' · ')}
                    </div>
                    {source.environment && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {typeof source.environment.noiseLevel === 'number' ? `Støynivå: ${source.environment.noiseLevel}. ` : ''}
                        {source.environment.lighting ? `Lys: ${source.environment.lighting}. ` : ''}
                        {typeof source.environment.temperature === 'number' ? `Temperatur: ${source.environment.temperature}. ` : ''}
                        {typeof source.environment.humidity === 'number' ? `Fukt: ${source.environment.humidity}. ` : ''}
                        {typeof source.environment.studentCount === 'number' ? `Elever: ${source.environment.studentCount}. ` : ''}
                        {source.environment.timeOfDay ? `Tid: ${source.environment.timeOfDay}. ` : ''}
                        {source.environment.weather ? `Vær: ${source.environment.weather}. ` : ''}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : null}
            <div className="pt-2">
              <Button variant="outline" size="sm" aria-label="Kopier kilde som tekst" onClick={copyAsText}>Kopier som tekst</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

 
