Page({
  data: {
    isCompare: false,
    tempImage: '',
  },
  async onDrawCanvas() {
    const canvas = this.selectComponent('#wxml2canvas');
    console.time('生成耗时');
    await canvas.draw();
    console.timeEnd('生成耗时');
    setTimeout(async () => {
      const url = await canvas.toTempFilePath();
      this.setData({ tempImage: url });
    }, 300);
  },
  onPreviewCanvas() {
    const { tempImage } = this.data;
    wx.previewImage({
      urls: [tempImage],
    });
  },
  onCanvasTouch() {
    this.setData({ isCompare: true });
  },
  onCanvasLeave() {
    this.setData({ isCompare: false });
  },
  async onLoadFontFace() {
    wx.showLoading({
      title: '加载字体..',
    });
    await wx.loadFontFace({
      family: 'QianTuXianMoTi',
      source: 'https://qnvotes.yolewa.com/QianTuXianMoTi-2.ttf',
      scopes: ['webview', 'native'],
    });
    wx.hideLoading();
    this.onDrawCanvas();
  },
});
