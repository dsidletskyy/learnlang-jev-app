import { Socket } from 'node:net';
import { createTransport } from 'nodemailer';

export async function sendVerificationMail(port: number, email: string, url: string, deadline = 2000): Promise<void> {
  const socket = new Socket();
  const timer = setTimeout(() => socket.destroy(new Error('SMTP delivery deadline exceeded')), deadline);
  const transport = createTransport({ host: '127.0.0.1', port, secure: false, socket, connectionTimeout: deadline, greetingTimeout: deadline, socketTimeout: deadline });
  try {
    await transport.sendMail({ from: 'Language Learning <auth@localhost>', to: email, subject: 'Verify your account', text: `Open this link to verify your account:\n\n${url}\n\nThis link expires in 24 hours.` });
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
