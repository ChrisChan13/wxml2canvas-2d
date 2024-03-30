import { createGradient } from './gradient';

// 默认行高
const DEFAULT_LINE_HEIGHT = 1.35;
// 行高位置校准
const LINE_HEIGHT_OFFSET = 0.11;
// 字体大小位置校准
const FONT_SIZE_OFFSET = 0.08;

const {
  platform: SYS_PLATFORM,
  pixelRatio: SYS_DPR,
} = wx.getSystemInfoSync();
// 是否为 iOS 平台
const IS_IOS = SYS_PLATFORM === 'ios';

/**
 * 获取画布对象
 * @param {ComponentObject} component 组件实例对象
 * @param {String} selector 选择器
 * @returns {Promise<Canvas>} 画布对象
 */
const getCanvas = (component, selector) => new Promise(
  (resolve) => {
    const query = component.createSelectorQuery();
    query.select(selector).fields({
      node: true,
    }).exec((res) => {
      const [{ node: canvas }] = res;
      resolve(canvas);
    });
  },
);

/**
 * 画布工具类
 *
 * 1.实例化：传入组件实例以及画布选择器
 * ```javascript
 * const canvas = new Canvas(componentInstance, canvasSelector);
 * ```
 * 2.初始化：传入容器元素节点信息以及缩放倍率（可选）
 * ```javascript
 * await canvas.init(containerNodeRef, scale);
 * ```
 * 3.执行方法：
 * ```javascript
 * canvas.xxx();
 * ```
 *
 * **注意：**
 *
 * 切换元素节点进行绘制前，请先执行 `Canvas.setElement`
 */
class Canvas {
  /**
   * @param {ComponentObject} component 组件实例对象
   * @param {String} selector 画布选择器
   */
  constructor(component, selector) {
    this.component = component;
    this.selector = selector;
  }

  /**
   * 初始化
   * @param {NodesRef} container 容器元素节点信息
   * @param {Number} scale 画布缩放倍数
   */
  async init(container, scale = 1) {
    const canvas = this.canvas = await getCanvas(this.component, this.selector);
    scale *= SYS_DPR;
    canvas.width = container.width * scale;
    canvas.height = container.height * scale;
    const ctx = this.context = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(-container.left, -container.top);
    ctx.save();
  }

  /**
   * 设置当前绘制的 wxml 元素
   * @param {Element} element wxml 元素
   */
  setElement(element) {
    this.element = element;
    this.context.globalAlpha = +element.opacity;
  }

  /**
   * 创建图片对象
   * @param {String} src 图片链接
   * @returns {Promise<Image>} 图片对象
   */
  async createImage(src) {
    return new Promise((resolve, reject) => {
      const image = this.canvas.createImage();
      image.src = src;
      image.onload = () => resolve(image);
      image.onerror = reject;
    });
  }

  /** 重置画布上下文  */
  restoreContext() {
    this.context.restore();
    this.context.save();
  }

