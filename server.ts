import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  listSavedCenters,
  listUserRecharges,
  recordRechargeInSql,
  removeSavedCenterInSql,
  saveCenterInSql,
} from './src/db/repository.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

const VOLTPAY_SYSTEM_INSTRUCTION = `You are the VoltPay Assistant, an India prepaid mobile recharge and telecom plan specialist (+91, ₹ INR).
Help users compare prepaid plans, calculate discounts with active promo codes, check 5G eligibility, pick international roaming packs, or locate operator service centers.

Current VoltPay India Operators & Featured Plans:
- Jio True 5G (prefixes 91, 93, 89, 70, 63):
  • ₹69: 6 GB Total, 7 Days (Data Add-On)
  • ₹175: 10 GB Total + 10 OTT passes, 28 Days
  • ₹299 (Recommended): 2 GB/day, Unlimited Calls, 100 SMS/day, 28 Days, Unlimited True 5G + JioCinema
  • ₹349: 2.5 GB/day, 28 Days, Unlimited 5G + JioTV & Cloud 50 GB
  • ₹749 (Recommended): 2 GB/day + 20 GB bonus, 72 Days, Unlimited 5G
  • ₹899: 2 GB/day + 20 GB bonus, 90 Days, Unlimited 5G
  • ₹1,101: International Roaming (5 GB Global, 1000 Mins, 28 Days, 170+ countries)
  • ₹3,599: Annual Unlimited 5G (2.5 GB/day, 365 Days)
- Airtel 5G Plus (prefixes 98, 99, 97, 88, 81):
  • ₹99: 2-Day Unlimited Data (20 GB FUP)
  • ₹149: Xstream Data Pack (1 GB + 20+ OTT channels)
  • ₹299: Smart 5G Monthly (1.5 GB/day, 28 Days)
  • ₹379 (Recommended): 2 GB/day, 1 Month (30 Days), Unlimited 5G + Xstream Play Basic
  • ₹649: Global Roaming 1-Day (500 MB + 100 Mins)
  • ₹859 (Recommended): 2 GB/day, 84 Days, Unlimited 5G
  • ₹3,599: Annual 365-Day 5G (2 GB/day, 365 Days)
- Vi Max (prefixes 96, 95, 90, 84, 75):
  • ₹155: 12 GB Total Data Booster, 28 Days
  • ₹299 (Recommended): 1 GB/day, 28 Days, Binge All Night (12am–6am unlimited)
  • ₹859: 1.5 GB/day, 84 Days, Weekend Data Rollover
  • ₹995: Vi Abroad 7-Day Pack (7 GB Global, 150 Mins)
  • ₹3,499: Annual Hero Max (1.5 GB/day, 365 Days, Disney+ Hotstar Mobile 1-year)
- BSNL Mobile (prefixes 94, 80, 73):
  • ₹199 (Recommended): 2 GB/day, 30 Days, free national roaming
  • ₹599: 3 GB/day, 84 Days
  • ₹1,515: 2 GB/day Data SIM Annual (365 Days)

Active VoltPay Promo Codes (applied in Checkout):
- SAVE20: Flat ₹20 off on recharges ₹199+
- FIRST50: Flat ₹50 off on recharges ₹499+
- VOLT10: 10% instant discount (up to ₹75) on orders ₹15+

Guidelines:
- Format prices in ₹ INR clearly and compute exact promo savings when asked.
- Keep answers concise, structured, and easy to scan on both desktop and mobile.
- Never claim to have executed a payment or accessed personal bank details; guide the user to select a plan and confirm in Checkout.
- Mention the Stores & 3D tab when users ask where to visit an Airtel, Jio, Vi, or BSNL store or preview 5G hardware.`;

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Assistant service is not configured yet.',
      });
      return;
    }

    const body = req.body as {
      message?: unknown;
      history?: unknown;
      model?: unknown;
    };

    const userMessage =
      typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    if (!userMessage) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const requestedModel =
      typeof body?.model === 'string' && ALLOWED_MODELS.has(body.model)
        ? body.model
        : 'gemini-4-hydrogen';

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const safeHistory = rawHistory
      .filter(
        (item): item is ChatTurn =>
          Boolean(item) &&
          typeof item === 'object' &&
          (item.role === 'user' || item.role === 'model') &&
          typeof item.text === 'string' &&
          item.text.trim().length > 0
      )
      .slice(-16)
      .map((item) => ({
        role: item.role,
        parts: [{ text: item.text.slice(0, 4000) }],
      }));

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const chat = ai.chats.create({
        model: requestedModel,
        history: safeHistory,
        config: {
          systemInstruction: VOLTPAY_SYSTEM_INSTRUCTION,
          temperature: 0.5,
          maxOutputTokens: 800,
        },
      });

      const response = await chat.sendMessage({
        message: userMessage,
      });

      res.json({
        text: response.text ?? 'I could not generate a response. Please try asking again.',
        model: requestedModel,
      });
    } catch (error: unknown) {
      console.error('Gemini chat error:', error);
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 500;
      if (status === 429) {
        res.status(429).json({
          error: 'Assistant is receiving high traffic right now. Please wait a moment and retry.',
        });
        return;
      }
      res.status(502).json({
        error: 'Unable to reach VoltPay Assistant right now. Please try again.',
      });
    }
  });

  app.get('/api/ledger', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const records = await listUserRecharges(uid);
      res.json({ records });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to load ledger';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/ledger', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const email = req.user?.email || 'user@voltpay.app';
      const displayName =
        typeof req.user?.name === 'string' ? req.user.name : undefined;

      const body = req.body as Record<string, unknown>;
      const referenceCode = String(body.referenceCode ?? '').trim();
      const carrierId = String(body.carrierId ?? '').trim();
      const circle = String(body.circle ?? 'Delhi NCR').trim();
      const phoneNumber = String(body.phoneNumber ?? '').trim();
      const planTitle = String(body.planTitle ?? '').trim();
      const amount = Number(body.amount ?? 0);
      const discount = Number(body.discount ?? 0);
      const totalPaid = Number(body.totalPaid ?? 0);
      const promoApplied =
        typeof body.promoApplied === 'string' ? body.promoApplied.trim() : undefined;
      const paymentMethod = String(body.paymentMethod ?? 'wallet').trim();
      const status = String(body.status ?? 'Success').trim();

      if (!referenceCode || !carrierId || !phoneNumber || !planTitle) {
        res.status(400).json({ error: 'Missing required recharge fields.' });
        return;
      }

      const record = await recordRechargeInSql(uid, email, displayName, {
        referenceCode,
        carrierId,
        circle,
        phoneNumber,
        planTitle,
        amount,
        discount,
        totalPaid,
        promoApplied,
        paymentMethod,
        status,
      });

      res.status(201).json({ record });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to save ledger record';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/saved-stores', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const centers = await listSavedCenters(uid);
      res.json({ centers });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to fetch saved centers';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/saved-stores', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const email = req.user?.email || 'user@voltpay.app';
      const displayName =
        typeof req.user?.name === 'string' ? req.user.name : undefined;

      const body = req.body as Record<string, unknown>;
      const placeId = String(body.placeId ?? '').trim();
      const storeName = String(body.storeName ?? '').trim();
      const address = String(body.address ?? '').trim();
      const carrierTag = String(body.carrierTag ?? 'Telecom').trim();
      const lat = typeof body.lat === 'number' ? body.lat : null;
      const lng = typeof body.lng === 'number' ? body.lng : null;

      if (!placeId || !storeName || !address) {
        res.status(400).json({ error: 'Missing store details.' });
        return;
      }

      const center = await saveCenterInSql(uid, email, displayName, {
        placeId,
        storeName,
        address,
        carrierTag,
        lat,
        lng,
      });
      res.status(201).json({ center });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to save center';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/saved-stores/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const centerId = Number(req.params.id);
      if (!Number.isInteger(centerId) || centerId <= 0) {
        res.status(400).json({ error: 'Invalid store ID.' });
        return;
      }
      const removed = await removeSavedCenterInSql(uid, centerId);
      res.json({ removed });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to remove saved center';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`VoltPay server running on http://0.0.0.0:${port}`);
  });
}

void startServer();
