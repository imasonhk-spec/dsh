# build/ — 打包与移植工具

这些脚本把「正在运行的插件」变成「可分发的包」，以及把补丁安全地送到**已经分叉**的部署上。

## 打一个可移植包

| 脚本 | 作用 |
| --- | --- |
| `build_pkg039.py` | **当前版本的打包器**。取上一版的包装骨架（安装器/验证器/卸载器/extras/tools），刷新载荷为 live 插件目录的快照，套用移植补丁，重建 `manifest.json`，打 `plugin/*.tgz` 与便携包，并跑一遍静态校验 + 沙箱安装演练 |
| `build_pkg037.py` / `build_pkg036.py` | 上一版打包器，保留作对照（`build_pkg036` 按 stdout 而非退出码判断 `bash -n`，因此漏掉了 `uninstall.sh` 的 CRLF 缺陷） |
| `run_build039.py` | 把构建器与补丁器投到目标主机执行，并把产物拉回本地 `dist/` |

`build_pkg039.py` 的 9 个步骤：骨架拷贝 → 刷新载荷 → 移植崩溃防护 → 状态栏计数修复 →
索引弹窗计数修复 → 载荷标记断言 →
版本号 → README → 打 tgz → 重建 manifest → 打便携包 → 静态校验 → **沙箱安装演练**。

> **沙箱演练原理**：`install.sh` 用 `RUN_HOME="${HOME}"`（只有 root 才走 `getent`），
> 所以把 `HOME` 指向 `/tmp/...` 就能零风险跑完整安装 + `verify.sh`，完全不碰生产。
> 演练里额外传 `--port 17999`，避免 verify 打到生产 sidecar。

## 打一个发行 tgz（同线增量回灌）

| 脚本 | 作用 |
| --- | --- |
| `build_rel0312.py` | 以**上一版发行 tgz** 为基线，把线上已验证的补丁回灌成新版本包（0.3.11-sharedkb → 0.3.12-sharedkb）：替换 `server.py`、bump `package.json`、清掉包内误带的 `.bak`、补 `RELEASE-NOTES.md`，并**断言其余成员相对基线逐字节不变**。确定性打包（固定 mtime/uid/gid、条目排序、gzip `mtime=0`），同输入同 md5 |
| `build_rel0313.py` | 同款增量回灌（0.3.12-sharedkb → 0.3.13-sharedkb），回灌 **@ 共享作用域修复**（前缀对称 + host-aware 转发）。除 `server.py`/`package.json`/`RELEASE-NOTES.md` 外逐字节不变；内置 4 处修复标记断言（artcontent 保留 + 前缀 + 转发 + host 守卫）+ 确定性复核 |

```bash
python build/build_rel0312.py \
    --base   dsh-raganything-kb-0.3.11-sharedkb.tgz \
    --server-py /path/to/patched/sidecar/server.py \
    --out    dist/dsh-raganything-kb-0.3.12-sharedkb.tgz

python build/build_rel0313.py \
    --base      dist/dsh-raganything-kb-0.3.12-sharedkb.tgz \
    --server-py build/rel0313_server.py \
    --out       dist/dsh-raganything-kb-0.3.13-sharedkb.tgz
```

这样打出来的包与线上**热修后的活副本**字节一致，避免"热修在跑、重装回退"的两套状态。
`build/rel0313_server.py` 是 0.3.13 发行线的 `server.py` 输入（线上热修副本 + host 守卫），
入库以便**离线复现**该发行件。

## 从发行 tgz 组装可移植包（`.tgz` → `-portable.tar.gz`）

共享知识库线（`0.3.x-sharedkb`）原先只发 `.tgz`（给 pnpm profile 依赖用），
没有对应的整机可移植包。本组装器把两者打通：以发行 tgz 为载荷来源，
配上 `packaging/` 骨架与供体 manifest，产出 `-portable.tar.gz`。

| 脚本 | 作用 |
| --- | --- |
| `build_portable_0312.py` | 由发行 tgz + `packaging/` 骨架 + 供体 manifest 组装可移植包：抬 `PKG_VERSION`、断言 `payload/sidecar/viewer` 在包内、对 `install.sh`/`uninstall.sh`/`verify.sh` 按**退出码**做 `bash -n` 自检、最后自查 `manifest.json` 文件清单 == 归档实际条目 |
| `build_portable_0313.py` | 同款（0.3.13-sharedkb），供体取上一版 `-portable.tar.gz`，manifest 追加 `changes_0.3.13` |

```bash
python build/build_portable_0313.py \
    --repo          . \
    --release-tgz   dist/dsh-raganything-kb-0.3.13-sharedkb.tgz \
    --base-portable dist/dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz \
    --out           dist/dsh-raganything-kb-0.3.13-sharedkb-portable.tar.gz \
    --stage         .tmp_portable_0313
```

确定性打包（同 `build_rel0312.py`），同输入同 md5；0.3.13 产物 205 条目 / 10 800 099 B。

