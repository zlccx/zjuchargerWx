// pages/user/user.js

import { sortStations } from '@/utils/sort';
import store from '@/store/index'

Page({
    data: {
        favoriteStations: [], // 收藏的充电桩列表
        loading: true, // 加载状态
        sortBy: 0, // 排序方式：0-智能排序，1-按距离排序，2-按空位排序
        sortText: ['智能排序', '按距离排序', '按空位排序'],
        notificationEnabled: false, // 消息提醒是否开启
    },

    onLoad(options) {
        this.loadFavoriteStations();
        this.loadNotificationStatus();
    },

    onShow() {
        // 每次显示页面时重新加载收藏列表
        this.loadFavoriteStations();
        this.loadNotificationStatus();
    },

    // 加载消息提醒状态
    loadNotificationStatus() {
        const notificationEnabled = store.getNotificationEnabled();
        this.setData({ notificationEnabled: notificationEnabled });
    },

    // 切换消息提醒状态
    toggleNotification(e) {
        const enabled = e.detail.value;

        if (enabled) {
            const favoriteStations = store.getState().favoriteStations;
            const stationIds = favoriteStations.map(station => station.hash_id);

            if (stationIds.length === 0) {
                this.setData({ notificationEnabled: false });
                wx.showToast({
                    title: '请先收藏充电桩',
                    icon: 'none'
                });
                return;
            }

            wx.requestSubscribeMessage({
                tmplIds: ['ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs'],
                success: (res) => {
                    if (res['ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs'] === 'accept') {
                        wx.cloud.callFunction({
                            name: 'subscribe',
                            data: {
                                templateId: 'ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs',
                                stationIds: stationIds
                            }
                        }).then(subRes => {
                            if (subRes.result.success) {
                                store.setNotificationEnabled(true);
                                this.setData({ notificationEnabled: true });
                                wx.showToast({ title: '消息提醒已开启', icon: 'success' });
                            } else {
                                this.setData({ notificationEnabled: false });
                                wx.showToast({ title: '订阅失败，请稍后重试', icon: 'none' });
                            }
                        }).catch(err => {
                            console.error('调用云函数失败:', err);
                            this.setData({ notificationEnabled: false });
                            wx.showToast({ title: '订阅失败，请稍后重试', icon: 'none' });
                        });
                    } else {
                        this.setData({ notificationEnabled: false });
                        wx.showToast({ title: '订阅失败，请稍后重试', icon: 'none' });
                    }
                },
                fail: (err) => {
                    console.error('订阅消息失败', err);
                    this.setData({ notificationEnabled: false });
                    wx.showToast({ title: '订阅失败，请稍后重试', icon: 'none' });
                }
            });
        } else {
            store.setNotificationEnabled(false);
            this.setData({ notificationEnabled: false });
            wx.showToast({ title: '消息提醒已关闭', icon: 'success' });
        }
    },

    // 跳转到充电桩详情页
    goToDetail(e) {
        const index = e.currentTarget.dataset.index;
        const station = this.data.favoriteStations[index];
        wx.navigateTo({
            url: '/pages/detail/detail?station=' + JSON.stringify(station)
        });
    },

    // 页面相关事件处理函数--监听用户下拉动作
    onPullDownRefresh() {
        this.loadFavoriteStations();
        wx.stopPullDownRefresh();
    },

    // 加载收藏的充电桩
    loadFavoriteStations: function () {
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

    // 更改排序方式
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

    // 跳转到充电桩详情页
    goDetail: function (e) {
        const item = e.currentTarget.dataset.item;
        wx.navigateTo({
            url: '/pages/detail/detail?station=' + JSON.stringify(item) + '&campus=全部'
        });
    }
})