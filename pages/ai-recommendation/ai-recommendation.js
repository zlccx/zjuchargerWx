// pages/ai-recommendation/ai-recommendation.js
import { getRecommendations } from '@/utils/ai'

Page({
  data: {
    campusList: [
      { id: '紫金港校区', name: '紫金港' },
      { id: '玉泉校区', name: '玉泉' },
      { id: '西溪校区', name: '西溪' },
      { id: '华家池校区', name: '华家池' },
      { id: '之江校区', name: '之江' }
    ],
    timeSlotList: [
      { id: 'morning', name: '上午' },
      { id: 'afternoon', name: '下午' },
      { id: 'evening', name: '晚上' },
      { id: 'night', name: '夜间' }
    ],
    selectedCampuses: [],
    selectedTimeSlots: [],
    selectedDuration: 60,
    loading: false
  },

  onLoad(options) {
    // 可以从选项中获取初始值
    try {
      if (options.campuses) {
        const campuses = JSON.parse(options.campuses);
        this.setData({ selectedCampuses: Array.isArray(campuses) ? campuses : [] });
      }
      if (options.timeSlots) {
        const timeSlots = JSON.parse(options.timeSlots);
        this.setData({ selectedTimeSlots: Array.isArray(timeSlots) ? timeSlots : [] });
      }
    } catch (error) {
      console.error('解析选项失败:', error);
      this.setData({ selectedCampuses: [], selectedTimeSlots: [] });
    }
  },



  goBack() {
    wx.navigateBack()
  },

  toggleCampus(e) {
    const id = e.currentTarget.dataset.id
    let selectedCampuses = [...this.data.selectedCampuses]
    
    if (selectedCampuses.includes(id)) {
      selectedCampuses = selectedCampuses.filter(item => item !== id)
    } else {
      selectedCampuses.push(id)
    }
    
    this.setData({ selectedCampuses })
  },

  toggleTimeSlot(e) {
    const id = e.currentTarget.dataset.id
    let selectedTimeSlots = [...this.data.selectedTimeSlots]
    
    if (selectedTimeSlots.includes(id)) {
      selectedTimeSlots = selectedTimeSlots.filter(item => item !== id)
    } else {
      selectedTimeSlots.push(id)
    }
    
    this.setData({ selectedTimeSlots })
  },

  changeDuration(e) {
    this.setData({ selectedDuration: e.detail.value })
  },

  generateRecommendation() {
    if (this.data.selectedCampuses.length === 0) {
      wx.showToast({
        title: '请至少选择一个校区',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedTimeSlots.length === 0) {
      wx.showToast({
        title: '请至少选择一个时间段',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    // 调用云函数获取推荐数据
    wx.cloud.callFunction({
      name: 'getRecommendationData',
      data: { days: 30 }
    }).then(res => {
      if (res.result.success) {
        const data = res.result.data
        
        // 合并用户选择的偏好
        data.userPreferences = {
          ...data.userPreferences,
          preferredCampuses: this.data.selectedCampuses.reduce((acc, campus) => {
            acc[campus] = 1
            return acc
          }, {}),
          preferredTimeSlots: this.data.selectedTimeSlots.reduce((acc, slot) => {
            acc[slot] = 1
            return acc
          }, {}),
          avgChargingDuration: this.data.selectedDuration
        }
        
        // 调用AI获取推荐
        return getRecommendations(data)
      } else {
        throw new Error('获取推荐数据失败')
      }
    }).then(recommendations => {
      if (recommendations) {
        // 保存推荐结果到云函数
        return wx.cloud.callFunction({
          name: 'saveRecommendation',
          data: recommendations
        }).then(() => {
          // 显示推荐结果
          this.showRecommendationResult(recommendations)
        })
      } else {
        // 显示推荐结果
        this.showRecommendationResult(recommendations)
      }
    }).catch(err => {
      console.error('获取推荐失败:', err)
      wx.showToast({
        title: '获取推荐失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  showRecommendationResult(recommendations) {
    if (!recommendations || !recommendations.recommendations) {
      wx.showModal({
        title: 'AI推荐结果',
        content: '获取推荐失败，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    
    let content = `推荐理由：${recommendations.reasoning}\n\n`
    
    recommendations.recommendations.forEach((rec, index) => {
      content += `${index + 1}. ${rec.stationName}\n`
      content += `   校区：${rec.campus}\n`
      content += `   推荐时间：${rec.recommendedTime}\n`
      content += `   推荐理由：${rec.reason}\n`
      content += `   评分：${rec.score}\n\n`
    })

    wx.showModal({
      title: 'AI推荐结果',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
