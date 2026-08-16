---
schema_version: 1
doc_id: "TEST-BUN-LOCKFIX-001"
doc_type: "test"
source_ids: ["BUG-BUN-LOCKFIX-001"]
status: "accepted"
version: "v1.0"
current_slice: "CYCLE-BUN-LOCKFIX-01"
updated_at: "2026-08-15 12:03:51"
reader_level: "business_general"
writing_style: "plain_chinese"
appendix_policy: "preserve_existing_or_one_terminal_appendix"
---

# 测试主文档：bun.lock dompurify 冻结安装验证

结论：修复后的 lockfile 已通过真实冻结安装验证；影响：Docker 镜像构建链路的维护者；范围：`web/bun.lock` 与 `web/package.json` 的 `dompurify` 版本一致性；非范围：不验证完整 Docker 镜像构建、远程部署或其它依赖；变化：构建阶段的 `bun install --frozen-lockfile` 不再因版本漂移失败；完成标准：Bun 1.3.11 下退出码 0 且安装到 `dompurify@3.4.13`；术语说明：无技术术语需要解释；验证状态：真实安装验证已完成，`TEST: PASS`。

## 任务范围

- 被测文件：`web/package.json`、`web/bun.lock`。
- 目标：验证同步后的 `dompurify` 版本能通过 `bun install --frozen-lockfile`，复现并消除 Docker 构建失败。
- 本测试只覆盖依赖安装一致性，不构建完整 Docker 镜像，不做远程部署。

## 测试策略摘要

- 任务类型：Bug 修复后的依赖锁文件一致性验证。
- 风险来源：`package.json` 与 `bun.lock` 版本漂移会直接导致冻结安装失败。
- 测试类型：真实安装验证 + 静态 diff 检查。
- 优先级：先验证失败入口是否消失，再确认安装结果。
- 遗留说明：GitHub Actions 全量镜像构建仍由工作流重跑或用户手动触发确认。

## 测试入口与命令

```powershell
npm install --prefix "$env:TEMP\bun-lockfix-check-20260815-1202" bun@1.3.11 --no-audit --no-fund --loglevel=error
$bun = "$env:TEMP\bun-lockfix-check-20260815-1202\node_modules\bun\bin\bun.exe"
$work = "$env:TEMP\bun-lockfix-run-20260815-1203"
Copy-Item -LiteralPath "F:\new-api\web\package.json" -Destination $work
Copy-Item -LiteralPath "F:\new-api\web\bun.lock" -Destination $work
Push-Location $work
& $bun install --frozen-lockfile
Pop-Location
```

## 测试样本

- 依赖声明样本：`web/package.json` 中 `dompurify: "3.4.13"`。
- 锁文件样本：`web/bun.lock` 的 workspace dependencies、overrides、packages 三处均为 `3.4.13`。
- 验证工具：Bun `1.3.11`，与 Docker 构建日志版本一致。

## 验证结果

- `git diff -- web/bun.lock` 仅 3 行变化，全部为 `dompurify` 版本同步。
- `bun install --frozen-lockfile` 在 Bun 1.3.11 下退出码 0。
- 安装输出出现 `+ dompurify@3.4.13`。
- 共安装 1110 个包，耗时约 166 秒。
- 结论：`TEST: PASS`。

## 文档信息

- 文档 ID：`TEST-BUN-LOCKFIX-001`。
- 来源对象：`BUG-BUN-LOCKFIX-001`。
- 修复任务：`TASK-BUN-LOCKFIX-03`。

## 完成标准

- 冻结安装成功。
- `dompurify@3.4.13` 已安装。
- `git diff -- web/bun.lock` 仅包含本次版本同步。

## 图片资产决策

图片资产决策：N/A，原因：本轮不涉及截图、原型或视觉资产，证据：无 Markdown 图片引用。

## 待用户执行的真实验证

- 将修复后的 `web/bun.lock` 提交并推送，触发 GitHub Actions 重跑 `Build and Deploy new-api`。
- 确认 Docker 构建阶段 `bun install --frozen-lockfile` 不再报 `lockfile had changes`。

## 执行附录

- 本地环境：Windows PowerShell、Node `v24.17.0`、npm `11.13.0`。
- 临时目录：`C:\Users\luode\AppData\Local\Temp\bun-lockfix-check-20260815-1202` 与 `bun-lockfix-run-20260815-1203`。
- 关键输出片段：

```text
bun install v1.3.11 (af24e281)
...
+ dompurify@3.4.13
...
1110 packages installed [166.35s]
BUN_EXIT=0
```

- 失败预期：如果 lockfile 仍有漂移，Bun 会在解析依赖后立即报 `lockfile had changes, but lockfile is frozen`。
- 清理与回滚：验证使用独立临时目录，不污染仓库；修复文件回滚只需恢复 `web/bun.lock` 的 `3.4.11`。
