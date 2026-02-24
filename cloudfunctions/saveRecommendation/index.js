const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const { OPENID } = wxContext
    const { recommendations, reasoning } = event

    const recommendationRecord = {
      _openid: OPENID,
      recommendations: recommendations,
      reasoning: reasoning,
      timestamp: new Date(),
      createdAt: new Date().toISOString()
    }

    await db.collection('aiRecommendations').add({
      data: recommendationRecord
    })

    return {
      success: true,
      message: '推荐结果保存成功',
      record: recommendationRecord
    }
  } catch (error) {
    console.error('保存推荐结果失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}