import { handleRequest } from '../server/appHandler.mjs';

export default async function handler(request, response) {
  await handleRequest(request, response);
}
