// detail.js
import store from '@/store/index';
Page({
    data: {
        station: {},
        markers: []
    },

    onLoad(options) {
        const stationData = JSON.parse(options.station);
        console.log(stationData);
        const isLiked = store.isFavorite(stationData.hash_id);
        stationData.like = isLiked;

        this.setData({
            station: stationData,
            fromCampus: options.campus || '全部'
        });

        this.initMapMarker();
        this.recordStationVisit(stationData);
    },

    recordStationVisit(station) {
        try {
            const visitRecord = {
                stationId: station.hash_id,
                stationName: station.name,
                campus: station.campus_name,
                provider: station.provider,
                chargingDuration: 0,
                chargingTime: new Date().toISOString()
            };

            wx.cloud.callFunction({
                name: 'recordChargingHistory',
                data: {
                    action: 'add',
                    ...visitRecord
                }
            }).then(res => {
                console.log('记录访问成功:', res.result);
                store.addChargingHistory(visitRecord);
            }).catch(err => {
                console.error('记录访问失败:', err);
            });
        } catch (error) {
            console.error('记录访问出错:', error);
        }
    },

    // 初始化地图标记
    initMapMarker: function () {
        const station = this.data.station;
        const markers = [{
            id: 0,
            latitude: station.lat,
            longitude: station.lon,
            title: station.name,
            width: 40,
            height: 40,
            iconPath: '/imgs/marker.png'
        }];
        this.setData({
            markers: markers
        });
    },

    // 收藏按钮点击事件
    toggleFavorite: function () {
        let station = this.data.station;
        let isLiked = false;

        // 检查当前充电桩是否已收藏
        if (store.isFavorite(station.hash_id)) {
            // 已收藏，从收藏数组中移除
            store.removeFavorite(station.hash_id);
            isLiked = false;
        } else {
            // 未收藏，添加到收藏数组（只保存hash_id）
            store.addFavorite(station);
            isLiked = true;
        }

        // 更新当前页面的station对象的like状态（仅用于UI显示）
        station.like = isLiked;
        this.setData({
            station: station
        });

        // 显示提示信息
        wx.showToast({
            title: isLiked ? '收藏成功' : '取消收藏',
            icon: 'success',
            duration: 1000
        });

        // 如果消息提醒已开启，同步更新订阅记录
        const notificationEnabled = store.getNotificationEnabled();
        if (notificationEnabled) {
            const favoriteStations = store.getState().favoriteStations;
            const stationIds = favoriteStations.map(s => s.hash_id);
            
            wx.cloud.callFunction({
                name: 'subscribe',
                data: {
                    templateId: 'ppFGwoeA7oxrF0f69dZEYTje1AkUBKqGoq05hJIanYs',
                    stationIds: stationIds
                }
            }).then(res => {
                console.log('订阅记录已更新:', res.result);
            }).catch(err => {
                console.error('更新订阅记录失败:', err);
            });
        }

        // 更新上一个页面的数据（无论是index还是user页面）
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
            if (prevPage.data.favoriteStations) {
                // 如果是user页面，重新加载收藏列表
                if (prevPage.loadFavoriteStations) {
                    prevPage.loadFavoriteStations();
                }
            }
        }
    },

    // 打开导航
    openNavigation: function () {
        const station = this.data.station;
        wx.openLocation({
            latitude: station.lat,
            longitude: station.lon,
            name: station.name,
            address: station.campus_name || '',
            scale: 18
        });
    },

    // 点击校区卡片跳转回首页并选择该校区
    navigateToIndexWithCampus: function () {
        const campus = this.data.station.campus_name;
        // 将校区信息存储到store
        store.setFilter({ campus: campus });
        // 跳转到首页Tab
        wx.switchTab({
            url: '/pages/index/index'
        });
    },

    // 点击运营商卡片跳转回首页并选择该运营商
    navigateToIndexWithProvider: function () {
        const provider = this.data.station.provider;
        // 将运营商信息存储到store
        store.setFilter({ provider: provider });
        // 跳转到首页Tab
        wx.switchTab({
            url: '/pages/index/index'
        });
    },

    // 跳转到设备详情页面
    navigateToDetailPlus: function () {
        const station = this.data.station;
        wx.navigateTo({
            url: '/pages/detailPlus/detailPlus?station=' + JSON.stringify(station)
        });
    }
});