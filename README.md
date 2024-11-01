# wxml2canvas-2d

基于微信小程序 2D Canvas 的画布组件，根据给定 WXML 结构以及 CSS 样式快速转换成 Canvas 元素，以用于生成海报图片分享等操作。所见即所得（bushi

## 安装

### npm

使用 npm 构建前，请先阅读微信官方的 [npm 支持](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)

```bash
# 通过 npm 安装
npm i wxml2canvas-2d -S --production
```

### 构建 npm 包

打开微信开发者工具，点击 **工具** -> **构建 npm**，并勾选 **使用 npm 模块** 选项，构建完成后，即可引入组件。

## 使用

1. 在页面配置中引入 `wxml2canvas-2d` ;
```json
{
  "usingComponents": {
    "wxml2canvas": "wxml2canvas-2d"
  }
}
```
2. 在页面中编写 wxml 结构，将要生成画布内容的**根节点**用名为 `wxml2canvas-container` 的样式类名称标记，将该根节点内部**需要生成画布内容的节点**用名为 `wxml2canvas-item` 的样式类名称标记（文字类节点需在对应节点声明 `data-text` 属性，并传入文字内容）。上述两个样式类名称可以自定义，只需将对应名称传入 `wxml2canvas` 组件的对应属性参数即可；
```html
<view class="wxml2canvas-container box">
  <view class="wxml2canvas-item title" data-text="测试标题">测试标题</view>
  <image class="wxml2canvas-item image" src="/paste-your-image-path-here.png" />
  <view class="wxml2canvas-item content" data-text="测试内容，长文本。。">测试内容，长文本。。</view>
</view>
<button catchtap="generateSharingCard">生成画布内容</button>
<wxml2canvas id="wxml2canvas" />
```
3. 补充各个节点样式；
```css
.box { background: aliceblue; /* 根节点（容器）的样式 */ }
.title { /* 标题的样式 */ }
.image { /* 图片的样式 */ }
.content { /* 内容的样式 */ }
```
4. 依据 wxml 结构以及 css 样式，生成画布内容，并将生成结果导出。
```javascript
Page({
  async generateSharingCard() {
    const canvas = this.selectComponent('#wxml2canvas');
    await canvas.draw();
    const filePath = await canvas.toTempFilePath();
    wx.previewImage({
      urls: [filePath],
    });
  },
});
```

