import defer from '../../utils/defer';

Page({
  data: {
    nodes: [{}, {}, {}],
    images: [],
    current: 0,
    generated: false,
  },
  onSwiperChange(e) {
    this.setData({
      current: e.detail.current,
    });
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
            const url = await canvas.toTempFilePath();
            deferred.resolve(url);
          } catch (err) {
            deferred.reject(err);
          }
          clearTimeout(timer);
          timer = null;
        }, 300);
        return deferred.promise;
      }));
      wx.hideLoading();
      this.setData({
        generated: true,
        images,
      });
      this.onPreviewCanvas();
    } catch (err) {
      console.error(err);
    }
  },
  onPreviewCanvas() {
    const { images, current } = this.data;
    wx.previewImage({
      urls: images,
      current: images[current],
    });
  },
});
