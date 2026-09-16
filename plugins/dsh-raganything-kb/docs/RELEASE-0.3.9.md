# dsh-raganything-kb 0.3.9 — 发布说明

构建于 192.168.8.6 的 live 插件目录，相对 0.3.8 **仅改动 `lib/client.js`**（及随之 bump 的
`package.json` 版本号）。`server.py` / `index.js` 均无变化。

## 修复内容

### 「索引」弹窗的文档数与侧栏状态栏不一致（`client.js`）

同一个知识库面板里有**两处**文档计数，各用一套口径：

| 位置 | 0.3.8 状态 | 0.3.9 |
| --- | --- | --- |
| 侧栏状态栏 | 已修为 `${kbDocs.length} 篇文档` | 不变 |
| **「索引」弹窗顶部大数** | `extDist.reduce((a, s) => a + s.n, 0)`，而 `extDist` 遍历 **`docs`（全部文档）** —— 含只读 `DSH产物/` 工作区镜像与 `知识库产物/` 对话产物 | `extDist` 改遍历 **`kbDocs`**（目录树实际渲染的文档），依赖数组 `[docs]` → `[kbDocs]`，注释同步更新 |

于是出现「状态栏 9、索引弹窗 455」自相矛盾的现象。修复后三处数字（状态栏 / 弹窗 / 目录树）一致。

实测口径（同一份语料）：

| 服务器 | 弹窗显示（修复前） | `DSH产物/` | `知识库产物/` | 真实知识库 | 修复后 |
| --- | --- | --- | --- | --- | --- |
| 100.100.6.55 | 455 | 441 | 5 | 9（`知识库/`） | **9** |
| 192.168.8.6 | 111 | 100 | 9 | 2（`01-资料/`） | **2** |

改动只有一处函数体与一处依赖数组：

```js
// before
const extDist = (0, react.useMemo)(() => {
    ...
    for (const d of docs) {          // 全部文档
        ...
}, [docs]);

// after
const extDist = (0, react.useMemo)(() => {
    ...
    for (const d of kbDocs) {        // 目录树实际渲染的文档
        ...
}, [kbDocs]);
```

> 这纯属**显示口径**问题，不是删除/入库 bug。删除行为本身一直有效。

## 验证方式

不再只看磁盘文件，而是**抓取运行中 dsh-web 实际下发给浏览器的插件包**做取证：

1. 用浏览器探针抓到插件批加载 URL（`/plugins/??...dsh-raganything-kb/client.js...&rev=<hash>`）。
2. `curl` 该 URL 直接 grep 补丁标记。

结果：

| 服务器 | `for (const d of kbDocs) {` | 旧 `for (const d of docs) {` | `}, [kbDocs]);` |
| --- | --- | --- | --- |
| 100.100.6.55（rev=1ee23d63c39b） | 1 | **0** | 1 |
| 192.168.8.6（rev=a978d5732295） | 1 | **0** | 1 |

构建侧：`build_pkg039.py` 静态校验 `FAILED checks: 0`；沙箱安装演练 `verify.sh` 通过
（3 项预期 FAIL 来自 `--no-systemd` / `--no-nginx` / `--skip-venv` 与隔离端口 17999）。

## 升级提示

`install.sh` 是幂等的，**升级直接重跑即可**（会自行备份旧版到
`~/.dsh/raganything/backup-portable-<时间戳>/`），不要先卸载。

装了多个 profile / 多用户网关的部署请注意：`install.sh --profile <name>` 只更新
**指定的那一个** profile；多用户网关下每个账号 home 里的插件副本需要另行传播
（见 `build/` 中的说明与 `apply_extdist_fix.py`）。
