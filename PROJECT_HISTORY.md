# PROJECT_HISTORY

- 2026-08-15：新增 `.github/workflows/docker-deploy.yml`，完成本地 YAML 校验与 6-review；待用户配置 secrets 后手动触发真实部署验证。
- 2026-08-15：修复 Docker 构建失败，根因是 `f250f3b5` 未同步 `web/bun.lock` 的 `dompurify` 版本；已同步为 `3.4.13` 并通过 Bun 1.3.11 冻结安装验证。
