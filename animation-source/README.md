# 动画源文件

这是定稿第三版动画的 Canvas 几何、动效、音轨和角色源片段。使用 Python `http.server` 等静态文件服务打开本目录 `index.html` 可以查看设计预览；该页面展示原始 16:9 动画，插件的窗口边缘延展由上一层 `runtime/stage.js` 实现。

`tools/build_audio.py` 需要 Python 与 NumPy，生成22秒原声音轨。`animation.js` 与 `morph.js` 使用同一时间轴和原始几何；保留 `assets/`、`audio/`、`video/` 的相对位置。预览不需要访问 DSH 或用户账户。

许可见项目根的 LICENSE、CREDITS.md 与 licenses/。角色影像及其原声来自已注明许可的上游，鲸鱼几何来自 DSH。
