# 谱系：sharedkb 线的合并与归属

本仓库 `dsh-raganything-sharekb` 是**共享知识库线**（sharedkb line）的独立主线仓库。

它由 `imasonhk-spec/dsh-raganything-kb` 中的 4 条分支**合并收敛**而来 —— 那一组分支
（一个 feature + 三个 release）本质上是同一条迭代线上的切片，却散落在 4 个 ref 上，
其中 1 条还是旁支。合并不是把代码重写，而是**把同一产品的历史收敛成一条线**。

---

## 1. 合并前的形态（源仓库 `dsh-raganything-kb`）

```
9644bf1  main                         docs: 更新 README 到 0.3.10
   │
bc1ccb7  feature/shared-kb            feat: 共享知识库 —— 有效用户过滤 / 更多操作 / admin 回收箱
   │     ← 共享知识库特性的共同基座 (0.4.0-sharedkb.1)
   │
   ├──────────────────────────────┬───────────────────────────────────────────────┐
   │  (A) 主迭代线                 │  (B) 0.3.10 旁支（已并入）                      │
   │                              │                                               │
a81d6a4  fix(src): api_key 优先…   362afc5  chore(release): 0.3.10-sharedkb - archive
21554fb  release: 0.3.12-sharedkb         89f6a18  sync(src): 更新源码（旧代）
4eabe67  release: 归档 0.3.12 发布件
eed86a0  release/0.3.12-sharedkb
c6dcf70  fix(src): 共享知识库 @文件/文件夹限定范围问答修复
e9ab764  release/0.3.13-sharedkb   ← 线上最新
         ＝ feature/shared-kb       ← 同一个提交（重复 ref）
```

对应关系：

| 源分支 | 顶端提交 | 提交时间 | 在合并中的角色 |
| --- | --- | --- | --- |
| `feature/shared-kb` | `e9ab764` | 09-16 07:19 | 与 `release/0.3.13-sharedkb` 同提交；合并后成为主线顶端 |
| `release/0.3.13-sharedkb` | `e9ab764` | 09-16 07:19 | 同上（重复 ref） |
| `release/0.3.12-sharedkb` | `eed86a0` | 09-15 22:46 | 主线祖先，自动包含 |
| `release/0.3.10-sharedkb` | `89f6a18` | 09-15 01:45 | **旁支**：`src/` 为旧代，独有内容仅 0.3.10 发行归档 |

---

## 2. 旁支的唯一价值（逐行核对结论）

`git diff e9ab764 89f6a18` 的全量差异里，**只有 3 个文件是 e9ab764 缺失的**：

- `docs/RELEASE-0.3.10-sharedkb.md`
- `releases/0.3.10-sharedkb/CHECKSUMS.md`
- `releases/0.3.10-sharedkb/dsh-raganything-kb-0.3.10-sharedkb.tgz`

其余差异全部是**「旁支更旧」**而非「旁支独有」：

- `src/sidecar/server.py`：方向为 `89f6a18 → e9ab764` 净增 298 行 / 删 17 行；
  17 行被删除的代码逐行核过，全是被取代的旧写法（旧的 `api_key` 取值顺序、
  旧的 scope 匹配、旧的拼接式 scoped prompt），**没有任何 e9ab764 缺失的功能**。
- `src/lib/client.js`：两提交**完全一致**（`git diff --stat` 空输出）。
- `build/*.py`、`dist/*.tgz`、`releases/0.3.12-sharedkb/`、`releases/0.3.13-sharedkb/`、
  `docs/RELEASE-0.3.12|0.3.13-sharedkb.md`：仅存在于 e9ab764，旁支没有。
- `.gitignore` / `README.md` / `packaging/*`：旁支是更早的版本。

结论：旁支的代码线**已被主线完全取代**，只需把 0.3.10 的发行归档回填即可无损收敛。

---

## 3. 合并动作

以 `e9ab764` 为基线建立本仓库主线，并补一个收敛提交：

1. `git checkout -b <主线> e9ab764`
2. 从 `89f6a18` 回填 `docs/RELEASE-0.3.10-sharedkb.md` 与 `releases/0.3.10-sharedkb/`
3. 校验回填件：`md5 49884110d433460a5286c890e4a1ac3b`、
   `sha256 dbcdc6d1a14df44fb5affedf61223507bb045c4fc5d9358a2b31441c50d9bd09`、
   `5484980 bytes` —— 与 `CHECKSUMS.md` 及 8.6 线上 tarball 一致。
4. 新增本谱系文档；`README.md` 改为本仓库定位。

**旁支 ref 的保留**：新仓库另存一条只读归档分支 `archive/0.3.10-sharedkb-branch`
指向 `89f6a18`，使旁支的 2 个提交（`362afc5`、`89f6a18`）在这条线被删除后
仍可达、不会被 GitHub GC 掉。它不参与迭代，可随时删除。

---

## 4. 合并后的形态

```
bc1ccb7  feat: 共享知识库（共同基座）
   │
a81d6a4 … c6dcf70 … e9ab764          主线历史完整保留（0.3.12 → 0.3.13）
   │
<merge>  chore(sharerepo): 收敛 sharedkb 线      ← 本次收敛提交
         └ 回填 releases/0.3.10-sharedkb/ + docs/RELEASE-0.3.10-sharedkb.md
```

一条线，一套版本表，三个发行件归档（0.3.10 / 0.3.12 / 0.3.13）。

---

## 5. 定位边界

| | `dsh-raganything-kb` | `dsh-raganything-sharekb`（本仓库） |
| --- | --- | --- |
| 定位 | 插件原始线（单机 / 纯插件） | **共享知识库线**：多用户网关 + 共享 KB + 回收箱 |
| 版本区间 | 0.3.5 → 0.3.10 | 0.3.10-sharedkb → 0.3.13-sharedkb |
| 线上对应 | — | 192.168.8.6:3082（多用户网关） |
| 分支纪律 | 主分支 + 功能分支 | **单一主线，不再按版本开 release 分支** |

本仓库的收敛提交之后，`0.3.x-sharedkb` 的后续迭代直接落在主线上，
不再为每个版本额外开 `release/*` 分支 —— 这正是本次合并要消除的问题。
