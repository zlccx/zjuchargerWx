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

    // 转换坐标
    // 定义常量

    outOfChina(lat, lng) {
        if (lng < 72.004 || lng > 137.8347) {
            return true;
        }
        if (lat < 0.8293 || lat > 55.8271) {
            return true;
        }
        return false;
    },

    transformLat(lng, lat) {
        let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
        return ret;
    },

    transformLng(lng, lat) {
        let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
        ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
        return ret;
    },

    wgs84ToGcj02(lng, lat) {
        // 如果坐标在中国境外，则不进行转换
        if (this.outOfChina(lat, lng)) {
            return { lng: lng, lat: lat };
        }

        // 计算基础偏移量
        let dlat = transformLat(lng - 105.0, lat - 35.0);
        let dlng = transformLng(lng - 105.0, lat - 35.0);

        // 考虑椭球体修正
        const radLat = lat / 180.0 * PI;
        let magic = Math.sin(radLat);
        magic = 1 - EE * magic * magic;
        const sqrtMagic = Math.sqrt(magic);

        dlat = (dlat * 180.0) / ((EARTH_R * (1 - EE)) / (magic * sqrtMagic) * PI);
        dlng = (dlng * 180.0) / (EARTH_R / sqrtMagic * Math.cos(radLat) * PI);

        // 计算最终坐标
        const mglat = lat + dlat;
        const mglng = lng + dlng;

        return { lng: mglng, lat: mglat };
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

    transport_data: async function () { // omg 我终于会处理异步了
        let [user_location, providers, status] = await Promise.all([
            app.globalData.user_location_promise,
            app.globalData.providers_promise,
            app.globalData.status_promise,
        ])
        this.data.stations = status.stations;
        for (let i = 0; i < this.data.stations.length; i++) {
            let u = this.data.stations[i];
            // let newpos = this.wgs84ToGcj02(user_location.latitude, user_location.longitude);
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
            console.log(u);
            i++;
        }
        this.setData({ markers: this.data.markers });
        console.log(this.calculateDistance(30.300, 120.100, 30.302, 120.098));
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
