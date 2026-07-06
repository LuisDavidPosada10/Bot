import { describe, expect, it } from 'vitest';
import { resolveMongoUri } from './env.js';

describe('resolveMongoUri', () => {
  it('returns undefined when no URI is configured', () => {
    expect(resolveMongoUri({})).toBeUndefined();
  });

  it('prefers MONGODB_URI over MONGO_URI', () => {
    expect(
      resolveMongoUri({
        MONGODB_URI: 'mongodb+srv://a@cluster/db',
        MONGO_URI: 'mongodb+srv://b@cluster/db',
      })
    ).toBe('mongodb+srv://a@cluster/db');
  });

  it('appends MONGO_DB_NAME when URI has no database path', () => {
    expect(
      resolveMongoUri({
        MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/?appName=WebBot',
        MONGO_DB_NAME: 'WebBot',
      })
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net/WebBot?appName=WebBot');
  });

  it('builds URI without database name when MONGO_DB_NAME is absent', () => {
    expect(
      resolveMongoUri({
        MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net',
      })
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net');
  });

  it('does not override an existing database in the URI', () => {
    expect(
      resolveMongoUri({
        MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/existing?retryWrites=true',
        MONGO_DB_NAME: 'WebBot',
      })
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net/existing?retryWrites=true');
  });
});
