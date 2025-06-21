// Mock utility types
declare module 'joi' {
  export interface ObjectSchema {
    validate(value: any, options?: any): { error?: any; value: any };
  }
  
  export const object: (schema?: any) => ObjectSchema;
  export const string: () => any;
  export const number: () => any;
  export const boolean: () => any;
  export const array: () => any;
  export const date: () => any;
}

declare module 'winston' {
  export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  }
  
  export const createLogger: (options: any) => Logger;
  export const format: any;
  export const transports: any;
}

// Global Node.js types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      AWS_REGION?: string;
      SOLANA_RPC_ENDPOINT?: string;
      ML_ENDPOINT_NAME?: string;
      USER_TABLE_NAME?: string;
      PACK_TABLE_NAME?: string;
      TRADE_TABLE_NAME?: string;
      COMPETITION_TABLE_NAME?: string;
      SOCIAL_TABLE_NAME?: string;
      TRADING_QUEUE_URL?: string;
      SOCIAL_QUEUE_URL?: string;
      NOTIFICATION_QUEUE_URL?: string;
      TELEGRAM_BOT_TOKEN?: string;
      JWT_SECRET?: string;
      ENCRYPTION_KEY?: string;
      [key: string]: string | undefined;
    }
  }
  
  const process: {
    env: NodeJS.ProcessEnv;
    version: string;
    platform: string;
    arch: string;
    cwd(): string;
    exit(code?: number): never;
  };
}
