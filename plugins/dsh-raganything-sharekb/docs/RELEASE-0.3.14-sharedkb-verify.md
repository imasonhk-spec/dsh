# 0.3.14-sharedkb 验证记录（合成 server.py 的双方正确性）

## 判据：`_shared_is_local()` 返回值决定「本地检索」还是「转发宿主」

源码定义（合成版 payload/server-0.3.14.py）：
```python
SHARED_BASE = (os.environ.get("RAG_SHARED_BASE") or "http://127.0.0.1:17321").rstrip("/")
PORT = int(os.environ.get("RAG_SIDECAR_PORT") or CONFIG.get("port", 17321))

def _shared_is_local() -> bool:
    if SHARED_BASE == "local": return True
    u = urlparse(SHARED_BASE)
    host = u.hostname or "127.0.0.1"
    return host in ("127.0.0.1","localhost","::1") and (u.port or 80) == PORT
```

## 实测环境（192.168.8.6）

| 角色 | RAG_SIDECAR_PORT | RAG_SHARED_BASE | 推得 SHARED_BASE | `_shared_is_local()` | 期望行为 |
|---|---|---|---|---|---|
| 宿主 sidecar (17321) | `17321` | 未设 | `http://127.0.0.1:17321` | **True** | 本地检索，不转发（无自环） |
| 用户实例 (3200N) | `32001` 等 | 未设 | `http://127.0.0.1:17321` | **False** | 命中共享文件夹的 scope 转发宿主 |

证据：
- `/proc/1904784/environ` → `RAG_SIDECAR_PORT=17321`，无 `RAG_SHARED_BASE`；
  `systemctl show raganything-sidecar` → `sidecar.env` 仅设 PORT/HOST/TOKEN 等，无 SHARED_BASE。
- 用户 `index.js` spawnSidecar() 只注入 `RAG_SIDECAR_PORT: config.sidecarPort`（L333），无 SHARED_BASE。

结论：同一份 server.py 在两侧都得到正确行为，满足「单文件同时服务宿主与用户实例」。