> **PS**：使用字体时，请注意在**生成画布内容前** [**加载对应的字体文件**](https://developers.weixin.qq.com/miniprogram/dev/api/ui/font/wx.loadFontFace.html)；

## API

### 组件参数

||类型|必填|说明|默认值|
|:-|:-|:-|:-|:-|
|`containerClass`|`String`|否|根节点（容器）样式类名称|`'wxml2canvas-container'`|
|`itemClass`|`String`|否|内部节点样式类名称|`'wxml2canvas-item'`|
|`scale`|`Number`|否|画布缩放比例|`1`|

### 外部样式类

||说明|
|:-|:-|
|`box-class`|`canvas` 节点样式类|

### 组件方法

<table>
  <tr>
    <th rowspan=2></th>
    <th rowspan=2>说明</th>
    <th colspan=5>参数</th>
  </tr>
  <tr>
    <th>属性</th>
    <th>类型</th>
    <th>默认值</th>
    <th width=62>必填</th>
    <th>说明</th>
  </tr>
  <tr>
    <td><code>draw</code></td>
    <td>绘制画布内容</td>
    <td><code>page</code></td>
    <td><code>PageObject</code></td>
    <td>当前页面实例</td>
    <td>否</td>
    <td>组件所在页面实例</td>
  </tr>
  <tr>
    <td><code>toTempFilePath</code></td>
    <td>导出画布内容</td>
    <td><code>original</code></td>
    <td><code>Boolean</code></td>
    <td><code>true</code></td>
    <td>否</td>
    <td>是否使用实机渲染尺寸<br><code>true</code>：各设备像素比不同，导出结果尺寸不同<br><code>false</code>：采用 750px 为标准，与 CSS 中样式一致</td>
  </tr>
</table>

### 其他

<details>
  <summary><b>CSS 属性支持情况</b></summary>
  <br>

  > 基础属性：width，height，padding、margin 等布局相关属性不谈

  <table>
    <tr>
      <th colspan=2>属性</th>
      <th>说明</th>
    </tr>
    <tr>
      <td colspan=2><code>background</code></td>
      <td>背景，支持渐变图案</td>
    </tr>
    <tr>
      <td colspan=2><code>background-color</code></td>
      <td>背景颜色，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>background-image</code></td>
      <td>背景图像，支持</td>
    </tr>
    <tr>
      <td rowspan=2><code>background-position</code></td>
      <td><code>background-position-x</code></td>
      <td>背景图像水平方向的位置，支持</td>
    </tr>
    <tr>
      <td><code>background-position-y</code></td>
      <td>背景图像垂直方向的位置，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>background-size</code></td>
      <td>背景图像的大小，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>background-repeat</code></td>
      <td>背景图像的重复方式，暂不支持 <code>space</code> 和 <code>round</code></td>
    </tr>
    <tr>
      <td colspan=2><code>background-clip</code></td>
      <td>背景图像的延伸方式，支持</td>
    </tr>
    <tr>
      <td rowspan="3"><code>border</code></td>
      <td><code>border-width</code></td>
      <td>边框宽度，暂仅支持四边同宽</td>
    </tr>
    <tr>
      <td><code>border-style</code></td>
      <td>边框样式，暂仅支持 <code>solid</code> 和 <code>dashed</code></td>
    </tr>
    <tr>
      <td><code>border-color</code></td>
      <td>边框颜色，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>opacity</code></td>
      <td>透明度，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>box-shadow</code></td>
      <td>阴影，暂仅支持单一阴影</td>
    </tr>
    <tr>
      <td colspan=2><code>border-radius</code></td>
      <td>圆角，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>font-family</code></td>
      <td>字体，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>font-size</code></td>
      <td>字体大小，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>font-weight</code></td>
      <td>字重，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>text-align</code></td>
      <td>文本对齐，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>line-height</code></td>
      <td>行高，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>text-overflow</code></td>
      <td>文字溢出处理，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>color</code></td>
      <td>文字颜色，支持</td>
    </tr>
    <tr>
      <td colspan=2><code>text-indent</code></td>
      <td>首行缩进，支持</td>
    </tr>
  </table>
</details>
<details>
  <summary><b>TODOs</b></summary>
  <br>

  - [x] 支持 `background-image` 等背景图片样式
    - [x] 支持 `background-image` 基础属性设置
    - [x] 支持 `background-clip` 延伸范围
  - [ ] 支持渐变类 `Gradients`
    - [x] 支持 `linear-gradient` 线性渐变
    - [x] 支持 `radial-gradient` 径向渐变
    - [x] 支持 `conic-gradient` 锥形渐变
    - [ ] 支持多重 `Gradients` 渐变
    - [ ] 支持渐变类 `Gradients` 插值提示（难）
  - [ ] 支持多重 `background`，多重 `box-shadow`
    - [x] 支持多重 `background-image`
    - [ ] 支持多重 `box-shadow`
  - [ ] 支持 `CSS Transforms` 相关属性（难）
  - [ ] 支持 `CSS Writing Modes` 相关属性（难）
</details>
<details>
  <summary><b>注意</b></summary>
  <br>

  - 微信新版 Canvas 2D 接口基本与 Web Canvas API 对齐，但仍有部分 API 存在差异，随着微信版本或基础库更新，或许会提高相应 API 的支持度
  - 微信新版 Canvas 2D 的画布有宽高分别最大不能超过 4096px 的限制，此 repo 绘制画布时会将画布大小根据设备像素比（dpr）进行放大，使用时请注意避免容器的宽高大于 4096px / dpr
  - 尽管微信新版 Canvas 2D 接口采用同步的方式绘制 Canvas 元素，但在部分机型或平台上调用 wx.canvasToTempFilePath 时，也可能绘制过程尚未完成，所以使用过程中尽可能延迟或分步骤调用 wx.canvasToTempFilePath 进行导出图片的操作
  - iOS 平台对于 Path2D 的支持度不足，此 repo 已去除 Path2D 的相关应用，转而使用普通路径，相对应的路径生成次数会增多，绘制时长有所增加，但不多
  - iOS 平台使用 CanvasContext.ellipse 以及 Path2D.ellipse 时，其中的参数 rotation 旋转角度所使用的角度单位不同：iOS 使用角度值，macOS 平台未知，其余使用弧度值
  - 绘制文字元素时，各机型和各平台对于 font-size、font-weight、line-height 的实际表现与 CSS 中的表现有细微不同，此 repo 暂时使用常量比例进行换算对齐，未彻底解决
  - 绘制元素的边框暂时只支持 solid 和 dashed 两种样式，其中 dashed 样式的边框使用 CanvasContext.setLineDash 实现，各机型和各平台的边框虚线间距表现均有差异，此 repo 暂时使用与边框宽度等比的间距表现虚线边框
  - 绘制元素的阴影时，阴影的透明度将随着背景色的透明度等比改变，未设置背景色时，元素的阴影将会不可见，所以绘制元素的阴影时，请尽量设置该元素的背景色为不透明的实色，若无设置，此 repo 在绘制该元素的阴影前会自动设置为纯黑色背景
  - 绘制渐变图案时，请尽量在 CSS 中将渐变的色标按位置正序顺序依次书写，支持使用负值（径向渐变除外），暂未处理色标位置错乱情况下的表现形式，暂不支持控制渐变进程的插值提示
  - 微信新版 Canvas API 目前不支持绘制椭圆形径向渐变图案，此 repo 使用 CanvasContext.scale 对圆形径向渐变图案进行放大或缩小，以实现椭圆形径向渐变图案，而在 closest-corner 与 farthest-corner 模式下的椭圆形径向渐变中，目前还未找出 CSS 在绘制椭圆形径向渐变图案时的长轴与短轴的大小的计算规则，暂时使用常量比例进行换算对齐，未彻底解决
  - 锥形渐变图案目前仅微信开发者工具以及 Windows 平台支持，开发工具上锥形渐变角度的 0° 基准与 CSS 表现一致（即 12 点钟方向），起始角度参数的角度单位为弧度，Windows 平台上的 0° 基准为 3 点钟方向，起始角度参数的角度单位为角度，iOS 和 Android 均不支持 CanvasContext.createConicGradient API，macOS 平台未知
  - 设置渐变背景图案时，请尽量避免使用 black、white 等名词形式描述颜色，部分 iOS 设备不会自动转换颜色内容，难以匹配并识别颜色（目前发现部分 iOS 设备中，红色不管以任何形式描述，结果均显示为 red，暂时已处理，且仅处理颜色为 red 的情况）
</details>

## Demo

克隆本仓库，运行 `npm i & npm run dev`，将 miniprogram_dev 文件夹导入微信开发者工具

## 效果预览

![效果预览](screenshot-0.png)
![效果预览](screenshot-1.png)
