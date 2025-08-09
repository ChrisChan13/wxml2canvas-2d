import {
  DEFAULT_LINE_HEIGHT, FONT_SIZE_OFFSET,
  SYS_DPR, RPX_RATIO, LINE_BREAK_SYMBOL,
  IS_MOBILE, VIDEO_POSTER_MODES,
  POSITIONS, DOUBLE_LINE_RATIO,
} from './constants';
import { drawGradient } from './gradient';

/**
 * 拆分文本
 * @param {String} text 文本内容
 * @returns {Array} 文本字符
 */
const segmentText = (text) => {
  // 使用内置的 Intl.Segmenter API 进行拆分，安卓设备不支持
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map((item) => item.segment);
  }
  return Array.from(text);
};

/**
 * 获取单词长度中位数
 * @param {Array} segments 单词数组
 * @return {Number} 单词长度中位数
 */
const getSegmentLengthMedian = (segments) => {
  const words = segments.filter((segment) => segment.isWord);
  const size = words.length;
  const lengths = words.map((segment) => segment.value.length).sort((a, b) => a - b);
  if (size % 2 === 1) {
    return lengths[Math.floor(size / 2)];
  }
  return (lengths[size / 2 - 1] + lengths[size / 2]) / 2;
};

/**
 * 拆分文本为单词与符号
 * @param {String} text 文本内容
 * @returns {Array} 单词与符号数组
 */
const segmentTextIntoWords = (text) => {
  /** 分隔符号计数 */
  let delimitersCount = 0;
  /** 单词计数 */
  let wordsCount = 0;
  /** 是否由单词组成 */
  let isWordBased = false;
  /** 单词与符号数组 */
  let segments = [];
  // 使用内置的 Intl.Segmenter API 进行拆分，安卓设备不支持
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    segments = Array.from(segmenter.segment(text)).map((item) => {
      if (!item.isWordLike) delimitersCount += 1;
      else wordsCount += 1;
      return {
        value: item.segment,
        isWord: item.isWordLike,
      };
    });
  } else {
    if (typeof text !== 'string') text = text.toString();
    /** 分隔符号匹配 */
    const delimiters = text.matchAll(/[,.!?; ]/g);
    let delimiter = delimiters.next();
    /** 连续分隔符号计数 */
    let consecutiveNonWord = 0;
    let lastIndex = 0;
    while (!delimiter.done) {
      const word = text.slice(lastIndex, delimiter.value.index);
      if (word) {
        // 单独处理换行符，不记入分隔符号
        if (new RegExp(`${LINE_BREAK_SYMBOL}`).test(word)) {
          // eslint-disable-next-line no-loop-func
          word.split(LINE_BREAK_SYMBOL).map((item) => {
            segments.push({
              value: item,
              isWord: true,
            }, {
              value: LINE_BREAK_SYMBOL,
              isWord: false,
            });
            wordsCount += 1;
            return item;
          });
          segments.splice(-1, 1);
        } else {
          segments.push({
            value: word,
            isWord: true,
          });
          wordsCount += 1;
        }
        consecutiveNonWord = 0;
      }
      segments.push({
        value: delimiter.value[0],
        isWord: false,
      });
      // 连续的分隔符号只计一次
      if (consecutiveNonWord === 0) {
        delimitersCount += 1;
      }
      consecutiveNonWord += 1;
      lastIndex = delimiter.value.index + delimiter.value[0].length;
      delimiter = delimiters.next();
    }
    if (lastIndex < text.length) {
      segments.push({
        value: text.slice(lastIndex),
        isWord: true,
      });
      wordsCount += 1;
    }
  }
  /**
   * 判断是否由单词组成
   *
   * 1. 单词数量超过 1 个
   * 2. 单词长度中位数不超过 13
   * 3. 分隔符号占比超过 30%
   */
  isWordBased = wordsCount > 1 && getSegmentLengthMedian(segments) <= 13
    && delimitersCount / (wordsCount + delimitersCount) > 0.3;
  if (!isWordBased) {
    segments = segmentText(text).map((item) => ({
      value: item,
      isWord: true,
    }));
  }
  return segments;
};

