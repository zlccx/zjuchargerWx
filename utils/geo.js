// 地理相关工具函数

// 地球半径(米)
const EARTH_RADIUS = 6371000;
const X_PI = (Math.PI * 3000.0) / 180.0;

// 使用Haversine公式计算两点间距离
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const toRad = (d) => Number(d) * Math.PI / 180; // 转弧度

    lat1 = Number(lat1);
    lng1 = Number(lng1);
    lat2 = Number(lat2);
    lng2 = Number(lng2);

    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    const deltaLatRad = toRad(lat2 - lat1);
    const deltaLngRad = toRad(lng2 - lng1);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS * c);
}

// 将BD09坐标转换成GCJ02
export function bd09ToGcj02(bd_lat, bd_lon) {
    bd_lat = Number(bd_lat);
    bd_lon = Number(bd_lon);

    const y = bd_lat - 0.006;
    const x = bd_lon - 0.0065;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);

    const gcj_lat = z * Math.sin(theta);
    const gcj_lon = z * Math.cos(theta);

    return [gcj_lat, gcj_lon];
}
