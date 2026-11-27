# CLI Bot 应用替换 · 开发与真实 UAT 验收链路 Checklist

日期：2026-11-27  
状态：待执行  
适用方案：用 `lark-cli config init --new` 创建的全权限 Bot 应用替换旧 app registration / Bot 凭据入口；现有 Cloud、WSClient、IM Gateway、renderer、durable delivery 与业务状态链路保持不变；CLI Skills 以 Bot 身份接入主 Agent。  
不适用于：用 CLI 子进程重写消息链路、用户 OAuth / 个人身份模拟、新建独立 Bot Runtime。

> 所有 checkbox 默认未勾选。真实 UAT 指使用真实企业应用、真实测试群、真实知识空间、真实用户和真实卡片 / 审批事件；`--dry-run`、help、schema 与本机命令验证不得标记为 UAT 通过。

## 0. 结论与准入规则

- [ ] 已确认本期目标是“换 Bot 应用 / 凭据 + 主 Agent 接 CLI Skills”。
- [ ] 已确认保留现有 IM Feishu 消息链路，不新建 Bot Runtime，不把 WSClient 换成 CLI 事件消费者。
- [ ] 已确认真实企业 UAT 全部通过前，旧连接保留并可回滚。
- [ ] 已确认失败项不临时绕过；出现阻塞时停止切换。
- [ ] 已确认凭据、token、用户隐私数据不写入代码、清单、截图、日志和评审材料。
- [ ] 每项填写负责人、日期、证据链接或消息 ID；状态只允许 未开始 / 进行中 / 通过 / 阻塞 / 不适用，不得只写 OK。
- [ ] 准备独立测试租户或隔离企业应用、测试群、测试知识空间、至少两名测试用户、Cloud/Desktop 测试环境和后台日志权限。

---

## 1. 前置事实与真实应用配置

- [ ] 固定 `lark-cli v1.0.100` 版本，记录二进制来源与校验值。
- [ ] 用 `config init --new` 创建 PersonalAgent Bot 应用，保存返回的 client_id/client_secret 到服务端凭据源。
- [ ] 补齐 Cloud 连接所需字段：`appId`、`appSecret`、`botOpenId`、扫码用户 identity / `scannerOpenId`、`tenant`、`scopes`、能力 metadata。
- [ ] 如 CLI 注册流程未直接返回 `botOpenId` 或扫码用户信息，明确记录获取来源，不凭空补值。
- [ ] 在开发者后台确认机器人能力、应用可用范围、长连接接收模式和已发布版本。
- [ ] 从已发布应用版本元数据导出 `scopes[].token_types` 与 `event_infos[].event_type`，保留原始返回或截图作为证据。
- [ ] 确认 6 项 IM tenant scope：`im:chat`、`im:chat:create`、`im:chat.members:read`、`im:chat.members:write_only`、`im:message`、`im:message.group_msg`。
- [ ] 确认 `im.message.receive_v1`、`card.action.trigger` 事件订阅已发布。
- [ ] 确认知识库只读 tenant scope 与 `docx:document:readonly` 已发布；实际 scope 名以真实应用返回为准。
- [ ] 确认截图中的 171 项全选权限没有被当作上述配置的替代证据。
- [ ] 确认 `auth login`、用户 UAT、`offline_access`、个人 refresh token 均未进入本方案。
- [ ] 准备测试群，并把新 Bot 加入群。
- [ ] 准备测试知识空间，把 Bot / 应用加为空间成员或节点协作者。
- [ ] 准备至少 3 篇 docx：1 篇含附件引用、1 篇较长、1 篇用于撤权测试。
- [ ] 准备无权用户、未加入 Bot 的对照知识空间、审批卡片、AskUserQuestion 卡片、图片与文件附件。
- [ ] 记录测试资源 ID，但不记录 Secret 或 token 值。

---

## 2. 开发改动清单

