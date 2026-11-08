import { httpServerHandler } from 'cloudflare:node';
import api from './api/index.ts';

export default httpServerHandler({
  port: 3000,
  hostname: '0.0.0.0',
});

api.listen(3000);
