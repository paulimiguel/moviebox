export interface ApiErrorPayload {
  error: string;
  message?: string;
  details?: unknown;
}

export interface ApiSuccessPayload {
  success: true;
}

export interface ImageUploadResult {
  success: true;
  images: Array<{
    url: string;
    localPath: string;
    order: number;
    isPrimary: boolean;
    altText: string;
  }>;
}
