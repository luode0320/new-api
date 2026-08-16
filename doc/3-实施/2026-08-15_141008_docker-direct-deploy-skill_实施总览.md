# 需求实施总览：docker-direct-deploy-skill（镜像直传部署 workflow 生成 skill）

结论：把刚实现的"镜像直传服务器部署 workflow"模式沉淀为用户级可复用 skill `docker-direct-deploy`，后续任何项目需要新建/改造 `.github/workflows` 部署流水线时可触发并快速生成；影响：用户所有项目（skill 放用户级 `~/.zcode/skills/`，跨项目可命中）；范围：新建 skill 目录（SKILL.md + assets 模板）；非范围：不改 new-api 既有 workflow 与文档、不新增注册清单、不提交 git；变化：提及"镜像直传 / 不经过 Docker Hub / 上传 tar 部署"等表述时自动命中该 skill；完成标准：skill 落盘、模板 YAML 校验通过、无 Docker Hub 残留、2 个模拟触发提示词自测通过；术语说明：直传部署 = CI 内 buildx 导出镜像 tar，scp 上传服务器后 docker load + docker run，不经过镜像仓库；验证状态：本地校验进行中，真实触发需在后续会话使用该 skill。

## 1. 当前计划最终方案简要说明
- 推荐方案一句话结论：把 `docker-deploy.yml` 直传模式泛化为占位符模板，封装成用户级 skill `~/.zcode/skills/docker-direct-deploy/`。
- 主落点 / 主路径：`C:\Users\luode\.zcode\skills\docker-direct-deploy\SKILL.md` + `assets/direct-deploy-workflow.template.yml`。
- 为什么先走这条路线：用户已明确选择用户级位置（`~/.zcode/skills/`），跨项目复用；skill-creator 规则默认"提取对话中已固化流程 → 写 draft → 测试 → 迭代"，本对话已有完整可提取的实现。

## 2. 基本信息
- 对应需求文档：无独立需求文档，来源为用户当前消息 + 上一轮已实现的 `docker-deploy.yml` 直传版本 + 桌面参考文件 `C:\Users\luode\Desktop\docker-image.yml`。
- 来源对象标识：`docker-direct-deploy-skill`。
- 当前实施文档命名主干：`doc/3-实施/2026-08-15_141008_docker-direct-deploy-skill_实施总览.md`。
- 对应需求与实施计划全量顺序实施方案：N/A，单一来源单周期场景。
- 实施计划完成条件（`AC-*`）所在章节：`## 5. 最小任务清单` 与 `## 8. 实施步骤`。
- 对应 `6-review` 风格回归记录：`doc/6-review/2026-08-15_141008_docker-direct-deploy-skill_6-review.md`。
- agent 理解的问题 / 目标：把镜像直传部署流程做成可触发、可快速生成 `.github/workflows` 配置的复用 skill。
- 当前计划范围：新建 `docker-direct-deploy` skill（SKILL.md + assets 模板），放用户级 `~/.zcode/skills/`；含 2 个模拟触发提示词自测。
- 明确不在范围：修改 new-api 的 `.github/workflows/docker-deploy.yml` 与既有实施/6-review 文档；修改其它 skill；新增注册清单（按目录自动发现）。
- 当前优先闭环：skill 文件落盘 + 模板 YAML 校验 + 无残留检查 + 触发自测 + 6-review。
- 关键假设 / 待确认点：用户级 skill 目录按目录名自动发现、无 manifest 需注册；模板用占位符泛化，new-api 专属值不写死；DOCKER_RUN_CMD 空串语义正确。
- 跨会话执行入口：见 `## 2.3`。
- 主项目地址、仓库类型与代码基线：`F:\new-api`，Git 仓库，当前分支 `main`，工作树含上一轮已收口的直传 workflow 改动。
- local 环境与依赖入口：Git Bash on Windows；校验用 Python（PyYAML）与 grep 断言；无需安装额外依赖。
- 外部项目代码引用：`N/A + 原因 + 证据`：不复制外部项目代码；只引用 GitHub Actions 托管 action（checkout/setup-qemu/scp-action/ssh-action）与本仓库已实现的 `docker-deploy.yml` 作为参考实例。
- 当前状态：计划固化，准备执行。
- 是否已获得开始实施授权：是，用户 `/goal` 明确要求"按计划落盘并执行"，Default 模式已恢复。
- 若当前为受限计划 / 阻断计划：不适用，本计划为正式实施计划。

