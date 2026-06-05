# Typora 插件与主题

这个仓库整理了我日常使用的 Typora 增强内容：

- `mermaid-zoom/`：基于 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 开发的 Mermaid 图表放大预览插件，作者 `js`。
- `readonly-mode/`：基于 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 开发的只读模式插件，作者 `js`。
- `document-nav/`：基于 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 开发的文档顶部/底部快速跳转插件，作者 `js`。
- `mdmdt.css`：基于 [cayxc/Mdmdt](https://github.com/cayxc/Mdmdt) 并按个人偏好调整后的 Typora 主题。

## 内容说明

### Mermaid Zoom

`mermaid-zoom` 会在 Typora 渲染后的 Mermaid 图表上添加一个放大按钮。点击按钮后会打开图表预览弹层，适合查看较大的流程图、时序图或结构图。

主要特性：

- 自动识别 Typora 中渲染后的 Mermaid SVG，并在图表右上角添加悬浮放大按钮。
- 鼠标悬停在 Mermaid 图上时按 `F` 键可直接打开预览弹层（当前版本 0.2.0 起支持）。
- 预览弹层支持滚轮缩放（以鼠标位置为中心）、拖拽移动、重置视图。
- 工具栏提供「重置」「关闭」按钮；支持点击遮罩、点击关闭按钮或按 `Esc` 关闭。
- 默认以 2 倍适配倍率作为初始视图，方便大图直接看清细节。
- 放大按钮的鼠标事件被插件内部拦截，不会冒泡到 Typora，因而与 `readonly-mode` 兼容：只读模式下既能点击放大按钮，也能在 Mermaid 图上按 `F` 触发预览，不会被强制切回源码。

### Read-only Mode

`readonly-mode` 为 Typora 添加一个轻量只读模式，用来减少误触和误编辑。开启后，点击已渲染的 Mermaid、加粗文本、链接等内容时，Typora 不会切回源码或编辑状态。当前版本为 `0.1.2`。

主要特性：

- 默认开启只读模式。
- 阻止编辑区点击、双击、输入、粘贴、剪切、拖拽、组合输入等会修改内容或触发编辑的操作。
- 保留滚动、侧边栏切换文件、复制、搜索、打印、缩放等常用阅读操作。
- 右下角提供只读/编辑浮动切换按钮，并在状态变化时弹出顶部 Toast 提示。
- 可使用 `Ctrl+Alt+R` 快捷键切换模式。
- 状态会保存到本地，下次打开 Typora 时沿用上次设置。
- 通过 `_isBlurring` 标记防止失焦回调的递归触发，并同步执行 `blur` 避免与 Typora 编辑器的焦点恢复逻辑产生竞态。
- 内部对 `mermaid-zoom`、`document-nav` 的按钮与弹层做了穿透白名单：只读模式下点击这些 UI 不会被拦截或失焦。

### Document Nav

`document-nav` 会在 Typora 右侧下方提供一组悬浮导航按钮，用于快速跳到当前文档的顶部或底部。当前版本为 `0.1.1`。

主要特性：

- 右侧固定显示上下两个圆形导航按钮（位于视口约 `75vh` 处，垂直居中）。
- 顶部按钮点击后直接跳转到文档开头。
- 底部按钮点击后直接跳转到文档末尾。
- 自动适配 Typora 的可滚动容器（`#write` 父级、源码视图、CodeMirror 等），文档结构变化时自动重新选择滚动目标。
- 当文档不可滚动、或者已处于顶部/末尾时，对应按钮会被自动禁用；整个按钮组在文档无滚动时整体隐藏。
- 默认与 `readonly-mode` 兼容：只读模式开启时仍可点击导航按钮。

### mdmdt.css

`mdmdt.css` 是基于 Mdmdt 主题继续调整的 Typora 主题文件。原主题强调简洁、舒适的文档阅读和写作体验，并包含亮色/暗色模式相关样式；本仓库中的版本在此基础上对配色做了较大幅度的重构：

- 引入柔和色系（`--pastel-blue / mint / lavender / peach`）作为辅助高亮与背景渐变。
- 把表格、内联代码、代码块、强调文字等区域的颜色统一收口到变量中（`--table-header-bg`、`--inline-code-bg`、`--strong-color` 等），方便统一调整。
- 新增并细化代码语法高亮变量：`--code-syntax-text/keyword/type/name/comment/operator`，覆盖关键字、类型、标识符、注释、运算符等场景。
- 保留原主题对阅读节奏、标题层级、Mermaid 主题参数等的设置，并继续按个人使用习惯做了细节调整。

## 安装 typora-community-plugin

`document-nav`、`mermaid-zoom` 和 `readonly-mode` 都依赖 Typora Community Plugin。安装这些插件前，需要先安装插件系统。

推荐方式：

1. 打开 [typora-community-plugin Releases](https://github.com/typora-community-plugin/typora-community-plugin/releases)。
2. 下载 `typora-community-plugin.zip`。
3. 解压后按压缩包内 README 执行对应系统的安装脚本。
4. 重启 Typora。
5. 如果安装成功，Typora 中会出现插件系统的入口，例如插件设置、命令面板或插件管理界面。

手动安装方式可参考官方文档：

- [How to install](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md)
- [Plugin Installation](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/2-plugin-installation.md)

## 安装本地插件

关闭 Typora 后，将插件目录复制到 Typora Community Plugin 的插件目录中。

### 全局安装

适合希望所有笔记目录都能使用插件的情况。

将整个插件文件夹复制到：

```text
~/.typora/community-plugins/plugins
```

安装后目录结构示例：

```text
~/.typora/community-plugins/plugins/
  document-nav/
    manifest.json
    main.js
    style.css
  mermaid-zoom/
    manifest.json
    main.js
    style.css
  readonly-mode/
    manifest.json
    main.js
    style.css
```

### 本地安装

适合只想在某个笔记目录内使用插件的情况。

在对应笔记目录下创建 `.typora/plugins`，然后复制插件文件夹：

```text
你的笔记目录/
  .typora/
    plugins/
      document-nav/
      mermaid-zoom/
      readonly-mode/
```

### 启用插件

1. 启动 Typora。
2. 打开插件系统的设置界面。
3. 进入已安装插件列表。
4. 勾选启用 `Document Nav`、`Mermaid Zoom` 和 `Read-only Mode`。
5. 如未立即生效，重启 Typora。

## 安装主题

`mdmdt.css` 按 Typora 普通主题方式安装。

1. 打开 Typora。
2. 进入 `偏好设置` -> `外观`。
3. 点击 `打开主题文件夹`。
4. 将本仓库中的 `mdmdt.css` 复制到打开的主题目录。
5. 重启 Typora。
6. 在菜单栏 `主题` 中选择 `Mdmdt`。

如果需要继续调整字体，可直接编辑 `mdmdt.css` 中的 `font-family` 和 `--monospace` 相关配置。修改后重启 Typora 或重新切换主题即可查看效果。

## 注意事项

- 第三方 Typora 插件会运行在 Typora 环境中，建议只安装自己信任、能查看源码的插件。
- 更新 Typora 后，如果插件系统失效，通常需要按 typora-community-plugin 官方文档重新检查 `window.html` 或 `index.html` 注入是否仍然存在。
- 如果插件没有出现在已安装列表中，优先检查目录层级是否正确：插件目录下应直接包含 `manifest.json`、`main.js` 和 `style.css`。
- `readonly-mode` 主要用于防误触，不等同于文件系统层面的真正只读保护；如果需要防止文件被修改，还应配合系统文件权限或版本管理。

## 参考

- [typora-community-plugin/typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin)
- [cayxc/Mdmdt](https://github.com/cayxc/Mdmdt)
