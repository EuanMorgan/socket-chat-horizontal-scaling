import closeWithGrace from 'close-with-grace';
import dotenv from 'dotenv';
import fastify from 'fastify';
import Redis from 'ioredis';
import {EVENTS} from './constants/events';
import redis from './plugins/redis';
import fastifyCors = require('@fastify/cors');
import sockets from './plugins/sockets';
dotenv.config();

const PORT = parseInt(process.env.PORT || '4001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function buildServer() {
  const app = fastify();

  app.decorate('connectedClients', 0);

  await app.register(fastifyCors, {
    origin: CORS_ORIGIN,
  });

  await app.register(redis, {
    port: PORT,
  });

  await app.register(sockets);

  app.get('/health', () => {
    return {status: 'ok', port: PORT};
  });

  return app;
}

async function main() {
  const app = await buildServer();
  closeWithGrace(
    {
      delay: 2000,
    },
    async ({signal, err}) => {
      console.log('Shutting down');

      // Clean up connection count
      if (app.connectedClients > 0) {
        console.log(
          `Removing ${app.connectedClients} clients from the count...`
        );

        const currentCount = parseInt(
          (await app.publisher.get(EVENTS.CONNECTION_COUNT_KEY)) || '0',
          10
        );

        const newCount = Math.max(currentCount - app.connectedClients, 0);

        await app.publisher.set(EVENTS.CONNECTION_COUNT_KEY, newCount);
      }

      await app.close();

      console.log('Shut down complete 🫡');
    }
  );

  try {
    await app.listen({
      port: PORT,
      host: HOST,
    });
    console.log(`Server listening on http://${HOST}:${PORT}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();

declare module 'fastify' {
  interface FastifyInstance {
    publisher: Redis;
    subscriber: Redis;
    connectedClients: number;
  }
}
