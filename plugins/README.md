# plugins/ — 8.6 生产机插件集快照（vendored）

本目录是 **192.168.8.6:3082 DSH 多用户网关**上实际加载的自研插件集合，
与 `harness/` 一同纳入本全栈仓库，使 `git clone` 一份即可获得**完整可交付的 DSH 插件层**。

> 各插件的**独立仓库保持不变**（独立仓负责开发、版本演进与 Release）。
> 本目录是第二份存档，只负责「全栈一站式完整性」，不反向改写独立仓。

产物刷新脚本：`79-RAG/tools/_pull_live_plugins86.py`（拉取）+ `_vendor_plugins86.py`（镜像 + 逐文件 sha256 校验）。

---

## 清单

| 目录 | 包名 | 版本 | 文件 | 体积 | 来源 |
| --- | --- | --- | --- | --- | --- |
| `dsh-raganything-sharekb/` | `dsh-raganything-kb` | `0.4.1` | 274 | 23.4 MB | 独立仓 `dsh-raganything-sharekb` @HEAD |
| `dsh-multi-user/` | `dsh-multi-user` | `1.2.0` | 34 | 1.3 MB | 独立仓 `dsh-multi-user` @HEAD |
| `dsh-workbench/` | `@local/dsh-workbench` | `1.1.1` | 9 | 0.1 MB | 独立仓 `dsh-workbench` @HEAD |
| `dsh-meetai/` | `dsh-meetai` | `0.3.10-composer.1` | 50 | 1.8 MB | 独立仓 `dsh-meetai` @HEAD |
| `dsh-policy-analysis/` | `@local/policy-analysis` | `1.5.6-qats.1` | 13 | 1.0 MB | 独立仓 `dsh-policy-analysis` @HEAD |
| `dsh-bot-shell/` | `dsh-bot-shell` | `0.1.3` | 7 | 0.1 MB | 独立仓 `dsh-bot-shell` @HEAD |
| `dsh-huiwen-ppt/` | `@local/huiwen-ppt` | `0.4.4` | 90 | 11.3 MB | **8.6 线上快照**（独立仓仅 0.3.5，落后） |
| `dsh-memory-evolve/` | `dsh-memory-evolve` | `0.1.0` | 148 | 11.0 MB | **8.6 线上快照**（尚无独立仓） |
| `dsh-workbench-bot/` | `@local/dsh-workbench-bot` | `0.1.0` | 12 | 0.1 MB | **8.6 线上快照**（尚无独立仓） |
| `dsh-raganything-kb/` | — | — | — | — | **原始插件线**快照，非 8.6 在用，保留不动 |

合计约 **49.8 MB / 9 个 8.6 在用插件**（不含 `dsh-raganything-kb/` 与 `harness/`）。

---

## 版本口径（重要）

取值规则：**有独立仓的取「独立仓 HEAD」；无独立仓的取「8.6 线上 live」**。三个例外与说明：

1. **`dsh-huiwen-ppt`** — 独立仓 `dsh-huiwen-ppt` 停在 `0.3.5`，而 8.6 线上已是 `0.4.4`。
   本目录按**线上 0.4.4** 存档（遵循「8.6 上 DSH 实际使用」这一口径），
   否则会丢失 0.3.5 之后的两轮迭代。若需改为与独立仓一致的 0.3.5，删除本目录后重新镜像即可。
2. **`dsh-memory-evolve` / `dsh-workbench-bot`** — 目前**没有独立仓**，唯一来源就是 8.6 线上。
   若日后为其建仓，应先以本目录内容为首发基线。
3. **文件字节** — 镜像过程使用独立仓 **git blob 原始字节**（`core.autocrlf=false` 检出），
   逐文件 sha256 与源比对一致后才落盘，避免 Windows 行尾转换污染二进制产物（`.tgz` 等）。

### 8.6 线上 vs 本次存档

| 插件 | 8.6 线上 live | 本次存档 | 说明 |
| --- | --- | --- | --- |
| `dsh-raganything-kb` | 0.4.0 | **0.4.1** | 独立仓更新（线上指符仍旧，见下） |
| `dsh-multi-user` | 1.1.1 | **1.2.0** | 同上 |
| `dsh-workbench` | 1.1.0 | **1.1.1** | 同上 |
| `dsh-meetai` | 0.3.9-composer.1 | **0.3.10-composer.1** | 同上 |
| `dsh-policy-analysis` | 1.5.6-qats.1 | 1.5.6-qats.1 | 一致 |
| `dsh-bot-shell` | 0.1.3 | 0.1.3 | 一致 |
| `dsh-huiwen-ppt` | 0.4.4 | 0.4.4 | 独立仓落后，按线上取 |
| `dsh-memory-evolve` | 0.1.0 | 0.1.0 | 无独立仓 |
| `dsh-workbench-bot` | 0.1.0 | 0.1.0 | 无独立仓 |

> ⚠️ 8.6 的 12 份 profile 中，部分 `file:` 依赖指符仍指向**旧 tgz**。
> 在切换指符之前，任何 `pnpm install` / 重装 / 回滚都可能把 `lib/*.js` 回退到本目录所示版本之前的代码。

---

## 两条知识库线（勿混）

| 目录 | 线 | `client.js` | 用途 |
| --- | --- | --- | --- |
| `dsh-raganything-sharekb/` | **sharedkb 线** | `lib/client.js`（约 536 KB） | **8.6 多用户网关在用的那条**（共享知识库 / 多用户） |
| `dsh-raganything-kb/` | 原始插件线 | `src/lib/client.js`（约 364 KB） | 早期单机版快照，**不是** 8.6 载荷 |

两条线已分叉，**不可整文件互相覆盖**，同步时需做函数级补丁移植。

---

## 安装要点

DSH 插件「装上但界面点不开」的头号原因：`pnpm add` 只写 `dependencies`，
**不会**自动进 `dsh.profile.bundles` —— 后者才是前端加载花名册。

```json
"dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "dsh-multi-user", "dsh-raganything-kb", "..."] } }
```

`node_modules/` 下的实际目录名必须与 `bundles` 里的字符串**逐字相同**，改完需重启 DSH 生效。

各插件目录内一般含：

- `package.json` / `cordis.patch.yml` — 注册源最小集
- `lib/`（或 `client.js` + `index.js` + `server/`）— 运行时代码
- `packaging/` — 安装器、manifest、verify 工具（部分插件有）
- `dist/` — 已构建的发行件（被根 `.gitignore` 忽略，本仓库内以 `git add -f` 强制纳入）
