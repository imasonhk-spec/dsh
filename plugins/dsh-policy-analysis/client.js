/**
 * @local/policy-analysis —— 政策解读插件 Client 半（浏览器动态插件）
 *
 * 契约（SPEC.md "Client 半（client.js）契约"）：
 * - 无构建步骤、无 JSX、无 npm 导入（工厂内只 require('react')）；全部 React.createElement（别名 h）。
 * - 骨架固定：window.__ModuleLoader__.load({ id, factory })；apply 内注册 locale 字典与两个 slot。
 * - 能力包契约（CAPABILITY-PACK-API v1.0）：main key 与 sidebar.panellist id 一律 `cap:<id>` 前缀；
 *   另注册 `cappacks:open-<id>` 打开事件桥（工作台首页「打开」/ 子菜单派发）。
 * - 组件收到渲染器注入的 t（注册项声明 locale: NS 后由 ui-renderer 注入，见 scoped-slots.tsx standardKit）。
 * - 样式全部内联 + 组件根内一个 <style> 标签（pa-* 前缀类，随组件卸载移除）。
 * - 界面风格与 DSH「设置-通用设置-外观」联动：颜色走 DSH 设计令牌（--dsw-alias-*）与 pa-* 双主题
 *   自定义属性（body[data-ds-dark-theme] 自动深浅切换），正文阅读字号跟随 --dsh-content-font-size；
 *   令牌缺失时回退原型 gov 蓝浅色配色。
 * - 无 alert()、无定时器、无全局监听（两个 window 监听：打开事件桥 + 侧栏折叠/返回主页桥，apply 清理函数移除）；外链一律 target="_blank" rel="noopener noreferrer"。
 * - 演示场景 A/B/C 数据与 UI 原型 agent.html 一致，并带"演示样例"徽标；
 *   任务简报生成器是真实功能（剪贴板 + 粘贴指引），简报格式按 SPEC 模板动态填充。
 * - 附件上传（真实功能）：输入框左侧「上传附件」按钮（隐藏 file input，多选，accept 白名单
 *   .pdf/.docx/.xlsx）+ 中栏整体拖拽上传（仅拦截 Files 类型拖拽，不影响文本拖放）；
 *   经 POST /api/policy-analysis/upload 落盘本机 DSH 附件目录（~/.dsh/policy-analysis/uploads），
 *   上传成功以附件 chips 展示（文件名/大小/移除），附件名+绝对路径写入任务简报「附件清单」；
 *   上传不等于公开性确认：绝不因上传改变门禁状态（publicConfirmed 仅由「智能问答」页手动勾选；
 *   文件解析页自 PA-GATEHINT-20261019 起只作提示，不再列出「公开性确认」步骤）。
 * - 三页签工作台：文件解析（上传→开始解析→SSE 过程/结果→归档）/ 解析归档（筛选查询/查看/
 *   @文件问答/删除）/ 智能问答（v1.3.0 新增）。三个视图全部常挂载，用 style.display
 *   切换（绝不条件卸载，避免丢状态/断 SSE）；门禁 state（publicConfirmed/role/mode/source）跨视图共享。
 * - v1.3.0：页签条改为左侧竖向导航（品牌块 + v1.3.0 徽标 + 文件解析/解析归档/智能问答 +
 *   底部公开性状态 chip，非交互）；新增智能问答视图（本地会话列表 + POST /api/policy-analysis/qa
 *   SSE 流式问答 + 📎/拖拽上传附件 + 一键归档至解析归档）；解析归档「@文件问答」改为跳转智能问答
 *   并带入解析文件；原「任务简报」三栏控制台自渲染树移除（代码 RESERVED 保留，未引用不执行）。
 * - v1.3.1：文件解析视图改上下布局（门禁行 → 上传附件/开始解析操作块 → 解析结果面板 → 解析过程
 *   窗口在页面下方，固定高度自动滚底）；智能问答的会话管理上收至左侧导航二级目录（qa 激活时展开：
 *   ＋新建会话 + 历史会话列表，缩进小号、超高分区内滚），视图内改为纯会话框（全宽聊天列）；
 *   顶栏去重（移除品牌方标与「政策解读 政务辅助 · Agent v1.0」标题，变为细条、仅保留右侧胶囊）。
 * - v1.3.2：文件解析门禁行移除角色/模式/来源下拉（请求固定缺省 FIXED_*：政策解读缺省
 *   角色/模式 + 严禁联网兜底的保守来源；公开性 checkbox 保留）；解析结果支持「下载 Word」
 *   （POST /parse/docx → Blob 下载，GB/T 9704-2012 公文格式小注）+ 解析归档行内/抽屉「下载 Word」
 *   （GET /records/:id/docx）；解析跨页恢复（sessionStorage 'pa-active-parse' 登记 jobId/recordId，
 *   面板重挂载时 GET /records/:id 同步：parsing → 重连 /parse/events SSE 重放补齐；done/failed →
 *   载入结果；404/异常 → 「解析中断」并清除标记；新开解析覆盖、删除记录清除）。
 * - v1.4.2：解析归档每条记录支持「编辑」——行内与查看抽屉均可打开编辑对话框
 *   （解析标题/解析文件名称/备注/解析结果四字段；GET /records/:id 预填全文，
 *   POST /records/:id/edit 保存；解析进行中仅锁「解析结果」字段）。
 * - v1.5.2 修复：智能问答视图内左侧「问答历史」卡（aside.pa-history，与左侧导航二级目录
 *   功能重复）整块移除，问答页改为单列全宽聊天列（.pa-qa-grid 单列）；会话列表 / 新建会话 /
 *   删除一律由左侧导航「智能问答」二级目录承担（完成 v1.3.1「视图内改为纯会话框」的收尾）。
 * - v1.5.6-qats.2（PA-GATEHINT-20261019）：「公开性确认」不再作为独立步骤列出——文件解析页
 *   去掉步骤卡与其勾选框，改为步骤列表上方一行浅色提示（仅提示：只受理已完全公开材料、上传
 *   不等于授权）；步骤重编号为 1 上传政策文件 / 2 解析配置；解析页视为已确认，开始解析与文件
 *   chip「源文件预览」不再被 publicConfirmed 阻断（文件为空/任务进行中仍阻断）；智能问答页
 *   公开性确认条与「源文件预览确认」弹窗（读取正文前显式确认，底线 1）保持原样。
 */
window.__ModuleLoader__.load({
  id: '@local/policy-analysis',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'policyAnalysis';
    // 能力包 manifest.id 与 entryKey（CAPABILITY-PACK-API：id kebab-case，entryKey 以 cap: 前缀）
    const PACK_ID = 'policy-analysis';
    const PANEL_ID = 'cap:policy-analysis';
    const OPEN_EVENT = 'cappacks:open-policy-analysis';
    const SIDEBAR_EVENT = 'pa:policy-analysis-sidebar';
    // 版本徽标（左侧导航品牌块显示；随功能版本更新）
    const VERSION = 'v1.5.6-qats.2'; /* PA-GATEHINT-20261019 */
    /* v1.3.2 固定缺省（文件解析/智能问答界面均不再暴露角色/模式/来源选择，一处定义两处使用）：
     * 政策解读缺省执行角色与分析模式 + 「仅知识库」保守来源（底线：严禁联网兜底；
     * QA 附件经 policy_extract 读文件、无附件为模型知识作答，检索行为受指令约束）。 */
    const FIXED_ROLE = 'policy_research';
    const FIXED_MODE = 'policy_search';
    const FIXED_SOURCE = 'knowledge_only';
    /* v1.3.2 跨页恢复标记的 sessionStorage key（记录进行中解析 jobId/recordId/fileName/startedAt） */
    const ACTIVE_PARSE_KEY = 'pa-active-parse';
    /* paBg-20261005：智能问答后台续跑恢复（宿主在客户端断开后仍自主跑完并落库） */
    const QA_RECOVERY_KEY = 'pa-qa-recovery-v1'; // 与既有 sessionStorage key 同名，兼容旧回执
    const QA_RECOVER_POLL_MS = 2500;             // 恢复轮询间隔（毫秒）
    const QA_RECOVER_POLL_MAX = 300;             // 轮询上限 ≈12.5 分钟（覆盖宿主 10 分钟硬超时）

    /* ════════ 调色板（gov 蓝，参照原型 tailwind 配置；浅色回退基准，见下方 T 的 var() 回退值） ════════ */
    const C = {
      gov900: '#09213a', gov800: '#0e3459', gov700: '#134879', gov600: '#1a5f9e',
      gov100: '#e1ecf5', gov50: '#f0f5fa', accent: '#4da3e0',
      slate900: '#0f172a', slate800: '#1e293b', slate700: '#334155', slate600: '#475569',
      slate500: '#64748b', slate400: '#94a3b8', slate300: '#cbd5e1', slate200: '#e2e8f0',
      slate100: '#f1f5f9', slate50: '#f8fafc', white: '#ffffff',
      emerald700: '#047857', emerald800: '#065f46', emerald500: '#10b981',
      amber700: '#b45309', amber900: '#78350f', amber500: '#f59e0b',
      blue700: '#1d4ed8', blue900: '#1e3a8a',
    };

    /* ════════ 语义令牌（与 DSH 设置-通用设置-外观联动） ════════
     * 表面/边框/文字直接取 DSH 设计令牌 --dsw-alias-*（body[data-ds-dark-theme] 自动深浅切换，
     * 跟随 外观 的 浅色/深色/跟随系统，注册主题亦生效）；
     * 品牌强调与语义色走 --pa-* 自定义属性（CSS_TEXT 按双主题定义，深色下换更亮的蓝/更深的底）；
     * 正文阅读字号跟随 外观 的字号设置 --dsh-content-font-size（12-17px）。
     * 每处 var() 均带浅色回退值，令牌缺失时保持原型外观。 */
    const T = {
      bgRoot:'#f4f6f9',surface:'#ffffff',surface2:'#f8fafc',border:'#e6eaf1',borderSub:'#e6eaf1',
      text1:'#2a3342',text2:'#5f6b7e',text3:'#8b96a8',accent:'#2563eb',accentStrong:'#1d4ed8',accentInk:'#fff',
      accentSoft:'#eaf1ff',accentSoftBorder:'#d9e5ff',accentActive:'#eaf1ff',topbar:'#fff',topbarInk:'#2a3342',topbarMuted:'#5f6b7e',topbarPillBg:'#f8fafc',topbarPillBorder:'#e6eaf1',
      userBubble:'#eaf1ff',warnBg:'#fff8e8',warnBorder:'#f4e1b8',warnText:'#a16b13',warnIcon:'#a16b13',warnAvatar:'#a16b13',
      success:'#16a34a',successSoft:'#e8f7ec',successBorder:'#c8eacc',successText:'#15803d',successBanner:'#e8f7ec',infoBg:'#eaf1ff',infoBorder:'#d9e5ff',infoInk:'#2563eb',
      codeBg:'#111b2e',codeText:'#afc4e8',avatarMe:'#eaf1ff',avatarMeText:'#2563eb',contentFont:'14px',
    };

    /* ════════ 枚举（与 Host 半统一） ════════ */
    const ROLES = [
      { key: 'business_execution', labelKey: 'roleBusiness' },
      { key: 'legal_review', labelKey: 'roleLegal' },
      { key: 'leadership', labelKey: 'roleLeadership' },
      { key: 'policy_research', labelKey: 'roleResearch' },
    ];
    const MODES = [
      { key: 'citation_verification', labelKey: 'modeCitation' },
      { key: 'legality_review', labelKey: 'modeLegality' },
      { key: 'version_comparison', labelKey: 'modeVersion' },
      { key: 'policy_search', labelKey: 'modeSearch' },
    ];
    const ROLE_LABEL = {
      business_execution: 'roleBusiness', legal_review: 'roleLegal',
      leadership: 'roleLeadership', policy_research: 'roleResearch',
    };
    const MODE_LABEL = {
      citation_verification: 'modeCitation', legality_review: 'modeLegality',
      version_comparison: 'modeVersion', policy_search: 'modeSearch',
    };
    const ROLE_DEFAULT_MODE = {
      policy_research: 'policy_search',
      business_execution: 'citation_verification',
      leadership: 'version_comparison',
      legal_review: 'legality_review',
    };

    /* ════════ locale 字典（zh 全量 / en 对应，key 集合一致） ════════ */
    const ZH = {
      panel: '政策解读',
      appTitle: '政策解读',
      navWorkspace: '政策工作区',
      appSub: '政务辅助 · Agent v1.0',
      brandMark: '政',
      backHome: '返回主页',
      envPill: '运行环境：本机 DSH',
      gatePill: '门禁原则：仅受理公开材料 · 严格单源检索',
      roleLabel: '执行角色预设',
      roleBusiness: '业务执行（办理依据）',
      roleLegal: '法规审核（效力审查）',
      roleLeadership: '领导决策（一页纸速览）',
      roleResearch: '政策研究（背景脉络）',
      modeLabel: '分析模式',
      modeCitation: '引用核验',
      modeLegality: '合法合规性审查',
      modeVersion: '版本比较',
      modeSearch: '政策检索',
      sourceLabel: '数据来源（二选一 · 禁混用）',
      sourceWebTitle: '仅联网检索',
      sourceWebDesc: '中国政府网 / 省市区官方公报与政府门户',
      sourceRagTitle: '仅本地知识库',
      sourceRagDesc: '硬过滤 DSH「政策资料/」目录，禁止全库检索',
      ragWarning: '⚠️ 提示：当前 DSH 政策目录未挂载新文件，如无匹配将明确返回“暂无资料”，不会自动联网补全。',
      cliLabel: '合规检查命令',
      cliCmd: 'python3 policy_agent.py preflight --public-confirmed --source',
      safetyLine1: 'AI 辅助结果不可作为法定公文依据',
      safetyLine2: '重要决议需人工比对原件',
      scenarioLabel: '快捷演练场景：',
      scenarioA: '场景 A：龙岗区产业扶持引用核验',
      scenarioB: '场景 B：合规审查权限冲突排查',
      scenarioC: '场景 C：知识库空库阻断示范',
      resetBtn: '重置会话',
      avatarAgent: 'Agent',
      avatarMe: '我',
      avatarGate: '门禁',
      welcomeTitle: '您好，我是龙岗区政策解读助手。',
      welcomeLead: '为保障政务数据安全，在开始解读前，请确认：',
      welcomeItem1Pre: '上传或待分析的文件必须属于',
      welcomeItem1Strong: '经官方确认公开的材料',
      welcomeItem1Post: '（非涉密、非敏感、非内部流转公文）。',
      welcomeItem2Pre: '请在左侧明确限定',
      welcomeItem2Strong: '单一检索来源',
      welcomeItem2Post: '（仅联网或仅知识库）。',
      gateChipPending: '当前门禁状态：待确认公开性与任务目标',
      gateChipReady: '当前门禁状态：已确认公开材料，可生成任务简报',
      confirmPre: '我已确认待分析材料及附带信息属于',
      confirmStrong: '公开材料',
      confirmPost: '，不含涉密或内部敏感信息',
      formatHint: '支持格式：文字型 PDF、DOCX、XLSX（无公式执行）',
      uploadBtn: '上传附件',
      uploadBtnTitle: '选择文件上传（PDF / DOCX / XLSX，可多选；也可把文件直接拖入对话区）',
      uploading: '上传中…',
      dropHint: '松开鼠标，上传附件（支持 PDF / DOCX / XLSX）',
      uploadNote: '附件仅暂存到本机 DSH 附件目录；上传不等于公开性确认，读取正文仍需先通过门禁。',
      uploadUnsupported: '不支持的文件类型（仅 .pdf / .docx / .xlsx）：',
      uploadTooLarge: '文件超过 30MB 上限：',
      uploadFail: '上传失败：',
      uploadStaleHost: '服务端未返回上传结果——Host 半上传路由仍是旧版本，请重启 DSH（或重新应用插件 plugin_manager install_bundle）后重试',
      removeFile: '移除附件',
      inputPlaceholder: '输入任务，如：帮我分析解读这份材料，核验引用的龙岗产业政策依据...',
      genBriefing: '生成任务简报',
      briefingTitle: '任务简报',
      briefingLine1: '【政策解读任务】',
      briefingLine2: '1. 公开性确认：我确认本次待分析材料为已完全公开的政策文件，不含内部、敏感或涉密信息。',
      briefingLine3: '2. 唯一检索来源：{source}',
      briefingLine4: '3. 角色与模式：{role}（{roleKey}）· {mode}（{modeKey}）',
      briefingLine5: '4. 任务描述：{task}',
      briefingLine6: '5. 附件清单：{files}',
      briefingExec: '执行要求：先调用 policy_preflight 完成门禁校验（allowed:true 才可继续）；附件读取一律用 policy_extract；每张证据卡用 policy_evidence_check 校验字段；“仅知识库”模式检索只能用 rag_query 且 folders 硬过滤 [“政策资料”]，目录无果必须回复“政策知识库暂无资料”且严禁联网；“仅联网”模式只查政府官网/公报/人大及制定机关官网，无果请我提供官方链接；最终按 C-xxx 结论 + E-xxx 证据卡结构输出，全部标注“待人工复核”。',
      copyBriefing: '复制简报',
      copyOk: '已复制到剪贴板',
      copyFail: '复制失败，请手动全选文本复制',
      sendToSession: '发送到会话',
      sendStateBusy: '正在写入会话输入框…',
      sendStateOk: '已发送到会话，请切到会话页查看回答',
      sendStateFail: '发送失败：未找到会话输入框（请确认当前有可用会话页）',
      pasteHint: '点击「发送到会话」一键发送，或复制简报后粘贴到会话输入框；AI 将调用 policy_preflight / policy_extract / policy_evidence_check 完成门禁与解读。',
      askPlaceholder: '输入问题，AI 将基于已上传附件直接解答（回车发送）',
      askBtn: '发送提问',
      askBtnBusy: '回答中…',
      askStop: '停止',
      askGateNeed: '请先勾选下方「已确认材料属于公开材料」再提问',
      askToolCalling: '正在调用',
      askThinkingLabel: '思考过程',
      askPendingReview: 'AI 生成内容仅供参考，政策适用请以官方原文为准（待人工复核）',
      askErrorPrefix: '问答失败：',
      askSessionId: '会话',
      taskPlaceholder: '（未填写任务描述，请补充）',
      filesNone: '无',
      sourceBriefWeb: '仅联网（web_only）',
      sourceBriefRag: '仅本地知识库（knowledge_only）',
      gateTitle: '安全前置核验未通过',
      gateQuestion: '请先确认：该材料是否为已完全公开的政策文件？（系统仅受理公开材料；上传行为本身不等于公开确认）',
      demoBadge: '演示样例',
      preflightDoneRole: 'Preflight 校验完毕: [allowed: true | source: {source} | role: {role}]',
      preflightDoneRag: 'Preflight 校验完毕: [allowed: true | source: knowledge_only | folders: [“政策资料”]]',
      repATitle: '政策依据核验与办理条件对照报告',
      repASub: '任务模式：引用核验 (citation_verification) · 范围：深圳市及龙岗区官方现行文件',
      repATag: '业务执行视图',
      repDirectLabel: '【直接答复与适用建议】',
      repADirect: '送审材料中引用的申报奖励条款共 2 项。经核验，关于“国家高新技术企业落户奖励”的引用与现行政策一致，符合受理标准；关于“现代物流补贴”引用的原政策已于去年底废止，建议经办人退回并督促修改依据。',
      repBindLabel: '【逐条结论与证据绑定】（点击编号可在右侧检视证据）',
      c001Title: '国高企业落户补贴 20 万元引用合规有效',
      c001Desc: '条款文字与原文件第十三条高度吻合，且文号与制定机关匹配无误。',
      c002Title: '重点仓储物流 300 万元补贴引用了失效旧规',
      c002Desc: '送审件所引《深龙规〔2021〕2号》已被新规废止，不可作为直接审批依据。',
      viewEvidence: '查看 {eid} 证据',
      nextActionLabel: '待人工核实事项 (Next Action)',
      repANext: '请核实申报企业是否已在龙岗区统计核算库中实际纳统，该限定条件属于现场受理审查要点，官方原文要求需区统计局会核。',
      repBTitle: '行政规范性文件合法合规性审查分析',
      repBSub: '审查维度：制定权限、程序依据、上位法抵触排查',
      repBTag: '法规审核视图',
      c003Title: '重大行政决策程序符合上位省令要求',
      c003Desc: '文稿中关于合法性审查必经环节的设定，严格遵照广东省政府第288号令规定。',
      repCTitle: '执行结果：政策知识库暂无资料',
      repCBody: '在硬过滤限定目录 政策资料/ 下执行矢量与关键词混合检索，未检索到与《制造业数字化转型补助》相关的受控入库文件。',
      repCMechLabel: '合规机制说明：',
      repCMech: '系统遵照“仅知识库”模式铁律，未越权读取其他科室业务目录，亦未擅自联网检索外发。请联系系统管理员将经审核批准公开的政策 PDF 原件放入指定文件夹后再行分析。',
      evidenceTitle: '核验证据卡 (Evidence Card)',
      evidenceSub: '结论 C-xxx 唯一绑定官方溯源凭据',
      badgeDefault: '官方 A 级来源',
      evidenceEmptyPre: '请点击报告中的任一 ',
      evidenceEmptyStrong: 'C-xxx',
      evidenceEmptyPost: ' 结论，查看对应证据与官方链接',
      evidenceNoneScenario: '当前检索未产生证据卡片',
      matchedLabel: '匹配结论',
      docLabel: '文件全称与文号',
      quoteLabel: '官方逐字引文（不可篡改）',
      organLabel: '发文机关',
      effectiveLabel: '生效日期',
      urlLabel: '官方 HTTPS 原文查验',
      verifyOk: '已与官方政府公报系统数据对齐',
      verifyWarn: '存在版本废止冲突，需人工盖章确权',
      validityLabel: '效力状态核验：',
      validityNone: '—',
      markVerified: '标记已人工复核',
      markedVerified: '经办人员已核对原件',
      markedNote: '（本地记录，仅本次会话有效）',
      /* ── 三页签工作台（文件解析 / 解析归档记录 / 任务简报）新增文案 ── */
      tabParse: '文件解析',
      tabRecords: '解析归档',
      tabConsole: '任务简报',
      parseGateCheck: '我确认本次材料为已完全公开的政策文件',
      parseRoleShort: '角色',
      parseModeShort: '模式',
      parseSourceShort: '来源',
      parseGateNeed: '请先勾选「我确认本次材料为已完全公开的政策文件」再开始解析',
      parseUploadLabel: '上传文件',
      parseFileList: '已上传文件（{n}）',
      parsePathLabel: '服务器路径（即文件路径）',
      parseCopyPath: '复制路径',
      parseNoFile: '请先上传并选择一个文件（支持 .pdf / .docx / .xlsx）',
      parsePickHint: '点击按钮选择文件，或把文件直接拖入本页（浏览器拿不到本地原始路径，文件路径以服务器落盘路径为准）',
      parseStartBtn: '开始解析',
      parseStopHint: '已停止接收解析进度；服务端将继续完成解析并自动写入归档记录',
      parseLogTitle: '解析过程',
      parseLogEmpty: '等待解析任务…',
      parseLogStart: '开始解析：',
      parseLogJob: '解析任务已创建，jobId：',
      parseLogRecord: '记录ID：',
      parseLogDone: '解析完成，结果已生成',
      parseToolCalling: '调用工具',
      parseThinking: '思考中',
      parseResultTitle: '解析结果',
      parseResultEmpty: '暂无解析结果，请先选择文件并点击「开始解析」',
      parseStatusStreaming: '解析中',
      parseStatusDone: '已完成',
      parseStatusError: '失败',
      parseReqFail: '解析请求失败：',
      parseCopy: '复制',
      parseResultCopyOk: '已复制解析结果',
      parseAgain: '重新解析',
      parseArchive: '归档',
      archTitle: '归档解析结果',
      archNameLabel: '解析标题',
      archRemarkLabel: '备注',
      archRemarkPlaceholder: '选填：归档备注',
      archCancelBtn: '取消',
      archConfirmBtn: '确认归档',
      archBusy: '归档中…',
      archOk: '已归档，可在「解析归档记录」页签查看',
      archFail: '归档失败：',
      recFilterQ: '内容',
      recFilterQPlaceholder: '标题/文件名/备注/结果关键字',
      recFilterFrom: '日期',
      recFilterTo: '至',
      recQueryBtn: '查询',
      recResetBtn: '重置',
      recColSeq: '序号',
      recColDate: '解析日期',
      recColTitle: '解析标题',
      recColFile: '解析文件名称',
      recColRemark: '备注',
      recColActions: '操作',
      recEmpty: '暂无解析记录',
      recLoading: '加载中…',
      recTotal: '共 {n} 条',
      recStatusParsing: '解析中',
      recStatusDone: '已完成',
      recStatusFailed: '失败',
      recStatusArchived: '已归档',
      recBtnFileQa: '@文件问答',
      recBtnView: '查看',
      recBtnDelete: '删除',
      recDeleteConfirm: '确认删除？',
      recDelOk: '已删除该解析记录',
      recDelFail: '删除失败：',
      recLoadFail: '记录加载失败：',
      /* ── v1.4.2 记录编辑（解析归档行内/抽屉 → 编辑对话框） ── */
      recBtnEdit: '编辑',
      editModalTitle: '编辑解析记录',
      editFileLabel: '解析文件名称',
      editResultLabel: '解析结果',
      editResultParsingHint: '解析进行中，暂不能编辑解析结果',
      editConfirmBtn: '保存修改',
      editBusy: '保存中…',
      editOk: '已保存修改',
      editFail: '保存失败：',
      editLoadFail: '记录详情载入失败：',
      recDrawerClose: '关闭',
      recDrawerErrorLabel: '失败原因',
      recJumpBusy: '正在定位会话输入框…',
      recJumpOk: '已写入会话草稿，请在输入框补完问题后自行发送',
      recJumpFail: '未找到会话输入框（请确认当前有可用会话页）',
      recJumpDraft1: '【文件问答】请针对政策文件《{title}》进行问答解读。',
      recJumpDraft2: '文件名：{name}',
      recJumpDraft3: '服务器路径：{path}',
      recJumpDraft4: '该材料已确认为公开材料；请先调用 policy_preflight 完成门禁校验，再按需用 policy_extract 读取正文后回答。',
      recJumpDraft5: '我的问题：',
      /* ── v1.3.0 左侧导航 + 智能问答 ── */
      tabQa: '智能问答',
      navPublicOk: '已确认公开材料',
      navPublicPending: '公开性未确认',
      qaNewBtn: '新建会话',
      qaNewSessionHint: '已切换到新会话，请输入问题',
      qaNewSession: '新会话',
      qaSessionsTitle: '历史会话',
      qaSessionsEmpty: '暂无历史会话',
      qaSessionCount: '共 {n} 个会话',
      qaSessionsLoadFail: '会话列表加载失败：',
      /* paHist-20261019：历史会话「更多操作」 */
      qaMoreActions: '更多操作', qaPinSession: '置顶', qaUnpinSession: '取消置顶', qaRenameSession: '重命名',
      qaArchiveSession: '归档', qaUnarchiveSession: '取消归档', qaDeleteSession: '删除',
      qaArchivedTitle: '归档会话', qaArchivedEmpty: '暂无归档会话', qaBackHistory: '返回历史会话',
      qaPinOk: '已置顶', qaUnpinOk: '已取消置顶', qaRenameOk: '已重命名', qaRenameEmpty: '会话名称不能为空',
      qaArchiveOk: '已归档', qaUnarchiveOk: '已取消归档', qaMoreFail: '操作失败：',
      qaSessionOpenFail: '会话加载失败：',
      qaSessionSwitchBusy: '回答生成中，请稍后再切换会话',
      qaReloadBtn: '刷新',
      qaDelConfirm: '确认删除该会话？',
      qaDelOk: '会话已删除',
      qaDelFail: '删除失败：',
      qaMsgCount: '{n} 条消息',
      qaEmptyTitle: '暂无消息',
      qaEmptyHint: '向政策解读助手提问；可把文件拖入对话区或点击 📎 上传（PDF / DOCX / XLSX）',
      qaInputPlaceholder: '输入问题，Enter 发送，Shift+Enter 换行…',
      qaSendBtn: '发送',
      qaSendBtnBusy: '回答中…',
      qaSendFail: '发送失败：',
      qaGateNeed: '请先勾选「我确认本次材料为已完全公开的政策文件」再提问',
      qaThinkingPlaceholder: '思考中…',
      qaStreamError: '回答失败：',
      qaAttachLabel: '本次提问附件',
      qaFromRecord: '来自解析归档',
      qaArchiveBtn: '一键归档',
      qaArchiving: '归档中…',
      qaArchiveOk: '已归档为解析归档记录 #{seq}',
      qaCopyAnswer: '复制回答',
      qaClearBtn: '清空',
      qaJumpOk: '已带入文件，请在智能问答中提问',
      qaJumpOkNoFile: '已切换到智能问答，请在输入框提问',
      /* ── v1.3.2 Word 下载（GB/T 9704-2012 公文格式） + 解析跨页恢复 ── */
      parseDocxBtn: '下载 Word',
      parseDocxBusy: '生成中…',
      parseDocxNote: '下载为 GB/T 9704-2012 公文格式 Word 文档',
      parseDocxOk: 'Word 文档已生成，开始下载',
      parseDocxFail: '下载失败：',
      parseDocxDefaultTitle: '解析结果',
      recBtnDownload: '下载',
      parseInterrupted: '解析中断',
      parseResumeFile: '恢复解析文件：',
      parseResumeParsing: '检测到进行中的解析，已重连事件流…',
      parseResumeDone: '上次解析已完成，结果已载入',
      /* ── v1.4.0 在线查看 + 可选模型 ── */
      recDrawerTabReport: '解读报告',
      recDrawerTabSource: '源文件预览',
      recDrawerLoading: '正在加载解析记录…',
      recDrawerLoadFail: '记录详情加载失败：',
      recDrawerRaw: '原文',
      recDrawerFormatted: '格式化',
      recDrawerSourceNone: '该记录没有关联的解析源文件',
      recDrawerSourceNote: 'PDF 原样内嵌查看；DOCX/XLSX 按提取文本生成在线预览，版式与原件可能有差异。',
      recDrawerSourceOpen: '新窗口打开',
      recDrawerSourceLoadFail: '源文件加载失败，请尝试新窗口打开',
      parseChipPreview: '预览',
      previewTitle: '源文件在线预览',
      previewGateNeed: '请先勾选「公开材料确认」后再在线查看文件内容',
      previewClose: '关闭',
      previewNewWin: '新窗口打开',
      qaModelLabel: '模型',
      qaModelDefaultOption: '跟随系统默认',
      qaModelLoading: '模型列表加载中…',
      qaModelFail: '模型列表不可用，将使用系统默认模型',
      qaModelDefaultSuffix: '（默认）',
      qaModelSwitchNote: '切换后下次提问生效，会话上下文保留',
      qaModelRetry: '重试',
    };

    const EN = {
      panel: 'Policy Analysis',
      appTitle: 'Policy Analysis',
      navWorkspace: 'Policy workspace',
      appSub: 'Gov Assistant · Agent v1.0',
      brandMark: '政',
      backHome: 'Back to Home',
      envPill: 'Runtime: local DSH',
      gatePill: 'Gate rules: public materials only · strict single-source search',
      roleLabel: 'Role Presets',
      roleBusiness: 'Business Execution (handling basis)',
      roleLegal: 'Legal Review (validity check)',
      roleLeadership: 'Leadership (one-page brief)',
      roleResearch: 'Policy Research (background)',
      modeLabel: 'Analysis Mode',
      modeCitation: 'Citation Verification',
      modeLegality: 'Legality & Compliance Review',
      modeVersion: 'Version Comparison',
      modeSearch: 'Policy Search',
      sourceLabel: 'Data Source (either one · no mixing)',
      sourceWebTitle: 'Web only',
      sourceWebDesc: 'Government portals & official gazettes (national/provincial/municipal)',
      sourceRagTitle: 'Local knowledge base only',
      sourceRagDesc: 'Hard-filtered to the DSH "政策资料/" folder; full-library search disabled',
      ragWarning: '⚠️ Note: no new files are mounted in the DSH policy folder; if nothing matches, the system will explicitly return "no data" and will NOT fall back to the web.',
      cliLabel: 'Compliance check command',
      cliCmd: 'python3 policy_agent.py preflight --public-confirmed --source',
      safetyLine1: 'AI-assisted results are not a basis for official documents',
      safetyLine2: 'Key decisions require manual comparison with originals',
      scenarioLabel: 'Demo scenarios:',
      scenarioA: 'Scenario A: Longgang industry citation check',
      scenarioB: 'Scenario B: compliance conflict scan',
      scenarioC: 'Scenario C: empty knowledge-base block',
      resetBtn: 'Reset session',
      avatarAgent: 'Agent',
      avatarMe: 'Me',
      avatarGate: 'Gate',
      welcomeTitle: 'Hello, I am the Longgang policy interpretation assistant.',
      welcomeLead: 'For government data security, please confirm before we start:',
      welcomeItem1Pre: 'Materials to upload or analyze must be ',
      welcomeItem1Strong: 'officially confirmed public materials',
      welcomeItem1Post: ' (not classified, sensitive, or internal documents).',
      welcomeItem2Pre: 'Please limit the search to a ',
      welcomeItem2Strong: 'single data source',
      welcomeItem2Post: ' (web only, or knowledge base only).',
      gateChipPending: 'Gate status: awaiting public-material confirmation and task goal',
      gateChipReady: 'Gate status: public materials confirmed, briefing ready to generate',
      confirmPre: 'I confirm the materials and attached information are ',
      confirmStrong: 'public materials',
      confirmPost: ' without classified or internal sensitive content',
      formatHint: 'Supported: text-based PDF, DOCX, XLSX (no formula execution)',
      uploadBtn: 'Attach files',
      uploadBtnTitle: 'Choose files to attach (PDF / DOCX / XLSX, multiple allowed; or drag files into the chat area)',
      uploading: 'Uploading…',
      dropHint: 'Drop files to attach (PDF / DOCX / XLSX)',
      uploadNote: 'Files are staged in the local DSH attachments folder only; uploading does not constitute public confirmation — reading contents still requires the gate.',
      uploadUnsupported: 'Unsupported file type (only .pdf / .docx / .xlsx): ',
      uploadTooLarge: 'File exceeds the 30MB limit: ',
      uploadFail: 'Upload failed: ',
      uploadStaleHost: 'the server did not return an upload result — the host-side upload route is still the old version; restart DSH (or re-apply the plugin via plugin_manager install_bundle) and retry',
      removeFile: 'Remove attachment',
      inputPlaceholder: 'Enter a task, e.g. analyze this material and verify the cited Longgang industry policy basis...',
      genBriefing: 'Generate task briefing',
      briefingTitle: 'Task Briefing',
      briefingLine1: '[Policy Interpretation Task]',
      briefingLine2: '1. Public confirmation: I confirm the materials for this analysis are fully public policy documents with no internal, sensitive, or classified content.',
      briefingLine3: '2. Sole search source: {source}',
      briefingLine4: '3. Role & mode: {role} ({roleKey}) · {mode} ({modeKey})',
      briefingLine5: '4. Task description: {task}',
      briefingLine6: '5. Attachment list: {files}',
      briefingExec: 'Execution requirements: call policy_preflight first for gate validation (continue only if allowed:true); always read attachments via policy_extract; validate every evidence card with policy_evidence_check; in "knowledge base only" mode, search only with rag_query hard-filtered to folders ["政策资料"], and if nothing is found reply exactly "政策知识库暂无资料" with no web fallback; in "web only" mode, consult only official government websites/gazettes and NPC & issuing-authority sites, and ask me for official links if nothing is found; output C-xxx conclusions bound to E-xxx evidence cards, all marked "pending manual review".',
      copyBriefing: 'Copy briefing',
      copyOk: 'Copied to clipboard',
      copyFail: 'Copy failed — please select and copy the text manually',
      sendToSession: 'Send to session',
      sendStateBusy: 'Writing into the session input box…',
      sendStateOk: 'Sent to session — switch to the conversation page for the answer',
      sendStateFail: 'Send failed: session input box not found (make sure a conversation page is available)',
      pasteHint: 'Click "Send to session" for one-click delivery, or copy the briefing and paste it into the session input box; the AI will call policy_preflight / policy_extract / policy_evidence_check to complete gating and interpretation.',
      askPlaceholder: 'Type a question — the AI answers directly from the uploaded attachments (Enter to send)',
      askBtn: 'Ask',
      askBtnBusy: 'Answering…',
      askStop: 'Stop',
      askGateNeed: 'Confirm "all materials are public" below before asking',
      askToolCalling: 'Calling',
      askThinkingLabel: 'Reasoning',
      askPendingReview: 'AI output is for reference only; defer to official texts (pending manual review)',
      askErrorPrefix: 'Q&A failed: ',
      askSessionId: 'Session',
      taskPlaceholder: '(no task description yet, please add)',
      filesNone: 'none',
      sourceBriefWeb: 'Web only (web_only)',
      sourceBriefRag: 'Local knowledge base only (knowledge_only)',
      gateTitle: 'Pre-security verification failed',
      gateQuestion: 'Please confirm first: is this material a fully public policy document? (The system only accepts public materials; uploading does not itself constitute public confirmation.)',
      demoBadge: 'Demo sample',
      preflightDoneRole: 'Preflight done: [allowed: true | source: {source} | role: {role}]',
      preflightDoneRag: 'Preflight done: [allowed: true | source: knowledge_only | folders: ["政策资料"]]',
      repATitle: 'Policy Basis Verification & Handling Conditions Report',
      repASub: 'Mode: citation verification (citation_verification) · Scope: current official documents of Shenzhen & Longgang',
      repATag: 'Business Execution View',
      repDirectLabel: '[Direct Answer & Handling Advice]',
      repADirect: 'The submitted material cites 2 incentive clauses. Verification shows the "national high-tech enterprise relocation incentive" citation matches current policy and meets acceptance standards, while the "modern logistics subsidy" citation refers to a policy repealed at the end of last year; the handler is advised to return the material and urge correction of the basis.',
      repBindLabel: '[Conclusion-by-Conclusion Evidence Binding] (click an ID to inspect evidence on the right)',
      c001Title: 'The 200k high-tech enterprise incentive citation is valid',
      c001Desc: 'The clause text closely matches Article 13 of the original document, with correct document number and issuing authority.',
      c002Title: 'The 3M logistics subsidy citation uses a repealed rule',
      c002Desc: 'The cited 深龙规〔2021〕2号 has been repealed by a newer regulation and cannot serve as a direct approval basis.',
      viewEvidence: 'View {eid} evidence',
      nextActionLabel: 'Items pending manual verification (Next Action)',
      repANext: 'Please verify whether the applicant enterprise is actually registered in the Longgang statistical accounting database; this condition is an on-site acceptance checkpoint and the original text requires cross-check by the District Statistics Bureau.',
      repBTitle: 'Administrative Normative Document Legality & Compliance Analysis',
      repBSub: 'Review dimensions: rule-making authority, procedural basis, conflicts with superior law',
      repBTag: 'Legal Review View',
      c003Title: 'Major administrative decision procedure complies with the provincial decree',
      c003Desc: 'The mandatory legality-review step in the draft strictly follows Guangdong Provincial Government Decree No. 288.',
      repCTitle: 'Result: no data in the policy knowledge base',
      repCBody: 'A hybrid vector-and-keyword search under the hard-filtered folder 政策资料/ found no controlled documents related to "Manufacturing Digital Transformation Subsidy".',
      repCMechLabel: 'Compliance mechanism: ',
      repCMech: 'Following the "knowledge base only" iron rule, the system did not read other departments\' folders without authorization, nor send data out via web search. Please ask the administrator to place officially approved public policy PDFs into the designated folder before analysis.',
      evidenceTitle: 'Evidence Card',
      evidenceSub: 'Each conclusion C-xxx binds to exactly one official source credential',
      badgeDefault: 'Official Grade-A source',
      evidenceEmptyPre: 'Click any ',
      evidenceEmptyStrong: 'C-xxx',
      evidenceEmptyPost: ' conclusion in a report to view its evidence and official link',
      evidenceNoneScenario: 'No evidence card produced by this search',
      matchedLabel: 'Matched conclusion',
      docLabel: 'Document title & number',
      quoteLabel: 'Official verbatim quote (unalterable)',
      organLabel: 'Issuing authority',
      effectiveLabel: 'Effective date',
      urlLabel: 'Official HTTPS source link',
      verifyOk: 'Aligned with the official government gazette system',
      verifyWarn: 'Version repeal conflict — manual stamping confirmation required',
      validityLabel: 'Validity status: ',
      validityNone: '—',
      markVerified: 'Mark as manually reviewed',
      markedVerified: 'Reviewed against the original by the handler',
      markedNote: '(local record, valid for this session only)',
      /* ── Tabbed workbench (file parsing / parsing records / task console) ── */
      tabParse: 'File Parsing',
      tabRecords: 'Archive',
      tabConsole: 'Task Console',
      parseGateCheck: 'I confirm this material is a fully public policy document',
      parseRoleShort: 'Role',
      parseModeShort: 'Mode',
      parseSourceShort: 'Source',
      parseGateNeed: 'Tick "I confirm this material is a fully public policy document" before parsing',
      parseUploadLabel: 'Upload files',
      parseFileList: 'Uploaded files ({n})',
      parsePathLabel: 'Server path (file path)',
      parseCopyPath: 'Copy path',
      parseNoFile: 'Upload and select a file first (.pdf / .docx / .xlsx)',
      parsePickHint: 'Click the button to choose files, or drag files anywhere on this tab (the browser cannot read local raw paths; the server-side stored path is used as the file path)',
      parseStartBtn: 'Start parsing',
      parseStopHint: 'Stopped receiving progress; the server will finish parsing and archive the record automatically',
      parseLogTitle: 'Parsing process',
      parseLogEmpty: 'Waiting for a parsing task…',
      parseLogStart: 'Start parsing: ',
      parseLogJob: 'Parsing job created, jobId: ',
      parseLogRecord: 'Record ID: ',
      parseLogDone: 'Parsing finished; result generated',
      parseToolCalling: 'Calling tool',
      parseThinking: 'Thinking',
      parseResultTitle: 'Parsing result',
      parseResultEmpty: 'No parsing result yet — select a file and click "Start parsing"',
      parseStatusStreaming: 'Parsing',
      parseStatusDone: 'Completed',
      parseStatusError: 'Failed',
      parseReqFail: 'Parsing request failed: ',
      parseCopy: 'Copy',
      parseResultCopyOk: 'Result copied',
      parseAgain: 'Re-parse',
      parseArchive: 'Archive',
      archTitle: 'Archive parsing result',
      archNameLabel: 'Parsing title',
      archRemarkLabel: 'Remark',
      archRemarkPlaceholder: 'Optional: archive remark',
      archCancelBtn: 'Cancel',
      archConfirmBtn: 'Confirm archive',
      archBusy: 'Archiving…',
      archOk: 'Archived — see the "Parsing Records" tab',
      archFail: 'Archive failed: ',
      recFilterQ: 'Content',
      recFilterQPlaceholder: 'Title / file name / remark / result keywords',
      recFilterFrom: 'Date',
      recFilterTo: 'to',
      recQueryBtn: 'Search',
      recResetBtn: 'Reset',
      recColSeq: '#',
      recColDate: 'Parsed at',
      recColTitle: 'Parsing title',
      recColFile: 'File name',
      recColRemark: 'Remark',
      recColActions: 'Actions',
      recEmpty: 'No parsing records yet',
      recLoading: 'Loading…',
      recTotal: '{n} record(s)',
      recStatusParsing: 'Parsing',
      recStatusDone: 'Completed',
      recStatusFailed: 'Failed',
      recStatusArchived: 'Archived',
      recBtnFileQa: '@File Q&A',
      recBtnView: 'View',
      recBtnDelete: 'Delete',
      recDeleteConfirm: 'Confirm delete?',
      recDelOk: 'Record deleted',
      recDelFail: 'Delete failed: ',
      recLoadFail: 'Failed to load records: ',
      /* ── v1.4.2 Record edit (archive row / drawer → edit dialog) ── */
      recBtnEdit: 'Edit',
      editModalTitle: 'Edit parsing record',
      editFileLabel: 'File name',
      editResultLabel: 'Parsing result',
      editResultParsingHint: 'Parsing in progress — the result cannot be edited yet',
      editConfirmBtn: 'Save changes',
      editBusy: 'Saving…',
      editOk: 'Changes saved',
      editFail: 'Save failed: ',
      editLoadFail: 'Failed to load record detail: ',
      recDrawerClose: 'Close',
      recDrawerErrorLabel: 'Error',
      recJumpBusy: 'Locating the session input box…',
      recJumpOk: 'Draft written into the session input box — complete your question and send it yourself',
      recJumpFail: 'Session input box not found (make sure a conversation page is available)',
      recJumpDraft1: '[File Q&A] Please answer questions about the policy document "{title}".',
      recJumpDraft2: 'File name: {name}',
      recJumpDraft3: 'Server path: {path}',
      recJumpDraft4: 'This material is confirmed public; call policy_preflight for gate validation first, then read the text with policy_extract as needed before answering.',
      recJumpDraft5: 'My question: ',
      /* ── v1.3.0 Side navigation + AI Q&A ── */
      tabQa: 'AI Q&A',
      navPublicOk: 'Public materials confirmed',
      navPublicPending: 'Public confirmation pending',
      qaNewBtn: 'New session',
      qaNewSessionHint: 'Switched to a new session — type your question',
      qaNewSession: 'New session',
      qaSessionsTitle: 'Sessions',
      qaSessionsEmpty: 'No sessions yet',
      qaSessionCount: '{n} session(s)',
      qaSessionsLoadFail: 'Failed to load sessions: ',
      /* paHist-20261019：history conversation "more actions" */
      qaMoreActions: 'More actions', qaPinSession: 'Pin', qaUnpinSession: 'Unpin', qaRenameSession: 'Rename',
      qaArchiveSession: 'Archive', qaUnarchiveSession: 'Unarchive', qaDeleteSession: 'Delete',
      qaArchivedTitle: 'Archived', qaArchivedEmpty: 'No archived sessions', qaBackHistory: 'Back to history',
      qaPinOk: 'Pinned', qaUnpinOk: 'Unpinned', qaRenameOk: 'Renamed', qaRenameEmpty: 'Session name cannot be empty',
      qaArchiveOk: 'Archived', qaUnarchiveOk: 'Unarchived', qaMoreFail: 'Action failed: ',
      qaSessionOpenFail: 'Failed to open session: ',
      qaSessionSwitchBusy: 'Answer is streaming — please wait before switching sessions',
      qaReloadBtn: 'Refresh',
      qaDelConfirm: 'Delete this session?',
      qaDelOk: 'Session deleted',
      qaDelFail: 'Delete failed: ',
      qaMsgCount: '{n} message(s)',
      qaEmptyTitle: 'No messages yet',
      qaEmptyHint: 'Ask the policy assistant; drag files into the chat area or click 📎 to upload (PDF / DOCX / XLSX)',
      qaInputPlaceholder: 'Type a question — Enter to send, Shift+Enter for a new line…',
      qaSendBtn: 'Send',
      qaSendBtnBusy: 'Answering…',
      qaSendFail: 'Send failed: ',
      qaGateNeed: 'Tick "I confirm this material is a fully public policy document" before asking',
      qaThinkingPlaceholder: 'Thinking…',
      qaStreamError: 'Answer failed: ',
      qaAttachLabel: 'Attachments for this question',
      qaFromRecord: 'From archive',
      qaArchiveBtn: 'Archive',
      qaArchiving: 'Archiving…',
      qaArchiveOk: 'Archived as record #{seq}',
      qaCopyAnswer: 'Copy answer',
      qaClearBtn: 'Clear',
      qaJumpOk: 'File attached — ask your question in AI Q&A',
      qaJumpOkNoFile: 'Switched to AI Q&A — type your question',
      /* ── v1.3.2 Word download (GB/T 9704-2012) + parse resume across panels ── */
      parseDocxBtn: 'Download Word',
      parseDocxBusy: 'Generating…',
      parseDocxNote: 'Downloads as a GB/T 9704-2012 official document format Word file',
      parseDocxOk: 'Word document generated — download started',
      parseDocxFail: 'Download failed: ',
      parseDocxDefaultTitle: 'Parsing result',
      recBtnDownload: 'Download',
      parseInterrupted: 'Parsing interrupted',
      parseResumeFile: 'Resuming file: ',
      parseResumeParsing: 'Active parsing detected — event stream reconnected…',
      parseResumeDone: 'Previous parsing finished — result loaded',
      /* ── v1.4.0 online view + model selection ── */
      recDrawerTabReport: 'Report',
      recDrawerTabSource: 'Source preview',
      recDrawerLoading: 'Loading record…',
      recDrawerLoadFail: 'Failed to load record: ',
      recDrawerRaw: 'Raw',
      recDrawerFormatted: 'Formatted',
      recDrawerSourceNone: 'No source file is associated with this record',
      recDrawerSourceNote: 'PDF renders inline; DOCX/XLSX preview is generated from extracted text and may differ from the original layout.',
      recDrawerSourceOpen: 'Open in new window',
      recDrawerSourceLoadFail: 'Source preview failed — try opening in a new window',
      parseChipPreview: 'Preview',
      previewTitle: 'Source file online preview',
      previewGateNeed: 'Confirm "public materials" before previewing file content',
      previewClose: 'Close',
      previewNewWin: 'Open in new window',
      qaModelLabel: 'Model',
      qaModelDefaultOption: 'Follow system default',
      qaModelLoading: 'Loading model list…',
      qaModelFail: 'Model list unavailable — using system default model',
      qaModelDefaultSuffix: ' (default)',
      qaModelSwitchNote: 'Applies from your next question; conversation context is kept',
      qaModelRetry: 'Retry',
    };

    /* ════════ 附件上传（对话框入口 + 拖拽上传；Host 半同名路由契约） ════════
     * 白名单与 30MB 上限与 policy_extract 一致；上传只做字节落盘暂存，不改变门禁状态。 */
    const UPLOAD_URL = '/api/policy-analysis/upload';
    const UPLOAD_ACCEPT = '.pdf,.docx,.xlsx';
    const UPLOAD_EXT_RE = /\.(pdf|docx|xlsx)$/i;
    const UPLOAD_MAX_BYTES = 30 * 1024 * 1024;

    /* ════════ 演示数据（与 UI 原型 agent.html 完全一致；仅渲染用） ════════ */
    const EVIDENCE_DB = {
      'E-101': {
        id: 'E-101',
        title: '《深圳市龙岗区科技创新扶持专项资金管理办法》',
        docNo: '深龙规〔2023〕4号',
        organ: '深圳市龙岗区科技创新局',
        quote: '“第十三条：对新认定的国家高新技术企业，给予最高不超过20万元的一次性落户奖励与研发资助。”',
        url: 'https://www.lg.gov.cn/xxgk/zwgk/tzgg/content/post_9823120.html',
        level: 'A 级 (区政府正式规范性文件)',
        effectiveDate: '2023-05-01',
        validity: '现行有效',
        verified: true,
        matchedConclusion: 'C-001 [引述准确]',
      },
      'E-102': {
        id: 'E-102',
        title: '《深圳市龙岗区关于支持现代服务业高质量发展的若干措施》',
        docNo: '深龙规〔2021〕2号 (已废止)',
        organ: '深圳市龙岗区工业和信息化局',
        quote: '“第二十一条：对经认定的重点物流仓储项目，按投资总额10%给予最高300万元补贴。”',
        url: 'https://www.lg.gov.cn/xxgk/zwgk/zcfg/content/post_7128911.html',
        level: 'B 级 (被新文件替代之废止文件)',
        effectiveDate: '已于2023年12月31日失效',
        validity: '已废止 (被 深龙规〔2024〕1号 替代)',
        verified: false,
        matchedConclusion: 'C-002 [失效依据预警]',
      },
      'E-103': {
        id: 'E-103',
        title: '《广东省重大行政决策程序规定》',
        docNo: '广东省人民政府令第288号',
        organ: '广东省人民政府',
        quote: '“第二十四条：决策草案未经合法性审查或者经审查不合法的，不得提交决策机关讨论。”',
        url: 'https://www.gd.gov.cn/zwgk/wjk/qfl/content/post_3012890.html',
        level: 'A 级 (省政府规章)',
        effectiveDate: '2021-09-01',
        validity: '现行有效',
        verified: true,
        matchedConclusion: 'C-003 [上位依据完备]',
      },
    };

    /* 结论卡配色（emerald 正常 / rose 失效预警 / blue 上位依据） */
    const TINTS = {
      emerald: { bg: 'var(--pa-tint-emerald-bg, #ecfdf5)', border: 'var(--pa-tint-emerald-border, #a7f3d0)', chip: 'var(--pa-tint-emerald-chip, #059669)', title: 'var(--pa-tint-emerald-title, #064e3b)' },
      rose: { bg: 'var(--pa-tint-rose-bg, #fff1f2)', border: 'var(--pa-tint-rose-border, #fecaca)', chip: 'var(--pa-tint-rose-chip, #e11d48)', title: 'var(--pa-tint-rose-title, #881337)' },
      blue: { bg: 'var(--pa-tint-blue-bg, #eff6ff)', border: 'var(--pa-tint-blue-border, #bfdbfe)', chip: 'var(--pa-tint-blue-chip, #2563eb)', title: 'var(--pa-tint-blue-title, #0f172a)' },
    };
    const REPORT_HEADS = {
      A: { titleKey: 'repATitle', subKey: 'repASub', tagKey: 'repATag', tagBg: 'var(--pa-tint-blue-bg, #eff6ff)', tagColor: 'var(--pa-accent-strong, #134879)', tagBorder: 'var(--pa-tint-blue-border, #bfdbfe)' },
      B: { titleKey: 'repBTitle', subKey: 'repBSub', tagKey: 'repBTag', tagBg: 'var(--pa-head-b-bg, #faf5ff)', tagColor: 'var(--pa-head-b-color, #7e22ce)', tagBorder: 'var(--pa-head-b-border, #e9d5ff)' },
    };
    const REPORT_CARDS = {
      A: [
        { eid: 'E-101', tag: 'C-001', titleKey: 'c001Title', descKey: 'c001Desc', tint: 'emerald' },
        { eid: 'E-102', tag: 'C-002', titleKey: 'c002Title', descKey: 'c002Desc', tint: 'rose' },
      ],
      B: [
        { eid: 'E-103', tag: 'C-003', titleKey: 'c003Title', descKey: 'c003Desc', tint: 'blue' },
      ],
    };

    /* ════════ 内联 SVG 图标（heroicons outline 路径，currentColor 自适应） ════════ */
    const ICONS = {
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      check: 'M5 13l4 4L19 7',
      refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      arrow: 'M14 5l7 7m0 0l-7 7m7-7H3',
      home: 'M3 12l9-8 9 8M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10',
      clip: 'M15.172 7l-8.586 8.586a2 2 0 102.828 2.828l8.414-8.414a4 4 0 10-5.656-5.656l-8.379 8.379a6 6 0 108.486 8.485L21 13',
      upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      /* v1.3.0 左侧导航：归档盒（解析归档）/ 会话气泡（智能问答），heroicons outline 路径 */
      archive: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m-3.75-3.75h7.5M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
      chat: 'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
      /* paHist-20261019：历史会话「更多操作」图标（重命名 / 置顶 / 删除） */
      edit: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
      pin: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
      trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    };
    function Icon(props) {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: props.size || 16,
        height: props.size || 16,
        fill: 'none',
        stroke: props.color || 'currentColor',
        strokeWidth: props.sw || 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: Object.assign({ flexShrink: 0 }, props.style || {}),
      }, h('path', { d: props.d }));
    }

    /* ════════ 侧栏面板图标（sidebar 传入 { size, active }） ════════ */
    function PanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18;
      // 文档 + 对勾 印章式图标，stroke 走 currentColor，由 sidebar 决定激活配色
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('path', { d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }),
        h('path', { d: 'M9.2 9.6l1.9 1.9 3.7-3.9' }),
      );
    }

    /* ════════ pa-* 样式表（组件根内 <style>，卸载随组件移除） ════════ */
    const CSS_TEXT = [
      '.pa-root, .pa-root * { box-sizing: border-box; }',
      '.pa-root button, .pa-root input, .pa-root select, .pa-root textarea { font-family: inherit; }',
      /* ── 品牌/语义色自定义属性（默认=浅色；深色由 body[data-ds-dark-theme] 切换，与 DSH 通用设置-外观联动） ── */
      '.pa-root { --pa-topbar: #0e3459; --pa-topbar-ink: #ffffff; --pa-topbar-muted: #93c5fd;',
      '  --pa-topbar-pill-bg: rgba(9,33,58,.6); --pa-topbar-pill-border: rgba(26,95,158,.4);',
      '  --pa-accent: #1a5f9e; --pa-accent-strong: #134879; --pa-accent-ink: #ffffff; --pa-accent-ring: rgba(26,95,158,.15);',
      '  --pa-accent-soft: #f0f5fa; --pa-accent-soft-border: #e1ecf5; --pa-accent-active: #f0f7ff;',
      '  --pa-user-bubble: #1a5f9e;',
      '  --pa-warn-bg: #fffbeb; --pa-warn-border: #fde68a; --pa-warn-text: #78350f; --pa-warn-icon: #d97706; --pa-warn-avatar: #d97706;',
      '  --pa-success: #059669; --pa-success-soft: #ecfdf5; --pa-success-border: #a7f3d0; --pa-success-text: #065f46; --pa-success-banner: #d1fae5;',
      '  --pa-info-bg: #eff6ff; --pa-info-border: #bfdbfe; --pa-info-ink: #1d4ed8;',
      '  --pa-code-bg: #0f172a; --pa-code-text: #e2e8f0;',
      '  --pa-avatar-me: #cbd5e1; --pa-avatar-me-text: #334155;',
      '  --pa-tint-emerald-bg: #ecfdf5; --pa-tint-emerald-border: #a7f3d0; --pa-tint-emerald-chip: #059669; --pa-tint-emerald-title: #064e3b;',
      '  --pa-tint-rose-bg: #fff1f2; --pa-tint-rose-border: #fecaca; --pa-tint-rose-chip: #e11d48; --pa-tint-rose-title: #881337;',
      '  --pa-tint-blue-bg: #eff6ff; --pa-tint-blue-border: #bfdbfe; --pa-tint-blue-chip: #2563eb; --pa-tint-blue-title: #0f172a;',
      '  --pa-head-b-bg: #faf5ff; --pa-head-b-color: #7e22ce; --pa-head-b-border: #e9d5ff; }',
      '.pa-unused-dark-root { --pa-topbar: #0b2238; --pa-topbar-ink: #ffffff; --pa-topbar-muted: #7fb4e8;',
      '  --pa-topbar-pill-bg: rgba(4,14,26,.5); --pa-topbar-pill-border: rgba(77,163,224,.35);',
      '  --pa-accent: #4da3e0; --pa-accent-strong: #7cb8ee; --pa-accent-ink: #0b2238; --pa-accent-ring: rgba(77,163,224,.28);',
      '  --pa-accent-soft: #10243c; --pa-accent-soft-border: #1d4a73; --pa-accent-active: #0d2540;',
      '  --pa-user-bubble: #2d6fb3;',
      '  --pa-warn-bg: rgba(120,53,15,.26); --pa-warn-border: #92610c; --pa-warn-text: #fcd34d; --pa-warn-icon: #fbbf24; --pa-warn-avatar: #b45309;',
      '  --pa-success: #34d399; --pa-success-soft: rgba(6,95,70,.38); --pa-success-border: #065f46; --pa-success-text: #6ee7b7; --pa-success-banner: rgba(6,95,70,.38);',
      '  --pa-info-bg: rgba(23,37,84,.5); --pa-info-border: #1e40af; --pa-info-ink: #93c5fd;',
      '  --pa-code-bg: #1e293b; --pa-code-text: #e2e8f0;',
      '  --pa-avatar-me: #334155; --pa-avatar-me-text: #cbd5e1;',
      '  --pa-tint-emerald-bg: rgba(6,78,59,.35); --pa-tint-emerald-border: #065f46; --pa-tint-emerald-chip: #059669; --pa-tint-emerald-title: #6ee7b7;',
      '  --pa-tint-rose-bg: rgba(87,12,12,.35); --pa-tint-rose-border: #7f1d1d; --pa-tint-rose-chip: #e11d48; --pa-tint-rose-title: #fecaca;',
      '  --pa-tint-blue-bg: rgba(23,37,84,.5); --pa-tint-blue-border: #1e40af; --pa-tint-blue-chip: #2563eb; --pa-tint-blue-title: #93c5fd;',
      '  --pa-head-b-bg: rgba(76,29,149,.26); --pa-head-b-color: #c4b5fd; --pa-head-b-border: #6b21a8; }',
      '.pa-scroll::-webkit-scrollbar { width: 5px; height: 5px; }',
      '.pa-scroll::-webkit-scrollbar-track { background: var(--dsw-alias-scrollbar-bg-l1, #f1f5f9); }',
      '.pa-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-hover-l1, #cbd5e1); border-radius: 4px; }',
      '.pa-scroll::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2, #94a3b8); }',
      '.pa-rolebtn { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background-color .15s, border-color .15s, box-shadow .15s; }',
      '.pa-role-on { background: var(--pa-accent-soft, #f0f5fa); border: 1px solid var(--pa-accent, #1a5f9e); color: var(--pa-accent-strong, #134879); box-shadow: 0 1px 2px rgba(15,23,42,.06); }',
      '.pa-role-off { background: var(--dsw-alias-bg-layer-1, #ffffff); border: 1px solid var(--dsw-alias-border-l2, #e2e8f0); color: var(--dsw-alias-label-secondary, #475569); }',
      '.pa-role-off:hover { background: var(--dsw-alias-interactive-bg-hover, #f8fafc); }',
      '.pa-scenario { background: var(--dsw-alias-bg-module-platform, #f1f5f9); border: 1px solid transparent; color: var(--dsw-alias-label-secondary, #334155); padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; white-space: nowrap; transition: background-color .15s; }',
      '.pa-scenario:hover { background: var(--dsw-alias-interactive-bg-hover-solid, #e2e8f0); }',
      '.pa-scenario-on, .pa-scenario-on:hover { background: var(--pa-accent-soft, #f0f5fa); border: 1px solid var(--pa-accent, #1a5f9e); color: var(--pa-accent-strong, #134879); }',
      '.pa-btn { background: var(--pa-accent, #1a5f9e); border: none; color: var(--pa-accent-ink, #ffffff); cursor: pointer; }',
      '.pa-btn:hover { background: var(--pa-accent-strong, #134879); }',
      '.pa-ghostbtn { background: none; border: none; color: var(--dsw-alias-label-tertiary, #94a3b8); cursor: pointer; }',
      '.pa-ghostbtn:hover { color: var(--dsw-alias-label-secondary, #475569); }',
      '.pa-linkbtn { background: none; border: none; color: var(--pa-accent, #1a5f9e); cursor: pointer; font-weight: 500; }',
      '.pa-linkbtn:hover { text-decoration: underline; }',
      '.pa-railback { margin: 10px 0 0; display: flex; align-items: center; justify-content: center; gap: 6px;',
      '  border: 1px solid var(--dsw-alias-border-l2, #e4e5e7); background: none;',
      '  color: var(--dsw-alias-label-secondary, #81858c); border-radius: 10px; padding: 8px 10px;',
      '  cursor: pointer; font-size: 12.5px; flex: none; white-space: nowrap; }',
      '.pa-railback:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05));',
      '  color: var(--dsw-alias-label-primary, #0f1115); }',
      '.pa-conclusion { transition: box-shadow .15s ease; }',
      '.pa-conclusion:hover { box-shadow: 0 4px 12px rgba(15,23,42,.10); }',
      '.pa-input { background: var(--dsw-alias-bg-layer-2, #f8fafc); border: 1px solid var(--dsw-alias-border-l2, #cbd5e1); }',
      '.pa-input:focus { outline: none; border-color: var(--pa-accent, #1a5f9e); background: var(--dsw-alias-bg-layer-1, #ffffff); box-shadow: 0 0 0 2px var(--pa-accent-ring, rgba(26,95,158,.15)); }',
      '.pa-mode { background: var(--dsw-alias-bg-layer-2, #f8fafc); border: 1px solid var(--dsw-alias-border-l1, #e2e8f0); }',
      '.pa-mode:focus { outline: none; border-color: var(--pa-accent, #1a5f9e); box-shadow: 0 0 0 2px var(--pa-accent-ring, rgba(26,95,158,.12)); }',
      /* 附件上传入口按钮（输入框左侧 📎）与附件 chips 的移除按钮 */
      '.pa-uploadbtn { display: flex; align-items: center; justify-content: center; width: 38px; height: 41px; flex-shrink: 0;',
      '  border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2, #e2e8f0); background: var(--dsw-alias-bg-layer-2, #f8fafc);',
      '  color: var(--dsw-alias-label-secondary, #475569); cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }',
      '.pa-uploadbtn:hover { background: var(--dsw-alias-interactive-bg-hover, #f0f5fa); border-color: var(--pa-accent, #1a5f9e); color: var(--pa-accent, #1a5f9e); }',
      '.pa-uploadbtn:disabled { opacity: .55; cursor: wait; }',
      '.pa-chipx { display: flex; align-items: center; justify-content: center; background: none; border: none; padding: 0; width: 14px; height: 14px;',
      '  border-radius: 50%; color: var(--dsw-alias-label-tertiary, #94a3b8); cursor: pointer; font-size: 13px; line-height: 1; flex-shrink: 0; }',
      '.pa-chipx:hover { color: var(--pa-tint-rose-chip, #e11d48); }',
      /* ── 三页签工作台：页签栏 / 记录表 / 解析过程终端（追加类，不改旧类语义） ── */
      '.pa-tab { background: none; border: none; padding: 11px 2px; margin-right: 20px; font-size: 12.5px; font-weight: 500;',
      '  color: var(--dsw-alias-label-secondary, #475569); cursor: pointer; border-bottom: 2px solid transparent;',
      '  transition: color .15s, border-color .15s; white-space: nowrap; }',
      '.pa-tab:hover { color: var(--dsw-alias-label-primary, #0f172a); }',
      '.pa-tab-on, .pa-tab-on:hover { color: var(--pa-accent, #1a5f9e); border-bottom-color: var(--pa-accent, #1a5f9e); font-weight: 600; }',
      '.pa-thead th { position: sticky; top: 0; z-index: 1; }',
      '.pa-trow { transition: background-color .12s; }',
      '.pa-trow:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.03)); }',
      '.pa-term { background: var(--pa-code-bg, #0f172a); color: var(--pa-code-text, #e2e8f0);',
      '  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }',
      /* ── v1.3.0 左侧导航 / 智能问答（追加类，不改旧类语义） ── */
      '.pa-navitem { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: none; border: none;',
      '  padding: 9px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 500;',
      '  color: var(--dsw-alias-label-secondary, #475569); cursor: pointer; transition: background-color .15s, color .15s; }',
      '.pa-navitem:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); color: var(--dsw-alias-label-primary, #0f172a); }',
      '.pa-navitem-on, .pa-navitem-on:hover { background: var(--pa-accent-soft, #f0f5fa); color: var(--pa-accent-strong, #134879);',
      '  font-weight: 600; box-shadow: inset 2px 0 0 var(--pa-accent, #1a5f9e); }',
      '.pa-qablink { animation: pa-qablink 1.2s ease-in-out infinite; }',
      '@keyframes pa-qablink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }',
      '.pa-qadel { opacity: 0; transition: opacity .12s; }',
      '.pa-qasession:hover .pa-qadel, .pa-qadel-on { opacity: 1; }',
      /* paHist-20261019：历史会话「更多操作」菜单 / 行内重命名 / 归档入口 */
      '.pa-qamore { display: flex; align-items: center; justify-content: center; flex: none; width: 18px; height: 18px; border: 0; border-radius: 6px; background: none; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1; cursor: pointer; padding: 0; }',
      '.pa-qamore:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
      '.pa-qasessionmenu { display: flex; flex-direction: column; gap: 1px; padding: 4px; background: var(--dsw-alias-bg-layer-1, #fff); border: 1px solid var(--dsw-alias-border-l2, #dfe5ee); border-radius: 10px; box-shadow: 0 8px 26px rgba(23,43,77,.16); }',
      '.pa-qasessionmenu button { display: flex; align-items: center; gap: 7px; width: 100%; text-align: left; border: 0; background: none; border-radius: 7px; padding: 6px 8px; font-size: 11.5px; color: var(--dsw-alias-label-primary, #2a3342); cursor: pointer; }',
      '.pa-qasessionmenu button:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.pa-qasessionmenu button.danger { color: #d4380d; }',
      '.pa-qasessionmenu button.danger:hover { background: rgba(212,56,13,.08); }',
      '.pa-qareninput { width: 100%; min-width: 0; font-size: 11px; padding: 3px 6px; border: 1px solid var(--dsw-alias-state-business-primary, #2563eb); border-radius: 7px; background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #2a3342); }',
      '.pa-archtoggle { width: 100%; text-align: left; border: 0; background: none; color: var(--dsw-alias-label-tertiary); cursor: pointer; font-size: 10px; padding: 4px 6px; border-radius: 7px; }',
      '.pa-archtoggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
      /* 对齐会议助手 mt-rail、mt-brand、mt-railnav、mt-railitem 的尺寸和主题令牌。 */
      '.pa-root { position: relative; }',
      '.pa-module-nav{width:216px;flex:none;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill);border-right:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);overflow-y:auto;overflow-x:hidden;user-select:none}',
      '.pa-railbrand{display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
      '.pa-railicon{width:34px;height:34px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;background:linear-gradient(45deg,var(--dsw-static-blue-600),var(--dsw-static-deepseek-450));box-shadow:0 4px 12px rgba(37,99,235,.28)}',
      '.pa-railname{font-size:14px;font-weight:750;color:var(--dsw-alias-label-primary);letter-spacing:.01em;white-space:nowrap}',
      '.pa-railnav{flex:1;min-height:0;display:flex;flex-direction:column;gap:4px;padding:10px;overflow-y:auto}',
      '.pa-railsection{padding:2px 10px 5px;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.pa-module-nav .pa-navitem{position:relative;display:flex;align-items:center;justify-content:flex-start;gap:9px;width:100%;border:none;background:none;color:var(--dsw-alias-label-secondary);padding:9px 11px;border-radius:10px;font-size:13px;font-weight:550;cursor:pointer;text-align:left;box-shadow:none}',
      '.pa-module-nav .pa-navitem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pa-module-nav .pa-navitem-on,.pa-module-nav .pa-navitem-on:hover{background:var(--dsw-static-blue-600);color:#fff;font-weight:650;box-shadow:0 4px 12px rgba(37,99,235,.28)}',
      '.pa-navicon{width:16px;height:16px;flex:none;display:inline-flex;align-items:center}.pa-navtxt{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.pa-root.pa-cloud .pa-module-nav .pa-qa-subnav .pa-btn{background:none;border:0;box-shadow:none;color:var(--dsw-alias-label-secondary)}.pa-root.pa-cloud .pa-module-nav .pa-qa-subnav .pa-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pa-railstatus{margin:8px 10px 12px;padding:11px 12px;display:flex;gap:7px;align-items:center;border-radius:12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);font-size:10.5px;line-height:1.4}.pa-statusdot{width:6px;height:6px;flex:none;border-radius:50%}',
      '.pa-module-menu,.pa-module-close,.pa-module-scrim{display:none}',
      '.pa-module-nav .pa-navitem:focus-visible,.pa-module-nav .pa-qa-subnav button:focus-visible,.pa-module-close:focus-visible,.pa-module-menu:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
      '@media(min-width:761px) and (max-width:900px){.pa-module-nav{width:60px}.pa-railbrand{justify-content:center;padding:10px 0}.pa-railname,.pa-railsection,.pa-railstatus,.pa-navtxt,.pa-qa-subnav{display:none!important}.pa-module-nav .pa-navitem{justify-content:center;padding:11px 0}}',
      '@media(max-width:760px){.pa-root .pa-module-menu,.pa-root .pa-module-close{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);min-width:32px;height:32px;cursor:pointer}.pa-root .pa-module-nav{position:absolute;left:0;top:0;bottom:0;z-index:32;width:min(220px,84vw)!important;max-width:none;box-shadow:0 10px 30px rgba(16,28,48,.2);transform:translateX(-110%);transition:transform .16s ease}.pa-root .pa-module-nav.is-open{transform:translateX(0)}.pa-root .pa-module-scrim{display:block;position:absolute;inset:0;z-index:31;background:rgba(16,28,48,.3);border:0;cursor:pointer}.pa-root .pa-proto-top{padding:12px 16px}.pa-root .pa-proto-top h1{font-size:18px}}',
/* ── v1.4.0 抽屉加载 spinner ── */
      '.pa-spinner { width: 13px; height: 13px; flex-shrink: 0; border-radius: 50%;',
      '  border: 2px solid var(--dsw-alias-border-l2, #cbd5e1); border-top-color: var(--pa-accent, #1a5f9e);',
      '  animation: pa-spin 0.8s linear infinite; }',
      '@keyframes pa-spin { to { transform: rotate(360deg); } }',
      '.pa-root .pa-chat-scroll{padding:20px;overflow:auto;max-height:560px;min-height:280px;flex:1;display:flex;flex-direction:column;gap:14px}.pa-root .pa-welcome{background:#fff;border:1px solid #e6eaf1;border-radius:12px;padding:14px;max-width:82%;font-size:13px;line-height:1.8;color:#5f6b7e}.pa-root .pa-chat-input{border-top:1px solid #e6eaf1;padding:12px 14px}.pa-root .pa-chat-input .pa-qa-tools{border:0;padding:0 0 10px}.pa-root .pa-chat-compose{display:flex;align-items:flex-end;gap:8px}.pa-root .pa-chat-compose textarea{flex:1;min-width:0;resize:vertical}.pa-root .pa-inline-status{padding:8px 14px;color:#a16b13;font-size:12px}.pa-root .pa-chat-card>div:last-child{min-height:0}',
      "\n.pa-root.pa-cloud{--pa-accent:#2563eb;--pa-accent-strong:#1d4ed8;--pa-accent-soft:#eaf1ff;--pa-accent-soft-border:#d9e5ff;--pa-accent-active:#eaf1ff;--pa-user-bubble:#eaf1ff;--pa-topbar:#fff;--pa-topbar-ink:#2a3342;--pa-topbar-muted:#5f6b7e;font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#2a3342;font-size:14px;background:#f4f6f9}\n.pa-root.pa-cloud button{cursor:pointer}.pa-root.pa-cloud button:disabled{cursor:not-allowed;opacity:.5}.pa-root.pa-cloud button:focus-visible,.pa-root.pa-cloud summary:focus-visible{outline:2px solid #2563eb;outline-offset:3px}.pa-root.pa-cloud .pa-input{background:#fff;color:#2a3342;border:1px solid #e6eaf1;border-radius:8px;padding:9px 11px}.pa-root.pa-cloud .pa-btn{background:linear-gradient(135deg,#2563eb,#38bdf8);color:#fff;border-radius:9px;border:0;padding:10px 14px}.pa-root.pa-cloud .pa-ghostbtn{border:1px solid #e6eaf1;border-radius:8px;background:#fff;color:#5f6b7e;padding:6px 9px}\n.pa-root .pa-proto-top{position:relative;padding:20px 30px;display:flex;justify-content:space-between;gap:20px;align-items:center;background:linear-gradient(180deg,#fff,#fafcff);border-bottom:1px solid #e6eaf1;flex-shrink:0}.pa-root .pa-proto-top:after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(135deg,#2563eb,#38bdf8)}.pa-root .pa-kicker{font-size:11px;text-transform:uppercase;color:#2563eb;letter-spacing:.16em;font-weight:700}.pa-root h1{font-size:22px;margin:5px 0}.pa-root .pa-proto-top p{font-size:12px;color:#5f6b7e;margin:0}.pa-root .pa-top-pills{display:flex;gap:8px;flex-wrap:wrap;font-size:11px}.pa-root .pa-top-pills span{border:1px solid #e6eaf1;background:#fff;border-radius:999px;padding:6px 10px}.pa-root .pa-warn-pill{color:#a16b13}.pa-root .pa-proto-nav{display:flex;gap:6px;padding:10px 30px;background:#fff;flex-shrink:0;border-bottom:1px solid #e6eaf1}.pa-root .pa-proto-nav button{border:0;background:transparent;padding:8px 15px;color:#5f6b7e;border-radius:8px;font-size:13px}.pa-root .pa-proto-nav .active{background:#eaf1ff;color:#2563eb;font-weight:600}\n.pa-root .pa-proto-page{width:100%;padding:22px 30px 44px;overflow:auto;position:relative;min-height:0;max-width:1240px;margin:0 auto}.pa-root .pa-parse-grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:18px}.pa-root .pa-parse-left,.pa-root .pa-parse-right{display:flex;flex-direction:column;gap:14px;min-width:0}.pa-root .pa-step,.pa-root .pa-result-card,.pa-root .pa-log-card,.pa-root .pa-record-card,.pa-root .pa-chat-card{background:#fff;border:1px solid #e6eaf1;border-radius:14px;box-shadow:0 1px 3px rgba(17,27,46,.04),0 8px 24px rgba(17,27,46,.04)}.pa-root .pa-step{padding:18px}.pa-root h3{font-size:14px;margin:0;font-weight:650}.pa-root .pa-step h3{display:flex;align-items:center;gap:9px;margin-bottom:12px}.pa-root .pa-step h3 b{display:inline-flex;align-items:center;justify-content:center;background:#eaf1ff;color:#2563eb;width:24px;height:24px;border-radius:8px;font-size:12px}.pa-root .pa-step p{font-size:12px;line-height:1.7;margin:8px 0}.pa-root .pa-muted{color:#8b96a8;font-size:11px}.pa-root .pa-warn,.pa-root .pa-error{color:#a16b13}.pa-root .pa-dropbox{width:100%;min-height:145px;border:1px dashed #cbd5e1;border-radius:10px;background:#fafcff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#5f6b7e}.pa-root .pa-dropbox:hover{border-color:#2563eb;background:#eaf1ff}.pa-root .pa-dropbox span{font-size:11px}.pa-root .pa-file-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.pa-root .pa-file-chip{display:flex;gap:3px;align-items:center;border:1px solid #e6eaf1;border-radius:8px;max-width:100%;padding:4px;background:#f8fafc}.pa-root .pa-file-chip.active{border-color:#2563eb;background:#eaf1ff}.pa-root .pa-file-chip>button:first-child{border:0;background:transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#2563eb}.pa-root .pa-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pa-root .pa-config-grid label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#5f6b7e}.pa-root .pa-start{width:100%;margin-top:16px}.pa-root .pa-card-head{display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid #e6eaf1}.pa-root .pa-card-head h3{flex:1}.pa-root .pa-status{font-size:10px;border:1px solid #e6eaf1;border-radius:999px;padding:3px 8px;color:#5f6b7e}.pa-root .pa-result-empty{padding:48px 24px;color:#8b96a8;font-size:12px;text-align:center;min-height:250px;line-height:1.8}.pa-root .pa-structured{padding:16px 20px;font-size:13px;line-height:1.8}.pa-root .pa-structured h4{margin:0 0 12px;font-size:15px}.pa-root .pa-structured ol{padding-left:23px}.pa-root .pa-structured li{padding:7px 0}.pa-root .pa-structured blockquote{border-left:2px solid #d9e5ff;color:#5f6b7e;font-size:11px;margin:8px 0;padding-left:8px}.pa-root .pa-keywords{display:flex;gap:6px;flex-wrap:wrap}.pa-root .pa-keywords span{padding:3px 8px;border-radius:6px;background:#eaf1ff;color:#2563eb;font-size:11px}.pa-root .pa-log-card{overflow:hidden}.pa-root.pa-cloud .pa-term{background:#111b2e;color:#afc4e8;border:0!important;border-radius:14px}\n.pa-root .pa-more{position:relative;display:inline-block}.pa-root .pa-more>summary{cursor:pointer;list-style:none;padding:4px 8px;color:#5f6b7e}.pa-root .pa-more-menu{position:absolute;right:0;top:100%;z-index:30;min-width:170px;background:#fff;border:1px solid #e6eaf1;border-radius:10px;box-shadow:0 10px 30px #111b2e22;padding:6px;display:flex;flex-direction:column;gap:4px}.pa-root .pa-more-menu button{text-align:left;white-space:nowrap}.pa-root .pa-record-filters{display:flex;gap:9px;flex-wrap:wrap;align-items:center;padding:16px 18px;font-size:11px;color:#8b96a8}.pa-root .pa-range-field{display:inline-flex;align-items:center;gap:6px}.pa-root .pa-range-label{color:#8b96a8;white-space:nowrap}.pa-root .pa-record-filters .pa-input{padding:7px 9px}.pa-root .pa-record-filters select.pa-input{cursor:pointer}.pa-root .pa-record-filters>input:first-child{width:280px}.pa-root .pa-table-wrap{overflow:auto;min-height:230px;padding-bottom:100px}.pa-root .pa-table-wrap table{border-collapse:collapse;width:100%;min-width:800px;font-size:12px}.pa-root .pa-table-wrap th{padding:11px 15px;text-align:left;background:#fafcff;color:#5f6b7e;font-weight:600}.pa-root .pa-table-wrap td{padding:14px 15px;border-top:1px solid #e6eaf1;vertical-align:top}.pa-root .pa-table-wrap th:first-child{width:60px}.pa-root .pa-table-wrap td:last-child{white-space:nowrap}.pa-root .pa-record-empty{text-align:center;color:#8b96a8;padding:45px!important}\n.pa-root .pa-qa-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-height:520px}.pa-root .pa-chat-card{display:flex;flex-direction:column;overflow:hidden;min-width:0}.pa-root .pa-chat-card>div:last-child{min-height:450px}.pa-root .pa-qa-gate{padding:10px 14px;background:#fff8e8;border-bottom:1px solid #f4e1b8;font-size:11px;color:#a16b13;display:flex;align-items:center;justify-content:space-between;gap:8px}.pa-root .pa-qa-tools{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:11px;flex-wrap:wrap;border-bottom:1px solid #e6eaf1}.pa-root .pa-qa-tools>.pa-model{margin-left:auto}.pa-root .pa-model{position:relative;display:inline-block;font-size:11px;color:#5f6b7e}.pa-root .pa-model>summary{cursor:pointer;padding:7px 10px;border:1px solid #e6eaf1;border-radius:8px;list-style:none;background:#fff}.pa-root .pa-model-menu{position:absolute;left:0;bottom:100%;z-index:40;min-width:250px;max-height:360px;overflow:auto;background:#fff;border:1px solid #e6eaf1;border-radius:10px;box-shadow:0 10px 30px #111b2e22;padding:6px}.pa-root .pa-model-menu button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:8px 10px;color:#2a3342;border-radius:6px}.pa-root .pa-model-menu button:hover{background:#eaf1ff}.pa-root .pa-menu-title{padding:7px 10px;font-size:10px;color:#8b96a8}.pa-root .pa-config-grid .pa-model-menu{top:100%;bottom:auto}\n.pa-root .pa-local-overlay{position:fixed;inset:0;z-index:1000;background:#111b2e66;display:flex;align-items:center;justify-content:center;padding:20px}.pa-root .pa-local-dialog{background:#fff;border:1px solid #e6eaf1;border-radius:14px;padding:20px;width:min(560px,95vw);max-height:85vh;overflow:auto;display:flex;flex-direction:column;gap:13px;box-shadow:0 10px 30px #111b2e33}.pa-root .pa-local-dialog>label{display:flex;flex-direction:column;gap:6px;font-size:12px}.pa-root .pa-local-dialog p{font-size:12px;line-height:1.7}.pa-root .pa-report-dialog{width:min(900px,95vw);height:85vh}\n@media(max-width:1080px){.pa-root .pa-parse-grid,.pa-root .pa-qa-grid{grid-template-columns:1fr}}\n@media(max-width:860px){.pa-root .pa-record-filters .pa-range-field{flex:1 1 120px;min-width:0}.pa-root .pa-record-filters .pa-range-field .pa-input{min-width:0}.pa-root .pa-proto-page{padding:16px}.pa-root .pa-proto-top{padding:16px;align-items:flex-start;flex-direction:column;gap:10px}.pa-root .pa-proto-nav{padding:8px 16px}.pa-root .pa-config-grid{grid-template-columns:1fr}.pa-root .pa-record-filters>input:first-child{width:100%}.pa-root .pa-qa-gate{align-items:flex-start}.pa-root .pa-model-menu{min-width:220px;max-width:80vw}}\n",
    ].join('\n');

    /* 左栏小节标签（uppercase 灰字） */
    function SectionLabel(props) {
      return h('div', {
        style: {
          fontSize: 11, fontWeight: 600, color: T.text3,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        },
      }, props.text);
    }

    /* 圆形头像（Agent / 我 / 门禁） */
    function Avatar(props) {
      return h('div', {
        style: {
          width: 32, height: 32, borderRadius: '50%', background: props.bg,
          color: props.color || '#ffffff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0,
          boxShadow: '0 1px 2px rgba(15,23,42,.15)',
        },
      }, props.text);
    }

    /* ════════ 主面板：三栏政务控制台 ════════ */
    function Workbench(props) {
      const tp = props.t;
      /* 字典取词：t() 取不到时回退 zh 兜底对象 */
      const tr = (key, params) => {
        let out;
        try { out = tp ? tp(key, params) : undefined; } catch (e) { out = undefined; }
        if (typeof out !== 'string' || out === key) {
          const zh = ZH[key];
          if (typeof zh !== 'string') return key;
          if (!params) return zh;
          return zh.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
        }
        return out;
      };

      /* ── 状态 ── */
      const [role, setRole] = React.useState(FIXED_ROLE);
      const [mode, setMode] = React.useState(FIXED_MODE);
      const [source, setSource] = React.useState(FIXED_SOURCE);
      const [configOpen, setConfigOpen] = React.useState(false);
      const [packHealth, setPackHealth] = React.useState(null);
      const [filePickerOpen, setFilePickerOpen] = React.useState(false);
      const [fullReportOpen, setFullReportOpen] = React.useState(false);
      const [pendingPreview,setPendingPreview]=React.useState(null);
      const [previewConfirmed,setPreviewConfirmed]=React.useState(false);
      const [recView,setRecView]=React.useState('completed');
      const moduleRef=React.useRef(null);
      React.useEffect(()=>{if(!configOpen&&!filePickerOpen&&!fullReportOpen&&!pendingPreview)return;const old=document.activeElement;const modal=moduleRef.current&&moduleRef.current.querySelector('.pa-local-overlay');const first=modal&&modal.querySelector('button,input,select');if(first)first.focus();return()=>{if(old&&old.isConnected)old.focus();};},[configOpen,filePickerOpen,fullReportOpen,pendingPreview]);
      React.useEffect(()=>{let alive=true;fetch('/api/policy-analysis',{credentials:'same-origin'}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{if(alive)setPackHealth(v);}).catch(()=>{if(alive)setPackHealth({ok:false});});return()=>{alive=false;};},[]);
      const [parseModel, setParseModel] = React.useState(null);
      const [parseDepth, setParseDepth] = React.useState('standard');
      const [fileTasks, setFileTasks] = React.useState({});
      const tasksRef = React.useRef({});
      const queueFilesRef=React.useRef([]);
      const queueBusyRef = React.useRef(false);
      const currentQueueFileRef = React.useRef(null);
      const updateFileTask = (key, patch) => {
        if (!key) return;
        tasksRef.current = Object.assign({}, tasksRef.current, {[key]:Object.assign({},tasksRef.current[key],patch)});
        setFileTasks(tasksRef.current);
        try{sessionStorage.setItem('pa-prototype-queue-v1',JSON.stringify({files:queueFilesRef.current,tasks:tasksRef.current}));return true;}catch{return false;}
      };
      const selectParseFile = (f) => {
        if (queueBusyRef.current) return;
        setActiveFileKey(f.key);
        const task = tasksRef.current[f.key];
        if (task) { setParseJobId(task.jobId || null); setParseRecord(task.record || null); setParseResult((task.record && (task.record.reportMarkdown || task.record.result)) || task.result || ''); setParseResultState(task.status === 'done' ? 'done' : task.status === 'failed' ? 'error' : 'idle'); setParseLog(task.logs || []); }
        else { setParseRecord(null); setParseResult(''); setParseResultState('idle'); setParseLog([]); }
      };
      /* PA-QALAYOUT-20261005：默认已勾选「我确认当前问答所用材料全部为已公开政策材料」 */
      const [publicConfirmed, setPublicConfirmed] = React.useState(true);
      const [messages, setMessages] = React.useState([]);
      const [activeEvidence, setActiveEvidence] = React.useState(null);
      const [activeScenario, setActiveScenario] = React.useState(null);
      const [verifiedMap, setVerifiedMap] = React.useState({});
      const [taskText, setTaskText] = React.useState('');
      const [briefingText, setBriefingText] = React.useState('');
      const [copyState, setCopyState] = React.useState(null); // null | 'ok' | 'fail'
      /* 发送到会话状态：null | 'busy' | 'ok' | 'fail'（一键把简报写入 DSH 会话输入框并触发发送） */
      const [sendState, setSendState] = React.useState(null);
      /* 附件上传状态：files 仅存 {key,name,sizeBytes,path,ext} 元数据（不驻留文件内容）；
       * uploadMsg 为单条上传结果提示（错误/说明）；dragOver 控制拖拽高亮遮罩。 */
      const [files, setFiles] = React.useState([]);queueFilesRef.current=files;
      const [uploadBusy, setUploadBusy] = React.useState(false);
      const [uploadMsg, setUploadMsg] = React.useState(null); // null | {kind:'error', text}
      const [dragOver, setDragOver] = React.useState(false);
      /* 面板内直接问答：qaBusy = SSE 流接收中；qaAbortRef 用于「停止」按钮中断请求 */
      const [qaBusy, setQaBusy] = React.useState(false);
      const qaAbortRef = React.useRef(null);

      /* ── 三页签工作台状态（页签常挂载，display 切换，避免丢状态/断 SSE） ──
       * tab：'parse' 文件解析（默认） | 'records' 解析归档记录 | 'console' 任务简报 */
      const [tab, setTab] = React.useState('parse');
      const [moduleNavOpen, setModuleNavOpen] = React.useState(false);
      /* 页签1 文件解析：activeFileKey 选中上传文件；parseLog 过程日志 {ts,text,kind}；
       * parseResult 累积正文；parseResultState idle|streaming|done|error；
       * parseRecord 解析完成（done 帧）返回的记录对象；archive* 为归档对话框一组状态。 */
      const [activeFileKey, setActiveFileKey] = React.useState(null);
      const [parseBusy, setParseBusy] = React.useState(false);
      const [parseJobId, setParseJobId] = React.useState(null);
      const [parseLog, setParseLog] = React.useState([]); // 元素 {ts,text,kind:'info'|'tool'|'warn'|'error'}
      const [parseResult, setParseResult] = React.useState('');
      const [parseResultState, setParseResultState] = React.useState('idle');
      const [parseRecord, setParseRecord] = React.useState(null);
      /* v1.3.2 Word 下载状态：parseDocxBusy=结果面板 docx 生成/下载中；
       * docxRecBusyId=解析归档行内/抽屉下载中的记录 id（同一时间一个，防重复点击） */
      const [parseDocxBusy, setParseDocxBusy] = React.useState(false);
      const [docxRecBusyId, setDocxRecBusyId] = React.useState(null);
      const [parseThinking, setParseThinking] = React.useState(''); // 「思考中」动态滚动行
      const [parseMsg, setParseMsg] = React.useState(null); // null | {kind:'error'|'ok'|'info', text}
      const [resultCopyState, setResultCopyState] = React.useState(null); // null | 'ok' | 'fail'
      const [parseRaw, setParseRaw] = React.useState(false); // v1.4.0 解析结果视图：false=格式化 Markdown | true=原文
      const [archiveOpen, setArchiveOpen] = React.useState(false);
      const [archiveTitle, setArchiveTitle] = React.useState('');
      const [archiveRemark, setArchiveRemark] = React.useState('');
      const [archiveBusy, setArchiveBusy] = React.useState(false);
      const [archiveMsg, setArchiveMsg] = React.useState(null); // null | {kind:'error', text}
      const parseAbortRef = React.useRef(null); // 解析 POST+SSE 共用中止控制器
      const termRef = React.useRef(null); // 解析过程终端滚底
      const parseResultRef = React.useRef(null); // 解析结果滚底
      /* 页签2 解析归档记录 */
      const [records, setRecords] = React.useState([]);
      const [recordsTotal, setRecordsTotal] = React.useState(0);
      const [recQ, setRecQ] = React.useState('');
      const [recFrom, setRecFrom] = React.useState('');
      const [recTo, setRecTo] = React.useState('');
      /* PA-RECRANGE-20261012：时间段快捷筛选（all/today/7d/30d/90d/month/custom） */
      const [recRange, setRecRange] = React.useState('all');
      const [recLoading, setRecLoading] = React.useState(false);
      const [recMsg, setRecMsg] = React.useState(null); // null | {kind:'error'|'ok'|'info', text}
      const [drawerRecord, setDrawerRecord] = React.useState(null); // 查看结果抽屉
      const [drawerTab, setDrawerTab] = React.useState('report'); // 抽屉页签：'report' 解读报告 | 'source' 源文件预览（v1.4.0）
      const [drawerRaw, setDrawerRaw] = React.useState(false); // 报告视图切换：false=格式化渲染 | true=原文（v1.4.0）
      const [previewFile, setPreviewFile] = React.useState(null); // 源文件在线预览模态（文件解析页 chip「预览」）：{name,path,ext} | null
      const [pendingDeleteId, setPendingDeleteId] = React.useState(null); // 两段式删除确认（3 秒恢复）
      const recordsStaleRef = React.useRef(true); // 进入记录页签时是否需要重新拉取
      const delTimerRef = React.useRef(null); // 两段式删除恢复计时器
      /* v1.4.2 记录编辑：editRecord=编辑中的记录（含 __loading/__loadError 详情态），
       * edit* 其余为编辑对话框一组状态（标题/文件名/备注/结果正文 + 忙态/错误）。 */
      const [editRecord, setEditRecord] = React.useState(null);
      const [editTitle, setEditTitle] = React.useState('');
      const [editFileName, setEditFileName] = React.useState('');
      const [editRemark, setEditRemark] = React.useState('');
      const [editResult, setEditResult] = React.useState('');
      const [editBusy, setEditBusy] = React.useState(false);
      const [editMsg, setEditMsg] = React.useState(null); // null | {kind:'error'|'info', text}
      /* 轮询/中止句柄登记（组件卸载统一清理，避免 setInterval 泄漏 / 游离 SSE） */
      const sendPollRef = React.useRef(null); // sendToSession 的会话输入框定位轮询（RESERVED：console 移出渲染树后未触发）
      /* 本次上传来源：null/'parse'=文件解析视图，'qa'=智能问答视图（决定附件进哪份 chip 列表） */
      const uploadTargetRef = React.useRef(null);

      /* ── 视图3 智能问答（v1.3.0 全新 qa* 状态；与旧 console 消息流互不复用） ── */
      const [qaSessions, setQaSessions] = React.useState([]); // 会话列表 {id,title,createdAt,lastActiveAt,messageCount,...}
      const [qaActiveId, setQaActiveId] = React.useState(null); // 当前会话 id（null=新会话草稿，发送时由服务端创建）
      const [qaMessages, setQaMessages] = React.useState([]); // 当前会话消息 {id,role:'user'|'assistant',text,ts,files?,tools?,state?,error?}
      const [qaInput, setQaInput] = React.useState('');
      const [qaFiles, setQaFiles] = React.useState([]); // 待附文件 {key,name,path,sizeBytes?,fromRecord?}
      const [qaSendBusy, setQaSendBusy] = React.useState(false); // 流式接收中
      const [qaThinking, setQaThinking] = React.useState(''); // 首个增量到达前的「思考中…」动态行
      const [qaSessionsLoading, setQaSessionsLoading] = React.useState(false);
      const [qaMsg, setQaMsg] = React.useState(null); // null | {kind:'ok'|'error'|'info', text} 轻量提示
      const [qaPendingDeleteId, setQaPendingDeleteId] = React.useState(null); // 会话两段式删除（3 秒恢复）
      /* paHist-20261019：历史会话「更多操作」（置顶/重命名/归档/删除）+ 归档视图开关 */
      const [qaSessionMenu, setQaSessionMenu] = React.useState(null); // { id, anchor }
      const [qaRenaming, setQaRenaming] = React.useState(null); // { id, value } 行内重命名
      const [qaShowArchived, setQaShowArchived] = React.useState(false); // false=历史会话 / true=归档会话
      const qaSessionMenuRef = React.useRef(null);
      const [qaArchiving, setQaArchiving] = React.useState(false);
      const qaSendAbortRef = React.useRef(null); // qa 流式中止控制器
      /* paBg-20261005：跨页恢复轮询（面板卸载即停；回执留在 sessionStorage，切回自动续跑） */
      const qaRecoverTimerRef = React.useRef(null);
      const qaRecoverTicksRef = React.useRef(0);
      const qaDelTimerRef = React.useRef(null); // 会话两段式删除恢复计时器
      const qaIdRef = React.useRef(0); // qa 消息 id 计数
      const qaSeqRef = React.useRef(0); // qa 附件 chip key 计数
      const qaSessionsStaleRef = React.useRef(true); // 进入视图时按需拉取会话列表
      const qaFlowRef = React.useRef(null); // 消息列表容器（滚底）
      const qaStickRef = React.useRef(true); // 用户未上滚时才自动滚底
      const qaInputRef = React.useRef(null); // 输入框（@文件问答跳转后聚焦）
      /* PA-QALAYOUT-20261005：输入区高度（px）。底边固定贴底，上边由 .pa-resize-grip 拖拽改变；
       * 高度按浏览器本地记忆（localStorage），刷新后沿用；上限随卡片高度动态收敛，避免挤压消息区。 */
      const PA_COMPOSE_H_MIN = 96;
      const PA_COMPOSE_H_DEFAULT = 104;
      const [qaComposeH, setQaComposeH] = React.useState(() => {
        try {
          const v = Number(localStorage.getItem('pa-qa-compose-h-v1'));
          if (Number.isFinite(v) && v >= PA_COMPOSE_H_MIN && v <= 900) return v;
        } catch { /* 隐私模式等：回落默认 */ }
        return PA_COMPOSE_H_DEFAULT;
      });
      const qaComposeHRef = React.useRef(qaComposeH);
      const qaResizeRef = React.useRef(null); // {startY,startH,maxH,move,up}
      const qaResizeActiveRef = React.useRef(false);
      const [qaResizing, setQaResizing] = React.useState(false);
      const qaComposeMax = () => {
        const card = qaFlowRef.current && qaFlowRef.current.closest ? qaFlowRef.current.closest('.pa-chat-card') : null;
        const cardH = card ? card.getBoundingClientRect().height : 620;
        return Math.max(200, Math.round(cardH - 232)); // 预留门禁条/标题/工具条/提示行 + 消息区最小高度
      };
      const applyQaComposeH = (h) => { qaComposeHRef.current = h; setQaComposeH(h); };
      const persistQaComposeH = () => { try { localStorage.setItem('pa-qa-compose-h-v1', String(qaComposeHRef.current)); } catch { /* 忽略 */ } };
      const endQaComposeResize = () => {
        const st = qaResizeRef.current;
        if (st) { window.removeEventListener('pointermove', st.move); window.removeEventListener('pointerup', st.up); window.removeEventListener('pointercancel', st.up); }
        qaResizeRef.current = null;
        if (qaResizeActiveRef.current) { qaResizeActiveRef.current = false; setQaResizing(false); persistQaComposeH(); }
      };
      const startQaComposeResize = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (qaResizeRef.current) return;
        e.preventDefault();
        const startY = e.clientY;
        const startH = qaComposeHRef.current;
        const maxH = qaComposeMax();
        const move = (ev) => {
          // 上边向上拖 → 变高；向下拖 → 变矮。底边始终贴底，因此高度完全由位移决定。
          const next = Math.min(maxH, Math.max(PA_COMPOSE_H_MIN, Math.round(startH + (startY - ev.clientY))));
          applyQaComposeH(next);
        };
        const up = () => endQaComposeResize();
        qaResizeRef.current = { startY, startH, maxH, move, up };
        qaResizeActiveRef.current = true;
        setQaResizing(true);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      };
      const nudgeQaComposeH = (delta) => {
        const next = Math.min(qaComposeMax(), Math.max(PA_COMPOSE_H_MIN, qaComposeHRef.current + delta));
        applyQaComposeH(next);
        persistQaComposeH();
      };
      React.useEffect(() => () => {
        const st = qaResizeRef.current;
        if (st) { window.removeEventListener('pointermove', st.move); window.removeEventListener('pointerup', st.up); window.removeEventListener('pointercancel', st.up); }
        qaResizeRef.current = null;
      }, []);
      /* v1.4.0 可选模型：qaModels=模型目录（GET /models）；qaModel=当前选择 {provider,model}（null=系统默认） */
      const [qaModels, setQaModels] = React.useState({ state: 'idle', groups: [], def: null });
      const [qaModel, setQaModel] = React.useState(null);
      const [qaBackgroundState,setQaBackgroundState]=React.useState('idle');
      const qaPendingRef=React.useRef(null);

      const flowRef = React.useRef(null);
      const idRef = React.useRef(0);
      const taRef = React.useRef(null);
      const fileInputRef = React.useRef(null);
      const dragDepthRef = React.useRef(0); // 嵌套 dragenter/leave 计数，避免子元素闪烁
      const uploadSeqRef = React.useRef(0);

      /* 进入本面板时收起 DSH 左侧导航栏（标准 hook usePanelInfo 观测激活面板切换）
       * 注意：usePanelInfo 是选择器 hook（useSyncExternalStoreWithSelector），必须传 selector，
       * 返回选中的值（此处直接取 activePanelId 字符串，保证依赖稳定）。 */
      const usePanelInfo = props.usePanelInfo;
      const activePanelId = typeof usePanelInfo === 'function'
        ? usePanelInfo(sel => (sel ? sel.activePanelId : null))
        : null;
      const queueHydratedRef = React.useRef(false);
      React.useEffect(() => {
        try {
          const stored = JSON.parse(sessionStorage.getItem('pa-prototype-queue-v1') || 'null');
          if(stored && Array.isArray(stored.files) && stored.tasks && typeof stored.tasks === 'object') {
            setFiles(stored.files.filter(f=>f && typeof f.key==='string' && typeof f.path==='string'));
            uploadSeqRef.current=stored.files.reduce((max,f)=>Math.max(max,Number(String(f.key).replace(/^f/,''))||0),0);
            const restored={};for(const [key,task] of Object.entries(stored.tasks)){const t={...task};if(!t.jobId&&['submitting','running','paused'].includes(t.status)){t.status='uncertain';t.error='刷新前提交回执未保存，请查归档；禁止重复提交';}else if(t.status==='submitting'&&t.jobId){t.status='paused';}restored[key]=t;}
            tasksRef.current=restored;setFileTasks(restored);
          }
        } catch {}
      }, []);
      React.useEffect(() => {
        if (!queueHydratedRef.current) {queueHydratedRef.current=true;return;}
        try {sessionStorage.setItem('pa-prototype-queue-v1',JSON.stringify({files,tasks:fileTasks}));} catch {}
      }, [files,fileTasks]);
      /* PA-QALAYOUT-20261005：材料签名去掉 tab —— 看哪个视图不改变“材料”，切视图不再撤销公开性确认；
       * 路径取三处并集（解析待办 ∪ 问答附件 ∪ 已发送问题带入的附件），任一处真实变化仍撤销确认。
       * 首帧不下发撤销：保留 publicConfirmed 的「默认已确认」初值。 */
      const materialSignature = JSON.stringify({source,role,mode,paths:[...files.map(f=>f.path),...qaFiles.map(f=>f.path),...qaMessages.filter(m=>m.role==='user').flatMap(m=>(m.files||[]).map(f=>f.path||f.name))].sort()});
      const materialSigRef = React.useRef(null);
      React.useEffect(()=>{
        if(materialSigRef.current===null){materialSigRef.current=materialSignature;return;}
        if(materialSigRef.current===materialSignature)return;
        materialSigRef.current=materialSignature;
        setPublicConfirmed(false);
      },[materialSignature]);

      /* 新消息入列 */
      const pushMsg = (partial) => {
        idRef.current += 1;
        const msg = Object.assign({ id: 'm' + idRef.current }, partial);
        setMessages((list) => list.concat([msg]));
      };

      /* 消息流自动滚到底（无定时器，随状态更新触发） */
      React.useEffect(() => {
        const el = flowRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [messages.length]);

      /* ── 交互 ── */
      const switchRole = (roleKey) => {
        setRole(roleKey);
        // 角色→默认模式映射，可手动改
        const nextMode = ROLE_DEFAULT_MODE[roleKey];
        if (nextMode) setMode(nextMode);
      };

      const selectEvidence = (eid) => { setActiveEvidence(eid); };

      const markVerified = () => {
        if (!activeEvidence) return;
        setVerifiedMap((m) => (m[activeEvidence] ? m : Object.assign({}, m, { [activeEvidence]: true })));
      };

      const resetChat = () => {
        try { if (qaAbortRef.current) qaAbortRef.current.abort(); } catch { /* 忽略 */ }
        setMessages([]);
        setPublicConfirmed(false);
        setActiveEvidence(null);
        setActiveScenario(null);
        setCopyState(null);
        setSendState(null);
        setFiles([]); // 仅清会话附件清单；磁盘暂存文件保留（与审计留痕一致）
        setActiveFileKey(null); // 同步清空解析页签的选中文件
        setUploadMsg(null);
        setDragOver(false);
        dragDepthRef.current = 0;
      };

      /* 演练场景：联动左栏选择 + 重放消息流（原型同款行为） */
      const loadScenario = (s) => {
        const presets = {
          A: { role: 'business_execution', mode: 'citation_verification', src: 'web_only', eid: 'E-101' },
          B: { role: 'legal_review', mode: 'legality_review', src: 'web_only', eid: 'E-103' },
          C: { role: 'policy_research', mode: 'policy_search', src: 'knowledge_only', eid: null },
        }[s];
        setRole(presets.role);
        setMode(presets.mode);
        setSource(presets.src);
        setPublicConfirmed(true);
        setActiveScenario(s);
        setCopyState(null);
        idRef.current += 1;
        const msgs = [];
        if (s === 'C') {
          msgs.push({ id: 'm' + idRef.current, kind: 'preflight', text: tr('preflightDoneRag') });
          idRef.current += 1;
          msgs.push({ id: 'm' + idRef.current, kind: 'report', scenario: 'C' });
          setActiveEvidence(null);
        } else {
          msgs.push({ id: 'm' + idRef.current, kind: 'preflight', text: tr('preflightDoneRole', { source: presets.src, role: presets.role }) });
          idRef.current += 1;
          msgs.push({ id: 'm' + idRef.current, kind: 'report', scenario: s });
          setActiveEvidence(presets.eid);
        }
        setMessages(msgs);
      };

      /* 任务简报（真实功能）：按 SPEC 模板动态填充当前 source/role/mode/任务描述/附件清单。
       * 已上传附件写入「文件名（绝对路径）」，供 AI 用 policy_extract 按路径读取（仍须先过门禁）。 */
      const buildBriefing = () => {
        const srcBrief = source === 'web_only' ? tr('sourceBriefWeb') : tr('sourceBriefRag');
        const filesBrief = files.length
          ? files.map((f) => f.name + '（绝对路径：' + f.path + '）').join('；')
          : tr('filesNone');
        return [
          tr('briefingLine1'),
          tr('briefingLine2'),
          tr('briefingLine3', { source: srcBrief }),
          tr('briefingLine4', { role: tr(ROLE_LABEL[role]), roleKey: role, mode: tr(MODE_LABEL[mode]), modeKey: mode }),
          tr('briefingLine5', { task: taskText.trim() || tr('taskPlaceholder') }),
          tr('briefingLine6', { files: filesBrief }),
          tr('briefingExec'),
        ].join('\n');
      };

      const generateBriefing = () => {
        const text = taskText.trim();
        if (text) pushMsg({ kind: 'user', text });
        if (!publicConfirmed) {
          // 门禁拒绝优先：单步追问公开性（与 Host preflight nextQuestion 口径一致）
          pushMsg({ kind: 'gate' });
          return;
        }
        const brief = buildBriefing();
        setBriefingText(brief);
        setCopyState(null);
        pushMsg({ kind: 'briefing', text: brief });
      };

      /* ── 面板内直接问答（真实功能）：POST /api/policy-analysis/ask（SSE）──
       * 不跳转会话页：宿主编程式创建 DSH 会话并投递问题，token 级流式回答
       * 直接渲染在本面板消息流里；会话历史持久化，可在会话列表回看。
       * 门禁拒绝优先：未确认公开性时不发任何请求。 */
      const sendAsk = async () => {
        if (qaBusy) return;
        const q = taskText.trim();
        if (!q) return;
        if (!publicConfirmed) {
          pushMsg({ kind: 'gate' });
          return;
        }
        idRef.current += 1;
        const qaId = 'm' + idRef.current;
        const qaMsg = {
          id: qaId, kind: 'qa', question: q,
          answer: '', thinking: '', tools: [],
          state: 'streaming', error: '',
          role, mode, source,
        };
        setMessages((list) => list.concat([qaMsg]));
        setTaskText('');
        setQaBusy(true);
        const patchQa = (patch) => setMessages((list) => list.map(
          (m) => (m.id === qaId ? Object.assign({}, m, patch) : m),
        ));
        const ctrl = new AbortController();
        qaAbortRef.current = ctrl;
        let answer = '';
        let thinking = '';
        const tools = [];
        try {
          const resp = await fetch('/api/policy-analysis/ask', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              question: q,
              files: files.map((f) => ({ name: f.name, path: f.path })),
              role, mode, source,
              publicConfirmed: true,
            }),
            signal: ctrl.signal,
          });
          if (!resp.ok || !resp.body) {
            let reason = 'HTTP ' + resp.status;
            try {
              const d = await resp.json();
              if (d && d.message) reason = d.message;
            } catch { /* 非 JSON 错误体 */ }
            throw new Error(reason);
          }
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          for (;;) {
            const r = await reader.read();
            if (r.done) break;
            buf += dec.decode(r.value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const raw = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              for (const line of raw.split('\n')) {
                if (line.charCodeAt(0) === 58 /* ':' */) continue; // SSE 注释/心跳
                if (!line.startsWith('data:')) continue;
                let ev = null;
                try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
                if (!ev || typeof ev !== 'object') continue;
                if (ev.type === 'delta' && typeof ev.text === 'string') {
                  answer += ev.text;
                  patchQa({ answer });
                } else if (ev.type === 'thinking' && typeof ev.text === 'string') {
                  thinking += ev.text;
                  patchQa({ thinking });
                } else if (ev.type === 'tool' && ev.name) {
                  if (tools[tools.length - 1] !== ev.name) {
                    tools.push(ev.name);
                    patchQa({ tools: tools.slice() });
                  }
                } else if (ev.type === 'turn_end') {
                  patchQa({ state: 'done' });
                } else if (ev.type === 'error') {
                  throw new Error(ev.message || 'unknown');
                }
              }
            }
          }
          setMessages((list) => list.map((m) => (
            m.id === qaId && m.state === 'streaming' ? Object.assign({}, m, { state: 'done' }) : m
          )));
        } catch (e) {
          const aborted = e && e.name === 'AbortError';
          patchQa({
            state: aborted ? 'done' : 'error',
            error: aborted ? '' : String((e && e.message) || e),
          });
        } finally {
          setQaBusy(false);
          qaAbortRef.current = null;
        }
      };
      const stopAsk = () => {
        try { if (qaAbortRef.current) qaAbortRef.current.abort(); } catch { /* 忽略 */ }
      };

      /* 复制：navigator.clipboard 优先，失败降级隐藏 textarea + execCommand */
      const doFallbackCopy = (text) => {
        const ta = taRef.current;
        if (!ta) return false;
        try {
          ta.value = text;
          ta.focus();
          ta.select();
          const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
          ta.value = '';
          return !!ok;
        } catch (e) {
          try { ta.value = ''; } catch (e2) { /* 忽略 */ }
          return false;
        }
      };
      const copyBriefing = () => {
        if (!briefingText) return;
        const done = (ok) => setCopyState(ok ? 'ok' : 'fail');
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(briefingText).then(
            () => done(true),
            () => done(doFallbackCopy(briefingText)),
          );
        } else {
          done(doFallbackCopy(briefingText));
        }
      };

      /* ── 发送到会话（真实功能）：把简报自动写入 DSH 会话输入框并触发发送，免手动复制粘贴 ──
       * 链路：selectPanel(null) 切回会话页 → 轮询定位 Lexical 输入编辑器（data-lexical-editor）
       * → execCommand 写入草稿（先清空）→ 点击发送按钮（aria-label=发送/Send），
       * 找不到按钮时回退在编辑器上派发 Enter 键（走 keymap 的 keyboard.submit）。
       * 门禁拒绝优先：未确认公开性时与 generateBriefing 同口径追问，不写入任何内容。 */
      const findDraftEditor = () => {
        if (typeof document === 'undefined') return null;
        const nodes = Array.from(document.querySelectorAll('[data-lexical-editor="true"]'));
        const visible = nodes.filter((el) => el.isContentEditable && el.offsetParent !== null);
        if (!visible.length) return null;
        // 会话输入栏在页面底部且较宽：按（top+width）降序取第一
        visible.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return (rb.top + rb.width) - (ra.top + ra.width);
        });
        return visible[0];
      };
      const clickSendButton = () => {
        if (typeof document === 'undefined') return false;
        const names = ['发送', 'Send'];
        const btns = Array.from(document.querySelectorAll('button[aria-label]')).filter((b) => {
          if (b.offsetParent === null) return false;
          const label = (b.getAttribute('aria-label') || '').trim();
          return names.indexOf(label) >= 0;
        });
        if (btns.length) { btns[btns.length - 1].click(); return true; }
        return false;
      };
      const writeDraft = (editor, text) => {
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        const lines = String(text).split('\n');
        lines.forEach((line, i) => {
          if (i > 0) document.execCommand('insertParagraph', false, null);
          if (line) document.execCommand('insertText', false, line);
        });
      };
      const sendToSession = () => {
        if (!publicConfirmed) {
          pushMsg({ kind: 'gate' });
          return;
        }
        const brief = buildBriefing();
        setBriefingText(brief);
        setCopyState(null);
        setSendState('busy');
        try {
          window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: { expand: true, home: true } }));
        } catch { /* 派发失败不阻塞后续 DOM 轮询 */ }
        const started = Date.now();
        const poll = setInterval(() => {
          const editor = findDraftEditor();
          if (!editor) {
            if (Date.now() - started > 8000) {
              clearInterval(poll);
              setSendState('fail');
            }
            return;
          }
          clearInterval(poll);
          try {
            writeDraft(editor, brief);
          } catch (e) {
            setSendState('fail');
            return;
          }
          setTimeout(() => {
            let ok = false;
            try { ok = clickSendButton(); } catch { ok = false; }
            if (!ok) {
              try {
                editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                ok = true;
              } catch { ok = false; }
            }
            setSendState(ok ? 'ok' : 'fail');
          }, 300);
        }, 250);
        sendPollRef.current = poll; // 登记轮询句柄：组件卸载时统一清理，避免 setInterval 泄漏
      };

      /* ── 附件上传（真实功能）：点击 📎 选文件，或把文件直接拖入对话区 ──
       * 客户端先做扩展名/大小预检（提示更快），再 POST 原始字节到 Host 半落盘；
       * 上传只做字节暂存：绝不解析、绝不外发，也绝不改变公开性门禁状态（底线 1：上传不等于授权）。 */
      const formatBytes = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v) || v < 0) return '?';
        if (v >= 1048576) return (v / 1048576).toFixed(1) + 'MB';
        if (v >= 1024) return Math.round(v / 1024) + 'KB';
        return v + 'B';
      };

      const uploadOne = async (file, target) => {
        const fileName = file && typeof file.name === 'string' ? file.name : '';
        if (!UPLOAD_EXT_RE.test(fileName)) {
          setUploadMsg({ kind: 'error', text: tr('uploadUnsupported') + (fileName || '（未命名文件）') });
          return;
        }
        if (file.size > UPLOAD_MAX_BYTES) {
          setUploadMsg({ kind: 'error', text: tr('uploadTooLarge') + fileName + '（' + formatBytes(file.size) + '）' });
          return;
        }
        setUploadBusy(true);
        try {
          const resp = await fetch(UPLOAD_URL + '?name=' + encodeURIComponent(fileName), {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream' },
            credentials: 'same-origin',
            body: file,
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true && typeof data.path === 'string' && data.path) {
            uploadSeqRef.current += 1;
            const meta = {
              key: 'f' + uploadSeqRef.current,
              name: typeof data.name === 'string' && data.name ? data.name : fileName,
              sizeBytes: Number(data.sizeBytes) || file.size,
              path: data.path,
              ext: typeof data.ext === 'string' ? data.ext : '',
            };
            setFiles((list) => list.concat([meta]));
            // 智能问答来源的上传同步进待附文件 chips（文件解析来源不影响 qa 附件）
            if (target === 'qa') setQaFiles((list) => list.concat([meta]));
            // 解析视图联动：尚未选中文件时自动选中本次上传成功的文件（已选中则保持不变）
            setActiveFileKey((k) => (k === null ? 'f' + uploadSeqRef.current : k));
            setUploadMsg(null);
          } else if (resp.ok && data && data.ok === true) {
            // 200 但返回的是「包身份探测」结构而非上传结果：Host 半路由仍是旧版本（改动后未重新 apply）
            setUploadMsg({ kind: 'error', text: tr('uploadFail') + fileName + '：' + tr('uploadStaleHost') });
          } else {
            const reason = data && data.message ? data.message : 'HTTP ' + resp.status;
            setUploadMsg({ kind: 'error', text: tr('uploadFail') + fileName + '：' + reason });
          }
        } catch (e) {
          setUploadMsg({ kind: 'error', text: tr('uploadFail') + fileName + '：' + (e && e.message ? e.message : String(e)) });
        } finally {
          setUploadBusy(false);
        }
      };

      /* 顺序上传（避免并发写盘与提示闪烁）；fileList 可为 FileList 或数组；
       * target 透传 uploadOne（'qa'=智能问答附件） */
      const handleFiles = async (fileList, target) => {
        if (queueBusyRef.current || qaSendBusy) {setUploadMsg({kind:'error',text:'任务运行中材料已冻结，请等待后上传'});return;}
        const arr = [];
        for (let i = 0; i < (fileList ? fileList.length : 0); i++) arr.push(fileList[i]);
        for (const f of arr) await uploadOne(f, target);
      };

      const removeFile = (key) => {
        const task=tasksRef.current[key];
        if(queueBusyRef.current || (task && task.jobId && !['done','failed'].includes(task.status))) {setParseMsg({kind:'info',text:'任务尚在后台运行；不可移除或冒称取消'});return;}
        setFiles((list) => list.filter((f) => f.key !== key));
        setActiveFileKey((k) => (k === key ? null : k)); // 移除的是解析页签选中文件时同步清空选中态
        // 注：仅从本次会话附件清单移除；磁盘暂存文件保留（与审计留痕一致，不静默删除用户数据）
      };

      const onFileInputChange = (e) => {
        const fl = e && e.target && e.target.files;
        if (fl && fl.length) void handleFiles(fl, uploadTargetRef.current);
        try { e.target.value = ''; } catch { /* 允许再次选择同名文件 */ }
        uploadTargetRef.current = null;
      };

      /* 上传入口：触发隐藏 file input（多选，accept 白名单 .pdf/.docx/.xlsx）；
       * target 标记上传来源（'qa'=智能问答附件，缺省=文件解析附件），供上传成功后分流 chip 列表 */
      const pickFiles = (target) => {
        uploadTargetRef.current = target || null;
        if (fileInputRef.current && typeof fileInputRef.current.click === 'function') fileInputRef.current.click();
      };

      /* 拖拽上传：只拦截包含文件的拖拽（dataTransfer.types 含 'Files'），
       * 文本/富文本拖放保持浏览器默认行为（不影响输入框文字拖放）。 */
      const hasFilesInDT = (e) => {
        const dt = e && e.dataTransfer;
        if (!dt || !dt.types) return false;
        try { return Array.prototype.indexOf.call(dt.types, 'Files') !== -1; } catch { return false; }
      };
      const onDragEnter = (e) => {
        if (!hasFilesInDT(e)) return;
        e.preventDefault();
        dragDepthRef.current += 1;
        setDragOver(true);
      };
      const onDragOver = (e) => {
        if (!hasFilesInDT(e)) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'copy'; } catch { /* 忽略 */ }
      };
      const onDragLeave = (e) => {
        if (!hasFilesInDT(e)) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      };
      /* PAC-DROP-20261005：拖拽收集——文件夹递归展开（知识库同款）；返回 File[] 数组，handleFiles 按 length+索引消费 */
      const paCollectEntries = (dt) => {
        const out = [];
        const readAll = (reader) => new Promise((res) => { const acc = []; const step = () => reader.readEntries((ents) => { if (!ents || !ents.length) return res(acc); acc.push(...ents); step(); }, () => res(acc)); step(); });
        const walk = async (entry, path) => {
          if (!entry) return;
          if (entry.isFile) {
            const f = await new Promise((res) => entry.file((x) => res(x), () => res(null)));
            if (f) { try { Object.defineProperty(f, 'webkitRelativePath', { value: path + f.name, configurable: true }); } catch (err) { /* 只读属性则忽略 */ } out.push(f); }
            return;
          }
          if (entry.isDirectory) { const kids = await readAll(entry.createReader()); for (const k of kids) await walk(k, path + entry.name + '/'); }
        };
        const items = dt && dt.items ? Array.prototype.slice.call(dt.items) : [];
        const entries = items.map((it) => (it && it.kind === 'file' && it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean);
        if (!entries.length) return Promise.resolve(dt ? Array.prototype.slice.call(dt.files || []) : []);
        return (async () => { for (const e of entries) await walk(e, ''); return out; })();
      };
      const onDrop = (e) => {
        if (!hasFilesInDT(e)) return;
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        void paCollectEntries(e.dataTransfer).then((arr) => { if (arr.length) void handleFiles(arr); }); /* PAC-DROP-20261005 */
      };

      /* 智能问答视图的拖拽落点：复用悬停态与上传管线，来源标记 'qa'（附件进 qaFiles 待附列表） */
      const onQaDrop = (e) => {
        if (!hasFilesInDT(e)) return;
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        void paCollectEntries(e.dataTransfer).then((arr) => { if (arr.length) void handleFiles(arr, 'qa'); }); /* PAC-DROP-20261005 */
      };

      /* ════════ 页签1「文件解析」：上传 → 开始解析 → SSE 过程/结果 → 归档 ════════ */
      const activeFile = files.find((f) => f.key === activeFileKey) || null;

      const pad2 = (n) => String(n).padStart(2, '0');
      const nowHMS = () => {
        const d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
      };
      const pushParseLog = (text, kind) => {
        const entry={ts:nowHMS(),text:String(text),kind:kind||'info'};
        setParseLog(list=>list.concat([entry]));
        const key=currentQueueFileRef.current;
        if(key) updateFileTask(key,{logs:((tasksRef.current[key] && tasksRef.current[key].logs)||[]).concat([entry])});
      };

      /* 剪贴板统一入口（简报复制 / 路径复制 / 结果复制共用；失败降级隐藏 textarea） */
      const copyTextTo = (text, done) => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(() => done(true), () => done(doFallbackCopy(text)));
        } else {
          done(doFallbackCopy(text));
        }
      };
      const copyFilePath = (f) => {
        if (!f || !f.path) return;
        copyTextTo(f.path, (ok) => setParseMsg({ kind: ok ? 'ok' : 'error', text: tr(ok ? 'copyOk' : 'copyFail') }));
      };

      /* v1.3.2 Blob 下载统一入口（结果面板 Word / 归档记录 Word 共用）：
       * 文件名优先取 Content-Disposition（RFC 5987 filename*=UTF-8'' 优先，退回传统 filename），再退回传入名；无 .docx 后缀自动补。 */
      const saveBlobResp = (resp, blob, fallbackName) => {
        let fileName = fallbackName || 'download';
        try {
          const cd = resp.headers.get('content-disposition') || '';
          const m = /filename\*=UTF-8''([^;]+)/i.exec(cd) || /filename="?([^";]+)"?/i.exec(cd);
          if (m && m[1]) {
            try { fileName = decodeURIComponent(m[1]); } catch { fileName = m[1]; }
          }
        } catch { /* 头不可得时用回退名 */ }
        if (!/\.docx$/i.test(fileName)) fileName += '.docx';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        try { document.body.appendChild(a); } catch { /* 忽略 */ }
        a.click();
        try { if (a.remove) a.remove(); } catch { /* 忽略 */ }
        try { URL.revokeObjectURL(url); } catch { /* 忽略 */ }
      };

      /* v1.3.2 清除/读取跨页恢复标记（sessionStorage 不可用时静默跳过，不影响解析本身） */
      const clearActiveParseKey = () => {
        try { window.sessionStorage.removeItem(ACTIVE_PARSE_KEY); } catch { /* 忽略 */ }
      };

      /* 开始解析：门禁拒绝优先（未确认公开性 pushMsg({kind:'gate'}) 并中止，不发请求）。
       * 链路：POST /api/policy-analysis/parse（JSON：path/fileName/source/role/mode/publicConfirmed）
       *   → {ok, jobId, recordId, sessionId} → GET /api/policy-analysis/parse/events?jobId= 建 SSE；
       * 帧：status→日志 / tool→日志(tool) / thinking→动态滚动行 / delta→parseResult 累积 /
       *     done→parseRecord+结果兜底 / error→日志(error)+状态失败；':' 注释心跳帧跳过；
       * 「停止」只 abort 前端接收（服务端继续解析完并自动入档记录）。
       * v1.3.2：请求体固定缺省 FIXED_*（界面不再暴露选择）；发起成功后把 jobId/recordId
       * 写入 sessionStorage（ACTIVE_PARSE_KEY），供面板重挂载时跨页恢复（再次开始解析会覆盖）。 */
      const readQueuedStream = async (jobId, ctrl, resume) => {
        const key = currentQueueFileRef.current;
        let result = '', buffer = '', terminal = false;
        try {
          const response = await fetch('/api/policy-analysis/parse/events?jobId=' + encodeURIComponent(jobId), {credentials:'same-origin',signal:ctrl.signal});
          if (!response.ok || !response.body) throw new Error('解析事件流不可用：HTTP ' + response.status);
          const reader = response.body.getReader(), decoder = new TextDecoder();
          try {
            while (!terminal) {
              const chunk = await reader.read(); if (chunk.done) break;
              buffer += decoder.decode(chunk.value,{stream:true});
              let end;
              while ((end = buffer.indexOf('\n\n')) >= 0) {
                const frame = buffer.slice(0,end); buffer = buffer.slice(end+2);
                for (const line of frame.split('\n')) {
                  if (!line.startsWith('data:')) continue;
                  let event; try { event = JSON.parse(line.slice(5)); } catch {continue;}
                  if (event.type === 'status') { pushParseLog(event.text || '状态更新'); if(event.generationModel) updateFileTask(key,{generationModel:event.generationModel}); }
                  else if (event.type === 'tool') pushParseLog('工具：'+event.name,'tool');
                  else if (event.type === 'thinking') setParseThinking(v=>v+(event.text||''));
                  else if (event.type === 'delta') {result += event.text || '';setParseResult(result);updateFileTask(key,{result});}
                  else if (event.type === 'done' && event.record && event.record.status === 'done') {
                    terminal = true; const record = event.record;
                    setParseRecord(record);setParseResult(record.reportMarkdown || record.result || '');setParseResultState('done');setParseThinking('');
                    updateFileTask(key,{status:'done',record,result:record.reportMarkdown || record.result || ''});
                    recordsStaleRef.current = true;clearActiveParseKey();pushParseLog('完成（已保存独立记录，待人工复核）');
                    return record;
                  } else if (event.type === 'error') {terminal=true;updateFileTask(key,{status:'failed',error:event.message||'解析失败'});throw new Error(event.message || '解析失败');}
                }
              }
            }
            throw new Error('连接结束但未收到完成事件；保留原任务，可恢复接收');
          } finally { await reader.cancel().catch(()=>{}); }
        } catch (error) {
          const knownFailed = key && tasksRef.current[key] && tasksRef.current[key].status === 'failed';
          updateFileTask(key,{status:knownFailed?'failed':'paused',error:error.name === 'AbortError'?'已停止接收；后台任务未取消':error.message});
          setParseThinking('');setParseResultState(knownFailed?'error':'paused');
          setParseMsg({kind:knownFailed?'error':'info',text:error.name === 'AbortError'?'已停止接收，后台继续；点击开始可恢复原任务':error.message});
          throw error;
        }
      };

      const startParse = async () => {
        if (queueBusyRef.current || !files.length) return; /* PA-GATEHINT-20261019：解析页视为已确认，不再以 publicConfirmed 阻断 */
        const snapshot = files.slice();
        const options = {source,role,mode,depth:parseDepth,publicConfirmed:true,...(parseModel ? {provider:parseModel.provider,model:parseModel.model}: {})};
        queueBusyRef.current = true;setParseBusy(true);setParseMsg(null);
        try {
          for (const file of snapshot) {
            const task = tasksRef.current[file.key] || {};
            if (task.status === 'done' || task.status === 'failed') continue;
            if(task.status==='uncertain'){setParseMsg({kind:'error',text:'原任务提交回执丢失，请在归档中检查；不会自动重复提交'});break;}
            currentQueueFileRef.current = file.key;setActiveFileKey(file.key);setParseLog(task.logs || []);setParseResult('');setParseRecord(null);setParseThinking('');setParseResultState('streaming');
            const ctrl = new AbortController();parseAbortRef.current = ctrl;
            updateFileTask(file.key,{status:'running',options:task.options || options});
            try {
              let jobId = task.jobId, recordId = task.recordId;
              if (recordId) {
                const check = await fetch('/api/policy-analysis/records/'+encodeURIComponent(recordId),{credentials:'same-origin',signal:ctrl.signal});
                const data = await check.json();if(!check.ok||!data.ok) throw new Error(data.message || '原任务记录不可用；不重复提交');
                if (data.record.status !== 'parsing') {
                  updateFileTask(file.key,{status:data.record.status,record:data.record,result:data.record.reportMarkdown||data.record.result||''});
                  setParseRecord(data.record);setParseResult(data.record.reportMarkdown||data.record.result||'');setParseResultState(data.record.status==='done'?'done':'error');continue;
                }
              }
              if (!jobId) {
                if(!updateFileTask(file.key,{status:'submitting'})){updateFileTask(file.key,{status:'uncertain',error:'提交标记未能可靠保存，未发送请求'});setSubmitMsg({kind:'error',text:'本地回执存储不可用，未发送解析请求'});break;}
                const response = await fetch('/api/policy-analysis/parse',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({...options,path:file.path,fileName:file.name}),signal:ctrl.signal});
                const data = await response.json();if(!response.ok||!data.ok||!data.jobId) {updateFileTask(file.key,{status:'failed'});throw new Error(data.message || '创建任务失败');}
                jobId=data.jobId;recordId=data.recordId;updateFileTask(file.key,{status:'running',jobId,recordId,generationModel:data.record && data.record.generationModel});
              }
              setParseJobId(jobId);pushParseLog('['+file.name+'] 任务 '+jobId);
              try {sessionStorage.setItem(ACTIVE_PARSE_KEY,JSON.stringify({jobId,recordId,fileName:file.name,fileKey:file.key,startedAt:Date.now()}));} catch {}
              await readQueuedStream(jobId,ctrl,false);
            } catch(error) {
              const status = tasksRef.current[file.key] && tasksRef.current[file.key].status;
              if (status === 'submitting') {updateFileTask(file.key,{status:'uncertain',error:'提交回执丢失，请查归档，不能重复提交'});break;}
              if (status === 'paused' || error.name === 'AbortError') break;
              updateFileTask(file.key,{status:'failed',error:error.message});setParseMsg({kind:'error',text:file.name+'：'+error.message});setParseResultState('error');
            }
          }
        } finally {queueBusyRef.current=false;currentQueueFileRef.current=null;parseAbortRef.current=null;setParseBusy(false);}
      };

      /* v1.3.2 SSE 过程流（自 startParse 抽出，发起/跨页恢复共用）：
       * GET /parse/events?jobId= 建 SSE；服务端支持事件重放（≤5000 帧）+ 15s 心跳，
       * 重连即重放补齐已发生日志并继续实时流式（delta 从头累积，结果完整）。
       * resume=true 时错误提示改用「解析中断」口径，并清除恢复标记。 */
      const runParseStream = async (jobId,ctrl,resume) => {
        try {return await readQueuedStream(jobId,ctrl,resume);}catch {}finally{if(!queueBusyRef.current){setParseBusy(false);parseAbortRef.current=null;}}
      };
      const stopParse = () => {
        try { if (parseAbortRef.current) parseAbortRef.current.abort(); } catch { /* 忽略 */ }
      };

      /* 解析结果复制（结果面板头部「复制」） */
      const copyParseResult = () => {
        if (!parseResult) return;
        copyTextTo(parseResult, (ok) => setResultCopyState(ok ? 'ok' : 'fail'));
      };

      /* v1.3.2 下载 Word（GB/T 9704-2012 公文格式）：POST /parse/docx {title, markdown} → docx 字节流 Blob 下载。
       * 标题优先用完成记录标题，退回当前文件名；生成中按钮禁用，失败走内联提示。 */
      const downloadParseDocx = async () => {
        if (parseDocxBusy || !parseResult) return;
        setParseDocxBusy(true);
        try {
          const title = (parseRecord && typeof parseRecord.title === 'string' && parseRecord.title)
            || (activeFile && activeFile.name)
            || tr('parseDocxDefaultTitle');
          const resp = await fetch('/api/policy-analysis/parse/docx', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ title, markdown: parseResult }),
          });
          if (!resp.ok) {
            let reason = 'HTTP ' + resp.status;
            try {
              const d = await resp.json();
              if (d && d.message) reason = d.message;
            } catch { /* 非 JSON 错误体 */ }
            throw new Error(reason);
          }
          const blob = await resp.blob();
          saveBlobResp(resp, blob, title);
          setParseMsg({ kind: 'ok', text: tr('parseDocxOk') });
        } catch (e) {
          setParseMsg({ kind: 'error', text: tr('parseDocxFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setParseDocxBusy(false);
        }
      };

      /* 归档对话框：预填解析标题，Esc/取消可关；确认后 POST /records/{id}/archive（{title, remark}） */
      const openArchive = () => {
        if (!parseRecord) return;
        setArchiveTitle(typeof parseRecord.title === 'string' && parseRecord.title ? parseRecord.title : (activeFile ? activeFile.name : ''));
        setArchiveRemark(typeof parseRecord.remark === 'string' ? parseRecord.remark : '');
        setArchiveMsg(null);
        setArchiveOpen(true);
      };
      const submitArchive = async () => {
        if (archiveBusy || !parseRecord || !parseRecord.id) return;
        setArchiveBusy(true);
        setArchiveMsg(null);
        const title = archiveTitle.trim();
        const remark = archiveRemark.trim();
        try {
          const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(parseRecord.id) + '/archive', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ title, remark }),
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            const next = Object.assign({}, parseRecord, { title: title || parseRecord.title, remark });
            if (data.record && typeof data.record === 'object') Object.assign(next, data.record);
            setParseRecord(next);
            setArchiveOpen(false);
            setParseMsg({ kind: 'ok', text: tr('archOk') });
            setRecMsg({ kind: 'ok', text: tr('archOk') });
            recordsStaleRef.current = true; // 归档成功 → 切到记录页签并自动刷新
            setTab('records');
          } else {
            const reason = data && data.message ? data.message : 'HTTP ' + resp.status;
            setArchiveMsg({ kind: 'error', text: tr('archFail') + reason });
          }
        } catch (e) {
          setArchiveMsg({ kind: 'error', text: tr('archFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setArchiveBusy(false);
        }
      };

      /* ════════ 页签2「解析归档记录」：筛选查询 / 查看 / @文件问答 / 两段式删除 ════════ */
      /* createdAt → 'YYYY-MM-DD HH:mm'（ISO 字符串 / 时间戳均可，异常值原样回显） */
      const fmtDateTime = (v) => {
        let d = null;
        if (typeof v === 'number' && Number.isFinite(v)) d = new Date(v);
        else if (typeof v === 'string' && v) { const n = new Date(v); if (!Number.isNaN(n.getTime())) d = n; }
        if (!d) return typeof v === 'string' && v ? v : '—';
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
          + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      };

      /* GET /api/policy-analysis/records?q=&from=&to=（空值不传参）；override 供「重置」即时按空条件查询 */
      const loadRecords = async (override) => {
        const qv = override && typeof override.q === 'string' ? override.q : recQ;
        const fv = override && typeof override.from === 'string' ? override.from : recFrom;
        const tv = override && typeof override.to === 'string' ? override.to : recTo;
        setRecLoading(true);
        try {
          const qs = [];
          const view=override&&override.view?override.view:recView;
          if(view==='completed')qs.push('status=done');else if(view==='archived')qs.push('archived=only');
          if (qv.trim()) qs.push('q=' + encodeURIComponent(qv.trim()));
          if (fv) qs.push('from=' + encodeURIComponent(fv));
          if (tv) qs.push('to=' + encodeURIComponent(tv));
          const resp = await fetch('/api/policy-analysis/records' + (qs.length ? '?' + qs.join('&') : ''), {
            credentials: 'same-origin',
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            setRecords(Array.isArray(data.records) ? data.records : []);
            setRecordsTotal(Number(data.total) || (Array.isArray(data.records) ? data.records.length : 0));
            recordsStaleRef.current = false;
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setRecMsg({ kind: 'error', text: tr('recLoadFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setRecLoading(false);
        }
      };
      /* PA-RECRANGE-20261012：解析归档 真·时间段筛选入口（起止日期 + 快捷区间）
       * 快捷区间直接算出 YYYY-MM-DD 边界并即时查询；手改起止日期自动切到 custom。 */
      const REC_RANGE_PRESETS = [
        ['all', '全部时间'], ['today', '今天'], ['7d', '近 7 天'],
        ['30d', '近 30 天'], ['90d', '近 90 天'], ['month', '本月'], ['custom', '自定义区间'],
      ];
      const recYmd = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      const recRangeBounds = (key) => {
        if (key === 'all' || key === 'custom') return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (key === 'month') return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
        const days = key === 'today' ? 1 : key === '7d' ? 7 : key === '30d' ? 30 : key === '90d' ? 90 : 0;
        if (!days) return null;
        const start = new Date(today); start.setDate(start.getDate() - (days - 1));
        return { from: start, to: today };
      };
      const applyRecRange = (key) => {
        setRecRange(key);
        const b = recRangeBounds(key);
        if (b) {
          const f = recYmd(b.from), t = recYmd(b.to);
          setRecFrom(f); setRecTo(t);
          void loadRecords({ from: f, to: t });
        } else if (key === 'all') {
          setRecFrom(''); setRecTo('');
          void loadRecords({ from: '', to: '' });
        }
      };
      /* 手改起止日期：自动落到「自定义区间」，只覆盖改动的那一端（另一端沿用当前值） */
      const editRecFrom = (v) => { setRecRange('custom'); setRecFrom(v); void loadRecords({ from: v }); };
      const editRecTo = (v) => { setRecRange('custom'); setRecTo(v); void loadRecords({ to: v }); };
      const resetRecFilters = () => {
        setRecQ('');
        setRecFrom('');
        setRecTo('');
        setRecRange('all');
        void loadRecords({ q: '', from: '', to: '' });
      };

      const deleteRecord = async (rec) => {
        setRecMsg(null);
        try {
          const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(rec.id), {
            method: 'DELETE',
            credentials: 'same-origin',
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            setRecMsg({ kind: 'ok', text: tr('recDelOk') });
            for(const [key,task] of Object.entries(tasksRef.current)){if(task.recordId===rec.id)updateFileTask(key,{status:'pending',record:null,recordId:null,jobId:null,result:''});}
            if(parseRecord&&parseRecord.id===rec.id){setParseRecord(null);setParseResult('');setParseResultState('idle');}
            recordsStaleRef.current = true;
            // v1.3.2：删除的是进行中/恢复标记指向的记录时，同步清除跨页恢复标记
            try {
              const raw = window.sessionStorage.getItem(ACTIVE_PARSE_KEY);
              if (raw) {
                const saved = JSON.parse(raw);
                if (saved && saved.recordId && saved.recordId === rec.id) clearActiveParseKey();
              }
            } catch { /* 忽略 */ }
            void loadRecords();
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setRecMsg({ kind: 'error', text: tr('recDelFail') + (e && e.message ? e.message : String(e)) });
        }
      };
      /* 两段式删除确认：点一次变「确认删除？」再点执行，3 秒未点自动恢复 */
      const requestDelete = (rec) => {
        if (!rec || !rec.id) return;
        if(rec.status==='parsing'){setRecMsg({kind:'error',text:'任务仍在运行，不能将删除记录当作取消；请等待真实终态'});return;}
        if (delTimerRef.current) { try { clearTimeout(delTimerRef.current); } catch { /* 忽略 */ } delTimerRef.current = null; }
        if (pendingDeleteId === rec.id) {
          setPendingDeleteId(null);
          void deleteRecord(rec);
          return;
        }
        setPendingDeleteId(rec.id);
        delTimerRef.current = setTimeout(() => { setPendingDeleteId(null); delTimerRef.current = null; }, 3000);
      };

      /* v1.3.2 归档记录下载 Word（GB/T 9704-2012 公文格式）：
       * GET /records/:id/docx → docx 字节流 Blob 下载（保持 credentials 与统一错误提示，不用 window.open）。 */
      const downloadRecordDocx = async (rec) => {
        if (!rec || !rec.id || docxRecBusyId) return;
        setDocxRecBusyId(rec.id);
        try {
          const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(rec.id) + '/docx', {
            credentials: 'same-origin',
          });
          if (!resp.ok) {
            let reason = 'HTTP ' + resp.status;
            try {
              const d = await resp.json();
              if (d && d.message) reason = d.message;
            } catch { /* 非 JSON 错误体 */ }
            throw new Error(reason);
          }
          const blob = await resp.blob();
          saveBlobResp(resp, blob, rec.title || rec.fileName || tr('parseDocxDefaultTitle'));
          setRecMsg({ kind: 'ok', text: tr('parseDocxOk') });
        } catch (e) {
          setRecMsg({ kind: 'error', text: tr('parseDocxFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setDocxRecBusyId(null);
        }
      };

      /* ════════ v1.4.2 记录编辑：行内/抽屉「编辑」→ 对话框（GET /records/:id 预填 → POST /records/:id/edit） ════════
       * editResultTouchedRef：用户是否改过结果正文；editResultLoadedRef：
       * 'pending' 详情载入中 | 'full' 全文已填 | 'preview' 全文拉取失败、正文退回列表预览。
       * 提交时仅 'full' 或用户改过正文才携带 result，避免把 160 字预览写回覆盖全文。 */
      const editResultTouchedRef = React.useRef(false);
      const editResultLoadedRef = React.useRef('pending');
      const openRecordEdit = (rec) => {
        if (!rec || !rec.id) return;
        editResultTouchedRef.current = false;
        editResultLoadedRef.current = 'pending';
        setEditRecord(Object.assign({}, rec, { __loading: true, __loadError: '' }));
        setEditTitle(typeof rec.title === 'string' ? rec.title : '');
        setEditFileName(typeof rec.fileName === 'string' ? rec.fileName : '');
        setEditRemark(typeof rec.remark === 'string' ? rec.remark : '');
        setEditResult(typeof rec.resultPreview === 'string' ? rec.resultPreview : '');
        setEditMsg(null);
        void (async () => {
          try {
            const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(rec.id), {
              credentials: 'same-origin',
            });
            let data = null;
            try { data = await resp.json(); } catch { data = null; }
            if (resp.ok && data && data.ok === true && data.record) {
              const full = data.record;
              setEditRecord((cur) => (cur && cur.id === rec.id ? Object.assign({}, full, { __loading: false, __loadError: '' }) : cur));
              setEditFileName(typeof full.fileName === 'string' ? full.fileName : '');
              setEditRemark(typeof full.remark === 'string' ? full.remark : '');
              if (!editResultTouchedRef.current) setEditResult(typeof full.result === 'string' ? full.result : '');
              editResultLoadedRef.current = 'full';
            } else {
              throw new Error((data && data.message) || 'HTTP ' + resp.status);
            }
          } catch (e) {
            // 详情拉取失败：正文退回列表行预览（提交时不携带 result 防覆盖全文），提示但不阻断编辑
            setEditRecord((cur) => (cur && cur.id === rec.id
              ? Object.assign({}, cur, { __loading: false, __loadError: String((e && e.message) || e) })
              : cur));
            if (!editResultTouchedRef.current) setEditResult(typeof rec.resultPreview === 'string' ? rec.resultPreview : '');
            editResultLoadedRef.current = 'preview';
            setEditMsg({ kind: 'error', text: tr('editLoadFail') + String((e && e.message) || e) });
          }
        })();
      };
      const submitRecordEdit = async () => {
        const rec = editRecord;
        if (editBusy || !rec || !rec.id || rec.__loading) return;
        setEditBusy(true);
        setEditMsg(null);
        const payload = {
          title: editTitle.trim(),
          fileName: editFileName.trim(),
          remark: editRemark.trim(),
        };
        const resultEditable = rec.status !== 'parsing'; // 解析进行中锁正文（服务端同样拒绝）
        if (resultEditable && (editResultLoadedRef.current === 'full' || editResultTouchedRef.current)) {
          payload.result = editResult;
        }
        try {
          const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(rec.id) + '/edit', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            const saved = data.record && typeof data.record === 'object' ? data.record : null;
            setEditRecord(null);
            setRecMsg({ kind: 'ok', text: tr('editOk') });
            recordsStaleRef.current = true;
            void loadRecords(); // 编辑成功 → 立即刷新列表
            // 同步查看抽屉（开着同一条记录时）与文件解析页的当前记录元数据
            if (saved) {
              setDrawerRecord((cur) => (cur && cur.id === rec.id ? Object.assign({}, cur, saved) : cur));
              setParseRecord(cur=>(cur&&cur.id===rec.id?saved:cur));
              if(parseRecord&&parseRecord.id===rec.id)setParseResult(saved.reportMarkdown||saved.result||'');
              for(const [key,task] of Object.entries(tasksRef.current)){if(task.recordId===saved.id)updateFileTask(key,{record:saved,result:saved.reportMarkdown||saved.result||''});}
            }
          } else {
            const reason = data && data.message ? data.message : 'HTTP ' + resp.status;
            setEditMsg({ kind: 'error', text: tr('editFail') + reason });
          }
        } catch (e) {
          setEditMsg({ kind: 'error', text: tr('editFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setEditBusy(false);
        }
      };
      const jumpToFileQa = (rec) => {
        if (!rec) return;
        setDrawerRecord(null);
        setTab('qa');
        const hasFile = typeof rec.fileName === 'string' && rec.fileName
          && typeof rec.filePath === 'string' && rec.filePath;
        if (hasFile) {
          qaSeqRef.current += 1;
          const chip = { key: 'qf' + qaSeqRef.current, name: rec.fileName, path: rec.filePath, fromRecord: true };
          setQaFiles((list) => (list.some((f) => f.path === chip.path) ? list : list.concat([chip])));
          setQaMsg({ kind: 'ok', text: tr('qaJumpOk') });
        } else {
          setQaMsg({ kind: 'info', text: tr('qaJumpOkNoFile') });
        }
        // 聚焦输入框（视图切换后下一帧 DOM 已挂载；仅 focus，无定时器链）
        setTimeout(() => {
          try { if (qaInputRef.current && typeof qaInputRef.current.focus === 'function') qaInputRef.current.focus(); } catch { /* 忽略 */ }
        }, 60);
      };

      /* ════════ 视图3「智能问答」（v1.3.0）：会话列表 + 流式问答 + 一键归档 ════════ */
      /* lastActiveAt → 当日 HH:mm，否则 MM-DD */
      const fmtQaTime = (v) => {
        let d = null;
        if (typeof v === 'number' && Number.isFinite(v)) d = new Date(v);
        else if (typeof v === 'string' && v) { const n = new Date(v); if (!Number.isNaN(n.getTime())) d = n; }
        if (!d) return '—';
        const now = new Date();
        const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        if (sameDay) return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      };

      /* paQaTs-20261005：消息气泡时间戳（今日 HH:mm / 同年 MM-DD HH:mm / 跨年 YYYY-MM-DD HH:mm；无效值返回 '' 不渲染） */
      const fmtQaMsgTime = (v, compact) => {
        let d = null;
        if (typeof v === 'number' && Number.isFinite(v)) d = new Date(v);
        else if (typeof v === 'string' && v) { const n = new Date(v); if (!Number.isNaN(n.getTime())) d = n; }
        if (!d) return '';
        const now = new Date();
        const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        if (compact) return hm;
        if (d.getFullYear() !== now.getFullYear()) return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + hm;
        if (d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate()) return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + hm;
        return hm;
      };

      /* paQaTsNarrow-20261005：时间戳双形态渲染——完整格式(.pa-msg-ts) 与窄屏紧凑格式(.pa-msg-tsn)，
       * 由 PA_QATS_CSS 的媒体查询决定显示哪一个；两者 title 均为完整时间，窄屏不丢信息。 */
      const qaTsNodes = (v, style) => {
        const full = fmtQaMsgTime(v);
        if (!full) return null;
        const compact = fmtQaMsgTime(v, true);
        const nodes = [h('span', { key: 'f', className: 'pa-msg-ts', title: full, style: style }, full)];
        if (compact) nodes.push(h('span', { key: 'c', className: 'pa-msg-tsn', title: full, style: style }, compact));
        return nodes;
      };

      /* GET /api/policy-analysis/qa/sessions：会话列表（进入视图或 turn_end 后刷新） */
      const loadQaSessions = async () => {
        setQaSessionsLoading(true);
        try {
          const resp = await fetch('/api/policy-analysis/qa/sessions', { credentials: 'same-origin' });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true && Array.isArray(data.sessions)) {
            setQaSessions(data.sessions);
            qaSessionsStaleRef.current = false;
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaSessionsLoadFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setQaSessionsLoading(false);
        }
      };

      /* 新建会话：清空当前 sessionId（不立即请求），下次发送由服务端创建并在 SSE status 帧返回 sessionId */
      const newQaSession = () => {
        if (qaSendBusy) {
          setQaMsg({ kind: 'info', text: tr('qaSessionSwitchBusy') });
          return;
        }
        stopQaRecoverPoll(); /* paBg-20261005：新建会话停掉上一回合的恢复轮询，避免旧结果回填 */
        setQaActiveId(null);qaPendingRef.current=null;setQaBackgroundState('idle');try{sessionStorage.removeItem(QA_RECOVERY_KEY);}catch{}
        setQaMessages([]);
        setQaInput('');setQaFiles([]);setPublicConfirmed(false);
        setQaThinking('');
        // v1.4.0：新会话回到系统默认模型
        setQaModel(qaModels.def || null);
        setQaMsg({ kind: 'info', text: tr('qaNewSessionHint') });
      };

      /* v1.4.0 可选模型：GET /models → 与 DSH「设置-模型」同源的可选模型目录；
       * 失败（宿主未提供 llm/未配置默认模型）→ 选择器降级为提示文案，问答沿用系统默认。 */
      const loadQaModels = async () => {
        setQaModels((s) => ({ state: 'loading', groups: s.groups || [], def: s.def || null }));
        try {
          const resp = await fetch('/api/policy-analysis/models', { credentials: 'same-origin' });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            const groups = (Array.isArray(data.groups) ? data.groups : [])
              .map((g) => ({
                id: String((g && g.id) || ''),
                name: String((g && g.name) || (g && g.id) || ''),
                models: (Array.isArray(g && g.models) ? g.models : [])
                  .filter((m) => m && m.id)
                  .map((m) => ({ id: String(m.id), name: String(m.name || m.id) })),
              }))
              .filter((g) => g.id && g.models.length > 0);
            const def = (data.default && data.default.provider && data.default.model)
              ? { provider: String(data.default.provider), model: String(data.default.model) }
              : null;
            setQaModels({ state: 'ready', groups, def });
            // 选中值兜底：当前选择仍在目录内则保留；否则选系统默认；再否则选第一个可用项
            setQaModel((cur) => {
              const all = [];
              for (const g of groups) for (const m of g.models) all.push({ provider: g.id, model: m.id });
              if (cur && all.some((x) => x.provider === cur.provider && x.model === cur.model)) return cur;
              if (def && all.some((x) => x.provider === def.provider && x.model === def.model)) return def;
              return all[0] || null;
            });
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch {
          setQaModels({ state: 'fail', groups: [], def: null });
        }
      };

      /* 打开历史会话：GET /qa/sessions/:id → {ok, session:{...messages:[{role,text,ts,files?,error?}]}} */
      const openQaSession = async (s) => {
        if (!s || !s.id) return;
        if (qaSendBusy) {
          setQaMsg({ kind: 'info', text: tr('qaSessionSwitchBusy') });
          return;
        }
        /* paBg-20261005：切换会话即停掉上一回合的恢复轮询，避免旧结果覆盖当前会话 */
        stopQaRecoverPoll();
        setPublicConfirmed(false);setQaFiles([]);
        setQaActiveId(s.id);
        try {
          const resp = await fetch('/api/policy-analysis/qa/sessions/' + encodeURIComponent(s.id), { credentials: 'same-origin' });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true && data.session) {
            const list = Array.isArray(data.session.messages) ? data.session.messages : [];
            qaIdRef.current += 1;
            setQaMessages(list.map((m, i) => ({
              id: 'h' + qaIdRef.current + '_' + i,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              text: typeof m.text === 'string' ? m.text : '',
              ts: m.ts,
              files: Array.isArray(m.files) ? m.files : undefined,
              error: typeof m.error === 'string' ? m.error : undefined,
            })));
            const task=data.session.task,pending=qaPendingRef.current;const match=pending&&pending.sessionId===s.id&&list.some(m=>m.role==='assistant'&&m.turnId===pending.turnId);
            if(data.session.busy){qaPendingRef.current={sessionId:s.id,turnId:task&&task.id,aiId:'history-active',question:''};setQaBackgroundState('running');try{sessionStorage.setItem(QA_RECOVERY_KEY,JSON.stringify(qaPendingRef.current));}catch{}setQaMsg({kind:'info',text:'当前会话后台仍在运行，完成后自动显示结果（也可手动查询）'});startQaRecoverPoll();}
            else if(pending&&pending.sessionId===s.id&&!match&&(!task||task.status!=='error')){setQaBackgroundState('unknown');}
            else{qaPendingRef.current=null;setQaBackgroundState(task&&task.status==='error'?'error':'idle');try{sessionStorage.removeItem('pa-qa-recovery-v1');}catch{}}
            // v1.4.0：切回会话时同步其使用的模型（旧会话无记录 → 回系统默认）
            setSource(data.session.source || FIXED_SOURCE);setRole(data.session.role || FIXED_ROLE);setMode(data.session.mode || FIXED_MODE);
            if (data.session.provider && data.session.model) {
              setQaModel({ provider: data.session.provider, model: data.session.model });
            } else {
              setQaModel(qaModels.def || null);
            }
            qaStickRef.current = true; // 打开会话后定位到底部
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaSessionOpenFail') + (e && e.message ? e.message : String(e)) });
        }
      };

      /* 会话删除：两段式确认（点一次变「确认删除该会话？」再点执行，3 秒未点自动恢复） */
      const requestQaDelete = (s) => {
        if (!s || !s.id || qaSendBusy) return;
        if (qaDelTimerRef.current) { try { clearTimeout(qaDelTimerRef.current); } catch { /* 忽略 */ } qaDelTimerRef.current = null; }
        if (qaPendingDeleteId === s.id) {
          setQaPendingDeleteId(null);
          void deleteQaSession(s);
          return;
        }
        setQaPendingDeleteId(s.id);
        qaDelTimerRef.current = setTimeout(() => { setPendingDelSafe(s.id); }, 3000);
      };
      /* 计时器恢复回调（独立函数便于清理与阅读） */
      const setPendingDelSafe = (id) => {
        setQaPendingDeleteId((cur) => (cur === id ? null : cur));
        qaDelTimerRef.current = null;
      };
      const deleteQaSession = async (s) => {
        try {
          const resp = await fetch('/api/policy-analysis/qa/sessions/' + encodeURIComponent(s.id), {
            method: 'DELETE',
            credentials: 'same-origin',
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            setQaSessions((list) => list.filter((x) => x.id !== s.id));
            if (qaActiveId === s.id) {
              setQaActiveId(null);
              setQaMessages([]);
            }
            setQaMsg({ kind: 'ok', text: tr('qaDelOk') });
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaDelFail') + (e && e.message ? e.message : String(e)) });
        }
      };

      /* ════════ paHist-20261019：历史会话「更多操作」 ════════
       * 与知识库插件（dsh-raganything-kb）历史对话一致：置顶 / 重命名 / 归档 / 删除。
       * 服务端真源 PUT /api/policy-analysis/qa/sessions/:id；本地列表「置顶优先 + lastActiveAt 倒序」。 */
      const sortQaSessions = (list) => [...list].sort((a, b) =>
        (Number(b.pinned === true) - Number(a.pinned === true))
        || String(b.lastActiveAt || '').localeCompare(String(a.lastActiveAt || '')));

      const patchQaSession = async (id, body) => {
        const resp = await fetch('/api/policy-analysis/qa/sessions/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'same-origin',
        });
        let data = null;
        try { data = await resp.json(); } catch { data = null; }
        if (!resp.ok || !data || data.ok !== true) {
          throw new Error((data && data.message) || ('HTTP ' + resp.status));
        }
        return data.session;
      };

      const applyQaSessionPatch = (id, patch) => {
        setQaSessions((list) => sortQaSessions(list.map((x) => (x.id === id ? { ...x, ...patch } : x))));
      };

      const toggleQaPin = async (s) => {
        setQaSessionMenu(null);
        const next = !(s.pinned === true);
        try {
          await patchQaSession(s.id, { pinned: next });
          applyQaSessionPatch(s.id, { pinned: next });
          setQaMsg({ kind: 'ok', text: next ? tr('qaPinOk') : tr('qaUnpinOk') });
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaMoreFail') + (e && e.message ? e.message : String(e)) });
        }
      };

      const toggleQaArchive = async (s) => {
        setQaSessionMenu(null);
        const next = !(s.archived === true);
        try {
          await patchQaSession(s.id, { archived: next });
          applyQaSessionPatch(s.id, { archived: next });
          if (next && qaActiveId === s.id) { setQaActiveId(null); setQaMessages([]); }
          if (!next && qaShowArchived && qaSessions.filter((x) => x.archived === true && x.id !== s.id).length === 0) {
            setQaShowArchived(false);
          }
          setQaMsg({ kind: 'ok', text: next ? tr('qaArchiveOk') : tr('qaUnarchiveOk') });
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaMoreFail') + (e && e.message ? e.message : String(e)) });
        }
      };

      const commitQaRename = async (id, value) => {
        const title = String(value || '').trim().slice(0, 40);
        setQaRenaming(null);
        const cur = qaSessions.find((x) => x.id === id);
        if (!title) { setQaMsg({ kind: 'error', text: tr('qaRenameEmpty') }); return; }
        if (cur && (cur.title || '') === title) return;
        try {
          await patchQaSession(id, { title });
          applyQaSessionPatch(id, { title });
          setQaMsg({ kind: 'ok', text: tr('qaRenameOk') });
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('qaMoreFail') + (e && e.message ? e.message : String(e)) });
        }
      };

      const qaMenuStyle = (anchor) => {
        const width = 152, height = 4 * 30 + 12;
        let left = 12, top = 120;
        try {
          if (anchor && typeof anchor.getBoundingClientRect === 'function') {
            const r = anchor.getBoundingClientRect();
            const vw = window.innerWidth || 1024;
            const vh = window.innerHeight || 768;
            left = Math.max(8, Math.min(r.right - width, vw - width - 8));
            top = r.bottom + 4;
            if (top + height > vh - 8) top = Math.max(8, r.top - height - 4);
          }
        } catch { /* 退化到默认坐标 */ }
        return { position: 'fixed', left, top, width, zIndex: 70 };
      };

      /* 菜单外点击 / Esc / 滚动即关闭 */
      React.useEffect(() => {
        if (!qaSessionMenu) return undefined;
        const close = (ev) => {
          if (qaSessionMenuRef.current && ev.target && qaSessionMenuRef.current.contains(ev.target)) return;
          setQaSessionMenu(null);
        };
        const onKey = (ev) => { if (!ev || ev.key === 'Escape') setQaSessionMenu(null); };
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onKey);
        window.addEventListener('scroll', onKey, true);
        return () => {
          document.removeEventListener('mousedown', close, true);
          document.removeEventListener('keydown', onKey);
          window.removeEventListener('resize', onKey);
          window.removeEventListener('scroll', onKey, true);
        };
      }, [qaSessionMenu]);

      /* 发送提问：POST /api/policy-analysis/qa（响应即 SSE，帧型与 /ask 同形；
       * status 帧携带 sessionId/isNew —— 新会话由服务端创建并插入列表顶部选中；
       * turn_end 后刷新会话列表（首问会生成标题）；error 帧 HTTP 仍 200，气泡内标记失败） */
      const sendQa = async () => {
        if (qaSendBusy || uploadBusy || ['paused','unknown','running'].includes(qaBackgroundState)) return;
        const q = qaInput.trim();
        if (!q) return;
        if (!publicConfirmed) {
          setQaMsg({ kind: 'error', text: tr('qaGateNeed') });
          return;
        }
        qaIdRef.current += 1;
        const aiId = 'qa' + qaIdRef.current;
        const attach = qaFiles.map((f) => ({ name: f.name, path: f.path }));
        setQaMessages((list) => list.concat([
          { id: 'qu' + qaIdRef.current, role: 'user', text: q, ts: Date.now(), files: attach.length ? attach.map((f) => ({ name: f.name, path:f.path })) : undefined },
          { id: aiId, role: 'assistant', text: '', ts: Date.now(), state: 'streaming', tools: [] },
        ]));
        setQaInput('');
        setQaFiles([]); // 附件随本次提问发出（用户气泡内以 chip 回显）
        setQaThinking('');
        qaStickRef.current = true;
        setQaSendBusy(true);
        const ctrl = new AbortController();
        qaSendAbortRef.current = ctrl;
        let answer = '';
        let thinking = '';
        const tools = [];
        let turnEnded = false;let serverError=false;
        qaPendingRef.current={sessionId:qaActiveId,aiId,turnId:null,question:q,startedAt:Date.now()};setQaBackgroundState('running');
        const patchAi = (patch) => setQaMessages((list) => list.map((m) => (m.id === aiId ? Object.assign({}, m, patch) : m)));
        try{sessionStorage.setItem('pa-qa-recovery-v1',JSON.stringify(qaPendingRef.current));}catch{qaPendingRef.current=null;setQaBackgroundState('error');setQaSendBusy(false);patchAi({state:'error',error:'本地回执存储不可用，未发送问题'});return;}
        try {
          const resp = await fetch('/api/policy-analysis/qa', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            // v1.3.2 固定缺省（与 /parse 同一组 FIXED_* 常量）：附件经 policy_extract 读文件，
            // 无附件为模型知识作答，检索仅知识库（严禁联网兜底）
            // v1.4.0：显式携带所选模型路由（未选/列表不可用时省略 → 服务端用系统默认）
            body: JSON.stringify(Object.assign(
              { sessionId: qaActiveId, question: q, files: attach, source, role, mode, publicConfirmed: true },
              (qaModel && qaModel.provider && qaModel.model) ? { provider: qaModel.provider, model: qaModel.model } : {},
            )),
            signal: ctrl.signal,
          });
          if (!resp.ok || !resp.body) {
            let reason = 'HTTP ' + resp.status;
            try {
              const d = await resp.json();
              if (d && d.message) reason = d.message;
            } catch { /* 非 JSON 错误体 */ }
            throw new Error(reason);
          }
          // SSE 帧读取（与 /ask 现有方式一致：按 \n\n 切帧 + data: 解析，':' 注释/心跳跳过）
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          let closed = false;
          for (;;) {
            const r = await reader.read();
            if (r.done) break;
            buf += dec.decode(r.value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const raw = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              for (const line of raw.split('\n')) {
                if (line.charCodeAt(0) === 58 /* ':' */) continue; // SSE 注释/心跳帧
                if (!line.startsWith('data:')) continue;
                let ev = null;
                try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
                if (!ev || typeof ev !== 'object') continue;
                if (ev.type === 'status') {
                  if (ev.sessionId) {
                    const sid = ev.sessionId;
                    if (ev.isNew) {
                      // 新会话：插入列表顶部并选中（标题由服务端首问 turn_end 后生成，先占位）
                      const item = { id: sid, title: tr('qaNewSession'), messageCount: 0, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() };
                      if (typeof ev.title === 'string' && ev.title) item.title = ev.title;
                      setQaSessions((list) => [item].concat(list));
                    }
                    setQaActiveId(sid);qaPendingRef.current.sessionId=sid;
                  }
                  if(ev.turnId&&qaPendingRef.current){qaPendingRef.current.turnId=ev.turnId;try{sessionStorage.setItem('pa-qa-recovery-v1',JSON.stringify(qaPendingRef.current));}catch{}}
                  // v1.4.0：以服务端实际生效的模型路由为准（热切换后回填选择器）
                  if (ev.provider && ev.model) {
                    setQaModel({ provider: String(ev.provider), model: String(ev.model) });
                  }
                  if (typeof ev.text === 'string' && ev.text) {
                    thinking = ev.progressOnly ? ev.text : thinking + (thinking ? '\n' : '') + ev.text;
                    setQaThinking(thinking);
                  }
                } else if (ev.type === 'thinking' && typeof ev.text === 'string') {
                  thinking += ev.text;
                  setQaThinking(thinking);
                } else if (ev.type === 'delta' && typeof ev.text === 'string') {
                  answer += ev.text;
                  setQaThinking('');
                  patchAi({ text: answer });
                } else if (ev.type === 'tool' && ev.name) {
                  const label = ev.name + (typeof ev.summary === 'string' && ev.summary ? ' · ' + ev.summary : '');
                  if (tools[tools.length - 1] !== label) {
                    tools.push(label);
                    patchAi({ tools: tools.slice() });
                  }
                } else if (ev.type === 'turn_end') {
                  if (ev.sessionId) setQaActiveId(ev.sessionId);
                  turnEnded = true;setQaBackgroundState('done');if(typeof ev.text==='string'){answer=ev.text;patchAi({text:answer});}qaPendingRef.current=null;try{sessionStorage.removeItem('pa-qa-recovery-v1');}catch{}
                  closed = true;
                  break;
                } else if (ev.type === 'error') {
                  serverError=true;setQaBackgroundState(ev.code==='RECEIVE_TIMEOUT'?'unknown':'error');
                  patchAi({ state: ev.code==='RECEIVE_TIMEOUT'?'unknown':'error', error: ev.message || 'unknown' });
                  closed = true;
                  break;
                }
              }
              if (closed) break;
            }
            if (closed) break;
          }
          try { reader.cancel(); } catch { /* 流已结束 */ }
          setQaMessages(list=>list.map(m=>m.id===aiId&&m.state==='streaming'?{...m,state:turnEnded?'done':'paused',ts:turnEnded?Date.now():m.ts}:m)); /* paQaTs-20261005：完成时刻 */
          if(!turnEnded&&!serverError){setQaBackgroundState('paused');setQaMsg({kind:'info',text:'接收已暂停，后台状态未确认；查询真实结果，不会重发问题'});}
          if (turnEnded) void loadQaSessions(); // turn_end 后刷新会话列表（首问生成标题）
        } catch (e) {
          if (e && e.name === 'AbortError') {
            patchAi({state:'paused'});setQaBackgroundState('paused');setQaMsg({kind:'info',text:'已停止接收，不代表后台完成或取消；请查询真实结果'});
          } else {
            const msgText = String((e && e.message) || e);
            patchAi({state:'unknown',error:msgText});setQaBackgroundState('unknown');
            setQaMsg({ kind: 'error', text: tr('qaSendFail') + msgText });
          }
        } finally {
          setQaSendBusy(false);
          qaSendAbortRef.current = null;
          setQaThinking('');
        }
      };

      /* 一键归档当前会话（不弹窗）：POST /qa/archive {sessionId} → {ok, record:{seq,...}} → toast */
      const archiveQaSession = async () => {
        if (qaArchiving || qaSendBusy || ['running','paused','unknown'].includes(qaBackgroundState) || !qaActiveId || !qaMessages.length) return;
        setQaArchiving(true);
        try {
          const resp = await fetch('/api/policy-analysis/qa/archive', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sessionId: qaActiveId }),
          });
          let data = null;
          try { data = await resp.json(); } catch { data = null; }
          if (resp.ok && data && data.ok === true) {
            const seq = data.record && data.record.seq !== undefined ? data.record.seq : '?';
            setQaMsg({ kind: 'ok', text: tr('qaArchiveOk', { seq }) });
            recordsStaleRef.current = true; // 归档成功 → 「解析归档」视图下次进入自动刷新
          } else {
            throw new Error((data && data.message) || 'HTTP ' + resp.status);
          }
        } catch (e) {
          setQaMsg({ kind: 'error', text: tr('archFail') + (e && e.message ? e.message : String(e)) });
        } finally {
          setQaArchiving(false);
        }
      };

      /* 复制回答 / 清空输入与附件 / 移除待附文件 */
      /* paBg-20261005：恢复轮询控制器（函数声明，hoisted；面板卸载即停，回执保留待切回续跑） */
      function stopQaRecoverPoll() {
        if (qaRecoverTimerRef.current) {
          try { clearInterval(qaRecoverTimerRef.current); } catch { /* 忽略 */ }
          qaRecoverTimerRef.current = null;
        }
      }
      /* paBg-20261005：回合仍在跑时自动轮询会话，完成即自动出现回答（无需手动刷新） */
      function startQaRecoverPoll() {
        stopQaRecoverPoll();
        qaRecoverTicksRef.current = 0;
        qaRecoverTimerRef.current = setInterval(() => {
          qaRecoverTicksRef.current += 1;
          if (qaRecoverTicksRef.current > QA_RECOVER_POLL_MAX) {
            stopQaRecoverPoll();
            setQaBackgroundState('unknown');
            setQaMsg({ kind: 'info', text: '后台终态长时间未确认；请检查历史或刷新页面，不会自动重发问题' });
            return;
          }
          void recoverQa({ silent: true }).then((st) => {
            if (st === 'done' || st === 'error') {
              stopQaRecoverPoll();
              setQaMsg({ kind: st === 'done' ? 'ok' : 'error', text: st === 'done' ? '后台已完成，结果已自动显示' : '后台回合失败，请查看会话历史' });
            }
          });
        }, QA_RECOVER_POLL_MS);
      }
      /* paBg-20261005：查询后台真实终态（跨页/刷新恢复与自动轮询共用）。
       * 宿主在客户端断开后仍自主跑完并落库，故此处只需按会话 id 拉取：
       *   已落库 assistant 消息存在且回合已终结 → 直接渲染完整回答（含引用/来源等既有字段）；
       *   回合仍在跑 → 返回 'running'，由 startQaRecoverPoll 自动轮询至完成后显示。
       * 返回 'done' | 'error' | 'running' | 'unknown'。 */
      const recoverQa = async (opts) => {
        const silent = !!(opts && opts.silent);
        const pending=qaPendingRef.current;
        if(!pending||!pending.sessionId){if(!silent)setQaMsg({kind:'error',text:'未获得会话回执，无法确认后台；请检查历史，不自动重发'});return 'unknown';}
        try{const response=await fetch('/api/policy-analysis/qa/sessions/'+encodeURIComponent(pending.sessionId),{credentials:'same-origin'});const data=await response.json();if(!response.ok||!data.ok)throw Error(data.message||'状态查询失败');
          const sess=data.session,task=sess.task,list=Array.isArray(sess.messages)?sess.messages:[];
          /* 终态判定：turnId 精确匹配优先；旧回执缺 turnId 时按「问题原文 → 其后首条 assistant」兜底 */
          let answer=list.find(m=>m.role==='assistant'&&pending.turnId&&m.turnId===pending.turnId)||null;
          if(!answer&&!pending.turnId&&pending.question){let ui=-1;for(let i=0;i<list.length;i++){if(list[i].role==='user'&&list[i].text===pending.question)ui=i;}if(ui>=0){for(let i=ui+1;i<list.length;i++){if(list[i].role==='assistant'){answer=list[i];break;}}}}
          if(answer&&(!task||task.id!==pending.turnId||task.status==='done')){setQaMessages(list.map((m,i)=>({...m,id:'restored-'+i,state:m.role==='assistant'?'done':undefined})));setQaBackgroundState('done');qaPendingRef.current=null;try{sessionStorage.removeItem(QA_RECOVERY_KEY);}catch{ /* 忽略 */ }stopQaRecoverPoll();if(!silent)setQaMsg({kind:'ok',text:'已恢复真实完成结果，未重发问题'});return 'done';}
          if(task&&task.id===pending.turnId&&task.status==='error'){setQaBackgroundState('error');stopQaRecoverPoll();if(!silent)setQaMsg({kind:'error',text:task.error||'后台失败'});return 'error';}
          setQaBackgroundState(sess.busy?'running':'unknown');if(!silent)setQaMsg({kind:'info',text:sess.busy?'后台仍运行，结果完成后自动显示':'未发现本任务真实终态，请检查历史或新建会话'});return sess.busy?'running':'unknown';
        }catch(error){setQaBackgroundState('unknown');if(!silent)setQaMsg({kind:'error',text:error.message});return 'unknown';}
      };
      /* paBg-20261005：面板（重新）挂载时恢复进行中的问答回合 —— 宿主在本面板断开后仍自主
       * 跑完并落库，故切回政策解读页面时：已完成 → 直接看到完整回答；仍在生成 → 先本地回显
       * 「问题 + 生成中」，再自动轮询到完成后出现结果（不必手动刷新）。无回执时按既有口径
       * 提示「后台状态未知」，绝不自动重发问题。 */
      React.useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem(QA_RECOVERY_KEY)||'null');if(!saved||!saved.aiId)return;qaPendingRef.current=saved;if(!saved.sessionId){setQaBackgroundState('unknown');setQaMsg({kind:'info',text:'刷新前未获得问答回执，后台状态未知；请检查历史，禁止自动重发'});return;}setQaActiveId(saved.sessionId);setTab('qa');/* 切回面板定位到智能问答视图，否则恢复出来的回答不可见 */setQaBackgroundState('running');qaIdRef.current+=1;const ph=[];if(saved.question)ph.push({id:'rq'+qaIdRef.current,role:'user',text:saved.question,ts:saved.startedAt||Date.now()});ph.push({id:'ra'+qaIdRef.current,role:'assistant',text:'',ts:Date.now(),state:'streaming',tools:[]});setQaMessages(ph);startQaRecoverPoll();void recoverQa({silent:false}).then((st)=>{if(st!=='done'&&st!=='running')setQaMessages((list)=>list.map((m)=>(m.state==='streaming'?{...m,state:'unknown'}:m)));});}catch{ /* 忽略：恢复失败不影响新会话 */ }},[]);
      const copyQaAnswer = (m) => {
        if (!m || !m.text) return;
        copyTextTo(m.text, (ok) => setQaMsg({ kind: ok ? 'ok' : 'error', text: tr(ok ? 'copyOk' : 'copyFail') }));
      };
      const clearQaInput = () => {
        if(qaSendBusy)return;
        newQaSession();setQaMsg({kind:'info',text:'已开始新会话，原记录保留'});
      };
      const removeQaFile = (key) => {
        if(qaSendBusy)return;
        setQaFiles((list) => list.filter((f) => f.key !== key));
      };
      /* 消息列表滚动：记录用户是否上滚（未上滚才自动滚底） */
      const onQaFlowScroll = () => {
        const el = qaFlowRef.current;
        if (!el) return;
        qaStickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
      };

      /* ── 三视图副作用（hooks 顺序稳定，全部无条件注册） ── */
      // 进入「解析归档」视图时按需拉取（列表为空或标记为过期时拉一次）
      React.useEffect(() => {
        if (tab !== 'records') return;
        if (!recordsStaleRef.current && records.length) return;
        recordsStaleRef.current = false;
        void loadRecords();
      }, [tab]);
      // 进入「智能问答」视图时按需拉取会话列表
      React.useEffect(() => {
        if (tab !== 'qa') return;
        if (!qaSessionsStaleRef.current) return;
        qaSessionsStaleRef.current = false;
        void loadQaSessions();
      }, [tab]);
      // v1.4.0 可选模型目录：面板挂载即拉取一次（GET /models；失败可在选择器中重试）
      React.useEffect(() => {
        void loadQaModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // v1.3.2 跨页恢复：面板重新挂载（含从其它 DSH 面板切回、页内刷新）时读取进行中解析标记
      // → GET /records/:id 同步状态：parsing → 切到文件解析并重连 /parse/events SSE（服务端重放
      //   ≤5000 帧 + 15s 心跳，补齐日志后继续实时流式）；done/failed → 过程窗口提示已完成，
      //   结果面板载入 record.result 与状态徽标；404/异常 → 「解析中断」并清除标记。
      // 清除时机：新开解析（覆盖写入）/ 记录被删除 / 恢复失败。智能问答本轮不做跨页恢复。
      React.useEffect(() => {
        let raw = null;
        try { raw = window.sessionStorage.getItem(ACTIVE_PARSE_KEY); } catch { raw = null; }
        if (!raw) return;
        let saved = null;
        try { saved = JSON.parse(raw); } catch { saved = null; }
        if (!saved || !saved.jobId) return;
        setTab('parse');
        currentQueueFileRef.current=saved.fileKey || null;
        if(saved.fileKey)setActiveFileKey(saved.fileKey);
        setParseJobId(saved.jobId);
        if (saved.fileName) pushParseLog(tr('parseResumeFile') + saved.fileName);
        const resumeId = saved.recordId || null;
        if (!resumeId) {
          // 无 recordId（异常旧标记）：直接按 jobId 重连 SSE
          setParseResultState('streaming');
          setParseBusy(true);
          const ctrl = new AbortController();
          parseAbortRef.current = ctrl;
          void runParseStream(saved.jobId, ctrl, true);
          return;
        }
        void (async () => {
          try {
            const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(resumeId), {
              credentials: 'same-origin',
            });
            let data = null;
            try { data = await resp.json(); } catch { data = null; }
            // 兼容 {ok, record:{...}} 与 {ok, status, result, ...} 两种返回形态
            const rec = data && typeof data === 'object'
              ? (data.record || (data.ok === true && data.status ? data : null))
              : null;
            if (!resp.ok || !rec) {
              // 404/异常 → 解析中断并清除标记
              setParseMsg({ kind: 'error', text: tr('parseInterrupted') });
              clearActiveParseKey();
              return;
            }
            if (rec.status === 'parsing') {
              setParseResultState('streaming');
              setParseBusy(true);
              pushParseLog(tr('parseResumeParsing'));
              const ctrl = new AbortController();
              parseAbortRef.current = ctrl;
              void runParseStream(saved.jobId, ctrl, true);
            } else {
              // done/failed：后台已结束，无需重连——载入结果与状态徽标
              setParseRecord(rec);
              setParseResult(typeof rec.result === 'string' && rec.result
                ? rec.result
                : (typeof rec.error === 'string' && rec.error ? rec.error : ''));
              setParseResultState(rec.status === 'failed' ? 'error' : 'done');
              pushParseLog(tr('parseResumeDone'));
              setParseMsg({ kind: 'info', text: tr('parseResumeDone') });
            }
          } catch (e) {
            setParseMsg({ kind: 'error', text: tr('parseInterrupted') + (e && e.message ? '：' + e.message : '') });
            clearActiveParseKey();
          }
        })();
      }, []);
      // 解析过程终端自动滚底
      React.useEffect(() => {
        const el = termRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [parseLog.length, parseThinking]);
      // 解析结果自动滚底
      React.useEffect(() => {
        const el = parseResultRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [parseResult]);
      // 智能问答消息列表自动滚底（用户未上滚时才跟随）
      React.useEffect(() => {
        const el = qaFlowRef.current;
        if (el && qaStickRef.current) el.scrollTop = el.scrollHeight;
      }, [qaMessages, qaThinking]);
      // 归档对话框：Esc 关闭
      React.useEffect(() => {
        if (!archiveOpen || typeof window === 'undefined') return;
        const onKey = (e) => { if (e && e.key === 'Escape') setArchiveOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [archiveOpen]);
      // v1.4.0 源文件在线预览模态：Esc 关闭
      React.useEffect(() => {
        if (!previewFile || typeof window === 'undefined') return;
        const onKey = (e) => { if (e && e.key === 'Escape') setPreviewFile(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [previewFile]);
      // 组件卸载统一清理：中止进行中的 SSE / 定位轮询 / 删除恢复计时器（无 setInterval 泄漏）
      React.useEffect(() => () => {
        try { if (parseAbortRef.current) parseAbortRef.current.abort(); } catch { /* 忽略 */ }
        try { if (qaAbortRef.current) qaAbortRef.current.abort(); } catch { /* 忽略 */ }
        try { if (qaSendAbortRef.current) qaSendAbortRef.current.abort(); } catch { /* 忽略 */ }
        /* paBg-20261005：卸载/切页停掉恢复轮询（回执保留在 sessionStorage，切回自动续跑；宿主不受影响） */
        try { stopQaRecoverPoll(); } catch { /* 忽略 */ }
        try { if (sendPollRef.current) clearInterval(sendPollRef.current); } catch { /* 忽略 */ }
        try { if (delTimerRef.current) clearTimeout(delTimerRef.current); } catch { /* 忽略 */ }
        try { if (qaDelTimerRef.current) clearTimeout(qaDelTimerRef.current); } catch { /* 忽略 */ }
      }, []);

      /* ════════ 顶栏（56px，DSH 中性表面 + 蓝色徽标） ════════ */
      /* 顶部细条（v1.3.1 去重：品牌方标与「政策解读 政务辅助 · Agent v1.0」标题已并入左侧导航
       * 品牌块，此处不再重复；仅保留右侧 运行环境 / 门禁原则 两枚胶囊，三视图共用） */
      const renderTopBar = () => h('header', {
        style: {
          height: 40, flexShrink: 0, background: T.surface, color: T.text1,
          borderBottom: '1px solid ' + T.border,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 16px', zIndex: 2, gap: 12,
        },
      },
        // 绿点胶囊：运行环境
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 6, background: T.surface2,
            border: '1px solid ' + T.borderSub, color: T.text2,
            padding: '4px 12px', borderRadius: 999, whiteSpace: 'nowrap',
          },
        },
          h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0 } }),
          h('span', null, tr('envPill')),
        ),
        // 琥珀胶囊：门禁原则
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 6, background: T.warnBg,
            border: '1px solid ' + T.warnBorder, color: T.warnText,
            padding: '4px 12px', borderRadius: 999, whiteSpace: 'nowrap',
          },
        },
          Icon({ d: ICONS.warning, size: 14 }),
          h('span', null, tr('gatePill')),
        ),
      );

      /* ── RESERVED（v1.3.0）：原「任务简报」三栏控制台渲染区 ──
       * v1.3.0 左侧导航仅保留 文件解析/解析归档/智能问答 三项，本三栏控制台已从渲染树移除
       * （根布局不再调用 renderLeftPanel/renderMiddlePanel/renderRightPanel）。以下渲染函数与
       * 相关 state/handler（messages/sendAsk/演示场景/sendToSession 等）保留为未使用代码以维持
       * 稳定性：未被引用不会执行；如需恢复「任务简报」入口，可整体挂回根布局的视图容器。 */
      /* ════════ 左栏（260px 控制栏） ════════ */
      const renderRoleButtons = () => ROLES.map((r) => {
        const active = role === r.key;
        return h('button', {
          key: r.key, type: 'button',
          className: 'pa-rolebtn ' + (active ? 'pa-role-on' : 'pa-role-off'),
          onClick: () => switchRole(r.key),
        },
          h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, tr(r.labelKey)),
          active ? h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0, marginLeft: 8 } }) : null,
        );
      });

      const renderSourceCard = (val, titleKey, descKey) => {
        const active = source === val;
        return h('label', {
          key: val,
          style: {
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8,
            cursor: 'pointer', fontSize: 12,
            border: '1px solid ' + (active ? T.accent : T.border),
            background: active ? T.accentSoft : T.surface,
            transition: 'border-color .15s, background-color .15s',
          },
        },
          h('input', {
            type: 'radio', name: 'pa-source', value: val, checked: active,
            onChange: () => setSource(val),
            style: { marginTop: 2, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 },
          }),
          h('span', { style: { minWidth: 0 } },
            h('span', { style: { display: 'block', fontWeight: 500, color: T.text1 } }, tr(titleKey) + ' (' + val + ')'),
            h('span', { style: { display: 'block', fontSize: 11, color: T.text3, marginTop: 2, lineHeight: 1.4 } }, tr(descKey)),
          ),
        );
      };

      const renderLeftPanel = () => h('aside', {
        className: 'pa-scroll',
        style: {
          width: 260, flexShrink: 0, background: T.surface, borderRight: '1px solid ' + T.border,
          display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden', userSelect: 'none',
        },
      },
        /* 可滚动内容区：超高时仅内容滚动，「返回主页」固定底部 */
        h('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 } },
          // 1. 执行角色预设
          h('div', null,
            h(SectionLabel, { text: tr('roleLabel') }),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, renderRoleButtons()),
          ),
          // 2. 分析模式（切换角色自动映射默认模式，可手改）
          h('div', null,
            h(SectionLabel, { text: tr('modeLabel') }),
            h('select', {
              value: mode, onChange: (e) => setMode(e.target.value), className: 'pa-mode',
              style: { width: '100%', color: T.text2, fontSize: 12, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' },
            }, MODES.map((m) => h('option', { key: m.key, value: m.key }, tr(m.labelKey) + ' (' + m.key + ')'))),
          ),
          // 3. 数据来源（二选一 · 禁混用）
          h('div', null,
            h(SectionLabel, { text: tr('sourceLabel') }),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              renderSourceCard('web_only', 'sourceWebTitle', 'sourceWebDesc'),
              renderSourceCard('knowledge_only', 'sourceRagTitle', 'sourceRagDesc'),
            ),
            source === 'knowledge_only'
              ? h('p', {
                  style: {
                    margin: '6px 0 0', fontSize: 11, color: T.warnText, background: T.warnBg,
                    padding: 8, borderRadius: 6, border: '1px solid ' + T.warnBorder, lineHeight: 1.5,
                  },
                }, tr('ragWarning'))
              : null,
          ),
          // 4. 合规检查命令（实时联动 source/role）
          h('div', { style: { paddingTop: 8, borderTop: '1px solid ' + T.borderSub } },
            h(SectionLabel, { text: tr('cliLabel') }),
            h('div', {
              style: {
                background: T.codeBg, color: T.codeText, padding: 8, borderRadius: 6,
                fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                lineHeight: 1.6, wordBreak: 'break-all',
              },
            },
              tr('cliCmd') + ' ',
              h('span', { style: { color: '#34d399' } }, source),
              ' --role ',
              h('span', { style: { color: '#fbbf24' } }, role),
            ),
          ),
        // 底部安全提示卡（随内容滚动）
        h('div', {
          style: {
            textAlign: 'center', padding: 10, background: T.surface2, borderRadius: 8,
            border: '1px solid ' + T.border, fontSize: 11, color: T.text3, flexShrink: 0,
          },
        },
          h('div', null, tr('safetyLine1')),
          h('div', { style: { color: T.accent, fontWeight: 600, marginTop: 2 } }, tr('safetyLine2')),
        ),
      ),
        // 底部固定「‹ 返回主页」（与会议助手 mt-railback 同款样式/行为：selectPanel(null) + 展开侧栏；
        // 位于滚动内容区之外，始终贴底可见）
        h('button', {
          type: 'button', className: 'pa-railback', title: tr('backHome'),
          onClick: () => {
            if (typeof window === 'undefined') return;
            try {
              window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: { expand: true, home: true } }));
            } catch { /* 派发失败不阻塞按钮 */ }
          },
        }, '‹ ', h('span', { className: 'txt' }, tr('backHome'))),
      );

      /* ════════ 中栏：欢迎气泡 + 动态消息 + 报告 ════════ */
      const renderWelcome = () => h('div', { style: { display: 'flex', gap: 12, maxWidth: 768 } },
        h(Avatar, { bg: T.accentStrong, color: T.accentInk, text: tr('avatarAgent') }),
        h('div', {
          style: {
            background: T.surface, border: '1px solid ' + T.border, borderRadius: 16,
            borderTopLeftRadius: 4, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,.06)',
            fontSize: T.contentFont, color: T.text2, display: 'flex', flexDirection: 'column', gap: 8,
            lineHeight: 1.7, flex: 1, minWidth: 0,
          },
        },
          h('p', { style: { margin: 0, fontWeight: 600, color: T.text1 } }, tr('welcomeTitle')),
          h('p', { style: { margin: 0 } }, tr('welcomeLead')),
          h('ol', { style: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, color: T.text2 } },
            h('li', null, tr('welcomeItem1Pre'),
              h('strong', { style: { color: T.text1 } }, tr('welcomeItem1Strong')),
              tr('welcomeItem1Post')),
            h('li', null, tr('welcomeItem2Pre'),
              h('strong', { style: { color: T.text1 } }, tr('welcomeItem2Strong')),
              tr('welcomeItem2Post')),
          ),
          h('div', { style: { paddingTop: 6 } },
            h('span', {
              style: {
                display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4,
                background: T.infoBg, color: T.infoInk, fontSize: 11, fontWeight: 500,
                border: '1px solid ' + T.infoBorder,
              },
            }, publicConfirmed ? tr('gateChipReady') : tr('gateChipPending')),
          ),
        ),
      );

      const renderUserMsg = (msg) => h('div', { key: msg.id, style: { display: 'flex', gap: 12, justifyContent: 'flex-end', maxWidth: 768, marginLeft: 'auto', width: '100%' } },
        h('div', {
          style: {
            background: T.userBubble, color: '#ffffff', borderRadius: 16, borderTopRightRadius: 4,
            padding: '12px 14px', fontSize: T.contentFont, lineHeight: 1.7,
            boxShadow: '0 1px 3px rgba(15,23,42,.08)', wordBreak: 'break-word', maxWidth: '100%',
          },
        }, msg.text),
        h(Avatar, { bg: T.avatarMe, color: T.avatarMeText, text: tr('avatarMe') }),
      );

      const renderGateMsg = (msg) => h('div', { key: msg.id, style: { display: 'flex', gap: 12, maxWidth: 768 } },
        h(Avatar, { bg: T.warnAvatar, text: tr('avatarGate') }),
        h('div', {
          style: {
            background: T.warnBg, border: '1px solid ' + T.warnBorder, borderRadius: 16,
            borderTopLeftRadius: 4, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,.06)',
            fontSize: T.contentFont, color: T.warnText, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 } },
            Icon({ d: ICONS.warning, size: 16, color: T.warnIcon }),
            h('span', null, tr('gateTitle')),
          ),
          h('p', { style: { margin: 0, lineHeight: 1.7 } }, tr('gateQuestion')),
        ),
      );

      const renderPreflightMsg = (msg) => h('div', { key: msg.id, style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.successText, background: T.successSoft, border: '1px solid ' + T.successBorder, padding: '6px 12px', borderRadius: 8, width: 'fit-content', maxWidth: '100%' } },
        Icon({ d: ICONS.check, size: 14, color: T.success }),
        h('span', { style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', wordBreak: 'break-all' } }, msg.text),
      );

      /* 结论卡（点击联动右栏证据抽屉） */
      const renderConclusionCard = (cfg) => {
        const tint = TINTS[cfg.tint];
        const active = activeEvidence === cfg.eid;
        return h('div', {
          key: cfg.eid, role: 'button', tabIndex: 0, className: 'pa-conclusion',
          onClick: () => selectEvidence(cfg.eid),
          onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') selectEvidence(cfg.eid); },
          style: {
            padding: 12, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            border: '1px solid ' + (active ? T.accent : tint.border),
            background: active ? T.accentActive : tint.bg,
          },
        },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { background: tint.chip, color: '#ffffff', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 4, flexShrink: 0 } }, cfg.tag),
              h('span', { style: { fontWeight: 600, color: tint.title } }, tr(cfg.titleKey)),
            ),
            h('p', { style: { margin: 0, fontSize: 11, color: T.text2, lineHeight: 1.6 } }, tr(cfg.descKey)),
          ),
          h('span', { style: { color: T.accent, fontWeight: 500, fontSize: 11, textDecoration: 'underline', marginLeft: 12, flexShrink: 0, whiteSpace: 'nowrap' } },
            tr('viewEvidence', { eid: cfg.eid })),
        );
      };

      /* 场景 A/B 结构化报告（原型同款：报告头 → 直接答复 → 结论卡 → 待人工核实） */
      const renderReport = (msg) => {
        const s = msg.scenario;
        if (s === 'C') return renderReportC(msg);
        const head = REPORT_HEADS[s];
        const cards = REPORT_CARDS[s];
        return h('div', { key: msg.id, style: { display: 'flex', gap: 12, maxWidth: 896, width: '100%' } },
          h(Avatar, { bg: T.accentStrong, color: T.accentInk, text: tr('avatarAgent') }),
          h('div', {
            style: {
              flex: 1, minWidth: 0, background: T.surface, border: '1px solid ' + T.border,
              borderRadius: 16, borderTopLeftRadius: 4, padding: 20,
              boxShadow: '0 1px 3px rgba(15,23,42,.06)', fontSize: T.contentFont, color: T.text1,
              display: 'flex', flexDirection: 'column', gap: 16, lineHeight: 1.7,
            },
          },
            // 报告头 + 演示样例徽标 + 视图标签
            h('div', { style: { borderBottom: '1px solid ' + T.borderSub, paddingBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
              h('div', { style: { minWidth: 0 } },
                h('span', { style: { color: T.accentStrong, fontWeight: 700, fontSize: 14, display: 'block' } }, tr(head.titleKey)),
                h('span', { style: { color: T.text3, fontSize: 11, display: 'block', marginTop: 2 } }, tr(head.subKey)),
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 } },
                h('span', {
                  style: {
                    border: '1px dashed ' + T.warnIcon, color: T.warnText, background: T.warnBg,
                    fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                  },
                }, tr('demoBadge')),
                h('span', {
                  style: {
                    padding: '4px 10px', background: head.tagBg, color: head.tagColor,
                    border: '1px solid ' + head.tagBorder, borderRadius: 4, fontSize: 11, fontWeight: 600,
                  },
                }, tr(head.tagKey)),
              ),
            ),
            // 直接答复块（仅场景 A）
            s === 'A'
              ? h('div', { style: { background: T.surface2, padding: 12, borderRadius: 12, border: '1px solid ' + T.border, display: 'flex', flexDirection: 'column', gap: 4 } },
                  h('strong', { style: { color: T.text1, display: 'block', fontWeight: 600 } }, tr('repDirectLabel')),
                  h('p', { style: { margin: 0, color: T.text2, lineHeight: 1.7 } }, tr('repADirect')),
                )
              : null,
            // 逐条结论与证据绑定
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('span', { style: { fontWeight: 600, color: T.text1, display: 'block' } }, tr('repBindLabel')),
              cards.map(renderConclusionCard),
            ),
            // 待人工核实清单（仅场景 A）
            s === 'A'
              ? h('div', { style: { background: T.warnBg, border: '1px solid ' + T.warnBorder, borderRadius: 12, padding: 12, color: T.warnText, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 } },
                  h('span', { style: { fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 } },
                    Icon({ d: ICONS.info, size: 14, color: T.warnIcon }),
                    tr('nextActionLabel'),
                  ),
                  h('p', { style: { margin: 0, lineHeight: 1.6 } }, tr('repANext')),
                )
              : null,
          ),
        );
      };

      /* 场景 C：知识库空库阻断报告（强调未越权、未联网） */
      const renderReportC = (msg) => h('div', { key: msg.id, style: { display: 'flex', gap: 12, maxWidth: 896, width: '100%' } },
        h(Avatar, { bg: T.accentStrong, color: T.accentInk, text: tr('avatarAgent') }),
        h('div', {
          style: {
            flex: 1, minWidth: 0, background: T.surface, border: '1px solid ' + T.border,
            borderRadius: 16, borderTopLeftRadius: 4, padding: 20,
            boxShadow: '0 1px 3px rgba(15,23,42,.06)', fontSize: T.contentFont, color: T.text1,
            display: 'flex', flexDirection: 'column', gap: 12, lineHeight: 1.7,
          },
        },
          h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
            h('span', {
              style: {
                border: '1px dashed ' + T.warnIcon, color: T.warnText, background: T.warnBg,
                fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
              },
            }, tr('demoBadge')),
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: T.text2 } },
            Icon({ d: ICONS.warning, size: 16, color: T.warnIcon }),
            h('span', { style: { fontWeight: 700, color: T.text1, fontSize: 13 } }, tr('repCTitle')),
          ),
          h('p', { style: { margin: 0, color: T.text2 } }, tr('repCBody')),
          h('div', { style: { padding: 12, background: T.infoBg, border: '1px solid ' + T.infoBorder, borderRadius: 12, color: T.infoInk, fontSize: 11 } },
            h('strong', null, tr('repCMechLabel')),
            tr('repCMech'),
          ),
        ),
      );

      /* 任务简报块（真实功能：复制 + 粘贴指引） */
      const renderBriefingMsg = (msg) => h('div', { key: msg.id, style: { display: 'flex', gap: 12, maxWidth: 896, width: '100%' } },
        h(Avatar, { bg: T.userBubble, text: tr('avatarAgent') }),
        h('div', {
          style: {
            flex: 1, minWidth: 0, background: T.surface, border: '1px solid ' + T.accentSoftBorder,
            borderLeft: '3px solid ' + T.accent, borderRadius: 16, borderTopLeftRadius: 4,
            padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,.06)',
            display: 'flex', flexDirection: 'column', gap: 10,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
            h('span', { style: { fontWeight: 700, fontSize: 13, color: T.accent } }, tr('briefingTitle')),
            h('span', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              copyState
                ? h('span', { style: { fontSize: 11, fontWeight: 600, color: copyState === 'ok' ? T.success : T.warnText } },
                    tr(copyState === 'ok' ? 'copyOk' : 'copyFail'))
                : null,
              sendState
                ? h('span', { style: { fontSize: 11, fontWeight: 600, color: sendState === 'ok' ? T.success : sendState === 'fail' ? T.warnText : T.text3 } },
                    tr(sendState === 'ok' ? 'sendStateOk' : sendState === 'fail' ? 'sendStateFail' : 'sendStateBusy'))
                : null,
              h('button', {
                type: 'button', className: 'pa-btn', onClick: copyBriefing,
                style: { borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
              }, tr('copyBriefing')),
              h('button', {
                type: 'button', className: 'pa-btn', onClick: sendToSession,
                title: tr('sendToSession'),
                style: {
                  borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: T.accent, color: '#ffffff', border: '1px solid ' + T.accent,
                },
              }, tr('sendToSession')),
            ),
          ),
          h('pre', {
            style: {
              margin: 0, background: T.surface2, border: '1px solid ' + T.border, borderRadius: 8,
              padding: 12, fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: T.text2, fontFamily: 'inherit', userSelect: 'text',
              maxHeight: 280, overflowY: 'auto',
            },
            className: 'pa-scroll',
          }, msg.text),
          h('p', { style: { margin: 0, fontSize: 11, color: T.text3, lineHeight: 1.6 } }, tr('pasteHint')),
        ),
      );

      /* 问答卡：右侧用户问题气泡 + 左侧流式回答卡（工具状态/思考折叠/回答/复核脚注） */
      const renderQaMsg = (msg) => h('div', {
        key: msg.id,
        style: { display: 'flex', gap: 12, maxWidth: 896, width: '100%', flexDirection: 'column' },
      },
        h('div', {
          style: {
            alignSelf: 'flex-end', maxWidth: '80%', background: T.accent, color: '#ffffff',
            borderRadius: '14px 14px 4px 14px', padding: '10px 16px', fontSize: 12,
            lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          },
        }, msg.question),
        h('div', {
          style: {
            alignSelf: 'flex-start', width: '100%', maxWidth: '92%', background: T.surface,
            border: '1px solid ' + T.border, borderRadius: '4px 14px 14px 14px',
            padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8,
          },
        },
          msg.tools.length > 0
            ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                msg.tools.map((t, i) => h('span', {
                  key: i,
                  style: {
                    fontSize: 10, padding: '2px 8px', borderRadius: 999,
                    border: '1px solid ' + T.border, color: T.text3, background: T.surface2,
                  },
                }, '🔧 ' + tr('askToolCalling') + ' ' + t)),
              )
            : null,
          msg.thinking
            ? h('details', { style: { fontSize: 11, color: T.text3 } },
                h('summary', { style: { cursor: 'pointer', fontSize: 11, color: T.text3 } }, tr('askThinkingLabel')),
                h('pre', {
                  style: {
                    margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: 11, lineHeight: 1.7, color: T.text3, fontFamily: 'inherit', userSelect: 'text',
                  },
                }, msg.thinking),
              )
            : null,
          h('pre', {
            style: {
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 12, lineHeight: 1.8, color: T.text1, fontFamily: 'inherit', userSelect: 'text',
            },
          }, (msg.answer || '') + (msg.state === 'streaming' ? ' ▍' : '')),
          msg.state === 'error'
            ? h('div', { style: { fontSize: 11, color: T.warnText } }, tr('askErrorPrefix') + msg.error)
            : null,
          msg.state === 'streaming'
            ? h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                h('button', {
                  type: 'button', className: 'pa-ghostbtn', onClick: stopAsk,
                  style: { fontSize: 11, padding: '4px 10px' },
                }, tr('askStop')),
              )
            : null,
          msg.state === 'done'
            ? h('div', {
                style: { fontSize: 10, color: T.text3, borderTop: '1px dashed ' + T.border, paddingTop: 6 },
              }, tr('askPendingReview'))
            : null,
        ),
      );

      const renderMessage = (msg) => {
        if (msg.kind === 'user') return renderUserMsg(msg);
        if (msg.kind === 'qa') return renderQaMsg(msg);
        if (msg.kind === 'gate') return renderGateMsg(msg);
        if (msg.kind === 'preflight') return renderPreflightMsg(msg);
        if (msg.kind === 'report') return renderReport(msg);
        if (msg.kind === 'briefing') return renderBriefingMsg(msg);
        return null;
      };

      /* 中栏顶部操作条 */
      const scenarioBtn = (s) => h('button', {
        key: s, type: 'button',
        className: 'pa-scenario' + (activeScenario === s ? ' pa-scenario-on' : ''),
        onClick: () => loadScenario(s),
      }, tr('scenario' + s));

      /* 附件 chips 行（已上传附件 / 上传错误提示 / 合规说明） */
      const renderAttachments = () => {
        if (!files.length && !uploadMsg) return null;
        return h('div', { style: { maxWidth: 896, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
          files.length
            ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
                files.map((f) => h('span', {
                  key: f.key,
                  style: {
                    display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%',
                    background: T.accentSoft, border: '1px solid ' + T.accentSoftBorder,
                    color: T.text2, borderRadius: 8, padding: '4px 8px', fontSize: 11,
                  },
                },
                  Icon({ d: ICONS.doc, size: 12, color: T.accent }),
                  h('span', { title: f.path, style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240, fontWeight: 500 } }, f.name),
                  h('span', { style: { color: T.text3, flexShrink: 0 } }, formatBytes(f.sizeBytes)),
                  h('button', {
                    type: 'button', className: 'pa-chipx', title: tr('removeFile'), 'aria-label': tr('removeFile'),
                    onClick: () => removeFile(f.key),
                  }, '×'),
                )),
              )
            : null,
          uploadMsg
            ? h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, lineHeight: 1.5, color: T.warnText, wordBreak: 'break-all' } },
                Icon({ d: ICONS.warning, size: 12, color: T.warnIcon }),
                h('span', null, uploadMsg.text))
            : null,
          files.length
            ? h('div', { style: { fontSize: 11, color: T.text3, lineHeight: 1.5 } }, tr('uploadNote'))
            : null,
        );
      };

      /* ════════ 中栏（弹性对话/报告区；整栏可作为文件拖放区） ════════ */
      const renderMiddlePanel = () => h('main', {
        onDragEnter, onDragOver, onDragLeave, onDrop,
        style: {
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative',
          background: T.bgRoot, borderRight: '1px solid ' + T.border, overflow: 'hidden',
        },
      },
        // 拖拽悬停高亮遮罩（纯视觉，pointerEvents:none 不拦截 drop 事件）
        dragOver
          ? h('div', {
              key: 'pa-drop-overlay',
              style: {
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--pa-accent-ring, rgba(26,95,158,.15))',
              },
            },
              h('div', {
                style: {
                  display: 'flex', alignItems: 'center', gap: 8, padding: '18px 28px',
                  border: '2px dashed ' + T.accent, borderRadius: 16, background: T.surface,
                  color: T.accent, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(15,23,42,.18)',
                },
              },
                Icon({ d: ICONS.upload, size: 18 }),
                h('span', null, tr('dropHint')),
              ),
            )
          : null,
        // 顶部操作条
        h('div', {
          style: {
            background: T.surface, borderBottom: '1px solid ' + T.border,
            padding: '10px 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', flexShrink: 0, fontSize: 12,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('span', { style: { color: T.text3, fontWeight: 500 } }, tr('scenarioLabel')),
            scenarioBtn('A'), scenarioBtn('B'), scenarioBtn('C'),
          ),
          h('button', {
            type: 'button', className: 'pa-ghostbtn', onClick: resetChat,
            style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 6px', flexShrink: 0 },
          },
            Icon({ d: ICONS.refresh, size: 14 }),
            h('span', null, tr('resetBtn')),
          ),
        ),
        // 对话与报告流式展示区
        h('div', {
          ref: flowRef, className: 'pa-scroll',
          style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
        },
          renderWelcome(),
          messages.map(renderMessage),
        ),
        // 底部：公开确认 + 任务简报生成器
        h('div', { style: { background: T.surface, borderTop: '1px solid ' + T.border, padding: 16, flexShrink: 0 } },
          h('div', { style: { maxWidth: 896, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12 } },
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 } },
              h('input', {
                type: 'checkbox', checked: publicConfirmed,
                onChange: (e) => setPublicConfirmed(e.target.checked),
                style: { width: 16, height: 16, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 },
              }),
              h('span', { style: { color: T.text2, fontWeight: 500 } },
                tr('confirmPre'),
                h('span', { style: { color: T.success, textDecoration: 'underline', fontWeight: 700 } }, tr('confirmStrong')),
                tr('confirmPost'),
              ),
            ),
            h('span', { style: { fontSize: 11, color: T.text3, flexShrink: 0 } }, tr('formatHint')),
          ),
          // 附件 chips（已上传附件 / 上传错误提示 / 合规说明）
          renderAttachments(),
          // 输入行：📎 上传入口（隐藏 file input，多选，白名单）+ 任务输入 + 生成简报
          h('div', { style: { maxWidth: 896, display: 'flex', alignItems: 'center', gap: 8 } },
            h('input', {
              ref: fileInputRef, type: 'file', multiple: true, accept: UPLOAD_ACCEPT,
              onChange: onFileInputChange, 'aria-hidden': true, tabIndex: -1,
              style: { display: 'none' },
            }),
            h('button', {
              type: 'button', className: 'pa-uploadbtn', onClick: pickFiles,
              disabled: uploadBusy, title: uploadBusy ? tr('uploading') : tr('uploadBtnTitle'),
              'aria-label': tr('uploadBtn'),
            }, Icon({ d: ICONS.clip, size: 16 })),
            h('input', {
              type: 'text', value: taskText, placeholder: tr('askPlaceholder'),
              onChange: (e) => setTaskText(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendAsk(); },
              className: 'pa-input',
              style: { flex: 1, minWidth: 0, borderRadius: 12, padding: '10px 16px', fontSize: 12, color: T.text1 },
            }),
            qaBusy
              ? h('button', {
                  type: 'button', className: 'pa-btn', onClick: stopAsk,
                  style: {
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                    borderRadius: 12, fontSize: 12, fontWeight: 500, flexShrink: 0,
                    background: T.warnText, borderColor: T.warnText,
                  },
                }, tr('askStop'))
              : h('button', {
                  type: 'button', className: 'pa-btn', onClick: sendAsk,
                  style: {
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                    borderRadius: 12, fontSize: 12, fontWeight: 500, flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(15,23,42,.12)',
                  },
                },
                  tr('askBtn'),
                  Icon({ d: ICONS.arrow, size: 14 }),
                ),
            h('button', {
              type: 'button', className: 'pa-ghostbtn', onClick: generateBriefing,
              disabled: qaBusy,
              style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '8px 12px', flexShrink: 0 },
            },
              tr('genBriefing'),
            ),
          ),
        ),
      );

      /* ════════ 右栏（320px 证据抽屉） ════════ */
      const evidence = activeEvidence ? EVIDENCE_DB[activeEvidence] : null;
      const isVerified = !!(evidence && verifiedMap[evidence.id]);

      const renderEvidenceEmpty = () => h('div', {
        style: {
          textAlign: 'center', paddingTop: 64, paddingBottom: 64, color: T.text3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        },
      },
        Icon({ d: ICONS.doc, size: 40, sw: 1.5, color: T.text3 }),
        activeScenario === 'C'
          ? h('p', { style: { margin: 0, fontSize: 12 } }, tr('evidenceNoneScenario'))
          : h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.8 } },
              tr('evidenceEmptyPre'),
              h('span', { style: { color: T.accent, fontWeight: 600, textDecoration: 'underline' } }, tr('evidenceEmptyStrong')),
              tr('evidenceEmptyPost'),
            ),
      );

      const renderEvidenceCard = () => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        // 匹配结论
        h('div', { style: { background: T.accentSoft, padding: 10, borderRadius: 8, border: '1px solid ' + T.accentSoftBorder } },
          h('span', { style: { fontSize: 10, color: T.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block' } }, tr('matchedLabel')),
          h('span', { style: { color: T.text1, fontWeight: 600, fontSize: 12, marginTop: 2, display: 'block' } }, evidence.matchedConclusion),
        ),
        // 文件全称与文号
        h('div', null,
          h('span', { style: { fontSize: 10, color: T.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block' } }, tr('docLabel')),
          h('p', { style: { margin: '2px 0 0', color: T.text1, fontWeight: 500, fontSize: 12, lineHeight: 1.6 } }, evidence.title),
          h('span', {
            style: {
              display: 'inline-block', marginTop: 4, fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              color: T.text3, background: T.surface2, padding: '2px 6px', borderRadius: 4,
            },
          }, evidence.docNo),
        ),
        // 官方逐字引文
        h('div', null,
          h('span', { style: { fontSize: 10, color: T.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block' } }, tr('quoteLabel')),
          h('blockquote', {
            style: {
              margin: '4px 0 0', padding: 10, background: T.surface2,
              borderLeft: '2px solid ' + T.accent, color: T.text2,
              fontStyle: 'italic', fontSize: 11, lineHeight: 1.7,
            },
          }, evidence.quote),
        ),
        // 发文机关 / 生效日期
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 } },
          h('div', null,
            h('span', { style: { color: T.text3, display: 'block', fontSize: 10 } }, tr('organLabel')),
            h('span', { style: { color: T.text2, fontWeight: 500 } }, evidence.organ),
          ),
          h('div', null,
            h('span', { style: { color: T.text3, display: 'block', fontSize: 10 } }, tr('effectiveLabel')),
            h('span', { style: { color: T.text2, fontWeight: 500 } }, evidence.effectiveDate),
          ),
        ),
        // 官方 HTTPS 原文链接（外链）
        h('div', null,
          h('span', { style: { fontSize: 10, color: T.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block' } }, tr('urlLabel')),
          h('a', {
            href: evidence.url, target: '_blank', rel: 'noopener noreferrer',
            style: {
              marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: T.accent,
              wordBreak: 'break-all', fontSize: 11, textDecoration: 'underline', lineHeight: 1.5,
            },
          },
            h('span', null, evidence.url),
            Icon({ d: ICONS.external, size: 12 }),
          ),
        ),
        // 核验状态点
        h('div', { style: { paddingTop: 8, borderTop: '1px solid ' + T.borderSub } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.text3 } },
            h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: evidence.verified ? T.success : T.warnIcon, flexShrink: 0 } }),
            evidence.verified ? tr('verifyOk') : tr('verifyWarn'),
          ),
        ),
        // 已人工复核本地状态（内存态，不持久化）
        isVerified
          ? h('div', {
              style: {
                background: T.successBanner, color: T.successText, fontSize: 10, fontWeight: 600,
                padding: '6px 8px', borderRadius: 6, lineHeight: 1.5,
              },
            }, tr('markedVerified'), tr('markedNote'))
          : null,
      );

      const renderRightPanel = () => h('aside', {
        style: {
          width: 320, flexShrink: 0, background: T.surface, display: 'flex',
          flexDirection: 'column', overflow: 'hidden', userSelect: 'none',
        },
      },
        // 抽屉头部
        h('div', {
          style: {
            padding: 16, borderBottom: '1px solid ' + T.border, background: T.surface2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0,
          },
        },
          h('div', { style: { minWidth: 0 } },
            h('h2', { style: { margin: 0, fontSize: 12, fontWeight: 700, color: T.text1, textTransform: 'uppercase', letterSpacing: 0.5 } }, tr('evidenceTitle')),
            h('p', { style: { margin: '2px 0 0', fontSize: 11, color: T.text3 } }, tr('evidenceSub')),
          ),
          h('span', {
            style: {
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, flexShrink: 0,
              background: T.successBanner, color: T.successText, whiteSpace: 'nowrap',
            },
          }, evidence ? evidence.level : tr('badgeDefault')),
        ),
        // 抽屉内容（独立滚动）
        h('div', {
          className: 'pa-scroll',
          style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, fontSize: 12, userSelect: 'text' },
        }, evidence ? renderEvidenceCard() : renderEvidenceEmpty()),
        // 抽屉底部：效力状态 + 人工复核
        h('div', {
          style: {
            padding: 12, background: T.surface2, borderTop: '1px solid ' + T.border,
            fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8, flexShrink: 0,
          },
        },
          h('span', { style: { minWidth: 0 } },
            tr('validityLabel'),
            h('strong', { style: { color: evidence ? (evidence.verified ? T.success : T.warnText) : T.text3 } },
              evidence ? evidence.validity : tr('validityNone')),
          ),
          evidence && !isVerified
            ? h('button', { type: 'button', className: 'pa-linkbtn', onClick: markVerified, style: { fontSize: 11, flexShrink: 0 } }, tr('markVerified'))
            : h('span', { style: { fontSize: 11, flexShrink: 0, color: isVerified ? T.success : T.text3, fontWeight: isVerified ? 600 : 400 } },
                isVerified ? tr('markedVerified') : '—'),
        ),
      );

      /* ════════ 左侧导航：与会议助手使用相同的 rail 宽度、品牌块、间距及选中态 ════════ */
      const NAV_DEFS = [
        { key: 'parse', labelKey: 'tabParse', icon: ICONS.doc },
        { key: 'records', labelKey: 'tabRecords', icon: ICONS.archive },
        { key: 'qa', labelKey: 'tabQa', icon: ICONS.chat },
      ];
      const renderSideNav = () => h('nav', {
        className: 'pa-module-nav' + (moduleNavOpen ? ' is-open' : ''), 'aria-label': '政策模块左侧栏',
        onKeyDown: (e) => { if (e.key === 'Escape') setModuleNavOpen(false); },
      },
        h('div', { className: 'pa-railbrand' },
          h('span', { className: 'pa-railicon', 'aria-hidden': true }, tr('brandMark')),
          h('span', { className: 'pa-railname' }, tr('appTitle')),
        ),
        h('button', { type: 'button', className: 'pa-module-close', 'aria-label': '收起政策模块导航', onClick: () => setModuleNavOpen(false) }, '×'),
        h('div', { className: 'pa-railnav' },
          h('div', { className: 'pa-railsection' }, tr('navWorkspace')),
          NAV_DEFS.map((nd) => h('button', {
            key: nd.key, type: 'button', title: tr(nd.labelKey), 'aria-label': tr(nd.labelKey),
            'aria-current': tab === nd.key ? 'page' : undefined,
            className: 'pa-navitem' + (tab === nd.key ? ' pa-navitem-on' : ''),
            onClick: () => { setTab(nd.key); setModuleNavOpen(false); },
          },
            h('span', { className: 'pa-navicon', 'aria-hidden': true }, Icon({ d: nd.icon, size: 16 })),
            h('span', { className: 'pa-navtxt' }, tr(nd.labelKey)),
          )),
          // 新建会话与历史目录继续留在智能问答项下，保留任务状态。
          renderQaSubnav(),
        ),
        h('div', { className: 'pa-railstatus' },
          h('span', { className: 'pa-statusdot', style: { background: publicConfirmed ? T.success : T.warnIcon } }),
          h('span', { style: { color: publicConfirmed ? T.successText : T.warnText } }, tr(publicConfirmed ? 'navPublicOk' : 'navPublicPending')),
        ),
      );

      /* 拖拽悬停高亮遮罩（文件解析 / 智能问答共用；pointerEvents:none 不拦截 drop 事件） */
      const renderDropOverlay = () => dragOver
        ? h('div', {
            style: {
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--pa-accent-ring, rgba(26,95,158,.15))',
            },
          },
            h('div', {
              style: {
                display: 'flex', alignItems: 'center', gap: 8, padding: '18px 28px',
                border: '2px dashed ' + T.accent, borderRadius: 16, background: T.surface,
                color: T.accent, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(15,23,42,.18)',
              },
            },
              Icon({ d: ICONS.upload, size: 18 }),
              h('span', null, tr('dropHint')),
            ),
          )
        : null;

      /* 小徽标（状态用；corner=true 时为上标角标样式） */
      const makeBadge = (label, bg, border, color, corner) => h('span', {
        style: {
          flexShrink: 0, fontSize: corner ? 9 : 10, fontWeight: 600, whiteSpace: 'nowrap',
          padding: corner ? '1px 6px' : '2px 8px', borderRadius: 999,
          background: bg, border: '1px solid ' + border, color,
          transform: corner ? 'translateY(-3px)' : 'none',
        },
      }, label);

      /* ════════ 页签1「文件解析」 ════════ */
      /* 门禁精简行（v1.3.2：移除「角色/模式/来源」三个下拉——请求体固定缺省 FIXED_*，
       * 理由：政策解读缺省角色/模式 + 严禁联网兜底的保守来源；公开性 checkbox 门禁保留，文案不变） */
      const renderParseGateBar = () => h('div', {
        style: {
          flexShrink: 0, background: T.surface, borderBottom: '1px solid ' + T.border,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12,
        },
      },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 } },
          h('input', {
            type: 'checkbox', checked: publicConfirmed,
            onChange: (e) => setPublicConfirmed(e.target.checked),
            style: { width: 15, height: 15, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 },
          }),
          h('span', { style: { color: T.text2, fontWeight: 500 } }, tr('parseGateCheck')),
        ),
      );

      /* 文件 chip 卡片：文件名/大小/服务器绝对路径（等宽完整显示）+ 复制路径 + 移除；点击选中（高亮边框） */
      const renderFileChip = (f) => {
        const active = activeFileKey === f.key;
        return h('div', {
          key: f.key, role: 'button', tabIndex: 0,
          onClick: () => setActiveFileKey(f.key),
          onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') setActiveFileKey(f.key); },
          style: {
            borderRadius: 10, padding: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
            border: '1px solid ' + (active ? T.accent : T.border),
            background: active ? T.accentActive : T.surface,
            boxShadow: active ? '0 0 0 2px var(--pa-accent-ring, rgba(26,95,158,.15))' : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
            Icon({ d: ICONS.doc, size: 14, color: T.accent }),
            h('span', {
              title: f.name,
              style: { fontWeight: 600, fontSize: 12, color: T.text1, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }, f.name),
            h('span', { style: { fontSize: 10, color: T.text3, flexShrink: 0 } }, formatBytes(f.sizeBytes)),
            h('button', {
              type: 'button', className: 'pa-chipx', title: tr('removeFile'), 'aria-label': tr('removeFile'),
              onClick: (e) => { e.stopPropagation(); removeFile(f.key); },
            }, '×'),
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 } },
            h('span', { style: { fontSize: 10, color: T.text3, flexShrink: 0 } }, tr('parsePathLabel')),
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6 } },
              h('code', {
                style: {
                  flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 1.5, wordBreak: 'break-all', userSelect: 'text',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', color: T.text2,
                  background: T.surface2, border: '1px solid ' + T.borderSub, borderRadius: 6, padding: '4px 6px',
                },
              }, f.path),
              h('button', {
                type: 'button', className: 'pa-ghostbtn', title: tr('parseCopyPath'),
                onClick: (e) => { e.stopPropagation(); copyFilePath(f); },
                style: { fontSize: 10, padding: '2px 4px', flexShrink: 0 },
              }, tr('parseCopyPath')),
              // v1.4.0 在线预览：读取内容前要求已勾选公开性确认（底线 1；未确认时置灰提示）
              h('button', {
                type: 'button', className: 'pa-ghostbtn',
                title: publicConfirmed ? tr('parseChipPreview') : tr('previewGateNeed'),
                'aria-label': publicConfirmed ? tr('parseChipPreview') : tr('previewGateNeed'),
                disabled: !publicConfirmed,
                onClick: (e) => {
                  e.stopPropagation();
                  if (publicConfirmed && f && f.path) setPreviewFile({ name: f.name, path: f.path });
                },
                style: { fontSize: 10, padding: '2px 4px', flexShrink: 0, opacity: publicConfirmed ? 1 : 0.45, cursor: publicConfirmed ? 'pointer' : 'not-allowed' },
              }, tr('parseChipPreview')),
            ),
          ),
        );
      };

      /* v1.4.0 源文件在线预览模态（文件解析页 chip「预览」）：iframe 内嵌 /api/preview，
       * PDF 走浏览器内建查看器，docx/xlsx 显示服务端提取文本页；Esc/关闭按钮可关 */
      const previewSrcUrl = (pf) => '/api/policy-analysis/preview?publicConfirmed=true&path=' + encodeURIComponent(pf.path);
      const renderPreviewModal = () => {
        if (!previewFile) return null;
        return h('div', {
          role: 'dialog', 'aria-modal': true,
          onClick: (e) => { if (e.target === e.currentTarget) setPreviewFile(null); },
          style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60,
            background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          },
        },
          h('div', {
            style: {
              width: 'min(980px, 96vw)', height: 'min(86vh, 900px)', background: T.surface,
              border: '1px solid ' + T.border, borderRadius: 12, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,.35)',
            },
          },
            h('div', { style: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid ' + T.border, background: T.surface2 } },
              Icon({ d: ICONS.doc, size: 14, color: T.accent }),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 700, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tr('previewTitle')),
                h('div', { style: { fontSize: 10, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, previewFile.name),
              ),
              h('a', {
                href: previewSrcUrl(previewFile), target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 11, color: T.accent, textDecoration: 'none', flexShrink: 0 },
              }, tr('previewNewWin') + ' ↗'),
              h('button', {
                type: 'button', className: 'pa-ghostbtn', onClick: () => setPreviewFile(null),
                style: { fontSize: 11, padding: '4px 10px', flexShrink: 0 },
              }, tr('previewClose')),
            ),
            h('iframe', {
              key: previewSrcUrl(previewFile),
              src: previewSrcUrl(previewFile),
              title: tr('previewTitle'),
              style: { flex: 1, minHeight: 0, width: '100%', border: 'none', background: '#ffffff' },
            }),
          ),
        );
      };

      /* 解析页签内联提示（门禁未确认 / 上传错误 / 复制反馈 / 请求失败等） */
      const renderParseMsg = () => {
        if (!parseMsg) return null;
        const isError = parseMsg.kind === 'error';
        const isOk = parseMsg.kind === 'ok';
        return h('div', {
          style: {
            display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.5,
            padding: 8, borderRadius: 8, wordBreak: 'break-all',
            color: isError ? T.warnText : isOk ? T.successText : T.text3,
            background: isError ? T.warnBg : isOk ? T.successSoft : T.surface2,
            border: '1px solid ' + (isError ? T.warnBorder : isOk ? T.successBorder : T.border),
          },
        },
          Icon({ d: isError ? ICONS.warning : ICONS.check, size: 13, color: isError ? T.warnIcon : T.success }),
          h('span', null, parseMsg.text),
        );
      };

      /* 解析视图顶部操作块（v1.3.1，横向紧凑）：上传附件 + 拖拽提示 + 文件 chips（横向换行）
       * + 内联提示 + 开始解析/停止；位于门禁行之下、解析结果面板之上 */
      const renderParseOpsBlock = () => h('div', {
        style: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' },
      },
        // 第一行：上传按钮 + 拖拽提示
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h(SectionLabel, { text: tr('parseUploadLabel') }),
          h('button', {
            type: 'button', className: 'pa-btn', onClick: () => pickFiles(), disabled: uploadBusy,
            title: uploadBusy ? tr('uploading') : tr('uploadBtnTitle'),
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, flexShrink: 0,
              opacity: uploadBusy ? 0.6 : 1, cursor: uploadBusy ? 'wait' : 'pointer',
            },
          },
            Icon({ d: ICONS.upload, size: 14 }),
            h('span', null, uploadBusy ? tr('uploading') : tr('uploadBtn')),
          ),
          h('div', {
            style: {
              flex: 1, minWidth: 220, border: '1px dashed ' + (dragOver ? T.accent : T.border), borderRadius: 10,
              padding: '6px 12px', fontSize: 11, color: T.text3, lineHeight: 1.5, textAlign: 'center',
              background: dragOver ? T.accentSoft : T.surface2,
            },
          },
            tr('parsePickHint'),
            h('span', { style: { marginLeft: 8 } }, tr('formatHint')),
          ),
        ),
        // 第二行：文件 chips（横向换行，超高内滚）
        files.length
          ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 158, overflowY: 'auto' } },
              files.map((f) => h('div', { key: f.key, style: { width: 340, maxWidth: '100%', flexShrink: 0 } }, renderFileChip(f))))
          : null,
        // 上传/解析内联提示
        uploadMsg
          ? h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, lineHeight: 1.5, color: T.warnText, wordBreak: 'break-all' } },
              Icon({ d: ICONS.warning, size: 12, color: T.warnIcon }),
              h('span', null, uploadMsg.text))
          : null,
        renderParseMsg(),
        // 第三行：开始解析 / 停止
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'stretch' } },
          h('button', {
            type: 'button', className: 'pa-btn', onClick: startParse,
            disabled: !activeFile || parseBusy,
            title: !activeFile ? tr('parseNoFile') : tr('parseStartBtn'),
            style: {
              borderRadius: 10, padding: '9px 22px', fontSize: 12.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
              opacity: !activeFile || parseBusy ? 0.55 : 1,
              cursor: !activeFile || parseBusy ? 'not-allowed' : 'pointer',
            },
          },
            Icon({ d: ICONS.arrow, size: 14 }),
            h('span', null, tr('parseStartBtn')),
          ),
          parseBusy
            ? h('button', {
                type: 'button', className: 'pa-btn', onClick: stopParse, title: tr('parseStopHint'),
                style: {
                  borderRadius: 10, padding: '9px 16px', fontSize: 12.5, fontWeight: 600,
                  background: T.warnText, flexShrink: 0,
                },
              }, tr('askStop'))
            : null,
        ),
      );

      /* 解析过程窗口：与解析结果面板统一浅色背景、边框、标题及正文样式 */
      const renderParseTerm = () => h('div', {
        style: {
          borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0,
          background: T.surface, color: T.text1, border: '1px solid ' + T.border,
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 14px', borderBottom: '1px solid ' + T.border, flexShrink: 0 } },
          h('span', { style: { fontWeight: 700, fontSize: 12.5, color: T.text1 } }, tr('parseLogTitle')),
          parseJobId
            ? h('span', { style: { fontSize: 10, color: T.text3, wordBreak: 'break-all' } }, 'jobId: ' + parseJobId)
            : null,
        ),
        h('div', {
          ref: termRef, className: 'pa-scroll',
          style: { height: 176, maxHeight: 260, overflowY: 'auto', padding: 14, fontSize: 12.5, lineHeight: 1.6 },
        },
          parseLog.length === 0 && !parseThinking
            ? h('div', { style: { color: T.text3 } }, tr('parseLogEmpty'))
            : parseLog.map((l, i) => h('div', {
                key: i,
                style: {
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  color: l.kind === 'error' || l.kind === 'warn' ? T.warnText : l.kind === 'tool' ? T.infoInk : T.text1,
                },
              }, '[' + l.ts + '] ' + l.text)),
        ),
        // 「思考中」动态滚动行（thinking 增量合并为一条，仅显示最近片段）
        parseThinking
          ? h('div', {
              className: 'pa-scroll',
              style: {
                flexShrink: 0, borderTop: '1px solid ' + T.border, padding: '8px 14px',
                fontSize: 12.5, lineHeight: 1.6, color: T.text2, maxHeight: 84, overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              },
            },
              '⏳ ' + tr('parseThinking') + '… ' + (parseThinking.length > 160 ? '…' + parseThinking.slice(-160) : parseThinking))
          : null,
      );

      const renderParseStatusBadge = () => {
        if (parseResultState === 'streaming') return makeBadge(tr('parseStatusStreaming'), T.infoBg, T.infoBorder, T.infoInk);
        if (parseResultState === 'done') return makeBadge(tr('parseStatusDone'), T.successSoft, T.successBorder, T.successText);
        if (parseResultState === 'error') return makeBadge(tr('parseStatusError'), T.warnBg, T.warnBorder, T.warnText);
        return null;
      };

      /* 解析结果面板：pre-wrap 正文 + 状态徽标；done 时出现 归档 / 复制 / 重新解析 */
      const renderParseResultPanel = () => h('div', {
        style: {
          flex: 1, minHeight: 0, background: T.surface, border: '1px solid ' + T.border,
          borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid ' + T.border, flexWrap: 'wrap', flexShrink: 0 } },
          h('span', { style: { fontWeight: 700, fontSize: 12.5, color: T.text1 } }, tr('parseResultTitle')),
          renderParseStatusBadge(),
          resultCopyState
            ? h('span', { style: { fontSize: 11, fontWeight: 600, color: resultCopyState === 'ok' ? T.success : T.warnText } },
                tr(resultCopyState === 'ok' ? 'parseResultCopyOk' : 'copyFail'))
            : null,
          h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 } },
            // v1.4.0：格式化/原文视图切换（有结果即可切换，含流式中的当前快照）
            parseResult
              ? h('button', {
                  type: 'button', className: 'pa-linkbtn', onClick: () => setParseRaw((v) => !v),
                  title: tr('recDrawerFormatted') + ' / ' + tr('recDrawerRaw'),
                  style: { fontSize: 11 },
                }, parseRaw ? tr('recDrawerFormatted') : tr('recDrawerRaw'))
              : null,
            // v1.3.2：下载 Word（GB/T 9704-2012 公文格式）——有结果即可下载（含流式中的当前快照）
            parseResult
              ? h('button', {
                  type: 'button', className: 'pa-linkbtn', onClick: downloadParseDocx,
                  disabled: parseDocxBusy,
                  title: tr('parseDocxNote'),
                  style: { fontSize: 11, opacity: parseDocxBusy ? 0.5 : 1 },
                }, parseDocxBusy ? tr('parseDocxBusy') : tr('parseDocxBtn'))
              : null,
            parseResultState === 'done'
              ? h('button', { type: 'button', className: 'pa-linkbtn', onClick: copyParseResult, style: { fontSize: 11 } }, tr('parseCopy'))
              : null,
            parseResultState === 'done'
              ? h('button', {
                  type: 'button', className: 'pa-linkbtn', onClick: () => void startParse(),
                  disabled: !activeFile || parseBusy, style: { fontSize: 11, opacity: !activeFile || parseBusy ? 0.5 : 1 },
                }, tr('parseAgain'))
              : null,
            parseResultState === 'done' && parseRecord
              ? h('button', {
                  type: 'button', className: 'pa-btn', onClick: openArchive,
                  style: { borderRadius: 8, padding: '5px 14px', fontSize: 11, fontWeight: 600 },
                }, tr('parseArchive'))
              : null,
          ),
        ),
        // v1.3.2 小注：说明 Word 下载采用公文格式标准（有结果时显示）
        parseResult
          ? h('div', { style: { padding: '3px 14px', fontSize: 10, color: T.text3, borderBottom: '1px dashed ' + T.borderSub, flexShrink: 0 } },
              tr('parseDocxNote'))
          : null,
        h('div', {
          ref: parseResultRef, className: 'pa-scroll',
          style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 },
        },
          parseResult
            ? (parseRaw
                ? h('pre', {
                    style: {
                      margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text',
                      fontSize: 12.5, lineHeight: 1.6, color: T.text1, fontFamily: 'inherit',
                    },
                  }, parseResult + (parseResultState === 'streaming' ? ' ▍' : ''))
                : h('div', { style: { fontSize: T.contentFont, color: T.text1 } },
                    renderMdBlocks(parseResult),
                    parseResultState === 'streaming' ? h('span', { className: 'pa-qablink' }, '▍') : null))
            : h('div', {
                style: { textAlign: 'center', paddingTop: 56, color: T.text3, fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
              },
                Icon({ d: ICONS.doc, size: 36, sw: 1.5, color: T.text3 }),
                h('span', null, tr('parseResultEmpty')),
              ),
        ),
      );

      /* 视图1 布局（v1.3.1 上下结构）：门禁行 → 上传/开始解析操作块（上）→ 解析结果面板 →
       * 解析过程窗口（页面下方，固定高度，保持自动滚底）；流式期间两区状态联动不变 */
      const renderParseTab = () => h('div', {
        onDragEnter, onDragOver, onDragLeave, onDrop,
        style: {
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden', background: T.bgRoot,
        },
      },
        // 拖拽悬停高亮遮罩（与智能问答视图共用）
        renderDropOverlay(),
        renderParseGateBar(),
        // 上部操作块：上传附件 + 文件 chips + 开始解析
        renderParseOpsBlock(),
        // 解析结果面板（上方，弹性高度，最小 140）
        h('div', { style: { flex: 1, minHeight: 140, display: 'flex', flexDirection: 'column', padding: '0 14px' } },
          renderParseResultPanel(),
        ),
        // 解析过程窗口（页面下方，固定高度，自动滚底）
        h('div', { style: { flexShrink: 0, padding: '12px 14px 14px' } },
          renderParseTerm(),
        ),
      );

      /* ════════ 页签2「解析归档记录」 ════════ */
      const recStatusBadge = (rec) => {
        const st = rec && rec.status;
        const base = st === 'failed'
          ? makeBadge(tr('recStatusFailed'), TINTS.rose.bg, TINTS.rose.border, TINTS.rose.chip)
          : st === 'done'
            ? makeBadge(tr('recStatusDone'), T.successSoft, T.successBorder, T.successText)
            : makeBadge(tr('recStatusParsing'), T.infoBg, T.infoBorder, T.infoInk);
        if (st === 'archived') {
          // 已归档：基础状态徽标外追加灰色上标角标
          return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
            base, makeBadge(tr('recStatusArchived'), T.surface2, T.border, T.text3, true));
        }
        return base;
      };

      const recMsgLine = () => {
        if (!recMsg) return null;
        const isError = recMsg.kind === 'error';
        return h('div', {
          style: {
            flexShrink: 0, background: T.surface, borderBottom: '1px solid ' + T.border,
            padding: '6px 16px', fontSize: 11, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6,
            color: isError ? T.warnText : recMsg.kind === 'ok' ? T.successText : T.text3,
            wordBreak: 'break-all',
          },
        },
          Icon({ d: isError ? ICONS.warning : ICONS.check, size: 12, color: isError ? T.warnIcon : T.success }),
          h('span', null, recMsg.text),
        );
      };

      /* ════════ v1.4.0 轻量 Markdown 渲染（解读报告在线查看） ════════
       * 支持：# 标题 / 一、中文小节加粗 / 无序·有序列表 / 引用 / 分隔线 / 表格 / 段落，
       * 行内 **粗体** *斜体* `代码` [链接](http…)。全部输出 React 文本节点（自动转义），
       * 不使用 HTML 直注入（no inner html），报告内容不可能注入脚本。 */
      const MD_INLINE_RE = /(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/;
      const renderMdInline = (text, keyBase) => {
        const nodes = [];
        let rest = String(text || '');
        let k = 0;
        while (rest) {
          const m = MD_INLINE_RE.exec(rest);
          if (!m) { nodes.push(rest); break; }
          if (m.index > 0) nodes.push(rest.slice(0, m.index));
          if (m[1]) {
            nodes.push(h('code', {
              key: keyBase + '-c' + (k++),
              style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.92em', background: T.surface2, border: '1px solid ' + T.borderSub, borderRadius: 4, padding: '0 4px' },
            }, m[2]));
          } else if (m[3]) {
            nodes.push(h('strong', { key: keyBase + '-b' + (k++), style: { fontWeight: 700 } }, m[4]));
          } else if (m[5]) {
            nodes.push(h('em', { key: keyBase + '-i' + (k++), style: { fontStyle: 'italic' } }, m[6]));
          } else if (m[7]) {
            nodes.push(h('a', {
              key: keyBase + '-a' + (k++), href: m[8], target: '_blank', rel: 'noopener noreferrer',
              style: { color: T.accent, wordBreak: 'break-all' },
            }, m[8]));
          }
          rest = rest.slice(m.index + m[0].length);
        }
        return nodes;
      };

      const renderMdBlocks = (md) => {
        const lines = String(md || '').split(/\r?\n/);
        const out = [];
        let i = 0;
        let kn = 0;
        const k = () => 'mdb' + (kn++);
        const headStyle = (lvl) => ({
          margin: lvl <= 2 ? '14px 0 8px' : '10px 0 6px',
          fontSize: lvl <= 2 ? 15 : 13.5,
          lineHeight: 1.5, fontWeight: 700, color: T.text1,
        });
        while (i < lines.length) {
          const t = lines[i].trim();
          if (!t) { i++; continue; }
          // 标题（#~####；报告一级标题映射为 h2，避免盖过抽屉自身标题层级）
          const hm = /^(#{1,6})\s+(.*)$/.exec(t);
          if (hm) {
            const lvl = Math.min(hm[1].length, 3) + 1; // h1→h2, h2→h3, h3+→h4
            out.push(h('h' + lvl, { key: k(), style: headStyle(lvl) }, renderMdInline(hm[2], k())));
            i++; continue;
          }
          // 中文小节（一、二、…）：政务报告惯用节标题，渲染为加粗小标题
          if (/^[一二三四五六七八九十]+\s*、/.test(t)) {
            out.push(h('div', { key: k(), style: headStyle(3) }, renderMdInline(t, k())));
            i++; continue;
          }
          // 分隔线
          if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
            out.push(h('hr', { key: k(), style: { border: 'none', borderTop: '1px solid ' + T.border, margin: '12px 0' } }));
            i++; continue;
          }
          // 表格（| a | b | + 分隔行）
          if (/^\|.*\|\s*$/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1].trim())) {
            const header = t.replace(/^\||\|\s*$/g, '').split('|').map((s) => s.trim());
            i += 2;
            const rows = [];
            while (i < lines.length && /^\|.*\|\s*$/.test(lines[i].trim())) {
              rows.push(lines[i].trim().replace(/^\||\|\s*$/g, '').split('|').map((s) => s.trim()));
              i++;
            }
            const cellStyle = { border: '1px solid ' + T.borderSub, padding: '5px 8px', fontSize: 11.5, verticalAlign: 'top' };
            const headCells = header.map((c, ci) => h('th', {
              key: 'th' + ci,
              style: Object.assign({}, cellStyle, { background: T.surface2, fontWeight: 700, textAlign: 'left' }),
            }, renderMdInline(c, k())));
            const bodyRows = rows.map((r, ri) => h('tr', { key: 'tr' + ri }, header.map((_, ci) => h('td', {
              key: 'td' + ci, style: cellStyle,
            }, renderMdInline(r[ci] == null ? '' : r[ci], k())))));
            out.push(h('table', {
              key: k(),
              style: { borderCollapse: 'collapse', width: '100%', margin: '8px 0', fontSize: 11.5 },
            },
              h('thead', null, h('tr', null, headCells)),
              h('tbody', null, bodyRows),
            ));
            continue;
          }
          // 引用块
          if (/^>\s?/.test(t)) {
            const buf = [];
            while (i < lines.length) {
              const tt = lines[i].trim();
              if (!/^>\s?/.test(tt)) break;
              buf.push(tt.replace(/^>\s?/, ''));
              i++;
            }
            out.push(h('blockquote', {
              key: k(),
              style: { margin: '6px 0', borderLeft: '3px solid ' + T.accentSoftBorder, padding: '2px 12px', color: T.text2 },
            }, buf.map((b, bi) => h('div', { key: bi }, renderMdInline(b, k())))));
            continue;
          }
          // 无序列表
          if (/^[-*•]\s+/.test(t)) {
            const items = [];
            while (i < lines.length) {
              const mm = /^[-*•]\s+(.*)$/.exec(lines[i].trim());
              if (!mm) break;
              items.push(mm[1]);
              i++;
            }
            out.push(h('ul', { key: k(), style: { margin: '4px 0 10px', paddingLeft: 20 } },
              items.map((it, ii) => h('li', { key: ii, style: { marginBottom: 4, lineHeight: 1.7 } }, renderMdInline(it, k())))));
            continue;
          }
          // 有序列表
          if (/^\d+[.)、]\s*/.test(t)) {
            const items = [];
            while (i < lines.length) {
              const mm = /^\d+[.)、]\s*(.*)$/.exec(lines[i].trim());
              if (!mm) break;
              items.push(mm[1]);
              i++;
            }
            out.push(h('ol', { key: k(), style: { margin: '4px 0 10px', paddingLeft: 22 } },
              items.map((it, ii) => h('li', { key: ii, style: { marginBottom: 4, lineHeight: 1.7 } }, renderMdInline(it, k())))));
            continue;
          }
          // 段落（合并后续普通行）
          const buf = [t];
          i++;
          while (i < lines.length) {
            const tt = lines[i].trim();
            if (!tt) break;
            if (/^(#{1,6}\s|[-*•]\s|>\s?|\|)/.test(tt) || /^(-{3,}|\*{3,}|_{3,})$/.test(tt)
              || /^\d+[.)、]\s*/.test(tt) || /^[一二三四五六七八九十]+\s*、/.test(tt)) break;
            buf.push(tt);
            i++;
          }
          out.push(h('p', { key: k(), style: { margin: '0 0 9px', lineHeight: 1.75 } },
            buf.map((b, bi) => h('span', { key: bi }, renderMdInline(b, k())))));
        }
        return out;
      };

      /* 查看结果抽屉（v1.4.0）：打开时拉取 /records/:id 全文（列表行仅含 resultPreview），
       * 页签 = 解读报告（Markdown 富文本 + 原文切换）/ 源文件预览（iframe 内嵌在线查看）。 */
      const openRecordDrawer = (rec) => {
        if (!rec || !rec.id) return;
        setDrawerTab('report');
        setDrawerRaw(false);
        setDrawerRecord(Object.assign({}, rec, { __loading: true, __loadError: '' }));
        void (async () => {
          try {
            const resp = await fetch('/api/policy-analysis/records/' + encodeURIComponent(rec.id), {
              credentials: 'same-origin',
            });
            let data = null;
            try { data = await resp.json(); } catch { data = null; }
            if (resp.ok && data && data.ok === true && data.record) {
              const full = data.record;
              setDrawerRecord((cur) => (cur && cur.id === rec.id ? Object.assign({}, full, { __loading: false, __loadError: '' }) : cur));
            } else {
              throw new Error((data && data.message) || 'HTTP ' + resp.status);
            }
          } catch (e) {
            // 详情拉取失败：保留列表行数据（resultPreview 兜底显示），并在抽屉内提示
            setDrawerRecord((cur) => (cur && cur.id === rec.id
              ? Object.assign({}, cur, { __loading: false, __loadError: String((e && e.message) || e) })
              : cur));
          }
        })();
      };

      /* 源文件预览地址（记录存在即视为已过解析门禁；?download=1 走附件下载） */
      const recordSourceUrl = (rec, download) => '/api/policy-analysis/records/' + encodeURIComponent(rec.id)
        + '/source' + (download ? '?download=1' : '');

      const renderRecordDrawer = () => {
        const rec = drawerRecord;
        if (!rec) return null;
        const hasSource = typeof rec.filePath === 'string' && rec.filePath;
        const rawText = String(rec.result || rec.resultPreview || rec.error || '');
        return h('div', null,
          h('div', {
            onClick: () => setDrawerRecord(null),
            style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, background: 'rgba(15,23,42,.32)' },
          }),
          h('aside', {
            style: {
              position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 21, width: 560, maxWidth: '92%',
              background: T.surface, borderLeft: '1px solid ' + T.border,
              boxShadow: '-12px 0 32px rgba(15,23,42,.18)', display: 'flex', flexDirection: 'column',
            },
          },
            // 头部：标题 + 文件信息
            h('div', { style: { padding: '12px 16px 0', borderBottom: '1px solid ' + T.border, background: T.surface2, flexShrink: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 } },
                h('div', { style: { minWidth: 0 } },
                  h('h2', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: T.text1, wordBreak: 'break-all' } }, rec.title || rec.fileName || '—'),
                  h('p', { style: { margin: '3px 0 0', fontSize: 11, color: T.text3, wordBreak: 'break-all' } },
                    (rec.fileName || '—') + ' · ' + fmtDateTime(rec.createdAt)),
                ),
                h('button', {
                  type: 'button', className: 'pa-ghostbtn', onClick: () => setDrawerRecord(null),
                  'aria-label': tr('recDrawerClose'), title: tr('recDrawerClose'),
                  style: { fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '2px 6px' },
                }, '×'),
              ),
              // 页签：解读报告 / 源文件预览
              h('div', { style: { display: 'flex', gap: 4, marginTop: 8 } },
                h('button', {
                  type: 'button',
                  className: 'pa-ghostbtn',
                  onClick: () => setDrawerTab('report'),
                  style: {
                    fontSize: 11.5, padding: '6px 12px', fontWeight: drawerTab === 'report' ? 700 : 400,
                    color: drawerTab === 'report' ? T.accent : T.text2,
                    borderBottom: '2px solid ' + (drawerTab === 'report' ? T.accent : 'transparent'),
                    borderRadius: '6px 6px 0 0',
                  },
                }, tr('recDrawerTabReport')),
                hasSource
                  ? h('button', {
                      type: 'button',
                      className: 'pa-ghostbtn',
                      onClick: () => {setPreviewConfirmed(false);setPendingPreview({name:rec.fileName,path:rec.filePath});},
                      title: rec.filePath,
                      style: {
                        fontSize: 11.5, padding: '6px 12px', fontWeight: drawerTab === 'source' ? 700 : 400,
                        color: drawerTab === 'source' ? T.accent : T.text2,
                        borderBottom: '2px solid ' + (drawerTab === 'source' ? T.accent : 'transparent'),
                        borderRadius: '6px 6px 0 0',
                      },
                    }, tr('recDrawerTabSource'))
                  : null,
              ),
            ),
            // 正文区
            drawerTab === 'source' && hasSource
              ? h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.surface } },
                  h('div', { style: { flexShrink: 0, padding: '6px 16px', borderBottom: '1px dashed ' + T.borderSub, display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { style: { fontSize: 10, color: T.text3, flex: 1, minWidth: 0 } }, tr('recDrawerSourceNote')),
                    h('a', {
                      href: recordSourceUrl(rec, false), target: '_blank', rel: 'noopener noreferrer',
                      style: { fontSize: 11, color: T.accent, flexShrink: 0, textDecoration: 'none' },
                    }, tr('recDrawerSourceOpen') + ' ↗'),
                  ),
                  h('iframe', {
                    key: recordSourceUrl(rec, false),
                    src: recordSourceUrl(rec, false),
                    title: tr('recDrawerTabSource'),
                    style: { flex: 1, minHeight: 0, width: '100%', border: 'none', background: '#ffffff' },
                  }),
                )
              : h('div', { className: 'pa-scroll', style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
                  rec.__loading
                    ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: T.text3, fontSize: 12 } },
                        h('span', { className: 'pa-spinner' }), tr('recDrawerLoading'))
                    : null,
                  rec.__loadError
                    ? h('div', {
                        style: {
                          background: TINTS.rose.bg, border: '1px solid ' + TINTS.rose.border, borderRadius: 8,
                          padding: 10, color: TINTS.rose.title, fontSize: 11.5, lineHeight: 1.6, wordBreak: 'break-all',
                        },
                      }, tr('recDrawerLoadFail') + rec.__loadError)
                    : null,
                  // 报告工具行：原文/格式化切换（有正文时）
                  (rec.result || rec.resultPreview) && !rec.__loading
                    ? h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                        h('button', {
                          type: 'button', className: 'pa-ghostbtn',
                          onClick: () => setDrawerRaw((v) => !v),
                          style: { fontSize: 10.5, padding: '3px 8px' },
                        }, drawerRaw ? tr('recDrawerFormatted') : tr('recDrawerRaw')),
                      )
                    : null,
                  rec.result
                    ? (drawerRaw
                        ? h('pre', {
                            style: {
                              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text',
                              fontSize: 12.5, lineHeight: 1.6, color: T.text1, fontFamily: 'inherit',
                            },
                          }, rec.result)
                        : h('div', { style: { fontSize: T.contentFont, color: T.text1 } }, renderMdBlocks(rec.result)))
                    : rec.resultPreview
                      ? h('pre', {
                          style: {
                            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text',
                            fontSize: 12.5, lineHeight: 1.6, color: T.text2, fontFamily: 'inherit',
                            background: T.surface2, border: '1px dashed ' + T.borderSub, borderRadius: 8, padding: 10,
                          },
                        }, rec.resultPreview)
                      : null,
                  rec.error
                    ? h('div', {
                        style: {
                          background: TINTS.rose.bg, border: '1px solid ' + TINTS.rose.border, borderRadius: 8,
                          padding: 10, color: TINTS.rose.title, fontSize: 11.5, lineHeight: 1.6, wordBreak: 'break-word',
                        },
                      },
                        h('div', { style: { fontWeight: 700, marginBottom: 4 } }, tr('recDrawerErrorLabel')),
                        h('div', { style: { whiteSpace: 'pre-wrap' } }, rec.error))
                    : null,
                  !rawText && !rec.__loading && !hasSource
                    ? h('div', { style: { color: T.text3, fontSize: 12 } }, tr('recEmpty'))
                    : null,
                ),
            h('div', { style: { padding: '10px 16px', borderTop: '1px solid ' + T.border, background: T.surface2, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 } },
              h('button', {
                type: 'button', className: 'pa-railback', onClick: () => setDrawerRecord(null),
                style: { margin: 0, flex: 'none' },
              }, tr('recDrawerClose')),
              // v1.3.2：下载 Word（GB/T 9704-2012 公文格式）——已完成记录可下载
              rec.status === 'done'
                ? h('button', {
                    type: 'button', className: 'pa-btn', onClick: () => void downloadRecordDocx(rec),
                    disabled: docxRecBusyId === rec.id,
                    title: tr('parseDocxNote'),
                    style: { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, opacity: docxRecBusyId === rec.id ? 0.6 : 1 },
                  }, docxRecBusyId === rec.id ? tr('parseDocxBusy') : tr('parseDocxBtn'))
                : null,
              // v1.4.2：编辑当前记录（打开编辑对话框；解析中的记录仅锁「解析结果」字段）
              h('button', {
                type: 'button', className: 'pa-ghostbtn', onClick: () => openRecordEdit(rec),
                style: { fontSize: 12, padding: '8px 12px', flexShrink: 0 },
              }, tr('recBtnEdit')),
              h('button', {
                type: 'button', className: 'pa-btn', onClick: () => jumpToFileQa(rec),
                style: { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600 },
              }, tr('recBtnFileQa')),
            ),
          ),
        );
      };

      /* 记录页签：筛选栏（内容/日期区间 + 查询/重置） + 整宽表格（粘顶表头/行 hover/空态） + 抽屉 */
      const renderRecordsTab = () => h('div', {
        style: {
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden', background: T.bgRoot,
        },
      },
        h('div', { style: { flexShrink: 0, background: T.surface, borderBottom: '1px solid ' + T.border, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 } },
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: T.text3, fontSize: 11 } },
            h('span', { style: { flexShrink: 0 } }, tr('recFilterQ')),
            h('input', {
              type: 'text', value: recQ, placeholder: tr('recFilterQPlaceholder'),
              onChange: (e) => setRecQ(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void loadRecords(); },
              className: 'pa-input',
              style: { width: 230, borderRadius: 8, padding: '7px 10px', fontSize: 12, color: T.text1 },
            }),
          ),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: T.text3, fontSize: 11 } },
            h('span', { style: { flexShrink: 0 } }, tr('recFilterFrom')),
            h('input', {
              type: 'date', value: recFrom, onChange: (e) => setRecFrom(e.target.value),
              className: 'pa-input', 'aria-label': tr('recFilterFrom'),
              style: { borderRadius: 8, padding: '6px 8px', fontSize: 12, color: T.text1 },
            }),
          ),
          h('span', { style: { color: T.text3, fontSize: 11, flexShrink: 0 } }, tr('recFilterTo')),
          h('input', {
            type: 'date', value: recTo, onChange: (e) => setRecTo(e.target.value),
            className: 'pa-input', 'aria-label': tr('recFilterTo'),
            style: { borderRadius: 8, padding: '6px 8px', fontSize: 12, color: T.text1 },
          }),
          h('button', {
            type: 'button', className: 'pa-btn', onClick: () => void loadRecords(), disabled: recLoading,
            style: { borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, flexShrink: 0, opacity: recLoading ? 0.6 : 1 },
          }, tr('recQueryBtn')),
          h('button', {
            type: 'button', className: 'pa-ghostbtn', onClick: resetRecFilters,
            style: { fontSize: 11, padding: '6px 8px', flexShrink: 0 },
          }, tr('recResetBtn')),
          recordsTotal
            ? h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.text3, flexShrink: 0 } }, tr('recTotal', { n: recordsTotal }))
            : null,
        ),
        recMsgLine(),
        h('div', { className: 'pa-scroll', style: { flex: 1, minHeight: 0, overflowY: 'auto' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, background: T.surface } },
            h('thead', { className: 'pa-thead' },
              h('tr', null,
                [
                  { key: 'seq', label: tr('recColSeq'), w: 52 },
                  { key: 'date', label: tr('recColDate'), w: 132 },
                  { key: 'title', label: tr('recColTitle') },
                  { key: 'file', label: tr('recColFile'), w: 200 },
                  { key: 'remark', label: tr('recColRemark'), w: 140 },
                  { key: 'ops', label: tr('recColActions'), w: 268 },
                ].map((c) => h('th', {
                  key: c.key,
                  style: {
                    textAlign: 'left', padding: '9px 12px', background: T.surface2,
                    borderBottom: '1px solid ' + T.border, color: T.text3, fontWeight: 600,
                    fontSize: 11, whiteSpace: 'nowrap', width: c.w,
                  },
                }, c.label)),
              ),
            ),
            h('tbody', null,
              records.length === 0
                ? h('tr', null,
                    h('td', {
                      colSpan: 6,
                      style: { textAlign: 'center', padding: '56px 12px', color: T.text3, fontSize: 12, background: T.surface },
                    }, recLoading ? tr('recLoading') : tr('recEmpty')),
                  )
                : records.map((rec, i) => h('tr', {
                    key: rec && rec.id ? rec.id : 'r' + i, className: 'pa-trow',
                    style: { borderBottom: '1px solid ' + T.borderSub },
                  },
                    h('td', { style: { padding: '9px 12px', color: T.text3, fontSize: 11, verticalAlign: 'top' } }, i + 1),
                    h('td', { style: { padding: '9px 12px', color: T.text2, whiteSpace: 'nowrap', verticalAlign: 'top' } }, fmtDateTime(rec && rec.createdAt)),
                    h('td', { style: { padding: '9px 12px', minWidth: 0, verticalAlign: 'top' } },
                      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' } },
                        h('span', { style: { fontWeight: 500, color: T.text1, wordBreak: 'break-all' } }, (rec && rec.title) || '—'),
                        recStatusBadge(rec),
                      ),
                    ),
                    h('td', { style: { padding: '9px 12px', color: T.text2, wordBreak: 'break-all', verticalAlign: 'top' } }, (rec && rec.fileName) || '—'),
                    h('td', { style: { padding: '9px 12px', color: T.text3, wordBreak: 'break-all', verticalAlign: 'top' } }, (rec && rec.remark) || '—'),
                    h('td', { style: { padding: '9px 12px', whiteSpace: 'nowrap', verticalAlign: 'top' } },
                      h('button', {
                        type: 'button', className: 'pa-btn', onClick: () => jumpToFileQa(rec),
                        title: tr('recJumpOk'),
                        style: { borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, marginRight: 6 },
                      }, tr('recBtnFileQa')),
                      (rec && (rec.status === 'done' || rec.status === 'failed'))
                        ? h('button', {
                            type: 'button', className: 'pa-linkbtn', onClick: () => openRecordDrawer(rec),
                            style: { fontSize: 11, marginRight: 8 },
                          }, tr('recBtnView'))
                        : null,
                      /* v1.4.2 编辑：各状态均可打开（解析中的记录仅锁「解析结果」字段） */
                      h('button', {
                        type: 'button', className: 'pa-linkbtn', onClick: () => openRecordEdit(rec),
                        style: { fontSize: 11, marginRight: 8 },
                      }, tr('recBtnEdit')),
                      (rec && rec.status === 'done')
                        ? h('button', {
                            type: 'button', className: 'pa-linkbtn', onClick: () => void downloadRecordDocx(rec),
                            disabled: docxRecBusyId === (rec && rec.id),
                            title: tr('parseDocxNote'),
                            style: { fontSize: 11, marginRight: 8, opacity: docxRecBusyId === (rec && rec.id) ? 0.5 : 1 },
                          }, docxRecBusyId === (rec && rec.id) ? tr('parseDocxBusy') : tr('recBtnDownload'))
                        : null,
                      h('button', {
                        type: 'button', className: 'pa-ghostbtn', onClick: () => requestDelete(rec),
                        style: {
                          fontSize: 11, padding: '4px 6px',
                          color: pendingDeleteId === (rec && rec.id) ? TINTS.rose.chip : undefined,
                          fontWeight: pendingDeleteId === (rec && rec.id) ? 700 : 400,
                        },
                      }, pendingDeleteId === (rec && rec.id) ? tr('recDeleteConfirm') : tr('recBtnDelete')),
                    ),
                  )),
            ),
          ),
        ),
        drawerRecord ? renderRecordDrawer() : null,
      );

      /* 归档模态对话框（遮罩 + 居中卡片；Esc/取消/点遮罩可关） */
      const renderArchiveModal = () => h('div', {
        role: 'dialog', 'aria-modal': true,
        onClick: (e) => { if (e.target === e.currentTarget) setArchiveOpen(false); },
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          background: 'rgba(15,23,42,.45)',
        },
      },
        h('div', {
          style: {
            width: 460, maxWidth: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column',
            background: T.surface, border: '1px solid ' + T.border, borderRadius: 14,
            boxShadow: '0 24px 64px rgba(15,23,42,.35)',
          },
        },
          h('div', { style: { padding: '14px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 } },
            h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text1 } }, tr('archTitle')),
            h('button', {
              type: 'button', className: 'pa-ghostbtn', onClick: () => setArchiveOpen(false),
              'aria-label': tr('archCancelBtn'), style: { fontSize: 16, lineHeight: 1, padding: '2px 6px' },
            }, '×'),
          ),
          h('div', { className: 'pa-scroll', style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
              h('span', null, tr('archNameLabel')),
              h('input', {
                type: 'text', value: archiveTitle, placeholder: tr('archNameLabel'),
                onChange: (e) => setArchiveTitle(e.target.value),
                className: 'pa-input',
                style: { borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: T.text1 },
              }),
            ),
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
              h('span', null, tr('archRemarkLabel')),
              h('textarea', {
                value: archiveRemark, placeholder: tr('archRemarkPlaceholder'), rows: 3,
                onChange: (e) => setArchiveRemark(e.target.value),
                className: 'pa-input',
                style: { borderRadius: 8, padding: '8px 10px', fontSize: 12, color: T.text1, resize: 'vertical', minHeight: 64, lineHeight: 1.6 },
              }),
            ),
            archiveMsg
              ? h('div', {
                  style: {
                    display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.5,
                    padding: 8, borderRadius: 8, color: T.warnText, background: T.warnBg,
                    border: '1px solid ' + T.warnBorder, wordBreak: 'break-all',
                  },
                },
                  Icon({ d: ICONS.warning, size: 13, color: T.warnIcon }),
                  h('span', null, archiveMsg.text))
              : null,
          ),
          h('div', { style: { padding: '12px 16px', borderTop: '1px solid ' + T.border, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 } },
            h('button', {
              type: 'button', className: 'pa-railback', onClick: () => setArchiveOpen(false),
              disabled: archiveBusy, style: { margin: 0, flex: 'none' },
            }, tr('archCancelBtn')),
            h('button', {
              type: 'button', className: 'pa-btn', onClick: submitArchive, disabled: archiveBusy,
              style: {
                borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                opacity: archiveBusy ? 0.6 : 1, cursor: archiveBusy ? 'wait' : 'pointer',
              },
            }, archiveBusy ? tr('archBusy') : tr('archConfirmBtn')),
          ),
        ),
      );

      /* ════════ v1.4.2 编辑记录对话框（遮罩 + 居中卡片；Esc 语义同归档框：遮罩/取消可关） ════════ */
      const renderEditModal = () => {
        const rec = editRecord;
        if (!rec) return null;
        const resultLocked = rec.status === 'parsing'; // 解析进行中：正文仍在被服务端流式写入，锁定编辑
        return h('div', {
          role: 'dialog', 'aria-modal': true,
          onClick: (e) => { if (e.target === e.currentTarget && !editBusy) setEditRecord(null); },
          style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            background: 'rgba(15,23,42,.45)',
          },
        },
          h('div', {
            style: {
              width: 560, maxWidth: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
              background: T.surface, border: '1px solid ' + T.border, borderRadius: 14,
              boxShadow: '0 24px 64px rgba(15,23,42,.35)',
            },
          },
            h('div', { style: { padding: '14px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 } },
              h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text1 } }, tr('editModalTitle')),
              h('button', {
                type: 'button', className: 'pa-ghostbtn', onClick: () => { if (!editBusy) setEditRecord(null); },
                'aria-label': tr('archCancelBtn'), style: { fontSize: 16, lineHeight: 1, padding: '2px 6px' },
              }, '×'),
            ),
            h('div', { className: 'pa-scroll', style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' } },
              rec.__loading
                ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: T.text3, fontSize: 11.5 } },
                    h('span', { className: 'pa-spinner' }), tr('recDrawerLoading'))
                : null,
              rec.__loadError
                ? h('div', {
                    style: {
                      background: TINTS.rose.bg, border: '1px solid ' + TINTS.rose.border, borderRadius: 8,
                      padding: 8, color: TINTS.rose.title, fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all',
                    },
                  }, tr('editLoadFail') + rec.__loadError)
                : null,
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
                h('span', null, tr('archNameLabel')),
                h('input', {
                  type: 'text', value: editTitle, placeholder: tr('archNameLabel'),
                  onChange: (e) => setEditTitle(e.target.value),
                  className: 'pa-input',
                  style: { borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: T.text1 },
                }),
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
                h('span', null, tr('editFileLabel')),
                h('input', {
                  type: 'text', value: editFileName, placeholder: tr('editFileLabel'),
                  onChange: (e) => setEditFileName(e.target.value),
                  className: 'pa-input',
                  style: { borderRadius: 8, padding: '8px 10px', fontSize: 12, color: T.text1 },
                }),
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
                h('span', null, tr('archRemarkLabel')),
                h('textarea', {
                  value: editRemark, placeholder: tr('archRemarkPlaceholder'), rows: 2,
                  onChange: (e) => setEditRemark(e.target.value),
                  className: 'pa-input',
                  style: { borderRadius: 8, padding: '8px 10px', fontSize: 12, color: T.text1, resize: 'vertical', minHeight: 48, lineHeight: 1.6 },
                }),
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: T.text3 } },
                h('span', null, tr('editResultLabel')),
                resultLocked
                  ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, color: T.text3 } },
                      Icon({ d: ICONS.warning, size: 12, color: T.warnIcon }), tr('editResultParsingHint'))
                  : null,
                h('textarea', {
                  value: editResult, rows: 10, disabled: resultLocked || rec.__loading,
                  onChange: (e) => { editResultTouchedRef.current = true; setEditResult(e.target.value); },
                  className: 'pa-input',
                  style: {
                    borderRadius: 8, padding: '8px 10px', color: T.text1, resize: 'vertical', minHeight: 180,
                    fontSize: 11.5, lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    opacity: resultLocked || rec.__loading ? 0.6 : 1,
                  },
                }),
              ),
              editMsg
                ? h('div', {
                    style: {
                      display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.5,
                      padding: 8, borderRadius: 8, color: editMsg.kind === 'error' ? T.warnText : T.text3,
                      background: editMsg.kind === 'error' ? T.warnBg : T.surface2,
                      border: '1px solid ' + (editMsg.kind === 'error' ? T.warnBorder : T.borderSub),
                      wordBreak: 'break-all',
                    },
                  },
                    Icon({ d: editMsg.kind === 'error' ? ICONS.warning : ICONS.check, size: 13, color: editMsg.kind === 'error' ? T.warnIcon : T.success }),
                    h('span', null, editMsg.text))
                : null,
            ),
            h('div', { style: { padding: '12px 16px', borderTop: '1px solid ' + T.border, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 } },
              h('button', {
                type: 'button', className: 'pa-railback', onClick: () => setEditRecord(null),
                disabled: editBusy, style: { margin: 0, flex: 'none' },
              }, tr('archCancelBtn')),
              h('button', {
                type: 'button', className: 'pa-btn', onClick: submitRecordEdit, disabled: editBusy || rec.__loading,
                style: {
                  borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                  opacity: editBusy || rec.__loading ? 0.6 : 1, cursor: editBusy ? 'wait' : 'pointer',
                },
              }, editBusy ? tr('editBusy') : tr('editConfirmBtn')),
            ),
          ),
        );
      };

      /* ════════ 视图3「智能问答」（v1.3.1） ════════ */
      const activeQaSession = qaSessions.find((s) => s.id === qaActiveId) || null;
      const qaHeaderTitle = activeQaSession && activeQaSession.title ? activeQaSession.title : tr('qaNewSession');
      const qaBackendUnknown=['running','paused','unknown'].includes(qaBackgroundState);
      const qaArchiveDisabled = qaBackendUnknown || !qaActiveId || qaMessages.length === 0 || qaSendBusy || qaArchiving;

      /* 二级目录会话项（v1.3.1）：缩进小号（标题+时间），悬停两段式删除，当前会话高亮；
       * 点击 = 切到智能问答并激活该会话（GET /qa/sessions/:id 载入历史） */
      const renderQaSubnavSessionItem = (s) => {
        const active = s.id === qaActiveId;
        const pinned = s.pinned === true;
        const renaming = Boolean(qaRenaming && qaRenaming.id === s.id);
        const menuOpen = Boolean(qaSessionMenu && qaSessionMenu.id === s.id);
        return h('div', {
          key: s.id, role: 'button', tabIndex: 0, className: 'pa-qasession',
          'aria-current': active ? 'true' : undefined,
          onClick: () => { if (renaming) return; setTab('qa'); void openQaSession(s); },
          onKeyDown: (e) => { if (renaming) return; if (e.key === 'Enter' || e.key === ' ') { setTab('qa'); void openQaSession(s); } },
          style: {
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
            background: active ? T.accentSoft : 'transparent',
            border: '1px solid ' + (active ? T.accent : 'transparent'),
            transition: 'background-color .15s, border-color .15s',
          },
        },
          h('div', { style: { flex: 1, minWidth: 0 } },
            renaming
              ? h('input', {
                  autoFocus: true, className: 'pa-qareninput', value: qaRenaming.value,
                  'aria-label': tr('qaRenameSession'),
                  onClick: (e) => e.stopPropagation(),
                  onChange: (e) => setQaRenaming({ id: s.id, value: e.target.value }),
                  onKeyDown: (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); void commitQaRename(s.id, qaRenaming.value); }
                    if (e.key === 'Escape') { e.preventDefault(); setQaRenaming(null); }
                  },
                  onBlur: () => void commitQaRename(s.id, qaRenaming.value),
                })
              : h('div', {
                  title: s.title || tr('qaNewSession'),
                  style: {
                    fontSize: 11, fontWeight: active ? 600 : 500, color: active ? T.accentStrong : T.text1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4,
                  },
                }, (pinned ? '📌 ' : '') + (s.title || tr('qaNewSession'))),
            h('div', { style: { fontSize: 9.5, color: T.text3, lineHeight: 1.4 } },
              fmtQaTime(s.lastActiveAt) + ' · ' + tr('qaMsgCount', { n: Number(s.messageCount) || 0 })),
          ),
          h('button', {
            type: 'button',
            className: 'pa-qamore',
            title: tr('qaMoreActions'),
            'aria-label': tr('qaMoreActions'),
            'aria-haspopup': 'menu',
            'aria-expanded': menuOpen ? 'true' : 'false',
            onClick: (e) => {
              e.stopPropagation();
              setQaSessionMenu(menuOpen ? null : { id: s.id, anchor: e.currentTarget });
            },
          }, '⋯'),
          menuOpen ? h('div', {
            ref: qaSessionMenuRef, className: 'pa-qasessionmenu', role: 'menu', style: qaMenuStyle(qaSessionMenu.anchor),
            onClick: (e) => e.stopPropagation(),
          },
            h('button', { type: 'button', role: 'menuitem', onClick: () => void toggleQaPin(s) },
              Icon({ d: ICONS.pin, size: 12 }), h('span', null, pinned ? tr('qaUnpinSession') : tr('qaPinSession'))),
            h('button', { type: 'button', role: 'menuitem',
              onClick: () => { setQaRenaming({ id: s.id, value: s.title || '' }); setQaSessionMenu(null); } },
              Icon({ d: ICONS.edit, size: 12 }), h('span', null, tr('qaRenameSession'))),
            h('button', { type: 'button', role: 'menuitem', onClick: () => void toggleQaArchive(s) },
              Icon({ d: ICONS.archive, size: 12 }), h('span', null, s.archived === true ? tr('qaUnarchiveSession') : tr('qaArchiveSession'))),
            h('button', { type: 'button', role: 'menuitem', className: 'danger',
              onClick: () => {
                setQaSessionMenu(null);
                if (window.confirm('确认删除会话「' + (s.title || '未命名会话') + '」？\n删除后不可恢复。')) void deleteQaSession(s);
              } },
              Icon({ d: ICONS.trash, size: 12 }), h('span', null, tr('qaDeleteSession'))),
          ) : null,
        );
      };

      /* 智能问答二级目录（v1.3.1，挂左侧导航「智能问答」项下）：qa 激活时展开（display 切换，
       * 常挂载不卸载）；＋新建会话（缩进小号）+ 历史会话列表（超高分区内滚，max-height 约 40vh）。
       * 列表数据来自 qaSessions（qa 激活时或 turn_end 后拉取）。 */
      const renderQaSubnav = () => h('div', {
        className: 'pa-qa-subnav',
        style: {
          display: tab === 'qa' ? 'flex' : 'none',
          flexDirection: 'column', gap: 4, marginTop: 2, marginLeft: 12,
          paddingLeft: 8, borderLeft: '2px solid ' + T.borderSub,
          maxHeight: '40vh', overflow: 'hidden', flexShrink: 0, minHeight: 0,
        },
      },
        // ＋ 新建会话（二级样式：缩进、小号、左对齐）
        h('button', {
          type: 'button', className: 'pa-btn', onClick: newQaSession, disabled: qaSendBusy,
          style: {
            borderRadius: 8, padding: '6px 8px', fontSize: 11.5, fontWeight: 600, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 5,
            opacity: qaSendBusy ? 0.6 : 1, cursor: qaSendBusy ? 'wait' : 'pointer',
          },
        }, '＋ ', h('span', null, tr('qaNewBtn'))),
        // 历史会话小标题（数量）+ 刷新
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '4px 2px 0', flexShrink: 0 } },
          h('span', { style: { fontSize: 10, color: T.text3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            tr('qaSessionsTitle') + (qaSessions.length ? ' · ' + tr('qaSessionCount', { n: qaSessions.length }) : '')),
          h('button', {
            type: 'button', className: 'pa-ghostbtn', onClick: () => void loadQaSessions(),
            disabled: qaSessionsLoading, title: tr('qaReloadBtn'), 'aria-label': tr('qaReloadBtn'),
            style: { fontSize: 10, padding: '1px 4px', flexShrink: 0 },
          }, Icon({ d: ICONS.refresh, size: 11 })),
        ),
        // 会话列表（超出 max-height 分区内滚）；paHist-20261019：历史 / 归档两个视图切换
        h('div', { className: 'pa-scroll', style: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' } },
          (() => {
            const visible = qaSessions.filter((s) => (s.archived === true) === qaShowArchived);
            if (visible.length === 0) {
              return h('div', { style: { fontSize: 10.5, color: T.text3, padding: '6px 2px', lineHeight: 1.5 } },
                qaSessionsLoading ? tr('recLoading') : (qaShowArchived ? tr('qaArchivedEmpty') : tr('qaSessionsEmpty')));
            }
            return visible.map(renderQaSubnavSessionItem);
          })(),
        ),
        // 归档会话入口 / 返回历史（与知识库插件「归档对话」一致）
        h('button', {
          type: 'button', className: 'pa-archtoggle',
          onClick: () => { setQaShowArchived((v) => !v); setQaSessionMenu(null); setQaRenaming(null); },
          'aria-pressed': qaShowArchived ? 'true' : 'false',
        }, qaShowArchived
          ? '← ' + tr('qaBackHistory')
          : tr('qaArchivedTitle') + (qaSessions.filter((s) => s.archived === true).length
              ? ' · ' + qaSessions.filter((s) => s.archived === true).length : '')),
      );

      /* 消息气泡：用户右（附件 chip 展示名称）/ 助手左（pre-wrap；流式无增量时「思考中…」闪烁占位）
       * paQaTs-20261005：每条消息带时间戳——用户气泡下右对齐；助手气泡底部信息行（已完成时时间在左、
       * 「复制回答 / 待人工复核」在右，流式中与失败时仅右对齐显示时间）。 */
      const renderQaMsgItem = (m) => {
        const stamp = fmtQaMsgTime(m.ts);
        if (m.role === 'user') {
          return h('div', { key: m.id, style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } },
            h('div', {
              style: { minWidth: 0, maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
            },
              h('div', {
                style: {
                  maxWidth: '100%', background: T.userBubble, color: T.text1,
                  borderRadius: '14px 14px 4px 14px', padding: '10px 14px',
                  fontSize: T.contentFont, lineHeight: 1.7, wordBreak: 'break-word',
                  display: 'flex', flexDirection: 'column', gap: 6,
                },
              },
                m.files && m.files.length
                  ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                      m.files.map((f, i) => h('span', {
                        key: i,
                        style: {
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5,
                          background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.28)',
                          borderRadius: 6, padding: '2px 6px',
                        },
                      },
                        Icon({ d: ICONS.doc, size: 11 }),
                        h('span', null, f.name || f.path || '—'),
                      )),
                    )
                  : null,
                h('div', { style: { whiteSpace: 'pre-wrap' } }, m.text),
              ),
              stamp
                ? h('div', { style: { display: 'flex', alignItems: 'baseline' } },
                    qaTsNodes(m.ts, { fontSize: 10, lineHeight: 1.4, color: T.text3, paddingRight: 4 }))
                : null,
            ),
            h(Avatar, { bg: T.avatarMe, color: T.avatarMeText, text: tr('avatarMe') }),
          );
        }
        const settled = m.state === 'done' && !!m.text;
        return h('div', { key: m.id, style: { display: 'flex', gap: 10, justifyContent: 'flex-start' } },
          h(Avatar, { bg: T.accentStrong, color: T.accentInk, text: tr('avatarAgent') }),
          h('div', {
            style: {
              maxWidth: '86%', background: T.surface, border: '1px solid ' + T.border,
              borderRadius: '4px 14px 14px 14px', padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
            },
          },
            m.tools && m.tools.length
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  m.tools.map((t2, i) => h('span', {
                    key: i,
                    style: {
                      fontSize: 10, padding: '2px 8px', borderRadius: 999,
                      border: '1px solid ' + T.border, color: T.text3, background: T.surface2,
                    },
                  }, '🔧 ' + t2)),
                )
              : null,
            m.state === 'streaming' && !m.text
              ? h('div', { className: 'pa-qablink', style: { fontSize: 12, color: T.text3 } }, tr('qaThinkingPlaceholder'))
              : h('pre', {
                  style: {
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text',
                    fontSize: T.contentFont, lineHeight: 1.7, color: T.text1, fontFamily: 'inherit',
                  },
                }, (m.text || '') + (m.state === 'streaming' ? ' ▍' : '')),
            m.error
              ? h('div', { style: { fontSize: 11, color: T.warnText, wordBreak: 'break-all' } }, tr('qaStreamError') + m.error)
              : null,
            (stamp || settled)
              ? h('div', {
                  className: 'pa-msg-meta',
                  style: Object.assign({
                    display: 'flex', alignItems: 'center', gap: 8,
                    justifyContent: (settled && stamp) ? 'space-between' : 'flex-end',
                  }, settled ? { borderTop: '1px dashed ' + T.border, paddingTop: 6 } : null),
                },
                  (settled && stamp)
                    ? qaTsNodes(m.ts, { fontSize: 10, color: T.text3 })
                    : null,
                  settled
                    ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                        h('button', {
                          type: 'button', className: 'pa-ghostbtn', onClick: () => copyQaAnswer(m),
                          style: { fontSize: 10.5, padding: '2px 6px' },
                        }, tr('qaCopyAnswer')),
                        h('span', { style: { fontSize: 10, color: T.text3 } }, tr('askPendingReview')),
                      )
                    : qaTsNodes(m.ts, { fontSize: 10, color: T.text3 }),
                )
              : null,
          ),
        );
      };


      /* 视图布局（v1.3.1）：纯会话框——会话管理已上收至左侧导航二级目录，此处仅全宽聊天列 */
      const renderQaTab = () => h('div', {
        onDragEnter, onDragOver, onDragLeave, onDrop: onQaDrop,
        style: { flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden', background: T.bgRoot, position: 'relative' },
      },
        // 聊天列（全宽）
        h('main', {
          style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
        },
          // 拖拽悬停高亮遮罩（整列可拖入文件）
          renderDropOverlay(),
          // 列头：会话标题 + 消息数 + 一键归档
          h('div', {
            style: {
              flexShrink: 0, background: T.surface, borderBottom: '1px solid ' + T.border,
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            },
          },
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 } },
              h('span', {
                title: qaHeaderTitle,
                style: { fontSize: 13, fontWeight: 700, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
              }, qaHeaderTitle),
              h('span', { style: { fontSize: 11, color: T.text3, flexShrink: 0 } }, tr('qaMsgCount', { n: qaMessages.length })),
            ),
            h('button', {
              type: 'button', className: 'pa-btn', onClick: archiveQaSession, disabled: qaArchiveDisabled,
              title: tr('qaArchiveBtn'),
              style: {
                borderRadius: 8, padding: '6px 14px', fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                opacity: qaArchiveDisabled ? 0.55 : 1, cursor: qaArchiveDisabled ? 'not-allowed' : 'pointer',
              },
            }, qaArchiving ? tr('qaArchiving') : tr('qaArchiveBtn')),
          ),
          // 轻量提示（toast：归档结果/删除结果/门禁/文件带入等）
          qaMsg
            ? h('div', {
                style: {
                  flexShrink: 0, background: T.surface, borderBottom: '1px solid ' + T.border,
                  padding: '6px 16px', fontSize: 11, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6,
                  color: qaMsg.kind === 'error' ? T.warnText : qaMsg.kind === 'ok' ? T.successText : T.text3,
                  wordBreak: 'break-all',
                },
              },
                Icon({ d: qaMsg.kind === 'error' ? ICONS.warning : ICONS.check, size: 12, color: qaMsg.kind === 'error' ? T.warnIcon : T.success }),
                h('span', null, qaMsg.text))
            : null,
          // 消息列表（自动滚底仅在用户未上滚时生效）
          h('div', {
            ref: qaFlowRef, className: 'pa-scroll', onScroll: onQaFlowScroll,
            style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
          },
            qaMessages.length === 0
              ? h('div', {
                  style: { margin: 'auto', textAlign: 'center', color: T.text3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 420 },
                },
                  Icon({ d: ICONS.chat, size: 40, sw: 1.5, color: T.text3 }),
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: T.text2 } }, tr('qaEmptyTitle')),
                  h('div', { style: { fontSize: T.contentFont, lineHeight: 1.7 } }, tr('qaEmptyHint')),
                )
              : qaMessages.map(renderQaMsgItem),
          ),
          // 输入区（门禁条 + 上传错误 + 待附文件 chips + 输入行）
          h('div', { style: { flexShrink: 0, background: T.surface, borderTop: '1px solid ' + T.border, padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 } },
            // 公开性门禁条（未确认时显示；复用共享 publicConfirmed）
            !publicConfirmed
              ? h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11.5 } },
                  h('input', {
                    type: 'checkbox', checked: publicConfirmed,
                    onChange: (e) => setPublicConfirmed(e.target.checked),
                    style: { width: 15, height: 15, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 },
                  }),
                  h('span', { style: { color: T.warnText, fontWeight: 500 } }, tr('parseGateCheck')),
                )
              : null,
            uploadMsg
              ? h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, lineHeight: 1.5, color: T.warnText, wordBreak: 'break-all' } },
                  Icon({ d: ICONS.warning, size: 12, color: T.warnIcon }),
                  h('span', null, uploadMsg.text))
              : null,
            qaFiles.length
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
                  h('span', { style: { fontSize: 10.5, color: T.text3, flexShrink: 0 } }, tr('qaAttachLabel')),
                  qaFiles.map((f) => h('span', {
                    key: f.key, title: f.path,
                    style: {
                      display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%',
                      background: T.accentSoft, border: '1px solid ' + T.accentSoftBorder,
                      borderRadius: 8, padding: '4px 8px', fontSize: 11,
                    },
                  },
                    Icon({ d: ICONS.doc, size: 12, color: T.accent }),
                    h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, fontWeight: 500, color: T.text2 } }, f.name),
                    f.fromRecord
                      ? h('span', { style: { fontSize: 9, color: T.accent, border: '1px solid ' + T.accentSoftBorder, borderRadius: 4, padding: '0 4px', flexShrink: 0 } }, tr('qaFromRecord'))
                      : null,
                    h('button', {
                      type: 'button', className: 'pa-chipx', title: tr('removeFile'), 'aria-label': tr('removeFile'),
                      onClick: () => removeQaFile(f.key),
                    }, '×'),
                  )),
                )
              : null,
            // v1.4.0 模型选择行：与 DSH「设置-模型」同源的可选模型；未选=系统默认
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 11, color: T.text3, flexShrink: 0, fontWeight: 600 } }, tr('qaModelLabel')),
              qaModels.state === 'ready'
                ? h('select', {
                    value: qaModel ? (qaModel.provider + '\u0001' + qaModel.model) : '',
                    onChange: (e) => {
                      const v = String(e.target.value || '');
                      const sep = v.indexOf('\u0001');
                      if (!v || sep < 0) { setQaModel(null); return; }
                      setQaModel({ provider: v.slice(0, sep), model: v.slice(sep + 1) });
                    },
                    disabled: qaSendBusy,
                    className: 'pa-input',
                    title: tr('qaModelSwitchNote'),
                    'aria-label': tr('qaModelLabel'),
                    style: { maxWidth: 320, borderRadius: 8, padding: '5px 8px', fontSize: 11.5, color: T.text1 },
                  },
                    h('option', { value: '' }, tr('qaModelDefaultOption')),
                    qaModels.groups.map((g) => h('optgroup', { key: g.id, label: g.name },
                      g.models.map((m) => {
                        const val = g.id + '\u0001' + m.id;
                        const isDef = qaModels.def && qaModels.def.provider === g.id && qaModels.def.model === m.id;
                        return h('option', { key: val, value: val }, m.name + (isDef ? tr('qaModelDefaultSuffix') : ''));
                      }),
                    )),
                  )
                : h('span', { style: { fontSize: 11, color: T.text3 } },
                    qaModels.state === 'loading' ? tr('qaModelLoading') : tr('qaModelFail')),
              qaModels.state === 'fail'
                ? h('button', {
                    type: 'button', className: 'pa-ghostbtn', onClick: () => void loadQaModels(),
                    style: { fontSize: 10, padding: '2px 8px' },
                  }, tr('qaModelRetry'))
                : null,
              h('span', {
                title: tr('qaModelSwitchNote'),
                style: { fontSize: 10, color: T.text3, marginLeft: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
              }, tr('qaModelSwitchNote')),
            ),
            h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 8 } },
              h('button', {
                type: 'button', className: 'pa-uploadbtn', onClick: () => pickFiles('qa'), disabled: uploadBusy,
                title: uploadBusy ? tr('uploading') : tr('uploadBtnTitle'),
                'aria-label': tr('uploadBtn'),
              }, Icon({ d: ICONS.clip, size: 16 })),
              h('textarea', {
                ref: qaInputRef, value: qaInput, rows: 2, placeholder: tr('qaInputPlaceholder'),
                onChange: (e) => setQaInput(e.target.value),
                onKeyDown: (e) => {
                  // Enter 发送 / Shift+Enter 换行；输入法组词期间回车不发送
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void sendQa();
                  }
                },
                className: 'pa-input',
                style: { flex: 1, minWidth: 0, borderRadius: 12, padding: '9px 14px', fontSize: 12.5, color: T.text1, resize: 'none', lineHeight: 1.6 },
              }),
              h('button', {
                type: 'button', className: 'pa-btn', onClick: sendQa, disabled: qaSendBusy || !publicConfirmed || uploadBusy,
                style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                  borderRadius: 12, fontSize: 12, fontWeight: 600, flexShrink: 0,
                  opacity: qaSendBusy ? 0.6 : 1, cursor: qaSendBusy ? 'wait' : 'pointer',
                },
              },
                h('span', null, qaSendBusy ? tr('qaSendBtnBusy') : tr('qaSendBtn')),
                qaSendBusy ? null : Icon({ d: ICONS.arrow, size: 14 }),
              ),
              h('button', {
                type: 'button', className: 'pa-ghostbtn', onClick: clearQaInput, disabled: qaSendBusy,
                title: tr('qaClearBtn'),
                style: { fontSize: 11, padding: '6px 8px', flexShrink: 0 },
              }, tr('qaClearBtn')),
            ),
            h('div', { style: { fontSize: 10, color: T.text3, lineHeight: 1.5 } },
              tr('formatHint') + ' · ' + tr('uploadNote')),
          ),
        ),
      );


      /* paQaTsNarrow-20261005：窄屏时间戳紧凑形态（≤860px 只显示 HH:mm，与输入区布局同一断点） */
      const PA_QATS_CSS='.pa-root .pa-msg-tsn{display:none}@media(max-width:860px){.pa-root .pa-msg-ts{display:none}.pa-root .pa-msg-tsn{display:inline}}';
      const PA_QALAYOUT_CSS='/* ===== 智能问答输入区布局（PA-QALAYOUT-20261005）：底边贴底 + 上边可拖拽拉高 + 模型选择贴发送按钮左侧 ===== */.pa-root .pa-qa-page{display:flex;flex-direction:column;overflow:hidden;padding:22px 30px 18px}.pa-root .pa-qa-page .pa-qa-grid{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:0}.pa-root .pa-qa-page .pa-chat-card{flex:1 1 auto;min-height:0}.pa-root .pa-qa-page .pa-chat-card>div:last-child{min-height:0}.pa-root .pa-qa-page .pa-chat-scroll{flex:1 1 auto;min-height:110px;max-height:none;overflow-y:auto}.pa-root .pa-qa-page .pa-chat-input{flex:0 0 auto;margin-top:auto;position:relative;padding:0 14px 10px}.pa-root .pa-qa-page .pa-chat-input .pa-qa-tools{padding:9px 0}.pa-root .pa-qa-page .pa-resize-grip{position:relative;height:14px;margin:2px 0 -2px;display:flex;align-items:center;justify-content:center;cursor:row-resize;touch-action:none;user-select:none;border-radius:8px}.pa-root .pa-qa-page .pa-resize-grip>span{display:block;width:46px;height:4px;border-radius:999px;background:#dbe2ec;transition:background .15s ease,width .15s ease}.pa-root .pa-qa-page .pa-resize-grip:hover>span,.pa-root .pa-qa-page .pa-resize-grip.pa-active>span{background:var(--pa-accent,#2563eb);width:64px}.pa-root .pa-qa-page .pa-resize-grip:focus-visible{outline:2px solid var(--pa-accent,#2563eb);outline-offset:2px}.pa-root .pa-qa-page .pa-chat-compose{height:var(--pa-compose-h,104px);min-height:96px;display:flex;flex-direction:column;align-items:stretch;overflow:hidden}.pa-root .pa-qa-page .pa-chat-compose textarea.pa-input{flex:1 1 auto;min-height:0;overflow-y:auto;resize:none}.pa-root .pa-qa-page .pa-chat-compose .pa-compose-bar{flex:0 0 auto}.pa-root .pa-qa-page .pa-chat-compose.pa-resizing{box-shadow:0 0 0 1px var(--pa-accent,#2563eb),0 8px 22px rgba(21,42,76,.10)}.pa-root .pa-qa-page .pa-compose-bar .pa-bar-gap{flex:1 1 auto;min-width:8px}.pa-root .pa-qa-page .pa-compose-bar .pa-model{margin-left:0}.pa-root .pa-qa-page .pa-compose-bar .pa-model>summary{max-width:200px}.pa-root .pa-qa-page .pa-chat-input>.pa-muted{margin:6px 0 0;font-size:10px;line-height:1.55}@media(max-width:860px){.pa-root .pa-qa-page{padding:16px 16px 12px}.pa-root .pa-qa-page .pa-compose-bar .pa-model>summary{max-width:120px}}@media(max-height:620px){.pa-root .pa-qa-page .pa-chat-scroll{min-height:80px}}'; /* PA-QALAYOUT-20261005 */
      const PA_COMPOSER_CSS='/* ===== 知识库同款输入区（PA-COMPOSER-20261005）：圆角卡片 + 无边框输入区 + 工具条圆钮 + 圆形发送 ===== */.pa-root .pa-chat-compose{display:block;position:relative;background:#fff;border-radius:22px;box-shadow:0 0 0 .5px #e6eaf1,0 6px 18px rgba(21,42,76,.05);padding:2px 0 0;margin-top:2px;transition:box-shadow .15s ease}.pa-root .pa-chat-compose:hover{box-shadow:0 0 0 .5px #dfe5ee,0 8px 22px rgba(21,42,76,.07)}.pa-root .pa-chat-compose textarea.pa-input{display:block;width:100%;border:0;background:transparent;border-radius:0;font-size:14px;line-height:24px;padding:6px 14px 0 14px;min-height:54px;resize:none;box-shadow:none!important}.pa-root .pa-chat-compose textarea.pa-input:focus,.pa-root .pa-chat-compose textarea.pa-input:focus-visible{outline:none!important;box-shadow:none!important;border:0}.pa-root .pa-compose-bar{display:flex;align-items:center;gap:8px;padding:2px 10px 8px 12px}.pa-root .pa-compose-bar .pa-bar-gap{flex:1}.pa-root .pa-chat-compose .pa-compose-btn{width:28px;height:28px;min-width:28px;padding:0;border:0;border-radius:999px;background:transparent;color:#5f6b7e;font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.pa-root .pa-chat-compose .pa-compose-btn:hover:not(:disabled){background:#eef2f8;color:#2a3342}.pa-root .pa-compose-bar .pa-model{flex:0 1 auto;min-width:0}.pa-root .pa-compose-bar .pa-model>summary{height:28px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:#5f6b7e;font-size:12px;cursor:pointer;list-style:none;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pa-root .pa-compose-bar .pa-model>summary:hover{background:#eef2f8;color:#2a3342}.pa-root .pa-compose-bar .pa-model>summary::-webkit-details-marker{display:none}.pa-root .pa-chat-compose .pa-compose-send{width:34px;height:34px;min-width:34px;padding:0;border:0;border-radius:999px;background:linear-gradient(135deg,var(--pa-accent,#2563eb),var(--pa-accent-strong,#1d4ed8));color:#fff;font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.pa-root .pa-chat-compose .pa-compose-send:disabled{opacity:.45;cursor:not-allowed}/* 拖拽落点：本插件自己的强调色虚线 + 胶囊提示（形状与知识库一致，配色不抄知识库） */.pa-root .pa-chat-compose.pa-drop{outline:2px dashed var(--pa-accent,#2563eb);outline-offset:2px;background:#f7faff}.pa-root .pa-compose-pill{display:inline-flex;align-items:center;gap:6px;margin:10px 0 0 14px;padding:3px 10px;border-radius:999px;background:var(--pa-accent-soft,#eaf1ff);color:var(--pa-accent-strong,#1d4ed8);font-size:12px;border:1px solid var(--pa-accent-soft-border,#d9e5ff)}'; /* PA-COMPOSER-20261005 */
      const smallButton=(label,onClick,disabled=false)=>h('button',{type:'button',className:'pa-ghostbtn',onClick,disabled},label);
      const moreMenu=(items)=>h('details',{className:'pa-more'},h('summary',{'aria-label':'更多操作'},'⋯'),h('div',{className:'pa-more-menu'},items));
      const taskStateNames={running:'运行中',submitting:'提交中',uncertain:'回执待核实',paused:'接收已暂停',done:'已完成',failed:'失败'};
      const renderModelPicker=(kind)=>{
        const selected=kind==='parse'?parseModel:qaModel;
        const setSelected=kind==='parse'?setParseModel:setQaModel;
        const busy=parseBusy||qaSendBusy;
        return h('details',{className:'pa-model'},h('summary',null,selected?selected.model:'跟随系统默认',' ▴'),h('div',{className:'pa-model-menu'},
          h('div',{className:'pa-menu-title'},'选择模型 · 仅本任务'),
          smallButton('跟随系统默认',()=>setSelected(null),busy),
          qaModels.state==='ready'?qaModels.groups.map(g=>h('section',{key:g.id},h('div',{className:'pa-menu-title'},g.name),g.models.map(m=>h('button',{key:g.id+'/'+m.id,type:'button',disabled:busy,onClick:e=>{setSelected({provider:g.id,model:m.id});const d=e.currentTarget.closest('details');if(d)d.open=false;}},m.name)))):h('p',null,qaModels.state==='loading'?'模型加载中':'模型目录不可用，不展示虚假列表'),
          smallButton('刷新目录',()=>void loadQaModels(),busy)));
      };
      const renderPrototypeHeader=()=>
        h('header',{className:'pa-proto-top'},h('button',{className:'pa-module-menu',type:'button','aria-label':'打开政策模块导航',onClick:()=>setModuleNavOpen(v=>!v)},'☰'),h('div',null,h('div',{className:'pa-kicker'},'Policy Interpreter'),h('h1',null,'政策解读'),h('p',null,'上传公开政策文件，获取结构化解读与可追溯引用。')),
          h('div',{className:'pa-top-pills'},h('span',null,packHealth===null?'运行环境 · 未检测':packHealth.ok?'本机环境 · 已连接':'运行环境 · 不可用'),h('span',{className:'pa-warn-pill'},'公开材料门禁前置')));
      const renderPrototypeParse=()=>h('section',{className:'pa-proto-page',onDragEnter,onDragOver,onDragLeave,onDrop},
        renderDropOverlay(),h('div',{className:'pa-parse-grid'},
          h('div',{className:'pa-parse-left'},
            /* PA-GATEHINT-20261019：公开性确认不再作为独立步骤卡列出，只保留一行提示（无勾选框）。 */
            h('div',{className:'pa-gatehint',role:'note','aria-label':'公开性提示',style:{display:'flex',alignItems:'flex-start',gap:7,padding:'9px 13px',borderRadius:12,background:'#fff8e8',border:'1px solid #f4e1b8',color:'#a16b13',fontSize:11.5,lineHeight:1.6}},
              h('span',{'aria-hidden':'true',style:{flexShrink:0,fontWeight:700}},'提示'),
              h('span',null,'本系统仅处理已完全公开的政策材料：不得上传内部、涉密或尚未公开信息，上传不等于授权。')),
            h('article',{className:'pa-step'},h('h3',null,h('b',null,'1'),'上传政策文件'),h('button',{type:'button',className:'pa-dropbox',disabled:uploadBusy||parseBusy,onClick:()=>pickFiles()},h('strong',null,uploadBusy?'上传中…':'点击选择或拖拽文件到这里'),h('span',null,'支持 PDF / DOCX / XLSX，单文件不超过 30MB')),
              h('div',{className:'pa-file-chips'},files.map(f=>{
                const t=fileTasks[f.key]||{};
                return h('div',{key:f.key,className:'pa-file-chip'+(f.key===activeFileKey?' active':'' )},h('button',{type:'button',disabled:parseBusy,onClick:()=>selectParseFile(f)},f.name,' · ',taskStateNames[t.status]||'待解析'),
                  smallButton('×',()=>removeFile(f.key),parseBusy||!!(t.jobId&&!['done','failed'].includes(t.status))),
                  moreMenu([smallButton('源文件预览',()=>setPreviewFile({name:f.name,path:f.path})),smallButton('复制真实路径',()=>copyFilePath(f))]));
              })),uploadMsg?h('p',{role:'status',className:'pa-error'},uploadMsg.text):null),
            h('article',{className:'pa-step'},h('h3',null,h('b',null,'2'),'解析配置'),h('div',{className:'pa-config-grid'},h('label',null,'解读模型',renderModelPicker('parse')),h('label',null,'解读深度',h('select',{className:'pa-input',value:parseDepth,disabled:parseBusy,onChange:e=>setParseDepth(e.target.value)},h('option',{value:'standard'},'标准解读'),h('option',{value:'quick'},'快速摘要'),h('option',{value:'deep'},'深度研读')))),
              h('button',{type:'button',className:'pa-btn pa-start',disabled:parseBusy||uploadBusy||!files.length,onClick:()=>void startParse()},parseBusy?'解析中…':'开始解析'),parseBusy?smallButton('停止接收（后台继续）',stopParse):null,
              files.some(f=>fileTasks[f.key]&&fileTasks[f.key].status==='paused')?h('p',null,'点击开始恢复原任务，不重复提交'):null,renderParseMsg(),smallButton('来源 / 角色 / 模式配置',()=>setConfigOpen(true),parseBusy||qaSendBusy))),
          h('div',{className:'pa-parse-right'},
            h('article',{className:'pa-result-card'},h('div',{className:'pa-card-head'},h('h3',null,'解析结果'),h('span',{className:'pa-status'},parseResultState==='streaming'?'RUNNING':parseResultState==='done'?'DONE':parseResultState==='error'?'FAILED':parseResultState==='paused'?'PAUSED':'IDLE'),
              moreMenu([smallButton('完整报告 / 原文',()=>setFullReportOpen(true),!parseResult),smallButton('复制',copyParseResult,!parseResult),smallButton('下载 Word',downloadParseDocx,!parseResult||parseDocxBusy),smallButton('编辑 / 备注',()=>openRecordEdit(parseRecord),!parseRecord),smallButton('手工归档',openArchive,!parseRecord||parseResultState!=='done'),smallButton('@文件问答',()=>jumpToFileQa(parseRecord),!parseRecord),smallButton('来源预览',()=>setPreviewFile({name:parseRecord.fileName,path:parseRecord.filePath}),!parseRecord||!parseRecord.filePath),smallButton('重试选中文件',()=>{if(activeFile){updateFileTask(activeFile.key,{status:'pending',jobId:null,recordId:null});void startParse();}},!activeFile||parseBusy||!!(activeFile&&fileTasks[activeFile.key]&&!['done','failed'].includes(fileTasks[activeFile.key].status)))])),
              parseRecord&&parseRecord.structureVersion===1?h('div',{className:'pa-structured'},h('h4',null,parseRecord.title),h('p',null,parseRecord.summary),h('ol',null,parseRecord.points.map((p,i)=>h('li',{key:i},h('span',null,p.text),(p.references||[]).map((r,j)=>h('blockquote',{key:j,title:r.filePath},r.quote,' · 待人工复核'))))),h('div',{className:'pa-keywords'},parseRecord.keywords.map((k,i)=>h('span',{key:i},k))),parseRecord.structureWarning?h('p',{className:'pa-warn'},parseRecord.structureWarning):null,h('p',{className:'pa-muted'},'关键词为模型生成；全部结果待人工复核')):
                parseResultState==='streaming'?h('div',{className:'pa-result-empty'},'正在解析，请以真实完成事件为准…'):
                parseResult?h('div',{className:'pa-structured'},h('p',{className:'pa-warn'},(parseRecord&&parseRecord.structureWarning)||'结构化信息暂缺，保留真实报告'),renderMdBlocks(parseResult)):h('div',{className:'pa-result-empty'},'尚未开始解析。上传政策文件后，点击“开始解析”。')),
            h('article',{className:'pa-log-card'},renderParseTerm()))));
      const renderPrototypeRecords=()=>h('section',{className:'pa-proto-page'},h('article',{className:'pa-record-card'},h('div',{className:'pa-card-head'},h('h3',null,'解析归档'),smallButton('刷新',()=>void loadRecords(),recLoading)),
        h('div',{className:'pa-record-filters'},h('input',{className:'pa-input',value:recQ,placeholder:'搜索标题、文件或内容',onChange:e=>setRecQ(e.target.value),onKeyDown:e=>{if(e.key==='Enter')void loadRecords();}}),
          h('label',{className:'pa-range-field'},h('span',{className:'pa-range-label'},'时间段'),
            h('select',{className:'pa-input',value:recRange,'aria-label':'时间段快捷筛选',disabled:recLoading,onChange:e=>applyRecRange(e.target.value)},REC_RANGE_PRESETS.map(([v,t])=>h('option',{key:v,value:v},t)))),
          h('label',{className:'pa-range-field'},h('span',{className:'pa-range-label'},'从'),
            h('input',{type:'date',className:'pa-input',value:recFrom,'aria-label':'起始日期',onChange:e=>editRecFrom(e.target.value)})),
          h('span',{className:'pa-range-label'},'至'),
          h('input',{type:'date',className:'pa-input',value:recTo,'aria-label':'结束日期',onChange:e=>editRecTo(e.target.value)}),
          smallButton('筛选',()=>void loadRecords(),recLoading),smallButton('重置',resetRecFilters),moreMenu([['completed','默认已完成'],['all','全部任务（含失败）'],['archived','仅手工归档']].map(([view,label])=>smallButton(label,()=>{setRecView(view);void loadRecords({view});},recLoading))),h('span',null,'共 '+recordsTotal+' 条；已完成解析记录与手工归档状态分别保留')),
        recMsgLine(),h('div',{className:'pa-table-wrap'},h('table',null,h('thead',null,h('tr',null,['序号','解析日期','解析标题','解析文件名称','备注','操作'].map(x=>h('th',{key:x},x)))),h('tbody',null,records.length?records.map((r,i)=>h('tr',{key:r.id},h('td',null,i+1),h('td',null,fmtDateTime(r.createdAt)),h('td',null,r.title,' ',recStatusBadge(r)),h('td',null,r.fileName),h('td',null,r.remark||'—'),h('td',null,smallButton(pendingDeleteId===r.id?'确认删除？':'删除',()=>requestDelete(r)),moreMenu([smallButton('查看完整报告',()=>openRecordDrawer(r)),smallButton('源文件预览',()=>{setPreviewConfirmed(false);setPendingPreview({name:r.fileName,path:r.filePath});},!r.filePath),smallButton('编辑 / 标题 / 备注',()=>openRecordEdit(r)),smallButton('下载 Word',()=>void downloadRecordDocx(r),r.status!=='done'),smallButton('@文件问答',()=>jumpToFileQa(r)),smallButton('手工归档',async()=>{await openRecordDrawer(r);setParseRecord(r);setArchiveTitle(r.title||'');setArchiveRemark(r.remark||'');setArchiveOpen(true);},r.status!=='done')])))):h('tr',null,h('td',{colSpan:6,className:'pa-record-empty'},recLoading?'加载中…':'没有匹配的归档记录'))))),drawerRecord?renderRecordDrawer():null));
      const renderPrototypeQa=()=>h('section',{className:'pa-proto-page pa-qa-page'},h('div',{className:'pa-qa-grid'},
        h('div',{className:'pa-chat-card',onDragEnter,onDragOver,onDragLeave,onDrop:onQaDrop},
          renderDropOverlay(),
          h('div',{className:'pa-qa-gate'},h('label',null,h('input',{type:'checkbox',checked:publicConfirmed,disabled:qaSendBusy||uploadBusy,onChange:e=>setPublicConfirmed(e.target.checked)}),' 我确认当前问答所用材料全部为已公开政策材料'),smallButton('清空',clearQaInput,qaSendBusy)),
          h('div',{className:'pa-card-head'},h('h3',null,qaHeaderTitle),moreMenu([smallButton('归档本次问答',archiveQaSession,qaArchiveDisabled),smallButton('查询真实任务结果',()=>void recoverQa(),qaSendBusy||!qaPendingRef.current),smallButton('刷新当前会话',()=>{if(qaActiveId)void openQaSession({id:qaActiveId});},qaSendBusy||qaBackendUnknown||!qaActiveId),smallButton('停止接收（不取消后台）',()=>qaSendAbortRef.current&&qaSendAbortRef.current.abort(),!qaSendBusy)])),
          qaMsg?h('div',{className:'pa-inline-status',role:'status'},qaMsg.text):null,
          h('div',{className:'pa-chat-scroll',ref:qaFlowRef,onScroll:onQaFlowScroll},qaMessages.length?qaMessages.map((m,i)=>h('div',{key:m.id},renderQaMsgItem(m),m.role==='assistant'&&m.state!=='streaming'?smallButton('重试问题',()=>{const previous=qaMessages.slice(0,i).reverse().find(x=>x.role==='user');if(previous){setQaInput(previous.text);setQaMsg({kind:'info',text:'已带入原问题；确认材料后发送'});}},qaSendBusy):null)):h('div',{className:'pa-welcome'},'你好，我可以围绕公开政策文件进行结构化解读与问答。请选择文件或直接输入问题。所有结果待人工复核。')),
          h('div',{className:'pa-chat-input'},
            h('div',{className:'pa-qa-tools'},h('span',null,source==='knowledge_only'?'单源检索 · 政策知识库':'单源检索 · 官方网站'),smallButton('配置',()=>setConfigOpen(true),qaSendBusy||parseBusy)), /* PA-COMPOSER-20261005 */
            qaFiles.length?h('div',{className:'pa-file-chips'},qaFiles.map(f=>h('span',{key:f.key,className:'pa-file-chip'},f.name,smallButton('×',()=>removeQaFile(f.key),qaSendBusy)))):null,
            uploadMsg?h('p',{className:'pa-error'},uploadMsg.text):null,
            /* PA-QALAYOUT-20261005：输入区上边拖拽条 —— 底边贴底，上边可人为拉高 / 压低 */
            h('div',{className:'pa-resize-grip'+(qaResizing?' pa-active':''),role:'separator','aria-orientation':'horizontal','aria-label':'拖拽调整输入区高度','aria-valuenow':qaComposeH,
              tabIndex:0,title:'拖拽调整输入区高度（双击恢复默认；聚焦后 ↑/↓ 微调）',
              onPointerDown:startQaComposeResize,
              onDoubleClick:()=>{applyQaComposeH(PA_COMPOSE_H_DEFAULT);persistQaComposeH();},
              onKeyDown:e=>{if(e.key==='ArrowUp'){e.preventDefault();nudgeQaComposeH(16);}else if(e.key==='ArrowDown'){e.preventDefault();nudgeQaComposeH(-16);}else if(e.key==='Home'){e.preventDefault();applyQaComposeH(PA_COMPOSE_H_DEFAULT);persistQaComposeH();}}},
              h('span',{'aria-hidden':true})),
            h('div',{className:'pa-chat-compose'+(dragOver?' pa-drop':'')+(qaResizing?' pa-resizing':''),style:{'--pa-compose-h':qaComposeH+'px'}}, /* PA-COMPOSER-20261005 · PA-QALAYOUT-20261005 */
              dragOver?h('div',null,h('span',{className:'pa-compose-pill'},'松开以添加附件')):null,
              h('textarea',{ref:qaInputRef,className:'pa-input',rows:2,value:qaInput,placeholder:'输入政策问题，Enter发送，Shift+Enter换行',onChange:e=>setQaInput(e.target.value),onKeyDown:e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void sendQa();}}}),
              h('div',{className:'pa-compose-bar'},
                h('button',{type:'button',className:'pa-compose-btn',title:'上传附件（PDF / DOCX / XLSX）','aria-label':'上传附件',disabled:uploadBusy||qaSendBusy,onClick:()=>pickFiles('qa')},'+'),
                h('button',{type:'button',className:'pa-compose-btn',title:'引用政策文件','aria-label':'引用文件',disabled:qaSendBusy,onClick:()=>{setFilePickerOpen(true);void loadRecords();}},'@'),
                h('span',{className:'pa-bar-gap'}),
                renderModelPicker('qa'), /* PA-QALAYOUT-20261005：模型选择紧贴发送按钮左侧 */
                h('button',{type:'button',className:'pa-compose-send',title:'发送','aria-label':'发送',disabled:qaSendBusy||qaBackendUnknown||uploadBusy||!publicConfirmed||!qaInput.trim(),onClick:()=>void sendQa()},qaSendBusy?'…':'➤'))),
            h('p',{className:'pa-muted'},'PDF / DOCX / XLSX ≤30MB · 当前材料公开确认后发送 · 待人工复核')))));
      const closeLocalModal=()=>{setConfigOpen(false);setFilePickerOpen(false);setFullReportOpen(false);setPendingPreview(null);setPreviewConfirmed(false);};
      const modalProps=label=>({className:'pa-local-overlay',role:'dialog','aria-modal':true,'aria-label':label,onClick:e=>{if(e.target===e.currentTarget)closeLocalModal();},onKeyDown:e=>{if(e.key==='Escape'){e.stopPropagation();closeLocalModal();}else if(e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last&&last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first&&first.focus();}}}});
      const renderPreviewGate=()=>h('div',modalProps('源文件公开性确认'),h('article',{className:'pa-local-dialog'},h('h3',null,'源文件预览确认'),h('p',null,pendingPreview.name),h('label',null,h('input',{type:'checkbox',checked:previewConfirmed,onChange:e=>setPreviewConfirmed(e.target.checked)}),' 我确认此文件已完全公开，授权读取预览'),smallButton('确认并预览',()=>{setPreviewFile(pendingPreview);setPendingPreview(null);setPreviewConfirmed(false);},!previewConfirmed),smallButton('取消',closeLocalModal)));
      const renderConfigModal=()=>h('div',modalProps('任务配置'),h('article',{className:'pa-local-dialog'},h('h3',null,'任务配置 · 单一来源'),h('p',null,'更改配置将撤销当前材料确认；问答使用新会话，旧历史保留。'),[['来源',source,setSource,[['knowledge_only','仅知识库（政策资料）'],['web_only','仅官方政府网站']]],['角色',role,setRole,ROLES.map(r=>[r.key,tr(r.labelKey)])],['模式',mode,setMode,MODES.map(m=>[m.key,tr(m.labelKey)])]].map(([label,value,setValue,items])=>h('label',{key:label},label,h('select',{className:'pa-input',value,onChange:e=>{setValue(e.target.value);newQaSession();}},items.map(([id,text])=>h('option',{key:id,value:id},text))))),h('p',{className:'pa-muted'},'禁止跨源混用或无结果自动回退；所有结果待人工复核。'),smallButton('关闭',()=>setConfigOpen(false))));
      const renderFilePicker=()=>h('div',modalProps('选择真实归档文件'),h('article',{className:'pa-local-dialog'},h('h3',null,'选择公开政策文件'),h('p',null,'带入后必须重新确认当前材料公开性，不自动发送。'),records.filter(r=>r.filePath).map(r=>smallButton(r.fileName||r.title,()=>{jumpToFileQa(r);setFilePickerOpen(false);})),smallButton('关闭',()=>setFilePickerOpen(false))));
      const renderFullReport=()=>h('div',modalProps('完整报告'),h('article',{className:'pa-local-dialog pa-report-dialog'},smallButton('关闭',()=>setFullReportOpen(false)),renderParseResultPanel()));

      /* ════════ 根布局（v1.3.0：左侧竖向导航 + 右侧视图区） ════════ */
      return h('div', {
        className: 'pa-root pa-cloud',ref:moduleRef,
        style: {
          display: 'flex', flexDirection: 'row', height: '100%', width: '100%',
          minHeight: 0, overflow: 'hidden', background: T.bgRoot, color: T.text1,
        },
      },
        // pa-* 样式表（组件根内，卸载随组件移除）
        h('style', { key: 'pa-style', dangerouslySetInnerHTML: { __html: CSS_TEXT } }),
        h('style', { key: 'pa-composer-style', dangerouslySetInnerHTML: { __html: PA_COMPOSER_CSS } }), /* PA-COMPOSER-20261005 */
        h('style', { key: 'pa-qalayout-style', dangerouslySetInnerHTML: { __html: PA_QALAYOUT_CSS } }), /* PA-QALAYOUT-20261005 */
        h('style', { key: 'pa-qats-style', dangerouslySetInnerHTML: { __html: PA_QATS_CSS } }), /* paQaTsNarrow-20261005 */
        // 左侧竖向导航（品牌块 + 文件解析/解析归档/智能问答 + 公开性状态 chip）
        // DSH原侧栏独立收起；政策子页面放在模块自己的左侧栏。
        moduleNavOpen ? h('button', { type:'button', className:'pa-module-scrim', 'aria-label':'关闭政策模块导航', onClick:()=>setModuleNavOpen(false) }) : null,
        renderSideNav(),

        h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
          renderPrototypeHeader(),
          // 三视图同时渲染，用 style.display 切换（绝不条件卸载，避免丢状态/断 SSE）
          h('div', { style: { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' } },
            h('div', { key: 'pa-view-parse', style: { flex: 1, minWidth: 0, display: tab === 'parse' ? 'flex' : 'none', overflow: 'hidden' } },
              renderPrototypeParse(),
            ),
            h('div', { key: 'pa-view-records', style: { flex: 1, minWidth: 0, display: tab === 'records' ? 'flex' : 'none', overflow: 'hidden' } },
              renderPrototypeRecords(),
            ),
            h('div', { key: 'pa-view-qa', style: { flex: 1, minWidth: 0, display: tab === 'qa' ? 'flex' : 'none', overflow: 'hidden' } },
              renderPrototypeQa(),
            ),
          ),
        ),
        // 归档模态对话框（条件渲染；输入状态存于 Workbench，关闭/重开不丢数据）
        pendingPreview ? renderPreviewGate() : null,
        configOpen ? renderConfigModal() : null,
        filePickerOpen ? renderFilePicker() : null,
        fullReportOpen ? renderFullReport() : null,
        archiveOpen ? renderArchiveModal() : null,
        editRecord ? renderEditModal() : null,
        // v1.4.0 源文件在线预览模态（文件解析页 chip「预览」入口）
        previewFile ? renderPreviewModal() : null,
        // 隐藏 file input（根级常驻：文件解析/智能问答共用 pickFiles 入口；console 旧副本为 RESERVED 死代码）
        h('input', {
          ref: fileInputRef, type: 'file', multiple: true, accept: UPLOAD_ACCEPT,
          onChange: onFileInputChange, 'aria-hidden': true, tabIndex: -1,
          style: { display: 'none' },
        }),
        // 复制降级用隐藏 textarea（组件树内，卸载自动移除；不污染 body）
        h('textarea', {
          ref: taRef, 'aria-hidden': true, tabIndex: -1,
          style: {
            position: 'fixed', left: 0, bottom: 0, width: 1, height: 1,
            opacity: 0, border: 'none', padding: 0, pointerEvents: 'none',
          },
        }),
      );
    }

    /* ════════ 模块出口（骨架固定写法） ════════ */
    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        const cleanups = [];
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'policy-analysis: dicts');
        const t = ctx.locale.bind(NS);
        // keyed main：工作台选择 cap:policy-analysis 时渲染三栏控制台（能力包主面板）
        cleanups.push(
          ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: PANEL_ID, locale: NS }, Workbench)),
        );
        // 侧栏「工作台」分组行（cap: 前缀由 DSH 原生 ui-sidebar 归类/显隐，见 CAPABILITY-PACK-API §6）
        cleanups.push(
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 15, label: () => t('panel'), locale: NS }, PanelIcon)),
        );
        // 打开事件桥（cappacks:open-policy-analysis）：工作台首页卡片「打开」/ 子菜单项派发时切入主面板
        // 折叠/展开 DSH 左侧导航栏。判定与会议助手对齐：展开态 ⇔ 存在「收起侧边栏」按钮
        // （button[aria-label="收起侧边栏"/"Collapse sidebar"]），收起态标记 [data-sidebar-collapsed] 作辅助信号，
        // 两者按 OR 宽容判定（宁可多展开）。避免盲目 toggle。
        function isSidebarCollapsed() {
          try {
            if (typeof document === 'undefined') return true;
            const expandedBtn = document.querySelector('button[aria-label="收起侧边栏"], button[aria-label="Collapse sidebar"]');
            return !expandedBtn || Boolean(document.querySelector('[data-sidebar-collapsed]'));
          } catch { return true; }
        }
        function setSidebarCollapsed(layout, wantCollapsed) {
          if (!layout || typeof layout.toggleSidebar !== 'function') return;
          const isCollapsed = isSidebarCollapsed();
          if (isCollapsed !== wantCollapsed) layout.toggleSidebar();
        }
        // 打开事件桥（cappacks:open-policy-analysis）：工作台首页卡片「打开」/ 子菜单项派发时切入主面板并收起侧栏
        function onOpen(ev) {
          const detail = (ev && ev.detail) || {};
          const layout = ctx.layout || (ctx.get && ctx.get('layout'));
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID);
          // 保留DSH全局侧栏，不因打开模块擅自收起。

          void detail;
        }
        // 侧栏桥（组件内无 ctx，经 window 事件驱动）：collapse/expand + 返回主页
        function onSidebarBridge(ev) {
          const detail = (ev && ev.detail) || {};
          const layout = ctx.layout || (ctx.get && ctx.get('layout'));
          if (detail.home === true && layout && typeof layout.selectPanel === 'function') layout.selectPanel(null);
          if (typeof detail.collapse === 'boolean' || typeof detail.expand === 'boolean') {
            const want = detail.collapse === true ? true : false;
            setSidebarCollapsed(layout, want);
          }
        }
        window.addEventListener(OPEN_EVENT, onOpen);
        window.addEventListener(SIDEBAR_EVENT, onSidebarBridge);
        cleanups.push(() => window.removeEventListener(OPEN_EVENT, onOpen));
        cleanups.push(() => window.removeEventListener(SIDEBAR_EVENT, onSidebarBridge));
        return () => {
          for (const dispose of cleanups.reverse()) { try { if (typeof dispose === 'function') dispose(); } catch {} }
        };
      },
    };
  },
});
