import { Env } from './types';

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expiry: number; // epoch ms
}

export class TokenStore {
  constructor(private env: Env) {}

  private key(userId: string) {
    return `token:${userId}`;
  }

  async get(userId: string): Promise<StoredToken | null> {
    const raw = await this.env.TOKENS.get(this.key(userId));
    return raw ? JSON.parse(raw) as StoredToken : null;
  }

  async put(userId: string, token: StoredToken): Promise<void> {
    await this.env.TOKENS.put(this.key(userId), JSON.stringify(token), {
      expirationTtl: 60 * 60 * 24 * 30 // 30 days; refresh should extend
    });
  }

  async delete(userId: string): Promise<void> {
    await this.env.TOKENS.delete(this.key(userId));
  }
}
