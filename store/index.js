// 应用状态管理

// 初始状态
const initialState = {
  // 用户位置
  userLocation: null,
  userLocationPromise: null,
  
  // 充电桩服务商
  providers: [],
  providersPromise: null,
  
  // 充电桩数据
  stations: null,
  originalStations: null,
  statusPromise: null,
  
  // 收藏列表
  favoriteStations: [],
  
  // 筛选条件
  filter: {
    campus: null,
    provider: null
  },
  
  // 消息提醒相关
  notificationEnabled: false, // 消息提醒是否开启
  stationStatusHistory: {}, // 充电桩历史状态记录
  notificationTimer: null // 定时检测定时器
};

// 状态存储
let state = { ...initialState };

// 状态变更回调函数列表
let listeners = [];

// 通知所有监听器状态已变更
function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error('State listener error:', error);
    }
  });
}

// 状态管理API
export const store = {
  // 获取当前状态
  getState() {
    return state;
  },
  
  // 更新状态
  setState(newState) {
    state = { ...state, ...newState };
    notifyListeners();
  },
  
  // 重置状态
  resetState() {
    state = { ...initialState };
    notifyListeners();
  },
  
  // 订阅状态变化
  subscribe(listener) {
    listeners.push(listener);
    // 返回取消订阅函数
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  
  // 用户位置相关方法
  setUserLocation(location) {
    this.setState({ userLocation: location });
  },
  
  setUserLocationPromise(promise) {
    this.setState({ userLocationPromise: promise });
  },
  
  // 充电桩服务商相关方法
  setProviders(providers) {
    this.setState({ providers });
  },
  
  setProvidersPromise(promise) {
    this.setState({ providersPromise: promise });
  },
  
  // 充电桩数据相关方法
  setStations(stations) {
    this.setState({ stations });
  },
  
  setOriginalStations(stations) {
    this.setState({ originalStations: stations });
  },
  
  setStatusPromise(promise) {
    this.setState({ statusPromise: promise });
  },
  
  // 收藏列表相关方法
  setFavoriteStations(stations) {
    this.setState({ favoriteStations: stations });
  },
  
  // 添加收藏
  addFavorite(station) {
    const isExist = state.favoriteStations.some(item => item.hash_id === station.hash_id);
    if (!isExist) {
      const newFavorites = [...state.favoriteStations, station];
      this.setFavoriteStations(newFavorites);
      return true;
    }
    return false;
  },
  
  // 移除收藏
  removeFavorite(hashId) {
    const newFavorites = state.favoriteStations.filter(item => item.hash_id !== hashId);
    if (newFavorites.length !== state.favoriteStations.length) {
      this.setFavoriteStations(newFavorites);
      return true;
    }
    return false;
  },
  
  // 检查是否已收藏
  isFavorite(hashId) {
    return state.favoriteStations.some(item => item.hash_id === hashId);
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
      wx.setStorageSync('notificationEnabled', enabled);
    } catch (error) {
      console.error('保存消息提醒状态失败:', error);
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
  }
};

// 导出store实例
export default store;
