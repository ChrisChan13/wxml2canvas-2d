/** 三角函数值 转换 弧度 换算比例 */
const TRI2RAD_RATIO = Math.PI / 180;
/** 椭圆形径向渐变的长短轴比例 */
// 暂未找到 CSS 中椭圆形径向渐变的长短轴生成规律，以常数代替实现近似结果
const SIDE2CORNER_RATIO = 1.4141;

/**
 * 获取 wxml 元素背景渐变类型
 * @param {Element} element wxml 元素
 * @returns {String} 渐变类型
 */
const getGradientType = (element) => {
  const backgroundImage = element['background-image'];
  if (!backgroundImage || backgroundImage === 'none') return '';
  if (backgroundImage.startsWith('linear-gradient')) return 'linear';
  if (backgroundImage.startsWith('radial-gradient')) return 'radial';
  if (backgroundImage.startsWith('conic-gradient')) return 'conic';
  return '';
};

/**
 * 获取 wxml 元素背景渐变内容
 * @param {String} gradientType 渐变类型
 * @param {String} backgroundImage wxml 元素背景
 * @returns {String} 渐变内容
 */
const getGradientContent = (gradientType, backgroundImage) => {
  let gradientContent;
  if (gradientType === 'linear') {
    [gradientContent] = backgroundImage.match(
      // 线性渐变语法参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/linear-gradient#%E5%BD%A2%E5%BC%8F%E8%AF%AD%E6%B3%95
      /linear-gradient\(((-?\d+(\.\d+)?(turn|deg|grad|rad))|(to( (left|top|bottom|right))+))?((, )?(((rgba?\(((, )?\d+(\.\d+)?)+\)|red)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))))+\)/,
    ) ?? [];
  } else if (gradientType === 'radial') {
    [gradientContent] = backgroundImage.match(
      // 径向渐变语法参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/radial-gradient#%E5%BD%A2%E5%BC%8F%E8%AF%AD%E6%B3%95
      /radial-gradient\((circle|ellipse)?(( ?(closest-corner|closest-side|farthest-corner|farthest-side))|( ?\d+(\.\d+)?(px|%))+)?( ?at( (left|top|bottom|right|center|(-?\d+(\.\d+)?(px|%))))+)?((, )?(((rgba?\(((, )?\d+(\.\d+)?)+\)|red)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))))+\)/,
    ) ?? [];
  } else if (gradientType === 'conic') {
    [gradientContent] = backgroundImage.match(
      // 锥形渐变语法参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/conic-gradient#%E5%BD%A2%E5%BC%8F%E8%AF%AD%E6%B3%95
      /conic-gradient\((from -?\d+(\.\d+)?(turn|deg|grad|rad))?( ?at( (left|top|bottom|right|center|(-?\d+(\.\d+)?(px|%))))+)?((, )?(((rgba?\(((, )?\d+(\.\d+)?)+\)|red)( -?\d+(\.\d+)?(turn|deg|grad|rad|%))*)|(-?\d+(\.\d+)?(turn|deg|grad|rad|%))))+\)/,
    );
  }
  return gradientContent;
};

