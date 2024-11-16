import { drawGradient } from './gradient';

/** CSS 默认行高 */
const DEFAULT_LINE_HEIGHT = 1.4;
/** 行高位置校准 */
// CSS 与 画布 的 line-height 存在数值偏差，暂时以常数换算实现近似结果
const LINE_HEIGHT_OFFSET = 0.11;
/** 字体大小位置校准 */
// CSS 与 画布 的 font-size 存在数值偏差，暂时以常数换算实现近似结果
const FONT_SIZE_OFFSET = 0.08;
/** 换行符 */
const LINE_BREAK_SYMBOL = '\n';

const {
  platform: SYS_PLATFORM,
  pixelRatio: SYS_DPR,
  windowWidth: SYS_WIDTH,
} = wx.getSystemInfoSync();
/** 是否为 iOS 平台 */
const IS_IOS = SYS_PLATFORM === 'ios';
/** 设备像素与 750px 设计图比例 */
const RPX_RATIO = 750 / SYS_WIDTH;

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
 * 绘制重复背景图案
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Object} clipBox wxml 元素背景延伸的盒子模型
 * @param {Image} image 图片元素对象
 * @param {Number} x image 的左上角在目标画布上 X 轴坐标
 * @param {Number} y image 的左上角在目标画布上 Y 轴坐标
 * @param {Number} width image 在目标画布上绘制的宽度
 * @param {Number} height image 在目标画布上绘制的高度
 * @param {Boolean} repeatX X 轴是否重复绘制
 * @param {Boolean} repeatY Y 轴是否重复绘制
 * @param {Number} stepX X 轴坐标的步进数
 * @param {Number} stepY Y 轴坐标的步进数
 */
