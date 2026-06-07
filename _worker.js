export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    // ── CONFIG ──
    if (url.pathname === '/config.js') {
      const js = `window.NATFLIX_CONFIG = {
  GROQ_API_KEY: '${env.GROQ_API_KEY || ''}',
  RAZORPAY_KEY: '${env.RAZORPAY_KEY || ''}',
  CLOUD_NAME: '${env.CLOUD_NAME || ''}',
  UPLOAD_PRESET: '${env.UPLOAD_PRESET || ''}'
};`;
      return new Response(js, { headers: { 'Content-Type': 'application/javascript' } });
    }

    // ── CLAIM SESSION (called immediately on payment success, before uploads) ──
    // POST /api/claim  { paymentId, formData }  → { sessionId: "xK9mP2" }
    // Saves a stub so the user has a recoverable session even if uploads fail later.
    if (url.pathname === '/api/claim' && request.method === 'POST') {
      try {
        const { paymentId, formData } = await request.json();
        if (!paymentId) return new Response(JSON.stringify({ error: 'Missing paymentId' }), { status: 400, headers: cors });

        // Reuse existing session for the same payment (idempotency)
        const existingId = await env.NATFLIX_KV.get('pay:' + paymentId);
        if (existingId) {
          return new Response(JSON.stringify({ sessionId: existingId }), { headers: cors });
        }

        const sessionId = crypto.randomUUID().slice(0, 8);
        const stub = { ...formData, paid: true, paymentId, status: 'pending', createdAt: Date.now() };

        // Store stub under the sessionId
        await env.NATFLIX_KV.put(sessionId, JSON.stringify(stub), {
          expirationTtl: 60 * 60 * 24 * 90
        });
        // Also index by paymentId for idempotency
        await env.NATFLIX_KV.put('pay:' + paymentId, sessionId, {
          expirationTtl: 60 * 60 * 24 * 90
        });

        return new Response(JSON.stringify({ sessionId }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Claim failed', detail: e.message }), { status: 500, headers: cors });
      }
    }

    // ── FINALISE SESSION (called after uploads + AI copy are ready) ──
    // POST /api/finalise  { sessionId, ...fullPayload }  → { id: "xK9mP2" }
    if (url.pathname === '/api/finalise' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const { sessionId } = payload;
        if (!sessionId) return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400, headers: cors });

        const existing = await env.NATFLIX_KV.get(sessionId);
        if (!existing) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: cors });

        const merged = { ...JSON.parse(existing), ...payload, status: 'complete' };
        await env.NATFLIX_KV.put(sessionId, JSON.stringify(merged), {
          expirationTtl: 60 * 60 * 24 * 90
        });

        return new Response(JSON.stringify({ id: sessionId }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Finalise failed', detail: e.message }), { status: 500, headers: cors });
      }
    }

    // ── LEGACY SAVE (kept for compatibility) ──
    if (url.pathname === '/api/save' && request.method === 'POST') {
      try {
        const data = await request.json();
        const id = crypto.randomUUID().slice(0, 8);
        await env.NATFLIX_KV.put(id, JSON.stringify(data), {
          expirationTtl: 60 * 60 * 24 * 90
        });
        return new Response(JSON.stringify({ id }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Save failed' }), { status: 500, headers: cors });
      }
    }

    // ── FETCH PAGE DATA ──
    if (url.pathname === '/api/page' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return new Response('Missing id', { status: 400 });
      const val = await env.NATFLIX_KV.get(id);
      if (!val) return new Response('Not found', { status: 404 });
      return new Response(val, { headers: cors });
    }

    // ── STATIC ASSETS ──
    return env.ASSETS.fetch(request);
  }
};