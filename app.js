// app.js
App({
    globalData: {
        providers: [],
        user_location: null,
        stations: null,
        originalStations: null,
        likeStations: [], // 收藏的充电桩数组
        // 返回首页时需要设置的筛选参数
        returnCampus: null,
        returnProvider: null,
        // promises
        user_location_promise: null,
        providers_promise: null,
        status_promise: null
    },
    // 以 gcj02 编码方式获取用户地址
    get_user_location() {
        return new Promise((resolve, reject) => wx.getLocation({
            'type': 'gcj02',
            'success': (res) => {
                console.log('app.js---successfully get user_location', res.longitude, res.latitude);
                this.globalData.user_location = {
                    'longitude': res.longitude,
                    'latitude': res.latitude
                };
                resolve(this.globalData.user_location);
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
                for (let i = 0; i < res.data.length; i++) {
                    this.globalData.providers.push(res.data[i].name);
                }
                resolve(this.globalData.providers);
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
                console.log('获得充电桩服务商列表失败');
                reject(err);
            },
        }));
    },
    
    onLaunch() {
        this.globalData.user_location_promise = this.get_user_location();
        this.globalData.providers_promise = this.get_charger_providers();
        this.globalData.status_promise = this.get_charger_status();
    }
})
