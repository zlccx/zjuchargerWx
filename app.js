// app.js
import store from '@/store/index';

App({
    onLaunch() {
        try {
            wx.cloud.init({
                env: 'cloud1-3gme0izs286a5b2a'
            });

            // 统计URL变量
            const countURL = '127.0.0.1';

            // 统计小程序启动次数
            wx.request({
                url: `http://${countURL}:3000/api/launch`,
                method: 'GET',
                success: (res) => {
                    console.log('启动统计成功:', res.data);
                },
                fail: (err) => {
                    console.error('启动统计失败:', err);
                }
            });

            store.processData();
            // 从本地存储加载收藏数据
            const favoriteStations = wx.getStorageSync('favoriteStations');
            if (favoriteStations) {
                store.setFavoriteStations(favoriteStations);
            }

            // 从本地存储加载消息提醒状态
            const notificationEnabled = wx.getStorageSync('notificationEnabled');
            if (notificationEnabled !== undefined) {
                store.setNotificationEnabled(notificationEnabled);
            }

            // 从本地存储加载用户偏好
            store.loadUserPreferencesFromStorage();
        } catch (error) {
            console.error('App launch error:', error);
            wx.showToast({
                title: '初始化失败',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // 小程序从前台进入后台时保存数据
    onHide() {
        this.saveDataToStorage();
    },

    // 保存数据到本地存储
    saveDataToStorage() {
        try {
            const state = store.getState();
            wx.setStorageSync('favoriteStations', state.favoriteStations);
            wx.setStorageSync('notificationEnabled', state.notificationEnabled);
            console.log('数据已保存到本地存储');
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
})
