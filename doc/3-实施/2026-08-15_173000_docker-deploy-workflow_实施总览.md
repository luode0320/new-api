# 需求实施总览：Docker 自动构建部署 Workflow

结论：新增 `.github/workflows/docker-deploy.yml`，实现 main 推送或手动触发时构建并推送 `luode0320/new-api:latest`，再通过 SSH 在远程服务器更新运行 `new-api` 容器；影响：仓库维护者与远程服务器运维；范围：新增一个 GitHub Actions workflow，不改应用代码；非范围：不改 Dockerfile、不新增部署编排文件、不修改既有发布工作流；变化：main 提交后自动完成镜像构建、推送和远程容器更新；完成标准：workflow 文件存在且参数与用户选择一致，本地 YAML 校验通过；术语说明：无技术术语需要解释；验证状态：本地校验进行中，真实部署需手动触发。

## 1. 当前计划最终方案简要说明
- 推荐方案一句话结论：按参考文件 `docker-image.yml` 的结构，新增 main push + workflow_dispatch 触发的 Docker 构建、推送、SSH 部署 workflow。
- 主落点 / 主路径：`.github/workflows/docker-deploy.yml` 一个文件，GitHub Actions 执行 Docker Hub 登录、Dockerfile 构建推送、appleboy/ssh-action 远程部署。
- 为什么先走这条路线：用户已明确选择构建并部署、沿用参考文件 secrets 名称、镜像仓库 `luode0320/new-api`、host 网络 + 5566 端口 + MySQL DSN、目录 `/usr/local/src/new-api`；仓库已有相同技术栈的 workflow 可复用。

## 2. 基本信息
- 对应需求文档：无独立需求文档，来源为用户当前消息及参考文件 `C:\Users\luode\Desktop\docker-image.yml`。
- 来源对象标识：`docker-deploy-workflow`。
- 当前实施文档命名主干：`doc/3-实施/2026-08-15_173000_docker-deploy-workflow_实施总览.md`（时间戳取当前计划固化时间）。
- 对应需求与实施计划全量顺序实施方案：N/A，单一需求单周期场景。
- 实施计划完成条件（`AC-*`）所在章节：`## 5. 最小任务清单` 与 `## 8. 实施步骤`。
- 对应 `6-review` 风格回归记录：执行完成后按 `code-style-consistency-rules` 生成 `doc/6-review/2026-08-15_140009_docker-deploy-workflow_6-review.md`（周期 02）。
- agent 理解的问题 / 目标：新增一个 GitHub Actions workflow，参考用户提供的 docker-image.yml，使用 secrets 获取敏感参数，完成 Docker 构建与远程部署。
- 当前计划范围：新增 `docker-deploy.yml` 文件，包含 Docker Hub 登录、构建推送、SSH 部署；含手动触发；部署参数按用户选定值直接写入。
- 明确不在范围：修改 Dockerfile、修改应用代码、创建远程服务器配置、修改既有 `docker-build.yml` / `docker-image-branch.yml`、上线验证真实服务器。
- 当前优先闭环：周期 02 —— 重写 `docker-deploy.yml` 为镜像直传服务器部署，本地 YAML 校验 + 一致性/无残留断言 + 完成 6-review。
- 关键假设 / 待确认点：默认分支为 `main`；Docker Hub 用户为 `luode0320`；远程服务器 Linux 且已装 Docker；SSH root 密码与镜像密码通过 GitHub secrets 提供；MySQL DSN 使用用户提供密码与 `127.0.0.1:33060/new-api`；不配置 `SESSION_SECRET`、`REDIS_CONN_STRING`。
- 跨会话执行入口：见 `## 2.3`。
- 主项目地址、仓库类型与代码基线：`F:\new-api`，Git 仓库，当前分支 `main`，基线 HEAD 为当前工作树。
- local 环境与依赖入口：Windows PowerShell，YAML 校验使用 PowerShell/本地解析器，无额外依赖。
- 外部项目代码引用：`N/A + 原因 + 证据`：无外部项目代码引用；只使用 GitHub Actions 官方或第三方 action（actions/checkout、appleboy/ssh-action），属于托管平台动作，不复制外部代码。
- 当前状态：周期 01 已收口；周期 02（镜像直传部署改造）计划已固化，进入执行。
- 是否已获得开始实施授权：是，用户已明确请求镜像直传部署改造，Default 模式已恢复，按目标继续执行。
- 若当前为受限计划 / 阻断计划：不适用，本计划为正式实施计划。

