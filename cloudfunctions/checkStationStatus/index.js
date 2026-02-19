const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const statusResponse = await axios.get('https://charger.philfan.cn/api/status')
    const currentStations = statusResponse.data.stations

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
      message: '检测完成'
    }
  } catch (error) {
    console.error('检测充电桩状态失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