/**
 * 生成线性渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const createLinearGradient = (ctx, element) => {
  const gradientContent = getGradientContent('linear', element['background-image']);
  if (!gradientContent) return undefined;
  const content = element.getBoxSize('padding');

  /** 矩形斜边长度 */
  const rectDiagonal = Math.sqrt(content.width ** 2 + content.height ** 2);

  /** 渐变角度描述内容 */
  const [angleContent] = gradientContent.match(/(-?\d+(\.\d+)?(turn|deg|grad|rad))|(to( (left|top|bottom|right))+)/) ?? [];
  /** 渐变角度，默认 180 度角，即从上往下 */
  let gradientAngle = 180;
  if (/-?\d+(\.\d+)?(turn|deg|grad|rad)/.test(angleContent)) {
    /** 当前单位 的一个完整圆的数值，默认单位：度 */
    let roundAngle = 360;
    /** 角度单位 与 当前单位 的单位换算比例，默认单位：度 */
    let angleRatio = 1;
    if (/turn/.test(angleContent)) { // 圈数
      roundAngle = 1;
      angleRatio = 360 / roundAngle;
    } else if (/grad/.test(angleContent)) { // 百分度数
      roundAngle = 400;
      angleRatio = 360 / roundAngle;
    } else if (/rad/.test(angleContent)) { // 弧度数
      roundAngle = 2 * Math.PI;
      angleRatio = 180 / Math.PI;
    }
    gradientAngle = angleRatio * (parseFloat(angleContent) % roundAngle);
    // 超过 180 度转换为 逆时针角度
    if (gradientAngle > 180) gradientAngle = -(360 - gradientAngle);
  } else if (angleContent === 'to left') { // 从右往左
    gradientAngle = -90;
  } else if (angleContent === 'to right') { // 从左往右
    gradientAngle = 90;
  } else if (angleContent === 'to top') { // 从下往上
    gradientAngle = 0;
  } else if (/( (left|top|bottom|right)){2}/.test(angleContent)) { // 斜上 或 斜下，对角方向
    gradientAngle = (
      /left/.test(angleContent) ? -1 : 1 // 左方向，转换为 逆时针角度
    ) * (90 + (
      /top/.test(angleContent) ? -1 : 1 // 上方向，锐角角度
    ) * (Math.atan(content.width / content.height) / TRI2RAD_RATIO));
  }

  // 关于线性渐变各点位置以及各个角度的计算
  // 参考官方图例：
  // https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/linear-gradient#%E7%BA%BF%E6%80%A7%E6%B8%90%E5%8F%98%E7%9A%84%E5%90%88%E6%88%90

  /** 渐变角度是否顺时针 */
  const isClockwise = gradientAngle >= 0;
  /** 渐变角度是否为钝角 */
  const isObtuse = Math.abs(gradientAngle) > 90;
  // 渐变角度 与 水平线 的夹角（锐角）
  const gradientAngleDiffHorizon = 90 - (
    isObtuse
      ? (180 - Math.abs(gradientAngle))
      : Math.abs(gradientAngle)
  );
  /** 渐变角度 与 矩形斜边 的夹角（锐角） */
  const gradientAngleDiffDiagonal = Math.abs(gradientAngle) - Math.abs(
    isObtuse
      ? 90 + Math.atan(content.height / content.width) / TRI2RAD_RATIO
      : Math.atan(content.width / content.height) / TRI2RAD_RATIO,
  );
  /** 渐变射线长度（标准） */
  const gradientDiagonal = Math.cos(gradientAngleDiffDiagonal * TRI2RAD_RATIO) * rectDiagonal;
  /** 实际渐变射线长度（拓展） */
  let realGradientDiagonal = gradientDiagonal;

  /** 渐变射线上代表起始颜色值的点 */
  const startingPoint = [];
  /** 渐变射线上代表最终颜色值的点 */
  const endingPoint = [];
  /** 渐变起始点的斜边长度 */
  const startingDiagonal = Math.sin(gradientAngleDiffDiagonal * TRI2RAD_RATIO) * (rectDiagonal / 2);
  /** 渐变起始点的 x 坐标 */
  const startingPointX = Math.sin(gradientAngleDiffHorizon * TRI2RAD_RATIO) * startingDiagonal;
  /** 渐变起始点的 y 坐标 */
  const startingPointY = Math.cos(gradientAngleDiffHorizon * TRI2RAD_RATIO) * startingDiagonal;

  /** 渐变起始点的斜边偏移长度 */
  let startingPrefixDiagonal = 0;
  /** 渐变起始点的 x 坐标偏移 */
  let startingPrefixX = 0;
  /** 渐变起始点的 y 坐标偏移 */
  let startingPrefixY = 0;
  /** 渐变最终点的斜边偏移长度 */
  let endingAffixDiagonal = 0;
  /** 渐变最终点的 x 坐标偏移 */
  let endingAffixX = 0;
  /** 渐变最终点的 y 坐标偏移 */
  let endingAffixY = 0;

  /** 渐变颜色描述内容 */
  const colorsContent = gradientContent.match(/((rgba?\(((, )?\d+(\.\d+)?)+\)|red)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))/g) ?? [];
  /** 渐变色标位置集合 */
  const colorStops = colorsContent.map((item, index) => {
    /** 渐变色标颜色 */
    const [color] = item.match(/rgba?\(((, )?\d+(\.\d+)?)+\)|red/) ?? [];
    /** 渐变色标位置 */
    const stops = (
      item.match(/-?\d+(\.\d+)?(px|%)/g) ?? []
    ).map((stopItem) => (
      parseFloat(stopItem) * (/%/.test(stopItem) ? gradientDiagonal / 100 : 1)
    ));
    /** 渐变色标信息 */
    const colorStop = { stops };
    if (color) { Object.assign(colorStop, { color }); }
    if (index === 0 && color && stops.length > 0) {
      const length = -stops[0];
      if (length > 0) { // 渐变起始点是否位于渐变射线上
        startingPrefixDiagonal = length;
        realGradientDiagonal += startingPrefixDiagonal;
        startingPrefixX = Math.sin(gradientAngle * TRI2RAD_RATIO) * startingPrefixDiagonal;
        startingPrefixY = Math.cos(gradientAngle * TRI2RAD_RATIO) * startingPrefixDiagonal;
      }
    } else if (index === colorsContent.length - 1 && color && stops.length > 0) {
      const length = stops[stops.length - 1];
      if (length > gradientDiagonal) { // 渐变终止点是否位于渐变射线上
        endingAffixDiagonal = length;
        realGradientDiagonal += endingAffixDiagonal;
        endingAffixX = Math.sin(gradientAngle * TRI2RAD_RATIO) * endingAffixDiagonal;
        endingAffixY = Math.cos(gradientAngle * TRI2RAD_RATIO) * endingAffixDiagonal;
      }
    }
    return colorStop;
  });

  startingPoint.push(
    (isClockwise ? content.left : content.right)
      + (isObtuse ? 1 : -1) * (isClockwise ? 1 : -1) * startingPointX - startingPrefixX,
    (isObtuse ? content.top : content.bottom) - startingPointY + startingPrefixY,
  );
  endingPoint.push(
    (isClockwise ? content.right : content.left)
      + (isObtuse ? -1 : 1) * (isClockwise ? 1 : -1) * startingPointX + endingAffixX,
    (isObtuse ? content.bottom : content.top) + startingPointY - endingAffixY,
  );
  /** 线性渐变对象 */
  const gradient = ctx.createLinearGradient(...startingPoint, ...endingPoint);

  for (let index = 0; index < colorStops.length; index++) {
    const item = colorStops[index];
    // 暂不支持控制渐变进程（插值提示）
    if (!item.color) continue;
    if (item.stops.length === 0) {
      if (index === 0) {
        item.stops.push(0); // 渐变起始点默认位置：0
      } else if (index === colorStops.length - 1) {
        item.stops.push(gradientDiagonal); // 渐变终止点默认位置：100%
      } else {
        /** 两个已声明位置信息的色标间，未声明位置信息的色标数量 */
        let stopInter = 1;
        let stopIndex = index;
        /** 上一个渐变色标位置 */
        const prevStop = colorStops[stopIndex - 1].stops.slice(-1)[0];
        /** 下一个渐变色标位置 */
        let nextStop;
        while (++stopIndex < colorStops.length) {
          stopInter += 1;
          if (colorStops[stopIndex].stops.length > 0) {
            [nextStop] = colorStops[stopIndex].stops;
            break;
          }
        }
        /** 当前渐变色标位置 */
        const currentStop = prevStop + ((nextStop ?? 1) - prevStop) / stopInter;
        item.stops.push(currentStop);
      }
    }
    let stopIndex = 0;
    for (; stopIndex < item.stops.length; stopIndex++) {
      const stopItem = item.stops[stopIndex];
      /** 色标位置偏移值 */
      const stopOffset = +Number(
        (startingPrefixDiagonal + stopItem) / realGradientDiagonal,
      ).toFixed(4);
      if (stopOffset > 1 || stopOffset < 0) break;
      gradient.addColorStop(stopOffset, item.color);
    }
  }
  return gradient;
};

