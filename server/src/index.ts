import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import {
  createApiRouter,
  createGithubConfigFromEnv,
  installGithub,
} from './api';
import session from 'cookie-session';
import bodyparser from 'body-parser';

const port = process.env.PORT || 3000;

const PUBLIC_DIRECTORY = path.resolve(__dirname, '../../client/dist/');
const INDEX_HTML = path.join(PUBLIC_DIRECTORY, 'index.html');

const sessionKeys = process.env.SESSION_SECRETS!.split(',');

const app = express();
app.use(helmet());
app.use(bodyparser.json());
app.use(
  session({
    name: 'session',
    keys: sessionKeys,
    httpOnly: true,
  })
);

const { router: gitAuthRouter, isAuthorized } = installGithub(
  createGithubConfigFromEnv()
);

app.use(gitAuthRouter);
app.use('/api/v1', isAuthorized, createApiRouter());

app.use(express.static(PUBLIC_DIRECTORY));
app.get('*', (req, res, next) => {
  res.contentType('text/html');
  const stream = fs.createReadStream(INDEX_HTML);
  stream.on('error', next);
  stream.pipe(res);
});

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(500);
  res.send('Opps');
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
