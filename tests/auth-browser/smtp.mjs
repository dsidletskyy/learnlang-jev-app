import net from 'node:net';
import http from 'node:http';
let message = '';
let messages = [];
let greetingDelay = 0;
let failDelivery = false;
net.createServer(socket => {
  socket.write('220 localhost\r\n');
  let buffer = '', data = false;
  socket.on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === '.') { data = false; messages.push(message); socket.write('250 queued\r\n'); }
        else message += line + '\n';
      } else if (line.startsWith('EHLO')) {
        if (greetingDelay) {
          const timer = setTimeout(() => socket.write('250 localhost\r\n'), greetingDelay);
          socket.once('close', () => clearTimeout(timer));
        } else socket.write('250 localhost\r\n');
      }
      else if (line.startsWith('MAIL FROM:') && failDelivery) socket.write('451 delivery unavailable\r\n');
      else if (line === 'DATA') { message = ''; data = true; socket.write('354 continue\r\n'); }
      else if (line === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
}).listen(3116, '127.0.0.1');
http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/fail') failDelivery = true;
  else if (request.method === 'POST' && request.url === '/resume') { failDelivery = false; greetingDelay = 0; }
  else if (request.method === 'POST' && request.url === '/delay') greetingDelay = 1000;
  else if (request.method === 'POST' && request.url === '/clear') messages = [];
  if (request.url === '/messages') response.end(JSON.stringify(messages));
  else response.end(message);
}).listen(3115, '127.0.0.1');
