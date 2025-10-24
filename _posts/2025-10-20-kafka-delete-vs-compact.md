---
layout: post
title: "Kafka Log Cleanup: Delete vs Compact"
description: "When to use cleanup.policy=delete vs compact, with trade-offs, configs, and recipes"
post-image: "https://raw.githubusercontent.com/E4M9i/blogv1/main/assets/images/KafkaRetention.jpg"
date: 2025-10-20
categories: [streaming, kafka]
tags:
- Kafka
- LogCompaction
- CleanupPolicy
- Retention
- EventSourcing
---

## Introduction
Kafka stores records on disk in append-only logs. Cleaning up those logs is critical to control storage cost and to shape the semantics that downstream consumers observe. The `cleanup.policy` determines how Kafka discards data over time:

- `delete`: remove old segments based on time/size retention
- `compact`: keep only the latest record per key, using tombstones for deletes

Choosing correctly affects cost, latency, correctness, and how you model data.

> TL;DR
> - delete: best for ephemeral, immutable events; controlled by retention time/size
> - compact: best for latest state per key; requires keys and tombstones
> - compact+delete: state with bounded history; keep delete.retention.ms >= max consumer lag

---

## Visual overview

![Kafka retention and cleanup policies](https://raw.githubusercontent.com/E4M9i/blogv1/main/assets/images/KafkaRetention.jpg)

## cleanup.policy=delete
Delete retention removes entire segments when they exceed time or size limits.

### How it works
- Segments roll by time or size: `segment.ms`, `segment.bytes`
- Retention is enforced per topic: `retention.ms`, `retention.bytes`
- When segments are older/larger than the configured limits, they are deleted

### Pros
- Predictable storage envelope (bytes/time)
- Simple mental model; works for immutable event streams
- Efficient for high-throughput append-only topics

### Cons
- No automatic dedup/upsert across keys
- Deletes historical data regardless of key semantics
- Consumers replaying may see very old data vanish mid-replay

### Typical use cases
- Ephemeral events, telemetry, metrics, logs
- Request/response, audit trails with bounded retention
- Streams where every event is valuable only for a window

---

## cleanup.policy=compact
Compaction maintains the latest value per key by scanning log segments and discarding older records for the same key. Deletions are represented by tombstones.

### How it works
- Records must have keys; compaction is key-based
- The cleaner rewrites segments, keeping the newest record per key
- Deletions are tombstones (records with null value) that cause later removal after `delete.retention.ms`
- Cleaner behavior settings:
  - `min.cleanable.dirty.ratio`: fraction of dirty data that triggers cleaning
  - `max.compaction.lag.ms`: latest time to wait before compacting records
  - `min.compaction.lag.ms`: minimum age before records become eligible for compaction
  - Broker-level `log.cleaner.threads`: number of background cleaner threads

### Pros
- Upsert semantics: consumers can hydrate latest state by reading the log
- Efficient for CDC, materialized views, KTable state
- Shrinks disk by removing superseded updates

### Cons
- Requires keyed messages; missing keys break expectations
- Cleaner adds background IO/CPU; compaction is eventual, not instantaneous
- Tombstones must be retained long enough for readers to see deletes (`delete.retention.ms`)

### Typical use cases
- Change Data Capture (CDC) topics (upserts and deletes)
- Entity state streams (user, product, account) used to hydrate caches/stores
- De-duplication feeds; KStreams/KTable state backing topics

---

## Combining compact+delete
Setting `cleanup.policy=compact,delete` keeps the latest value per key but also enforces a history window. This is useful when you want upsert semantics plus bounded historical replay.

Key interactions:
- `retention.ms` limits how long old segments remain even after compaction
- Tombstones are kept for at least `delete.retention.ms` so that readers can learn deletes
- Ensure `delete.retention.ms` >= max consumer lag so tombstones propagate to all consumers
- `min/max.compaction.lag.ms` can delay or accelerate compaction relative to write time

---

## Operational notes
- Ensure producers set keys consistently; no key -> no compaction benefits
- Size segments sensibly: tiny segments cause overhead; huge segments delay deletes
- Tune cleaner: `log.cleaner.threads`, IO throughput; monitor cleaner backlog
- Observe metrics: cleaner dirty ratio, bytes cleaned, disk usage per topic-partition
- Plan for consumer behavior: stateful consumers may rely on compaction to converge

---

## Decision guide

| Requirement | Prefer | Notes |
|---|---|---|
| Immutable events, time-bounded history | delete | Simple retention by time/size |
| Latest value per key (upsert) | compact | Consumers hydrate current state |
| Upsert with limited history | compact+delete | Current state plus 30–90 day window |
| Strict storage ceiling | delete | Predictable bytes; compaction is approximate |
| CDC/materialized view | compact | Preserve tombstones long enough |

---

## Conclusion
Start with the semantics you need:

- Choose `delete` for ephemeral, immutable streams with a clear retention window
- Choose `compact` for upsert/state streams where latest value per key matters
- Combine both to keep current state while bounding history


