import { Request as ExpressRequest, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | number;
        [key: string]: unknown;
      };
    }
  }
}

interface ErrorWithStatus extends Error {
  status?: number;
}

// Re-export the Request type for use in other files
export interface Request extends ExpressRequest {}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip, body, query, params, headers } = req;

  // Skip logging for health checks to reduce noise
  if (originalUrl === '/health') {
    return next();
  }

  // Log the request
  logger.info('Incoming request', {
    type: 'request',
    method,
    url: originalUrl,
    ip,
    userAgent: headers['user-agent'],
    ...(query && Object.keys(query).length > 0 && { query }),
    ...(params && Object.keys(params).length > 0 && { params }),
    // Be careful with logging body in production as it might contain sensitive data
    ...(process.env.NODE_ENV !== 'production' && body && Object.keys(body).length > 0 && { body })
  });

  // Log the response when it's finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logData = {
      type: 'response',
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
    };

    if (statusCode >= 400) {
      logger.error('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = (err as ErrorWithStatus).status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Request failed', {
    type: 'error',
    error: {
      name: err.name,
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      ...(req.user && { userId: req.user.id }), // Add user context if available
    },
    response: {
      status: statusCode,
    },
  });

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.name,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Something went wrong' 
      : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    type: 'not_found',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};
