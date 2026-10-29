import http from 'node:http';

http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200).end('ready');
  } else if (request.method === 'POST' && request.url === '/v1/systemone') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      const answer = JSON.parse(body).state.answer;
      if (answer === 'provider failure') return response.writeHead(503).end('provider detail');
      if (answer === 'credential failure') return response.writeHead(401).end('secret provider detail');
      if (answer === 'invalid score') return response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ answers: { meaning: { score: 3 } } }));
      if (answer === 'unparseable score') return response.writeHead(200, { 'content-type': 'application/json' }).end('{invalid');
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ answers: { meaning: { type: 'score', score: 1, probabilities: [0, 1, 0], confidence: 1 } } }));
    });
  } else {
    response.writeHead(503).end('Unexpected request');
  }
}).listen(3101, '127.0.0.1');
