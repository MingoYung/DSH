# 动画源文件

这里保留定稿第三版动画的 Canvas 几何、动效、音轨和角色源片段，以及0.3.0的离线方形母版实验。使用静态文件服务打开本目录 `index.html` 可查看历史16:9设计预览。0.4.0的实际运行构图以根目录 `runtime/scene/` 与 `runtime/stage.js` 为准；根目录 `preview.html` 使用当前插件播放器。本目录不再表示现行的窗口适配方式。

`tools/build_audio.py` 需要 Python 与 NumPy，生成22秒原声音轨。`animation.js` 与 `morph.js` 使用同一时间轴和原始几何；保留 `assets/`、`audio/`、`video/` 的相对位置。预览不需要访问 DSH 或用户账户。

许可见项目根的 LICENSE、CREDITS.md 与 licenses/。角色影像及其原声来自已注明许可的上游，鲸鱼几何来自 DSH。
