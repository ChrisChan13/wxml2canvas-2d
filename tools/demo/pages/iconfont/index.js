Page({
  data: {
    isCompare: false,
    outputImage: '',
  },
  async onLoad() {
    try {
      await this.onLoadFontFace();
    } catch (err) {
      console.log(err);
    }
  },
  async onLoadFontFace() {
    wx.showLoading({
      title: '加载字体..',
    });
    await wx.loadFontFace({
      family: 'iconfont',
      source: 'https://bsvote.yolewa.com/1754663635396524.ttf',
      scopes: ['native'],
    });
    wx.hideLoading();
  },
  async onDrawCanvas() {
    try {
      const canvas = this.selectComponent('#wxml2canvas');
      wx.showLoading({
        title: '生成中..',
      });
      console.time('生成耗时');
      await canvas.draw();
      console.timeEnd('生成耗时');
      let timer = setTimeout(async () => {
        try {
          const url = await canvas.toTempFilePath();
          this.setData({ outputImage: url });
        } catch (err) {
          console.error(err);
        }
        wx.hideLoading();
        clearTimeout(timer);
        timer = null;
      }, 300);
    } catch (err) {
      console.error(err);
    }
  },
  onPreviewCanvas() {
    const { outputImage } = this.data;
    wx.previewImage({
      urls: [outputImage],
    });
  },
  onCanvasTouch() {
    this.setData({ isCompare: true });
  },
  onCanvasLeave() {
    this.setData({ isCompare: false });
  },
});
