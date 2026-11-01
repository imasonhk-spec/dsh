#!/bin/bash
# dsh-web-start.sh
#
# Launch `dsh web` with --trusted-host auto-populated from ALL current local
# IPv4 addresses (ports 3081/3082) plus loopback. A Wi-Fi IP change is picked
# up automatically on (re)start — no need to edit the unit's trusted-host list.
#
# systemd still supplies User=lgsj, WorkingDirectory and the Environment= block.
set -euo pipefail

PORTS=(3081 3082)
# dsh.ilica.cn：用户经公网域名访问本部署。不带端口 = 匹配任意端口；
# 缺了它，管理员（homeMode=host，用本实例）在 https://dsh.ilica.cn 下
# 会被判为非 loopback，设置页报「settings are unavailable in this browser」。
HOSTS=(127.0.0.1:3080 127.0.0.1:3081 127.0.0.1:3082 dsh.ilica.cn)

for ip in $(hostname -I 2>/dev/null); do
    case "$ip" in
        *:*) continue ;;   # skip IPv6
    esac
    for p in "${PORTS[@]}"; do
        HOSTS+=("$ip:$p")
    done
done

ARGS=()
for h in "${HOSTS[@]}"; do
    ARGS+=(--trusted-host "$h")
done

cd /home/lgsj/deepseek-harness.dsh-v0.1.7-alpha.2
exec /usr/local/bin/pnpm dsh web --host 127.0.0.1 --port 3080 "${ARGS[@]}"
