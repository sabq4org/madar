import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) console.log('.env already exists; left unchanged.');
else {
  writeFileSync(
    '.env',
    readFileSync('.env.example', 'utf8').replace(
      'replace-with-at-least-32-random-characters',
      randomBytes(32).toString('hex'),
    ),
    { mode: 0o600 },
  );
  console.log('Local .env created with a random admin key.');
}