## 2.1 决策维度覆盖表
| 维度 | 状态 | 结论 / 依据 |
| --- | --- | --- |
| 架构 / 技术路线 | 已确定 | GitHub Actions + Docker Hub + appleboy/ssh-action |
| 代码落点 | 已确定 | `.github/workflows/docker-deploy.yml` |
| 实现方式 | 已确定 | Docker CLI 构建推送，SSH 脚本拉取重启容器 |
| 命名 | 已确定 | workflow 名 `Build and Deploy new-api`，容器名 `new-api` |
| 注释 | 已确定 | 保留中文注释说明构建与部署流程 |
| 日志 | 已确定 | 使用 GitHub Actions step 输出与失败时 shell 诊断 |
| 错误处理 / 异常 | 已确定 | `set -euo pipefail`；`docker rm -f ... || true` 处理首启 |
| 数据模型 / 表 / 字段 | N/A | 无数据库变更 |
| 接口契约 | N/A | 无新增 HTTP/API |
| 依赖与库 | 已确定 | actions/checkout@v4、appleboy/ssh-action@master |
| 测试策略 / 样本 | 已确定 | 本地 YAML 解析校验；真实部署由用户手动触发 |
| 其它相关维度 | 已确定 | 触发条件 main + workflow_dispatch；并发控制；权限只读 |

## 2.2 待用户选择清单
- 无（所有真实不确定决策点已由用户选定）。

## 2.3 跨会话独立执行与外部项目代码引用清单
- 新会话接手第一步：读取本实施总览和 `PROJECT_CURRENT.md`，确认 `docker-deploy.yml` 是否已存在并进入校验/收口。
- 主项目地址与项目根：`F:\new-api`。
- 主项目代码基线：当前 `main` 分支工作树。
- 计划源文件与版本：本文件。
- 依赖安装、local 配置和服务启动入口：无需安装依赖；验证命令为 PowerShell YAML 解析与 grep 检查。
- 中断点核验顺序：先 `git status` 与读取 `docker-deploy.yml`，再执行 YAML 校验和 6-review。
- 外部项目代码引用：`N/A + 原因 + 证据`：无外部项目代码引用；只使用 GitHub Actions 托管动作。

## 3. 实施周期总览
- 总周期说明：第一期 `CYCLE-DOCKER-DEPLOY-01` 已完成 workflow 新增与本地验证；第二期 `CYCLE-DOCKER-DEPLOY-02` 为原需求上的新增改动——把 `docker-deploy.yml` 从"Docker Hub 推送 + pull"改为"镜像直传服务器部署"（buildx 导出 tar → scp 上传 → docker load/run）。
- 本次计划拆分的子任务周期数：2（01 已收口，02 为当前执行周期）。
- 周期拆分原则：01 完成原 workflow 落地；02 承载用户后续提出的直传部署改造，独立闭环。
- 周期排序说明：01（第一期）已完成收口 → 02（第二期）当前执行。
- 周期 1：
  - 周期序号 / 期次定位：`CYCLE-DOCKER-DEPLOY-01` / 第一期。
  - 周期目标：新增并校验 `docker-deploy.yml`。
  - 本周期包含的最小任务：`TASK-DOCKER-DEPLOY-01`。
  - 周期内最小任务执行顺序：TASK-DOCKER-DEPLOY-01 单独完成。
  - 进入条件：用户已确认参数；当前处于 Default 执行模式。
  - 收口条件：workflow 文件落盘，YAML 校验通过，6-review 完成。
  - 完成标志：`AC-01` 到 `AC-03` 全部满足。
  - 与前后周期衔接：已完成收口（历史记录），后续由周期 02 承载直传部署改造。
- 周期 2（当前执行周期）：
  - 周期序号 / 期次定位：`CYCLE-DOCKER-DEPLOY-02` / 第二期。
  - 周期目标：把 `docker-deploy.yml` 重写为镜像直传服务器部署（buildx 导出 tar → scp 上传 → docker load/run），不再依赖 Docker Hub。
  - 本周期包含的最小任务：`TASK-REWRITE-01`。
  - 周期内最小任务执行顺序：TASK-REWRITE-01 单独完成。
  - 进入条件：用户已明确直传部署目标，参考文件已读，01 已收口。
  - 收口条件：workflow 落盘为直传模式，本地 YAML 校验与一致性/无残留断言通过，6-review 完成。
  - 完成标志：`AC-01` 满足（直传模式 + YAML 校验通过 + 无 Docker Hub 残留）。
  - 与前后周期衔接：承接 01；无后续周期。

