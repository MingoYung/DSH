# 来源、作者与许可

## 0.7.0 当前三款作品

本版随包媒体为 DeepSeek · 鲸启、Codex · 构想成形、Claude Code · 光标唤醒。前段程序动效、排版、衔接、程序音效与播放器由本项目制作；新增角色定帧使用内置 image_gen，角色显形及“欢迎回来”使用火山方舟 Seedance 2.0 Fast 辅助生成。人物是独立同人设计，不是厂商官方拟人形象。Codex 和 Claude Code 的变形动作参考本项目自行生成的 DeepSeek005 视频，未拼接他人的欢迎角色片段。

| 当前媒体 | 规格 | SHA256 |
| --- | --- | --- |
| `media/boot.mp4`（DeepSeek） | 22秒，1280×720，30fps，H.264/AAC | `7cd3f3bb33afa18ee2591e10e0d52c6838bd7aa09518780c90628fac3e752849` |
| `media/codex.mp4` | 22秒，1280×720，30fps，H.264/AAC | `9a3a11a7edd9ff1c2185e293f69aed75495f935c665ecb09b3df751900b306a5` |
| `media/claude-code.mp4` | 22秒，1280×720，30fps，H.264/AAC | `24968a5910759fa1824efbeb6db662c97d5d22754ad4898259f2ca7ddb5787ea` |

项目原创程序代码为 [MIT](LICENSE)；本项目拥有可许可权利的新增动画、音效、原创角色素材在[范围说明](licenses/ORIGINAL-ANIMATIONS-CC-BY-4.0.md)下采用 CC BY 4.0。AI 生成服务的输出仍按相应服务条款处理；本项目只授予自己能够授予的权利。以下品牌及第三方素材不因出现在视频中而被重新授权：

- **DeepSeek / DSH 鲸鱼几何**：来自 DeepSeek Harness 的 `FishLogo.tsx`，固定提交 `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`，Copyright (c) 2026 DeepSeek，保留 [MIT 正文](licenses/deepseek-harness-MIT.txt)。产品名和商标权不由本项目授予。
- **Codex 标识**：源自官方 OpenAI Codex 桌面应用 `26.1023.6621.0` 所带 `webview/assets/codex_new-f14177b03534.svg` 的云形终端图形。图形及产品名称归 OpenAI；不将其声明为本项目 MIT / CC BY 原创素材，不暗示官方背书。人物、服装、配色与动效是本项目独立设计。
- **Claude Code Clawd 像素形象**：忠实转录官方 `@anthropic-ai/claude-code@2.1.177` 所带终端块字符几何，使用 default、look-right、arms-up 姿势；真彩色 `#D77757` 为所核 CLI 默认值。官方源产物 SHA256 `408ddf27d45fc6b6516843c0513072bc0f474d7bface60ae8bbbc633bef9feb2`。Anthropic 产品名、商标及品牌/吉祥物图形保留权利，不随项目代码 MIT 或项目媒体 CC BY 重新授权。铜棕发编程学者是新设计，不是官方 Clawd 拟人形态。

