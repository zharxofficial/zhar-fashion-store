import { httpServerHandler } from 'cloudflare:node';
import api from './api/index.ts';

api.listen(3000);

export default httpServerHandler({ port: 3000 });
