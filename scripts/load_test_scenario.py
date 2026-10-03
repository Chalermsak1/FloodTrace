#!/usr/bin/env python3
"""
FloodTrace Controlled Load & Capacity Benchmarking Tool
Master Prompt Section 24: Tests API concurrency, connection pool resilience,
and rate limiter behavior under controlled load without fabricating production traffic.
"""

import sys
import time
import argparse
import asyncio
import statistics
from datetime import datetime, timezone
import httpx

async def worker(
    client: httpx.AsyncClient,
    queue: asyncio.Queue,
    results: list,
    target_endpoint: str
):
    while not queue.empty():
        req_id = await queue.get()
        start = time.perf_counter()
        try:
            resp = await client.get(target_endpoint)
            elapsed = (time.perf_counter() - start) * 1000.0  # ms
            results.append({
                "id": req_id,
                "status": resp.status_code,
                "latency_ms": elapsed,
                "success": resp.status_code == 200
            })
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000.0
            results.append({
                "id": req_id,
                "status": 0,
                "latency_ms": elapsed,
                "error": str(e),
                "success": False
            })
        finally:
            queue.task_done()

async def run_load_benchmark(
    base_url: str,
    endpoint: str,
    concurrency: int,
    total_requests: int
):
    target = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
    print("=" * 70)
    print(f"FLOODTRACE LOAD & CAPACITY BENCHMARK")
    print(f"Target:      {target}")
    print(f"Concurrency: {concurrency} parallel workers")
    print(f"Requests:    {total_requests} total requests")
    print(f"Started At:  {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    queue = asyncio.Queue()
    for i in range(total_requests):
        queue.put_nowait(i)

    results = []
    limits = httpx.Limits(max_connections=concurrency * 2, max_keepalive_connections=concurrency)
    timeout = httpx.Timeout(10.0, connect=5.0)

    t0 = time.perf_counter()
    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        workers = [
            asyncio.create_task(worker(client, queue, results, target))
            for _ in range(concurrency)
        ]
        await queue.join()
        for w in workers:
            w.cancel()

    total_time = time.perf_counter() - t0

    # Statistical Aggregation
    latencies = [r["latency_ms"] for r in results]
    status_counts = {}
    for r in results:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1

    success_count = sum(1 for r in results if r["success"])
    rps = total_requests / total_time if total_time > 0 else 0

    print("\n--- Benchmark Results ---")
    print(f"Total Duration:     {total_time:.2f} seconds")
    print(f"Throughput:         {rps:.1f} requests/sec")
    print(f"Successful (200):   {success_count}/{total_requests} ({(success_count/total_requests)*100:.1f}%)")
    print(f"Status Breakdown:   {status_counts}")

    if latencies:
        print("\n--- Latency Distribution (ms) ---")
        print(f"Min:                {min(latencies):.1f} ms")
        print(f"Avg:                {statistics.mean(latencies):.1f} ms")
        print(f"Median (p50):       {statistics.median(latencies):.1f} ms")
        if len(latencies) >= 20:
            print(f"p95:                {statistics.quantiles(latencies, n=20)[18]:.1f} ms")
            print(f"p99:                {statistics.quantiles(latencies, n=100)[98]:.1f} ms")
        print(f"Max:                {max(latencies):.1f} ms")

    print("=" * 70)
    return {
        "throughput_rps": rps,
        "success_rate": success_count / total_requests,
        "status_counts": status_counts
    }

def main():
    parser = argparse.ArgumentParser(description="FloodTrace Capacity & Load Benchmarking")
    parser.add_argument("--url", default="http://127.0.0.1:8001", help="Base URL of FloodTrace API")
    parser.add_argument("--endpoint", default="/api/public/overview", help="Endpoint to test")
    parser.add_argument("--concurrency", type=int, default=10, help="Number of concurrent workers")
    parser.add_argument("--requests", type=int, default=50, help="Total requests to dispatch")

    args = parser.parse_args()
    asyncio.run(run_load_benchmark(args.url, args.endpoint, args.concurrency, args.requests))

if __name__ == "__main__":
    main()
