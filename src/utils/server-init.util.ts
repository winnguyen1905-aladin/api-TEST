import * as os from "os";
import { WorkerManager } from "@/modules/worker";
import { InitializationResult, WorkerManagerOptions } from "@/common/index";
import { config } from "@/shared/index";

export class ServerInitUtil {
  constructor(private workerManager?: WorkerManager) { }

  async initializeMediaSoup(): Promise<InitializationResult & { workerManager?: WorkerManager }> {
    try {
      
      this.workerManager = new WorkerManager({
        workerCount: Math.min(4, os.cpus().length), // Limit to 4 workers max for better resource management
        sampleIntervalMs: 2000, // Sample metrics every 2 seconds
        overloadScoreThreshold: 1.3, // Threshold for considering worker overloaded
        weightCpu: 1.0, // CPU weight in load calculation
        weightRouters: 0.03, // Router count weight
        weightTransports: 0.01, // Transport count weight
        rtcMinPort: config.workerSettings.rtcMinPort,
        rtcMaxPort: config.workerSettings.rtcMaxPort,
        logLevel: config.workerSettings.logLevel,
        logTags: config.workerSettings.logTags as any[],
        onWorkerDied: 'respawn', // Automatically respawn died workers
      });

      // Start the WorkerManager (creates workers and begins monitoring)
      await this.workerManager.start();

      const workers = this.workerManager.list().map((record: any) => record.worker);
      console.log(` >>> Successfully created ${workers.length} MediaSoup workers`);

      return {
        success: true,
        workers,
        workerManager: this.workerManager,
      };
    } catch (error) {
      console.error("Failed to initialize MediaSoup workers:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Graceful shutdown method
  async shutdown(): Promise<void> {
    try {
      console.log(" >>> Shutting down MediaSoup workers...");
      if (this.workerManager) {
        await this.workerManager.stop();
        console.log(" >>> MediaSoup workers shutdown complete");
      }
    } catch (error) {
      console.error("Error during worker shutdown:", error);
    }
  }
}

export const serverInitUtil = new ServerInitUtil();
