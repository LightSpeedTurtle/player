export interface MySubmission {
  id: string | number;
  start_time: string; // MM:SS string
  start_seconds: number;
  end_time: string; // MM:SS string
  end_seconds: number;
  type: string;
  explanation?: string;
  state: string;
  submitted_at: string;
  show_name: string;
  season_episode: string;
}
