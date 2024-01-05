// 默认行高
const DEFAULT_LINE_HEIGHT = 1.35;
// 行高位置校准
const LINE_HEIGHT_OFFSET = 0.11;
// 字体大小位置校准
const FONT_SIZE_OFFSET = 0.08;

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
 * 生成线性渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
const genLinearGradient = (ctx, element) => {
  const [matched] = element['background-image'].match(
    // 线性渐变语法参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/linear-gradient#%E5%BD%A2%E5%BC%8F%E8%AF%AD%E6%B3%95
    /linear-gradient\(((-?\d+(\.\d+)?(turn|deg|grad|rad))|(to( (left|top|bottom|right))+))?((, )?((rgba?\(((, )?\d+(\.\d+)?)+\)( \d+(\.\d+)?(px|%))*)|(\d+(\.\d+)?(px|%))))+\)/,
  ) ?? [];
  if (!matched) return undefined;
  // 三角函数值 转换 弧度 换算比例
  const tri2radRatio = Math.PI / 180;
  // 矩形斜边长度
  const diagonal = Math.sqrt(element.width ** 2 + element.height ** 2);
  // 角度描述内容
  let [angle] = matched.match(/(-?\d+(\.\d+)?(turn|deg|grad|rad))|(to( (left|top|bottom|right))+)/) ?? [];
  if (/\d+(\.\d+)?(turn|deg|grad|rad)/.test(angle)) {
    let roundAngle = 360; // 当前单位 的一个完整圆的数值，默认单位：度
    let angleRatio = 1; // 角度单位 与 当前单位 的单位换算比例，默认单位：度
    if (/turn/.test(angle)) { // 圈数
      roundAngle = 1;
      angleRatio = 360 / roundAngle;
    } else if (/grad/.test(angle)) { // 百分度数
      roundAngle = 400;
      angleRatio = 360 / roundAngle;
    } else if (/rad/.test(angle)) { // 弧度数
      roundAngle = 2 * Math.PI;
      angleRatio = 180 / Math.PI;
    }
    angle = angleRatio * (parseFloat(angle) % roundAngle);
    // 超过 180 度转换为 逆时针角度
    if (angle > 180) angle = -(360 - angle);
  } else if (angle === 'to left') { // 从右往左
    angle = -90;
  } else if (angle === 'to right') { // 从左往右
    angle = 90;
  } else if (angle === 'to top') { // 从下往上
    angle = 0;
  } else if (/( (left|top|bottom|right)){2}/.test(angle)) { // 斜上 或 斜下，对角方向
    angle = (
      /left/.test(angle) ? -1 : 1 // 左方向，转换为 逆时针角度
    ) * (90 + (
      /top/.test(angle) ? -1 : 1 // 上方向，锐角角度
    ) * (Math.atan(element.width / element.height) / tri2radRatio));
  } else { // 默认 180 度角，即从上往下
    angle = 180;
  }
  // 渐变射线上代表起始颜色值的点
  const startPoint = [];
  // 渐变射线上代表最终颜色值的点
  const endPoint = [];
  // 渐变射线长度
  let gradientDiagonal = 0;
  // 渐变角度是否为钝角
  const isObtuse = Math.abs(angle) > 90;
  // 渐变角度是否顺时针
  const isClockwise = angle >= 0;
  // 渐变角度 与 水平线 的夹角（小角）
  const gradientAngle = 90 - (
    isObtuse
      ? (180 - Math.abs(angle))
      : Math.abs(angle)
  );
  // 渐变角度 与 对角线 的夹角（小角）
  const angleDiff = Math.abs(angle) - Math.abs(
    isObtuse
      ? 90 + Math.atan(element.height / element.width) / tri2radRatio
      : Math.atan(element.width / element.height) / tri2radRatio,
  );
  // 渐变起始点的斜边长度
  const pointDiagonal = Math.sin(angleDiff * tri2radRatio) * (diagonal / 2);
  // 渐变起始点的 x 坐标
  const pointDiffX = Math.sin(gradientAngle * tri2radRatio) * pointDiagonal;
  // 渐变起始点的 y 坐标
  const pointDiffY = Math.cos(gradientAngle * tri2radRatio) * pointDiagonal;
  gradientDiagonal = Math.cos(angleDiff * tri2radRatio) * diagonal;
  startPoint.push(
    (isClockwise ? element.left : element.right)
      + (isObtuse ? 1 : -1) * (isClockwise ? 1 : -1) * pointDiffX,
    (isObtuse ? element.top : element.bottom) - pointDiffY,
  );
  endPoint.push(
    (isClockwise ? element.right : element.left)
      + (isObtuse ? -1 : 1) * (isClockwise ? 1 : -1) * pointDiffX,
    (isObtuse ? element.bottom : element.top) + pointDiffY,
  );
  const gradient = ctx.createLinearGradient(...startPoint, ...endPoint);
  // 渐变色标位置集合
  let stops = matched.match(/(rgba?\(((, )?\d+(\.\d+)?)+\)( \d+(\.\d+)?(px|%))*)|(\d+(\.\d+)?(px|%))/g) ?? [];
  stops = stops.map((term) => {
    const [color] = term.match(/rgba?\(((, )?\d+(\.\d+)?)+\)/) ?? [];
    const payload = {};
    if (color) {
      Object.assign(payload, { color });
    }
    const dots = term.match(/\d+(\.\d+)?(px|%)/g) ?? [];
    if (dots) {
      Object.assign(payload, {
        percent: dots.map((dot) => {
          if (/px/.test(dot)) {
            return parseFloat(dot) / gradientDiagonal;
          } if (/%/.test(dot)) {
            return parseFloat(dot) / 100;
          }
          return 0;
        }),
      });
    }
    return payload;
  });
  for (let index = 0; index < stops.length; index++) {
    const term = stops[index];
    // 不支持控制渐变进程
    if (!term.color) continue;
    if (term.percent.length === 0) {
      if (index === 0) {
        Object.assign(term, { percent: [0] });
      } else if (index === stops.length - 1) {
        Object.assign(term, { percent: [1] });
      } else {
        let perInter = 1;
        let stpIndex = index;
        // 上一个渐变色标位置
        const [perStart] = stops[stpIndex - 1].percent.slice(-1);
        // 下一个渐变色标位置
        let perEnd;
        while (++stpIndex < stops.length) {
          perInter += 1;
          if (stops[stpIndex].percent.length > 0) {
            [perEnd] = stops[stpIndex].percent;
            break;
          }
        }
        // 当前渐变色标位置
        const percent = [perStart + ((perEnd ?? 1) - perStart) / perInter];
        Object.assign(term, {
          percent,
        });
      }
    }
    let perIndex = 0;
    for (; perIndex < term.percent.length; perIndex++) {
      if (term.percent[perIndex] > 1) break;
      gradient.addColorStop(term.percent[perIndex], term.color);
    }
    if (perIndex < term.percent.length) break;
  }
  return gradient;
};

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
    const { pixelRatio: dpr } = wx.getSystemInfoSync();
    scale *= dpr;
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

  /**
   * 生成/获取 wxml 元素的边框路径
   * @returns {Path2D} 路径
   */
  getElementPath2D() {
    const { element } = this;
    if (element.path2D) return element.path2D;
    const borderPath = this.canvas.createPath2D();
    if (element['border-radius'] !== '0px') {
      const radius = element.getBorderRadius();
      borderPath.ellipse(
        element.left + radius.leftTop,
        element.top + radius.topLeft,
        radius.leftTop,
        radius.topLeft,
        -Math.PI,
        0,
        Math.PI / 2,
      );
      borderPath.lineTo(element.right - radius.rightTop, element.top);
      borderPath.ellipse(
        element.right - radius.rightTop,
        element.top + radius.topRight,
        radius.topRight,
        radius.rightTop,
        -Math.PI / 2,
        0,
        Math.PI / 2,
      );
      borderPath.lineTo(element.right, element.bottom - radius.bottomRight);
      borderPath.ellipse(
        element.right - radius.rightBottom,
        element.bottom - radius.bottomRight,
        radius.rightBottom,
        radius.bottomRight,
        0,
        0,
        Math.PI / 2,
      );
      borderPath.lineTo(element.right - radius.rightBottom, element.bottom);
      borderPath.ellipse(
        element.left + radius.leftBottom,
        element.bottom - radius.bottomLeft,
        radius.bottomLeft,
        radius.leftBottom,
        Math.PI / 2,
        0,
        Math.PI / 2,
      );
      borderPath.lineTo(element.left, element.top + radius.topLeft);
    } else {
      borderPath.rect(
        element.left,
        element.top,
        element.width,
        element.height,
      );
    }
    element.setPath2D(borderPath);
    return borderPath;
  }

  /** 设置 wxml 元素的边界 */
  setElementBoundary() {
    this.context.clip(this.getElementPath2D());
  }

  /** 绘制 wxml 元素的背景 */
  drawBackground() {
    const { context: ctx, element } = this;
    ctx.fillStyle = element['background-color'];
    ctx.fillRect(element.left, element.top, element.width, element.height);

    if (element['background-image'] === 'none') return;
    let gradient;
    if (element['background-image'].startsWith('linear-gradient')) {
      gradient = genLinearGradient(ctx, element);
    }
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
    ctx.stroke(this.getElementPath2D());
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
    ctx.fill(this.getElementPath2D());
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
