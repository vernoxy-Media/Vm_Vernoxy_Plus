# BullMQ Migration Plan for Data Transfer Jobs

## Overview
Currently, the `data-transfer` module uses `DbJobQueue` (PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` polling every 2s).
This document outlines the zero-downtime architecture plan for swapping `DbJobQueue` with `BullMQ` (Redis-backed queue).

---

## 1. Why BullMQ
- **Zero DB Polling Overhead**: Removes the periodic database polling queries.
- **Horizontal Worker Scaling**: Allows multiple background worker pods without DB lock contention.
- **Built-in Stall Detection**: Redis-based lease locking (`lockDuration`) replaces manual `heartbeat_at` polling.
- **Delayed & Retry Scheduling**: Built-in exponential backoff and dead-letter queues (DLQ).

---

## 2. Architecture & Design
1. **Dependencies**:
   - `bullmq` (`^5.x`) and `ioredis` (`^5.x`).
2. **Redis Configuration**:
   - Connection via `REDIS_URL` with TLS (`rediss://`) and keep-alive.
3. **Queue Interface**:
   - Implements `JobQueuePort`:
     ```typescript
     export class BullMqJobQueue implements JobQueuePort {
       private queue: Queue;
       private worker: Worker;
       ...
     }
     ```
4. **Queue Lifecycle**:
   - Enqueue:
     ```typescript
     await this.queue.add('process-transfer-job', { jobId }, {
       jobId, // Unique id prevents duplicate jobs
       removeOnComplete: { age: 86400, count: 1000 },
       removeOnFail: { age: 604800 },
     });
     ```
   - Worker:
     ```typescript
     this.worker = new Worker('data-transfer', async (job) => {
       await this.jobProcessor.processJob(job.data.jobId);
     }, {
       connection: this.redisClient,
       concurrency: parseInt(process.env.JOBS_CONCURRENCY || '2', 10),
     });
     ```

---

## 3. Migration Steps
1. **Phase 1: Feature Flagging**:
   - Introduce `JOB_QUEUE_DRIVER=postgres|bullmq` in `.env`.
   - In `DataTransferModule`, register `BullMqJobQueue` when `JOB_QUEUE_DRIVER === 'bullmq'`.
2. **Phase 2: Dual Support & Drain**:
   - Stop enqueueing to `DbJobQueue`.
   - Let `DbJobQueue` drain remaining `queued` rows in PostgreSQL.
   - Route all new confirm requests to BullMQ.
3. **Phase 3: Cleanup**:
   - Retire the DB polling interval in `DbJobQueue`.
   - Keep `data_transfer_jobs` table as the immutable audit and reporting store of record.