程序排字通过运行环境字体绘制，视频中保留其渲染结果；包内不分发字体文件。新增媒体制作工程与详细提示词见[动画库 starter-v1.0.0](https://github.com/MingoYung/dsh-awakening-library/releases/tag/starter-v1.0.0)及该 tag 下的 `works/` 来源页。

## 当前可选首屏兼容安装器

桌面接线基于 Anywhere Labs DSH Desktop NEXT 2.0.19-next 与2.0.21-next的两种已核验构建，Copyright (c) 2026 Anywhere Labs，保留 [MIT 许可](licenses/dsh-desktop-MIT.txt)。2.0.19-next来源及历史通知继续保留；2.0.21-next公开源码固定于 [23d72a157d6df9101476caa8baa65c6d75b26fdd](https://github.com/anywhere-labs/dsh-desktop/tree/23d72a157d6df9101476caa8baa65c6d75b26fdd/dsh-desktop-next)，所带DeepSeek Harness内核为0.2.1-rc.4。对应定点接线保留原生boot文档世代、`documentId` / `profile`、真实界面健康报告及请求鉴权，不修改EXE或Electron fuse。每种构建按各自EXE/原包摘要及受管理范围校验备份，不跨构建恢复。定点 ASAR 编解码与完整性计算包含 `@electron/asar@4.0.1` 的对应 MIT 实现，正文在 `tools/native-install/vendor/`。包内不附带DSH EXE、完整app.asar或其原包备份；许可通知覆盖所引用的相应发布者代码，不表示分发完整宿主。兼容层需明确安装/更新并重启，不是所有 DSH 环境的普通插件接口。

## 历史版本来源记录（0.6.1 及更早）

下方保留旧作品的来源与通知，便于核对仍可下载的旧 tag。旧版第三方角色片段不作为0.7.0三款媒体的来源，也不作为新片段的原创声明。

### 旧版记录

《鲸启》包含本项目制作的动效和带许可引用的第三方素材，不能将整部动画描述为全部原创。插件及本项目原创代码采用 [MIT](LICENSE)；第三方素材分别保留原作者、版权和许可。

| 内容 | 来源与作者 | 本项目处理 |
| --- | --- | --- |
| 前段文字组装、鲸鱼材质聚散、粒子归流、连接光带、程序音效、播放器及窗口构图 | 本项目制作 | 动效、衔接与响应式实现 |
| DSH 鲸鱼标志的原始几何 | [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，Copyright (c) 2026 DeepSeek | 沿用原始轮廓制作动效，保留 MIT 许可 |
| 约13.6秒起的角色动画及原声欢迎语 | [lxj5820/dsh-boot-animation](https://github.com/lxj5820/dsh-boot-animation)，Copyright (c) 2026 dsh-boot-animation contributors | 引用片段、拼接、适配取景与编码；角色影像和声音不作为本项目原创声明 |

## 角色片段与原声的精确来源

- 上游文件：[assets/videos/1.mp4，固定版本](https://github.com/lxj5820/dsh-boot-animation/blob/1a97e3b06c584b29d32747b22d8791480627fdd6/assets/videos/1.mp4)。
- 固定提交：`1a97e3b06c584b29d32747b22d8791480627fdd6`。
- 原始文件 SHA256：`970afeb9b8a981de88abc3997adba2d4aef7624d45b3deac9bab1033613ad937`。
- 上游[该版本 LICENSE](https://github.com/lxj5820/dsh-boot-animation/blob/1a97e3b06c584b29d32747b22d8791480627fdd6/LICENSE)明确声明 `assets/videos/` 下的三段 MP4 与代码采用同一 MIT 许可。这里记录的是上游的授权声明。
- 本项目随分发副本保留原版权及完整许可：[licenses/character-animation-MIT.txt](licenses/character-animation-MIT.txt)。
- 通过用户提供的 [Something11235/dsh-video-skin](https://github.com/Something11235/dsh-video-skin) 发现该片段；实际采用上述上游原文件。

片段原始规格为1280×720、24fps，包含原声。本项目把它接入22秒时间轴，并按视口重新取景；保留欢迎语原声及口型，没有重新配音或克隆声音。主音轨有拼接与统一音量处理，后续构图修订沿用已确认版本的音轨。

## DSH 标志

- 来源：[FishLogo.tsx，固定版本](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/client/ui-primitives/src/FishLogo.tsx)。
- 固定提交：`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`。
- 许可及版权正文：[licenses/deepseek-harness-MIT.txt](licenses/deepseek-harness-MIT.txt)。

本项目是社区兼容插件，不表示 DeepSeek 或 DSH 官方发布、合作或背书。`dsh-550c-boot` 提供了统一主题与文字叙事的参考思路；本项目没有采用其电影影像。

## 可选首屏兼容安装器

- 桌面接线与随包的定点替换JavaScript基于 [Anywhere Labs DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) 的NEXT 2.0.19-next已发布构建，Copyright (c) 2026 Anywhere Labs，MIT。保留许可正文：[licenses/dsh-desktop-MIT.txt](licenses/dsh-desktop-MIT.txt)。本项目修改了初始页面接线，并增加受限原生载体；没有附带DSH EXE或完整ASAR安装包。
- ASAR头部Pickle编码与完整性计算使用 [electron/asar](https://github.com/electron/asar) `@electron/asar@4.0.1` 的对应实现，Copyright (c) 2014 GitHub Inc.，MIT。相关代码与完整许可保存在 [tools/native-install/vendor/](tools/native-install/vendor/)。
- 安装/恢复状态机、版本校验、独立退出等待与设置入口由本项目制作。工具只在用户明确确认后修改受支持的本机桌面资源，不能把该能力描述为所有DSH环境天然具备的普通插件首屏接口。
