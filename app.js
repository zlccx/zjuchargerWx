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
            // 从本地存储加载收藏数据，处理兼容性
            const favoriteStations = wx.getStorageSync('favoriteStations');
            if (favoriteStations) {
                // 检查是否为旧格式（对象数组），如果是则转换为新格式（hash_id数组）
                if (Array.isArray(favoriteStations) && favoriteStations.length > 0) {
                    if (typeof favoriteStations[0] === 'object') {
                        // 旧格式，转换为只保存hash_id
                        const favoriteIds = favoriteStations.map(station => station.hash_id);
                        store.setFavoriteStations(favoriteIds);
                    } else {
                        // 新格式，直接使用
                        store.setFavoriteStations(favoriteStations);
                    }
                } else {
                    // 空数组，直接使用
                    store.setFavoriteStations(favoriteStations);
                }
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
