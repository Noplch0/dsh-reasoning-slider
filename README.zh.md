<div align="center">

<img src="cover.png" alt="dsh-reasoning-slider 封面图" width="280" />

# dsh-reasoning-slider

**为 DeepSeek Harness 输入框模型席位量身打造的 Codex 风格推理努力（Reasoning Effort）调节滑块。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-%3E%3D%200.2.0--rc.2-blueviolet)](https://deepseek.com)
[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Web-brightgreen)]()

[简体中文](README.zh.md) • [English](README.md)

</div>

---

## 概述

**`dsh-reasoning-slider`** 是一个精致的 [DeepSeek Harness (DSH)](https://deepseek.com) 客户端 UI 插件。它将输入框（Composer）左下角的原生模型切换席位重塑为上下双层的 Codex 风格集成交互控件：顶部可随时点击展开模型列表，下方则提供一条横向平滑滑块，让您在所选模型支持的各个推理等级之间自由调节思考深度。

本插件通过 Cordis 插槽机制以 `-1` 优先级实现非破坏性无损挂载，优雅遮蔽默认的 `ModelSelect` 组件，并与 DSH 核心的模型目录及 `/model` 指令保持全局双向实时同步。

```
┌──────────────────────────────────────────────┐
│  DeepSeek V4.1 Flash                     ⌄   │   ← 顶部模型选择器（按供应商分组）
│                                              │
│                     最高                      │   ← 当前推理档位（层级着色）
│               更快消耗使用额度                 │   ← 顶级档位配额预警提示
│                                              │
│   ●──────●──────◉──────○──────○──────○       │   ← 磁吸滑轨与动态漂移粒子
└──────────────────────────────────────────────┘
```

---

## 核心特性

- 🎚️ **Codex 风格一体化控制台**  
  将模型选择与推理强度调节浓缩至同一个紧凑的输入框席位中。点击模型栏即可展开供应商模型列表，拖动下方滑块即可实时调节思考深度。

- 🎯 **自适应模型支持档位**  
  滑块刻度数量与名称完全动态匹配当前选中模型实际声明的推理能力（如 `off` 关闭、`minimal` 最低、`low` 低、`medium` 中、`high` 高、`xhigh` 极高、`max` 最高、`ultra`）。对于不支持推理等级的模型，自动隐藏滑块仅保留模型切换。

- 🎨 **层级感知配色与紫电流光**  
  - **渐进蓝调：** 随着档位由低到高，填充色从冰浅蓝（`#A9C9FA`）平滑过渡到经典深蓝（`#0169CC`）。
  - **顶级紫河流光：** 切换至最高档位时，触发标志性紫色渐变（`#3B45D2` → `#9C72FF`），并呈现无缝滚动的双层平移光河流光、右向左动态掠影以及“更快消耗使用额度”标注。

- 🧲 **17.5% 磁吸吸附手感与顺滑拖拽**  
  - 经过调校的 **17.5% 磁吸区间**：当滑块拖动到刻度附近时自动轻柔吸附就位，同时保留大部分滑轨空间的自然连续阻尼感，绝不发涩粘滞。
  - 拖拽过程中旋钮微放大（`1.08x`）并呈现浮起微投影，交互反馈细腻直观。

- 🌌 **程序化彗星粒子流场**  
  - 基于固定种子的轻量级确定性伪随机流场，无需每一帧重构 DOM 即可呈现平滑漂移。
  - 粒子数量与流速随档位梯度扩展：从低档位的 5 个粒子平缓漂移，到最高档位的 25 个高速粒子流；配合多边形连续渐变彗尾，告别断裂颗粒感。

- ⌨️ **全键盘导航与无障碍支持**  
  - 完备的键盘快捷操作：左右方向键 `←` / `→` 逐级切换，`Home` / `End` 键一键跳转至最低或最高档。
  - 原生 ARIA 语义化标签（`role="slider"`, `role="switch"`）、清晰可见的高对比度焦点环。

- ⚙️ **无缝融入插件设置页**  
  在系统设置中的**设置 → 插件 (`plugins.bundle.config`)** 页面注册专属配置卡片，支持自由切换粒子动效策略（*所有档位开启*、*仅在最高档开启* 或 *完全关闭*），设置独立保存在浏览器的 `localStorage` 中。

- 🌐 **原生双语国际化（i18n）**  
  内置简体中文（`zh-CN`）与英文（`en-US`）语言字典，自动跟随 DSH 系统语言环境平滑切换。

- 🛡️ **非破坏性插槽遮蔽与容错恢复**  
  - 以优先级 `-1` 挂载于 `conversation.input.model` 插槽。原生席位依然保留在底层，停用或卸载本插件时系统会立即无痕恢复原生界面。
  - 内置多阶指数退避重试机制，从容应对会话延迟绑定或远程解析器初始化耗时的情况。

---

## 环境与系统要求

- **DeepSeek Harness** `0.2.0-rc.2` 或更高版本
- 宿主系统内置配置插件：
  - `dsh-client-ui-model-selection`
  - `dsh-client-locale`

---

## 安装指南

### 方法一：通过 DeepSeek Harness 界面安装（推荐）

1. 启动 **DeepSeek Harness** 客户端。
2. 依次进入 **设置 → 插件 → 添加插件**。
3. 输入本项目的绝对路径：
   ```text
   path\to\dsh-thing-effort
   ```
4. 重启一次 DeepSeek Harness（配置文件解析与捆绑包加载在启动时执行）。

> **后台工作流程：**  
> DSH 会自动执行 `pnpm add` 安装包，将其记录在 `dsh.profile.bundles` 中，并应用捆绑包补丁（[`cordis.patch.yml`](cordis.patch.yml)）。  
> 如需卸载：前往**设置 → 插件**，找到 `dsh-reasoning-slider` 点击**卸载**即可。

---

### 方法二：通过 PowerShell 脚本手动安装（免 pnpm / 离线）

如果您不想让 pnpm 变更环境依赖，可以使用仓库内附带的 PowerShell 脚本直接对配置档进行补丁注入：

```powershell
# PowerShell 7
pwsh -File scripts\install.ps1

# Windows PowerShell 5.1（临时绕过本次执行策略）
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install.ps1
```

#### 安装脚本特性与参数
- **目标配置目录：** 默认指向 `$env:DSH_HOME\profiles\desktop`（或 `~/.dsh/profiles/desktop`）。您可以通过 `-ProfileDir` 指定自定义路径：
  ```powershell
  pwsh -File scripts\install.ps1 -ProfileDir "C:\path\to\dsh\profile"
  ```
- **自动备份防误触：** 每次修改前都会将现有 `cordis.patch.yml` 备份为 `cordis.patch.yml.bak-<时间戳>`。
- **互斥检测保障：** 若检测到已通过 UI 界面安装，脚本会自动阻止执行，防止双重挂载。
- **卸载还原：**
  ```powershell
  pwsh -File scripts\install.ps1 -Remove
  ```

> [!WARNING]  
> 请在“方法一”与“方法二”中**仅选择一种**进行安装。若两种方式同时执行，会导致插件被注册两次，从而引发插槽冲突。

---

## 架构设计与目录结构

```
dsh-thing-effort/
├── cover.png              # 封面预览图
├── icon.svg               # 矢量图标文件
├── cordis.patch.yml       # Cordis 捆绑补丁声明
├── package.json           # 包定义与客户端分发入口
├── lib/
│   ├── index.js           # 宿主 Node 端入口（加载器树桥梁）
│   └── client.js          # 浏览器端客户端代码（UI 席位与渲染引擎）
└── scripts/
    └── install.ps1        # 免 pnpm 的 PowerShell 安装脚本
```

### 核心模块解析

| 文件路径 | 运行环境 | 说明 |
|---|---|---|
| [`lib/index.js`](lib/index.js) | Node / 宿主端 | 极简导出桩，使插件能够在 Cordis 的 Loader 树中正常登记。 |
| [`lib/client.js`](lib/client.js) | Web / 客户端 | 完整的浏览器端 UI 运行时，包含滑块几何数学计算、React 组件、CSS 动画及插槽注入。 |
| [`cordis.patch.yml`](cordis.patch.yml) | 补丁配置 | 将 `reasoning-slider` 插入至 Cordis 加载流的 YAML 补丁。 |
| [`package.json`](package.json) | 元数据 | 声明 `dsh.bundle` 和 `dsh.client`，通过 `./client` 输出前端 bundle。 |
| [`scripts/install.ps1`](scripts/install.ps1) | 辅助脚本 | 具备备份与撤销能力的自动化配置档补丁注入脚本。 |

### Cordis 依赖注入与生命周期

前端插件严格按序通过 Cordis 依赖注入树激活：

```js
// 核心根服务依赖
inject: ['locale', 'slots', 'sessions']
```

1. **字典初始化：** 在 `reasoning-slider` 命名空间下注册 `zh` 与 `en` 国际化字典。
2. **作用域生命周期继承：** 通过 `ctx.inject(["modelDirectories", "remote", "remote.session"], ...)` 获取模型会话范围，确保席位生命周期与底层模型解析器完全同生共死。
3. **插槽注册（`priority: -1`）：** 抢占 `conversation.input.model` 插槽。在单席位模式下，Cordis 会优先渲染数值最小的有效项，因此成功接管原生 `ModelSelect`（优先级 `0`）；当本插件停用时原生席位无缝复原。
4. **配置卡片注入：** 将 `SettingsPanel` 注册到 `plugins.bundle.config` 插槽中。

---

## 设计参数与动效规格

### 滑块几何规范

所有界面尺寸均经过像素级调校：

| 视觉元素 | 参数规格 | 详细说明 |
|---|---|---|
| **滑轨高度** | `24px` | 胶囊形完全圆角（`border-radius: 999px`） |
| **旋钮直径** | `26px` | 居中覆盖于滑轨上方，带微投影 |
| **行程内缩** | `13px` (`KNOB_R`) | 旋钮行程在两端各向内缩进半个半径，防止超出轨道边缘 |
| **刻度定位公式** | `13px + (i / (n-1)) * (100% - 26px)` | 共有 $n$ 个档位时，第 $i$ 个刻度的实际物理定位 |
| **下潜隐藏量** | `KNOB_R - sqrt(KNOB_R² - TRACK_R²)` | 精确计算填充条伸入旋钮底部的下潜深度，杜绝任何接缝或漏光 |
| **磁吸吸附窗** | `17.5%` (`0.175`) | 刻度间隙内的磁吸抓取阈值 |

### 粒子流场数学

填充条内部程序化漂移的宇宙粒子流：
- **顶级档位（最高）：** 恒定 **25 个粒子**，**1 秒漂移周期**，触发紫色双层流光和动态高光掠影。
- **中间档位：** 依据档位索引线性缩放：
  $$\text{粒子数} = \operatorname{round}\left(5 + 15 \times \frac{i}{n - 2}\right)$$
  $$\text{漂移周期} = 10 - 8 \times \frac{i}{n - 2}\text{ 秒}$$
- **彗尾渲染：** 结合透明度连续衰减梯度（`TRAIL_RAMP`）与多边形裁剪蒙版（`TRAIL_OUTLINE`），杜绝离散阶梯杂边。

---

## 配置与偏好管理

插件配置存储在当前浏览器的 `localStorage`（键名 `dsh-reasoning-slider/prefs`）中：

- **显示粒子：** 一键开启或关闭整个滑轨的背景漂移粒子动画。
- **只在最高档显示粒子：** 开启后，其余普通档位保持纯净纯色，仅在最高档位展现粒子特效。

前往 **设置 → 插件 → dsh-reasoning-slider** 即可随时调整。

---

## 注意事项与局限说明

- **版本依赖：** 需配合 DeepSeek Harness `0.2.0-rc.2` 或更高版本运行。
- **模型元数据依赖：** 推理等级依赖上游模型在 `modelDirectories` 中的定义；若模型本身未提供推理等级数据，将仅保留普通模型选择器。
- **路径变更：** PowerShell 脚本采用当前绝对路径进行配置注入。如果移动了本仓库文件夹，请重新运行一次 `scripts\install.ps1`。

---

## 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。
