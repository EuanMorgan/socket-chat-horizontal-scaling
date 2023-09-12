import {FastifyInstance, FastifyServerOptions} from 'fastify';
import fp from 'fastify-plugin';
import {Redis} from 'ioredis';
import {CHANNELS, EVENTS} from '../constants/events';
import {randomUUID} from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;

if (!UPSTASH_REDIS_REST_URL) {
  console.error('UPSTASH_REDIS_REST_URL is required');
  process.exit(1);
}

const publisher = new Redis(
  UPSTASH_REDIS_REST_URL
  //   , {
  //   tls:{
  //     rejectUnauthorized: true
  //   }
  // }
);
const subscriber = new Redis(UPSTASH_REDIS_REST_URL);

async function redis(
  fastify: FastifyInstance,
  opts: {
    port: number;
  }
) {
  const currentCount = await publisher.get(EVENTS.CONNECTION_COUNT_KEY);
  const {port: PORT} = opts;

  if (!currentCount) {
    await publisher.set(EVENTS.CONNECTION_COUNT_KEY, 0);
  }

  subscriber.subscribe(CHANNELS.NEW_MESSAGE_CHANNEL, (err, count) => {
    if (err) {
      console.error(
        `Error subscribing to ${CHANNELS.NEW_MESSAGE_CHANNEL}`,
        err
      );
      return;
    }

    console.log(
      `${count} clients subscribed to ${CHANNELS.NEW_MESSAGE_CHANNEL} channel`
    );
  });

  subscriber.subscribe(
    CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL,
    (err, count) => {
      if (err) {
        console.error(
          `Error subscribing to ${CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL}`,
          err
        );
        return;
      }

      console.log(
        `${count} clients subscribed to ${CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL} channel`
      );
    }
  );

  subscriber.on('message', (channel, text) => {
    if (channel === CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL) {
      fastify.io.emit(CHANNELS.CONNECTION_COUNT_UPDATED_CHANNEL, {
        count: text,
      });

      return;
    }

    if (channel === CHANNELS.NEW_MESSAGE_CHANNEL) {
      fastify.io.emit(CHANNELS.NEW_MESSAGE_CHANNEL, {
        message: text,
        // The ID will be dependant on the instance
        id: randomUUID(),
        createdAt: new Date(),
        port: PORT,
      });

      return;
    }
  });

  fastify.decorate('publisher', publisher);
  fastify.decorate('subscriber', subscriber);
}

export default fp(redis);
