// app.js
import store from './store/index';

App({
    // 以 gcj02 编码方式获取用户地址
    get_user_location() {
        return new Promise((resolve, reject) => wx.getLocation({
            'type': 'gcj02',
            'success': (res) => {
                console.log('app.js---successfully get user_location', res.longitude, res.latitude);
                const location = {
                    'longitude': res.longitude,
                    'latitude': res.latitude
                };
                store.setUserLocation(location);
                resolve(location);
            },
            'fail': (err) => {
                console.log('fail to get user_location');
                reject(err);
            }
        }));
    },

    get_charger_providers() {
        return new Promise((resolve, reject) => wx.request({
            url: 'https://charger.philfan.cn/api/providers',
            success: (res) => {
                console.log('成功获得充电桩服务商列表');
                const providers = res.data.map(item => item.name);
                store.setProviders(providers);
                resolve(providers);
            },
            fail: (err) => {
                console.log('获得充电桩服务商列表失败');
                reject(err);
            },
        }));
    },

    get_charger_status() {
        return new Promise((resolve, reject) => wx.request({
            url: 'https://charger.philfan.cn/api/status',
            success: (res) => {
                console.log('成功获得充电桩状态');
                resolve(res.data);
            },
            fail: (err) => {
                console.log('获得充电桩状态失败');
                reject(err);
            },
        }));
    },
    
    onLaunch() {
        try {
            const userLocationPromise = this.get_user_location();
            const providersPromise = this.get_charger_providers();
            const statusPromise = this.get_charger_status();
            
            // 将promise存储到store中
            store.setUserLocationPromise(userLocationPromise);
            store.setProvidersPromise(providersPromise);
            store.setStatusPromise(statusPromise);
            
            // 添加全局错误处理
            this.setupGlobalErrorHandler();
            
            // 从本地存储加载收藏数据
            const favoriteStations = wx.getStorageSync('favoriteStations');
            if (favoriteStations) {
                store.setFavoriteStations(favoriteStations);
            }
        } catch (error) {
            console.error('App launch error:', error);
            wx.showToast({
                title: '初始化失败',
                icon: 'none',
                duration: 2000
            });
        }
    },
    
    // 全局错误处理
    setupGlobalErrorHandler() {
        // 监听未捕获的异常
        wx.onError((error) => {
            console.error('Global error:', error);
            // 可以在这里添加错误上报逻辑
        });
        
        // 监听Promise错误
        if (typeof wx.onUnhandledRejection === 'function') {
            wx.onUnhandledRejection((error) => {
                console.error('Unhandled promise rejection:', error);
                // 可以在这里添加错误上报逻辑
            });
        }
    },
    
    // 暴露store给页面使用
    getStore() {
        return store;
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
            console.log('数据已保存到本地存储');
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
})
