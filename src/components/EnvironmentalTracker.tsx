import { useId, useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EnvironmentalEntry } from "@/types/student";
import { 
  Thermometer, 
  Sun, 
  Volume2, 
  Users, 
  Cloud, 
  Plus,
  X
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface EnvironmentalTrackerProps {
  onEnvironmentalAdd: (entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

export const EnvironmentalTracker = ({ onEnvironmentalAdd, studentId }: EnvironmentalTrackerProps) => {
  const { tTracking, tCommon } = useTranslation();
  const specialEventInputId = useId();
  const [roomTemperature, setRoomTemperature] = useState<number>(22);
  const [lighting, setLighting] = useState<string>('');
  const [noiseLevel, setNoiseLevel] = useState<number>(3);
  const [classroomActivity, setClassroomActivity] = useState<string>('');
  const [weather, setWeather] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('');
  const [specialEvents, setSpecialEvents] = useState<string[]>([]);
  const [newEvent, setNewEvent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleAddSpecialEvent = () => {
    if (newEvent.trim() && !specialEvents.includes(newEvent.trim())) {
      setSpecialEvents([...specialEvents, newEvent.trim()]);
      setNewEvent('');
    }
  };

  const handleRemoveSpecialEvent = (event: string) => {
    setSpecialEvents(specialEvents.filter(e => e !== event));
  };

  const handleSubmit = () => {
    if (!lighting || !classroomActivity || !weather || !timeOfDay) {
      toast.error(String(tTracking('environmental.requiredError')));
      return;
    }

    const entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'> = {
      roomConditions: {
        temperature: roomTemperature,
        lighting: lighting as 'bright' | 'normal' | 'dim',
        noiseLevel: noiseLevel
      },
      weather: { 
        condition: weather as 'sunny' | 'cloudy' | 'rainy' | 'snowy',
        temperature: roomTemperature 
      },
      classroom: {
        activity: classroomActivity as 'low' | 'moderate' | 'high',
        timeOfDay: timeOfDay
      },
      notes: notes.trim() || undefined
    };

    onEnvironmentalAdd(entry);
    
    // Reset form
    setRoomTemperature(22);
    setLighting('');
    setNoiseLevel(3);
    setClassroomActivity('');
    setWeather('');
    setTimeOfDay('');
    setSpecialEvents([]);
    setNotes('');
  };

  const isFormValid = Boolean(lighting && classroomActivity && weather && timeOfDay);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Thermometer className="h-5 w-5 text-primary" />
          {String(tTracking('environmental.title'))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Temperature */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            {String(tTracking('environmental.temperatureLabel'))}: {roomTemperature}°C
          </Label>
          <Slider
            value={[roomTemperature]}
            onValueChange={(value) => setRoomTemperature(value[0])}
            max={30}
            min={15}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15°C</span>
            <span>30°C</span>
          </div>
        </div>

        {/* Lighting */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Sun className="h-4 w-4" />
            {String(tTracking('environmental.lightingLabel'))}
          </Label>
          <Select value={lighting} onValueChange={setLighting}>
            <SelectTrigger>
              <SelectValue placeholder={String(tTracking('environmental.lightingLabel'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bright">{String(tTracking('environmental.lighting.bright'))}</SelectItem>
              <SelectItem value="normal">{String(tTracking('environmental.lighting.normal'))}</SelectItem>
              <SelectItem value="dim">{String(tTracking('environmental.lighting.dim'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Noise Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            {String(tTracking('environmental.noiseLevel'))}: {noiseLevel}/5
          </Label>
          <Slider
            value={[noiseLevel]}
            onValueChange={(value) => setNoiseLevel(value[0])}
            max={5}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{String(tTracking('environmental.levels.low'))}</span>
            <span>{String(tTracking('environmental.levels.high'))}</span>
          </div>
        </div>

        {/* Crowd Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {String(tTracking('environmental.crowdLevel'))}
          </Label>
          <Select value={classroomActivity} onValueChange={setClassroomActivity}>
            <SelectTrigger>
              <SelectValue placeholder={String(tTracking('environmental.crowdLevel'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{String(tTracking('environmental.levels.low'))}</SelectItem>
              <SelectItem value="moderate">{String(tTracking('environmental.levels.moderate'))}</SelectItem>
              <SelectItem value="high">{String(tTracking('environmental.levels.high'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {String(tTracking('environmental.notes'))}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={String(tTracking('environmental.notesPlaceholder'))}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Weather */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            {String(tTracking('environmental.weather'))}
          </Label>
          <Select value={weather} onValueChange={setWeather}>
            <SelectTrigger>
              <SelectValue placeholder={String(tTracking('environmental.weather'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sunny">{String(tTracking('environmental.weatherOptions.sunny'))}</SelectItem>
              <SelectItem value="cloudy">{String(tTracking('environmental.weatherOptions.cloudy'))}</SelectItem>
              <SelectItem value="rainy">{String(tTracking('environmental.weatherOptions.rainy'))}</SelectItem>
              <SelectItem value="snowy">{String(tTracking('environmental.weatherOptions.snowy'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time of Day */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {String(tTracking('environmental.timeOfDay'))}
          </Label>
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger>
              <SelectValue placeholder={String(tTracking('environmental.timeOfDay'))} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">{String(tTracking('environmental.timeOfDayOptions.morning'))}</SelectItem>
              <SelectItem value="afternoon">{String(tTracking('environmental.timeOfDayOptions.afternoon'))}</SelectItem>
              <SelectItem value="evening">{String(tTracking('environmental.timeOfDayOptions.evening'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Special Events */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor={specialEventInputId}>
            {String(tTracking('environmental.specialEvents'))}
          </label>
          <div className="flex gap-2">
            <input
              id={specialEventInputId}
              type="text"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              placeholder={String(tTracking('environmental.specialEventsPlaceholder'))}
              aria-label={String(tTracking('environmental.specialEvents'))}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialEvent()}
            />
            <Button onClick={handleAddSpecialEvent} size="sm" type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {specialEvents.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {specialEvents.map((event, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  {event}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleRemoveSpecialEvent(event)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full"
        >
          {String(tCommon('buttons.save'))} {String(tTracking('environmental.title'))}
        </Button>
      </CardContent>
    </Card>
  );
};
