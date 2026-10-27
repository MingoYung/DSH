# DSH NEXT 启动阶段与兼容边界

核对日期：2026-10-27。目标：Windows DSH NEXT 2.0.19-next，内核 0.2.1-rc.2。

## 为什么先出现默认加载页

本机安装包的主进程在 `runtime.start()` 后立即 `openMain()`，两个过程并行。`dsh-app://app/` 的初始 HTML 由桌面安装包提供，前端构造入口时先创建默认 `HARNESS / Loading plugins…` 卡片，然后调用 `dshDesktopBoot.ready()`。

该 bridge 请求的主进程处理器先等待 `runtime.startup`，再返回 `runtime.injections()`。因此当前第三方插件的 head 注入表只能在 Host 启动之后进入已存在的文档；`placement: head` 在这里不等于初始 HTML 的解析时机。

上游源码对应入口：

- [NEXT web-document.ts](https://github.com/anywhere-labs/dsh-desktop/blob/master/dsh-desktop-next/src/web-document.ts)
- [NEXT preload-app.ts](https://github.com/anywhere-labs/dsh-desktop/blob/master/dsh-desktop-next/src/preload-app.ts)
- [NEXT main.ts](https://github.com/anywhere-labs/dsh-desktop/blob/master/dsh-desktop-next/src/main.ts)

本地编译产物与上游分支不保证逐行相同。上述时序以本机安装包的提取副本为直接证据，没有为检查修改安装包。

## 开源项目对照

查阅了 [dsh-550c-boot](https://github.com/yannicksong0106/dsh-550c-boot)、[dsh-video-skin](https://github.com/Something11235/dsh-video-skin)、[dsh-boot-animation](https://github.com/lxj5820/dsh-boot-animation) 的 Host 实现。它们均通过 `webserver/index-inject` 接入，无法跨越当前 NEXT 的 Host 就绪等待。

本版采用同类项目中可借鉴的接入方式：`inject=[]`，同步注册文档监听，再按可用服务注册资源路由和设置。这样降低服务依赖造成的额外等待，并保留有界退出；它不是 pre-Host 首屏能力。

## 0.6.0可选首屏兼容层与作品切换

首屏兼容层把已验证播放器接入初始HTML，使用原生静态媒体端点，不等待Host。Host随后复用同一个API、video、Canvas及播放时间。账号、会话、Host token和其它插件配置不进入首屏HTML或资源缓存。

目前支持Windows DSH NEXT 2.0.19-next的已核验EXE与ASAR构建。完整性白名单和精确文件范围在`tools/native-install/policy.json`；显示版本相同而构建不同也会拒绝。已识别的原包、前一版本机兼容包及本版受管理兼容包可检测，未知修改保留原状。

用户从设置页明确确认后，安装器先完成准备、备份和独立脚本握手，客户端才调用桌面公开退出接口。脚本等待所有DSH进程结束，双重检查当前状态后原子替换并重新打开。退出取消或超时不强杀进程；准备或握手失败不让客户端继续退出。恢复默认首屏使用同一套受检查的流程。

原始ASAR备份为安装目录`resources/.dsh-awakening-backup/app.asar`。EXE、系统安全开关、快捷方式和用户Profile不由工具改写。DSH升级后必须重新核验，不自动复用旧补丁。

兼容层每次初始页面读取当前已保存的7个设置（包含animationId与videoFit）；关闭、禁用、卸载、未审查播放器字节、安全/恢复模式均回到默认启动。只支持静态可判定的配置结构，遇到可能影响本插件的动态表达式、未知控制行或复杂覆盖时保守跳过。资源按已审查字节进入原生固定缓存，活动revision受保护，历史有界。

0.5兼容包可以从原始备份升级到0.6；需明确安装并重启一次。此后启动从用户动画库读取所选MP4/WebM，核对固定内容文件名、长度、SHA256、容器头和路径后缓存为不可变媒体，不执行作者代码或请求社区网络。普通视频不挂内置鲸鱼Canvas，Host接管保留同一个video及音轨。原始文件或索引异常时提前层跳过，Host后续提示并回退内置鲸启。内置作品启动不依赖动画库索引健康。

`.gitattributes`固定了运行时与原生payload的字节，避免源码clone时的自动换行破坏完整性校验；预构建包与GitHub源码归档包含同样的受核字节。

普通Web环境只能使用动画与预览，不能触发本机安装/退出。工具API要求原生私有请求标记、同源JSON及当前Host动作令牌；安装没有npm生命周期脚本，不会在添加插件时悄悄执行。

## 画面适配

0.4.0替换了0.3.0的方形补边与尾段边缘透明度方案。前段由源几何实时绘制，画布铺满窗口实际客户区，按宽高连续调整构图；不依赖固定比例文件。竖窗在归流阶段跟随左侧光带，人物轮廓形成时回到面部。右侧光带改为从右上向左下描出。

尾段使用认可版1920×1080母版，按焦点满幅取景。没有周边模糊、镜像或尾段透明度遮挡；人物外围发梢和尾鳍在窄窗会出画。有限源画幅无法在任意比例下同时完整保留所有边缘：常见横屏、方窗与竖窗以脸、口型和主要动作可读为目标，极端长条窗不承诺完整构图。

声音和时间由同一个video提供。ResizeObserver与窗口resize只更新画布几何，不重新创建播放器、不seek、不重播。输出DPR上限1.5、栅格最长边上限2560、绘制上限30fps；隐藏页暂停绘制，恢复后追随当前媒体时间。Canvas异常时恢复原生video的cover显示，并保留退出机制。

包内preview.html运行与插件相同的播放器代码，适合验证尺寸和声音；独立浏览器检查不能替代实际DSH启动确认。版本对应的验证范围见更新记录。

## Stable与NEXT差异

公开[Stable main.ts](https://github.com/anywhere-labs/dsh-desktop/blob/master/dsh-plugin-desktop/src/main.ts)先等待boot，再mount主窗口；NEXT在内核启动期间已经打开窗口。因此Stable的首个有效画面可以直接呈现插件动画。参考录屏从真实点击图标开始，约0.2–0.5秒为黑窗、约1秒鲸鱼淡入，未观察到默认文字加载卡片；无法从录屏确认作者使用的桌面版本。

可选直启入口也能在原生媒体窗口中先播放、同时启动NEXT，并在完成后交接。它需要处理重复播放抑制、就绪信号和窗口位置，属于附属启动入口，不等于当前插件从原NEXT入口已支持pre-Host。当前代码没有自动替换用户快捷方式。