/**
 * 获取画布对象
 * @param {ComponentObject} component 组件实例对象
 * @param {String} selector 选择器
 * @returns {Promise<Canvas>} 画布对象
 */
const getCanvas = (component, selector) => new Promise(
  (resolve) => {
    if (selector) {
      const query = component.createSelectorQuery();
      query.select(selector).fields({
        node: true,
      }).exec((res) => {
        const [{ node: canvas }] = res;
        resolve(canvas);
      });
    } else {
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        compInst: component,
      });
      resolve(canvas);
    }
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
 * 获取等边三角形顶点坐标
 * @param {Number} x 中心点 x 轴坐标
 * @param {Number} y 中心点 y 轴坐标
 * @param {Number} l 等边三角形边长
 * @returns {Array} 顶点坐标数组
 */
const getEquilateralTriangle = (x, y, l) => {
  const area = (Math.sqrt(3) / 4) * l ** 2;
  const halfLength = l / 2;
  const centerToSide = ((area / 6) * 2) / halfLength;
  const centerToCorner = (area * 2) / l - centerToSide;
  const a = [x - centerToSide, y - halfLength];
  const b = [x + centerToCorner, y];
  const c = [x - centerToSide, y + halfLength];
  return [a, b, c];
};

/**
 * 变换矩阵逆运算，获取原始坐标
 * @param {Number} m11 矩阵中第一行第一列的单元格
 * @param {Number} m12 矩阵中第二行第一列的单元格
 * @param {Number} m21 矩阵中第一行第二列的单元格
 * @param {Number} m22 矩阵中第二行第二列的单元格
 * @param {Number} m41 矩阵中第一行第三列的单元格
 * @param {Number} m42 矩阵中第二行第三列的单元格
 * @param {Number} xTransformed 变换后的 x 坐标
 * @param {Number} yTransformed 变换后的 y 坐标
 * @returns 原始坐标 (x, y)
 */
