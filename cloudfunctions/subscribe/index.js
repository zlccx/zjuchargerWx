const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { templateId, stationIds } = event

  try {
    const { OPENID } = wxContext

    const now = new Date()
    const expireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 先查找是否已有订阅记录
    const existingSubscribe = await db.collection('subscribes')
      .where({
        _openid: OPENID,
        templateId: templateId
      })
      .get()

    let result

    if (existingSubscribe.data.length > 0) {
      // 如果有旧记录，更新状态为 active
      const subscribeId = existingSubscribe.data[0]._id
      result = await db.collection('subscribes').doc(subscribeId).update({
        data: {
          stationIds: stationIds || [],
          createTime: now,
          expireTime: expireTime,
          status: 'active',
          usedTime: null
        }
      })
    } else {
      // 如果没有旧记录，插入新记录
      const subscribeData = {
        _openid: OPENID,
        templateId: templateId,
        stationIds: stationIds || [],
        createTime: now,
        expireTime: expireTime,
        status: 'active'
      }

      result = await db.collection('subscribes').add({
        data: subscribeData
      })
    }

    return {
      success: true,
      _id: result._id || result._id,
      message: '订阅成功'
    }
  } catch (error) {
    console.error('订阅失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
