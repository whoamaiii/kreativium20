import { useState } from "react";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SensoryEntry } from "@/types/student";
import { Eye, Ear, Hand, RotateCcw, Activity } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SensoryTrackerProps {
  onSensoryAdd: (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

const sensoryTypes = [
  { type: 'visual' as const, icon: Eye },
  { type: 'auditory' as const, icon: Ear },
  { type: 'tactile' as const, icon: Hand },
  { type: 'vestibular' as const, icon: RotateCcw },
  { type: 'proprioceptive' as const, icon: Activity },
];

const responses = [
  { type: 'seeking' as const },
  { type: 'avoiding' as const },
  { type: 'neutral' as const },
  { type: 'overwhelmed' as const },
];

// Common body locations for sensory experiences
const bodyLocations = [
  'Head', 'Eyes', 'Ears', 'Mouth', 'Neck', 'Shoulders',
  'Arms', 'Hands', 'Chest', 'Back', 'Stomach', 'Legs', 'Feet'
];

// Common coping strategy suggestions
const copingStrategySuggestions = [
  'Deep breathing', 'Take a break', 'Use fidget tool', 'Movement break',
  'Quiet space', 'Headphones', 'Weighted blanket', 'Sensory walk',
  'Compression', 'Joint compressions', 'Chewing gum', 'Water break'
];

export const SensoryTracker = ({ onSensoryAdd, studentId }: SensoryTrackerProps) => {
  const { tTracking, tCommon } = useTranslation();
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  // Intensity range: 1-5 only, capped
  const handleIntensity = (value: number) => {
    const clamped = Math.max(1, Math.min(5, value));
    setIntensity(clamped);
  };
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState('');
  const [location, setLocation] = useState('');
  const [copingStrategies, setCopingStrategies] = useState<string[]>([]);
  const [newCopingStrategy, setNewCopingStrategy] = useState('');

  const handleAddCopingStrategy = () => {
    if (newCopingStrategy.trim() && !copingStrategies.includes(newCopingStrategy.trim())) {
      setCopingStrategies([...copingStrategies, newCopingStrategy.trim()]);
      setNewCopingStrategy('');
    }
  };

  const handleRemoveCopingStrategy = (strategy: string) => {
    setCopingStrategies(copingStrategies.filter(s => s !== strategy));
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedResponse) return;

    onSensoryAdd({
      studentId,
      // Unify on `type` to prevent downstream undefined values
      type: selectedType as any,
      response: selectedResponse as SensoryEntry['response'],
      intensity: intensity as SensoryEntry['intensity'],
      location: location || undefined,
      notes: notes.trim() || undefined,
      environment: environment.trim() || undefined,
      copingStrategies: copingStrategies.length > 0 ? copingStrategies : undefined,
    });

    // Reset form
    setSelectedType('');
    setSelectedResponse('');
    setIntensity(3);
    setLocation('');
    setNotes('');
    setEnvironment('');
    setCopingStrategies([]);
  };

  return (
    <Card className="font-dyslexia bg-gradient-card border-0">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">{String(tTracking('sensory.title'))}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sensory Type Selection */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">{String(tTracking('sensory.selectType'))}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sensoryTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.type}
                  variant={selectedType === type.type ? "default" : "outline"}
                  className={`h-16 flex items-center gap-3 justify-start font-dyslexia hover-lift press-scale transition-all duration-300 ${
                    selectedType === type.type 
                      ? 'bg-gradient-primary shadow-glow animate-bounce-in' 
                      : 'hover:scale-105 animate-fade-in hover:shadow-soft'
                  }`}
                  onClick={() => setSelectedType(type.type)}
                  aria-label={`Select sensory type: ${String(tTracking(`sensory.types.${type.type}`))}`}
                  aria-pressed={selectedType === type.type}
                >
                  <Icon className="h-5 w-5 transform transition-transform duration-200 hover:scale-110" />
                  <div className="text-left">
                    <div className="font-medium">{String(tTracking(`sensory.types.${type.type}`))}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Response Type */}
        {selectedType && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">{String(tTracking('sensory.response'))}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {responses.map((response) => (
                <Button
                  key={response.type}
                  variant={selectedResponse === response.type ? "default" : "outline"}
                  className={`h-16 flex-col gap-1 font-dyslexia hover-lift press-scale transition-all duration-300 ${
                    selectedResponse === response.type 
                      ? 'bg-gradient-primary shadow-glow animate-bounce-in' 
                      : 'hover:scale-105 animate-fade-in hover:shadow-soft'
                  }`}
                  onClick={() => setSelectedResponse(response.type)}
                  aria-label={`Select response: ${String(tTracking(`sensory.responses.${response.type}`))}`}
                  aria-pressed={selectedResponse === response.type}
                >
                  <span className="font-medium">{String(tTracking(`sensory.responses.${response.type}`))}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Intensity Scale */}
{selectedResponse && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              {String(tTracking('sensory.intensity'))}: {intensity}/5
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={intensity === level ? "default" : "outline"}
                  size="sm"
                  className={`w-12 h-12 rounded-full font-dyslexia ${
                    intensity === level ? 'bg-gradient-primary' : ''
                  }`}
                  onClick={() => handleIntensity(level)}
                  title={String(tTracking(`sensory.intensityLevels.${level}`))}
                  aria-label={`Intensity level ${level}`}
                  aria-pressed={intensity === level}
                >
                  {level}
                </Button>
              ))}
            </div>
            <input
              type="number"
              value={intensity}
              min={1}
              max={5}
              onChange={e => handleIntensity(Number(e.target.value))}
              className="w-16 px-2 py-1 mt-2 rounded border"
              aria-label="Manual intensity input"
            />
          </div>
        )}

        {/* Body Location */}
        {selectedType && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Body Location (Optional)</h3>
            <div className="flex flex-wrap gap-2">
              {bodyLocations.map((loc) => (
                <Badge
                  key={loc}
                  variant={location === loc ? "default" : "outline"}
                  className="cursor-pointer font-dyslexia hover-lift transition-all duration-200"
                  onClick={() => setLocation(location === loc ? '' : loc)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={location === loc}
                  aria-label={`Select body location: ${loc}`}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLocation(location === loc ? '' : loc);
                    }
                  }}
                >
                  {loc}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Coping Strategies */}
        {selectedResponse && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Coping Strategies Used</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCopingStrategy}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCopingStrategy(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddCopingStrategy()}
                placeholder={String(tTracking('sensory.coping.placeholder'))}
                aria-label={String(tTracking('sensory.coping.ariaAddLabel'))}
                className="flex-1 px-3 py-2 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <Button onClick={handleAddCopingStrategy} size="sm" variant="outline">
                {String(tCommon('buttons.add'))}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {copingStrategySuggestions.map((strategy) => (
                <Badge
                  key={strategy}
                  variant="outline"
                  className="cursor-pointer font-dyslexia text-xs"
                  onClick={() => {
                    if (!copingStrategies.includes(strategy)) {
                      setCopingStrategies([...copingStrategies, strategy]);
                    }
                  }}
                  role="button"
                  aria-label={String(tTracking('sensory.coping.addSuggestion', { strategy }))}
                >
                  + {strategy}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {copingStrategies.map((strategy) => (
                <Badge
                  key={strategy}
                  variant="secondary"
                  className="font-dyslexia cursor-pointer"
                  onClick={() => handleRemoveCopingStrategy(strategy)}
                  role="button"
                  aria-label={String(tTracking('sensory.coping.remove', { strategy }))}
                >
                  {strategy} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Environment */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">{String(tTracking('sensory.environment.label'))}</h3>
          <input
            type="text"
            value={environment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnvironment(e.target.value)}
            placeholder={String(tTracking('sensory.environment.placeholder'))}
            aria-label={String(tTracking('sensory.environment.ariaLabel'))}
            className="w-full px-3 py-2 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">{String(tTracking('sensory.notes'))}</h3>
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder={String(tTracking('sensory.notesPlaceholder'))}
            className="font-dyslexia bg-input border-border focus:ring-ring"
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!selectedType || !selectedResponse}
          className="w-full font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
        >
          {String(tTracking('sensory.addInput'))}
        </Button>
      </CardContent>
    </Card>
  );
};
