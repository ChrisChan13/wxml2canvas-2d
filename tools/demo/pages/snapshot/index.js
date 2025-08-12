// pages/index/index.js
Page({
  data: {
    banners: [
      { id: 1, image: '/images/U3e6ny.jpg' },
      { id: 2, image: '/images/U3e6ny.jpg' },
      { id: 3, image: '/images/U3e6ny.jpg' },
    ],
    categories: [
      { id: 1, name: '全部' },
      { id: 2, name: '新品' },
      { id: 3, name: '热销' },
      { id: 4, name: '折扣' },
      { id: 5, name: '美妆' },
      { id: 6, name: '服饰' },
      { id: 7, name: '数码' },
      { id: 8, name: '家居' },
    ],
    activeBanner: 0,
    activeCategory: 0,
    products: [
      {
        id: 1,
        image: '/images/U3e6ny.jpg',
        title: '粉色少女心无线耳机',
        desc: '高音质蓝牙5.0，超长续航，甜美配色',
        price: 199,
        originalPrice: 299,
        sold: 1254,
      },
      {
        id: 2,
        image: '/images/U3e6ny.jpg',
        title: '卡通动物手机支架',
        desc: '可爱动物造型，360度旋转，防滑设计',
        price: 29.9,
        originalPrice: 39.9,
        sold: 876,
      },
      {
        id: 3,
        image: '/images/U3e6ny.jpg',
        title: 'ins风简约帆布包',
        desc: '大容量设计，百搭款式，多色可选',
        price: 59,
        sold: 543,
      },
      {
        id: 4,
        image: '/images/U3e6ny.jpg',
        title: '水果造型小夜灯',
        desc: 'USB充电，三档调光，可爱水果造型',
        price: 45,
        originalPrice: 69,
        sold: 321,
      },
      {
        id: 5,
        image: '/images/U3e6ny.jpg',
        title: '创意卡通陶瓷杯',
        desc: '手工绘制，环保材质，可爱造型',
        price: 39.9,
        sold: 765,
      },
      {
        id: 6,
        image: '/images/U3e6ny.jpg',
        title: '迷你手持小风扇',
        desc: '三档风速，USB充电，便携设计',
        price: 49,
        originalPrice: 79,
        sold: 987,
      },
    ],
    cartCount: 0,
  },

  onLoad(options) {
    // 可以在这里请求商品数据
  },

  // 切换 banner
  bannerChange(e) {
    this.setData({
      activeBanner: e.detail.current,
    });
  },

  // 切换分类
  switchCategory(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      activeCategory: index,
    });
    // 这里可以根据分类筛选商品
    // this.filterProducts(index);
  },

  // 跳转到商品详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
    });
  },

  // 添加到购物车
  addToCart(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      cartCount: this.data.cartCount + 1,
    });

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000,
    });

    // 实际开发中这里应该调用购物车API
  },

  // 跳转到购物车
  goToCart() {
    wx.switchTab({
      url: '/pages/cart/cart',
    });
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
