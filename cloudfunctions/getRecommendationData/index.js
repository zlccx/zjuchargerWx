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
    const { days = 30 } = event

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const userHistoryResult = await db.collection('chargingHistory')
      .where({
        _openid: OPENID,
        timestamp: _.gte(startDate)
      })
      .orderBy('timestamp', 'desc')
      .get()

    const allHistoryResult = await db.collection('chargingHistory')
      .where({
        timestamp: _.gte(startDate)
      })
      .get()

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

    const stationUsageData = {}

    allHistoryResult.forEach(record => {
      if (!stationUsageData[record.stationId]) {
        stationUsageData[record.stationId] = {
          stationId: record.stationId,
          stationName: record.stationName,
          campus: record.campus,
          provider: record.provider,
          totalCount: 0,
          timeSlotDistribution: {
            morning: 0,
            afternoon: 0,
            evening: 0,
            night: 0
          },
          hourlyDistribution: {},
          avgDuration: 0,
          totalDuration: 0,
          recentUsage: []
        }
      }

      const station = stationUsageData[record.stationId]
      station.totalCount++
      station.timeSlotDistribution[record.timeSlot]++
      station.totalDuration += record.chargingDuration || 0

      const hour = record.hour
      if (!station.hourlyDistribution[hour]) {
        station.hourlyDistribution[hour] = 0
      }
      station.hourlyDistribution[hour]++

      station.recentUsage.push({
        date: record.date,
        hour: record.hour,
        timeSlot: record.timeSlot,
        duration: record.chargingDuration
      })

      if (station.recentUsage.length > 100) {
        station.recentUsage.shift()
      }
    })

    Object.values(stationUsageData).forEach(station => {
      if (station.totalCount > 0) {
        station.avgDuration = station.totalDuration / station.totalCount
      }
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