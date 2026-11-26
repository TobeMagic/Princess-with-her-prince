# main-agent-plugin-live-template-06 · 基本可用性口径

- 这是主 Agent 的 runtime 可行性评测，不是业务效果评分。
- <code>input/task.md</code> 是 2026-11-26 在 dev 6466 真实提交过的完整用户原话。
- 真实执行须留下 Agent 回复；Skill / MCP 单点还须在回复或工具轨迹中出现目标名称。
- 命中路径不存在、模块缺失、未挂载、权限错误等运行时报错即判失败。
- 模板 Query 停在补充输入只记录为 <code>needs-input</code>，不伪造成完整业务通过。
- 超时与页面异常按原始终态记录；本轮分类见 <code>case_manifest.json</code> 和汇总报告。
- 不启用 semantic judge，不比较业务结论正确性。
