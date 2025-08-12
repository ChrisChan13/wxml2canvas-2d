// pages/sales/sales.js
function formatDate(date, fmt) {
  date = date instanceof Date ? date : new Date(date);
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds(),
  };

  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (`${date.getFullYear()}`).substr(4 - RegExp.$1.length));
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : ((`00${o[k]}`).substr((`${o[k]}`).length)));
    }
  }

  return fmt;
}

Page({
  data: {
    currentMonth: formatDate(new Date(), 'yyyy-MM'),
    salesData: {
      totalAmount: '28,456',
      orderCount: '342',
      customerCount: '1,245',
      avgAmount: '82.3',
    },
    timeSlots: [
      { time: '9-12', percent: 25, color: '#667eea' },
      { time: '12-14', percent: 38, color: '#7e6bff' },
      { time: '14-17', percent: 18, color: '#ff6b8b' },
      { time: '17-20', percent: 45, color: '#ff9f4f' },
      { time: '20-22', percent: 12, color: '#6bd2ff' },
    ],
    weekData: [4200, 5800, 7200, 8900, 6500, 8200, 9300],
    productData: [
      { name: '珍珠奶茶', value: 156 },
      { name: '芝士绿茶', value: 128 },
      { name: '芒果冰沙', value: 98 },
      { name: '焦糖玛奇朵', value: 85 },
      { name: '柠檬红茶', value: 76 },
    ],
  },

  onLoad() {
    this.drawWeekChart();
    this.drawProductChart();
  },

  // 切换月份
  changeMonth(e) {
    this.setData({
      currentMonth: e.detail.value,
    });
    // 这里应该重新获取数据
    // this.fetchSalesData(e.detail.value)
  },

  // 绘制周销售趋势图
  drawWeekChart() {
    const ctx = wx.createCanvasContext('weekChart');
    const data = this.data.weekData;
    const maxValue = Math.max(...data);
    const colors = ['#667eea', '#7e6bff', '#ff6b8b', '#ff9f4f', '#6bd2ff'];
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const canvasWidth = 630;
    const canvasHeight = 200;
    const barWidth = 30;
    const gap = 10;

    // 绘制坐标轴
    ctx.setStrokeStyle('#e0e0e0');
    ctx.setLineWidth(1);
    ctx.moveTo(0, canvasHeight - 30);
    ctx.lineTo(canvasWidth, canvasHeight - 30);
    ctx.stroke();

    // 绘制柱状图
    data.forEach((item, index) => {
      const x = index * (barWidth + gap) + 20;
      const height = (item / maxValue) * (canvasHeight - 80);
      const y = canvasHeight - 30 - height;

      ctx.setFillStyle(colors[index % colors.length]);
      ctx.fillRect(x, y, barWidth, height);

      // 绘制数值
      ctx.setFontSize(12);
      ctx.setFillStyle('#666');
      ctx.setTextAlign('center');
      ctx.fillText(item, x + barWidth / 2, y - 10);

      // 绘制星期标签
      ctx.setFontSize(12);
      ctx.fillText(labels[index], x + barWidth / 2, canvasHeight - 5);
    });

    ctx.draw();
  },

  // 绘制商品销售排行图
  drawProductChart() {
    const ctx = wx.createCanvasContext('productChart');
    const data = this.data.productData;
    const maxValue = Math.max(...data.map((item) => item.value));
    const colors = ['#667eea', '#7e6bff', '#ff6b8b', '#ff9f4f', '#6bd2ff'];
    const canvasWidth = 630;
    // const canvasHeight = 200;
    const barHeight = 24;
    const gap = 10;

    // 绘制条形图
    data.forEach((item, index) => {
      const y = index * (barHeight + gap) + 10;
      const width = (item.value / maxValue) * (canvasWidth - 400);

      ctx.setFillStyle(colors[index % colors.length]);
      ctx.fillRect(100, y, width, barHeight);

      // 绘制商品名称
      ctx.setFontSize(12);
      ctx.setFillStyle('#333');
      ctx.setTextAlign('left');
      ctx.fillText(item.name, 10, y + barHeight / 2 + 4);

      // 绘制数值
      ctx.setFontSize(12);
      ctx.setFillStyle('#666');
      ctx.setTextAlign('right');
      ctx.fillText(item.value, 90, y + barHeight / 2 + 4);
    });

    ctx.draw();
  },

  // 分享报表
  shareReport() {
    wx.showActionSheet({
      itemList: ['分享给好友', '生成分享图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.shareAppMessage({
            title: `${this.data.currentMonth}门店销售报表`,
            path: '/pages/sales/sales',
            imageUrl: '/images/share-poster.jpg',
          });
        } else {
          this.generateShareImage();
        }
      },
    });
  },

  // 生成分享图片
  generateShareImage() {
    wx.showLoading({
      title: '生成图片中...',
    });

    // 这里应该使用canvas绘制完整的分享图片
    // 简化示例，实际使用需要更复杂的绘制逻辑
    setTimeout(() => {
      wx.hideLoading();
      wx.previewImage({
        urls: ['/images/share-poster.jpg'],
      });
    }, 1500);
  },

  // 保存到相册
  saveToAlbum() {
    wx.showLoading({
      title: '保存中...',
    });

    // 这里应该使用canvas生成图片并保存
    // 简化示例，实际使用需要更复杂的绘制逻辑
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
      });
    }, 1500);
  },

  // 分享页面截图
  async onPageShare() {
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
          wx.previewImage({ urls: [url] });
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
});
