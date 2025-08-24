/**
 * Centralized logging utility for the Vimle application
 * Provides consistent logging with environment-based controls
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

/**
 * Main logger class with environment-aware logging
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isDebugEnabled =
    this.isDevelopment || process.env.VITE_DEBUG === "true";

  /**
   * Log debug information (development only)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDebugEnabled) {
      this.log("debug", message, data);
    }
  }

  /**
   * Log general information
   */
  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  /**
   * Log errors
   */
  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
    };

    // Format the log message
    const formattedMessage = `[${entry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}`;

    // Log to console based on level
    switch (level) {
      case "debug":
        console.debug(formattedMessage, data);
        break;
      case "info":
        console.info(formattedMessage, data);
        break;
      case "warn":
        console.warn(formattedMessage, data);
        break;
      case "error":
        console.error(formattedMessage, data);
        break;
    }

    // In production, you might want to send logs to a service
    if (!this.isDevelopment && level === "error") {
      this.sendToLogService(entry);
    }
  }

  /**
   * Send logs to external service in production
   * Currently a placeholder for future implementation
   */
  private sendToLogService(_entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Example: send to Sentry, LogRocket, or custom analytics
  }

  /**
   * Log challenge-specific events
   */
  challenge = {
    started: (challengeId: string) => {
      this.info("Challenge started", { challengeId });
    },
    completed: (challengeId: string, timeMs: number) => {
      this.info("Challenge completed", {
        challengeId,
        timeMs,
        timeSeconds: (timeMs / 1000).toFixed(2),
      });
    },
    failed: (challengeId: string, error: unknown) => {
      this.error("Challenge completion failed", { challengeId, error });
    },
    contentMatch: (
      challengeId: string,
      leftLength: number,
      rightLength: number
    ) => {
      this.debug("Content comparison", {
        challengeId,
        leftLength,
        rightLength,
        match: leftLength === rightLength,
      });
    },
  };

  /**
   * Log user interaction events
   */
  user = {
    interaction: (action: string, details?: unknown) => {
      this.debug("User interaction", { action, details });
    },
    auth: (action: string, userId?: string) => {
      this.info("Authentication event", { action, userId });
    },
  };

  /**
   * Log editor events
   */
  editor = {
    motion: (motion: string) => {
      this.debug("Vim motion captured", { motion });
    },
    contentChange: (length: number) => {
      this.debug("Editor content changed", { length });
    },
    reset: () => {
      this.debug("Editor reset triggered");
    },
  };

  /**
   * Log API/tRPC events
   */
  api = {
    request: (procedure: string, input?: unknown) => {
      this.debug("tRPC request", { procedure, input });
    },
    response: (procedure: string, success: boolean, data?: unknown) => {
      this.debug("tRPC response", { procedure, success, data });
    },
    error: (procedure: string, error: unknown) => {
      this.error("tRPC error", { procedure, error });
    },
  };
}

/**
 * Global logger instance
 * Import and use this throughout the application
 */
export const logger = new Logger();

/**
 * Utility function to safely stringify objects for logging
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
