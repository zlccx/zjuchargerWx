// pages/user/user.js

import { sortStations } from '@/utils/sort';
import store from '@/store/index'
import { setApiKey, getRecommendations } from '@/utils/ai'

Page({
    data: {
        favoriteStations: [],
        loading: true,
        sortBy: 0,
        sortText: ['智能排序', '按距离排序', '按空位排序'],
        notificationEnabled: false,
        subscriptionStatus: 'none',
        preferredTimeSlots: [],
        preferredCampuses: []
    },

    onLoad(options) {
        this.loadFavoriteStations();
        this.loadNotificationStatus();
        this.loadUserPreferences();
    },

    onShow() {
        this.loadFavoriteStations();
        this.loadNotificationStatus();
        this.checkSubscriptionStatus();
        this.loadUserPreferences();
    },

    loadUserPreferences() {
        const preferences = store.getUserPreferences();
        this.setData({
            preferredTimeSlots: preferences.preferredTimeSlots || [],
            preferredCampuses: preferences.preferredCampuses || []
        });
    },

    toggleTimeSlot(e) {
        const slot = e.currentTarget.dataset.slot;
        let timeSlots = [...this.data.preferredTimeSlots];
        
        if (timeSlots.includes(slot)) {
            timeSlots = timeSlots.filter(s => s !== slot);
        } else {
            timeSlots.push(slot);
        }
        
        this.setData({ preferredTimeSlots: timeSlots });
        store.updatePreferredTimeSlots(timeSlots);
        wx.showToast({
            title: '偏好已更新',
            icon: 'success'
        });
    },

    toggleCampus(e) {
        const campus = e.currentTarget.dataset.campus;
        let campuses = [...this.data.preferredCampuses];
        
        if (campuses.includes(campus)) {
            campuses = campuses.filter(c => c !== campus);
        } else {
            campuses.push(campus);
        }
        
        this.setData({ preferredCampuses: campuses });
        store.updatePreferredCampuses(campuses);
        wx.showToast({
            title: '偏好已更新',
            icon: 'success'
        });
    },

    getAIRecommendation() {
        wx.showLoading({
            title: '正在获取推荐...',
            mask: true
        });

        wx.cloud.callFunction({
            name: 'getRecommendationData',
            data: { days: 30 }
        }).then(res => {
            if (res.result.success) {
                const data = res.result.data;
                
                if (!getApiKey()) {
                    wx.showModal({
                        title: 'AI推荐数据已获取',
                        content: '请将以下数据发送给AI进行分析：\n\n' + JSON.stringify(data, null, 2),
                        confirmText: '复制数据',
                        cancelText: '关闭',
                        success: (modalRes) => {
                            if (modalRes.confirm) {
                                wx.setClipboardData({
                                    data: JSON.stringify(data, null, 2),
                                    success: () => {
                                        wx.showToast({
                                            title: '数据已复制',
                                            icon: 'success'
                                        });
                                    }
                                });
                            }
                        }
                    });
                } else {
                    return getRecommendations(data);
                }
            } else {
                wx.showToast({
                    title: '获取推荐数据失败',
                    icon: 'none'
                });
            }
        }).then(recommendations => {
            if (recommendations) {
                wx.cloud.callFunction({
                    name: 'saveRecommendation',
                    data: recommendations
                }).then(() => {
                    this.showRecommendationResult(recommendations);
                }).catch(err => {
                    console.error('保存推荐失败:', err);
                    this.showRecommendationResult(recommendations);
                });
            }
        }).catch(err => {
            console.error('获取推荐失败:', err);
            wx.showToast({
                title: '获取推荐失败',
                icon: 'none'
            });
        }).finally(() => {
            wx.hideLoading();
        });
    },

    showRecommendationResult(recommendations) {
        let content = `推荐理由：${recommendations.reasoning}\n\n`;
        
        recommendations.recommendations.forEach((rec, index) => {
            content += `${index + 1}. ${rec.stationName}\n`;
            content += `   校区：${rec.campus}\n`;
            content += `   推荐时间：${rec.recommendedTime}\n`;
            content += `   推荐理由：${rec.reason}\n`;
            content += `   评分：${rec.score}\n\n`;
        });

        wx.showModal({
            title: 'AI推荐结果',
            content: content,
            showCancel: false,
            confirmText: '知道了'
        });
    },

    setApiKey() {
        wx.showModal({
            title: '设置DeepSeek API Key',
            editable: true,
            placeholderText: '请输入您的DeepSeek API Key',
            success: (res) => {
                if (res.confirm && res.content) {
                    setApiKey(res.content);
                    wx.showToast({
                        title: 'API Key已设置',
                        icon: 'success'
                    });
                }
            }
        });
    },

    // 加载消息提醒状态
    loadNotificationStatus() {
        const notificationEnabled = store.getNotificationEnabled();
        this.setData({ notificationEnabled: notificationEnabled });
    },

    // 检查订阅状态
    checkSubscriptionStatus() {
        wx.cloud.callFunction({
            name: 'getUserInfo'
        }).then(res => {
            if (res.result.success) {
                const subscribes = res.result.subscribes;
                const activeSubscribe = subscribes.find(s => s.status === 'active');
                
                // 如果没有活跃的订阅，但开关是开启的
                if (!activeSubscribe && this.data.notificationEnabled) {
                    wx.showModal({
                        title: '订阅已失效',
                        content: '您的订阅已使用完毕，是否重新授权继续接收提醒？',
                        confirmText: '重新授权',
                        cancelText: '稍后再说',
                        success: (modalRes) => {
                            if (modalRes.confirm) {
                                // 重新授权
                                this.toggleNotification({ detail: { value: true }});
                            } else {
                                // 关闭开关
                                store.setNotificationEnabled(false);
                                this.setData({ 
                                    notificationEnabled: false,
                                    subscriptionStatus: 'used'
                                });
                            }
                        }
                    });
                } else if (activeSubscribe) {
                    this.setData({ subscriptionStatus: 'active' });
                } else {
                    this.setData({ subscriptionStatus: 'none' });
                }
            }
        }).catch(err => {
            console.error('获取订阅状态失败:', err);
        });
    },

    // 切换消息提醒状态
    toggleNotification(e) {
        const enabled = e.detail.value;

        if (enabled) {
            // 直接使用store中的收藏hash_id列表
            const stationIds = store.getState().favoriteStations;

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
                                this.setData({ 
                                    notificationEnabled: true,
                                    subscriptionStatus: 'active'
                                });
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
            this.setData({ 
                notificationEnabled: false,
                subscriptionStatus: 'none'
            });
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
        this.checkSubscriptionStatus();
        wx.stopPullDownRefresh();
    },

    // 加载收藏的充电桩
    loadFavoriteStations: function () {
        this.setData({
            loading: true
        });

        // 从store获取收藏的hash_id列表
        const favoriteIds = store.getState().favoriteStations;
        // 从store获取所有stations数据
        const allStations = store.getState().stations || [];
        
        // 根据收藏的hash_id列表，从stations中筛选出对应的完整station对象
        let favoriteStations = [];
        if (favoriteIds.length > 0 && allStations.length > 0) {
            favoriteStations = allStations.filter(station => favoriteIds.includes(station.hash_id));
        }

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
