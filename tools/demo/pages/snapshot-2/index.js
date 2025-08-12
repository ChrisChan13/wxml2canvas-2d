// pages/record/record.js
Page({
  data: {
    currentTab: 'record',
    showFilterModal: false,
    activeFilter: 'all',
    filterText: '全部',
    totalCount: 0,
    winCount: 0,
    loseCount: 0,
    winRate: 0,
    records: [
      {
        id: 1,
        mode: '排位赛',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-15 14:30',
        result: 'win',
        resultText: '胜利',
        score: '3:2',
        duration: '12分45秒',
      },
      {
        id: 2,
        mode: '娱乐模式',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-15 13:15',
        result: 'lose',
        resultText: '失败',
        score: '1:3',
        duration: '10分20秒',
      },
      {
        id: 3,
        mode: '排位赛',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-14 21:45',
        result: 'win',
        resultText: '胜利',
        score: '2:1',
        duration: '15分30秒',
      },
      {
        id: 4,
        mode: '匹配赛',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-14 20:10',
        result: 'draw',
        resultText: '平局',
        score: '2:2',
        duration: '18分05秒',
      },
      {
        id: 5,
        mode: '排位赛',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-13 19:30',
        result: 'lose',
        resultText: '失败',
        score: '0:3',
        duration: '8分50秒',
      },
      {
        id: 6,
        mode: '娱乐模式',
        modeIcon: '/images/U3e6ny.jpg',
        time: '2023-05-13 18:15',
        result: 'win',
        resultText: '胜利',
        score: '3:1',
        duration: '14分20秒',
      },
    ],
    filteredRecords: [],
  },

  onLoad() {
    this.calculateStats();
    this.filterRecords();
  },

  // 计算统计数据
  calculateStats() {
    const { records } = this.data;
    const total = records.length;
    const wins = records.filter((r) => r.result === 'win').length;
    const loses = records.filter((r) => r.result === 'lose').length;
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

    this.setData({
      totalCount: total,
      winCount: wins,
      loseCount: loses,
      winRate: rate,
    });
  },

  // 显示筛选弹窗
  showFilter() {
    this.setData({
      showFilterModal: !this.data.showFilterModal,
    });
  },

  // 改变筛选条件
  changeFilter(e) {
    const { value } = e.currentTarget.dataset;
    let text = '全部';

    switch (value) {
      case 'win':
        text = '胜利';
        break;
      case 'lose':
        text = '失败';
        break;
      case 'draw':
        text = '平局';
        break;
      default:
    }

    this.setData({
      activeFilter: value,
      filterText: text,
      showFilterModal: false,
    }, () => {
      this.filterRecords();
    });
  },

  // 筛选记录
  filterRecords() {
    let { records } = this.data;

    if (this.data.activeFilter !== 'all') {
      records = records.filter((r) => r.result === this.data.activeFilter);
    }

    this.setData({
      filteredRecords: records,
    });
  },

  // 切换底部导航
  switchTab(e) {
    const { page } = e.currentTarget.dataset;

    if (page === this.data.currentTab) return;

    if (page === 'home') {
      wx.switchTab({
        url: '/pages/home/home',
      });
    } else if (page === 'rank') {
      wx.switchTab({
        url: '/pages/rank/rank',
      });
    } else if (page === 'profile') {
      wx.switchTab({
        url: '/pages/profile/profile',
      });
    }
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
