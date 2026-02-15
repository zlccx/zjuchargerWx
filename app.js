// app.js
import store from '@/store/index';

App({
    onLaunch() {
        try {
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

            // 启动定时检测充电桩状态
            this.startStatusCheck();
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
    },

    // 检测充电桩状态变化并发送提醒
    checkStationStatusChanges() {
        // 检查消息提醒是否开启
        const notificationEnabled = store.getNotificationEnabled();
        if (!notificationEnabled) {
            return;
        }

        // 获取当前充电桩状态
        this.get_charger_status().then(res => {
            const currentStations = res.stations;
            const favoriteStations = store.getState().favoriteStations;
            const favoriteStationIds = favoriteStations.map(station => station.hash_id);

            // 检查收藏的充电桩状态变化
            for (let station of currentStations) {
                if (favoriteStationIds.includes(station.hash_id)) {
                    const stationStatusHistory = store.getStationStatusHistory();
                    const historyStatus = stationStatusHistory[station.hash_id];

                    // 如果之前没有记录，或者状态发生了变化
                    if (historyStatus) {
                        // 检查是否从全忙变为有空
                        if (historyStatus.free === 0 && station.free > 0) {
                            // 发送消息提醒
                            this.sendNotification(station);
                        }
                    }

                    // 更新历史状态
                    store.updateStationStatusHistory(station.hash_id, {
                        free: station.free,
                        total: station.total
                    });
                }
            }
        }).catch(err => {
            console.error('获取充电桩状态失败:', err);
        });
    },

    // 发送消息提醒
    sendNotification(station) {
        // 这里使用微信小程序的订阅消息功能
        // 注意：需要在小程序管理后台配置消息模板
        wx.requestSubscribeMessage({
            tmplIds: ['ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs'], // 使用实际的模板ID
            success: (res) => {
                if (res['ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs'] === 'accept') {
                    // 订阅成功后，调用后端API发送消息
                    // 由于前端无法直接发送订阅消息，需要后端配合
                    // 这里只是示例，实际需要后端实现
                    console.log('发送消息提醒:', station.name, '有空闲充电桩');

                    // 模拟消息提醒
                    wx.showModal({
                        title: '充电桩空闲提醒',
                        content: `${station.name} 现在有 ${station.free} 个空闲充电桩`,
                        showCancel: false,
                        confirmText: '查看详情',
                        success: (res) => {
                            if (res.confirm) {
                                // 跳转到充电桩详情页
                                wx.navigateTo({
                                    url: `/pages/detail/detail?station=${JSON.stringify(station)}`
                                });
                            }
                        }
                    });
                }
            },
            fail: (err) => {
                console.error('订阅消息失败:', err);
            }
        });
    },

    // 启动定时检测
    startStatusCheck() {
        // 清除之前的定时器
        const existingTimer = store.getNotificationTimer();
        if (existingTimer) {
            clearInterval(existingTimer);
        }

        // 每3分钟检测一次
        const timer = setInterval(() => {
            this.checkStationStatusChanges();
        }, 3 * 60 * 1000);

        // 保存定时器到store
        store.setNotificationTimer(timer);

        // 立即执行一次检测
        this.checkStationStatusChanges();
    },

    // 停止定时检测
    stopStatusCheck() {
        const timer = store.getNotificationTimer();
        if (timer) {
            clearInterval(timer);
            store.setNotificationTimer(null);
        }
    }
})
