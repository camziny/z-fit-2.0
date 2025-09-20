export type WorkoutSet = {
  reps?: number;
  weight?: number;
  done?: boolean;
};

export type WorkoutExercise = {
  exerciseName?: string;
  equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight' | string;
  loadingMode?: 'bar' | 'pair' | 'single' | string;
  loadBasis?: 'external' | 'bodyweight' | 'bodyweight_plus' | 'assisted' | string;
  gifUrl?: string;
  sets: WorkoutSet[];
  rir?: number;
};


