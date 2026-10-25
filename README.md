# 鲸启 · DSH Awakening

以 DSH 鲸鱼标志展开的22秒启动动画，包含文字组装、鲸鱼材质聚散、星点归流、连接光带，以及带原声欢迎语的角色片段。提供独立设置、完整预览和随窗口连续调整的构图。

项目地址：<https://github.com/MingoYung/dsh-awakening>。这是社区兼容插件，不表示官方发布或背书。

**素材说明：** 前段动效、排版、程序音效和播放器由本项目制作；约13.6秒起的角色影像及原声欢迎语引用自 [lxj5820/dsh-boot-animation](https://github.com/lxj5820/dsh-boot-animation) 的 `assets/videos/1.mp4`，不是本项目原创角色短片。该上游固定版本将视频列入 MIT 许可，本项目保留原作者版权与许可正文。完整来源、范围及版本见 [CREDITS.md](CREDITS.md)。

## 安装

使用 DSH 原生插件管理器添加已解压插件目录的绝对路径，或在 DSH 终端中执行：

```sh
dsh plugin add /absolute/path/to/dsh-awakening
```

首次安装后重启 DSH。本地 link 安装应保留插件目录；卸载通过 DSH 插件管理器移除。仓库和预构建 `.tgz` 均包含客户端构建结果及媒体，正常安装不需要执行构建脚本。未发布至 npm，请勿从同名 npm 包推断其来源。

## 设置

入口：**DSH 设置 → 鲸启启动动画**。

| 设置 | 默认值 | 行为 |
| --- | --- | --- |
| 开启启动动画 | 开 | 关闭自动播放，仍可手动预览 |
| 播放频率 | 每次启动 | 可改为每日首次；同一窗口刷新不反复播放 |
| 播放声音 | 开 | 包含界面音效与角色欢迎语 |
| 音量 | 85% | 0–100%，由宿主确认保存 |
| 启动等待上限 | 45秒 | 高级项，25–60秒；超时让出界面 |

支持完整预览、恢复默认、Esc 和点击跳过。设置页提供素材来源和许可入口。配色、时长与欢迎语保持确认版本。

## 自适应

0.4.0 根据窗口客户区的实际宽高连续计算构图，不切换一组固定比例视频，也不使用0.3.0的方形补边方案。拉动窗口、最大化或全屏不重播、不切换音轨。前段按源几何绘制，后段按焦点取景；外围发梢和尾鳍可出画，脸与口型保留在常见桌面及竖屏构图内。

竖版归流阶段跟随一条清楚可读的左光带，再在人物轮廓形成时归中；横屏保留双侧光带。右光带从右上向左下描出，与后段走向一致。没有外围模糊、镜像或人物边缘透明度遮挡。

唯一原生 video 保存认可版画面和原声音轨，并提供播放时间；Canvas按同一时间绘制，不再开第二个音轨。渲染尺寸与频率有限制，调整窗口保留材质缓存。渲染装饰失败时回退到原视频，不阻塞 DSH。

打开包内 `preview.html` 可以使用同一个插件播放器做独立预览；它不代表已经验证了实际DSH启动。

下图来自独立浏览器夹具中的插件Canvas（1280×800及540×960），用于展示构图，不是DSH实际启动截图。

![前段鲸鱼](screenshots/preview-whale-desktop.png)

![桌面欢迎段](screenshots/preview-welcome-desktop.png)

<img src="screenshots/preview-welcome-portrait.png" alt="竖窗欢迎段" width="270" />

## 启动时机与退出

验证目标：Windows DSH NEXT 2.0.19-next / DSH 内核0.2.1-rc.2。

**这版 NEXT 在 Host 启动前显示内置加载页，普通插件只能在 Host 就绪后的注入时机接管，不能覆盖最早桌面首帧。** Stable与NEXT的窗口创建顺序不同，详见 [COMPATIBILITY.md](COMPATIBILITY.md)。本插件没有改安装包或快捷方式。

- 同步注册文档注入；资源和设置服务按可用性接入。
- 完整动画结束且工作界面就绪后退出；随时可跳过。
- 媒体失败、宿主加载页报告失败或超时均让出界面。
- 有声自动播放被阻止时停在起点提示点击，不会擅自静音播放口型。
- 设置由宿主 configForms 保存；本地存储只记录播放频率。
- 视频路由支持 GET、HEAD 和 Range。

## 开发

```sh
npm ci --ignore-scripts
npm run build
npm pack --ignore-scripts
```

`scripts/build.mjs` 使用 esbuild 后包装 DSH `window.__ModuleLoader__.load` 注册工厂。不要把裸 CommonJS 脚本直接作为客户端入口。

| 文件 | 职责 |
| --- | --- |
| `lib/index.js` | Host设置、文档注入和媒体路由 |
| `lib/media.js` | 受限文件读取及Range响应 |
| `runtime/bootstrap.js` | 播放、就绪、跳过和退出控制 |
| `runtime/stage.js` | 实时尺寸、单时钟绘制、容错和清理 |
| `runtime/scene/` | 确认版几何、材质、光带与响应式镜头 |
| `src/client.jsx` | 独立设置与来源入口 |
| `media/boot.mp4` | 认可版v3 master及其原声音轨 |
| `media/boot-layout.json` | 动态构图说明 |

插件原创代码 MIT。第三方图形、影像与原声按各自保留的许可分发，见 `CREDITS.md` 和 `licenses/`。
