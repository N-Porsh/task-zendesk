import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

// Custom format that handles errors properly
const errorStackFormat = winston.format((info) => {
  if (info instanceof Error) {
    return {
      ...info,
      stack: info.stack,
      message: info.message
    };
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errorStackFormat(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'zdt-service' },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      ),
    })
  ]
});

// Handle uncaught exceptions and rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason });});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  // In production, you might want to gracefully shut down
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export default logger;
