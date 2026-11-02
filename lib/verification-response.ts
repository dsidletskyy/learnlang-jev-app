export function verificationSucceeded(response: Response, callback: string): boolean {
  return response.status === 302 && response.headers.get('location') === callback;
}