const inverseTransform = (m11, m12, m21, m22, m41, m42, xTransformed, yTransformed) => {
  // 计算行列式
  const det = m11 * m22 - m12 * m21;
  if (det === 0) {
    throw new Error('Transform is not invertible (determinant is zero)');
  }
  // 计算原始坐标
  const x = (m22 * (xTransformed - m41) - m21 * (yTransformed - m42)) / det;
  const y = (-m12 * (xTransformed - m41) + m11 * (yTransformed - m42)) / det;
  return { x, y };
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
    this.isOffscreen = !selector;
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
      const unitRotateAngle = Math.PI / 180;

      /** 元素左外边距 与 内容左外边距 的差值 */
      const diffLeft = content.left - element.left;
      /** 元素右外边距 与 内容右外边距 的差值 */
      const diffRight = element.right - content.right;
      /** 元素顶外边距 与 内容顶外边距 的差值 */
      const diffTop = content.top - element.top;
      /** 元素底外边距 与 内容底外边距 的差值 */
      const diffBottom = element.bottom - content.bottom;

      /** 元素左顶圆角 */
      const leftTopRadius = radius.leftTop - diffLeft;
      /** 元素顶左圆角 */
      const topLeftRadius = radius.topLeft - diffTop;
      /** 元素顶右圆角 */
      const topRightRadius = radius.topRight - diffTop;
      /** 元素右顶圆角 */
      const rightTopRadius = radius.rightTop - diffRight;
      /** 元素右底圆角 */
      const rightBottomRadius = radius.rightBottom - diffRight;
      /** 元素底右圆角 */
      const bottomRightRadius = radius.bottomRight - diffBottom;
      /** 元素底左圆角 */
      const bottomLeftRadius = radius.bottomLeft - diffBottom;
      /** 元素左底圆角 */
      const leftBottomRadius = radius.leftBottom - diffLeft;

      if (leftTopRadius === topLeftRadius) {
        ctx.moveTo(content.left, content.top + topLeftRadius);
        ctx.arcTo(
          content.left,
          content.top,
          content.left + leftTopRadius,
          content.top,
          topLeftRadius,
        );
      } else {
        ctx.ellipse(
          content.left + leftTopRadius,
          content.top + topLeftRadius,
          leftTopRadius,
          topLeftRadius,
          -180 * unitRotateAngle,
          0,
          Math.PI / 2,
        );
      }
      ctx.lineTo(content.right - rightTopRadius, content.top);
      if (rightTopRadius === topRightRadius) {
        ctx.arcTo(
          content.right,
          content.top,
          content.right,
          content.top + topRightRadius,
          topRightRadius,
        );
      } else {
        ctx.ellipse(
          content.right - rightTopRadius,
          content.top + topRightRadius,
          topRightRadius,
          rightTopRadius,
          -90 * unitRotateAngle,
          0,
          Math.PI / 2,
        );
      }
      ctx.lineTo(content.right, content.bottom - bottomRightRadius);
      if (rightBottomRadius === bottomRightRadius) {
        ctx.arcTo(
          content.right,
          content.bottom,
          content.right - rightBottomRadius,
          content.bottom,
          bottomRightRadius,
        );
      } else {
        ctx.ellipse(
          content.right - rightBottomRadius,
          content.bottom - bottomRightRadius,
          rightBottomRadius,
          bottomRightRadius,
          0,
          0,
          Math.PI / 2,
        );
      }
      ctx.lineTo(content.left + leftBottomRadius, content.bottom);
      if (leftBottomRadius === bottomLeftRadius) {
        ctx.arcTo(
          content.left,
          content.bottom,
          content.left,
          content.bottom - bottomLeftRadius,
          bottomLeftRadius,
        );
      } else {
        ctx.ellipse(
          content.left + leftBottomRadius,
          content.bottom - bottomLeftRadius,
          bottomLeftRadius,
          leftBottomRadius,
          90 * unitRotateAngle,
          0,
          Math.PI / 2,
        );
      }
      ctx.lineTo(content.left, content.top + topLeftRadius);
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

  /**
   * 设置 wxml 元素的边界
   * @param {String} sizing 盒子模型描述
   */
  setElementBoundary(sizing = 'border') {
    this.clipElementPath(sizing);
    this.context.clip();
  }

  /**
   * 设置 wxml 元素的边框边界
   * @param {String} borderSide 边框位置
   * @param {String} outerSizing 外框盒子模型描述
   * @param {String} innerSizing 内框盒子模型描述
   */
  setBorderBoundary(borderSide, outerSizing = 'border', innerSizing = 'padding') {
    const { context: ctx, element } = this;
    const outerVertex = element.getVertex(outerSizing);
    const innerVertex = element.getVertex(innerSizing);
    ctx.beginPath();
    const start = POSITIONS.indexOf(borderSide);
    const end = start === 0 ? POSITIONS.length - 1 : start - 1;
    ctx.moveTo(...outerVertex[start]);
    ctx.lineTo(...innerVertex[start]);
    ctx.lineTo(...innerVertex[end]);
    ctx.lineTo(...outerVertex[end]);
    ctx.closePath();
    ctx.clip();
  }

  /** 设置 wxml 元素的变换矩阵 */
  setTransform() {
    const { context: ctx, element } = this;
    const { transform } = element;
    if (!transform || transform === 'none') return;
    const [m11, m12, m21, m22, m41, m42] = transform.slice(7).slice(0, -1).split(', ');
    // 变换后的中心点
    const xTransformed = element.left + element.width / 2;
    const yTransformed = element.top + element.height / 2;
    // 变换前的中心点
    const { x, y } = inverseTransform(
      m11, m12, m21, m22, m41, m42, xTransformed, yTransformed,
    );
    // 变换前的节点信息
    Object.assign(element, {
      left: x - element.__computedRect.width / 2,
      top: y - element.__computedRect.height / 2,
      right: x + element.__computedRect.width / 2,
      bottom: y + element.__computedRect.height / 2,
      width: element.__computedRect.width,
      height: element.__computedRect.height,
    });
    ctx.transform(m11, m12, m21, m22, m41, m42);
    ctx.save();
  }

  /** 重置 wxml 元素的变换矩阵 */
  resetTransform() {
    const { context: ctx, scale, container } = this;
    const { transform } = this.element;
    if (!transform || transform === 'none') return;
    ctx.resetTransform();
    ctx.scale(scale * SYS_DPR, scale * SYS_DPR);
    ctx.translate(-container.left, -container.top);
    ctx.save();
  }

  /**
   * 绘制 wxml 元素的背景色
   * @param {String} color 背景色
   */
  drawBackgroundColor(color) {
    const { context: ctx, element } = this;
    const clips = element['background-clip'].split(', ');
    const colorClip = clips[clips.length - 1].slice(0, -4);

    this.restoreContext();
    if (colorClip !== 'border') {
      this.setElementBoundary(colorClip);
    } else {
      this.setElementBoundary();
    }
    ctx.fillStyle = color ?? element['background-color'];
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

  /**
   * 绘制 wxml 的 image 元素
   * @param {String} src 图片链接
   * @param {String} mode 图片裁剪、缩放的模式
   */
  async drawImage(src, mode) {
    const { element } = this;
    this.restoreContext();
    this.setElementBoundary();
    const image = await this.createImage(src ?? element.src);
    let dx;
    let dy;
    let dWidth;
    let dHeight;
    let sx;
    let sy;
    let sWidth;
    let sHeight;
    const content = element.getBoxSize('content');
    if ((mode ?? element.mode) === 'aspectFit') {
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
    } else if ((mode ?? element.mode) === 'aspectFill') {
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

  /** 绘制 wxml 的 video 元素 */
  async drawVideo() {
    const { context: ctx, element } = this;
    this.drawBackgroundColor('#000000');
    if (element.poster) {
      await this.drawImage(element.poster, VIDEO_POSTER_MODES[element.objectFit]);
    }
    this.restoreContext();
    this.setElementBoundary();
    /** 播放按钮边长 */
    const LENGTH = 50;
    /** 播放按钮顶点坐标 */
    const vertexes = getEquilateralTriangle(
      element.left + element.width / 2, element.top + element.height / 2, LENGTH,
    );
    /** 播放按钮圆角数据 */
    const RADIUS = [0, 0, 8];
    RADIUS[0] = RADIUS[2] / 2;
    RADIUS[1] = Math.sqrt(3) * RADIUS[0];
    ctx.beginPath();
    ctx.moveTo(vertexes[0][0], vertexes[0][1] + RADIUS[2]);
    ctx.quadraticCurveTo(
      vertexes[0][0], vertexes[0][1],
      vertexes[0][0] + RADIUS[1], vertexes[0][1] + RADIUS[0],
    );
    ctx.lineTo(vertexes[1][0] - RADIUS[1], vertexes[1][1] - RADIUS[0]);
    ctx.quadraticCurveTo(
      vertexes[1][0], vertexes[1][1],
      vertexes[1][0] - RADIUS[1], vertexes[1][1] + RADIUS[0],
    );
    ctx.lineTo(vertexes[2][0] + RADIUS[1], vertexes[2][1] - RADIUS[0]);
    ctx.quadraticCurveTo(
      vertexes[2][0], vertexes[2][1],
      vertexes[2][0], vertexes[2][1] - RADIUS[2],
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    this.restoreContext();
  }

  /**
   * 绘制 wxml 的 canvas 元素
   * @param {Object} instance canvas 元素所在页面/组件实例
   */
  async drawCanvas(instance) {
    const { element } = this;
    const payload = {
      fileType: 'png',
    };
    if (element.type === '2d') {
      Object.assign(payload, {
        canvas: element.node,
      });
    } else {
      Object.assign(payload, {
        canvasId: element.canvasId,
      });
    }
    const { tempFilePath } = await wx.canvasToTempFilePath(payload, instance);
    await this.drawImage(tempFilePath);
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
    /** 文本方向向右 */
    const isTextRTL = element.direction === 'rtl';
    const isTextCentered = element['text-align'] === 'center';
    const isTextRightAlign = element['text-align'] === 'right' || (isTextRTL && element['text-align'] === 'start');
    ctx.textAlign = isTextRightAlign ? 'right' : isTextCentered ? 'center' : 'left';

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

    /**
     * 计算元素内实际显示最大行数
     *
     * 向上取整避免行高过大，文字错位
     */
    const maxLines = Math.max(Math.ceil(
      Number(content.height / lineHeight).toFixed(1),
    ), 1);
    // 消除行高计算偏差
    lineHeight = content.height / maxLines;
    /** 单行内容，逐行显示 */
    let lineText = '';
    /** 内容基本单位拆分 */
    const segments = segmentTextIntoWords(
      element.dataset.icon
        ? String.fromCharCode(parseInt(element.dataset.icon, 16))
        : element.dataset.text,
    );

    let lines = 0;
    let lastIndex = 0;
    let segment = segments[lastIndex];
    let lastSegment;
    for (; lines < maxLines; lines += 1) {
      /**
       * 计算最大限制行宽
       *
       * 判断首行缩进，取整避免行宽过小，导致文字变形
       */
      const lineWidth = Math.ceil(content.width - (lines === 0 ? textIndent : 0));
      while (segment && ctx.measureText(lineText + segment.value).width <= lineWidth) {
        const isForcedLineBreak = segment.value === LINE_BREAK_SYMBOL;
        lineText += segment.value;
        lastSegment = segment;
        lastIndex += 1;
        segment = segments[lastIndex];
        // 判断换行符强制换行
        if (isForcedLineBreak) break;
      }

      /** 是否内容最后一行 */
      const isLastLine = (lines + 1) === maxLines;
      if (isLastLine && lastIndex < segments.length - 1 && element['text-overflow'] === 'ellipsis') {
        let ellipsisLineText = isTextRTL && !IS_MOBILE ? `...${lineText}` : `${lineText}...`;
        while (ctx.measureText(ellipsisLineText).width > lineWidth) {
          lineText = lineText.slice(0, -1);
          ellipsisLineText = isTextRTL && !IS_MOBILE ? `...${lineText}` : `${lineText}...`;
        }
        lineText = ellipsisLineText;
      } else if (isLastLine && segment) {
        // 因画布与页面文字表现不一致，溢出内容放置于末行
        lineText += segment.value;
        lastSegment = segment;
      }
      if (isTextRTL && !IS_MOBILE && lastSegment && !lastSegment.isWord) {
        lineText = lineText.slice(0, -lastSegment.value.length);
        lineText = `${lastSegment.value}${lineText}`;
      }
      lineText = lineText.trim();
      if (isTextRTL && IS_MOBILE) {
        lineText = segmentText(lineText).reverse().join('');
      }

      const lineLeft = (
        isTextRightAlign ? content.right : content.left
      ) + ( // 首行缩进位置偏移
        (isTextRightAlign ? -1 : 1) * (lines === 0 ? textIndent : 0)
      ) + ( // 文字居中位置偏移
        (isTextRightAlign ? -1 : 1) * (isTextCentered ? lineWidth / 2 : 0)
      );
      const lineTop = content.top + lines * lineHeight;
      const lineTopOffset = (
        lineHeight - fontSize * FONT_SIZE_OFFSET
      ) / 2;
      ctx.fillText(
        lineText,
        lineLeft,
        lineTop + lineTopOffset,
        lineWidth,
      );

      /** 文字实际宽度 */
      const textWidth = Math.min(ctx.measureText(lineText).width, lineWidth);
      let decorLines = element['text-decoration-line'];
      if (decorLines && decorLines !== 'none') {
        const decorStyle = element['text-decoration-style'];
        const decorColor = element['text-decoration-color'];
        ctx.strokeStyle = decorColor;
        ctx.lineWidth = 2 / RPX_RATIO;
        if (decorStyle === 'dashed') {
          ctx.setLineDash([4, 4]);
        }

        decorLines = decorLines.split(' ').map((decor) => {
          let decorLineLeft = lineLeft;
          let decorLineTop = lineTop;
          if (isTextCentered) {
            decorLineLeft -= textWidth / 2;
          } else if (isTextRightAlign) {
            decorLineLeft -= textWidth;
          }
          if (decor === 'line-through') {
            decorLineTop += lineTopOffset + fontSize / 2;
          } else if (decor === 'underline') {
            decorLineTop += lineTopOffset + fontSize;
          }
          ctx.beginPath();
          ctx.moveTo(decorLineLeft, decorLineTop);
          ctx.lineTo(decorLineLeft + textWidth, decorLineTop);
          ctx.closePath();
          ctx.stroke();
          if (decorStyle === 'double') {
            decorLineTop += 2 * ctx.lineWidth;
            ctx.beginPath();
            ctx.moveTo(decorLineLeft, decorLineTop);
            ctx.lineTo(decorLineLeft + textWidth, decorLineTop);
            ctx.closePath();
            ctx.stroke();
          }
          return decor;
        });
      }

      lineText = '';
    }
    this.restoreContext();
  }

  /** 绘制 wxml 元素边框 */
  drawBorder() {
    const { context: ctx, element } = this;
    const border = element.getBorder();
    if (border.width > 0) {
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
    } else {
      const vertex = element.getVertex();
      POSITIONS.map((key, index) => {
        if (border[key].width === 0) return key;
        this.restoreContext();
        this.setBorderBoundary(key);
        ctx.strokeStyle = border[key].color;
        if (border[key].style === 'double') {
          ctx.lineWidth = border[key].width * DOUBLE_LINE_RATIO * 2;
          const innerVertex = element.getVertex('padding');
          const point = [];
          // 双实线边框的宽高，加长避免露出矩形其他边
          const width = ['left', 'right'].indexOf(key) > -1 ? border[key].width : (element.width + 2 * ctx.lineWidth);
          const height = ['top', 'bottom'].indexOf(key) > -1 ? border[key].width : (element.height + 2 * ctx.lineWidth);
          if (key === 'right') {
            point.push(innerVertex[1][0], vertex[1][1] - ctx.lineWidth);
          } else if (key === 'bottom') {
            point.push(vertex[3][0] - ctx.lineWidth, innerVertex[3][1]);
          } else {
            point.push(
              vertex[0][0] - (key === 'top' ? ctx.lineWidth : 0),
              vertex[0][1] - (key === 'left' ? ctx.lineWidth : 0),
            );
          }
          ctx.beginPath();
          ctx.rect(...point, width, height);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.lineWidth = border[key].width * 2;
          if (border[key].style === 'dashed') {
            ctx.lineDashOffset = -border[key].width * 2;
            ctx.setLineDash([2 * border[key].width, 2 * border[key].width]);
          }
          const line = [vertex[index], vertex[index === 0 ? POSITIONS.length - 1 : index - 1]];
          ctx.beginPath();
          ctx.moveTo(...line[0]);
          ctx.lineTo(...line[1]);
          ctx.closePath();
          ctx.stroke();
        }
        this.restoreContext();
        return key;
      });
    }
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

  /**
   * 导出画布至 Data URI（base64 编码）
   *
   * iOS、Mac 与 Windows 平台在离屏 Canvas 模式下使用 `wx.canvasToTempFilePath` 导出时会报错
   *
   * 可以使用 `Canvas.toDataURL` 搭配 `FileSystemManager.saveFile` 保存导出的图片
   * @returns {String} URI
   */
  toDataURL() {
    return this.canvas.toDataURL();
  }

  /**
   * 获取画布的像素数据
   */
  getImageData() {
    return this.context.getImageData(
      0, 0, this.canvas.width, this.canvas.height,
    );
  }
}

export default Canvas;
