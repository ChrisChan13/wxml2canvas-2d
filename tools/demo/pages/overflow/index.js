import defer from '../../utils/defer';

Page({
  data: {
    nodes: Array(10).fill({}),
    generated: false,
    outputImage: '',
    width: 0,
    height: 0,
  },
  async onDrawCanvas() {
    try {
      wx.showLoading({
        title: '生成中..',
      });
      const images = await Promise.all(this.data.nodes.map(async (item, index) => {
        const deferred = defer();
        const canvas = this.selectComponent(`#wxml2canvas_${index}`);
        console.time(`生成第 ${index + 1} 张耗时`);
        await canvas.draw();
        console.timeEnd(`生成第 ${index + 1} 张耗时`);
        let timer = setTimeout(async () => {
          try {
            const src = await canvas.toTempFilePath();
            const info = await wx.getImageInfo({ src });
            deferred.resolve(info);
          } catch (err) {
            deferred.reject(err);
          }
          clearTimeout(timer);
          timer = null;
        }, 300);
        return deferred.promise;
      }));
      wx.hideLoading();
      wx.showLoading({
        title: '合成中..',
      });
      const outputImage = await this.onComposeImages(images);
      wx.hideLoading();
      this.setData({
        generated: true,
        outputImage,
      });
      this.onPreviewCanvas();
    } catch (err) {
      console.error(err);
    }
  },
  async onComposeImages(images) {
    const deferred = defer();
    const width = Math.max(...images.map((i) => i.width));
    const height = images.map((i) => i.height).reduce((p, n) => p + n);
    this.setData({ width, height });
    const ctx = wx.createCanvasContext('output');
    let offset = 0;
    images.map((item) => {
      ctx.drawImage(item.path, 0, offset);
      offset += item.height;
      return item;
    });
    ctx.draw(false, () => {
      let timer = setTimeout(async () => {
        try {
          const { tempFilePath } = await wx.canvasToTempFilePath({
            canvasId: 'output',
          });
          deferred.resolve(tempFilePath);
        } catch (err) {
          deferred.reject(err);
        }
        clearTimeout(timer);
        timer = null;
      }, 300);
    });
    return deferred.promise;
  },
  onPreviewCanvas() {
    const { outputImage } = this.data;
    wx.previewImage({
      urls: [outputImage],
    });
  },
});
