export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. Tangani Proxy API ke VPS
    if (url.pathname.startsWith('/api')) {
      const vpsUrl = 'http://98.142.245.190.nip.io' + url.pathname;
      const newRequest = new Request(vpsUrl, request);
      return await fetch(newRequest);
    }
    
    // 2. Ambil file statis dari Cloudflare Pages (HTML/CSS/JS)
    const response = await env.ASSETS.fetch(request);
    
    // 3. Fallback SPA: Kalau file nggak ketemu (misal user buka /dashboard langsung)
    if (response.status === 404) {
      const indexRequest = new Request(new URL('/', request.url), request);
      return await env.ASSETS.fetch(indexRequest);
    }
    
    return response;
  }
};