- [ ] 改动 Settings / Local backend 的 app registration 入口，使其能接收新 Bot 应用注册结果。
- [ ] 保持 Cloud `POST /api/im/feishu/connections/import-app-registration` 现有字段契约，新增字段只允许向后兼容。
- [ ] Cloud 继续把 App Secret 写入加密 `credentialRef`；DTO 只返回 ref 和状态。
- [ ] 凭据不进入命令行参数、URL、浏览器日志、console、错误上报或审计正文。
- [ ] 实现旧连接到新应用的迁移映射：`connectionId`、tenant、用户、群、`open_id` / `botOpenId`。
- [ ] 对跨应用 `open_id` 做显式校验；禁止直接复用旧应用的 `open_id` 作为新应用用户标识。
- [ ] Settings readiness 分项展示 tenant scope、事件订阅、机器人能力、发布版本、知识库资源 ACL。
- [ ] 缺 scope、Bot 未进群、Bot 未加入知识空间、版本未发布分别返回可操作错误，不合并成连接失败。
- [ ] 新增或变更 HTTP API 的 Vitest：成功、400、401/403、迁移冲突、缺字段、重复导入、DTO 不含 Secret。
- [ ] 不替换 `WSClient` 为 CLI 事件消费者，不新增 CLI 常驻消费者、事件总线 daemon 或子进程 lease。
- [ ] Cloud 继续持有 `im_connections`、群绑定、线程映射、事件去重、outbox、delivery lease、durable WSS delivery。
- [ ] renderer 继续负责文本、卡片、same-card working/final/error、审批回写与附件出口。
- [ ] 主 Agent 会话、AskUserQuestion、审批 intent 与幂等保持现有语义。
- [ ] 对比换应用前后的内部事件 DTO；不得因 `open_id` / `botOpenId` 变化丢失 threadLink、credentialRef 或审批目标。
- [ ] 监控告警沿用现有 IM 指标，并增加新应用版本、credentialRef、scope readiness 与迁移状态。
- [ ] 使用 `config bind --identity bot-only` 或等效 Go extension Credential Provider 把同一个 App ID/Secret 绑定给 Agent 运行环境。
- [ ] 固定 CLI 版本；Skills 安装、升级、回滚纳入发布产物清单。
- [ ] 所有工具调用显式使用 `--as bot`；禁止工具层拼接任意命令或切换 `--as user`。
- [ ] 主 Agent 工具网关按 `connectionId` 选择 profile，校验 tenant、scope、群、知识空间、节点与文档白名单。
- [ ] 工具白名单默认只读；写操作、`high-risk-write`、`api` 原始逃生口单独审批。
- [ ] 工具结果统一结构化：工具名、身份、参数摘要、资源 ID、引用链接、耗时、错误分类、结果大小。
- [ ] 错误分类覆盖 `missing_scope`、`permission_denied`、`rate_limit`、`not_found`、`network`、`invalid_output`。
- [ ] Agent 工具只返回证据片段与链接，不把整库正文或大表无边界塞入上下文。
- [ ] 记录审计：connection、工具、命令摘要、身份、结果状态、错误码、耗时；不记录 token、Secret 或完整敏感正文。
- [ ] 工具层 Vitest：越权 connection、任意 `space_id`、缺 scope、ACL 失败、限频、分页终止、输出过大、注入参数、写操作拦截。
- [ ] 独立新增知识库资料源抽象，不复用广告 `data_source_connections.sourceType` 枚举。
- [ ] 实现 `listSpaces`、`listNodes`、`getNode`、`readDocxRaw`、`searchDocs`，统一分页与错误分类。
- [ ] `wiki URL → node_token → obj_token → docx raw_content` 解析链有完整测试。
- [ ] P0 只支持 docx 纯文本；sheet / bitable / slides / file 明确列为后续扩展。
- [ ] 列表接口只取展示字段；正文仅在候选命中或用户点开引用时按需读取。
- [ ] 记录 `obj_edit_time` 与内容 hash，做增量缓存；文档撤权、删除、换版后立即失效。
- [ ] `docx raw_content` 遵守单应用 5 QPS，配置退避与重试；不对权限错误做重试。
- [ ] 分页处理空页但 `has_more=true` 的情况，并能完整遍历。
- [ ] 搜索结果包含标题、`space_id`、`node_token`、`obj_token`、url、更新时间与可引用片段。

---

## 3. 开发自测 Gate（进入真实 UAT 前）

- [ ] 类型检查、lint、已有 Vitest 全绿。
- [ ] 新增 HTTP API 与工具网关 Vitest 全绿。
- [ ] 本机不配置真实企业凭据即可跑完单元与集成测试。
- [ ] 本地或测试环境完成 app registration → Cloud import → WSClient 启动链路。
- [ ] 旧连接迁移映射在测试库验证，无跨用户、跨群、跨 tenant 串线。
- [ ] CLI profile 以 bot-only 生效；`--as user`、用户 token、个人 keychain 均未被使用。
- [ ] 命令白名单、审计与输出大小限制在测试环境可验证。
- [ ] 性能自测覆盖列表字段、`SELECT *`、N+1、完整 BLOB 误读、重复查询、缓存命中与失效。
- [ ] 控制台和后端日志无 Secret / token 泄漏。
- [ ] 回滚脚本在测试库演练成功。
- [ ] 研发负责人签署进入 UAT：姓名、日期、证据链接完整。

---

## 4. 真实企业 UAT 链路

