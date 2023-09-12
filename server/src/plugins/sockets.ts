import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyServerOptions,
} from 'fastify';
import fp from 'fastify-plugin';
import {Redis} from 'ioredis';
import {CHANNELS, EVENTS} from '../constants/events';
import {randomUUID} from 'crypto';
import fastifyIo from 'fastify-socket.io';

async function sockets(fastify: FastifyInstance) {
  await fastify.register(fastifyIo);

  fastify.io.on('connection', async io => {
    fastify.connectedClients++;
    console.log('Client connected');
    const newCount = await fastify.publisher.incr(EVENTS.CONNECTION_COUNT_KEY);

    await fastify.publisher.publish(
      CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL,
      String(newCount)
    );

    io.on(CHANNELS.NEW_MESSAGE_CHANNEL, async payload => {
      const message = payload.message;
      if (!message) return;
      await fastify.publisher.publish(
        CHANNELS.NEW_MESSAGE_CHANNEL,
        message.toString()
      );
    });

    io.on('disconnect', async () => {
      fastify.connectedClients--;
      console.log('Client disconnected');

      const newCount = await fastify.publisher.decr(
        EVENTS.CONNECTION_COUNT_KEY
      );

      await fastify.publisher.publish(
        CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL,
        String(newCount)
      );
    });
  });
}

export default fp(sockets);
