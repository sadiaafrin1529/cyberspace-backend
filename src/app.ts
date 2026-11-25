import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import config from './app/config';
import { externalApiRouter } from './app/modules/externalApi/externalApi.route';

const app = express();

// Behind a reverse proxy set TRUST_PROXY (hop count, e.g. 1) so req.ip is the real client IP.
if (config.trust_proxy) {
  const v = config.trust_proxy;
  app.set('trust proxy', /^d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
}

app.use(morgan('dev'));

// Developer API (API-key auth). Mounted BEFORE the global 50mb body parsers and CORS:
// it applies its own 256 KB limit and deliberately sends no CORS headers.
app.use('/api/v1', externalApiRouter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Authorization, Origin, X-Requested-With, Accept',
    credentials: true,
  }),
);

// application routes
app.use('/api', router);

//global error handler
app.use(globalErrorHandler);

// handle not found routes
app.use(notFound);

export default app;
