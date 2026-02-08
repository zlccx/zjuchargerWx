// pages/user/user.js
const app = getApp();
const store = app.getStore();
import { smartSort, sortByDistance, sortByFreeCount, sortStations } from '../../utils/sort';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    favoriteStations: [], // 收藏的充电桩列表
    loading: true, // 加载状态
    sortBy: 0, // 排序方式：0-智能排序，1-按距离排序，2-按空位排序
    sortText: ['智能排序', '按距离排序', '按空位排序'], // 排序文本
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
    const station = this.data.favoriteStations[index];
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
    this.setData({
      loading: true
    });

    // 直接使用store中的收藏列表
    let favoriteStations = store.getState().favoriteStations;
    
    // 对收藏列表进行排序
    let sortedStations = sortStations(favoriteStations, this.data.sortBy);
    
    this.setData({
      favoriteStations: sortedStations,
      loading: false
    });
  },

  /**
   * 更改排序方式
   */
  changeSort() {
    this.setData({
      sortBy: (this.data.sortBy + 1) % 3
    });
    
    // 使用统一的排序函数
    let sortedStations = sortStations(this.data.favoriteStations, this.data.sortBy);
    
    this.setData({
      favoriteStations: sortedStations
    });
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