export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/config.js') {
      const js = `window.NATFLIX_CONFIG = {
  GROQ_API_KEY: '${env.GROQ_API_KEY}',
  RAZORPAY_KEY: '${env.RAZORPAY_KEY}',
  CLOUD_NAME: '${env.CLOUD_NAME}',
  UPLOAD_PRESET: '${env.UPLOAD_PRESET}'
};`;
      return new Response(js, {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    return env.ASSETS.fetch(request);
  }
}