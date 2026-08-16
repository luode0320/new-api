# 6-Review：Docker 构建部署 Workflow

## 适用对象

- `.github/workflows/docker-deploy.yml`
- 真实测试证据：`doc/5-tests/2026-08-15_173000_docker-deploy-workflow_本地校验.md`

## 审查范围

- YAML 缩进与结构：通过 `yq` 与 PyYAML 解析，结构合法。
- 命名与注释：workflow 名 `Build and Deploy new-api`，中文注释说明流程；未破坏项目保护标识。
- 安全边界：敏感 SSH 与 Docker 凭据使用 GitHub secrets；MySQL 密码为部署者明确允许写入 workflow 的敏感值。
- 行为一致性：触发条件、构建推送、SSH 部署与已确认用户选择一致。

## 结论

- `STYLE: PASS`
