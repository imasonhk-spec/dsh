# dsh-raganything-kb 校验和

sharedkb 线（8.6 多用户网关）。完整发行说明见
[`imasonhk-spec/dsh-raganything-sharekb`](https://github.com/imasonhk-spec/dsh-raganything-sharekb)
的 `releases/<版本>/CHECKSUMS.md`。

`.tgz` / `-portable.tar.gz` 被本仓库 `.gitignore` 忽略；需要入库的版本以 `-f` 强制提交，
其余以 GitHub Release 资产为准。

| 文件 | SHA-256 |
| --- | --- |
| dsh-raganything-kb-0.4.1-sharedkb.tgz | `5b1d0942c71d01e292c0d77b3b65d293f10e3626544a18126309826af1c18d81` |
| dsh-raganything-kb-0.4.1-sharedkb-portable.tar.gz | `ecdff9bf0f2678dc58e655eb9415866b5e59c916320b46a4de454d0042e8310e` |
| dsh-raganything-kb-0.4.0.tgz | `7ca27a210a82be871f8e235dc7bd9b0b9c24e0a7209c7a7da59be97bb29e94ae` |
| dsh-raganything-kb-0.3.14-sharedkb.tgz | `afae8edfaf71c256e67c5e500defa1263c320dd900fac43a817ea8e6ee0e29aa` |
| dsh-raganything-kb-0.3.14-sharedkb-portable.tar.gz | `8908aa3d9e70012f91a15a79bd92ae6da9ced36bf17aac8132bc519a44bdd08f` |

> **注意**：本目录下的 `src/` 是**原始插件线**（`dsh-raganything-kb`，单机 / 纯插件分支）
> 的源码快照，与 sharedkb 线（多用户网关分支）的 `lib/client.js` 不可互相整文件覆盖
> —— 见 `imasonhk-spec/dsh-raganything-sharekb` 的 `docs/LINEAGE-sharedkb.md`。
> 两条线的实际发行件由各自的仓库发布。
