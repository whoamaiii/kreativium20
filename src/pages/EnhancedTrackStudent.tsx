import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SmartDataEntry } from "@/components/SmartDataEntry";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { dataStorage } from "@/lib/dataStorage";
import { ArrowLeft, Save, X, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { analyticsManager } from "@/lib/analyticsManager";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

const EnhancedTrackStudent = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { tStudent, tCommon, tTracking } = useTranslation();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessionEmotions, setSessionEmotions] = useState<EmotionEntry[]>([]);
  const [sessionSensoryInputs, setSessionSensoryInputs] = useState<SensoryEntry[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [sessionStartTime] = useState(new Date());
  const [recentData, setRecentData] = useState<{
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  }>({ emotions: [], sensoryInputs: [] });

  useEffect(() => {
    if (!studentId) return;

    // Load student data
    const storedStudents = localStorage.getItem('sensoryTracker_students');
    if (storedStudents) {
      const students = JSON.parse(storedStudents);
      const foundStudent = students.find((s: Student) => s.id === studentId);
      if (foundStudent) {
        setStudent({
          ...foundStudent,
          createdAt: new Date(foundStudent.createdAt)
        });
      } else {
        toast.error(String(tCommon('student_not_found')));
        navigate('/');
        return;
      }
    }

    // Load recent data for smart suggestions
    const storedEntries = localStorage.getItem('sensoryTracker_entries');
    if (storedEntries) {
      const entries: TrackingEntry[] = JSON.parse(storedEntries);
      const studentEntries = entries
        .filter(entry => entry.studentId === studentId)
        .map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          emotions: entry.emotions.map(e => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })),
          sensoryInputs: entry.sensoryInputs.map(s => ({
            ...s,
            timestamp: new Date(s.timestamp)
          }))
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10); // Get last 10 sessions

      // Flatten recent emotions and sensory inputs
      const recentEmotions = studentEntries.flatMap(entry => entry.emotions);
      const recentSensoryInputs = studentEntries.flatMap(entry => entry.sensoryInputs);
      
      setRecentData({
        emotions: recentEmotions,
        sensoryInputs: recentSensoryInputs
      });
    }
  }, [studentId, navigate]);

  const handleEmotionAdd = (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => {
    const newEmotion: EmotionEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...emotion
    };
    setSessionEmotions(prev => [...prev, newEmotion]);
    toast.success(String(tTracking('emotions.added', { emotion: emotion.emotion, intensity: emotion.intensity })));
  };

  const handleSensoryAdd = (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => {
    const newSensory: SensoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...sensory
    };
    setSessionSensoryInputs(prev => [...prev, newSensory]);
    const sensedType = (sensory as any).type ?? (sensory as any).sensoryType;
    toast.success(String(tTracking('sensory.added', { type: sensedType, response: sensory.response })));
  };

  const handleSaveSession = async () => {
    if (!student) return;

    if (sessionEmotions.length === 0 && sessionSensoryInputs.length === 0) {
      toast.error(String(tTracking('session.validationError')));
      return;
    }

    try {
      const sessionData: TrackingEntry = {
        id: crypto.randomUUID(),
        studentId: student.id,
        timestamp: sessionStartTime,
        emotions: sessionEmotions,
        sensoryInputs: sessionSensoryInputs,
        environmentalData: {
          location: '',
          roomConditions: {
            noiseLevel: 0,
            lighting: '',
            temperature: 0
          },
          socialContext: ''
        },
        notes: generalNotes
      };

      dataStorage.saveTrackingEntry(sessionData);

      // Trigger analytics update only if there's data
      if (sessionEmotions.length > 0 || sessionSensoryInputs.length > 0) {
        analyticsManager.initializeStudentAnalytics(student.id);
        await analyticsManager.triggerAnalyticsForStudent(student);
      }

      toast.success(String(tTracking('session.sessionSaved')));
      navigate(`/student/${student.id}`);
    } catch (error) {
      logger.error('Save session error', { error });
      toast.error(String(tTracking('session.saveError')));
    }
  };

  const handleCancel = () => {
    if (sessionEmotions.length > 0 || sessionSensoryInputs.length > 0) {
      if (confirm(String(tTracking('session.unsavedConfirm')))) {
        navigate(`/student/${student.id}`);
      }
    } else {
      navigate(`/student/${student.id}`);
    }
  };

  const removeEmotion = (id: string) => {
    setSessionEmotions(prev => prev.filter(e => e.id !== id));
  };

  const removeSensory = (id: string) => {
    setSessionSensoryInputs(prev => prev.filter(s => s.id !== id));
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background font-dyslexia flex items-center justify-center">
          <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{String(tCommon('status.loading'))}</h1>
          <div className="animate-pulse">{String(tCommon('loading_student_data'))}</div>
        </div>
      </div>
    );
  }

  const sessionDuration = Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60);

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/student/${student.id}`)}
              className="font-dyslexia"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {String(tStudent('profile.backToProfile'))}
            </Button>
            <div>
              <h1 className="text-xl font-bold">{String(tTracking('session.title', { studentName: student.name }))}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {String(tTracking('session.duration', { minutes: sessionDuration }))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              {String(tTracking('session.cancelSession'))}
            </Button>
            <Button 
              onClick={handleSaveSession}
              disabled={sessionEmotions.length === 0 && sessionSensoryInputs.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {String(tTracking('session.saveSession'))}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Session Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              {String(tTracking('session.summary'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{sessionEmotions.length}</div>
                <div className="text-sm text-muted-foreground">{String(tStudent('interface.emotionsTracked'))}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{sessionSensoryInputs.length}</div>
                <div className="text-sm text-muted-foreground">{String(tStudent('interface.sensoryInputs'))}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{sessionDuration}m</div>
                <div className="text-sm text-muted-foreground">{String(tTracking('session.sessionTime'))}</div>
              </div>
            </div>
            {sessionEmotions.length === 0 && sessionSensoryInputs.length === 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center text-muted-foreground">
                {String(tTracking('session.startHint'))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Data Entry */}
        <SmartDataEntry
          student={student}
          recentEmotions={recentData.emotions}
          recentSensoryInputs={recentData.sensoryInputs}
          onEmotionAdd={handleEmotionAdd}
          onSensoryAdd={handleSensoryAdd}
        />

        {/* Session Data Review */}
        {(sessionEmotions.length > 0 || sessionSensoryInputs.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Session Data Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Session Emotions */}
              {sessionEmotions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{String(tTracking('session.emotionsThisSession'))}</h4>
                  <div className="space-y-2">
                    {sessionEmotions.map((emotion) => (
                      <div key={emotion.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{emotion.emotion}</div>
                          <div className="text-sm text-muted-foreground">
                            {String(tTracking('emotions.intensity'))}: {emotion.intensity}{String(tTracking('emotions.outOf', { max: 5 }))}
                          </div>
                          {emotion.context && (
                            <div className="text-sm text-muted-foreground">
                              {String(tTracking('emotions.context'))}: {emotion.context}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(emotion.timestamp, 'HH:mm')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmotion(emotion.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Session Sensory Inputs */}
              {sessionSensoryInputs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{String(tTracking('session.sensoryInputsThisSession'))}</h4>
                  <div className="space-y-2">
                    {sessionSensoryInputs.map((sensory) => (
                      <div key={sensory.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{sensory.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {sensory.input} - {sensory.response}
                          </div>
                          {sensory.context && (
                            <div className="text-sm text-muted-foreground">
                              {String(tTracking('sensory.context'))}: {sensory.context}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(sensory.timestamp, 'HH:mm')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSensory(sensory.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* General Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{String(tTracking('session.generalNotes'))}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="general-notes">{String(tTracking('session.generalNotesLabel'))}</Label>
              <Textarea
                id="general-notes"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder={String(tTracking('session.generalNotesPlaceholder'))}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { EnhancedTrackStudent };
