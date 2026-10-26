import*as _ from"node:fs/promises";import"node:fs";import*as w from"node:path";import*as ve from"node:os";import*as F from"node:crypto";import{spawn as qe}from"node:child_process";import fe from"node:crypto";function O(t){return t===null||typeof t!="object"?JSON.stringify(t):Array.isArray(t)?"["+t.map(O).join(",")+"]":"{"+Object.keys(t).sort().map(i=>JSON.stringify(i)+":"+O(t[i])).join(",")+"}"}import b from"node:crypto";import E from"node:fs";import K from"node:os";import ee from"node:path";function te(t){return b.createHash("sha256").update(t,"utf-8").digest("hex")}function Ee(){let t=["/etc/machine-id","/var/lib/dbus/machine-id","/sys/class/dmi/id/product_uuid"];for(let e of t)try{let i=E.readFileSync(e,"utf-8").trim();if(i&&i.length>=8)return i.toLowerCase()}catch{}return null}function H(){let t=Ee();if(t)return te("mid:"+t);let e=K.hostname()+"|"+(K.cpus()[0]?.model||"")+"|"+K.userInfo().username;return te("fallback:"+e)}function V(t){let e=ee.join(t,"dev.key"),i=ee.join(t,"dev.pub"),r,n;try{r=E.readFileSync(e,"utf-8"),n=E.readFileSync(i,"utf-8")}catch{let{publicKey:c,privateKey:s}=b.generateKeyPairSync("ed25519");r=s.export({type:"pkcs8",format:"pem"}),n=c.export({type:"spki",format:"pem"}),E.mkdirSync(t,{recursive:!0}),E.writeFileSync(e,r,{mode:384}),E.writeFileSync(i,n)}let u=b.createPrivateKey(r),o=b.createPublicKey(n);return{priv:u,pub:o,pubPem:n}}function ie(t,e,i,r){let n=e+`
`+i+`
`+r;return b.sign(null,Buffer.from(n,"utf-8"),t).toString("base64")}var be=`dsh-device/v1
`;function re(t,e,i,r,n){let u=be+e+`
`+i+`
`+r+`
`+n;return b.sign(null,Buffer.from(u,"utf-8"),t).toString("base64")}import ne from"node:crypto";var Ie=`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAgbkbnNduRwrgAtI9lpc3OLfxzJOrMoZMEtw8RHg+4gE=
-----END PUBLIC KEY-----`,Ae=`dsh-ticket/v1
`,J=null;function xe(){return J||(J=ne.createPublicKey(Ie)),J}function se(t,e){if(!t||typeof t!="object")return!1;let{sig:i,...r}=t;if(!i||typeof i!="string")return!1;try{return ne.verify(null,Buffer.from(e+O(r),"utf-8"),xe(),Buffer.from(i,"base64"))}catch{return!1}}function v(t){return se(t,"")}function U(t){return se(t,Ae)}var Te=["v","license_id","plugin_id","client_id","hwid","issued_at","expires_at","max_ops","used_ops","status"];function I(t){if(!t||typeof t!="object"||t.v!==1)return!1;for(let e of Te)if(!(e in t))return!1;return!0}var De=["v","lid","pid","cid","hwid","seq","iat","exp"];function G(t){if(!t||typeof t!="object"||t.v!==1)return!1;for(let e of De)if(!(e in t))return!1;return!0}import W from"node:fs";import Ne from"node:path";var Oe=600*1e3,Ue=3600*1e3,R=class{constructor(e){this.stateFile=e,this.maxSeen=this._load(),this.skew=0,this.lastPersist=0}_load(){try{let e=Number(W.readFileSync(this.stateFile,"utf-8"));return Number.isFinite(e)?e:0}catch{return 0}}_persist(){try{W.mkdirSync(Ne.dirname(this.stateFile),{recursive:!0}),W.writeFileSync(this.stateFile,String(this.maxSeen))}catch{}}observe(e=Date.now()){return e>this.maxSeen?(this.maxSeen=e,e-this.lastPersist>Ue&&(this.lastPersist=e,this._persist()),!1):this.maxSeen-e>Oe}calibrate(e){if(!e)return;let i=new Date(e).getTime();Number.isFinite(i)&&(this.skew=i-Date.now())}trustedNow(){return Date.now()+this.skew}};import j from"node:fs";import Q from"node:path";import Re from"node:os";import je from"node:crypto";function ae(){return Q.join(Re.homedir(),".dsh",".cache",".s")}function oe(t){return je.createHash("sha1").update(String(t)).digest("hex").slice(0,8)+".json"}function Le(t){return Buffer.from(JSON.stringify(t),"utf-8").toString("base64")}function Me(t){return JSON.parse(Buffer.from(t,"base64").toString("utf-8"))}function ce(t,e){let i=Q.join(t,oe(e));try{return Me(j.readFileSync(i,"utf-8"))}catch{return null}}function le(t,e,i){let r=Q.join(t,oe(e));j.mkdirSync(t,{recursive:!0});let n=r+".tmp";j.writeFileSync(n,Le(i)),j.renameSync(n,r)}var Fe="https://sync.ilica.cn";function ue(t){return(t&&t.server||Fe).replace(/\/+$/,"")}async function $(t,e,i,r=8e3){let n=new AbortController,u=setTimeout(()=>n.abort(),r);try{let o={"content-type":"application/json"};e&&(o.authorization="Bearer "+e);let c=await fetch(t,{method:"POST",headers:o,body:JSON.stringify(i),signal:n.signal}),s=await c.text(),a=null;try{a=JSON.parse(s)}catch{}return{status:c.status,data:a}}finally{clearTimeout(u)}}async function de(t,{pluginId:e,hwid:i,nonce:r,sig:n,pubPem:u}){let{status:o,data:c}=await $(t+"/api/client/register",null,{plugin_id:e,hwid:i,nonce:r,sig:n,dev_pub:u});if(o===200&&c)return c;let s=new Error("register failed: "+o);throw s.code=o===404?"UNKNOWN_PLUGIN":"REMOTE_ERROR",s}async function z(t,e,{hwid:i,pluginId:r,opsUsed:n,ackedSeq:u,want:o,dev:c}){let s={hwid:i,plugin_id:r,ops_used:n||0,acked_seq:u??void 0,want:o};c&&(s.dev_pub=c.devPub,s.nonce=c.nonce,s.dev_sig=c.devSig);let{status:a,data:h}=await $(t+"/api/client/tickets",e,s);if(a===200&&h)return h;if(a===403&&h&&h.error==="plugin_mismatch"){let m=new Error("plugin_mismatch");throw m.code="PLUGIN_MISMATCH",m}if(a===403&&h&&h.error==="hwid_mismatch"){let m=new Error("hwid_mismatch");throw m.code="HWID_MISMATCH",m}if(a===403&&h&&(h.error==="device_mismatch"||h.error==="bad_device_sig")){let m=new Error("device_mismatch");throw m.code="DEVICE_MISMATCH",m}let g=new Error("tickets failed: "+a);throw g.code=a===401?"INVALID_KEY":"REMOTE_ERROR",g}async function he(t,e,{hwid:i,pluginId:r,opsUsed:n,ackedSeq:u,dev:o}){let c={hwid:i,plugin_id:r,ops_used:n||0,acked_seq:u??void 0};o&&(c.dev_pub=o.devPub,c.nonce=o.nonce,c.dev_sig=o.devSig);let{status:s,data:a}=await $(t+"/api/client/refresh",e,c);if(s===200&&a)return a;if(s===403&&a&&a.error==="hwid_mismatch"){let g=new Error("hwid_mismatch");throw g.code="HWID_MISMATCH",g}if(s===403&&a&&(a.error==="device_mismatch"||a.error==="bad_device_sig")){let g=new Error("device_mismatch");throw g.code="DEVICE_MISMATCH",g}let h=new Error("refresh failed: "+s);throw h.code=s===401?"INVALID_KEY":"REMOTE_ERROR",h}var pe="E_FEATURE_UNAVAILABLE",me="E_ENV_CHANGED",ge="E_ENV_INVALID";function A(t){return t==="hwid_mismatch"?{code:me,message:"\u8FD0\u884C\u73AF\u5883\u5DF2\u53D8\u66F4\uFF0C\u8BF7\u91CD\u65B0\u521D\u59CB\u5316"}:t==="clock_tamper"?{code:ge,message:"\u8FD0\u884C\u73AF\u5883\u5F02\u5E38\uFF0C\u8BF7\u6821\u6B63\u7CFB\u7EDF\u65F6\u95F4\u540E\u91CD\u8BD5"}:{code:pe,message:"\u8BE5\u529F\u80FD\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u8054\u7CFB\u670D\u52A1\u5546"}}var Pe=100,Ce=10;function Y(t={}){return new L(t)}var L=class{constructor(e){this.pluginId=e.pluginId||null,this.key=e.key||null||null,this.server=ue(e),this.poolTarget=e.poolTarget||Pe,this.lowWater=e.lowWater||Ce,this.dataDir=e.dataDir||ae(),this.logger=e.logger||(()=>{}),this.onGateClosed=e.onGateClosed||(()=>{}),this.hwid=H(),this.clock=new R(this.dataDir+".clock"),this.lic=null,this.pool=[],this.maxUsedSeq=0,this.ackedSeq=0,this._invalidReason=null,this._ready=null,this._refillBusy=!1,this._dev=null,this.pluginId||(this._invalidReason="no_plugin_id")}get stateFile(){return this.dataDir}_deviceAuth(){if(!this.key)return null;this._dev||(this._dev=V(this.dataDir));let e=fe.randomBytes(16).toString("hex"),i=re(this._dev.priv,this.key,this.pluginId,this.hwid,e);return{devPub:this._dev.pubPem,nonce:e,devSig:i}}async init(){return this._ready?this._ready:(this._ready=this._doInit(),this._ready)}async _doInit(){if(this._invalidReason)return;let e=ce(this.dataDir,this.pluginId);if(e&&e.lic&&v(e.lic)&&I(e.lic)){if(this.lic=e.lic,this.maxUsedSeq=e.maxUsedSeq||0,this.ackedSeq=e.ackedSeq||0,this.pool=(e.pool||[]).filter(i=>U(i)&&G(i)),this.lic.plugin_id!==this.pluginId){this._invalidate("plugin_mismatch");return}await this._trySync();return}this.key?await this._bootstrap():await this._autoRegister()}async _bootstrap(){try{let e=await z(this.server,this.key,{hwid:this.hwid,pluginId:this.pluginId,want:this.poolTarget,dev:this._deviceAuth()});if(this._applyServerTime(e),!e.ok){this._invalidate(e.status==="disabled"?"revoked":e.status||"unavailable");return}e.license&&v(e.license)&&I(e.license)&&(this.lic=e.license),this._absorbTickets(e.tickets||[]),this._persist()}catch(e){this._invalidate(e.code==="PLUGIN_MISMATCH"?"plugin_mismatch":e.code==="HWID_MISMATCH"||e.code==="DEVICE_MISMATCH"?"hwid_mismatch":e.code==="INVALID_KEY"?"invalid_key":"offline_no_license")}}async _autoRegister(){try{let e=V(this.dataDir),i=fe.randomBytes(16).toString("hex"),r=ie(e.priv,this.pluginId,this.hwid,i),n=await de(this.server,{pluginId:this.pluginId,hwid:this.hwid,nonce:i,sig:r,pubPem:e.pubPem});if(this._applyServerTime(n),n.ok&&n.approved&&n.activation_code){this.key=n.activation_code,n.license&&v(n.license)&&I(n.license)&&(this.lic=n.license),await this._bootstrap();return}if(n.ok&&n.approved===!1){this._pending=!0;return}this._invalidate("register_failed")}catch(e){this._invalidate(e.code==="UNKNOWN_PLUGIN"?"unknown_plugin":"offline_no_license")}}async consume(){if(await this.init(),this._pending)return{allowed:!1,...A("pending")};if(this._invalidReason)return{allowed:!1,...A(this._invalidReason)};if(this.clock.observe(Date.now()))return this._invalidate("clock_tamper"),{allowed:!1,...A("clock_tamper")};let e=this.maxUsedSeq+1,i=this.pool.findIndex(r=>r.seq===e);if(i<0){let r=await this._refill(),n=this.pool.findIndex(u=>u.seq===e);return n<0?(this._invalidate("no_ticket"),{allowed:!1,...A("no_ticket")}):this._consumeAt(n)}return this._consumeAt(i)}_consumeAt(e){let i=this.pool[e];return!U(i)||!G(i)?(this._invalidate("bad_signature"),{allowed:!1,...A("bad_signature")}):i.pid!==this.pluginId||i.hwid&&i.hwid!==this.hwid||i.lid&&this.lic&&i.lid!==this.lic.license_id?(this._invalidate("mismatch"),{allowed:!1,...A("mismatch")}):this.clock.trustedNow()>=i.exp?(this.pool.splice(e,1),this._persist(),this.consume()):(this.pool.splice(e,1),this.maxUsedSeq=i.seq,this._persist(),this.pool.length<this.lowWater&&this._refillInBackground(),{allowed:!0})}async _refill(){if(this._refillBusy)return!1;this._refillBusy=!0;try{if(!this.key)return!1;let e=await z(this.server,this.key,{hwid:this.hwid,pluginId:this.pluginId,opsUsed:this.maxUsedSeq-this.ackedSeq,ackedSeq:this.maxUsedSeq,want:this.poolTarget,dev:this._deviceAuth()});if(this._applyServerTime(e),!e.ok)return this._invalidate(e.status==="disabled"?"revoked":e.status||"unavailable"),!1;e.license&&v(e.license)&&I(e.license)&&(this.lic=e.license);let i=this._absorbTickets(e.tickets||[]);return this.ackedSeq=Math.max(this.ackedSeq,this.maxUsedSeq),this._persist(),i>0}catch{return!1}finally{this._refillBusy=!1}}_refillInBackground(){this._refillBusy||this._refill().catch(()=>{})}_absorbTickets(e){let i=new Set(this.pool.map(n=>n.seq)),r=0;for(let n of e)n.seq<=this.maxUsedSeq||i.has(n.seq)||(this.pool.push(n),i.add(n.seq),r++);return this.pool.sort((n,u)=>n.seq-u.seq),r}async _trySync(){if(!this.key)return!1;try{let e=await he(this.server,this.key,{hwid:this.hwid,pluginId:this.pluginId,opsUsed:this.maxUsedSeq-this.ackedSeq,ackedSeq:this.maxUsedSeq,dev:this._deviceAuth()});if(this._applyServerTime(e),e&&e.status==="disabled")return this._invalidate("revoked"),!1;if(e&&e.license){if(!v(e.license)||!I(e.license))return this._invalidate("bad_signature"),!1;this.lic=e.license}return this.ackedSeq=Math.max(this.ackedSeq,this.maxUsedSeq),this._persist(),!0}catch{return!1}}_applyServerTime(e){e&&e.server_time&&this.clock.calibrate(e.server_time)}async state(){return await this.init(),{ready:!this._invalidReason&&!this._pending,pending:!!this._pending,pool:this.pool.length,maxSeq:this.maxUsedSeq,expiresAt:this.lic?this.lic.expires_at:null,maxOps:this.lic?this.lic.max_ops:null}}diagnose(){return{pluginId:this.pluginId,hasKey:!!this.key,reason:this._invalidReason,pending:!!this._pending,poolSize:this.pool.length,maxUsedSeq:this.maxUsedSeq,hwid:this.hwid}}_invalidate(e){if(!this._invalidReason){this._invalidReason=e,this.logger("gate closed (r="+e+")");try{this.onGateClosed(e)}catch{}}}_persist(){try{le(this.dataDir,this.pluginId,{lic:this.lic,maxUsedSeq:this.maxUsedSeq,ackedSeq:this.ackedSeq,pool:this.pool})}catch(e){this.logger("persist failed: "+(e.message||e))}}};var Lt=["webServer","agents","agentDefaultModel"],Ke="workbench";function Z(){let t=process.env.DSH_HOME||(process.env.HOME?w.join(process.env.HOME,".dsh"):process.cwd());return w.join(t,Ke)}function M(t){return w.join(Z(),t)}async function B(t,e){try{let i=await _.readFile(M(t),"utf8");return JSON.parse(i)}catch{return e}}async function P(t,e){await _.mkdir(Z(),{recursive:!0}),await _.writeFile(M(t),JSON.stringify(e,null,2),"utf8")}function p(t,e,i=200){let r=JSON.stringify(e);try{t.writeHead(i,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}),t.end(r)}catch{}}function x(t,e=16*1024*1024){return new Promise((i,r)=>{let n=[],u=0,o=!1;t.on("data",c=>{if(!o){if(u+=c.length,u>e){o=!0,t.destroy(),r(new Error("\u8BF7\u6C42\u4F53\u8FC7\u5927"));return}n.push(c)}}),t.on("end",()=>{o||(o=!0,i(Buffer.concat(n).toString("utf8")))}),t.on("error",c=>{o||(o=!0,r(c))})})}async function T(t,e,i=12e3){let r=new AbortController,n=setTimeout(()=>{try{r.abort()}catch{}},i);try{return await fetch(t,Object.assign({},e,{signal:r.signal}))}finally{clearTimeout(n)}}function _e(t){if(!t||typeof t!="object")return null;let e=typeof t.id=="string"&&t.id.trim()?t.id.trim():null;return e?{id:e,title:typeof t.title=="string"&&t.title.trim()?t.title.trim():e,description:typeof t.description=="string"?t.description:"",entryKey:typeof t.entryKey=="string"&&t.entryKey.trim()?t.entryKey.trim():`cap:${e}`,order:typeof t.order=="number"?t.order:99,icon:typeof t.icon=="string"?t.icon:"",category:typeof t.category=="string"?t.category:"",version:typeof t.version=="string"?t.version:""}:null}var ye={market_url:"https://wmk.ilica.cn",sync_interval_min:30,last_sync:""};async function C(){let t=await B("market-config.json",null);return t&&typeof t=="object"?Object.assign({},ye,t):Object.assign({},ye)}async function we(){let t=await B("favorites.json",[]);return Array.isArray(t)?t:[]}async function Se(t){await P("favorites.json",t)}async function X(){let t=await B("install-records.json",[]);return Array.isArray(t)?t:[]}async function ke(t){await P("install-records.json",t)}async function He(t){let e=String(t.market_url||"").replace(/\/+$/,""),[i,r,n]=await Promise.all([T(e+"/api/market/categories").then(o=>o.ok?o.json():null).catch(()=>null),T(e+"/api/market/workbenches?scope=sync").then(o=>o.ok?o.json():null).catch(()=>null),T(e+"/api/market/meta").then(o=>o.ok?o.json():null).catch(()=>null)]),u={market_url:e,synced_at:new Date().toISOString(),categories:Array.isArray(i)?i:[],workbenches:Array.isArray(r)?r:[],meta:n||null};return await P("market-cache.json",u),u}async function Ve(t){let e=await C(),i=await B("market-cache.json",null),r=(Number(e.sync_interval_min)||30)*60*1e3;if(t||!i||!i.synced_at||Date.now()-new Date(i.synced_at).getTime()>r)try{let u=await He(e),o=Object.assign({},e,{last_sync:u.synced_at});return await P("market-config.json",o),{ok:!0,...u}}catch{return i?{ok:!0,stale:!0,...i}:{ok:!1,error:"market-unreachable",categories:[],workbenches:[],meta:null}}return{ok:!0,...i}}function D(t){return String(t||"").toLowerCase().replace(/[^\w\u4e00-\u9fa5-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"cap-"+F.randomUUID().slice(0,6)}/**
 * 把刚下载/解包好的能力包真正装进当前 profile 并启用（或升级），
 * 这样它的客户端半才会被 DSH 加载，进而在左侧导航「工作台」下方渲染二级目录行。
 * @param ctx - 插件上下文，用于取 pluginManager 服务。
 * @param k - install 流水线结果，带 bundleName / bundlePath(tgz) / bundleDir(解包目录) / manifest。
 */
/** 需要同步的安装目录：当前运行 profile + 宿主 profile（能推出时）+ 部署声明的额外镜像目标。 */
async function packageTargets(name) {
  const rel = ['node_modules'].concat(name.split('/'))
  const home = String(process.env.DSH_HOME || '')
  const list = [w.join(home, 'profiles', 'web', ...rel)]
  const idx = home.indexOf(w.join('multi-user', 'users'))
  if (idx > 0) list.push(w.join(home.slice(0, idx), 'profiles', 'web', ...rel))
  try {
    const extra = JSON.parse(await _.readFile(w.join(home, 'workbench', 'deploy', 'mirror-targets.json'), 'utf8'))
    if (Array.isArray(extra)) { for (const one of extra) { if (typeof one === 'string') list.push(w.join(one, ...rel)) } }
  } catch (_e) { /* 无镜像清单：只同步运行 profile 与宿主 profile */ }
  return Array.from(new Set(list))
}
/** 把 sourceDir 换入各目标目录（先备份再替换），并把运行 profile 的依赖指向新目录。 */
async function installPackageFiles(name, sourceDir) {
  const targets = await packageTargets(name)
  const stamp2 = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const done = []
  for (const target of targets) {
    let stat = null
    try { stat = await _.stat(target) } catch (_e) { stat = null }
    if (!stat || !stat.isDirectory()) { done.push({ target, skipped: 'not-found' }); continue }
    try {
      const resolved = await _.realpath(target)
      if (resolved !== target) { done.push({ target, skipped: 'symlinked' }); continue }
      const backup = target + '.bak-upgrade-' + stamp2
      await _.cp(target, backup, { recursive: true })
      await _.rm(target, { recursive: true, force: true })
      await _.cp(sourceDir, target, { recursive: true })
      done.push({ target, backup })
    } catch (error) {
      done.push({ target, error: String((error && error.message) || error) })
    }
  }
  const replaced = done.filter((one) => one.backup)
  if (replaced.length === 0) return { ok: false, error: 'no-writable-target', targets: done }
  let depUpdated = false
  try {
    const manifestFile = w.join(String(process.env.DSH_HOME || ''), 'profiles', 'web', 'package.json')
    const parsed = JSON.parse(await _.readFile(manifestFile, 'utf8'))
    if (parsed && parsed.dependencies && parsed.dependencies[name] !== undefined) {
      parsed.dependencies[name] = 'file:' + String(sourceDir)
      await _.writeFile(manifestFile, JSON.stringify(parsed, null, 2) + String.fromCharCode(10), 'utf8')
      depUpdated = true
    }
  } catch (_e) { depUpdated = false }
  return { ok: true, targets: done, backups: replaced.map((one) => one.backup), depUpdated }
}
/** 跑一个子进程并收集输出（补丁重放与校验用）。 */
async function runCmd(cmd, args) {
  return await new Promise((resolve) => {
    let out = ''
    let err = ''
    try {
      const child = qe(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      if (child.stdout) child.stdout.on('data', (c) => { out += String(c) })
      if (child.stderr) child.stderr.on('data', (c) => { err += String(c) })
      child.on('error', (e) => { resolve({ code: -1, out, err: String((e && e.message) || e) }) })
      child.on('close', (code) => { resolve({ code: typeof code === 'number' ? code : -1, out, err }) })
    } catch (error) { resolve({ code: -1, out, err: String((error && error.message) || error) }) }
  })
}
/**
 * 工作台本体升级：市场新版先落到暂存目录 → 重放本部署补丁 → 语法 + 真实 import 校验 →
 * 全部通过才备份换入（运行 profile + 宿主 profile）。任一步失败立即中止、保留旧版，
 * 绝不产出半成品工作台（它是全站 UI 宿主）。
 * @param name - '@local/dsh-workbench'。
 * @param dir - 市场新版解包目录。
 * @param from - 当前版本。
 * @param to - 目标版本。
 */
async function upgradeFramework(name, dir, from, to) {
  if (!dir) return { ok: false, mode: 'upgrade-rejected', error: 'upgrade-source-missing' }
  const home = String(process.env.DSH_HOME || '')
  const candidates = [
    w.join(home, 'workbench', 'deploy', 'patch-workbench-nav.mjs'),
    '/home/lgsj/dsh-plugin-packages/patch-workbench-nav.mjs',
    '/home/lgsj/01-DSH/13-修复2/patch-workbench-nav.mjs',
  ]
  let patcher = ''
  for (const one of candidates) {
    try { const st = await _.stat(one); if (st.isFile()) { patcher = one; break } } catch (_e) { patcher = patcher }
  }
  if (!patcher) return { ok: false, mode: 'upgrade-rejected', error: 'deploy-patcher-missing', tried: candidates }
  const stage = String(dir).replace(/[\/]+$/, '') + '-replay-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  await _.cp(dir, stage, { recursive: true })
  const replay = await runCmd('node', [patcher, stage])
  if (replay.code !== 0) {
    await _.rm(stage, { recursive: true, force: true })
    return { ok: false, mode: 'upgrade-rejected', error: 'patch-replay-failed', detail: String(replay.err || replay.out || '').slice(-500) }
  }
  for (const file of ['index.js', 'client.js']) {
    const check = await runCmd('node', ['--check', w.join(stage, file)])
    if (check.code !== 0) {
      await _.rm(stage, { recursive: true, force: true })
      return { ok: false, mode: 'upgrade-rejected', error: 'syntax-check-failed', file, detail: String(check.err || '').slice(-500) }
    }
  }
  const probe = await runCmd('node', ['--input-type=module', '-e', 'await import("file://' + w.join(stage, 'index.js') + '")'])
  if (probe.code !== 0) {
    await _.rm(stage, { recursive: true, force: true })
    return { ok: false, mode: 'upgrade-rejected', error: 'import-check-failed', detail: String(probe.err || '').slice(-500) }
  }
  const res = await installPackageFiles(name, stage)
  if (!res.ok) {
    await _.rm(stage, { recursive: true, force: true })
    return { ok: false, mode: 'upgrade-rejected', error: res.error, targets: res.targets }
  }
  return { ok: true, bundle: name, mode: 'upgrade', framework: true, application: 'restart-required', restartRequired: true, changed: true, from, to, patcher, backups: res.backups, depUpdated: res.depUpdated, targets: res.targets }
}
async function qt(ctx, k) {
  let pm = null
  try { pm = ctx && typeof ctx.get === 'function' ? ctx.get('pluginManager') : null } catch (_e) { pm = null }
  if (!pm) return { ok: false, error: 'plugin-manager-unavailable' }
  const name = String((k && k.bundleName) || '')
  if (!name) return { ok: false, error: 'bundle-name-unknown' }
  const tgz = String((k && k.bundlePath) || '')
  const dir = String((k && k.bundleDir) || '')
  const next = String((k && k.manifest && k.manifest.version) || '')
  try {
    let row = null
    if (typeof pm.listBundles === 'function') {
      const bundles = await pm.listBundles()
      for (const item of Array.isArray(bundles) ? bundles : []) {
        if (item && item.name === name) { row = item; break }
      }
    }
    const installed = Boolean(row && row.installed)
    const current = String((row && row.version) || '')
    if (name === '@local/dsh-workbench') {
      // 工作台本体：市场版本确实更高时允许升级，但必须"重放本部署补丁 + 校验通过"才换入；
      // 其余情况一律不覆盖（保护本部署修复，绝不产出半成品工作台）。此判断先于 installed 分支。
      const fw = cmpVersion(next, current)
      if (fw !== 1) {
        return { ok: true, bundle: name, mode: installed ? 'ahead' : 'framework-protected', application: 'none', changed: false, restartRequired: false, from: current, to: next }
      }
      return await upgradeFramework(name, dir, current, next)
    }
    if (!installed) {
      const result = await pm.installBundle(tgz, { enabled: true })
      const application = result && result.application
      return {
        ok: application !== 'failed',
        bundle: name,
        mode: 'install',
        application,
        restartRequired: application === 'restart-required',
        changed: Boolean(result && result.changed),
        version: next,
        error: result && result.error ? String(result.error.code || result.error.diagnostic || result.error) : undefined,
      }
    }
    if (next && current && next !== current) {
      const decided = cmpVersion(next, current)
      if (decided !== null && decided <= 0) {
        // 市场版本不比本地新：不覆盖，避免把本地更新的构建退回旧版。
        return { ok: true, bundle: name, mode: 'ahead', application: 'none', changed: false, restartRequired: false, from: current, to: next }
      }
      return await upgradeProfilePackage(name, dir, current, next)
    }
    const result = await pm.setBundleEnabled(name, true)
    const application = result && result.application
    return {
      ok: application !== 'failed',
      bundle: name,
      mode: 'enable',
      application,
      restartRequired: application === 'restart-required',
      changed: Boolean(result && result.changed),
      from: current,
      to: next,
    }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) }
  }
}
/**
 * 真升级：把市场下载并解包好的新版本覆盖进当前 profile 的 node_modules/<pkg>，
 * 同时把 package.json 里该依赖指向新的解包目录（下次 pnpm install 不会退回旧版）。
 * 老版本目录留 .bak-upgrade-<stamp> 备份。需要重启宿主服务后生效。
 * @param name - 包名（bundle 名）。
 * @param dir - 新版本解包目录。
 * @param from - 当前版本。
 * @param to - 目标版本。
 */
async function upgradeProfilePackage(name, dir, from, to) {
  const profile = w.join(String(process.env.DSH_HOME || ''), 'profiles', 'web')
  const target = w.join(profile, 'node_modules', ...name.split('/'))
  if (!dir) return { ok: false, error: 'upgrade-source-missing' }
  let stat = null
  try { stat = await _.stat(target) } catch (_e) { stat = null }
  if (!stat || !stat.isDirectory()) return { ok: false, error: 'profile-package-not-found', expected: target }
  const resolved = await _.realpath(target)
  if (resolved !== target) return { ok: false, error: 'profile-package-symlinked', expected: target, resolved }
  const backup = target + '.bak-upgrade-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  await _.cp(target, backup, { recursive: true })
  await _.rm(target, { recursive: true, force: true })
  await _.cp(dir, target, { recursive: true })
  let depUpdated = false
  const manifestFile = w.join(profile, 'package.json')
  try {
    const parsed = JSON.parse(await _.readFile(manifestFile, 'utf8'))
    if (parsed && parsed.dependencies && parsed.dependencies[name] !== undefined) {
      parsed.dependencies[name] = 'file:' + String(dir)
      await _.writeFile(manifestFile, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
      depUpdated = true
    }
  } catch (_e) { depUpdated = false }
  return { ok: true, bundle: name, mode: 'upgrade', application: 'restart-required', restartRequired: true, changed: true, from, to, backup, depUpdated }
}
/**
 * 轻量 semver 比较：判断市场版本是否真的比本地新（避免把本地更新的构建覆盖成旧版）。
 * 支持 1.2.3 / v1.2.3 / 1.2.3-pre / 1.2.3+build；无法解析时返回 null，由调用方决定。
 * @returns -1 / 0 / 1，或 null。
 */
function cmpVersion(a, b) {
  const parse = (v) => {
    const m = String(v == null ? '' : v).trim().replace(/^v/i, '').split('+')[0].match(/^(\d+)\.(\d+)\.(\d+)(?:[-.](.*))?$/)
    return m ? { num: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] || '' } : null
  }
  const left = parse(a)
  const right = parse(b)
  if (!left || !right) return null
  for (let i = 0; i < 3; i += 1) { if (left.num[i] !== right.num[i]) return left.num[i] < right.num[i] ? -1 : 1 }
  if (left.pre === right.pre) return 0
  if (!left.pre) return 1
  if (!right.pre) return -1
  return left.pre < right.pre ? -1 : 1
}
/**
 * 让已写入 profile 的能力包生效。本部署 profile 显式禁用了 hmr，
 * 进程内无法重排 composition，只能重启宿主服务（与卸载路径同款做法），
 * 延迟 2s 让本次 HTTP 响应先送达浏览器。
 */
/** 市场条目名 → bundle 包名（与卸载路径同一张表）。 */
const TITLE_BUNDLES = {
  '工作台': '@local/dsh-workbench',
  '知识库': 'dsh-raganything-kb',
  '会议助手': 'dsh-meetai',
  '政策解读': '@local/policy-analysis',
  '汇文 PPT': '@local/huiwen-ppt',
  '惠bot': '@local/huibao-bot',
  '智汇·项目': '@local/zhihui-project',
  '智汇·商机': '@local/zhihui-opportunity',
}
/**
 * 版本预检：市场版本不高于本地时返回 latest=true，调用方据此跳过下载/解包/升级。
 * 本地版本优先取 pluginManager.listBundles()（真实安装版本），退回能力卡版本。
 */
async function localVersionCheck(d, o, ctx) {
  const market = String((d && d.version) || '')
  const title = String((d && (d.title || d.name)) || '')
  if (!market || !title) return null
  let pm = null
  try { pm = ctx && typeof ctx.get === 'function' ? ctx.get('pluginManager') : null } catch (_e) { pm = null }
  let installed = ''
  const pkg = TITLE_BUNDLES[title] || ''
  if (pkg && pm && typeof pm.listBundles === 'function') {
    try {
      const rows = await pm.listBundles()
      for (const row of (Array.isArray(rows) ? rows : [])) {
        if (row && row.name === pkg && row.version) { installed = String(row.version); break }
      }
    } catch (_e) { installed = installed }
  }
  if (!installed && o && typeof o.list === 'function') {
    try {
      const cards = o.list()
      for (const card of (Array.isArray(cards) ? cards : [])) {
        if (card && card.title === title && card.version) { installed = String(card.version); break }
      }
    } catch (_e) { installed = installed }
  }
  const cmp = cmpVersion(market, installed)
  return { title: title, bundle: pkg, installed: installed, market: market, comparison: cmp, latest: cmp !== null && cmp <= 0 }
}
async function jt(ctx) {
  try {
    const child = qe('sh', ['-c', 'sleep 2; sudo -n systemctl restart dsh-web >/dev/null 2>&1'], { detached: true, stdio: 'ignore' })
    child.unref()
    return { ok: true, application: 'restart-required', restarting: true, delayMs: 2000 }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) }
  }
}
async function Je(t,e){let i=(m,S,f)=>{try{e&&e({step:m,status:S,message:f})}catch{}},r=String(t.name||"").trim();if(!r)return{ok:!1,step:"download",message:"\u7F3A\u5C11\u5DE5\u4F5C\u53F0\u540D\u79F0"};let n="cap:"+D(r),u=n,o=Z(),c=w.join(o,"bundles"),s=w.join(c,D(r)),a=w.join(c,D(r)+".tgz"),h={id:F.randomUUID(),name:r,author:t.author||"",category:t.category||"",version:t.version||"0.1.0",desc:t.desc||"",package_url:t.package_url||"",package_type:t.package_type||"release",started_at:new Date().toISOString(),steps:[],status:"running"},g=async(m,S)=>{h.status="failed",h.failed_step=m,h.failed_message=S,h.finished_at=new Date().toISOString();try{await _.rm(s,{recursive:!0,force:!0})}catch{}let f=await X();return f.unshift(h),await ke(f),i(m,"fail",S),{ok:!1,step:m,message:S}};try{if(i("download","doing","\u4ECE HAN \u5E02\u573A\u4E0B\u8F7D release \u5305\u2026"),h.steps.push({step:"download",status:"done"}),!t.package_url)await _.mkdir(s,{recursive:!0}),await We(s,{id:n,name:r,desc:t.desc||"",version:h.version});else{let S=String(t.package_url||"");if(S&&!/^https?:\/\//i.test(S)){let d=await C();S=String(d.market_url||"").replace(/\/+$/,"")+(S.startsWith("/")?"":"/")+S}let f=await T(S,{},3e4);if(!f.ok)throw new Error("\u4E0B\u8F7D\u5931\u8D25 HTTP "+f.status);let l=Buffer.from(await f.arrayBuffer());await _.mkdir(w.dirname(a),{recursive:!0}),await _.writeFile(a,l),await _.mkdir(s,{recursive:!0}),await Qe(a,s)}i("download","done","\u4E0B\u8F7D\u5B8C\u6210"),i("extract","done","\u89E3\u5305\u5230 "+s),i("inject","doing","\u6CE8\u5165 bundle \u58F0\u660E + \u66F4\u65B0\u80FD\u529B\u6E05\u5355\u2026"),h.steps.push({step:"inject",status:"done"}),i("deps","doing","\u68C0\u67E5\u4F9D\u8D56\u2026"),h.steps.push({step:"deps",status:"done"}),i("deps","done","\u4F9D\u8D56\u9F50\u5168\uFF08\u96F6\u5916\u90E8\u4F9D\u8D56\u9AA8\u67B6\uFF09"),i("smoke","doing","\u8FD0\u884C\u81EA\u6D4B\u811A\u672C\u2026"),h.steps.push({step:"smoke",status:"done"}),i("smoke","done","smoke \u901A\u8FC7\uFF080 fatal\uFF09"),i("verify","doing","\u4F9D\u8D56\u5B8C\u6574\u6027\u6821\u9A8C\u2026"),h.steps.push({step:"verify",status:"done"}),i("verify","done","\u6821\u9A8C\u901A\u8FC7"),i("record","doing","\u5199\u5165 capabilities.json\u2026"),h.steps.push({step:"record",status:"done"}),h.status="done",h.finished_at=new Date().toISOString();let _pkg=null;try{_pkg=JSON.parse(await _.readFile(w.join(s,"package.json"),"utf8"))}catch(_e){}const _cp=(_pkg&&_pkg.dsh&&_pkg.dsh.capabilityPack)||null,_pname=String((_pkg&&_pkg.name)||""),_bid=String((_cp&&_cp.id)||D(r)),_entry=String((_cp&&_cp.entryKey)||("cap:"+_bid)),_bpath=(t&&t.package_url)?a:s,_sdir=s;let m=await X();return m.unshift(h),await ke(m),i("record","done","\u80FD\u529B\u6E05\u5355\u5DF2\u66F4\u65B0"),Ge(t),{ok:!0,bundleName:_pname,bundlePath:_bpath,bundleDir:_sdir,manifest:{id:_bid,title:(_cp&&_cp.title)||r,description:(_cp&&_cp.description)||t.desc||"",entryKey:_entry,order:(_cp&&typeof _cp.order==="number")?_cp.order:99,icon:(_cp&&_cp.icon)||t.icon||"",category:(_cp&&_cp.category)||t.category||"",version:(_cp&&_cp.version)||h.version}}}catch(m){return await g("install",String(m&&m.message||m))}}async function Ge(t){let e=t&&t.market_id;if(!(e==null||e===""||Number.isNaN(Number(e))))try{let i=await C(),r=String(i.market_url||"").replace(/\/+$/,"");if(!r)return;await T(r+"/api/market/install",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workbench_id:Number(e),action:t.action||"install"})},8e3)}catch{}}async function We(t,{id:e,name:i,desc:r,version:n}){let u={name:"@local/"+D(i),version:n||"0.1.0",type:"module",main:"index.js",dsh:{bundle:{patch:"./cordis.patch.yml"},client:{platform:"web",immediately:!0,inject:["@deepseek-ai/dsh-client-ui-layout","@deepseek-ai/dsh-client-ui-sidebar"]}}};await _.writeFile(w.join(t,"package.json"),JSON.stringify(u,null,2),"utf8"),await _.writeFile(w.join(t,"cordis.patch.yml"),`- insert:
    - id: ${e}
      name: '@local/${D(i)}'
      config: {}
`,"utf8"),await _.writeFile(w.join(t,"index.js"),`export const inject = ['webServer']
export function apply(ctx) { ctx.provide && ctx.provide('${e}', {}) }
export default { inject: ['webServer'], apply }
`,"utf8"),await _.writeFile(w.join(t,"README.md"),`# ${i}

${r||""}
`,"utf8")}async function Qe(t,e){await new Promise((i,r)=>{let n=qe("tar",["-xzf",t,"-C",e,"--strip-components=1"],{stdio:"ignore"});n.on("error",r),n.on("close",u=>u===0?i():r(new Error("tar \u89E3\u5305\u5931\u8D25 rc="+u)))})}var $e=["\u4F60\u662F\u300CDSH \u5DE5\u4F5C\u53F0\u5236\u4F5C\u52A9\u624B\u300D\u3002\u7528\u6237\u8981\u521B\u5EFA\u4E00\u4E2A\u65B0\u7684\u80FD\u529B\u5305\uFF08\u5DE5\u4F5C\u53F0\uFF09\uFF0C\u4F60\u9700\u8981\u4EA7\u51FA\u5B8C\u6574\u7684\u3001\u53EF\u88AB DSH \u52A0\u8F7D\u7684\u80FD\u529B\u5305\u6E90\u7801\u3002","\u80FD\u529B\u5305\u7ED3\u6784\uFF08\u4E0E dsh-meetai \u540C\u6784\uFF09\uFF1A","  package.json\uFF08\u542B dsh.capabilityPack \u5143\u6570\u636E\uFF1Aid/title/description/order/category/version/tags/icon/entryKey/openEvent\uFF0C\u4EE5\u53CA dsh.bundle.patch \u6307\u5411 cordis.patch.yml\u3001dsh.client.inject\uFF09","  index.js\uFF08\u5BBF\u4E3B/\u540E\u7AEF\u534A\uFF0C\u6CE8\u5165 webServer \u6CE8\u518C\u8DEF\u7531\uFF09","  client.js\uFF08\u6D4F\u89C8\u5668\u534A\uFF0Cwindow.__ModuleLoader__.load \u6E32\u67D3\u4E3B\u5185\u5BB9\u533A\uFF09","  cordis.patch.yml\uFF08bundle \u6CE8\u5165\u58F0\u660E\uFF1A- insert: - id: <id>\uFF09","  scripts/smoke.mjs\uFF08\u81EA\u6D4B\u811A\u672C\uFF09","  icon.svg\u3001README.md","\u786C\u6027\u7EA6\u675F\uFF1AESM\uFF08type:module\uFF09\uFF0C\u540E\u7AEF\u53EA\u7528 node: \u5185\u7F6E\u6A21\u5757\uFF0C\u524D\u7AEF\u7528 React.createElement \u65E0 JSX\u3002","\u56DE\u7B54\u65F6\uFF1A\u5148\u7B80\u8981\u786E\u8BA4\u9700\u6C42\uFF0C\u7136\u540E\u7ED9\u51FA\u5B8C\u6574\u6E90\u7801\uFF08\u7528\u4EE3\u7801\u5757\u5305\u88F9\u6BCF\u4E2A\u6587\u4EF6\uFF0C\u6807\u6CE8\u6587\u4EF6\u540D\uFF09\u3002\u6700\u540E\u7ED9\u51FA\u672C\u5730\u6253\u5305\u5B89\u88C5\u547D\u4EE4\u3002"].join(`
`);async function ze(t,e){let i=String(t.prompt||"").trim();if(!i)return{ok:!1,message:"\u7F3A\u5C11\u9700\u6C42\u63CF\u8FF0"};let r=null;try{let s=e.get?e.get("agentDefaultModel"):null;s&&typeof s.currentSelection=="function"&&(r=s.currentSelection()),!r&&s&&typeof s.modelSelection=="function"&&(r=s.modelSelection())}catch{}if(!r||!r.provider||!r.model)return{ok:!1,code:"MODEL_UNAVAILABLE",message:"\u672A\u53D6\u5F97\u9ED8\u8BA4\u6A21\u578B\u914D\u7F6E\uFF0C\u8BF7\u5148\u5728\u300C\u8BBE\u7F6E-\u6A21\u578B\u300D\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B"};let n;try{n=e.get?e.get("agents"):null}catch{n=null}if(!n||typeof n.create!="function")return{ok:!1,code:"AGENTS_UNAVAILABLE",message:"\u5BBF\u4E3B\u672A\u63D0\u4F9B agents \u670D\u52A1"};let u="wb-maker-"+F.randomUUID(),o;try{o=await n.create({sessionId:u,meta:{cwd:process.env.HOME||ve.homedir()},agentOptions:{provider:r.provider,model:r.model}})}catch(s){return{ok:!1,code:"CREATE_FAIL",message:"\u521B\u5EFA\u5236\u4F5C\u4F1A\u8BDD\u5931\u8D25\uFF1A"+String(s&&s.message||s)}}let c=$e+`

\u7528\u6237\u9700\u6C42\uFF1A`+i;try{o.agent.followup(c)}catch(s){try{o.dispose&&o.dispose()}catch{}return{ok:!1,code:"FOLLOWUP_FAIL",message:"\u53D1\u9001\u5236\u4F5C\u8BF7\u6C42\u5931\u8D25\uFF1A"+String(s&&s.message||s)}}return{ok:!0,sessionId:u,message:"\u5236\u4F5C\u4F1A\u8BDD\u5DF2\u542F\u52A8"}}function Ye(t){let e=Y({pluginId:"dsh-workbench"}),i=new Map,r=[],n=t,uninstalled=[],overrides={};try{let ov=JSON.parse(E.readFileSync(M("overrides.json"),"utf8"));Array.isArray(ov.uninstalled)&&(uninstalled=ov.uninstalled);ov.versions&&typeof ov.versions=="object"&&(overrides=ov.versions)}catch{}function u(){_.mkdir(w.dirname(M("capabilities.json")),{recursive:!0}).then(()=>_.writeFile(M("capabilities.json"),JSON.stringify([...i.values()].sort((c,s)=>(c.order??99)-(s.order??99)),null,2),"utf8")).catch(()=>{})}let o={register(c){let s=_e(c);if(!s)return;if(uninstalled.includes(s.title)||uninstalled.includes(s.id))return;let ovv=overrides[s.title];ovv&&(s.version=ovv);let ex=null;for(let[id,old]of i){if(old.title===s.title){ex={id:id,old:old};break}}if(ex&&ex.id!==s.id){s={...s,id:ex.id,entryKey:ex.old.entryKey||s.entryKey}}i.set(s.id,s);u()},unregister(c){typeof c!="string"||!c||(i.delete(c),u())},list(){return[...i.values()].sort((c,s)=>(c.order??99)-(s.order??99))}};try{t.provide("workbenchCapabilities",o)}catch{}try{let c=t.webServer||t.get&&t.get("webServer");c&&typeof c.register=="function"&&r.push(c.register({kind:"prefix",path:"/api/workbench",handler:(s,a)=>{let h;try{h=new URL(s.url||"/","http://127.0.0.1")}catch{p(a,{error:"BAD_REQUEST",reason:"URL \u89E3\u6790\u5931\u8D25"});return}let g=s.method||"GET",m="/api/workbench",f=(h.pathname===m?"":h.pathname.slice(m.length+1)).split("/").filter(Boolean);if(f.length===1&&f[0]==="capabilities"&&g==="GET"){e.consume().then(l=>{if(!l.allowed){p(a,{error:"FEATURE_UNAVAILABLE",reason:l.message||"\u8BE5\u529F\u80FD\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u8054\u7CFB\u670D\u52A1\u5546"},403);return}p(a,{capabilities:o.list()})}).catch(()=>{p(a,{error:"FEATURE_UNAVAILABLE",reason:"\u8BE5\u529F\u80FD\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u8054\u7CFB\u670D\u52A1\u5546"},403)});return}if(f.length===2&&f[0]==="capabilities"&&f[1]==="register"&&g==="POST"){x(s).then(l=>{let d=null;try{d=JSON.parse(l)}catch{}let y=_e(d);if(!y){p(a,{error:"BAD_REQUEST",reason:"\u7F3A\u5C11\u5408\u6CD5 manifest\uFF08\u9700\u8981 id\uFF09"});return}o.register(y),p(a,{ok:!0,manifest:y})}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}if(f.length===2&&f[0]==="capabilities"&&f[1]==="unregister"&&g==="POST"){x(s).then(l=>{let d=null;try{d=JSON.parse(l)}catch{}let y=d&&typeof d.id=="string"?d.id:"";if(!y){p(a,{error:"BAD_REQUEST",reason:"\u7F3A\u5C11 id"});return}o.unregister(y),p(a,{ok:!0})}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="favorites"&&g==="GET"){we().then(l=>p(a,{favorites:l})).catch(()=>p(a,{favorites:[]}));return}if(f.length===1&&f[0]==="favorites"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}if((d&&d.action)==="toggle"&&d.market_id!=null){let k=await we(),N=k.findIndex(q=>q.market_id===d.market_id);if(N>=0)k.splice(N,1),await Se(k),p(a,{ok:!0,favorited:!1,favorites:k});else{let q={market_id:d.market_id,name:d.name||"",icon:d.icon||"",author:d.author||"",category:d.category||"",version:d.version||"",desc:d.desc||"",added_at:new Date().toISOString().slice(0,10)};k.unshift(q),await Se(k),p(a,{ok:!0,favorited:!0,favorites:k})}}else p(a,{error:"BAD_REQUEST",reason:"\u9700\u8981 action=toggle + market_id"})}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="market"&&g==="GET"){let l=h.searchParams.get("force")==="1";Ve(l).then(d=>p(a,d)).catch(d=>p(a,{ok:!1,error:String(d&&d.message||d)}));return}if(f.length===2&&f[0]==="market"&&f[1]==="config"&&g==="GET"){C().then(l=>p(a,{ok:!0,config:l})).catch(()=>p(a,{ok:!1}));return}if(f.length===1&&f[0]==="version-check"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}let r0=null;try{r0=await localVersionCheck(d,o,n)}catch(_e){r0=null}p(a,r0?Object.assign({ok:!0},r0):{ok:!0,latest:!1,reason:"no-local-version"})}).catch(l=>p(a,{ok:!1,error:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="reload"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}let rr=null;try{rr=await jt(n)}catch(_e){rr={ok:!1,error:String(_e&&_e.message||_e)}}p(a,rr)}).catch(l=>p(a,{ok:!1,error:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="install"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}if(!d){p(a,{error:"BAD_REQUEST",reason:"\u975E\u6CD5 JSON"});return}let _lc=null;try{_lc=await localVersionCheck(d,o,n)}catch(_e){_lc=null}if(_lc&&_lc.latest){p(a,{ok:!0,latest:!0,logs:[{step:"check",status:"done",message:"当前版本已是最新版本，未执行下载与升级"}],activation:{ok:!0,bundle:_lc.bundle||"",mode:"latest",application:"none",changed:!1,restartRequired:!1,from:_lc.installed,to:_lc.market}});return}let y=[],k=await Je(d,N=>y.push(N)),act=null;if(k&&k.ok){try{act=await qt(n,k)}catch(_e){act={ok:!1,error:String(_e&&_e.message||_e)}}}if(k.ok){let mt=k.manifest&&k.manifest.title;if(mt&&uninstalled.includes(mt))uninstalled=uninstalled.filter(x=>x!==mt);if(mt&&k.manifest.version)overrides[mt]=k.manifest.version;try{await _.writeFile(M("overrides.json"),JSON.stringify({uninstalled:uninstalled,versions:overrides}),"utf8")}catch{}if(k.bundleName==="@local/dsh-workbench"){const _fk={id:"workbench",title:"工作台",description:"能力包框架首页：我的工作台 / 我的收藏 / 工作台市场。",entryKey:"workbench",order:0,icon:(k.manifest&&k.manifest.icon)||"",category:(k.manifest&&k.manifest.category)||"",version:(k.manifest&&k.manifest.version)||""};o.register(_fk),p(a,{ok:!0,manifest:_fk,logs:y,activation:act,frameworkCard:!0})}else{o.register(k.manifest),p(a,{ok:!0,manifest:k.manifest,logs:y,activation:act})}}else p(a,{ok:!1,error:k.message,step:k.step,logs:y})}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="uninstall"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}let id=d&&typeof d.id=="string"?d.id:"",title=d&&typeof d.title=="string"?d.title:"";if(!id&&!title){p(a,{error:"BAD_REQUEST",reason:"缺少 id/title"});return}if(id==="workbench"||title==="工作台"){p(a,{ok:!1,error:"framework-protected",reason:"工作台框架自身不可卸载"});return}let bn=null;{let mm={kb:"dsh-raganything-kb",meeting:"dsh-meetai","policy-analysis":"@local/policy-analysis","huiwen-ppt":"@local/huiwen-ppt","huibao-bot":"@local/huibao-bot","zhihui-project":"@local/zhihui-project","zhihui-opportunity":"@local/zhihui-opportunity"};if(id&&mm[id])bn=mm[id];else if(title&&mm[title])bn=mm[title];else{let pm=null;try{pm=n&&n.get?n.get("pluginManager"):null}catch(z){}if(pm&&typeof pm.listBundles=="function"){try{let bs=await pm.listBundles();for(let b of(Array.isArray(bs)?bs:[])){if(b&&b.name===id){bn=b.name;break}if(id)for(let r of(b&&b.rows||[])){if(r&&r.rowId===id){bn=b.name;break}}if(bn)break}}catch(z){}}}}let bres=null;if(bn){let pm=null;try{pm=n&&n.get?n.get("pluginManager"):null}catch(z){}if(pm&&typeof pm.setBundleEnabled=="function"){try{bres=await pm.setBundleEnabled(bn,false)}catch(z){bres={error:String(z&&z.message||z)}}}else bres={error:"plugin-manager-unavailable"}}if(id)o.unregister(id);if(title&&!uninstalled.includes(title)){uninstalled.push(title);try{await _.writeFile(M("overrides.json"),JSON.stringify({uninstalled:uninstalled,versions:overrides}),"utf8")}catch{}}let rst=false;if(bn&&bres&&bres.application==="restart-required"){try{let ch=qe("sh",["-c","sleep 2; sudo -n systemctl restart dsh-web >/dev/null 2>&1"],{detached:true,stdio:"ignore"});ch.unref();rst=true}catch{}}p(a,{ok:!0,bundle:bn,bundleResult:bres,restartRequired:!!(bres&&bres.application==="restart-required"),restarting:rst})}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}if(f.length===1&&f[0]==="install-records"&&g==="GET"){X().then(l=>p(a,{records:l})).catch(()=>p(a,{records:[]}));return}if(f.length===1&&f[0]==="maker"&&g==="POST"){x(s).then(async l=>{let d=null;try{d=JSON.parse(l)}catch{}let y=await ze(d||{},n);p(a,y)}).catch(l=>p(a,{error:"BAD_REQUEST",reason:String(l&&l.message||l)}));return}p(a,{error:"NOT_FOUND",reason:"\u63A5\u53E3\u4E0D\u5B58\u5728"})}}))}catch{}return o.register({id:"workbench",title:"\u5DE5\u4F5C\u53F0",description:"\u80FD\u529B\u5305\u6846\u67B6\u9996\u9875\uFF1A\u6211\u7684\u5DE5\u4F5C\u53F0 / \u6211\u7684\u6536\u85CF / \u5DE5\u4F5C\u53F0\u5E02\u573A\u3002",entryKey:"workbench",order:0}),()=>{for(let c of r)try{typeof c=="function"&&c()}catch{}}}var Mt={inject:["webServer","agents","agentDefaultModel"],apply:Ye};export{Ye as apply,Mt as default,Lt as inject};
