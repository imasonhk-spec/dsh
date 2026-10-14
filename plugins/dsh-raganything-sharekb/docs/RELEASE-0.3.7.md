# Release 0.3.7 — 对话产物栏 + 产物文件夹下线

- 构建主机：多用户网关那台 DSH 主机（Linux x86_64，Python 3.12）
- 载荷来源：该主机上 **正在运行的** live 插件目录快照（不是上一次的发布包）
- 打包方式：`build/build_pkg037.py`（0.3.6 骨架 + 刷新载荷 + 校验清单 + 沙箱演练）

---

## 一、这一版改了什么

### 1. 产物不再进知识库目录树，改到对话框右侧的「对话产物」栏

`DSH产物` / `知识库产物` 两个置顶节点从个人知识库树里移除，索引弹窗里那两个
「纳入全局检索」开关也一并删掉。产物改在**对话框右侧的可折叠面板**里：

| 项 | 行为 |
| --- | --- |
| 面板尺寸 | 展开 236px ⇄ 折叠 40px（折叠后竖排显示标题 + 数量角标），折叠状态本地记忆 |
| 分组 | 产物**按会话分组**，显示文件类型标签 + 名称 |
| 预览 | 点文件本体打开预览 |
| `@文件` | 每个文件后跟 **`@文件`** 按钮，点一下即把该产物作为引用注入对话框 |

### 2. 检索语义：产物"不进全局"但仍可被 `@` 精确引用

产物**仍然入库**——必须入库，否则 `@文件` 精确引用没有内容可检索。所以按场景分开处理：

| 场景 | 行为 |
| --- | --- |
| 目录树 | 完全不展示 |
| 不带 `@` 的全局问答 | `_excluded_prefixes()` **恒定**返回产物命名空间 → 永远排除 |
| 点「`@文件`」后提问 | 走 scope 精确检索分支（早于排除逻辑 return）→ **不受影响** |
| DSH 工作区自动入库 | `WS_SYNC_ENABLED` 代码默认改为 `False` |

### 3. 面板崩溃防护（从单机分支移植）

某些 sidecar 的 `/models` 快照不含 `selections.index_llm`，前端无保护解引用会抛异常，
DSH 的 slot 边界捕获后**整块卸载知识库面板**（`slot entry crashed in 'sidebar.footer.action'`）。

本版在 `loadModelsSnapshot` 前插入 `normaliseModelsSnap()`，把
`selections.{llm,index_llm,vision,embedding,rerank,asr,parser}` 与
`device/runtime/catalog/downloads/custom_models` 统一补成空对象（缺 `index_llm` 时用 `llm` 兜底），
一处归一化覆盖 20+ 处解引用。**纯防御性补丁**：字段存在时不改值。

> 该补丁是**逐字节**从单机分支移植过来的，见 `build/apply_norm_fix.py`。

### 4. 打包缺陷修复

| 文件 | 缺陷 | 修复 |
| --- | --- | --- |
| `uninstall.sh` | 0.3.6 里这份文件是 **CRLF 换行**，Linux 上 `bash -n` 与 `./uninstall.sh` 都报 `syntax error near unexpected token 'in\r'` —— 现场的**卸载/回滚其实是坏的** | 包内全部文本文件规范为 LF |
| `payload/kb/config.json.template` | 同样是 CRLF | 同上（JSON 内容不变，1087 → 1046 字节） |
| `payload/sidecar/__pycache__/server.cpython-312.pyc` | 0.3.6 误把编译缓存打进包里，且未登记在 manifest 中（清单与树不一致） | 打包时排除 `__pycache__` / `*.pyc`；编译校验改用 `PYTHONPYCACHEPREFIX`，不再污染载荷 |

> `uninstall.sh` 这个缺陷在 0.3.6 的构建里被漏掉了：那次构建是用
> `bash -n xxx.sh && echo OK` 的**标准输出**判断的，没看退出码，所以失败也打印成了 OK。

### 5. 沿用 0.3.6 的全部修复

多用户数据隔离（`dsh_mu_user` 命名空间 + 网关 basePath + 每账户自启 sidecar）、
知识库「删除后重传仍报重复」修复（A–G 七处）、`install.sh --no-pnpm` 解析器修复。

---

## 二、构建产物

| 产物 | 大小 | md5 |
| --- | --- | --- |
| `dsh-raganything-kb-0.3.7-portable.tar.gz` | 445,831 B | `0ca793c784bb251eab7b03100bdcc5ca` |
| `dsh-raganything-kb-0.3.7.tgz` | 208,659 B | `1a383714416e286bf2a4258980889869` |

包内结构（与 0.3.6 相同）：

```
dsh-raganything-kb-0.3.7-portable/
├── install.sh          9 步幂等安装器（PKG_VERSION="0.3.7"）
├── verify.sh           验证器（7 段，退出码 = 失败数）
├── uninstall.sh        卸载/回滚（本版已修好换行）
├── manifest.json       18 个文件 size + md5 + changes_0.3.6 / changes_0.3.7
├── README.md           含「0.3.7 变更」章节
├── plugin/dsh-raganything-kb-0.3.7.tgz   npm 形态（package/ 前缀）
├── payload/            同内容解包态（lib/ · sidecar/ · kb/ · cordis.patch.yml）
├── extras/             systemd 单元 / nginx 片段 / env 模板
└── tools/              adapt_config.py · patch_nginx.py
```

