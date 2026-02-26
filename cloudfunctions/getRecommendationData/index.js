const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const { OPENID } = wxContext
    const days = 7 // 近7天

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 特定时间点
    const timePoints = [7.5, 10.5, 13.5, 16.5, 19.5, 22.5] // 7:30, 10:30, 13:30, 16:30, 19:30, 22:30

    // 获取用户充电历史
    const userHistoryResult = await db.collection('chargingHistory')
      .where({
        _openid: OPENID,
        timestamp: _.gte(startDate)
      })
      .orderBy('timestamp', 'desc')
      .get()

    // 获取所有充电历史
    const allHistoryResult = await db.collection('chargingHistory')
      .where({
        timestamp: _.gte(startDate)
      })
      .get()

    // 计算用户偏好
    const userPreferences = {
      preferredTimeSlots: {},
      preferredCampuses: {},
      preferredStations: {},
      avgChargingDuration: 0,
      totalChargingCount: userHistoryResult.data.length,
      totalChargingDuration: 0
    }

    userHistoryResult.data.forEach(record => {
      if (!userPreferences.preferredTimeSlots[record.timeSlot]) {
        userPreferences.preferredTimeSlots[record.timeSlot] = 0
      }
      userPreferences.preferredTimeSlots[record.timeSlot]++

      if (!userPreferences.preferredCampuses[record.campus]) {
        userPreferences.preferredCampuses[record.campus] = 0
      }
      userPreferences.preferredCampuses[record.campus]++

      if (!userPreferences.preferredStations[record.stationId]) {
        userPreferences.preferredStations[record.stationId] = {
          stationId: record.stationId,
          stationName: record.stationName,
          count: 0
        }
      }
      userPreferences.preferredStations[record.stationId].count++

      userPreferences.totalChargingDuration += record.chargingDuration || 0
    })

    if (userPreferences.totalChargingCount > 0) {
      userPreferences.avgChargingDuration = userPreferences.totalChargingDuration / userPreferences.totalChargingCount
    }

    // 收集充电桩使用情况（按时间点）
    const stationUsageData = {}

    // 初始化每个充电桩的数据
    allHistoryResult.data.forEach(record => {
      if (!stationUsageData[record.stationId]) {
        stationUsageData[record.stationId] = {
          stationId: record.stationId,
          stationName: record.stationName,
          campus: record.campus,
          provider: record.provider,
          totalCount: 0,
          timePointData: {} // 时间点数据
        }
        
        // 初始化每个时间点的数据
        timePoints.forEach(timePoint => {
          stationUsageData[record.stationId].timePointData[timePoint] = {
            total: 0, // 总量
            available: 0, // 空闲数
            usageCount: 0 // 使用次数
          }
        })
      }
      
      stationUsageData[record.stationId].totalCount++
    })

    // 统计每个时间点的使用情况
    allHistoryResult.data.forEach(record => {
      const station = stationUsageData[record.stationId]
      const recordHour = record.hour + (record.minute || 0) / 60 // 转换为小时小数
      
      // 找到最接近的时间点
      let closestTimePoint = null
      let minDiff = Infinity
      
      timePoints.forEach(timePoint => {
        const diff = Math.abs(recordHour - timePoint)
        if (diff < minDiff && diff <= 0.5) { // 30分钟内的记录
          minDiff = diff
          closestTimePoint = timePoint
        }
      })
      
      if (closestTimePoint) {
        station.timePointData[closestTimePoint].usageCount++
      }
    })

    // 假设每个充电桩的总量为固定值（实际应该从设备信息中获取）
    const defaultTotalChargers = 4 // 默认每个充电桩有4个充电口
    
    Object.values(stationUsageData).forEach(station => {
      timePoints.forEach(timePoint => {
        const timePointData = station.timePointData[timePoint]
        timePointData.total = defaultTotalChargers
        // 假设使用次数越多，空闲数越少
        timePointData.available = Math.max(0, defaultTotalChargers - timePointData.usageCount)
      })
    })

    const currentHour = new Date().getHours()
    const currentTimeSlot = getTimeSlot(currentHour)

    return {
      success: true,
      data: {
        userInfo: {
          openid: OPENID
        },
        userPreferences: userPreferences,
        stationUsageData: Object.values(stationUsageData),
        timePoints: timePoints,
        currentTime: {
          hour: currentHour,
          timeSlot: currentTimeSlot,
          date: new Date().toISOString().split('T')[0]
        },
        dataTimeRange: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days: days
        }
      },
      message: '获取推荐数据成功'
    }
  } catch (error) {
    console.error('获取推荐数据失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

function getTimeSlot(hour) {
  if (hour >= 6 && hour < 12) {
    return 'morning'
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon'
  } else if (hour >= 18 && hour < 24) {
    return 'evening'
  } else {
    return 'night'
  }
}