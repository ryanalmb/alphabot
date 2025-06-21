import { createLogger, format, transports } from 'winston';

// Create logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { 
    service: 'alphapack',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ],
});

// Add CloudWatch transport in production
if (process.env.NODE_ENV === 'production') {
  // CloudWatch logs are automatically captured by Lambda
  logger.add(new transports.Console({
    format: format.json()
  }));
}

export default logger;
