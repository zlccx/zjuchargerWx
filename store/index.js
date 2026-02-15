import { bd09ToGcj02, calculateDistance } from '@/utils/geo';
import { extractCampusList, extractProviderList } from '@/utils/common';
import { sortStations } from '@/utils/sort';

// 初始状态
const initialState = {
    // setData 更新页面
    updatePages: {},
    pageCount: 0,

    userLocation: null,
    stations: null,
    originalStations: null,

    // 收藏列表
    favoriteStations: [],

    // 筛选条件
    filter: {
        campus: null,
        provider: null,
    },

    // 消息提醒相关
    notificationEnabled: false, // 消息提醒是否开启
    stationStatusHistory: {}, // 充电桩历史状态记录
    notificationTimer: null, // 定时检测定时器
};

// 状态存储
let state = JSON.parse(JSON.stringify(initialState));

// 状态管理API
export const store = {
    getStatus() {  // request 不支持 Promise 风格，需要手动封装
        return new Promise((resolve, reject) => wx.request({
            url: 'https://charger.philfan.cn/api/status',
            success: (res) => {
                console.log('app.js - 成功获得充电桩状态');
                resolve(res.data);
            },
            fail: (err) => {
                console.log('app.js - 获得充电桩状态失败');
                reject(err);
            }
        }));
    },

    async processData() {
        let [userLocation, { stations }] = await Promise.all([wx.getLocation({ 'type': 'gcj02' }), this.getStatus()]);
        if (!stations) throw new Error('非法data');
        for (let i = 0; i < stations.length; i++) {
            let u = stations[i];
            if (!u.fixed) {
                [u.lat, u.lon] = bd09ToGcj02(u.lat, u.lon);
                u.fixed = true;
            }
            stations[i].dist = calculateDistance(u.lat, u.lon, userLocation.latitude, userLocation.longitude);
            stations[i].view = true;
            stations[i].like = false;
        }
        state.userLocation = userLocation;
        state.stations = stations;
        state.originalStations = JSON.parse(JSON.stringify(stations));

        // 提取校区列表
        state.campusList = extractCampusList(stations);
        // 提取运营商列表
        state.providerList = extractProviderList(stations);

        // 智能排序
        state.stations = sortStations(stations, 0);

        this.update("stations");
        this.update("campusList");
        this.update("providerList");
        this.update("userLocation");
    },

    delUpdatePage(dataName, pageName) {
        if (state.updatePages[dataName]) {
            delete state.updatePages[dataName][pageName];
        }
    },

    addUpdatePage(dataName, pageName, pageObj) {
        if (state.updatePages[dataName] === undefined) {
            state.updatePages[dataName] = { [pageName]: pageObj };
        } else {
            state.updatePages[dataName][pageName] = pageObj;
        }
    },

    update(dataName) {
        if (state.updatePages[dataName]) {
            for (const page of Object.values(state.updatePages[dataName])) {
                page.setData({ [dataName]: state[dataName] });
            }
        }
    },

    currentPageCount() {
        return state.pageCount ++ ;
    },

    // 获取当前状态
    getState() {
        return state;
    },

    // 更新状态
    setState(newState) {
        state = { ...state, ...newState };
    },

    // 重置状态
    resetState() {
        state = { ...initialState };
    },

    // 用户位置相关方法
    setUserLocation(location) {
        this.setState({ userLocation: location });
    },

    // 充电桩数据相关方法
    setStations(stations) {
        this.setState({ stations });
    },

    setOriginalStations(stations) {
        this.setState({ originalStations: stations });
    },


    // 收藏列表相关方法
    setFavoriteStations(stations) {
        this.setState({ favoriteStations: stations });
    },

    // 添加收藏
    addFavorite(station) {
        const isExist = state.favoriteStations.some(
            (item) => item.hash_id === station.hash_id,
        );
        if (!isExist) {
            const newFavorites = [...state.favoriteStations, station];
            this.setFavoriteStations(newFavorites);
            return true;
        }
        return false;
    },

    // 移除收藏
    removeFavorite(hashId) {
        const newFavorites = state.favoriteStations.filter(
            (item) => item.hash_id !== hashId,
        );
        if (newFavorites.length !== state.favoriteStations.length) {
            this.setFavoriteStations(newFavorites);
            return true;
        }
        return false;
    },

    // 检查是否已收藏
    isFavorite(hashId) {
        return state.favoriteStations.some((item) => item.hash_id === hashId);
    },

    // 筛选条件相关方法
    setFilter(filter) {
        this.setState({ filter: { ...state.filter, ...filter } });
    },

    resetFilter() {
        this.setState({ filter: { campus: null, provider: null } });
    },

    // 消息提醒相关方法
    setNotificationEnabled(enabled) {
        this.setState({ notificationEnabled: enabled });
        // 同时保存到本地存储
        try {
            wx.setStorageSync("notificationEnabled", enabled);
        } catch (error) {
            console.error("保存消息提醒状态失败:", error);
        }
    },

    getNotificationEnabled() {
        return state.notificationEnabled;
    },

    // 充电桩状态历史相关方法
    setStationStatusHistory(history) {
        this.setState({ stationStatusHistory: history });
    },

    updateStationStatusHistory(stationId, status) {
        const newHistory = { ...state.stationStatusHistory };
        newHistory[stationId] = status;
        this.setStationStatusHistory(newHistory);
    },

    getStationStatusHistory() {
        return state.stationStatusHistory;
    },

    // 定时器相关方法
    setNotificationTimer(timer) {
        this.setState({ notificationTimer: timer });
    },

    getNotificationTimer() {
        return state.notificationTimer;
    },
};

// 导出store实例
export default store;
