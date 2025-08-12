Page({
  onNavigation(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({ url });
  },
});
