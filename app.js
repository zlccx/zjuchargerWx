// app.js
App({
    global_data: {
        providers: [], // 大部分内容都不需要存在App.js，存了也看不到
        // promises
        user_location_promise: null,
        providers_promise: null,
        status_promise: null,
        // 收藏的充电桩列表
        collections: []
    },
    // 以 gcj02 编码方式获取用户地址
    get_user_location() {
        return new Promise((resolve, reject) => wx.getLocation({
            'type': 'gcj02',
            'success': (res) => {
                console.log('app.js---successfully get user_location', res.longitude, res.latitude);
                this.global_data.user_location = {
                    'longitude': res.longitude,
                    'latitude': res.latitude
                };
                resolve(this.global_data.user_location);
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
                    this.global_data.providers.push(res.data[i].name);
                }
                resolve(this.global_data.providers);
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
        this.global_data.user_location_promise = this.get_user_location();
        this.global_data.providers_promise = this.get_charger_providers();
        this.global_data.status_promise = this.get_charger_status();
    },
})
