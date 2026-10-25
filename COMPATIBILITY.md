# DSH NEXT 启动阶段与兼容边界

核对日期：2026-10-25。目标：Windows DSH NEXT 2.0.19-next，内核 0.2.1-rc.2。

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

## 完整首帧支持需要什么

适合上游提供一个受限的静态启动载体：初始 HTML 即加载已选动画，资源来自 native 静态路由，正常插件加载后接管同一个播放器。载体应限制路径及配置字段，恢复/安全模式跳过，卸载可清除。媒体载入不能依赖尚未启动的 Host，也不能为此把访问令牌放入 HTML。

本插件没有覆盖 ASAR、替换快捷方式或安装外置启动器。这些操作会改变宿主维护边界，不能宣称是普通插件在当前接口下已经实现了首帧替换。

## 画面适配

仍使用定稿的单个 1920×1080 / 30fps / 22 秒视频与其中的音轨。中央完整等比构图由原视频呈现，背景根据同帧边缘颜色延展到窗口其余区域。超宽、16:10、4:3 和竖窗均不裁切中央内容。极窄窗口保留完整画面时，主体会相应缩小；扩展背景不虚构原素材之外的人物内容。
