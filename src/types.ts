export interface ApiResponse<T = unknown> {
  success: boolean;
  summary: string;
  details?: T;
}

export interface Env {
  TOKENS: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
