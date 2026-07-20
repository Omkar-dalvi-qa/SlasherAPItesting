import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf-8')
);

export default async function globalSetup(): Promise<void> {
  const token = cfg.authToken as string | undefined;

  if (!token) {
    throw new Error('[global-setup] authToken is missing in config.json');
  }

  const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify({
    authToken:    token,
    refreshToken: cfg.refreshToken ?? '',
  }));

  process.env.AUTH_TOKEN = token;
  console.log(`[global-setup] token written (length=${token.length}) → ${authFile}`);
}
