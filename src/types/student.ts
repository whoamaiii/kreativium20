export interface Student {
  id: string;
  name: string;
  grade?: string;
  dateOfBirth?: string;
  notes?: string;
  createdAt: Date;
  // IEP and baseline data
  iepGoals?: Goal[];
  baselineData?: BaselineData;
  environmentalPreferences?: EnvironmentalPreferences;
  // Additional metadata
  lastUpdated?: Date;
  version?: number;
}

export interface EmotionEntry {
  id: string;
  studentId?: string;
  emotion: string;
  subEmotion?: string; // New field for sub-emotions
  intensity: number;
  duration?: number; // New field for duration in minutes
  timestamp: Date;
  notes?: string;
  triggers?: string[];
  context?: string;
  trigger?: string;
  escalationPattern?: 'sudden' | 'gradual' | 'unknown'; // New field for escalation pattern
}

export interface SensoryEntry {
  id: string;
  studentId?: string;
  sensoryType?: string;
  type?: string;
  input?: string;
  response: string;
  intensity?: number;
  location?: string; // New field for body location
  timestamp: Date;
  notes?: string;
  environment?: string;
  context?: string;
  copingStrategies?: string[]; // New field for coping strategies
}

export interface TrackingEntry {
  id: string;
  studentId: string;
  timestamp: Date;
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  environmentalData?: EnvironmentalEntry;
  generalNotes?: string;
  notes?: string;
  version?: number;
}

// New interfaces for enhanced functionality
export interface EnvironmentalEntry {
  id?: string;
  timestamp?: Date;
  location?: string;
  socialContext?: string;
  roomConditions?: {
    temperature?: number;
    humidity?: number;
    lighting?: string;
    noiseLevel?: number;
  };
  weather?: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
    temperature?: number;
    pressure?: number;
  };
  classroom?: {
    activity?: 'low' | 'moderate' | 'high';
    studentCount?: number;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
  notes?: string;
}

export interface Goal {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: 'behavioral' | 'academic' | 'social' | 'sensory' | 'communication';
  targetDate: Date;
  createdDate: Date;
  updatedAt: Date;
  status: 'active' | 'achieved' | 'modified' | 'discontinued' | 'not_started' | 'in_progress' | 'on_hold';
  measurableObjective: string;
  currentProgress: number; // 0-100 percentage
  milestones?: Milestone[];
  interventions?: string[]; // IDs of associated interventions
  baselineValue?: number;
  targetValue?: number;
  dataPoints?: GoalDataPoint[];
  notes?: string;
  progress: number;
};

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  isCompleted: boolean;
  completedDate?: Date;
  notes?: string;
}

export interface GoalDataPoint {
  id: string;
  timestamp: Date;
  value: number;
  notes?: string;
  collectedBy?: string;
}

export interface Alert {
  id: string;
  studentId: string;
  type: 'pattern' | 'regression' | 'achievement' | 'environmental' | 'correlation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  trigger: string;
  timestamp: Date;
  isRead: boolean;
  isResolved: boolean;
  resolvedDate?: Date;
  resolvedBy?: string;
  actionItems?: string[];
  relatedData?: {
    goalId?: string;
    trackingEntryId?: string;
    correlationData?: CorrelationData;
  };
}

export interface Intervention {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: 'sensory' | 'behavioral' | 'environmental' | 'instructional' | 'social';
  strategy: string;
  implementationDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued' | 'modified';
  effectiveness: 1 | 2 | 3 | 4 | 5; // 1 = not effective, 5 = very effective
  frequency: 'daily' | 'weekly' | 'as-needed' | 'continuous';
  implementedBy: string[];
  dataCollection: InterventionDataPoint[];
  relatedGoals: string[]; // Goal IDs
  notes?: string;
  evidenceBase?: string; // Research or evidence supporting this intervention
}

export interface InterventionDataPoint {
  id: string;
  timestamp: Date;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  implementation: 'full' | 'partial' | 'modified' | 'skipped';
  notes?: string;
  collectedBy?: string;
}

export interface CorrelationData {
  id: string;
  studentId: string;
  type: 'emotion-sensory' | 'emotion-environment' | 'sensory-environment' | 'goal-intervention';
  strength: number; // -1 to 1, correlation coefficient
  confidence: number; // 0 to 1, confidence level
  primaryFactor: string;
  secondaryFactor: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  dataPoints: number; // Number of data points used in correlation
  insights: string[];
  recommendations?: string[];
  lastCalculated: Date;
}

export interface BaselineData {
  emotionalRegulation: {
    averageIntensity: number;
    mostCommonEmotion: string;
    triggerFrequency: Record<string, number>;
  };
  sensoryProcessing: {
    seekingBehaviors: Record<string, number>;
    avoidingBehaviors: Record<string, number>;
    preferredSensoryInput: string[];
  };
  environmentalFactors: {
    optimalConditions: Partial<EnvironmentalEntry['roomConditions']>;
    challengingConditions: string[];
  };
  collectedDate: Date;
  collectedBy: string;
}

export interface EnvironmentalPreferences {
  lighting: string[];
  noiseLevel: number;
  temperature: {
    preferred: number;
    tolerance: number;
  };
  seating: string[];
  classroomLayout: string[];
  notes?: string;
}

// Data storage and versioning interfaces
export interface DataVersion {
  version: number;
  timestamp: Date;
  changes: string[];
  backupData?: Record<string, unknown>;
}

export interface StorageIndex {
  students: Record<string, Date>; // studentId -> lastModified
  trackingEntries: Record<string, Date>; // entryId -> timestamp
  goals: Record<string, Date>; // goalId -> lastModified
  interventions: Record<string, Date>; // interventionId -> lastModified
  alerts: Record<string, Date>; // alertId -> timestamp
  lastUpdated: Date;
}

export type SearchResults = {
  students: Student[];
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
};

export type Anomaly = {
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high';
};

/**
 * @typedef {object} Pattern
 * Represents a detected pattern in the student's data.
 * @property {string} pattern - A title for the pattern.
 * @property {number} confidence - The confidence level of the detected pattern (0-1).
 * @property {string} description - A detailed explanation of the pattern.
 * @property {string[]} [recommendations] - Optional recommendations based on the pattern.
 */
export type Pattern = {
  pattern: string;
  confidence: number;
  description: string;
  recommendations?: string[];
  type: 'emotion' | 'sensory' | 'environmental' | 'correlation';
  dataPoints: number;
}

/**
 * @typedef {object} Correlation
 * Represents a statistical correlation found between two factors.
 * @property {string} factor1 - The first factor in the correlation.
 * @property {string} factor2 - The second factor in the correlation.
 * @property {number} correlation - The correlation coefficient (-1 to 1).
 * @property {string} description - A description of the correlation.
 */
export type Correlation = {
  factor1: string;
  factor2: string;
  correlation: number;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'moderate';
  recommendations?: string[];
}

/**
 * @typedef {object} Insights
 * A comprehensive object containing all AI-generated analysis for a student.
 * This includes detected patterns, statistical correlations, and actionable suggestions.
 */
export type Insights = {
  correlationMatrix?: Correlation[];
  anomalies?: Anomaly[];
  keyPatterns?: string[];
  patterns?: Pattern[];
  correlations?: Correlation[];
  suggestions?: string[];
};