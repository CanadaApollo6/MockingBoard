import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from monorepo root regardless of cwd
config({ path: resolve(import.meta.dirname, '../../../../.env') });
