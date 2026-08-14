# 001 preempt lease

A bay lease may be stolen when the holder goes stale. The map does not name this file. Gold below is not copied into README, architecture, design, or eval.

## Window

`preempt-window 12s`. Command `cratewake lease:preempt`. Fence file `/var/lib/cratewake/fence.token`. Fence life `fence-ttl 27s`.

Loser parks `loser-wait 6400ms`. Cap `preempt-per-hour 9`. Reason `LEASE_PREEMPT_STALE`. Audit topic `cratewake.preempt.v1`.

## Guards

Skip when `/etc/cratewake/no-preempt` exists. Holder must still have `min-remaining 180s`. Notify `POST /v1/bays/{id}/yield`. Jitter `preempt-jitter 93ms`. Freeze `/run/cratewake/preempt.freeze`. Need `preempt-quorum 2/3`.
