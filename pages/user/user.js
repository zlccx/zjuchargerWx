// pages/user/user.js
const app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    favoriteStations: [], // 收藏的充电桩列表
    loading: true, // 加载状态
    sortBy: 0, // 排序方式：0-智能排序，1-按距离排序，2-按空位排序
    sortText: ['智能排序', '按距离排序', '按空位排序'], // 排序文本
    BASE_DIST: 500 // 设定为 500m 为一组
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadFavoriteStations();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载收藏列表
    this.loadFavoriteStations();
  },

  /**
   * 跳转到充电桩详情页
   */
  goToDetail(e) {
    const index = e.currentTarget.dataset.index;
    const station = this.data.collections[index];
    wx.navigateTo({
      url: '/pages/detail/detail?station=' + JSON.stringify(station)
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadFavoriteStations();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载收藏的充电桩
   */
  loadFavoriteStations: function() {
    const that = this;
    that.setData({
      loading: true
    });

    // 直接使用全局数据中的likeStations数组
    let favoriteStations = app.globalData.likeStations;
    that.setData({
      favoriteStations: favoriteStations,
      loading: false
    });
  },

  /**
   * 智能排序收藏的充电桩
   */
  smart_sort() {
    let stations = this.data.favoriteStations;
    let divided_stations = [];
    let zero = [];
    
    // 按距离分组，同时保留所有充电桩
    for (let u of stations) {
      for (let i = divided_stations.length; i <= u.dist / this.data.BASE_DIST; i++)
        divided_stations.push([]);
      if (u.free) divided_stations[parseInt(u.dist / this.data.BASE_DIST)].push(u);
      else zero.push(u);
    }
    
    // 构建排序后的索引数组
    let sortedIndices = [];
    for (let u of divided_stations) {
      u.sort((a, b) => b.free - a.free);
      for (let v of u) {
        sortedIndices.push(stations.indexOf(v));
      }
    }
    for (let u of zero) {
      sortedIndices.push(stations.indexOf(u));
    }
    
    // 根据排序后的索引重新排列原数组
    let new_stations = [];
    for (let index of sortedIndices) {
      new_stations.push(stations[index]);
    }
    
    // 更新页面数据
    this.setData({
      favoriteStations: new_stations
    })
  },

  /**
   * 更改排序方式
   */
  changeSort() {
    this.setData({
      sortBy: (this.data.sortBy + 1) % 3
    });
    
    let stations = this.data.favoriteStations;
    
    if (this.data.sortBy == 0) {
      this.smart_sort();
    } else if (this.data.sortBy == 1) { // 按距离排序
      stations.sort((a, b) => a.dist - b.dist);
      this.setData({
        favoriteStations: stations
      });
    } else if (this.data.sortBy == 2) { // 按空位排序
      stations.sort((a, b) => b.free - a.free);
      this.setData({
        favoriteStations: stations
      });
    }
  },

  /**
   * 跳转到充电桩详情页
   */
  goDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '/pages/detail/detail?station=' + JSON.stringify(item) + '&campus=全部'
    });
  }
})