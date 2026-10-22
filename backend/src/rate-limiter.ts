import { DurableObject } from "cloudflare:workers";

/**
 * Daily chat-message counter for one visitor (one Durable Object per IP).
 *
 * Stops a single bot or visitor from using up the free Workers AI quota.
 * The count resets at midnight UTC; an alarm then deletes the stored data,
 * so nothing is kept for visitors who don't come back.
 */
export class RateLimiter extends DurableObject<Env> {
  /** Counts one message. Returns false if the daily limit is already reached. */
  async consume(dailyLimit: number): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    const storedDay = await this.ctx.storage.get<string>("day");
    let count = (await this.ctx.storage.get<number>("count")) ?? 0;

    if (storedDay !== today) {
      count = 0;
      await this.ctx.storage.put("day", today);

      // Clean up after midnight UTC.
      const midnight = new Date(`${today}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000;
      await this.ctx.storage.setAlarm(midnight);
    }

    if (count >= dailyLimit) {
      return false;
    }

    await this.ctx.storage.put("count", count + 1);
    return true;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
