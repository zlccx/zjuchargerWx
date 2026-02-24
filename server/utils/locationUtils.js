// 位置拟合算法 - 计算多个定位数据的拟合位置
const calculateFittedLocation = (locations) => {
    if (locations.length === 0) {
        return { latitude: 0, longitude: 0 };
    }
    
    // 使用中位数拟合，减少异常值影响
    const latitudes = locations.map(loc => loc.latitude).sort((a, b) => a - b);
    const longitudes = locations.map(loc => loc.longitude).sort((a, b) => a - b);
    
    const midIndex = Math.floor(locations.length / 2);
    
    let fittedLat, fittedLon;
    
    if (locations.length % 2 === 0) {
        // 偶数个数据，取中间两个的平均值
        fittedLat = (latitudes[midIndex - 1] + latitudes[midIndex]) / 2;
        fittedLon = (longitudes[midIndex - 1] + longitudes[midIndex]) / 2;
    } else {
        // 奇数个数据，取中间值
        fittedLat = latitudes[midIndex];
        fittedLon = longitudes[midIndex];
    }
    
    return { latitude: fittedLat, longitude: fittedLon };
};

module.exports = {
    calculateFittedLocation
};
