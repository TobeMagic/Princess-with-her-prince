# 主 Agent Plugin Center 评测脚手架

本目录把 2026-11-26 已完成的 48 条真实评测整理成功夫 / Eval Console 可复用的通用内容。

## 执行归属

- 本轮不是功夫 / Eval Console / Promptfoo 的标准 run。实际由 runner.cjs 在 dev 6466 用 Mario 账号、云端 luckee-official 0.3.1 新建 48 个浏览器 thread，真实提交 query 并截取完整 thread。
- 没有本轮的 15556 run_id，也没有 15555 evalId。旧 Promptfoo fixture 24/24 没有作为通过依据。
- 复用的只有环境、账号、清单、云端 19 条原 prompt 和旧页面入口经验；48 份 result.json、48 张长图、47 个 thread URL、短回复和终态都是本轮重新生成。
- summary-all-all.json 最后只剩 28 条严格补跑；48 条最终分类以 final-audit.json 为准。

## 目录

- cases/CASE_ID/input/task.md：真实提交的完整原话。
- cases/CASE_ID/eval/checks.json：可用性 / 路径错误断言；semantic_judge=false。
- cases/CASE_ID/eval/rubric.md：基本判定口径。
- cases/CASE_ID/case_manifest.json：短回复、终态、thread URL、公开截图与结果 URL、逐条基本结论。
- recipes/*.yaml：3 个 main_agent_session live recipe；20 Skill、9 MCP、19 模板。
- eval_sets/main-agent-plugin-live.yaml：48 个 Eval Item。
- registry.fragment.json、eval_set_api_payload.json、run_requests.json：合并与注册所需载荷。
- reports/main-agent-plugin-live-summary.json：汇总报告、来源声明、counts、4 条基本结论、48 条 case_results。
- reports/index.html：可直接打开的浅色报告页，展示 48 条短回复与逐条结论。
- install.py：把脚手架复制进 luckee-ads-eval 并幂等合并 registry.json。
- runner.cjs：本轮独立 Playwright live runner；密码从 LUCKEE_EVAL_PASSWORD 环境变量读取。
- cases.zip：48 个 case 的便捷分发包。

## 基本结论

- 20 Skill + 9 MCP 单点调用可行：29/29。
- 19 模板：8 条完整业务回复、6 条等待补输入、4 条超时、1 条页面异常。
- 只验证路径、加载与调用是否正常工作；不评价业务效果，也不把等待补输入伪装为通过。
- 48 张 thread 长图已在结果页直接内嵌；本报告不重复放图。

## 接入功夫

1. 把本目录复制到可写的 luckee-ads-skills 工作区，然后执行：

    python3 scaffold/install.py --eval-root /path/to/luckee-ads-skills/luckee-ads-eval

   脚本复制 cases、promptfoo/recipes、eval_sets，并把 48 条登记到 registry.json；不会推送、部署或启动 run。

2. 将 luckee-ads-eval 的变更提交到 motse-ai/luckee-ads-skills 的 main。deploy-eval-console workflow 会把 15556 容器更新到新 Git 事实源。

3. 注册 EvalSet（Console 的 /data/eval-sets 是持久化卷）：使用 eval_set_api_payload.json 调用 POST /api/eval-sets。

4. 从 run_requests.json 逐条 POST /api/runs。每条都是新的 live 执行账本，会由 main_agent_session provider 连 6466 WS，不会导入本轮 48 个浏览器 thread，也不会自动产出 thread 长截图。拿到新的 run_id / evalId 后回填汇总 JSON 的 eval_console_run_id / promptfoo_eval_id，并明确它是另一次执行。

## 凭据

Console live provider 从部署 secret 或环境变量读取 LUCKEE_EVAL_MAIN_AGENT_USERNAME、LUCKEE_EVAL_MAIN_AGENT_PASSWORD，或 user id 加 token。本脚手架不保存密码；runner.cjs 使用 LUCKEE_EVAL_PASSWORD 环境变量。
