import { createServer } from 'node:http';
import { handleRequest } from './appHandler.mjs';

const port = Number(process.env.MP_PORT || 3001);

createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido.' }));
  });
}).listen(port, () => {
  console.log(`Mercado Pago local API listening on http://localhost:${port}`);
});