## 4. 阶段计划
- 阶段 1：
  - 阶段名称：计划固化与执行准备
  - 阶段目标：将用户确认的决策写成实施文档并建立投影
  - 只做这一件事：形成可执行实施依据
  - 输入条件：用户决策完成
  - 输出产物：本实施总览、`PROJECT_CURRENT.md` registry
  - 验证门槛：实施文档包含全部核心字段，投影绑定当前 session
- 阶段 2：
  - 阶段名称：workflow 实现
  - 阶段目标：新增 `docker-deploy.yml`
  - 只做这一件事：写入 workflow 文件
  - 输入条件：阶段 1 完成
  - 输出产物：`.github/workflows/docker-deploy.yml`
  - 验证门槛：文件存在，内容符合用户参数选择
- 阶段 3：
  - 阶段名称：本地验证与风格回归
  - 阶段目标：校验 YAML 语法与收口
  - 只做这一件事：执行本地校验和 6-review
  - 输入条件：阶段 2 完成
  - 输出产物：校验输出与 `doc/6-review/` 记录
  - 验证门槛：YAML 解析成功，6-review 结论记录

## 5. 最小任务清单
- 最小任务 1：
  - 任务名：`TASK-DOCKER-DEPLOY-01`
  - 所属周期：`CYCLE-DOCKER-DEPLOY-01`
  - 周期内顺序：1
  - 所属阶段：阶段 2 与阶段 3
  - 本任务只做这一件事：新增 Docker 构建部署 workflow 并本地校验
  - 垂直切片目标：从 main push 到远程容器更新的完整 workflow 单文件闭环
  - 输入条件：用户参数确认、实施文档与投影完成
  - 实现产出：`.github/workflows/docker-deploy.yml`
  - 真实测试是否必需：是
  - 真实测试入口：本地 YAML 解析校验；真实部署需 GitHub Actions 手动触发
  - 真实测试依赖环境：GitHub Actions、远程服务器、Docker Hub secrets
  - 真实测试样本 / 数据来源：参考文件 `docker-image.yml`
  - 真实测试通过标准：YAML 解析成功，secrets 引用正确，远程部署脚本语法无错误
  - 测试点：触发条件、构建推送、SSH 部署、SQL_DSN 与端口参数
  - `6-review` 风格回归点：YAML 缩进、注释、命名、workflow 内容
  - 任务完成条件：`AC-01` 文件存在且包含构建部署逻辑；`AC-02` 参数与用户选择一致；`AC-03` 本地 YAML 校验通过。
  - 任务停止 / 结束条件：workflow 落盘且校验通过后停止；真实部署验证不阻塞本任务完成。
  - 阻断条件：YAML 校验失败或参数与用户选择冲突。
  - 前置依赖：阶段 1。
  - 下一任务依赖：无。
  - 预计触达文件数：1（外加实施文档、6-review 记录等非代码产物）。

## 6. 现状与落点
- 涉及目录：`.github/workflows/`
- 涉及文件 / 模块：`.github/workflows/docker-deploy.yml`（新增）
- 复用点：仓库已有 Docker workflow 的 Dockerfile 构建约定、现有 `docker-build.yml` 的 Docker Hub 登录方式、参考文件 SSH 部署结构
- 需要新增的内容：完整 workflow 文件
- 新增文件清单（目录树）：
```text
.github/
└── workflows/
    └── docker-deploy.yml                 # main push + 手动触发的 Docker 构建部署 workflow
```

## 7. 方案选择
- 方案 A：单 job 直接构建并部署，镜像名与参数直接写死，SSH 凭据走 secrets（用户选择）。
- 方案 B：多 job 拆分构建与部署、使用 docker/metadata-action 参数化镜像标签。
- 方案 C：只构建推送，不做 SSH 部署。
- 推荐方案与原因：方案 A 最贴近参考文件，用户已逐项确认，改动面最小且满足自动上线。

## 8. 实施步骤
1. 第一步：固化实施文档与项目记忆。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-01`
   - 所属阶段：阶段 1
   - 对应最小任务：`TASK-DOCKER-DEPLOY-01`
   - 本步只做：写入本总览、`PROJECT_CURRENT.md`、`PROJECT_MEMORY.md`
2. 第二步：新增 workflow 文件。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-01`
   - 所属阶段：阶段 2
   - 对应最小任务：`TASK-DOCKER-DEPLOY-01`
   - 本步只做：创建 `.github/workflows/docker-deploy.yml`