  /** 绘制/裁切 wxml 元素的边框路径 */
  clipElementPath() {
    const { context: ctx, element } = this;
    ctx.beginPath();
    if (element['border-radius'] !== '0px') {
      const radius = element.getBorderRadius();
      const unitRotateAngle = IS_IOS ? 1 : Math.PI / 180;
      ctx.ellipse(
        element.left + radius.leftTop,
        element.top + radius.topLeft,
        radius.leftTop,
        radius.topLeft,
        -180 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(element.right - radius.rightTop, element.top);
      ctx.ellipse(
        element.right - radius.rightTop,
        element.top + radius.topRight,
        radius.topRight,
        radius.rightTop,
        -90 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(element.right, element.bottom - radius.bottomRight);
      ctx.ellipse(
        element.right - radius.rightBottom,
        element.bottom - radius.bottomRight,
        radius.rightBottom,
        radius.bottomRight,
        0,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(element.right - radius.rightBottom, element.bottom);
      ctx.ellipse(
        element.left + radius.leftBottom,
        element.bottom - radius.bottomLeft,
        radius.bottomLeft,
        radius.leftBottom,
        90 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(element.left, element.top + radius.topLeft);
    } else {
      ctx.rect(
        element.left,
        element.top,
        element.width,
        element.height,
      );
    }
    ctx.closePath();
  }

  /** 设置 wxml 元素的边界 */
  setElementBoundary() {
    this.clipElementPath();
    this.context.clip();
  }

  /** 绘制 wxml 元素的背景 */
  drawBackground() {
    const { context: ctx, element } = this;
    ctx.fillStyle = element['background-color'];
    ctx.fillRect(element.left, element.top, element.width, element.height);
    const gradient = createGradient(ctx, element);
    if (!gradient) return;
    ctx.fillStyle = gradient;
    ctx.fillRect(
      element.left,
      element.top,
      element.width,
      element.height,
    );
  }

  /** 绘制 wxml 的 image 元素 */
  async drawImage() {
    const { element } = this;
    const image = await this.createImage(element.src);
    let dx;
    let dy;
    let dWidth;
    let dHeight;
    let sx;
    let sy;
    let sWidth;
    let sHeight;
    const content = element.getBoxSize();
    if (element.mode === 'aspectFit') {
      sx = 0;
      sy = 0;
      sWidth = image.width;
      sHeight = image.height;
      // 对比宽高，根据长边计算缩放结果数值
      if (image.width / image.height >= content.width / content.height) {
        dWidth = content.width;
        dHeight = image.height * (dWidth / image.width);
        dx = content.left;
        dy = content.top + (content.height - dHeight) / 2;
      } else {
        dHeight = content.height;
        dWidth = image.width * (dHeight / image.height);
        dx = content.left + (content.width - dWidth) / 2;
        dy = content.top;
      }
    } else if (element.mode === 'aspectFill') {
      dx = content.left;
      dy = content.top;
      dWidth = content.width;
      dHeight = content.height;
      // 对比宽高，根据短边计算缩放结果数值
      if (image.width / image.height <= content.width / content.height) {
        sWidth = image.width;
        sHeight = sWidth * (content.height / content.width);
        sx = 0;
        sy = (image.height - sHeight) / 2;
      } else {
        sHeight = image.height;
        sWidth = sHeight * (content.width / content.height);
        sx = (image.width - sWidth) / 2;
        sy = 0;
      }
    } else {
      sx = 0;
      sy = 0;
      sWidth = image.width;
      sHeight = image.height;
      dx = content.left;
      dy = content.top;
      dWidth = content.width;
      dHeight = content.height;
    }
    this.context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  /** 绘制 wxml 的 text 元素 */
  drawText() {
    const { context: ctx, element } = this;
    const content = element.getBoxSize();

    // 固定格式：font-weight font-size font-family
    ctx.font = `${element['font-weight']} ${element['font-size']} ${element['font-family']}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = element['text-align'];
    ctx.fillStyle = element.color;
    const fontSize = parseFloat(element['font-size']);

    // ctx.letterSpacing = element['letter-spacing'];
    // ctx.wordSpacing = element['word-spacing'];

    let lineHeight;
    if (!Number.isNaN(+element['line-height'])) {
      lineHeight = fontSize * +element['line-height'];
    } else if (/px/.test(element['line-height'])) {
      lineHeight = parseFloat(element['line-height']);
    } else {
      lineHeight = fontSize * DEFAULT_LINE_HEIGHT;
    }

    let lineText = '';
    let lines = 0;
    // 计算元素内实际显示最大行数
    const maxLines = Math.round(content.height / lineHeight);
    // 消除行高计算偏差
    lineHeight = content.height / maxLines;

    // eslint-disable-next-line no-restricted-syntax
    for (const char of `${element.dataset.text}`) {
      // 判断是否换行
      if (ctx.measureText(lineText + char).width > Math.ceil(content.width)) {
        const isTextOverflow = (lines + 1) === maxLines;
        // 判断是否多余文字使用 ... 展示
        if (isTextOverflow && element['text-overflow'] === 'ellipsis') {
          do {
            lineText = lineText.slice(0, -1);
          } while (ctx.measureText(`${lineText}...`).width > Math.ceil(content.width));
          lineText = `${lineText}...`;
        }
        ctx.fillText(
          lineText,
          content.left + (element['text-align'] === 'center' ? content.width / 2 : 0),
          content.top + fontSize * FONT_SIZE_OFFSET + (
            fontSize === lineHeight ? 0 : lineHeight * LINE_HEIGHT_OFFSET
          ) + lines * lineHeight,
        );
        if (isTextOverflow) {
          lineText = '';
          break;
        } else {
          lineText = char;
          lines += 1;
        }
      } else {
        lineText += char;
      }
    }
    // 若不超出最高行数范围，绘制剩余文字
    if ((lines + 1) <= maxLines && lineText) {
      ctx.fillText(
        lineText,
        content.left + (element['text-align'] === 'center' ? content.width / 2 : 0),
        content.top + fontSize * FONT_SIZE_OFFSET + (
          fontSize === lineHeight ? 0 : lineHeight * LINE_HEIGHT_OFFSET
        ) + lines * lineHeight,
      );
    }
  }

  /** 绘制 wxml 元素边框 */
  drawBorder() {
    const { context: ctx, element } = this;
    const border = element.getBorder();
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width * 2;
    if (border.style === 'dashed') {
      ctx.lineDashOffset = -border.width * 2;
      ctx.setLineDash([2 * border.width, border.width]);
    }
    this.clipElementPath();
    ctx.stroke();
  }

  /** 绘制 wxml 元素阴影 */
  drawBoxShadow() {
    const { context: ctx, element } = this;
    const background = element.getBackgroundColor();
    const shadow = element.getBoxShadow();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    // 必须填充背景色，否则阴影不可见
    ctx.fillStyle = `rgba(${background.rColor}, ${background.gColor}, ${background.bColor}, 1)`;
    this.clipElementPath();
    ctx.fill();
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /** 导出画布至临时图片 */
  async toTempFilePath() {
    const { tempFilePath } = await wx.canvasToTempFilePath({
      canvas: this.canvas,
      fileType: 'png',
    }, this.component);
    return tempFilePath;
  }
}

export default Canvas;
