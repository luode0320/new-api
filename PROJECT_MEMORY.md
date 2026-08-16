# PROJECT_MEMORY

## 项目身份保护

- 不得修改、删除或替换项目名称 new-api 及组织 QuantumNous 的任何引用、品牌、元数据或归属。

## 研发产物约定

- 实施文档位于 `doc/3-实施/`，测试主文档位于 `doc/5-tests/`，6-review 记录位于 `doc/6-review/`。
- 文档命名使用 `YYYY-MM-DD_HHmmss_来源对象标识_阶段或主题说明.md`。

## Docker 部署决策

- 本仓库用户侧新增部署 workflow 使用镜像 `luode0320/new-api:latest`，容器名 `new-api`，目录 `/usr/local/src/new-api`。
- 部署使用 host 网络与端口 `5566`，连接远程 MySQL `127.0.0.1:33060/new-api`。
- Docker Hub 登录凭据使用 GitHub secret `REGISTRY_PASSWORD`，SSH 部署凭据使用 `REMOTE_HOST` 与 `REMOTE_PASSWORD`。

## 自动化部署状态

- `.github/workflows/docker-deploy.yml` 已新增，触发条件为 main push 与 workflow_dispatch，构建并推送 `luode0320/new-api:latest` 后经 SSH 部署。

## 前端依赖锁文件

- `web/bun.lock` 与 `web/package.json` 必须保持一致；依赖机器人只改 `package.json` 时需同步 lockfile，否则 Docker 的 `bun install --frozen-lockfile` 会失败。
- 2026-08-15 曾因 `dompurify` 版本漂移导致构建失败，已同步到 `3.4.13` 并使用 Bun 1.3.11 完成冻结安装验证。

## 机器索引区

```yaml
version: 1
entities:
  - entity_id: workflow-docker-deploy
    type: workflow
    scope: new-api
    aliases:
      - docker-deploy.yml
      - Build and Deploy new-api
    source: 用户需求 + 参考文件 docker-image.yml
    status: active
    updated_at: 2026-08-15
relations:
  - source: workflow-docker-deploy
    relation: triggers
    target: dockerhub-image-luode0320-new-api
evidence:
  - evidence_id: local-yaml-validation
    description: PyYAML 与 yq 解析通过，secrets 与参数断言通过
    source: doc/5-tests/2026-08-15_173000_docker-deploy-workflow_本地校验.md
contexts:
  - context: 部署目标
    value: 远程服务器 root 用户，host 网络，端口 5566
lifecycle:
  - entity_id: workflow-docker-deploy
    state: active
    entered_at: 2026-08-15
retrieval_hints:
  - keyword: docker deploy
    target: .github/workflows/docker-deploy.yml
extensions:
  - note: 真实部署验证待 GitHub secrets 与手动触发
```
