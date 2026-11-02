import { Socket } from 'node:net';
import { createTransport } from 'nodemailer';

export async function sendPasswordRecoveryMail(port: number, recipient: string, url: string, deadlineMs = 2_000): Promise<void> {
  const socket = new Socket();
  const timer = setTimeout(() => socket.destroy(new Error('SMTP delivery deadline exceeded')), deadlineMs);
  const transport = createTransport({ host: '127.0.0.1', port, secure: false, socket, connectionTimeout: deadlineMs, greetingTimeout: deadlineMs, socketTimeout: deadlineMs });
  try {
    await transport.sendMail({ from: 'Language Learning <auth@localhost>', to: recipient, subject: 'Reset your password', text: `Open this link to reset your password:\n\n${url}\n\nThis link expires in one hour.` });
  } finally {
    clearTimeout(timer);
    transport.close();
    if (!socket.closed) {
      const closed = new Promise<void>(resolve => socket.once('close', resolve));
      socket.destroy();
      await closed;
    }
  }
}
