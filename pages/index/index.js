// index.js

const app = getApp();
const PI = 3.1415926535897932384626;
const EARTH_R = 6378245.0;  // 地球长半轴
const EE = 0.00669342162296594323;  // 偏心率平方
Page({
    data: {
        providers: [],
        user_location: null,
        stations: null,
        sortBy: 1,
        sortText: ['智能排序', '按距离排序', '按空位排序'],
        markers: [],
    },

    // 用 Haversine 公式计算
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // 地球半径(米)
        const toRad = (d) => d * Math.PI / 180;

        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1);
        const Δλ = toRad(lng2 - lng1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c);
    },

    bd09ToGcj02(bd_lon, bd_lat) {
        const X_PI = (Math.PI * 3000.0) / 180.0;
        const x = bd_lon - 0.0065;
        const y = bd_lat - 0.006;
        const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
        const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
        
        const gcj_lon = z * Math.cos(theta);
        const gcj_lat = z * Math.sin(theta);
        
        return [gcj_lon, gcj_lat];
    },

    transport_data: async function () { // omg 我终于会处理异步了
        let [user_location, providers, status] = await Promise.all([
            app.globalData.user_location_promise,
            app.globalData.providers_promise,
            app.globalData.status_promise,
        ]);
        this.data.stations = status.stations;
        for (let i = 0; i < this.data.stations.length; i++) {
            let u = this.data.stations[i];
            [u.lon, u.lat] = this.bd09ToGcj02(u.lon, u.lat);
            this.data.stations[i].dist =
                this.calculateDistance(u.lat, u.lon, user_location.latitude, user_location.longitude);
        }
        this.data.stations.sort((a, b) => a.dist - b.dist);
        this.setData({
            user_location: user_location,
            providers: providers,
            stations: status.stations,
        });
        let i = 0;
        for (let u of this.data.stations) {
            this.data.markers.push({
                id: i,
                latitude: u.lat,   // 标记点纬度
                longitude: u.lon, // 标记点经度
                title: u.name,
                width: 30,
                height: 30,
            })
            i++;
        }
        this.setData({ markers: this.data.markers });
        console.log('数据同步成功-index.js');
    },

    changeSort() {
        this.data.sortBy = (this.data.sortBy + 1) % 3;
        this.setData({
            sortBy: this.data.sortBy,
        })
    },

    onLoad: function () {
        this.transport_data();
    }
})
