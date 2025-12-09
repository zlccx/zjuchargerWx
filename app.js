// app.js
App({
    globalData: {
        providers: [], // 大部分内容都不需要存在App.js，存了也看不到
        // promises
        user_location_promise: null,
        providers_promise: null,
        status_promise: null,
    },
    get_user_location: function () {
        return new Promise((resolve, reject) => wx.getLocation({
            'type': 'gcj02',
            'success': (res) => {
                console.log('成功获取用户地址：', res.longitude, res.latitude);
                this.globalData.user_location = {
                    'longitude': res.longitude,
                    'latitude': res.latitude
                };
                resolve(this.globalData.user_location);
            },
            'fail': (err) => {
                console.log('获取用户地址失败QwQ');
                reject(err);
            }
        }));
    },

    get_charger_providers: function () {
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
    },
})
