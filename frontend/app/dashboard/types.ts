export interface StylometryData {
  avg_sent_len: string;
  lex_div: string;
  punct_dens: string;
  sent_len_var: string;
  noun_dens: string;    
  verb_dens: string;    
  adj_dens: string;     
}

export interface PredictionResponse {
  status: string;
  prediction: string;
  confidence: string;
  prediction_id: number;
  stylometry: StylometryData;
  ai_keywords: AiKeyword[]; 
}

export interface AiKeyword {
  word: string;
  weight: number;
}

export interface HistoryItem {
  id: number;
  input_text: string;
  prediction_result: string;
  confidence: string;
  created_at: string;
}