---

## 三、验证（全部实测）

### 1. 载荷标记断言（21 项，全绿）

- 去重补丁 A–G：7/7
- 多用户隔离标记：3/3（`dsh_mu_user` / `MU_NS` / index autostart）
- 产物栏标记：8/8（`KbArtifactRail` / `chatRow` / `chatLeft` / `artRailCollapsed` /
  `toggleArtRail` / `artifactGroups` / `@mention` 走 `mentionFile` / `normaliseModelsSnap`）
- 两个「纳入全局检索」开关已消失
- sidecar：`_excluded_prefixes` 无条件返回产物命名空间；`WS_SYNC` 默认关闭

### 2. 静态校验

| 检查 | 结果 |
| --- | --- |
| `plugin/*.tgz` 解包内容 vs `payload/` 逐字节 md5 | OK |
| `python3 -m py_compile sidecar/server.py` | OK |
| `bash -n install.sh / verify.sh / uninstall.sh` | 3/3 OK（**0.3.6 时这项对 uninstall.sh 实际是失败的**） |
| `node --check lib/index.js / lib/client.js` | 2/2 OK |
| 包内无 CRLF、无 `__pycache__` / `*.pyc` | OK |
| tgz 与便携包里都没有编译缓存 | OK |

### 3. 沙箱安装演练（`HOME` 重定向 → 对生产零影响）

`install.sh` 用 `RUN_HOME="${HOME}"`（只有 root 才走 `getent`），因此把 `HOME` 指向 `/tmp` 即可
完全隔离，另加 `--port 17999` 避免碰到生产 sidecar：

| 断言 | 结果 |
| --- | --- |
| `install.sh` 走完 9 步并打印 `0.3.7 installed` | ✅ |
| 第 4 步走 `--no-pnpm: direct-copy install` | ✅ |
| 已装 `client.js` / `index.js` / `server.py` 与负载**逐字节 md5 相等** | 3/3 ✅ |
| 已装 `package.json` version == `0.3.7` | ✅ |
| 已装 `client.js` 含产物栏、崩溃防护、多用户隔离标记，且不再有检索开关 | ✅ |
| profile 清单：`dependencies` 有 · `bundles` **恰好 1 次** | ✅ |
| 根目录落下 `dsh-raganything-kb-0.3.7.tgz` | ✅ |
| `verify.sh` | **passed 11 · failed 3** |

3 项 FAIL 均为沙箱**预期**（`--skip-venv --no-systemd --no-nginx` + 隔离端口所致）：
sidecar health / `/status`（venv 不存在，nohup 报 `venv/bin/python: No such file or directory`）、
nginx `/rag/` 通路（探到宿主的 3082，返回 401）。静态段（载荷 + 版本 + UI 特征串 + 清单 +
6 个 `rag_*` 工具注册）**全 PASS**。

### 4. 生产零影响证明

演练前后比对 live 插件三个文件 md5：`client.js 91b790a7…` / `index.js e8430c4d…` /
`server.py 6a4e9c26…` —— **完全一致**。沙箱目录已删除。

---

## 四、部署

**升级（推荐，幂等，不丢数据）** —— 直接重跑 `install.sh`，**不要先卸载**：

```bash
cd <放包的位置>
tar xzf dsh-raganything-kb-0.3.7-portable.tar.gz
cd dsh-raganything-kb-0.3.7-portable
SUDO_PW='<pw>' ./install.sh --profile web
./verify.sh --profile web --deep
```

只取插件 tgz（pnpm 路径）：

```bash
cd <DSH 安装目录>
pnpm dsh plugin --profile web add <路径>/dsh-raganything-kb-0.3.7.tgz
```

回滚：安装器会在 `~/.dsh/raganything/backup-portable-<时间戳>/dsh-raganything-kb`
留一份旧版副本，拷回 `profiles/<profile>/node_modules/` 即可。

---

## 五、须知

1. **载荷相对 live 目录多了一处改动**：`normaliseModelsSnap` 崩溃防护是从另一个分支移植进来的，
   所以多用户网关那台的 **live `client.js`（`91b790a7…`）与包内载荷（`09eb005a…`）不同**。
   重装会把这份防护一并装上——这是预期行为，且只有增益。
2. **`lib/client.js.map` 仍是 0.3.5 构建时产生的 sourcemap**。`client.js` 之后被多次补丁修改但
   未重新生成 map，所以该 map 是**近似**的（不影响运行，仅调试时行号可能偏移）。
3. **`verify.sh` 的静态段强依赖文案**：它按 UI 特征串判断面板功能，改文案时要同步更新。
4. **打包产物（tar.gz / tgz）不在本仓库**：仓库只放源码与工具链，二进制包另行分发。
