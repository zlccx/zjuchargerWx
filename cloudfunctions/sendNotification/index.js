const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { notifications } = event

  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  try {
    const results = []

    for (const notification of notifications) {
      const { openid, templateId, stationName, freeCount, totalCount } = notification

      try {
        const result = await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId: templateId,
          page: 'pages/index/index',
          data: {
            time1: {
              value: formatDate(new Date())
            },
            thing2: {
              value: `${stationName}（空闲${freeCount}/${totalCount}）`
            }
          }
        })

        results.push({
          success: true,
          openid: openid,
          stationName: stationName,
          result: result
        })

        console.log('发送成功:', stationName, openid)

        // 发送成功后，标记订阅为已使用
        await db.collection('subscribes')
          .where({
            _openid: openid,
            templateId: templateId,
            status: 'active'
          })
          .update({
            data: {
              status: 'used',
              usedTime: new Date()
            }
          })

      } catch (error) {
        console.error('发送失败:', stationName, openid, error)
        results.push({
          success: false,
          openid: openid,
          stationName: stationName,
          error: error.message
        })
      }
    }

    return {
      success: true,
      results: results,
      message: '发送完成'
    }
  } catch (error) {
    console.error('发送订阅消息失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
