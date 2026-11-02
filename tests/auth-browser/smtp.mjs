import net from 'node:net';
import http from 'node:http';
let message = '';
net.createServer(socket => {
  socket.write('220 localhost\r\n');
  let buffer = '', data = false;
  socket.on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === '.') { data = false; socket.write('250 queued\r\n'); }
        else message += line + '\n';
      } else if (line.startsWith('EHLO')) socket.write('250 localhost\r\n');
      else if (line === 'DATA') { message = ''; data = true; socket.write('354 continue\r\n'); }
      else if (line === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
}).listen(3116, '127.0.0.1');
http.createServer((_request, response) => response.end(message)).listen(3115, '127.0.0.1');
