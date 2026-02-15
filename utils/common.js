// 通用工具函数

// 深拷贝
export function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepCopy(obj[key]);
        }
    }
    return clonedObj;
}

/**
 * 从充电桩数据中提取校区列表
 * @param {Array} stations - 充电桩数组
 * @returns {Array} 校区列表，包含'全部'选项
 */
export function extractCampusList(stations) {
    let campusSet = new Set(['全部']);

    for (let station of stations) {
        if (station.campus_name) {
            campusSet.add(station.campus_name);
        }
    }

    return Array.from(campusSet);
}

/**
 * 从充电桩数据中提取运营商列表
 * @param {Array} stations - 充电桩数组
 * @returns {Array} 运营商列表，包含'全部'选项
 */
export function extractProviderList(stations) {
    let providerSet = new Set(['全部']);

    for (let station of stations) {
        if (station.provider) {
            providerSet.add(station.provider);
        }
    }

    return Array.from(providerSet);
}

/**
 * 筛选充电桩
 * @param {Array} stations - 充电桩数组
 * @param {string} campus - 选中的校区，'全部'表示不筛选
 * @param {string} provider - 选中的运营商，'全部'表示不筛选
 * @param {string} searchText - 搜索文本，空字符串表示不搜索
 * @returns {Array} 筛选后的充电桩数组，带有view属性
 */
export function initFilterStations(stations, campus, provider, searchText = '') {
    for (let station of stations) {
        // 校区筛选
        const campusMatch = campus === '全部' || station.campus_name === campus;
        // 运营商筛选
        const providerMatch = provider === '全部' || station.provider === provider;
        // 搜索筛选
        const searchMatch = searchText === '' || station.name.includes(searchText);

        // 同时满足所有条件则显示
        station.view = campusMatch && providerMatch && searchMatch;
    }
}
