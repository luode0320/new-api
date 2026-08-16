# PROJECT_CURRENT

## 当前任务

- 目标：把"镜像直传部署 workflow"流程沉淀为用户级可复用 skill `docker-direct-deploy`（放 `C:\Users\luode\.zcode\skills\docker-direct-deploy\`），后续任何项目需要新建/改造 `.github/workflows` 部署流水线时可触发并快速生成。
- 范围：新建 skill 目录（SKILL.md + assets 模板），放用户级 `~/.zcode/skills/`；含 2 个模拟触发提示词自测。
- 状态：skill 已创建并完成本地校验与自测（模板 YAML 解析、无残留、SKILL.md 结构校验、2 个模拟触发自测），6-review `STYLE: PASS` 已落盘；后续会话可用该 skill 生成新部署 workflow。
- 已完成（历史，周期 01）：新增 `docker-deploy.yml`；YAML 本地校验通过；dompurify lockfile 修复已收口；实施总览、测试与 6-review 记录已落盘。
- 状态：workflow 已实现并通过本地校验，待用户在 GitHub 配置 secrets 后手动触发真实验证。
- 状态：用户反馈 Docker 构建失败后，已定位并修复 `web/bun.lock` 与 `package.json` 的 `dompurify` 版本漂移，真实冻结安装验证通过。
- 已完成：用户决策逐项确认；正式实施总览落盘 `doc/3-实施/2026-08-15_173000_docker-deploy-workflow_实施总览.md`；创建 `docker-deploy.yml`；YAML 本地校验通过；测试与 6-review 记录已落盘。
- 已完成：周期 02 把 `docker-deploy.yml` 改为镜像直传服务器部署（buildx 导出 tar → scp → docker load/run），本地校验与 6-review `STYLE: PASS` 已落盘。
- 已完成：根因定位为提交 `f250f3b5` 只更新 `package.json` 未同步 `bun.lock`；已同步 lockfile 三处为 `dompurify@3.4.13`；使用 Bun 1.3.11 执行 `bun install --frozen-lockfile` 退出码 0；Bug、测试与 6-review 文档均已落盘。
- 待办：后续会话使用 `docker-direct-deploy` skill 生成新部署 workflow 时验证真实触发（含跨项目复用）。
- 下一执行点：任何项目提及"镜像直传 / 不经过 Docker Hub / 上传 tar 部署"时，触发 `docker-direct-deploy` skill 按模板快速生成 `.github/workflows/*.yml`。
- 关键参数：镜像 `luode0320/new-api:latest`；容器名 `new-api`；目录 `/usr/local/src/new-api`；host 网络；端口 `5566`；MySQL DSN 使用明文密码、`127.0.0.1:33060/oneapi`；`--log-dir /app/logs`；SSH 凭据 secrets `REMOTE_HOST`、`REMOTE_PASSWORD`（不再需要 `REGISTRY_PASSWORD`）。
- 下一执行点：用户提交并推送 lockfile 修复后，重跑 GitHub Actions `Build and Deploy new-api`，确认镜像构建与远程部署成功。

## 当前约束

- skill 放用户级 `~/.zcode/skills/`，跨项目可触发，不随本仓库 git 版本控制。
- 模板用占位符泛化，new-api 专属值（SQL_DSN、端口 5566 等）不写死进模板，只作为 SKILL.md 参考实例说明。
- workflow 文件含 MySQL 明文密码，属于敏感文件，不写入公开文档或日志。
- 真实部署验证需要用户手动触发 GitHub Actions；本地只做 YAML/一致性校验。

<!-- BEGIN TASK PLAN PROJECTION -->
```json
{
  "version": 4,
  "registry_schema": "task_plan_projection_registry",
  "registry_updated_at": "2026-08-15T04:05:54.598345Z",
  "projections": [
    {
      "projection_id": "SESSION/a2fd93d0a331a8fc7703e0b8dc9e75d6a8c8ae6540329619e7b18b982d932ccd",
      "session_id": "01a00357-8e79-74f2-9cac-3f0f451db566",
      "projection_origin": "persisted",
      "synthesis_mode": "none",
      "state": "inactive",
      "plan_key": "BUG-BUN-LOCKFIX/CYCLE-BUN-LOCKFIX-01",
      "source_document": "doc/4-bugs/2026-08-15_115900_构建失败-bun-lock-dompurify版本不一致.md",
      "plan_fingerprint": "74a4738ee3f889e10b466b11855eb51dde3ab96014fb9d1ab98340e234e6cf4e",
      "updated_at": "2026-08-15T04:05:00Z",
      "steps": [
        {
          "id": "TASK-BUN-LOCKFIX-01",
          "step": "[TASK-BUN-LOCKFIX-01] 核验 lockfile 差异并确认根因",
          "status": "completed"
        },
        {
          "id": "TASK-BUN-LOCKFIX-02",
          "step": "[TASK-BUN-LOCKFIX-02] 同步 dompurify 3.4.13 到 bun.lock",
          "status": "completed"
        },
        {
          "id": "TASK-BUN-LOCKFIX-03",
          "step": "[TASK-BUN-LOCKFIX-03] 创建 Bug/测试文档并完成收口验证",
          "status": "completed"
        }
      ]
    }
  ]
}
```
<!-- END TASK PLAN PROJECTION -->
