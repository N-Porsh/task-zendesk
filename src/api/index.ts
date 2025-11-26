import { createApp } from './app';
import { client } from '../grpc/client';
import logger from '../utils/logger';

const app = createApp(client);
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

if (require.main !== module) {
  server.close();
}

export { app };
export default server;

