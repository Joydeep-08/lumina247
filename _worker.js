export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CONFIG ──
    if (url.pathname === '/config.js') {
      const js = `window.NATFLIX_CONFIG = {
  GROQ_API_KEY: '${env.GROQ_API_KEY}',
  RAZORPAY_KEY: '${env.RAZORPAY_KEY}',
  CLOUD_NAME: '${env.CLOUD_NAME}',
  UPLOAD_PRESET: '${env.UPLOAD_PRESET}'
};`;
      return new Response(js, { headers: { 'Content-Type': 'application/javascript' } });
    }

    // ── SAVE PAGE DATA ──
    // POST /api/save  { ...payload }  → { id: "xK9mP2" }
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const data = await request.json();
      const id = crypto.randomUUID().slice(0, 8);
      await env.NATFLIX_KV.put(id, JSON.stringify(data), {
        expirationTtl: 60 * 60 * 24 * 90  // 90 days
      });
      return new Response(JSON.stringify({ id }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ── FETCH PAGE DATA ──
    // GET /api/page?id=xK9mP2  → full JSON payload
    if (url.pathname === '/api/page' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return new Response('Missing id', { status: 400 });
      const val = await env.NATFLIX_KV.get(id);
      if (!val) return new Response('Not found', { status: 404 });
      return new Response(val, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ── STATIC ASSETS ──
    return env.ASSETS.fetch(request);
  }
}