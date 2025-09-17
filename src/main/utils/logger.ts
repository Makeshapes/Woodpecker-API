import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logFile: string;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    // Set log file path in user data directory
    const userDataPath = app.getPath('userData');
    this.logFile = path.join(userDataPath, 'logs', 'main.log');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Initialize log stream
    this.initLogStream();
    
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.logLevel = LogLevel.DEBUG;
    } else {
      // Production should only log errors and warnings to improve performance
      this.logLevel = LogLevel.WARN;
    }
  }

  private initLogStream(): void {
    try {
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
      
      this.logStream.on('error', (error) => {
        console.error('Log stream error:', error);
      });
    } catch (error) {
      console.error('Failed to initialize log stream:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, category, message, data, error } = entry;
    let logLine = `[${timestamp}] ${level.toUpperCase()} [${category}] ${message}`;
    
    if (data) {
      logLine += ` | Data: ${JSON.stringify(data)}`;
    }
    
    if (error) {
      logLine += ` | Error: ${error.name}: ${error.message}`;
      if (error.stack) {
        logLine += ` | Stack: ${error.stack}`;
      }
    }
    
    return logLine;
  }

  private writeLog(entry: LogEntry): void {
    const logLine = this.formatLogEntry(entry);
    
    // Write to console
    console.log(logLine);
    
    // Write to file
    if (this.logStream) {
      this.logStream.write(logLine + '\n');
    }
  }

  private log(level: LogLevel, category: string, message: string, data?: any, error?: Error): void {
    if (level > this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      category,
      message,
      data
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.writeLog(entry);
  }

  error(category: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('Logger', `Log level set to ${LogLevel[level]}`);
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  // Rotate log files to prevent them from getting too large
  rotateLogFile(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (stats.size > maxSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = this.logFile.replace('.log', `-${timestamp}.log`);
          
          // Close current stream
          if (this.logStream) {
            this.logStream.end();
          }
          
          // Rename current log file
          fs.renameSync(this.logFile, rotatedFile);
          
          // Reinitialize log stream
          this.initLogStream();
          
          this.info('Logger', `Log file rotated to ${rotatedFile}`);
        }
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Setup log rotation every hour
setInterval(() => {
  logger.rotateLogFile();
}, 60 * 60 * 1000); // 1 hour

// Graceful shutdown
process.on('exit', () => {
  logger.close();
});

process.on('SIGTERM', () => {
  logger.close();
});

process.on('SIGINT', () => {
  logger.close();
});