- [ ] UAT-00：用真实应用版本元数据核对 tenant scope、event_infos、机器人能力、发布版本。
- [ ] UAT-00：用真实 App ID/Secret 建立 Cloud 测试连接，确认 `credentialRef` 可解析且 DTO 不返回 Secret。
- [ ] UAT-00：用同一应用绑定 CLI Skills，确认身份检查为 Bot 且没有用户 token。
- [ ] UAT-00：确认 `WSClient` 由现有 Cloud runtime 启动，连接状态出现在原监控面板。
- [ ] UAT-01：用户 A 在测试群 @Bot 发普通问题，主 Agent 收到并回复。
- [ ] UAT-01：用户 A 私聊 Bot 发问题，主 Agent 收到并回复。
- [ ] UAT-01：用户 B 在同一群发消息，不串到用户 A 的会话或工作区。
- [ ] UAT-01：检查 message_id、event_id、chat_id、sender_id、thread/root/reply、mentions 与现有事件 DTO 一致。
- [ ] UAT-01：重复事件回放时，同一 message_id 不重复触发 Agent；记录至少 4 个真实消息 ID 与时间戳。
- [ ] UAT-02：触发 working → final 的 same-card 更新，卡片不被拆成多条消息。
- [ ] UAT-02：触发 error 状态，卡片显示可理解错误，不泄漏 token 或堆栈。
- [ ] UAT-02：点击审批按钮一次，审批 intent 正确落库并更新卡片；重复点击不重复执行。
- [ ] UAT-02：AskUserQuestion 弹出、回答、超时与默认答案路径均验证。
- [ ] UAT-02：卡片 token 过期或更新次数耗尽时给出明确提示，不重试死循环。
- [ ] UAT-03：用户发送图片与文件，Agent 可读取并在回复中引用正确资源。
- [ ] UAT-03：Bot 发出图片与文件，飞书端可打开，消息状态与审计一致。
- [ ] UAT-03：reply-in-thread、root_id、reply_to、threadLink 映射与旧链路等价。
- [ ] UAT-03：临时文件处理完成后清理；不把完整 BLOB 写入列表查询或常规日志。
- [ ] UAT-04：Bot 加入测试知识空间后能列出空间与节点；未授权空间不可见。
- [ ] UAT-04：搜索命中测试文档，返回标题、链接、space/node/obj token 与片段。
- [ ] UAT-04：主 Agent 基于文档回答，答案包含可打开引用链接。
- [ ] UAT-04：长文档按需读取；分页超过一页可完整遍历；空页但 `has_more=true` 不死循环。
- [ ] UAT-04：5 QPS 下触发退避并成功完成读取。
- [ ] UAT-04：撤权、删除节点或文档后，搜索与正文不再返回旧内容，缓存失效。
- [ ] UAT-04：无权用户得到需授权提示，不误报知识库没有内容。
- [ ] UAT-04：主 Agent 调用 Wiki / Docx / Drive / Contact / Task 工具时，审计显示同一 Bot 身份与 connection。
- [ ] UAT-04：尝试 `--as user`、他人 connection、任意 `space_id`、`high-risk-write` 均被拒绝。
- [ ] UAT-05：网络断开或连接服务重启后，`WSClient` 自动重连，状态回到 connected。
- [ ] UAT-05：重连期间消息不丢失；重复投递按 message_id 去重。
- [ ] UAT-05：两个测试用户并发提问，会话、审批、知识库引用不串线。
- [ ] UAT-05：旧应用 `open_id` 不被直接当作新应用 `open_id`；迁移映射生效。
- [ ] UAT-05：旧用户绑定、群绑定、threadLink、审批 intent 在迁移后仍可查询。
- [ ] UAT-05：连接撤销后，CLI profile 与工具调用停止，旧 token / Secret 不在日志中残留。
- [ ] UAT-06：列表查询只取展示所需字段，无 `SELECT *`、无完整 BLOB 误读。
- [ ] UAT-06：无 N+1 与重复查询；记录查询次数与 P95 耗时。
- [ ] UAT-06：知识库正文按需读取；记录缓存命中率与失效次数。
- [ ] UAT-06：Agent 上下文有明确字节 / token 上限，超限返回片段与链接。
- [ ] UAT-06：限频、网络错误、权限错误分别处理；权限错误不被当作可重试错误。
- [ ] UAT-06：CLI Skills 冷启动、工具调用、API 延迟计入性能记录，并与既有基线对比。
- [ ] UAT-07：DTO、日志、浏览器、审计、错误上报均无 App Secret / tenant token / 用户 token。
- [ ] UAT-07：每个工具调用可按 connection、用户、群、空间、资源 ID 追溯。
- [ ] UAT-07：写操作默认拦截；确认后执行并留下操作者、参数摘要与结果。
- [ ] UAT-07：无权用户、撤权文档、跨 connection 资源访问全部被服务端拒绝。
- [ ] UAT-07：连接删除或应用撤销后，旧 profile、缓存与引用不再可用。
- [ ] UAT-07：发布产物固定 CLI 版本、Skills 版本与 Go extension 版本（如使用）。
- [ ] UAT-08：tenant token 获取失败触发告警，提示配置修复而非引导用户重新登录。
- [ ] UAT-08：事件订阅丢失、scope 缺失、Bot 未加入空间分别产生可诊断状态。
- [ ] UAT-08：消息投递失败进入 outbox 并按现有语义重试。
- [ ] UAT-08：知识库权限错误、限频、CLI 输出解析失败分别有指标与日志。
- [ ] UAT-08：告警演练后，值班同学能根据现有 playbook 判断影响面与回滚入口。
- [ ] 所有 UAT 用例均使用真实企业应用、真实测试群、真实知识空间、真实用户和真实卡片 / 审批事件；help、schema、`--dry-run` 不得标记为 UAT 通过。

