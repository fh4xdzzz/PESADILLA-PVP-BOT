import { fastify } from 'fastify';
import { config } from '../config.js';
import { consumeLinkCode, verificationToken } from '../services/linking.js';
import { log } from '../logger.js';

export async function createHttpServer() {
  const app = fastify({ logger: false });

  app.post('/api/link/validate', async (req, reply) => {
    try {
      const { code, robloxUserId, robloxName } = req.body as {
        code: string;
        robloxUserId: string;
        robloxName?: string;
      };
      if (!code || !robloxUserId) {
        return reply.status(400).send({ success: false, error: 'Missing code or robloxUserId' });
      }
      const discordUserId = await consumeLinkCode(code, robloxUserId, robloxName);
      if (!discordUserId) {
        return reply.send({ success: false, error: 'Invalid or expired code' });
      }
      return reply.send({ success: true, discordUserId });
    } catch (err) {
      log.error({ err }, 'link/validate error');
      return reply.status(500).send({ success: false, error: 'Internal error' });
    }
  });

  return app;
}