3. 第三步：本地校验与 6-review。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-01`
   - 所属阶段：阶段 3
   - 对应最小任务：`TASK-DOCKER-DEPLOY-01`
   - 本步只做：YAML 解析校验、检查参数、生成 6-review 记录

## 9. 真实测试安排
- 真实测试总表：本地 YAML 校验属于真实测试入口；远程部署属于需要用户手动触发与服务器环境配合的真实测试。
- 免测任务及理由：无免测；本任务不修改可执行代码，但 workflow 本身需要 YAML 校验。
- 步骤 1 真实测试 / 验证：文档字段完整性检查。
- 步骤 2 真实测试 / 验证：YAML 解析、secrets 引用与部署脚本字段检查。
- 步骤 3 真实测试 / 验证：`AC-01` 到 `AC-03` 复核与 6-review。

## 10. 图形化执行路径
- 图形化决策：N/A + 原因 + 证据：单文件、单 job、单周期简单任务，无需 Mermaid 图。

## 10.1 图片资产决策、生成与引用
- 图片资产决策：`N/A + 原因 + 证据`：本任务不涉及视觉资产、截图或原型，无需生成图片。

## 11. 风险与阻断项
- 风险：GitHub Actions 中 appleboy/ssh-action 需要网络可达远程服务器；Docker Hub 登录凭据与远程 root 密码需用户配置；直接写入 MySQL 明文密码会使 workflow 文件成为敏感文件。
- 依赖：`REGISTRY_PASSWORD`、`REMOTE_HOST`、`REMOTE_PASSWORD` 三个 GitHub secrets；远程服务器 Docker 可用。
- 任务停止 / 结束条件总表：workflow 落盘 + 本地校验通过即结束；真实服务器部署与推送由用户手动触发验证。

## 12. 数据库变更 SQL
- N/A：无数据库变更。

## 13. 自审结论
- 覆盖度检查：覆盖需求、落点、参数、测试、风险、停止条件。
- 实施周期检查：单周期，周期字段完整。
- 最小任务闭环检查：单任务，完成条件与测试映射完整。
- 阶段单一目标检查：每阶段一个目标。
- 占位词检查：无未定义占位词。
- 可执行性检查：可执行、可验证、可交接。
- 图文一致性检查：N/A，未使用图。
- 用户确认状态：关键决策已由用户选择。

## 执行附录
- local 环境：Windows PowerShell。
- 周期内执行步骤、命令、样本、预期失败、清理和回滚：
  - 步骤：创建 workflow 文件 -> YAML 解析 -> 检查 secrets -> 6-review。
  - 预期失败：YAML 语法错误时 PowerShell `ConvertFrom-Yaml` 抛错；处理方式为修正文件后重跑。
  - 清理和回滚：若需撤销，删除新增文件并保持既有 workflow 不变。

## 追踪附录
- `SRC -> DEC -> REQ/RULE -> AC -> CYCLE -> TASK -> TEST -> EVIDENCE` 双向追踪：
  - SRC：用户请求 + `docker-image.yml`
  - DEC：用户选择构建并部署、严格沿用参考文件 secrets 名称、镜像 `luode0320/new-api`、host 网络 + 5566 + MySQL、`/usr/local/src/new-api`；周期 02 新增决策：镜像直传服务器部署（不再用 Docker Hub）
  - REQ/RULE：GitHub Actions workflow、项目 `AGENTS.md` 项目保护规则
  - AC：`AC-01` workflow 文件存在且为直传模式；`AC-02` 参数与用户选择一致；`AC-03` 本地 YAML 校验通过（周期 01 原 AC 已完成；周期 02 以 `AC-01` 直传 + 校验 + 无残留为收口标志）
  - CYCLE：`CYCLE-DOCKER-DEPLOY-01`（已收口）、`CYCLE-DOCKER-DEPLOY-02`（当前）
  - TASK：`TASK-DOCKER-DEPLOY-01`（已收口）、`TASK-REWRITE-01`（当前）
  - TEST：本地 YAML 解析 + 手动触发部署验证（周期 01）；本地 YAML 解析 + 参考一致性 + 无 Docker Hub 残留断言（周期 02）
  - EVIDENCE：周期 01 `doc/5-tests/2026-08-15_173000_docker-deploy-workflow_本地校验.md` 与 `doc/6-review/2026-08-15_173000_docker-deploy-workflow_6-review.md`；周期 02 `doc/6-review/2026-08-15_140009_docker-deploy-workflow_6-review.md`
