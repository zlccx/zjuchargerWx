// pages/user/user.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    collections: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCollections();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadCollections();
  },

  /**
   * 加载收藏的充电桩
   */
  loadCollections() {
    const collections = wx.getStorageSync('collections') || [];
    this.setData({
      collections: collections
    });
  },

  /**
   * 取消收藏
   */
  removeCollection(e) {
    const index = e.currentTarget.dataset.index;
    let collections = this.data.collections;
    collections.splice(index, 1);
    wx.setStorageSync('collections', collections);
    this.setData({
      collections: collections
    });
    wx.showToast({
      title: '已取消收藏',
      duration: 1000
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadCollections();
    wx.stopPullDownRefresh();
  }
})