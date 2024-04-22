import { Viewport } from 'puppeteer'

export type taskStatus = 'none' | 'waiting' | 'doing' | 'completed' | 'failed'

export interface requestOptions {
  device: string;
  viewport: Viewport;
  lazy: boolean ;
  extendResponse: boolean;
  userAgent: string;
  callback?: string;
  referer?: string;
  timeout: number;
  source?: boolean;
}

export interface httpTaskMsg {
  ppteTaskId: string;
  url: string;
  taskId: string;
  execTime: number;
  retryTimes: number;
}

export interface httpTaskMsgOption {
  ppteTaskId: string;
  url: string;
  taskId?: string;
  execTime?: number;
  retryTimes?: number;
}

export interface taskRequest {
  method: string;
  url: string;
  params?: requestOptions;
}
export interface renderResult extends Record<string, unknown> {
  status?: taskStatus;
  httpCode?: number;
  headers?: Record<string, unknown>;
  cookies?: Record<string, any>;
  localStorage?: Record<string, unknown>;
  sessionStorage?: Record<string, unknown>;
  body?: number | string | string[] | Record<string, unknown> | Buffer | null;
  errno?: number;
  error?: string;
}

export interface taskResult {
  success: boolean;
  status?: taskStatus;
  data?: renderResult;
  error?: string;
  callbackUrl?: string;
  taskId?: string | null;
}

export interface taskMsg extends taskRequest{
  taskId: string;
}
