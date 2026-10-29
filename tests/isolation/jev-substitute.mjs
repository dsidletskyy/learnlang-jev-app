import http from 'node:http';

http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200).end('ready');
  } else {
    response.writeHead(503).end('No scoring implementation');
  }
}).listen(3101, '127.0.0.1');
