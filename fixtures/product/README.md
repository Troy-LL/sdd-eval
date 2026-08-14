# cratewake

Measurement fixture. A dock-bay lease clock. Not EditLayer. Not a KEEP subject.

Wake a bay, hold a lease, drop it. That is the product.

## Run

Image `cratewake/dock:1.4.9`. Binary `/usr/local/bin/cratewake`. Config `/etc/cratewake/dock.toml`. Logs `/var/log/cratewake/dock.log`.

Listen `7481/tcp`. Health `GET /v1/healthz`. Tooling floor `min-node 20.11.3`.

Lease a bay:

```
cratewake dock:lease
```

## Limits

`max-bays 36`. `lease-default 900s`.
