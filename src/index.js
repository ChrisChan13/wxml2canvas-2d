import Element from './element';
import Canvas from './canvas';

/**
 * 绘制 wxml 元素
 * @param {Canvas} canvas 画布对象
 * @param {Element} element wxml 元素
 */
const drawElement = async (canvas, element) => {
  // 设置画布的当前 wxml 元素上下文（必要）
  canvas.setElement(element);

  canvas.drawBoxShadow();
  canvas.drawBackgroundColor();
  await canvas.drawBackgroundImage();
  if (element.src) {
    await canvas.drawImage();
  } else if (element.dataset.text) {
    canvas.drawText();
  }
  canvas.drawBorder();
  canvas.restoreContext();
};

Component({
  externalClasses: ['box-class'],
  properties: {
    // 根节点（容器）样式类名称
    containerClass: {
      type: String,
      value: 'wxml2canvas-container',
    },
    // 内部节点样式类名称
    itemClass: {
      type: String,
      value: 'wxml2canvas-item',
    },
    // 画布缩放比例
    scale: {
      type: Number,
      value: 1,
    },
  },
  data: {
    // 画布宽度
    canvasWidth: 300,
    // 画布高度
    canvasHeight: 150,
  },
  methods: {
    /**
     * setData 同步版
     * @param {Object} data
     * @returns {Promise<void>}
     */
    setDataSync(data) {
      return new Promise((resolve) => {
        this.setData(data, resolve);
      });
    },
    /**
     * 绘制画布内容
     * @param {PageObject} page 页面实例对象，默认当前页面实例
     */
    async draw(page) {
      if (!page) {
        const pages = getCurrentPages();
        page = pages[pages.length - 1];
      }

      const { containerClass, itemClass, scale } = this.data;
      const fields = {
        size: true,
        rect: true,
        dataset: true,
        properties: [
          ...Element.COMMON_PROPERTIES,
          ...Element.TEXT_PROPERTIES,
          ...Element.IMAGE_PROPERTIES,
        ],
        computedStyle: [
          ...Element.COMMON_COMPUTED_STYLE,
          ...Element.TEXT_COMPUTED_STYLE,
          ...Element.IMAGE_COMPUTED_STYLE,
        ],
      };
      const [container] = await Element.getNodesRef(`.${containerClass}`, fields, page);
      await this.setDataSync({
        canvasWidth: container.width * scale,
        canvasHeight: container.height * scale,
      });
      const items = await Element.getNodesRef(`.${containerClass} .${itemClass}`, fields, page);

      const canvas = this.canvas = new Canvas(this, '#wxml2canvas');
      await canvas.init(container, scale);

      // 绘制最外层容器 wxml 元素
      const containerElement = new Element(container);
      await drawElement(canvas, containerElement);

      // 绘制内层各 wxml 元素
      // eslint-disable-next-line no-restricted-syntax
      for (const item of items) {
        const itemElement = new Element(item);
        // eslint-disable-next-line no-await-in-loop
        await drawElement(canvas, itemElement);
      }
    },
    /**
     * 把画布内容导出生成图片
     * @param {Boolean} original 是否使用实机表现作为导出图片的尺寸；
     * true 则导出当前实机设备渲染的尺寸，各设备的设备像素比不同，导出图片尺寸将有所不同；
     * false 则导出以 750px 设计图为基准的尺寸，即与 CSS 中设置的 rpx 大小一致，全设备导出图片尺寸一致；
     * @returns {Promise<String>} 图片临时路径
     */
    async toTempFilePath(original = true) {
      const tempFilePath = await this.canvas.toTempFilePath(original);
      return tempFilePath;
    },
  },
});