const drawImageRepeated = (
  ctx, clipBox, image,
  x, y, width, height,
  repeatX = false, repeatY = false,
  stepX = 0, stepY = 0,
) => {
  ctx.drawImage(
    image,
    0, 0, image.width, image.height,
    x + stepX * width, y + stepY * height, width, height,
  );
  if (repeatX) {
    if (stepX > -1 && x + (stepX + 1) * width < clipBox.right) {
      drawImageRepeated(
        ctx, clipBox, image,
        x, y, width, height,
        true, false,
        stepX + 1, stepY,
      );
    } if (stepX < 1 && x + stepX * width > clipBox.left) {
      drawImageRepeated(
        ctx, clipBox, image,
        x, y, width, height,
        true, false,
        stepX - 1, stepY,
      );
    }
  } if (repeatY) {
    if (stepY > -1 && y + (stepY + 1) * height < clipBox.bottom) {
      drawImageRepeated(
        ctx, clipBox, image,
        x, y, width, height,
        repeatX && repeatY, true,
        stepX, stepY + 1,
      );
    } if (stepY < 1 && y + stepY * height > clipBox.top) {
      drawImageRepeated(
        ctx, clipBox, image,
        x, y, width, height,
        repeatX && repeatY, true,
        stepX, stepY - 1,
      );
    }
  }
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
    this.scale = scale;
    this.container = container;
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
    // 仅在开发工具、Windows 及部分真机上生效
    this.context.filter = element.filter;
    this.context.save();
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
   * 绘制/裁切 wxml 元素的边框路径
   * @param {String} sizing 盒子模型描述
   */
  clipElementPath(sizing = 'border') {
    const { context: ctx, element } = this;
    const content = element.getBoxSize(sizing);

    ctx.beginPath();
    if (element['border-radius'] !== '0px') {
      const radius = element.getBorderRadius();
      /** 旋转角度的单位：iOS 角度、Android 弧度 */
      const unitRotateAngle = IS_IOS ? 1 : Math.PI / 180;

      /** 元素左外边距 与 内容左外边距 的差值 */
      const diffLeft = content.left - element.left;
      /** 元素右外边距 与 内容右外边距 的差值 */
      const diffRight = element.right - content.right;
      /** 元素顶外边距 与 内容顶外边距 的差值 */
      const diffTop = content.top - element.top;
      /** 元素底外边距 与 内容底外边距 的差值 */
      const diffBottom = element.bottom - content.bottom;

      ctx.ellipse(
        content.left + radius.leftTop - diffLeft,
        content.top + radius.topLeft - diffTop,
        radius.leftTop - diffLeft,
        radius.topLeft - diffTop,
        -180 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(content.right - radius.rightTop + diffRight, content.top);
      ctx.ellipse(
        content.right - radius.rightTop + diffRight,
        content.top + radius.topRight - diffTop,
        radius.topRight - diffTop,
        radius.rightTop - diffRight,
        -90 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(content.right, content.bottom - radius.bottomRight + diffBottom);
      ctx.ellipse(
        content.right - radius.rightBottom + diffRight,
        content.bottom - radius.bottomRight + diffBottom,
        radius.rightBottom - diffRight,
        radius.bottomRight - diffBottom,
        0,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(content.right - radius.rightBottom + diffRight, content.bottom);
      ctx.ellipse(
        content.left + radius.leftBottom - diffLeft,
        content.bottom - radius.bottomLeft + diffBottom,
        radius.bottomLeft - diffBottom,
        radius.leftBottom - diffLeft,
        90 * unitRotateAngle,
        0,
        Math.PI / 2,
      );
      ctx.lineTo(content.left, content.top + radius.topLeft - diffTop);
    } else {
      ctx.rect(
        content.left,
        content.top,
        content.width,
        content.height,
      );
    }
    ctx.closePath();
  }

  /** 设置 wxml 元素的边界
   * @param {String} sizing 盒子模型描述
   */
  setElementBoundary(sizing = 'border') {
    this.clipElementPath(sizing);
    this.context.clip();
  }

  /** 绘制 wxml 元素的背景色 */
  drawBackgroundColor() {
    const { context: ctx, element } = this;
    const clips = element['background-clip'].split(', ');
    const colorClip = clips[clips.length - 1].slice(0, -4);

    this.restoreContext();
    if (colorClip !== 'border') {
      this.setElementBoundary(colorClip);
    } else {
      this.setElementBoundary();
    }
    ctx.fillStyle = element['background-color'];
    ctx.fillRect(element.left, element.top, element.width, element.height);

    const gradientClip = clips[0].slice(0, -4);
    if (gradientClip !== 'border') {
      this.restoreContext();
      this.setElementBoundary(gradientClip);
    }
    drawGradient(ctx, element);
    this.restoreContext();
  }

  /** 绘制 wxml 元素的背景图案 */
  async drawBackgroundImage() {
    const { context: ctx, element } = this;
    const backgroundImage = element['background-image'];
    if (!backgroundImage || backgroundImage === 'none') return;

    const content = element.getBoxSize('padding');
    const images = backgroundImage.split(', ').reverse();
    if (images.length === 0) return;
    this.restoreContext();
    this.setElementBoundary();

    const clips = element['background-clip'].split(', ').reverse();
    const sizes = element['background-size'].split(', ').reverse();
    const positions = element['background-position'].split(', ').reverse();
    const repeats = element['background-repeat'].split(', ').reverse();

    /** 上个背景元素延伸模式是否为 border-box */
    let isLast1BorderBox = true;
    /** 所有背景元素延伸模式是否为 border-box */
    let isAllBorderBox = true;
    for (let index = 0; index < images.length; index++) {
      if (!/url\(".*"\)/.test(images[index])) continue;
      const src = images[index].slice(5, -2);
      const image = await this.createImage(src);
      let dx;
      let dy;
      let dWidth;
      let dHeight;

      const size = sizes[index];
      if (size === 'auto') {
        dWidth = image.width;
        dHeight = image.height;
      } else if (size === 'contain') {
        // 对比宽高，根据长边计算缩放结果数值
        if (image.width / image.height >= content.width / content.height) {
          dWidth = content.width;
          dx = content.left;
          dHeight = image.height * (dWidth / image.width);
        } else {
          dHeight = content.height;
          dy = content.top;
          dWidth = image.width * (dHeight / image.height);
        }
      } else if (size === 'cover') {
        // 对比宽高，根据短边计算缩放结果数值
        if (image.width / image.height <= content.width / content.height) {
          dWidth = content.width;
          dx = content.left;
          dHeight = image.height * (dWidth / image.width);
        } else {
          dHeight = content.height;
          dy = content.top;
          dWidth = image.width * (dHeight / image.height);
        }
      } else {
        const [sizeWidth, sizeHeight] = size.split(' ');
        dWidth = /%/.test(sizeWidth)
          ? content.width * (parseFloat(sizeWidth) / 100)
          : parseFloat(sizeWidth);
        dHeight = /%/.test(sizeHeight)
          ? content.height * (parseFloat(sizeHeight) / 100)
          : parseFloat(sizeHeight);
      }

      // 关于背景图像位置的百分比偏移量计算方式，参考文档：
      // https://developer.mozilla.org/zh-CN/docs/Web/CSS/background-position#%E5%85%B3%E4%BA%8E%E7%99%BE%E5%88%86%E6%AF%94%EF%BC%9A
      const position = positions[index];
      const [positionX, positionY] = position.split(' ');
      dx = dx ?? (
        content.left + (/%/.test(positionX)
          ? (content.width - dWidth) * (parseFloat(positionX) / 100)
          : parseFloat(positionX))
      );
      dy = dy ?? (
        content.top + (/%/.test(positionY)
          ? (content.height - dHeight) * (parseFloat(positionY) / 100)
          : parseFloat(positionY))
      );

      /** 当前背景元素重复模式 */
      const repeat = repeats[index];
      /** 当前背景元素延伸模式 */
      const boxSizing = clips[index].slice(0, -4);
      /** 当前背景元素延伸盒子大小 */
      const clipBox = element.getBoxSize(boxSizing);
      // 减少边缘裁剪绘制次数
      if (!isLast1BorderBox || boxSizing !== 'border') {
        this.restoreContext();
        this.setElementBoundary(boxSizing);
        if (isAllBorderBox) isAllBorderBox = false;
      }
      isLast1BorderBox = boxSizing === 'border';
      drawImageRepeated(
        ctx, clipBox, image,
        dx, dy, dWidth, dHeight,
        repeat === 'repeat' || repeat === 'repeat-x',
        repeat === 'repeat' || repeat === 'repeat-y',
      );
    }
    this.restoreContext();
  }

  /** 绘制 wxml 的 image 元素 */
  async drawImage() {
    const { element } = this;
    this.restoreContext();
    this.setElementBoundary();
    const image = await this.createImage(element.src);
    let dx;
    let dy;
    let dWidth;
    let dHeight;
    let sx;
    let sy;
    let sWidth;
    let sHeight;
    const content = element.getBoxSize('content');
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
    this.restoreContext();
  }

  /** 绘制 wxml 的 text 元素 */
  drawText() {
    const { context: ctx, element } = this;
    const content = element.getBoxSize('content');
    const shadow = element.getTextShadow();
    this.restoreContext();
    if (shadow.color) {
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
    }

    // 固定格式（不可缺省）：font-weight font-size font-family
    ctx.font = `${element['font-weight']} ${element['font-size']} ${element['font-family']}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = element['text-align'];
    ctx.fillStyle = element.color;

    // 仅在 Windows 上生效，真机暂不支持
    ctx.textLetterSpacing = parseFloat(element['letter-spacing']) || 0;
    ctx.textWordSpacing = parseFloat(element['word-spacing']);
    // 小程序画布中无实际表现，暂不支持
    ctx.letterSpacing = element['letter-spacing'];
    ctx.wordSpacing = element['word-spacing'];

    const fontSize = parseFloat(element['font-size']);
    const isTextCentered = element['text-align'] === 'center';
    const isTextRightward = element['text-align'] === 'right';

    /** 文字行高 */
    let lineHeight;
    if (!Number.isNaN(+element['line-height'])) {
      lineHeight = fontSize * +element['line-height'];
    } else if (/px/.test(element['line-height'])) {
      lineHeight = parseFloat(element['line-height']);
    } else {
      lineHeight = fontSize * DEFAULT_LINE_HEIGHT;
    }
    /** 首行缩进 */
    let textIndent;
    if (/em/.test(element['text-indent'])) {
      textIndent = fontSize * +element['text-indent'];
    } else if (/px/.test(element['text-indent'])) {
      textIndent = parseFloat(element['text-indent']);
    } else if (/%/.test(element['text-indent'])) {
      textIndent = (parseFloat(element['text-indent']) / 100) * content.width;
    }

    /** 单行内容，逐行显示 */
    let lineText = '';
    /** 内容总行数 */
    let lines = 0;
    /** 计算元素内实际显示最大行数 */
    const maxLines = Math.round(content.height / lineHeight);
    // 消除行高计算偏差
    lineHeight = content.height / maxLines;
    /** 文字行宽 */
    let lineWidth;

    // 单行文字避免字体表现差异
    if (maxLines === 1 && element.overflow !== 'hidden') {
      // 向上取整避免宽度偏小，文字变形
      lineWidth = Math.ceil(content.width - textIndent);
      lineText = element.dataset.text;
    } else {
      // eslint-disable-next-line no-restricted-syntax
      for (const char of `${element.dataset.text}`) {
        // 判断换行符强制换行
        const isForcedLineBreak = char === LINE_BREAK_SYMBOL;
        // 判断是否首行缩进
        lineWidth = Math.ceil(content.width - (lines === 0 ? textIndent : 0));
        // 判断是否需要换行
        if (isForcedLineBreak
          || ctx.measureText(lineText + char).width > lineWidth
        ) {
          const isTextOverflow = (lines + 1) === maxLines;
          // 判断是否多余文字使用 ... 展示
          if (isTextOverflow && element['text-overflow'] === 'ellipsis') {
            while (ctx.measureText(`${lineText}...`).width > lineWidth) {
              lineText = lineText.slice(0, -1);
            }
            lineText = `${lineText}...`;
          }
          ctx.fillText(
            lineText,
            isTextRightward ? content.right : content.left + (
              lines === 0 ? textIndent : 0
            ) + (isTextCentered ? lineWidth / 2 : 0),
            content.top + fontSize * FONT_SIZE_OFFSET + (
              fontSize === lineHeight ? 0 : lineHeight * LINE_HEIGHT_OFFSET
            ) + lines * lineHeight,
            lineWidth,
          );
          if (isTextOverflow) {
            lineText = '';
            break;
          } else {
            lineText = isForcedLineBreak ? '' : char;
            lines += 1;
          }
        } else {
          lineText += char;
        }
      }
    }

    // 若不超出最高行数范围，绘制剩余文字
    if ((lines + 1) <= maxLines && lineText) {
      ctx.fillText(
        lineText,
        isTextRightward ? content.right : content.left + (
          lines === 0 ? textIndent : 0
        ) + (isTextCentered ? lineWidth / 2 : 0),
        content.top + fontSize * FONT_SIZE_OFFSET + (
          fontSize === lineHeight ? 0 : lineHeight * LINE_HEIGHT_OFFSET
        ) + lines * lineHeight,
        lineWidth,
      );
    }
    this.restoreContext();
  }

  /** 绘制 wxml 元素边框 */
  drawBorder() {
    const { context: ctx, element } = this;
    const border = element.getBorder();
    if (border.width === 0) return;
    this.restoreContext();
    this.setElementBoundary();
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width * 2;
    if (border.style === 'dashed') {
      ctx.lineDashOffset = -border.width * 2;
      ctx.setLineDash([2 * border.width, border.width]);
    }
    this.clipElementPath();
    ctx.stroke();
    this.restoreContext();
  }

  /** 绘制 wxml 元素阴影 */
  drawBoxShadow() {
    const { context: ctx, element } = this;
    const shadow = element.getBoxShadow();
    if (!shadow.color) return;
    this.restoreContext();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    const background = element.getBackgroundColor();
    // 必须填充背景色，否则阴影不可见
    ctx.fillStyle = `rgba(${background.rColor}, ${background.gColor}, ${background.bColor}, 1)`;
    this.clipElementPath();
    ctx.fill();
    this.restoreContext();
  }

  /**
   * 导出画布至临时图片
   * @param {Boolean} original 是否使用实机表现作为导出图片的尺寸；
   *
   * `true` 则导出当前实机设备渲染的尺寸，各设备的设备像素比不同，导出图片尺寸将有所不同；
   *
   * `false` 则导出以 750px 设计图为基准的尺寸，即与 WXSS 中设置的 rpx 大小一致，全设备导出图片尺寸一致；
   * @returns {Promise<String>} 图片临时路径
   */
  async toTempFilePath(original = true) {
    const payload = {
      canvas: this.canvas,
      fileType: 'png',
    };
    if (!original) {
      Object.assign(payload, {
        destWidth: this.container.width * RPX_RATIO * this.scale,
        destHeight: this.container.height * RPX_RATIO * this.scale,
      });
    }
    const { tempFilePath } = await wx.canvasToTempFilePath(payload, this.component);
    return tempFilePath;
  }
}

export default Canvas;
