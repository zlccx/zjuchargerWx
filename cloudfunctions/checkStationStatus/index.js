const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 特定时间点
const timePoints = [7.5, 10.5, 13.5, 16.5, 19.5, 22.5] // 7:30, 10:30, 13:30, 16:30, 19:30, 22:30

exports.main = async (event, context) => {
  try {
    const statusResponse = await axios.get('https://charger.philfan.cn/api/status')
    const currentStations = statusResponse.data.stations

    // 记录所有充电桩的状态到 stationStatusHistory 集合
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour + currentMinute / 60

    // 检查是否是特定时间点
    const isTimePoint = timePoints.some(timePoint => {
      const diff = Math.abs(currentTime - timePoint)
      return diff <= 0.1 // 6分钟内视为有效时间点
    })

    if (isTimePoint) {
      // 记录所有充电桩的状态
      for (const station of currentStations) {
        await db.collection('stationStatusHistory').add({
          data: {
            stationId: station.hash_id,
            stationName: station.name,
            free: station.free,
            total: station.total,
            timestamp: now,
            date: now.toISOString().split('T')[0],
            hour: currentHour,
            minute: currentMinute,
            timePoint: currentTime
          }
        })
      }
    }

    // 继续处理订阅通知
    const activeSubscribes = await db.collection('subscribes')
      .where({
        status: 'active',
        expireTime: _.gt(new Date())
      })
      .get()

    const notifications = []

    for (const subscribe of activeSubscribes.data) {
      const { _openid, stationIds, templateId } = subscribe

      for (const stationId of stationIds) {
        const currentStation = currentStations.find(s => s.hash_id === stationId)

        if (!currentStation) continue

        const historyRecord = await db.collection('stationHistory')
          .where({
            stationId: stationId,
            _openid: _openid
          })
          .orderBy('createTime', 'desc')
          .limit(1)
          .get()

        const historyStatus = historyRecord.data.length > 0 ? historyRecord.data[0] : null

        if (historyStatus && historyStatus.free === 0 && currentStation.free > 0) {
          notifications.push({
            openid: _openid,
            templateId: templateId,
            stationId: stationId,
            stationName: currentStation.name,
            freeCount: currentStation.free,
            totalCount: currentStation.total
          })
        }

        await db.collection('stationHistory').add({
          data: {
            stationId: stationId,
            _openid: _openid,
            free: currentStation.free,
            total: currentStation.total,
            createTime: new Date()
          }
        })
      }
    }

    return {
      success: true,
      notifications: notifications,
      message: '检测完成',
      recordedStatus: isTimePoint ? currentStations.length : 0
    }
  } catch (error) {
    console.error('检测充电桩状态失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
