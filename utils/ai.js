import AI_CONFIG from '@/config/ai'

function setApiKey(apiKey) {
  AI_CONFIG.apiKey = apiKey
}

function getApiKey() {
  return AI_CONFIG.apiKey
}

async function callAI(prompt, options = {}) {
  const { temperature = 0.7, maxTokens = 2000 } = options

  if (!AI_CONFIG.apiKey) {
    throw new Error('API Key未设置，请先调用setApiKey设置或在config/ai.js中配置')
  }

  try {
    const response = await wx.request({
      url: `${AI_CONFIG.baseURL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      data: {
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的充电桩推荐助手，根据用户的充电偏好和充电桩使用情况，为用户推荐最合适的充电桩和充电时间。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      }
    })

    return response.data
  } catch (error) {
    console.error('调用AI API失败:', error)
    throw error
  }
}

async function getRecommendations(recommendationData) {
  const { userPreferences, stationUsageData, currentTime } = recommendationData

  const prompt = `
请根据以下信息为用户推荐充电桩和充电时间：

用户偏好：
- 偏好时间段：${JSON.stringify(userPreferences.preferredTimeSlots)}
- 偏好校区：${JSON.stringify(userPreferences.preferredCampuses)}
- 常用充电桩：${JSON.stringify(userPreferences.preferredStations)}
- 平均充电时长：${userPreferences.avgChargingDuration} 分钟
- 总充电次数：${userPreferences.totalChargingCount}

当前时间：
- 时间：${currentTime.hour}点
- 时段：${currentTime.timeSlot}
- 日期：${currentTime.date}

充电桩使用情况（部分）：
${stationUsageData.slice(0, 10).map(station => `
- ${station.stationName}（${station.campus}）
  - 总使用次数：${station.totalCount}
  - 时段分布：${JSON.stringify(station.timeSlotDistribution)}
  - 平均充电时长：${station.avgDuration.toFixed(1)} 分钟
`).join('\n')}

请提供以下格式的推荐结果（JSON格式）：
{
  "recommendations": [
    {
      "stationId": "充电桩ID",
      "stationName": "充电桩名称",
      "campus": "校区",
      "provider": "运营商",
      "recommendedTime": "推荐时间（如：14:00）",
      "recommendedTimeSlot": "推荐时段（morning/afternoon/evening/night）",
      "reason": "推荐理由",
      "score": 评分（0-100之间的数字）
    }
  ],
  "reasoning": "整体推荐理由说明"
}

要求：
1. 根据用户偏好推荐3-5个充电桩
2. 推荐时间要考虑当前时间和充电桩使用规律
3. 推荐理由要具体说明为什么推荐这个充电桩和时间
4. 评分要综合考虑用户偏好、充电桩可用性、使用规律等因素
5. 只返回JSON格式的结果，不要有其他文字说明
`

  try {
    const response = await callAI(prompt, { temperature: 0.7, maxTokens: 2000 })
    
    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI返回的格式不正确')
      }
    } else {
      throw new Error('AI返回的数据格式不正确')
    }
  } catch (error) {
    console.error('获取AI推荐失败:', error)
    throw error
  }
}

module.exports = {
  setApiKey,
  getApiKey,
  callAI,
  getRecommendations
}