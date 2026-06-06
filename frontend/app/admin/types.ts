export interface Distribution {
  ai_count: number;
  human_count: number;
}

export interface DailyActivity {
  day: string;
  count: number;
}

export interface AdminStats {
  total_users: number;
  total_predictions: number;
  active_accuracy: string;
  total_feedback: number;
  distribution: Distribution;
  daily_activity: DailyActivity[];
}

export interface DatasetItem {
  id: number;
  filename: string;
  row_count: number;
  upload_date: string;
}

export interface ModelVersionItem {
  id: number;
  version_name: string;
  accuracy: string;
  f1_score: string;
  is_active: boolean;
  trained_at: string;
}

export interface FeedbackItem {
  id: number;
  prediction_id: number;
  input_text: string;
  system_prediction: string;
  correct_label: string;
  comment: string;
  created_at: string;
}

export interface UploadResponse {
  dataset_id: number;
  row_count: number;
  status: string;
}
