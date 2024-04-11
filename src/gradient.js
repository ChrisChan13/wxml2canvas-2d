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
      /linear-gradient\(((-?\d+(\.\d+)?(turn|deg|grad|rad))|(to( (left|top|bottom|right))+))?((, )?((rgba?\(((, )?\d+(\.\d+)?)+\)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))))+\)/,
    ) ?? [];
  } else if (gradientType === 'radial') {
    [gradientContent] = backgroundImage.match(
      // 径向渐变语法参考：https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/radial-gradient#%E5%BD%A2%E5%BC%8F%E8%AF%AD%E6%B3%95
      /radial-gradient\((circle|ellipse)?(( ?closest-corner|closest-side|farthest-corner|farthest-side)|( ?-?\d+(\.\d+)?(px|%))+)?( ?at( (left|top|bottom|right|center|(-?\d+(\.\d+)?(px|%))))+)?((, )?((rgba?\(((, )?\d+(\.\d+)?)+\)( \d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))))+\)/,
    ) ?? [];
  } else if (gradientType === 'conic') {
    // todo
  }
  // console.log(gradientContent);
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

  /** 三角函数值 转换 弧度 换算比例 */
  const tri2radRatio = Math.PI / 180;
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
    ) * (Math.atan(content.width / content.height) / tri2radRatio));
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
      ? 90 + Math.atan(content.height / content.width) / tri2radRatio
      : Math.atan(content.width / content.height) / tri2radRatio,
  );
  /** 渐变射线长度（标准） */
  const gradientDiagonal = Math.cos(gradientAngleDiffDiagonal * tri2radRatio) * rectDiagonal;
  /** 实际渐变射线长度（拓展） */
  let realGradientDiagonal = gradientDiagonal;

  /** 渐变射线上代表起始颜色值的点 */
  const startingPoint = [];
  /** 渐变射线上代表最终颜色值的点 */
  const endingPoint = [];
  /** 渐变起始点的斜边长度 */
  const startingDiagonal = Math.sin(gradientAngleDiffDiagonal * tri2radRatio) * (rectDiagonal / 2);
  /** 渐变起始点的 x 坐标 */
  const startingPointX = Math.sin(gradientAngleDiffHorizon * tri2radRatio) * startingDiagonal;
  /** 渐变起始点的 y 坐标 */
  const startingPointY = Math.cos(gradientAngleDiffHorizon * tri2radRatio) * startingDiagonal;

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
  const colorsContent = gradientContent.match(/(rgba?\(((, )?\d+(\.\d+)?)+\)( -?\d+(\.\d+)?(px|%))*)|(-?\d+(\.\d+)?(px|%))/g) ?? [];
  /** 渐变色标位置集合 */
  const colorStops = colorsContent.map((item, index) => {
    /** 渐变色标颜色 */
    const [color] = item.match(/rgba?\(((, )?\d+(\.\d+)?)+\)/) ?? [];
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
        startingPrefixX = Math.sin(gradientAngle * tri2radRatio) * startingPrefixDiagonal;
        startingPrefixY = Math.cos(gradientAngle * tri2radRatio) * startingPrefixDiagonal;
      }
    } else if (index === colorsContent.length - 1 && color && stops.length > 0) {
      const length = stops[stops.length - 1];
      if (length > gradientDiagonal) { // 渐变终止点是否位于渐变射线上
        endingAffixDiagonal = length;
        realGradientDiagonal += endingAffixDiagonal;
        endingAffixX = Math.sin(gradientAngle * tri2radRatio) * endingAffixDiagonal;
        endingAffixY = Math.cos(gradientAngle * tri2radRatio) * endingAffixDiagonal;
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
export const createRadialGradient = (ctx, element) => undefined;

/**
 * 生成锥形渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const createConicGradient = (ctx, element) => undefined;

/**
 * 生成渐变对象
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {Element} element wxml 元素
 * @returns {CanvasGradient} 渐变对象
 */
export const createGradient = (ctx, element) => {
  const gradientType = getGradientType(element);
  if (gradientType === 'linear') return createLinearGradient(ctx, element);
  if (gradientType === 'radial') return createRadialGradient(ctx, element);
  if (gradientType === 'conic') return createConicGradient(ctx, element);
  return undefined;
};
