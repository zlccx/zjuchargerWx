// detail.js
const app = getApp();

Page({
  data: {
    station: {},
    markers: [],
    isFavorite: false
  },

  onLoad: function (options) {
    // 获取从上一个页面传递过来的充电桩数据
    const stationData = JSON.parse(options.station);
    this.setData({
      station: stationData
    });

    // 初始化地图标记
    this.initMapMarker();

    // 检查是否已收藏
    this.checkFavoriteStatus();
  },

  // 初始化地图标记
  initMapMarker: function () {
    const station = this.data.station;
    const markers = [{
      id: 0,
      latitude: station.lat,
      longitude: station.lon,
      title: station.name,
      width: 30,
      height: 30
    }];
    this.setData({
      markers: markers
    });
  },

  // 检查是否已收藏
  checkFavoriteStatus: function () {
    const stationName = this.data.station.name;
    const collections = wx.getStorageSync('collections') || [];
    const isFavorite = collections.includes(stationName);
    this.setData({
      isFavorite: isFavorite
    });
  },

  // 切换收藏状态
  toggleFavorite: function () {
    const stationName = this.data.station.name;
    let collections = wx.getStorageSync('collections') || [];
    let isFavorite = this.data.isFavorite;

    if (isFavorite) {
      // 取消收藏
      collections = collections.filter(item => item !== stationName);
    } else {
      // 添加收藏
      collections.push(stationName);
    }

    // 保存到本地存储
    wx.setStorageSync('collections', collections);

    // 更新状态
    this.setData({
      isFavorite: !isFavorite
    });

    // 提示用户
    wx.showToast({
      title: isFavorite ? '已取消收藏' : '收藏成功',
      duration: 1000
    });
  }
});