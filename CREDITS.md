# 来源、作者与许可

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
