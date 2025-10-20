import { Queue } from "bullmq";
import { injectable } from "inversify";
import { MessageJobData, QUEUE_CONFIG } from "../dto";
import Redis from "ioredis";

/**
 * Simple Message Queue Service - Producer Only
 * Chỉ push message vào Redis queue, external server sẽ consume
 */
@injectable()
export class MessageQueueService {
  private redisClient: Redis;
  private queue: Queue<MessageJobData>;
  private initialized: boolean = false;

  // Idempotency key namespace
  private readonly IDEMPOTENCY_PREFIX = "idempotency:message:";
  private readonly IDEMPOTENCY_TTL = 3600; // 1 hour in seconds

  constructor() {
    const connection = {
      port: QUEUE_CONFIG.REDIS_PORT,
      host: QUEUE_CONFIG.REDIS_HOST,
      ...(QUEUE_CONFIG.REDIS_PASSWORD && {
        password: QUEUE_CONFIG.REDIS_PASSWORD,
      }),
    };
    this.redisClient = new Redis(connection);

    // Khởi tạo queue - chỉ để push message
    this.queue = new Queue<MessageJobData>(QUEUE_CONFIG.QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: QUEUE_CONFIG.MAX_RETRY,
        backoff: {
          type: "exponential",
          delay: QUEUE_CONFIG.RETRY_DELAY,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 86400,
        },
      },
    });

    this.setupEventListeners();
  }

  /**
   * Khởi tạo service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log("🚀 MessageQueueService initialized (Producer Mode)");
    console.log(
      `📦 Redis: ${QUEUE_CONFIG.REDIS_HOST}:${QUEUE_CONFIG.REDIS_PORT}`
    );
    console.log(`📮 Queue: ${QUEUE_CONFIG.QUEUE_NAME}`);
    console.log(`🔄 Retry: ${QUEUE_CONFIG.MAX_RETRY} attempts`);
    this.initialized = true;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.queue.on("error", (error: Error) => {
      console.error("❌ Queue error:", error);
    });
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(
    data: Omit<MessageJobData, "timestamp">
  ): string {
    return data.messageId;
  }

  /**
   * Check if message was already processed (idempotency check)
   */
  async isMessageProcessed(idempotencyKey: string): Promise<boolean> {
    const key = `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  /**
   * Mark message as processed with result
   */
  async markMessageProcessed(
    idempotencyKey: string,
    result: { jobId: string; timestamp: number }
  ): Promise<void> {
    const key = `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    await this.redisClient.setex(
      key,
      this.IDEMPOTENCY_TTL,
      JSON.stringify(result)
    );
  }

  /**
   * Get cached result for duplicate request
   */
  async getCachedResult(idempotencyKey: string): Promise<any | null> {
    const key = `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    const cached = await this.redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Push message vào queue
   * External server consumer sẽ lấy và xử lý
   */
  async queueMessage(data: Omit<MessageJobData, "timestamp">): Promise<{
    jobId: string;
    isDuplicate: boolean;
  }> {
    const idempotencyKey = this.generateIdempotencyKey(data);

    // 🔒 IDEMPOTENCY CHECK: Check if already processed
    const alreadyProcessed = await this.isMessageProcessed(idempotencyKey);
    if (alreadyProcessed) {
      const cachedResult = await this.getCachedResult(idempotencyKey);
      return {
        jobId: cachedResult?.jobId || idempotencyKey,
        isDuplicate: true,
      };
    }

    const jobData: MessageJobData = { ...data, timestamp: new Date() };
    const job = await this.queue.add("process-message", jobData, {
      deduplication: {
        ttl: 5000,
        id: data.messageId,
      },
      jobId: data.messageId,
    });
    return {
      jobId: job.id!,
      isDuplicate: false,
    };
  }

  /**
   * Lấy metrics của queue
   */
  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Pause queue - ngừng nhận job mới
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    console.log("⏸️ Queue paused");
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    console.log("▶️ Queue resumed");
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThanMs: number = 3600000): Promise<void> {
    await this.queue.clean(olderThanMs, 1000, "completed");
    await this.queue.clean(olderThanMs * 24, 5000, "failed");
    console.log("🧹 Old jobs cleaned");
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down MessageQueueService...");
    await this.queue.close();
    await this.redisClient.quit();
    this.initialized = false;
    console.log("✅ MessageQueueService shutdown complete");
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      queueName: QUEUE_CONFIG.QUEUE_NAME,
      mode: "producer-only",
      redis: `${QUEUE_CONFIG.REDIS_HOST}:${QUEUE_CONFIG.REDIS_PORT}`,
      maxRetry: QUEUE_CONFIG.MAX_RETRY
    };
  }

  /**
   * Get job by ID (để tracking)
   */
  async getJob(jobId: string) {
    return await this.queue.getJob(jobId);
  }
}