## 2.1 决策维度覆盖表
| 维度 | 状态 | 结论 / 依据 |
| --- | --- | --- |
| 架构 / 技术路线 | 已确定 | 用户级 skill 目录 + SKILL.md + assets 模板 |
| 代码落点 | 已确定 | `C:\Users\luode\.zcode\skills\docker-direct-deploy\` |
| 实现方式 | 已确定 | 泛化占位符模板，SKILL.md 说明生成步骤与硬规则 |
| 命名 | 已确定 | skill 名 `docker-direct-deploy`；模板名 `direct-deploy-workflow.template.yml` |
| 注释 | 已确定 | 模板保留中文流程注释；SKILL.md 用中文 |
| 日志 | N/A | skill 生成无运行时日志 |
| 错误处理 / 异常 | 已确定 | 校验失败即停止并修正重跑 |
| 数据模型 / 表 / 字段 | N/A | 无数据库变更 |
| 接口契约 | N/A | 无 HTTP/API |
| 依赖与库 | 已确定 | 仅 Python PyYAML + grep 校验，无新增依赖 |
| 测试策略 / 样本 | 已确定 | 模板 YAML 解析 + 无残留 grep + 2 个模拟触发提示词自测 |
| 其它相关维度 | 已确定 | 用户级放置跨项目触发；不改 new-api 现有文件 |

## 2.2 待用户选择清单
- 无（所有真实不确定决策点已由用户选定：skill 位置 = 用户级 `~/.zcode/skills/`）。

## 2.3 跨会话独立执行与外部项目代码引用清单
- 新会话接手第一步：读取本实施总览与 `PROJECT_CURRENT.md`，确认 skill 目录是否已存在并进入校验/自测。
- 主项目地址与项目根：`F:\new-api`。
- 主项目代码基线：当前 `main` 分支工作树。
- 计划源文件与版本：本文件。
- 依赖安装、local 配置和服务启动入口：无需安装；校验命令为 Python YAML 解析与 grep 检查。
- 中断点核验顺序：先检查 `C:\Users\luode\.zcode\skills\docker-direct-deploy\` 是否存在，再执行校验与自测。
- 外部项目代码引用：`N/A + 原因 + 证据`：无外部项目代码复制；只引用 GitHub Actions 托管 action 与仓库内已实现 workflow。

## 3. 实施周期总览
- 总周期说明：单周期 `CYCLE-DOCKER-DEPLOY-SKILL-01`，第一期（也是唯一期）为 skill 创建与本地验证。
- 本次计划拆分的子任务周期数：1。
- 周期拆分原则：目标单一（创建一个 skill），无需拆分多周期。
- 周期排序说明：唯一周期，完成即可收口。
- 周期 1：
  - 周期序号 / 期次定位：`CYCLE-DOCKER-DEPLOY-SKILL-01` / 第一期。
  - 周期目标：创建 `docker-direct-deploy` skill（SKILL.md + assets 模板）并本地校验、自测。
  - 本周期包含的最小任务：`TASK-SKILL-01`。
  - 周期内最小任务执行顺序：TASK-SKILL-01 单独完成。
  - 进入条件：用户已选定 skill 位置；当前处于 Default 执行模式。
  - 收口条件：SKILL.md + 模板落盘，模板 YAML 校验通过，无 Docker Hub 残留，2 个模拟触发自测通过，6-review 完成。
  - 完成标志：`AC-01` 到 `AC-04` 全部满足。
  - 与前后周期衔接：无后续周期。

## 4. 阶段计划
- 阶段 1：
  - 阶段名称：计划固化与执行准备
  - 阶段目标：将用户选定决策写成实施文档并建立投影
  - 只做这一件事：形成可执行实施依据
  - 输入条件：用户决策完成
  - 输出产物：本实施总览、`PROJECT_CURRENT.md` registry
  - 验证门槛：实施文档包含全部核心字段，投影绑定当前 session
- 阶段 2：
  - 阶段名称：skill 创建
  - 阶段目标：创建 `docker-direct-deploy` skill
  - 只做这一件事：写入 SKILL.md 与 assets 模板
  - 输入条件：阶段 1 完成
  - 输出产物：`~/.zcode/skills/docker-direct-deploy/SKILL.md`、`assets/direct-deploy-workflow.template.yml`
  - 验证门槛：文件存在，内容符合用户位置选择与泛化要求
- 阶段 3：
  - 阶段名称：本地校验、自测与风格回归
  - 阶段目标：校验模板、自测触发、收口
  - 只做这一件事：执行校验与 6-review
  - 输入条件：阶段 2 完成
  - 输出产物：校验输出、自测结论与 `doc/6-review/` 记录
  - 验证门槛：模板 YAML 解析成功、无残留、2 个模拟触发通过、6-review 结论记录

## 5. 最小任务清单
- 最小任务 1：
  - 任务名：`TASK-SKILL-01`
  - 所属周期：`CYCLE-DOCKER-DEPLOY-SKILL-01`
  - 周期内顺序：1
  - 所属阶段：阶段 2 与阶段 3
  - 本任务只做这一件事：创建 `docker-direct-deploy` skill 并完成本地校验、自测与 6-review
  - 垂直切片目标：从"用户触发"到"生成可校验 workflow"的完整 skill 闭环
  - 输入条件：用户位置选择确认、实施文档与投影完成
  - 实现产出：`SKILL.md` + `assets/direct-deploy-workflow.template.yml`
  - 真实测试是否必需：是
  - 真实测试入口：模板 YAML 解析校验；无残留 grep；2 个模拟触发提示词自测
  - 真实测试依赖环境：Git Bash on Windows + Python PyYAML + grep
  - 真实测试样本 / 数据来源：上一轮已实现的 `docker-deploy.yml` 直传版本；桌面参考文件 `docker-image.yml`
  - 真实测试通过标准：模板 YAML 解析成功、无 Docker Hub 残留、模拟触发产出可校验 workflow
  - 测试点：触发描述覆盖面、模板占位符替换、校验章节可执行
  - `6-review` 风格回归点：frontmatter 合法、触发描述覆盖目标表述、模板结构与参考一致、注释/命名风格
  - 任务完成条件：`AC-01` skill 目录与文件存在；`AC-02` 模板 YAML 校验通过；`AC-03` 无 Docker Hub 残留；`AC-04` 2 个模拟触发自测通过。
  - 任务停止 / 结束条件：skill 落盘且校验、自测通过后停止；真实跨项目触发不阻塞本任务完成。
  - 阻断条件：YAML 校验失败、残留检查命中、模拟触发产出不可校验。
  - 前置依赖：阶段 1。
  - 下一任务依赖：无。
  - 预计触达文件数：3（SKILL.md、模板、6-review 记录；外加实施总览与 PROJECT_CURRENT 等非代码产物）。

## 6. 现状与落点
- 涉及目录：`C:\Users\luode\.zcode\skills\docker-direct-deploy\`
- 涉及文件 / 模块：`SKILL.md`（新增）、`assets/direct-deploy-workflow.template.yml`（新增）
- 复用点：上一轮 `docker-deploy.yml` 直传实现作为模板蓝本；桌面参考文件 `docker-image.yml` 结构
- 需要新增的内容：完整 skill 目录
- 新增文件清单（目录树）：
```text
C:\Users\luode\.zcode\skills\docker-direct-deploy\
├── SKILL.md                                    # skill 定义：触发描述、生成步骤、参数清单、硬规则、校验
└── assets\
    └── direct-deploy-workflow.template.yml     # 通用占位符模板，供生成时替换
