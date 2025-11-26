import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ErrorWithStatus } from '../utils/types';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/health') {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip } = req;

  logger.info('Incoming request', { method, url: originalUrl, ip });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger[level]('Request completed', {
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as ErrorWithStatus).status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error('Request failed', {
    error: err.message,
    method: req.method,
    url: req.originalUrl,
    status,
    ...(isProd ? {} : { stack: err.stack })
  });

  res.status(status).json({
    error: status === 500 && isProd ? 'Internal Server Error' : err.name,
    message: status === 500 && isProd ? 'Something went wrong' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
};
