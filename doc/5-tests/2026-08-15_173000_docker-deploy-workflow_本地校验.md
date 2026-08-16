# 测试主文档：Docker 构建部署 Workflow 本地校验

## 任务范围

- 被测文件：`.github/workflows/docker-deploy.yml`
- 目标：确认新增 workflow 的 YAML 语法、触发条件、secrets 引用与部署参数符合已确认计划。
- 本轮只做本地静态校验，不做真实镜像构建或远程部署。

## 测试入口与命令

- `python -X utf8 -B -c "import yaml, pathlib; data=yaml.safe_load(pathlib.Path('.github/workflows/docker-deploy.yml').read_text(encoding='utf-8')); print(data['name'])"`
- `yq eval '.' '.github/workflows/docker-deploy.yml'`
- 文本断言：`REGISTRY_PASSWORD`、`REMOTE_HOST`、`REMOTE_PASSWORD`、`main`、`workflow_dispatch`、`127.0.0.1:33060`、`PORT=5566`、`--network host`、`/usr/local/src/new-api`

## 验证结果

- YAML 可解析，`name=Build and Deploy new-api`，`jobs=[docker]`。
- 触发条件包含 `push.branches=[main]` 与 `workflow_dispatch`。
- secrets 引用仅包含 `REGISTRY_PASSWORD`、`REMOTE_HOST`、`REMOTE_PASSWORD`。
- 部署参数包含 host 网络、端口 `5566`、MySQL `127.0.0.1:33060/new-api`、目录 `/usr/local/src/new-api`。
- 结论：`TEST: PASS`

## 待用户执行的真实验证

- 在 GitHub 仓库配置三个 secrets 后，手动触发 `Build and Deploy new-api`。
- 确认镜像推送成功、远程容器启动成功、`curl http://127.0.0.1:5566/api/status` 返回正常。