```

## 7. 方案选择
- 方案 A：用户级 `~/.zcode/skills/` 放泛化占位符模板（用户选择）。
- 方案 B：项目内 `.agents/skills/` 放 new-api 专用模板。
- 方案 C：只写 SKILL.md 不附模板。
- 推荐方案与原因：方案 A 已由用户选定——用户级跨项目复用 + 附模板保证快速生成。

## 8. 实施步骤
1. 第一步：固化实施文档与项目记忆。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-SKILL-01`
   - 所属阶段：阶段 1
   - 对应最小任务：`TASK-SKILL-01`
   - 本步只做：写入本总览、`PROJECT_CURRENT.md`
2. 第二步：创建 skill 目录与文件。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-SKILL-01`
   - 所属阶段：阶段 2
   - 对应最小任务：`TASK-SKILL-01`
   - 本步只做：创建 `~/.zcode/skills/docker-direct-deploy/SKILL.md` 与 `assets/direct-deploy-workflow.template.yml`
3. 第三步：本地校验、自测与 6-review。
   - 所属周期：`CYCLE-DOCKER-DEPLOY-SKILL-01`
   - 所属阶段：阶段 3
   - 对应最小任务：`TASK-SKILL-01`
   - 本步只做：模板 YAML 解析、无残留检查、2 个模拟触发自测、生成 6-review 记录

## 9. 真实测试安排
- 真实测试总表：模板 YAML 解析属真实测试入口；模拟触发自测验证"skill 触发 → 生成 → 校验"链路。
- 免测任务及理由：无免测；本任务虽不修改可执行代码，但 skill 的模板与触发描述需真实校验。
- 步骤 1 真实测试 / 验证：文档字段完整性检查。
- 步骤 2 真实测试 / 验证：模板 YAML 解析、无残留 grep、模拟触发自测。
- 步骤 3 真实测试 / 验证：`AC-01` 到 `AC-04` 复核与 6-review。

## 10. 图形化执行路径
- 图形化决策：N/A + 原因 + 证据：单文件 skill 创建、单任务、单周期简单任务，无需 Mermaid 图。

## 10.1 图片资产决策、生成与引用
- 图片资产决策：`N/A + 原因 + 证据`：本任务不涉及视觉资产、截图或原型，无需生成图片。

## 11. 风险与阻断项
- 风险：模板占位符替换后可能产生 YAML 语法或 docker run 参数错误；触发描述覆盖不足导致 skill 不命中。
- 依赖：Python PyYAML、grep 可用；用户级 skill 目录可写。
- 任务停止 / 结束条件总表：skill 落盘 + 校验 + 自测通过即结束；真实跨项目触发由后续会话验证。

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
- 用户确认状态：关键决策已由用户选择（用户级位置）。

## 执行附录
- local 环境：Git Bash on Windows。
- 周期内执行步骤、命令、样本、预期失败、清理和回滚：
  - 步骤：创建 skill 文件 -> 模板 YAML 解析 -> 无残留 grep -> 模拟触发自测 -> 6-review。
  - 预期失败：PyYAML 未安装时报 `ModuleNotFoundError`；YAML 语法错误时抛 `yaml.YAMLError`；处理方式为修正文件后重跑。
  - 清理和回滚：skill 在用户级目录（仓库外），如需撤销直接删除 `~/.zcode/skills/docker-direct-deploy/`。

## 追踪附录
- `SRC -> DEC -> REQ/RULE -> AC -> CYCLE -> TASK -> TEST -> EVIDENCE` 双向追踪：
  - SRC：用户当前消息 + 上一轮已实现直传 workflow + 桌面参考文件
  - DEC：用户选择用户级 `~/.zcode/skills/`；skill 名 `docker-direct-deploy`；泛化占位符模板
  - REQ/RULE：skill-creator 流程；project-local-skills-rules（本项目已改用 `.agents/skills/`，用户级 `~/.zcode/skills/` 同样按目录自动发现）
  - AC：`AC-01` skill 目录与文件存在；`AC-02` 模板 YAML 校验通过；`AC-03` 无 Docker Hub 残留；`AC-04` 2 个模拟触发自测通过
  - CYCLE：`CYCLE-DOCKER-DEPLOY-SKILL-01`
  - TASK：`TASK-SKILL-01`
  - TEST：模板 YAML 解析 + 无残留 grep + 模拟触发自测
  - EVIDENCE：`doc/6-review/2026-08-15_141008_docker-direct-deploy-skill_6-review.md`
