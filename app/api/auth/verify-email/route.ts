import { getDatabase } from '../../../../db';
import { createLocalAuth } from '../../../../lib/auth';

export async function GET(request: Request) {
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  const destination = new URL('/verification', origin);
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token || token.length > 8192) throw new Error('Invalid token');
    const endpoint = new URL('/api/auth/verify-email', origin);
    endpoint.searchParams.set('token', token);
    const response = await createLocalAuth(await getDatabase()).handler(new Request(endpoint));
    destination.searchParams.set('status', response.ok ? 'success' : 'invalid');
  } catch {
    destination.searchParams.set('status', 'invalid');
  }
  return new Response(null, { status: 303, headers: { location: destination.toString(), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
