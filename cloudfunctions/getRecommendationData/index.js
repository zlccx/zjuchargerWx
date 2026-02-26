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

    // 获取用户点击和订阅的充电桩历史
    const userHistoryResult = await db.collection('chargingHistory')
      .where({
        _openid: OPENID,
        timestamp: _.gte(startDate)
      })
      .orderBy('timestamp', 'desc')
      .get()

    // 获取过去7天所有充电桩的状态历史
    const stationStatusResult = await db.collection('stationStatusHistory')
      .where({
        timestamp: _.gte(startDate)
      })
      .orderBy('timestamp', 'desc')
      .get()

    // 计算用户偏好
    const userPreferences = {
      preferredTimeSlots: {},
      preferredCampuses: {},
      preferredStations: {},
      totalInteractions: userHistoryResult.data.length,
      totalChargingDuration: 0
    }

    userHistoryResult.data.forEach(record => {
      if (!userPreferences.preferredTimeSlots[record.timeSlot]) {
        userPreferences.preferredTimeSlots[record.timeSlot] = 0
      }
      userPreferences.preferredTimeSlots[record.timeSlot]++

      if (record.campus && !userPreferences.preferredCampuses[record.campus]) {
        userPreferences.preferredCampuses[record.campus] = 0
      }
      if (record.campus) {
        userPreferences.preferredCampuses[record.campus]++
      }

      if (!userPreferences.preferredStations[record.stationId]) {
        userPreferences.preferredStations[record.stationId] = {
          stationId: record.stationId,
          stationName: record.stationName || 'Unknown',
          count: 0,
          actions: []
        }
      }
      userPreferences.preferredStations[record.stationId].count++
      userPreferences.preferredStations[record.stationId].actions.push({
        action: record.action || 'unknown',
        timestamp: record.timestamp
      })

      userPreferences.totalChargingDuration += record.chargingDuration || 0
    })

    // 整理充电桩状态数据
    const stationStatusData = {}

    stationStatusResult.data.forEach(record => {
      if (!stationStatusData[record.stationId]) {
        stationStatusData[record.stationId] = {
          stationId: record.stationId,
          stationName: record.stationName,
          timePointData: {}
        }
      }

      const station = stationStatusData[record.stationId]
      const timePoint = record.timePoint

      if (!station.timePointData[timePoint]) {
        station.timePointData[timePoint] = []
      }

      station.timePointData[timePoint].push({
        free: record.free,
        total: record.total,
        timestamp: record.timestamp,
        date: record.date
      })
    })

    // 计算每个充电桩在每个时间点的平均状态
    Object.values(stationStatusData).forEach(station => {
      Object.keys(station.timePointData).forEach(timePoint => {
        const dataPoints = station.timePointData[timePoint]
        const avgFree = dataPoints.reduce((sum, point) => sum + point.free, 0) / dataPoints.length
        const avgTotal = dataPoints.reduce((sum, point) => sum + point.total, 0) / dataPoints.length

        station.timePointData[timePoint] = {
          avgFree: Math.round(avgFree),
          avgTotal: Math.round(avgTotal),
          dataPoints: dataPoints.length
        }
      })
    })

    const currentHour = new Date().getHours()
    const currentTimeSlot = getTimeSlot(currentHour)

    // 准备AI输入数据
    const aiInputData = {
      userPreferences: userPreferences,
      stationStatusData: Object.values(stationStatusData),
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
    }

    return {
      success: true,
      data: {
        userInfo: {
          openid: OPENID
        },
        userPreferences: userPreferences,
        stationStatusData: Object.values(stationStatusData),
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
        },
        aiInputData: aiInputData
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