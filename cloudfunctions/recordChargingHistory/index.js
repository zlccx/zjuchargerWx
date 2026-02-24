const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, stationId, stationName, campus, provider, chargingDuration, chargingTime } = event

  try {
    const { OPENID } = wxContext

    if (action === 'add') {
      const record = {
        _openid: OPENID,
        stationId,
        stationName,
        campus,
        provider,
        chargingDuration,
        chargingTime,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0],
        hour: new Date().getHours(),
        timeSlot: getTimeSlot(new Date().getHours())
      }

      await db.collection('chargingHistory').add({
        data: record
      })

      return {
        success: true,
        message: '充电记录添加成功',
        record
      }
    } else if (action === 'get') {
      const { days = 30 } = event
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const result = await db.collection('chargingHistory')
        .where({
          _openid: OPENID,
          timestamp: _.gte(startDate)
        })
        .orderBy('timestamp', 'desc')
        .get()

      return {
        success: true,
        history: result.data,
        message: '获取充电历史成功'
      }
    } else if (action === 'getStationUsage') {
      const { days = 30 } = event
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const result = await db.collection('chargingHistory')
        .where({
          timestamp: _.gte(startDate)
        })
        .get()

      const stationUsage = {}
      
      result.data.forEach(record => {
        if (!stationUsage[record.stationId]) {
          stationUsage[record.stationId] = {
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
            totalDuration: 0
          }
        }
        
        const usage = stationUsage[record.stationId]
        usage.totalCount++
        usage.timeSlotDistribution[record.timeSlot]++
        usage.totalDuration += record.chargingDuration || 0
        
        const hour = record.hour
        if (!usage.hourlyDistribution[hour]) {
          usage.hourlyDistribution[hour] = 0
        }
        usage.hourlyDistribution[hour]++
      })

      Object.values(stationUsage).forEach(usage => {
        if (usage.totalCount > 0) {
          usage.avgDuration = usage.totalDuration / usage.totalCount
        }
      })

      return {
        success: true,
        stationUsage: Object.values(stationUsage),
        message: '获取充电桩使用情况成功'
      }
    } else if (action === 'getUserPreferences') {
      const { days = 30 } = event
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const result = await db.collection('chargingHistory')
        .where({
          _openid: OPENID,
          timestamp: _.gte(startDate)
        })
        .get()

      const preferences = {
        preferredTimeSlots: {},
        preferredCampuses: {},
        preferredStations: {},
        totalChargingCount: result.data.length
      }

      result.data.forEach(record => {
        if (!preferences.preferredTimeSlots[record.timeSlot]) {
          preferences.preferredTimeSlots[record.timeSlot] = 0
        }
        preferences.preferredTimeSlots[record.timeSlot]++

        if (!preferences.preferredCampuses[record.campus]) {
          preferences.preferredCampuses[record.campus] = 0
        }
        preferences.preferredCampuses[record.campus]++

        if (!preferences.preferredStations[record.stationId]) {
          preferences.preferredStations[record.stationId] = {
            stationId: record.stationId,
            stationName: record.stationName,
            count: 0
          }
        }
        preferences.preferredStations[record.stationId].count++
      })

      return {
        success: true,
        preferences,
        message: '获取用户偏好成功'
      }
    }

    return {
      success: false,
      message: '未知的操作类型'
    }
  } catch (error) {
    console.error('充电历史操作失败:', error)
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