# architecture

Process layout for cratewake. Schema lives at `src/schema/lease.sql`. Leases sit in `table dock_lease`. Do not recap columns here.

## Replica and clock

`dock-replicas 3`. Heartbeat interval `heartbeat 2500ms`. Wall clock is `clock tai64n`. Sharding is `shard-count 17`.

Checksum on spilled frames is `checksum BLAKE2s`. Not SHA-256.

## Sockets and spill

gRPC bind `grpc 9104`. Control socket `/run/cratewake/ctl.sock`. WAL `/var/lib/cratewake/wal`. Spill `/var/tmp/cratewake/spill`.

In-flight cap `inflight 128`.