/**
 * 生成径向渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const createRadialGradient = (ctx, element) => {
  const gradientContent = getGradientContent('radial', element['background-image']);
  if (!gradientContent) return undefined;
  const content = element.getBoxSize('padding');

  /** 渐变的位置 */
  const [position] = gradientContent.match(/at( (left|top|bottom|right|center|(-?\d+(\.\d+)?(px|%))))+/) ?? [];
  /** 渐变的形状 */
  let [endingShape] = gradientContent.match(/ellipse|circle/) ?? ['ellipse'];
  /** 渐变结束形状的大小描述 */
  const [sizeExtent] = gradientContent.match(/closest-corner|closest-side|farthest-corner|farthest-side/) ?? ['farthest-corner'];
  /** 渐变结束形状的大小数值 */
  const [radialSize] = gradientContent.match(/\(( ?\d+(\.\d+)?(px|%))+/) ?? [];

  /** 渐变起始位置的 x 坐标 */
  let positionX;
  /** 渐变起始位置的 y 坐标 */
  let positionY;
  if (position) {
    [, positionX, positionY] = position.split(' ');
    if (positionX === 'left') {
      positionX = 0;
    } else if (positionX === 'right') {
      positionX = content.width;
    } else if (positionX === 'center') {
      positionX = content.width / 2;
    } else if (/%/.test(positionX)) {
      positionX = content.width * (parseFloat(positionX) / 100);
    } else {
      positionX = parseFloat(positionX);
    }
    if (positionY === 'top') {
      positionY = 0;
    } else if (positionY === 'bottom') {
      positionY = content.height;
    } else if (positionY === 'center') {
      positionY = content.height / 2;
    } else if (/%/.test(positionY)) {
      positionY = content.height * (parseFloat(positionY) / 100);
    } else {
      positionY = parseFloat(positionY);
    }
  } else {
    positionX = content.width / 2;
    positionY = content.height / 2;
  }

  /** 渐变形状的 x 轴长度 */
  let radiusX;
  /** 渐变形状的 y 轴长度 */
  let radiusY;
  if (radialSize) {
    [radiusX, radiusY] = radialSize.split(' ');
    radiusX = radiusX.slice(1);
    if (/%/.test(radiusX)) {
      radiusX = content.width * (parseFloat(radiusX) / 100);
    } else {
      radiusX = parseFloat(radiusX);
    }
    if (!radiusY) {
      radiusY = radiusX;
    } else if (/%/.test(radiusY)) {
      radiusY = content.height * (parseFloat(radiusY) / 100);
    } else {
      radiusY = parseFloat(radiusY);
    }
    if (radiusX === radiusY) endingShape = 'circle';
  } else if (sizeExtent === 'closest-side') {
    radiusX = Math.min(Math.abs(positionX), Math.abs(positionX - content.width));
    radiusY = Math.min(Math.abs(positionY), Math.abs(positionY - content.height));
    if (endingShape === 'circle') {
      radiusX = Math.min(radiusX, radiusY);
      radiusY = radiusX;
    }
  } else if (sizeExtent === 'farthest-side') {
    radiusX = Math.max(Math.abs(positionX), Math.abs(positionX - content.width));
    radiusY = Math.max(Math.abs(positionY), Math.abs(positionY - content.height));
    if (endingShape === 'circle') {
      radiusX = Math.max(radiusX, radiusY);
      radiusY = radiusX;
    }
  } else if (sizeExtent === 'closest-corner') {
    radiusX = Math.min(Math.abs(positionX), Math.abs(positionX - content.width));
    radiusY = Math.min(Math.abs(positionY), Math.abs(positionY - content.height));
    if (endingShape === 'circle') {
      radiusX = Math.sqrt(radiusX ** 2 + radiusY ** 2);
      radiusY = radiusX;
    } else {
      radiusX *= SIDE2CORNER_RATIO;
      radiusY *= SIDE2CORNER_RATIO;
    }
  } else if (sizeExtent === 'farthest-corner') {
    radiusX = Math.max(Math.abs(positionX), Math.abs(positionX - content.width));
    radiusY = Math.max(Math.abs(positionY), Math.abs(positionY - content.height));
    if (endingShape === 'circle') {
      radiusX = Math.sqrt(radiusX ** 2 + radiusY ** 2);
      radiusY = radiusX;
    } else {
      radiusX *= SIDE2CORNER_RATIO;
      radiusY *= SIDE2CORNER_RATIO;
    }
  }

  /** 渐变形状的短轴长度 */
  const radius = Math.min(radiusX, radiusY);
  /** 实际径向渐变射线长度 */
  let realRadius = radius;

  /** 渐变颜色描述内容 */
  // 正则还存在问题，会把前面位置描述匹配到，但暂不影响结果
  const colorsContent = gradientContent.match(/((rgba?\(((, )?\d+(\.\d+)?)+\)|red)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))/g) ?? [];
  /** 渐变色标位置集合 */
  const colorStops = colorsContent.map((item) => {
    /** 渐变色标颜色 */
    const [color] = item.match(/rgba?\(((, )?\d+(\.\d+)?)+\)|red/) ?? [];
    /** 渐变色标位置 */
    const stops = (
      item.match(/-?\d+(\.\d+)?(px|%)/g) ?? []
    ).map((stopItem) => (
      parseFloat(stopItem) * (/%/.test(stopItem) ? radius / 100 : 1)
    ));
    /** 渐变色标信息 */
    const colorStop = { stops };
    if (color) { Object.assign(colorStop, { color }); }
    if (colorStop.stops[colorStop.stops.length - 1] > radius) {
      realRadius = colorStop.stops[colorStop.stops.length - 1];
    }
    return colorStop;
  });

  // 由于 Canvas 径向渐变只允许生成圆形径向渐变
  // 所以设置对应轴缩放比例，生成椭圆形径向渐变
  /** x 轴缩放比例 */
  const scaleX = radiusX / radius;
  /** y 轴缩放比例 */
  const scaleY = radiusY / radius;
  /** 缩放后渐变起始位置的 x 坐标 */
  const scaledLeft = (content.left + positionX) / scaleX;
  /** 缩放后渐变起始位置的 y 坐标 */
  const scaledTop = (content.top + positionY) / scaleY;
  /** 径向渐变对象 */
  const gradient = ctx.createRadialGradient(
    scaledLeft, scaledTop, 0,
    scaledLeft, scaledTop, realRadius,
  );

  for (let index = 0; index < colorStops.length; index++) {
    const item = colorStops[index];
    // 暂不支持控制渐变进程（插值提示）
    if (!item.color) continue;
    if (item.stops.length === 0) {
      if (index === 0) {
        item.stops.push(0); // 渐变起始点默认位置：0
      } else if (index === colorStops.length - 1) {
        item.stops.push(realRadius); // 渐变终止点默认位置：100%
      } else {
        /** 两个已声明位置信息的色标间，未声明位置信息的色标数量 */
        let stopInter = 1;
        let stopIndex = index;
        /** 上一个渐变色标位置 */
        const prevStop = colorStops[stopIndex - 1].stops.slice(-1)[0];
        /** 下一个渐变色标位置 */
        let nextStop;
        while (++stopIndex < colorStops.length) {
          stopInter += 1;
          if (colorStops[stopIndex].stops.length > 0) {
            [nextStop] = colorStops[stopIndex].stops;
            break;
          }
        }
        /** 当前渐变色标位置 */
        const currentStop = prevStop + ((nextStop ?? 1) - prevStop) / stopInter;
        item.stops.push(currentStop);
      }
    }
    let stopIndex = 0;
    for (; stopIndex < item.stops.length; stopIndex++) {
      const stopItem = item.stops[stopIndex];
      /** 色标位置偏移值 */
      const stopOffset = +Number(
        stopItem / realRadius,
      ).toFixed(4);
      if (stopOffset > 1 || stopOffset < 0) break;
      gradient.addColorStop(stopOffset, item.color);
    }
  }
  return {
    gradient,
    scale: {
      x: scaleX,
      y: scaleY,
    },
  };
};

