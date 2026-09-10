/**
 * StudySir — InsForge Edge Function
 * Lightweight platform summary. Useful for status pages and health dashboards.
 */
module.exports = async function (req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      platform: 'StudySir',
      version: '1.0.0',
      features: {
        premiumPlans: true,
        affiliateProgram: true,
        realtimeMessaging: true,
        wallet: true,
        kyc: true,
      },
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
