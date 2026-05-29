# 股票策略系统设计

## 概述

为股票模块增加策略管理能力：定义策略（由多个指标条件组成）、绑定策略到股票、更新指标值时自动检查条件并触发提醒。

核心场景：用户定义一个策略"均线金叉突破"，包含 RSI<70、MA5>MA20 两个条件，绑定到某只股票。当用户更新该股票的指标值后，系统自动判断条件是否全部满足，满足则通过现有 TodoReminder 弹窗提醒。

统计收益功能不在本期范围内。

## 数据模型

### 新增三张表

#### stock_strategy — 策略定义

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 时间戳 ID |
| name | VARCHAR(100) | 策略名称 |
| description | TEXT | 策略描述 |
| direction | TINYINT | 触发方向：1=买入信号, 2=卖出信号 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### stock_strategy_condition — 策略的指标条件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 时间戳 ID |
| strategy_id | BIGINT | 所属策略 |
| indicator_name | VARCHAR(50) | 指标名，如 RSI、MA5 |
| operator | VARCHAR(10) | 比较符：>、<、>=、<=、=、!= |
| threshold | VARCHAR(50) | 阈值，字符串存储 |
| created_at | TIMESTAMP | |

#### stock_strategy_binding — 策略与股票的绑定

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 时间戳 ID |
| strategy_id | BIGINT | 所属策略 |
| stock_code | VARCHAR(20) | 股票代码 |
| stock_name | VARCHAR(50) | 股票名称（冗余） |
| enabled | TINYINT(1) | 1=启用, 0=暂停 |
| created_at | TIMESTAMP | |

### 复用已有表

**stock_indicator** 保持不变，继续存每只股票的指标当前值（name + value）。

### 不使用外键约束

遵循项目规范，只用字段存储关联 ID，不加 FOREIGN KEY。

## 触发提醒逻辑

### 触发时机

用户更新某只股票的指标值（新增或修改 `stock_indicator`）时，后端自动执行：

1. 查该 `stock_code` 所有 `enabled=1` 的绑定（`stock_strategy_binding`）
2. 对每个绑定的策略，查出所有条件（`stock_strategy_condition`）
3. 逐条比对：拿该股票在 `stock_indicator` 中的当前值，与条件的 operator + threshold 比较
4. **全部条件满足**（AND 关系）→ 触发提醒

### 比较规则

- 指标值为空 → 该条件视为不满足，不触发
- 先尝试转数值比较，转不了则字符串相等比较
- 同一次指标更新只触发一次提醒，不重复弹

### 提醒方式

复用现有 `TodoReminder` 组件。改动点：

- TodoReminder 泛化为通用提醒组件，支持不同来源类型（待办到期、策略触发等）
- 通过 `type` 字段区分来源，组件内部根据 type 渲染不同标题、图标、操作按钮
- 策略触发时：标题"策略触发"，内容为股票名(代码) + 策略名 + 方向(买入/卖出) + 条件达成明细
- 操作按钮："打开持仓"（跳转股票模块）+ "知道了"（关闭）
- 保持 30 秒自动消失逻辑

### 后端到前端通信

后端判断条件满足后，通过 IPC `stock-strategy-alert` 发送到前端，前端收到后组装成 TodoReminder 能接收的数据格式，推入提醒队列。

## UI 设计

### 策略管理入口

股票窗口新增第三个 Tab："策略"，与现有"交易记录"、"持仓"并列。

### 策略 Tab 布局

**左侧：策略列表**

- 展示所有策略，每条显示：策略名、方向标签（买入/卖出）、绑定股票数量
- 顶部"新建策略"按钮

**右侧：策略详情（选中某策略后展示）**

- 基本信息区：策略名、描述、方向（可编辑）
- 条件列表区：每行一个条件（指标名 + 运算符 + 阈值），可增删
- 绑定股票区：已绑定的股票列表，可添加/移除/启用/暂停

### 持仓 Tab 增强

持仓详情面板（已有指标显示区域）中增加"已绑定策略"区域，可快速绑定/解绑策略到当前股票。

### 指标更新触发流程

现有指标编辑保存 → 后端自动检查绑定策略的条件 → 条件满足 → IPC 推送 → TodoReminder 弹出提醒

## 技术实现要点

### 后端（electron/stock-logic.js）

- 新增 stock_strategy、stock_strategy_condition、stock_strategy_binding 三个模块的 CRUD
- 在现有 stock_indicator 的 save/update 逻辑后，增加策略条件检查函数
- 检查函数返回触发的策略列表，由 main.js 通过 IPC 推送到前端

### 前端（src/components/StockWindow.tsx）

- 新增策略 Tab 及其子组件
- 持仓详情面板增加绑定策略区域
- 监听 `stock-strategy-alert` IPC 事件，组装数据推入提醒队列

### TodoReminder 改造

- 提醒数据结构增加 type 字段
- 组件内部根据 type 渲染不同内容
- 保持向后兼容，现有待办提醒逻辑不受影响

### 建表

在 electron/schema.js 或启动时自动建表，与现有建表逻辑一致。