> **两个易踩的点**（构建器已内置断言）：
> ① `bash -n` 必须按**退出码**判，早期构建器按 stdout 判，漏掉了 `uninstall.sh` 的 CRLF 缺陷；
> ② `manifest.json` 不会把自己列进文件清单，自查时要 `arc_files - {"manifest.json"}`。

## 把新包切到多用户宿主的所有 profile

| 脚本 | 作用 |
| --- | --- |
| `inventory_profiles_0312.py` | **只读**盘点宿主 + 11 个用户 profile 的插件安装：依赖指向哪个 tgz、`node_modules/dsh-raganything-kb` 是真目录还是软链、已装副本与新载荷的逐文件差异。顺带把新包解到 `/tmp/rel0312` 供比对。先跑它再决定要不要动 |
| `deploy_profiles_0312.py` | 把 12 份依赖从旧 tgz 切到新 tgz。**逐份改三处**：profile `package.json` 的依赖、已安装包的 `package.json`、补 `RELEASE-NOTES.md`；每份先留 `.bak-*`。默认 dry-run，`--apply` 才落盘，可重复执行（二次运行报 12/12 already） |
| `deploy_profiles_0313.py` | 同上，切到 0.3.13（0.3.12 → 0.3.13）。前置：把 `0.3.13-sharedkb.tgz` 解到 `/tmp/rel0313`。切换后**必须重启**：宿主 `systemctl restart raganything-sidecar`、用户实例 `POST :3200N/models/restart` |
| `drill_0312_no_collateral_kill.sh` | 在**跑着生产 sidecar 的宿主**上做沙盒安装演练，并对比演练前后 `pgrep -af server.py` 的列表：必须零差异。退出码 0 = 无连带误杀。0.3.12 之前安装器的无锚点 `pkill` 在这里会现形 |
| `respawn_user_sidecar.sh` | 某个**用户实例** sidecar 被杀且没自愈时，按插件 `spawnSidecar()` 同款环境把它拉回来。宿主 sidecar 有 `Restart=always` 自愈，**用户实例是懒加载的、插件只"接管"已在跑的进程，杀了没人管** → 网关 502 `rag sidecar on port <p> unreachable`。用法 `USER=admin PORT=32001 bash respawn_user_sidecar.sh`（slot → 端口 = 32000+slot） |

三个脚本都在**目标宿主**上跑（8.6 上以 `lgsj` 身份，无需 sudo）：

```bash
python3 inventory_profiles_0312.py > /tmp/inv.json
python3 deploy_profiles_0312.py            # dry-run，看输出
python3 deploy_profiles_0312.py --apply    # 落盘
PKG=/tmp/dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz \
    bash drill_0312_no_collateral_kill.sh
```

**刻意不跑 `pnpm install`**：8.6 无公网出口，且 `pnpm install` 会清掉现场的 `.bak-*` 备份。
`pnpm-lock.yaml` 本来就早已失配（还指 0.3.8），而 unit 是 `ExecStart=pnpm dsh web`、
不触发安装，所以直接改依赖不引入新的启动风险。

## 把补丁送到已分叉的部署

| 脚本 | 作用 |
| --- | --- |
| `apply_norm_fix.py` | 把面板崩溃防护 `normaliseModelsSnap` 函数级移植到缺少它的分支（逐字节同一段代码，锚点唯一性断言） |
| `apply_count_rail_fix.py` | 把「状态栏计数口径 + 对话产物栏 md 过滤」补丁打到带产物栏的分支（锚点计数断言 + 幂等） |
| `apply_extdist_fix.py` | 把「索引弹窗计数口径」补丁打到带产物栏的分支：`extDist` 由遍历 `docs` 改为 `kbDocs`，依赖数组 `[docs]`→`[kbDocs]`（锚点计数断言 + 幂等） |
| `kb_artifact_rail_patch.py` | 「对话产物」栏 + 产物文件夹下线的完整补丁集（前端布局、产物栏组件、sidecar 检索排除） |
| `deploy_artrail.py` | 把上面这份补丁分别部署到三套部署（含各账户副本），带时间戳备份并重启 DSH |

`deploy_artrail.py` 连非 Windows 主机时**不内置任何口令**，需要先导出环境变量：

```bash
export DSH_SSH_PW_100='<100.100.6.55 的 sudo 口令>'
export DSH_SSH_PW_86='<192.168.8.6 的 sudo 口令>'
python deploy_artrail.py --host all
```

未导出对应变量时脚本会立刻以 `[FAIL] ... is not set` 退出，不会带着空口令去连。

**打补丁的硬规则**：先 `diff` 摸清真实差异，再按函数级锚点做替换，每处断言 `count == 1`。
不要整文件覆盖 —— 各分支都有对方没有的特性，覆盖会静默把它们冲掉。

## 外部前置

这些脚本假定你手上已经有一台可 SSH 的 DSH 主机（`ssh_<host>.py` 提供 paramiko 连接），
以及目标主机上存在上一版的包骨架。它们**不含任何凭据**，主机地址与账号请自行在
`ssh_*.py` 里配置。
