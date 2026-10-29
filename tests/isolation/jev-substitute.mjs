import http from 'node:http';

http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200).end('ready');
  } else if (request.method === 'POST' && request.url === '/v1/systemone') {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ answers: { meaning: { type: 'score', score: 1, probabilities: [0, 1, 0], confidence: 1 } } }));
  } else {
    response.writeHead(503).end('Unexpected request');
  }
}).listen(3101, '127.0.0.1');