/**
 * 生成锥形渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const createConicGradient = (ctx, element) => undefined;

/**
 * 生成并绘制渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const drawGradient = (ctx, element) => {
  const gradientType = getGradientType(element);
  let gradient;
  let scaleX = 1;
  let scaleY = 1;

  if (gradientType === 'linear') {
    if (!ctx.createLinearGradient) return;
    gradient = createLinearGradient(ctx, element);
  } else if (gradientType === 'radial') {
    if (!ctx.createRadialGradient) return;
    const radial = createRadialGradient(ctx, element);
    if (!radial) return;
    gradient = radial.gradient;
    scaleX = radial.scale.x;
    scaleY = radial.scale.y;
  } else if (gradientType === 'conic') {
    if (!ctx.createConicGradient) return;
    gradient = createConicGradient(ctx, element);
  }

  if (!gradient) return;
  ctx.fillStyle = gradient;
  ctx.scale(scaleX, scaleY);
  ctx.fillRect(
    scaleX > 1
      ? element.left / scaleX - element.width / 2 + element.width / scaleX / 2
      : element.left,
    scaleY > 1
      ? element.top / scaleY - element.height / 2 + element.height / scaleY / 2
      : element.top,
    element.width,
    element.height,
  );
  // 恢复画布比例
  ctx.scale(1 / scaleX, 1 / scaleY);
};
