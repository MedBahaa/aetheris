/**
 * Logger basique "Enterprise Grade" pour centraliser la gestion des logs.
 * À l'avenir, ceci peut être branché directement sur Sentry, Datadog ou Winston.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case 'info':
          console.info(formattedMessage, meta || '');
          break;
        case 'warn':
          console.warn(formattedMessage, meta || '');
          break;
        case 'error':
          console.error(formattedMessage, meta || '');
          break;
        case 'debug':
          console.debug(formattedMessage, meta || '');
          break;
      }
    } else {
      // En production, nous pourrions envoyer ces logs à un service externe
      // Exemple fictif: await fetch('https://log.votreservice.com', { body: JSON.stringify({ level, message, meta }) })
      if (level === 'error') {
        console.error(formattedMessage, meta ? JSON.stringify(meta) : '');
      } else {
        // En prod on affiche un minimum
        console.log(formattedMessage);
      }
    }
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }
}

export const logger = new Logger();
