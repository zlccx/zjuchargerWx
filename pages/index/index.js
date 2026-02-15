// index.js

const app = getApp();
const store = app.getStore();
import { calculateDistance, bd09ToGcj02 } from '../../utils/geo';
import { smartSort, sortByDistance, sortByFreeCount, sortStations } from '../../utils/sort';
import { extractCampusList, extractProviderList, filterStations } from '../../utils/common';

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

    async transport_data() { 
        try {
            // 并行获取异步数据
            let [user_location, providers, status] = await Promise.all([
                store.getState().userLocationPromise,
                store.getState().providersPromise,
                store.getState().statusPromise,
            ]);
            
            if (!status || !status.stations) {
                throw new Error('Invalid status data');
            }
            
            let stations = status.stations;
            for (let i = 0; i < stations.length; i++) {
                let u = stations[i];
                if (!u.fixed) {
                    [u.lon, u.lat] = bd09ToGcj02(u.lon, u.lat);
                    u.fixed = true;
                }
                stations[i].dist = 
                    calculateDistance(u.lat, u.lon, user_location.latitude, user_location.longitude);
                // 添加view属性，初始值为true
                stations[i].view = true;
                // 添加like属性，初始值为false
                stations[i].like = false;
            }
            
            // 保存原始数据用于筛选
            store.setOriginalStations([...stations]);
            store.setStations(stations);
            
            // 提取校区列表
            const campusList = extractCampusList(stations);
            // 提取运营商列表
            const providerList = extractProviderList(stations);
            
            this.setData({
                stations: stations,
                user_location: user_location,
                campusList: campusList,
                providerList: providerList
            });
            
            // 智能排序
            const sortedStations = sortStations(stations, this.data.sortBy);
            store.setStations(sortedStations);
            
            // 更新markers
            let markers = [];
            let i = 0;
            for (let u of sortedStations) {
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
            this.setData({ 
                stations: sortedStations,
                markers: markers 
            });
            console.log('index.js---数据同步成功');
        } catch (error) {
            console.error('Failed to transport data:', error);
            wx.showToast({
                title: '数据加载失败',
                icon: 'none',
                duration: 2000
            });
        }
    },


    
    // 根据校区和运营商筛选充电桩
    filterStations() {
        let { selectedCampus, selectedProvider, sortBy } = this.data;
        
        // 使用工具函数筛选充电桩
        let filteredStations = filterStations(store.getState().originalStations, selectedCampus, selectedProvider);
        
        // 重新排序
        let sortedStations = sortStations(filteredStations, sortBy);
        
        // 更新全局数据
        store.setStations(sortedStations);
        
        // 更新markers，只包含view为true的充电桩
        let markers = [];
        let markerId = 0;
        for (let station of sortedStations) {
            if (station.view) {
                markers.push({
                    id: markerId++,
                    latitude: station.lat,
                    longitude: station.lon,
                    title: station.name,
                    width: 30,
                    height: 30,
                })
            }
        }
        
        this.setData({
            stations: sortedStations,
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
        
        // 使用统一的排序函数
        let sortedStations = sortStations(store.getState().stations, this.data.sortBy);
        
        // 更新全局数据
        store.setStations(sortedStations);
        
        // 更新页面数据
        this.setData({
            stations: sortedStations
        });
    },

    go_detail(e) {
        const index = e.currentTarget.dataset.index;
        const station = this.data.stations[index];
        console.log("点击了充电桩\n", station);
        wx.navigateTo({
            url: '/pages/detail/detail?station=' + JSON.stringify(station) + '&campus=' + this.data.selectedCampus
        });
    },
    
    // 设置筛选条件并更新UI
    setFilterOption(type, value) {
        const listName = `${type}List`;
        const selectedIndexName = `selected${type.charAt(0).toUpperCase() + type.slice(1)}Index`;
        const selectedName = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
        
        let list = this.data[listName];
        let index = list.indexOf(value);
        
        // 如果值不在列表中，添加到列表中
        if (index === -1) {
            list = [...list, value];
            index = list.length - 1;
            this.setData({
                [listName]: list
            });
        }
        
        // 更新选中的值并筛选
        this.setData({
            [selectedIndexName]: index,
            [selectedName]: value
        });
        
        this.filterStations();
    },
    
    // 从详情页返回时设置校区
    setCampus(campus) {
        this.setFilterOption('campus', campus);
    },
    
    // 从详情页返回时设置运营商
    setProvider(provider) {
        this.setFilterOption('provider', provider);
    },

    // 搜索事件处理
    onSearch(e) {
        const searchText = e.detail.searchText;
        const { selectedCampus, selectedProvider, sortBy } = this.data;
        
        if (searchText === '') {
            // 如果搜索名称为空，重置搜索状态
            this.setData({
                searchMode: 1,
                searched: 0
            });
        } else {
            // 如果搜索名称不为空，设置搜索状态
            this.setData({
                searchMode: 0,
                searched: 1,
                searchText: searchText
            });
        }
        
        // 使用工具函数筛选充电桩，包含搜索功能
        let filteredStations = filterStations(store.getState().originalStations, selectedCampus, selectedProvider, searchText);
        
        // 重新排序
        let sortedStations = sortStations(filteredStations, sortBy);
        
        // 更新全局数据
        store.setStations(sortedStations);
        
        // 更新页面数据
        this.setData({
            stations: sortedStations
        });
    },

    onLoad: function () {
        this.transport_data();
    },
    
    onShow: function () {
        const state = store.getState();
        
        // 检查是否需要设置校区筛选
        if (state.filter.campus) {
            this.setCampus(state.filter.campus);
            // 清空筛选条件，避免重复应用
            store.setFilter({ campus: null });
        }
        
        // 检查是否需要设置运营商筛选
        if (state.filter.provider) {
            this.setProvider(state.filter.provider);
            // 清空筛选条件，避免重复应用
            store.setFilter({ provider: null });
        }
    }
})
