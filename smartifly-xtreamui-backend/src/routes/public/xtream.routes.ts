import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

function setCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

router.options('/login', (_req: Request, res: Response) => {
  setCors(res);
  return res.sendStatus(204);
});

router.post('/login', async (req: Request, res: Response) => {
  setCors(res);

  try {
    const portalUrl = typeof req.body?.portalUrl === 'string' ? req.body.portalUrl.trim() : '';
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!portalUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'portalUrl, username, and password are required'
      });
    }

    const baseUrl = portalUrl.replace(/\/+$/, '');
    const authUrl = new URL('/player_api.php', /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`);
    authUrl.searchParams.set('username', username);
    authUrl.searchParams.set('password', password);

    const response = await fetch(authUrl.toString(), { method: 'GET' });
    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Xtream portal responded with HTTP ${response.status}`
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        message: 'Xtream portal returned invalid JSON'
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xtream login proxy failed';
    return res.status(500).json({
      success: false,
      message
    });
  }
});

export default router;
