/* eslint-disable no-console -- Logger intentionally proxies to console when enabled */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

interface ErrorData {
  message: string;
  stack?: string;
  name: string;
  [key: string]: unknown;
}

class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  private constructor() {
    const env = (() => {
      try {
        return (import.meta as any)?.env;
      } catch {
        return undefined;
      }
    })();
    const isProd = !!(env && env.PROD);
    const logLevelName = (env && typeof env.VITE_LOG_LEVEL === 'string') ? env.VITE_LOG_LEVEL : 'info';
    const debugMode = !!(env && (env.MODE === 'development' || env.DEV === true));
    const mappedLevel: LogLevel | null = (() => {
      switch (logLevelName) {
        case 'debug': return LogLevel.DEBUG;
        case 'info': return LogLevel.INFO;
        case 'warn': return LogLevel.WARN;
        case 'error': return LogLevel.ERROR;
        case 'none': return LogLevel.NONE;
        default: return null;
      }
    })();
    this.config = {
      level: mappedLevel !== null ? mappedLevel : (isProd ? LogLevel.ERROR : (debugMode ? LogLevel.DEBUG : LogLevel.INFO)),
      enableConsole: mappedLevel !== LogLevel.NONE,
      enableRemote: false
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public init(level: LogLevel) {
    this.config.level = level;
  }

  public setLogLevel(level: LogLevel) {
    this.config.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}]`;
  }

  debug(message: string, ...data: LogData[]): void {
    if (this.shouldLog(LogLevel.DEBUG) && this.config.enableConsole) {
      console.log(this.formatMessage('DEBUG'), message, ...data);
    }
  }

  info(message: string, ...data: LogData[]): void {
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage('INFO'), message, ...data);
    }
  }

  warn(message: string, ...data: LogData[]): void {
    if (this.shouldLog(LogLevel.WARN) && this.config.enableConsole) {
      console.warn(this.formatMessage('WARN'), message, ...data);
    }
  }

  error(message: string, ...data: (Error | LogData)[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (this.config.enableConsole) {
        console.error(this.formatMessage('ERROR'), message, ...data);
      }

      const errorData = data.map(d => {
        if (d instanceof Error) {
          return { message: d.message, stack: d.stack, name: d.name };
        }
        return d;
      });
      
      // Send to remote logging service if enabled
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        this.sendToRemote(message, errorData);
      }
    }
  }

  private async sendToRemote(message: string, data: (LogData | ErrorData)[]): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          message,
          data,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      // Silently fail to avoid infinite loop
    }
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const logger = Logger.getInstance();
