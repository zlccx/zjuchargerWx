// 排序相关工具函数

// 智能排序的基础距离分组（米）
const BASE_DIST = 500;

// 智能排序
function smartSort(stations) {
    let dividedStations = [];
    let zeroFree = [];

    // 按距离分组，同时保留所有充电桩
    for (let station of stations) {
        for (let i = dividedStations.length; i <= station.dist / BASE_DIST; i++) {
            dividedStations.push([]);
        }
        if (station.free) {
            dividedStations[parseInt(station.dist / BASE_DIST)].push(station);
        } else {
            zeroFree.push(station);
        }
    }

    // 构建排序后的数组
    let sortedStations = [];
    for (let group of dividedStations) {
        // 组内按空闲数排序
        group.sort((a, b) => b.free - a.free);
        // 将排序后的组添加到结果数组
        sortedStations = sortedStations.concat(group);
    }
    // 最后添加无空闲充电桩
    sortedStations = sortedStations.concat(zeroFree);

    return sortedStations;
}

// 按距离排序
function sortByDistance(stations, ascending = true) {
    return [...stations].sort((a, b) => {
        return ascending ? a.dist - b.dist : b.dist - a.dist;
    });
}

// 按空闲数排序
function sortByFreeCount(stations, ascending = false) {
    return [...stations].sort((a, b) => {
        return ascending ? a.free - b.free : b.free - a.free;
    });
}

// 总排序函数
export function sortStations(stations, sortBy) {
    let sortedStations;
    switch (sortBy) {
        case 0: // 智能排序
            sortedStations = smartSort(stations);
            break;
        case 1: // 按距离排序
            sortedStations = sortByDistance(stations);
            break;
        case 2: // 按空位排序
            sortedStations = sortByFreeCount(stations);
            break;
        default:
            sortedStations = smartSort(stations);
    }
    return sortedStations;
}