---

## 5. 切换、回滚与最终 DoD

- [ ] 先在 1 个测试 connection 切换到新应用，其他连接保持旧应用。
- [ ] 影子或双读阶段比对新旧事件字段、消息 ID、审批 intent 与投递结果。
- [ ] 单群灰度通过后再扩展到 1 个知识空间，之后逐 connection 切换。
- [ ] 每批切换记录用户、群、时间与回滚点，并观察连接状态、错误率、审批幂等、知识库权限错误与性能 P95。
- [ ] 任一 Gate 不通过时停止扩大范围，保持旧连接。
- [ ] 回滚到旧 `credentialRef` 后，`WSClient` 可启动，群聊 / 私聊 / 卡片可用。
- [ ] 回滚期间已产生的会话、审批 intent、outbox、threadLink 不丢失。
- [ ] 新应用 profile 与 CLI Skills 工具调用同步停用，避免双写。
- [ ] 回滚演练记录消息 ID、时间点、负责人与结果；保留至少一个发布周期的快速回滚开关。
- [ ] 第 1–3 节全部勾选通过；第 4 节所有 UAT 用例通过且有真实消息 ID / 卡片 ID / 资源 ID / 日志证据。
- [ ] 无 P0/P1 缺陷；P2 缺陷有责任人与计划，不阻塞切换的项已由产品确认。
- [ ] 性能与数据流验收完成，无未说明的 N+1、BLOB 误读、整库正文进入上下文或缓存失效缺口。
- [ ] 安全、审计、撤权、回滚演练、告警演练均通过。
- [ ] 中英文产品 / 架构文档、Settings 文案、监控 playbook 同步更新。
- [ ] 旧应用退出时间、数据保留策略和撤销授权动作已明确。
- [ ] 产品、前端、Cloud/Backend、Agent、测试、运维分别签署。

---

## 6. 证据包与签署

- [ ] `app-version/`：应用版本原始返回、scope 与 event_infos 导出、发布版本截图。
- [ ] `registration/`：应用注册结果字段清单（脱敏）、Cloud import 响应、credentialRef 状态。
- [ ] `im-uat/`：消息 ID、卡片 ID、审批 ID、线程 ID、outbox / durable delivery 日志。
- [ ] `wiki-uat/`：空间 / 节点 / 文档 ID、搜索结果、引用链接、撤权前后对比。
- [ ] `skills-uat/`：工具调用审计、bot-only 身份检查、白名单拒绝记录。
- [ ] `performance/`：查询次数、P95、缓存命中、5 QPS 退避、上下文大小记录。
- [ ] `security/`：脱敏检查、审计抽查、撤销与跨 connection 拒绝记录。
- [ ] `rollback/`：切换批次、回滚演练、告警演练与签署记录。

---

## 7. 明确排除

- [ ] 不把 CLI `event consume` 作为生产事件入口。
- [ ] 不把现有 renderer / IM SDK 出口重写为 CLI 子进程。
- [ ] 不引入用户 OAuth、个人 UAT、用户 refresh token 或 `--as user`。
- [ ] 不把截图 171 项授权、本机 help / schema / dry-run 当作真实 UAT 证据。
- [ ] 不把未验证的真实应用 scope、事件订阅或资源 ACL 写成已完成。

---

**签署表**

| 角色 | 姓名 | 结论 | 日期 | 证据链接 |
|---|---|---|---|---|
| 产品 |  |  |  |  |
| 前端 / Settings |  |  |  |  |
| Cloud / Backend |  |  |  |  |
| 主 Agent / Skills |  |  |  |  |
| 测试 / UAT |  |  |  |  |
| 运维 / 监控 |  |  |  |  |
