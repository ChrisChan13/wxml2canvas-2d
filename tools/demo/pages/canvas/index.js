const createImage = (canvas, src) => new Promise((resolve, reject) => {
  const image = canvas.createImage();
  image.src = src;
  image.onload = () => resolve(image);
  image.onerror = reject;
});

Page({
  data: {
    isCompare: false,
    outputImage: '',
  },
  onReady() {
    this.onLoadCanvas();
  },
  onLoadCanvas() {
    const query = this.createSelectorQuery();
    query.select('#canvas').fields({
      node: true,
    }).exec(async (res) => {
      const [{ node: canvas }] = res;
      const ctx = canvas.getContext('2d');
      const img = await createImage(canvas, '/images/U3e6ny.jpg');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '700 14px sans-serif';
      ctx.fillText('这是一个小水印', 180, 140);
    });
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
