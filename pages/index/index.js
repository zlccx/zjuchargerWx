// index.js

const app = getApp();
const BASE_DIST = 500; // 设定为 500m 为一组
Page({
    data: {
        sortBy: 0,
        sortText: ['智能排序', '按距离排序', '按空位排序'],
        markers: [],
        user_location: null,
        campusList: ['全部'], // 校区列表，默认包含全部选项
        selectedCampusIndex: 0, // 默认选中全部
        selectedCampus: '全部', // 选中的校区名称
        providerList: ['全部'], // 运营商列表，默认包含全部选项
        selectedProviderIndex: 0, // 默认选中全部
        selectedProvider: '全部', // 选中的运营商名称
        searchMode: 1, // 初始搜索模式为1
        searched: 0, // 初始搜索状态为0
        searchText: '', // 搜索文本
    },

    // 用 Haversine 公式计算经纬度距离
    calculateDistance(lat1, lng1, lat2, lng2) {
        const EARTH_R = 6378245.0;  // 地球长半轴
        const EE = 0.00669342162296594323;  // 偏心率平方
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

    // 将bd09坐标转换成Gcj02坐标
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

    // 将充电桩智能排序
    smart_sort() {
        let stations = app.globalData.stations;
        let divided_stations = [];
        let zero = [];
        
        // 按距离分组，同时保留所有充电桩
        for (let u of stations) {
            for (let i = divided_stations.length; i <= u.dist / BASE_DIST; i++)
                divided_stations.push([]);
            if (u.free) divided_stations[parseInt(u.dist / BASE_DIST)].push(u);
            else zero.push(u);
        }
        
        // 构建排序后的索引数组
        let sortedIndices = [];
        for (let u of divided_stations) {
            u.sort((a, b) => b.free - a.free);
            for (let v of u) {
                sortedIndices.push(stations.indexOf(v));
            }
        }
        for (let u of zero) {
            sortedIndices.push(stations.indexOf(u));
        }
        
        // 根据排序后的索引重新排列原数组
        let new_stations = [];
        for (let index of sortedIndices) {
            new_stations.push(stations[index]);
        }
        
        // 更新全局数据
        app.globalData.stations = new_stations;
        
        // 更新页面数据
        this.setData({
            stations: new_stations,
        })
    },

    async transport_data() { 
        // 并行获取异步数据
        let [user_location, providers, status] = await Promise.all([
            app.globalData.user_location_promise,
            app.globalData.providers_promise,
            app.globalData.status_promise,
        ]);
        app.globalData.user_location = user_location;
        app.globalData.providers = providers;
        app.globalData.stations = status.stations;
        for (let i = 0; i < app.globalData.stations.length; i++) {
            let u = app.globalData.stations[i];
            [u.lon, u.lat] = this.bd09ToGcj02(u.lon, u.lat);
            app.globalData.stations[i].dist = 
                this.calculateDistance(u.lat, u.lon, user_location.latitude, user_location.longitude);
            // 添加view属性，初始值为true
            app.globalData.stations[i].view = true;
            // 添加like属性，初始值为false
            app.globalData.stations[i].like = false;
        }
        
        // 保存原始数据用于筛选
        app.globalData.originalStations = [...app.globalData.stations];
        
        // 提取校区列表
        this.extractCampusList();
        
        // 提取运营商列表
        this.extractProviderList();
        
        this.setData({
            stations: app.globalData.stations,
            user_location: user_location,
        });
        this.smart_sort();
        let i = 0;
        let markers = [];
        for (let u of app.globalData.stations) {
            if (u.view) {
                markers.push({
                    id: i,
                    latitude: u.lat,   // 标记点纬度
                    longitude: u.lon, // 标记点经度
                    title: u.name,
                    width: 30,
                    height: 30,
                })
                i++;
            }
        }
        this.setData({ markers: markers });
        console.log('index.js---数据同步成功');
    },

    // 提取校区列表
    extractCampusList() {
        let campusSet = new Set();
        campusSet.add('全部');
        
        for (let station of app.globalData.originalStations) {
            if (station.campus_name) {
                campusSet.add(station.campus_name);
            }
        }
        
        let campusList = Array.from(campusSet);
        this.setData({
            campusList: campusList
        });
    },
    
    // 提取运营商列表
    extractProviderList() {
        let providerSet = new Set();
        providerSet.add('全部');
        
        for (let station of app.globalData.originalStations) {
            if (station.provider) {
                providerSet.add(station.provider);
            }
        }
        
        let providerList = Array.from(providerSet);
        this.setData({
            providerList: providerList
        });
    },
    
    // 根据校区和运营商筛选充电桩
    filterStations() {
        let { selectedCampus, selectedProvider } = this.data;
        
        // 更新每个充电桩的view属性
        for (let i = 0; i < app.globalData.stations.length; i++) {
            const station = app.globalData.stations[i];
            // 校区筛选
            const campusMatch = selectedCampus === '全部' || station.campus_name === selectedCampus;
            // 运营商筛选
            const providerMatch = selectedProvider === '全部' || station.provider === selectedProvider;
            // 同时满足校区和运营商条件则显示
            app.globalData.stations[i].view = campusMatch && providerMatch;
        }
        
        // 重新排序
        if (this.data.sortBy == 0) {
            this.smart_sort();
        } else if (this.data.sortBy == 1) {
            app.globalData.stations.sort((a, b) => a.dist - b.dist);
        } else if (this.data.sortBy == 2) {
            app.globalData.stations.sort((a, b) => b.free - a.free);
        }
        
        // 更新markers，只包含view为true的充电桩
        let markers = [];
        let markerId = 0;
        for (let i = 0; i < app.globalData.stations.length; i++) {
            let u = app.globalData.stations[i];
            if (u.view) {
                markers.push({
                    id: markerId++,
                    latitude: u.lat,
                    longitude: u.lon,
                    title: u.name,
                    width: 30,
                    height: 30,
                })
            }
        }
        
        this.setData({
            stations: app.globalData.stations,
            markers: markers
        });
    },
    
    // 校区选择变化处理
    onCampusChange(e) {
        const index = e.detail.value;
        const campus = this.data.campusList[index];
        
        this.setData({
            selectedCampusIndex: index,
            selectedCampus: campus
        });
        
        // 筛选充电桩
        this.filterStations();
    },
    
    // 运营商选择变化处理
    onProviderChange(e) {
        const index = e.detail.value;
        const provider = this.data.providerList[index];
        
        this.setData({
            selectedProviderIndex: index,
            selectedProvider: provider
        });
        
        // 筛选充电桩
        this.filterStations();
    },
    
    changeSort() { // 更改排序方式 
        this.setData({
            sortBy: (this.data.sortBy + 1) % 3
        });
        
        if (this.data.sortBy == 0) {
            this.smart_sort();
        }
        if (this.data.sortBy == 1) { // 按距离排序
            app.globalData.stations.sort((a, b) => a.dist - b.dist);
            this.setData({
                stations: app.globalData.stations
            });
        }
        else if (this.data.sortBy == 2) { // 按空位排序
            app.globalData.stations.sort((a, b) => b.free - a.free);
            this.setData({
                stations: app.globalData.stations
            });
        }
    },

    go_detail(e) {
        const index = e.currentTarget.dataset.index;
        const station = this.data.stations[index];
        console.log("点击了充电桩\n", station);
        wx.navigateTo({
            url: '/pages/detail/detail?station=' + JSON.stringify(station) + '&campus=' + this.data.selectedCampus
        });
    },
    
    // 从详情页返回时设置校区
    setCampus(campus) {
        let index = this.data.campusList.indexOf(campus);
        // 如果校区不在列表中，添加到列表中
        if (index === -1) {
            const campusList = [...this.data.campusList];
            campusList.push(campus);
            index = campusList.length - 1;
            this.setData({
                campusList: campusList
            });
        }
        // 更新选中的校区并筛选
        this.setData({
            selectedCampusIndex: index,
            selectedCampus: campus
        });
        this.filterStations();
    },
    
    // 从详情页返回时设置运营商
    setProvider(provider) {
        let index = this.data.providerList.indexOf(provider);
        // 如果运营商不在列表中，添加到列表中
        if (index === -1) {
            const providerList = [...this.data.providerList];
            providerList.push(provider);
            index = providerList.length - 1;
            this.setData({
                providerList: providerList
            });
        }
        // 更新选中的运营商并筛选
        this.setData({
            selectedProviderIndex: index,
            selectedProvider: provider
        });
        this.filterStations();
    },

    // 搜索事件处理
    onSearch(e) {
        const searchText = e.detail.searchText;
        
        if (searchText === '') {
            // 如果搜索名称为空，重置searchMode为1
            this.setData({
                searchMode: 1,
                searched: 0
            });
            // 重置所有充电桩的view属性
            for (let i = 0; i < app.globalData.stations.length; i++) {
                app.globalData.stations[i].view = true;
            }
        } else {
            // 如果搜索名称不为空，设置searchMode为0，searched为1
            this.setData({
                searchMode: 0,
                searched: 1,
                searchText: searchText
            });
            // 根据搜索文本过滤充电桩
            for (let i = 0; i < app.globalData.stations.length; i++) {
                const station = app.globalData.stations[i];
                // 检查充电桩名称是否包含搜索文本
                const nameMatch = station.name.includes(searchText);
                // 同时考虑校区和运营商的筛选条件
                const campusMatch = this.data.selectedCampus === '全部' || station.campus_name === this.data.selectedCampus;
                const providerMatch = this.data.selectedProvider === '全部' || station.provider === this.data.selectedProvider;
                
                app.globalData.stations[i].view = nameMatch && campusMatch && providerMatch;
            }
        }
        
        // 重新排序
        if (this.data.sortBy == 0) {
            this.smart_sort();
        } else if (this.data.sortBy == 1) {
            app.globalData.stations.sort((a, b) => a.dist - b.dist);
        } else if (this.data.sortBy == 2) {
            app.globalData.stations.sort((a, b) => b.free - a.free);
        }
        
        // 更新页面数据
        this.setData({
            stations: app.globalData.stations
        });
    },

    onLoad: function () {
        this.transport_data();
    },
    
    onShow: function () {
        // 检查是否需要设置校区筛选
        if (app.globalData.returnCampus) {
            this.setCampus(app.globalData.returnCampus);
            // 清空全局参数，避免重复应用
            app.globalData.returnCampus = null;
        }
        
        // 检查是否需要设置运营商筛选
        if (app.globalData.returnProvider) {
            this.setProvider(app.globalData.returnProvider);
            // 清空全局参数，避免重复应用
            app.globalData.returnProvider = null;
        }
    }
})
