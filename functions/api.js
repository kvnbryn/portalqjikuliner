export async function onRequest(context) {
  const { request } = context;
  
  // URL VPS lu
  const vpsUrl = 'http://98.142.245.190/api';
  
  // Clone request karena body di POST cuma bisa dibaca sekali
  const newRequest = new Request(vpsUrl, request);
  
  try {
    const response = await fetch(newRequest);
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: 'Proxy failed', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
