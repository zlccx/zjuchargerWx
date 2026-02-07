# ZJU Charger 开发者文档

## 1. 项目概述

ZJU Charger 是一个专为浙江大学师生设计的充电桩查询微信小程序，帮助用户快速找到附近可用的充电桩。本文档旨在为开发者提供详细的项目架构、代码分析和开发指南。

## 2. 项目架构与目录结构

### 2.1 整体架构

```
zjuchargerWx/
├── components/          # 自定义组件
│   ├── chargerItem/     # 充电桩列表项组件
│   └── search/          # 搜索组件
├── imgs/                # 图片资源
├── pages/               # 页面文件
│   ├── detail/          # 充电桩详情页
│   ├── index/           # 主页
│   └── user/            # 用户中心页
├── app.js               # 小程序入口文件
├── app.json             # 全局配置
├── app.wxss             # 全局样式
├── project.config.json  # 项目配置
└── sitemap.json         # 站点地图配置
```

### 2.2 核心文件关系

```
app.js ──┬─→ pages/index/index.js ──┬─→ components/chargerItem/chargerItem.js
         ├─→ pages/detail/detail.js │
         └─→ pages/user/user.js    ─┘
                                     └─→ components/search/search.js
```

## 3. 核心文件详细分析

### 3.1 全局配置文件

#### 3.1.1 app.js

**功能**：小程序入口文件，负责初始化应用、管理全局数据和提供公共方法。

**核心结构**：
```javascript
App({
  globalData: {
    providers: [],          // 充电桩服务商列表
    user_location: null,    // 用户位置信息
    stations: null,         // 充电桩列表
    originalStations: null, // 原始充电桩数据（用于筛选）
    likeStations: [],       // 收藏的充电桩列表
    returnCampus: null,     // 返回首页时需要设置的校区筛选
    returnProvider: null    // 返回首页时需要设置的运营商筛选
  },
  // 异步获取用户位置
  get_user_location(),
  // 获取充电桩服务商
  get_charger_providers(),
  // 获取充电桩状态
  get_charger_status(),
  // 应用启动时初始化
  onLaunch() {}
})
```

**关键方法**：
- `get_user_location()`: 使用微信小程序 API 获取用户位置，返回 Promise
- `get_charger_providers()`: 从后端 API 获取充电桩服务商列表
- `get_charger_status()`: 从后端 API 获取充电桩状态数据
- `onLaunch()`: 应用启动时并行调用上述三个方法，初始化全局数据

#### 3.1.2 app.json

**功能**：小程序全局配置，定义页面路径、导航栏样式、底部标签栏等。

**核心配置**：
```json
{
  "pages": [
    "pages/index/index",
    "pages/detail/detail",
    "pages/user/user"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "ZJU Charger",
    "navigationBarTextStyle": "black"
  },
  "tabBar": {
    "color": "#bfbfbf",
    "selectedColor": "#1aad19",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "imgs/home_page.png",
        "selectedIconPath": "imgs/home_page_selected.png"
      },
      {
        "pagePath": "pages/user/user",
        "text": "我的",
        "iconPath": "imgs/personal_page.png",
        "selectedIconPath": "imgs/personal_page_selected.png"
      }
    ]
  }
}
```

#### 3.1.3 app.wxss

**功能**：小程序全局样式，定义通用样式规则。

**核心样式**：
- 定义了全局字体、颜色和布局样式
- 为各种组件提供基础样式
- 定义了响应式设计规则

### 3.2 页面文件

#### 3.2.1 index 页（主页）

**功能**：展示充电桩列表和地图，提供筛选、排序和搜索功能。

##### index.js

**核心功能**：
- 数据获取与处理
- 智能排序算法
- 坐标转换（BD09 → GCJ02）
- 距离计算
- 筛选与搜索

**关键方法**：
- `calculateDistance()`: 使用 Haversine 公式计算两点间距离
- `bd09ToGcj02()`: 将百度坐标转换为国测局坐标
- `smart_sort()`: 智能排序算法（按距离分组，组内按空闲数排序）
- `transport_data()`: 并行获取数据并处理
- `filterStations()`: 根据校区和运营商筛选充电桩
- `onSearch()`: 处理搜索事件

**数据流程**：
```
app.globalData.user_location_promise
app.globalData.providers_promise → transport_data() → 数据处理 → 页面渲染
app.globalData.status_promise
```

##### index.wxml

**页面结构**：
- 搜索组件
- 提示信息与排序按钮
- 筛选栏（校区、运营商）
- 充电桩列表

##### index.wxss

**样式设计**：
- 响应式布局
- 卡片式设计
- 现代化的视觉效果

##### index.json

**页面配置**：
```json
{
  "usingComponents": {
    "charger-item": "../../components/chargerItem/chargerItem",
    "search": "../../components/search/search"
  }
}
```

#### 3.2.2 detail 页（详情页）

**功能**：展示充电桩详细信息，提供收藏和导航功能。

##### detail.js

**核心功能**：
- 接收并处理从主页传递的数据
- 管理收藏状态
- 初始化地图标记
- 处理导航请求

**关键方法**：
- `onLoad()`: 接收参数并初始化页面
- `initMapMarker()`: 初始化地图标记
- `toggleFavorite()`: 切换收藏状态
- `openNavigation()`: 打开微信内置导航

##### detail.wxml

**页面结构**：
- 地图显示区域
- 充电桩基本信息
- 状态卡片（空闲数、总数、运营商、校区）
- 收藏按钮
- 导航按钮

##### detail.wxss

**样式设计**：
- 分层设计，突出重点信息
- 卡片式布局
- 响应式设计

##### detail.json

**页面配置**：
```json
{
  "usingComponents": {},
  "navigationBarTitleText": "充电桩详情"
}
```

#### 3.2.3 user 页（用户中心）

**功能**：管理用户收藏的充电桩。

##### user.js

**核心功能**：
- 加载收藏的充电桩
- 收藏列表排序
- 下拉刷新

**关键方法**：
- `loadFavoriteStations()`: 加载收藏列表
- `smart_sort()`: 收藏列表智能排序
- `changeSort()`: 切换排序方式
- `goDetail()`: 跳转到详情页

##### user.wxml

**页面结构**：
- 收藏统计信息
- 排序按钮
- 收藏列表
- 空状态提示

##### user.wxss

**样式设计**：
- 简洁明了的布局
- 统一的视觉风格

##### user.json

**页面配置**：
```json
{
  "usingComponents": {
    "charger-item": "../../components/chargerItem/chargerItem"
  },
  "navigationBarTitleText": "我的收藏"
}
```

### 3.3 组件文件

#### 3.3.1 chargerItem 组件

**功能**：充电桩列表项组件，用于在主页和用户中心展示充电桩信息。

##### chargerItem.js

**核心功能**：
- 接收充电桩数据
- 处理组件渲染

##### chargerItem.wxml

**组件结构**：
- 充电桩名称
- 距离信息
- 状态信息（空闲/总数）
- 校区和运营商信息

##### chargerItem.wxss

**样式设计**：
- 卡片式设计
- 状态颜色区分（空闲数绿色，总数灰色）

##### chargerItem.json

**组件配置**：
```json
{
  "component": true
}
```

#### 3.3.2 search 组件

**功能**：搜索组件，用于在主页搜索充电桩。

##### search.js

**核心功能**：
- 处理搜索输入
- 触发搜索事件

##### search.wxml

**组件结构**：
- 搜索输入框
- 搜索按钮

##### search.wxss

**样式设计**：
- 圆角输入框
- 现代化的搜索图标

##### search.json

**组件配置**：
```json
{
  "component": true
}
```

## 4. 核心功能实现

### 4.1 智能排序算法

**实现文件**：`pages/index/index.js:57-95`，`pages/user/user.js:59-94`

**算法逻辑**：
1. 按距离分组（每500米一组）
2. 每组内按空闲充电桩数量排序
3. 无空闲充电桩的排在最后

```javascript
const BASE_DIST = 500; // 500米为一组

// 按距离分组
for (let u of stations) {
  for (let i = divided_stations.length; i <= u.dist / BASE_DIST; i++)
    divided_stations.push([]);
  if (u.free) divided_stations[parseInt(u.dist / BASE_DIST)].push(u);
  else zero.push(u);
}

// 组内按空闲数排序
for (let u of divided_stations) {
  u.sort((a, b) => b.free - a.free);
  // ...
}
```

### 4.2 坐标转换

**实现文件**：`pages/index/index.js:42-54`

**功能**：将百度坐标（BD09）转换为国测局坐标（GCJ02），因为微信小程序地图使用GCJ02坐标，而后端返回BD09坐标。

```javascript
bd09ToGcj02(bd_lon, bd_lat) {
  const X_PI = (Math.PI * 3000.0) / 180.0;
  const x = bd_lon - 0.0065;
  const y = bd_lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
  
  const gcj_lon = z * Math.cos(theta);
  const gcj_lat = z * Math.sin(theta);
  
  return [gcj_lon, gcj_lat];
}
```

### 4.3 距离计算

**实现文件**：`pages/index/index.js:22-40`

**功能**：使用Haversine公式计算两个经纬度之间的距离。

```javascript
calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径(米)
  const toRad = (d) => d * Math.PI / 180;
  
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  
  // Haversine公式计算
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}
```

### 4.4 收藏功能

**实现文件**：`pages/detail/detail.js:67-114`

**功能**：管理充电桩收藏状态，数据存储在全局变量中。

**核心逻辑**：
1. 检查充电桩是否已收藏
2. 收藏/取消收藏
3. 更新全局收藏列表
4. 更新UI状态
5. 提示用户操作结果

### 4.5 筛选功能

**实现文件**：`pages/index/index.js:185-230`

**功能**：根据校区和运营商筛选充电桩。

**筛选逻辑**：
1. 获取选中的校区和运营商
2. 更新每个充电桩的`view`属性
3. 重新排序
4. 更新地图标记

## 5. 数据流程

### 5.1 初始化流程

```
小程序启动 → app.js.onLaunch() → 并行调用三个API → 存储到globalData
首页加载 → index.js.onLoad() → transport_data() → 处理数据 → 渲染页面
```

### 5.2 数据传递

```
index.js → go_detail() → URL参数传递 → detail.js.onLoad()
detail.js → toggleFavorite() → 更新globalData → user.js.onShow() → 刷新列表
```

### 5.3 收藏数据管理

```
detail.js.toggleFavorite() → 更新app.globalData.likeStations
user.js.loadFavoriteStations() → 从globalData读取数据
index.js → 渲染时检查like状态
```

## 6. 开发指南

### 6.1 环境搭建

1. 安装微信开发者工具
2. 克隆项目：`git clone https://github.com/philfan/zjuchargerWx.git`
3. 在微信开发者工具中导入项目
4. 配置AppID（或使用测试号）

### 6.2 代码规范

- 使用ES6+语法
- 采用模块化设计
- 代码缩进：2个空格
- 变量命名：驼峰命名法
- 函数命名：动词+名词形式

### 6.3 调试技巧

1. 使用微信开发者工具的调试器
2. 利用`console.log()`输出关键信息
3. 使用`wx.showToast()`提示用户操作结果
4. 利用微信开发者工具的Network面板查看API请求

### 6.4 新增页面

1. 在`pages`目录下创建新目录
2. 创建四个文件：`.js`, `.json`, `.wxml`, `.wxss`
3. 在`app.json`的`pages`数组中添加新页面路径
4. 配置页面的`usingComponents`（如果使用自定义组件）

### 6.5 新增组件

1. 在`components`目录下创建新目录
2. 创建四个文件：`.js`, `.json`, `.wxml`, `.wxss`
3. 在组件的`.json`中设置`"component": true`
4. 在需要使用组件的页面的`.json`中配置`usingComponents`

## 7. 测试与调试

### 7.1 功能测试

| 功能 | 测试点 | 预期结果 |
|------|--------|----------|
| 定位功能 | 首次进入小程序 | 成功获取用户位置 |
| 充电桩列表 | 加载完成后 | 显示附近充电桩 |
| 智能排序 | 点击排序按钮 | 按智能排序规则重新排列 |
| 筛选功能 | 选择不同校区/运营商 | 显示符合条件的充电桩 |
| 搜索功能 | 输入关键词 | 显示匹配的充电桩 |
| 收藏功能 | 点击收藏按钮 | 成功收藏/取消收藏 |
| 导航功能 | 点击导航按钮 | 打开微信内置导航 |

### 7.2 性能测试

- 页面加载时间：< 2s
- 数据更新时间：< 1s
- 内存占用：< 100MB

## 8. 部署与发布

### 8.1 上传代码

1. 在微信开发者工具中点击「上传」按钮
2. 填写版本号和更新日志
3. 点击「上传」

### 8.2 发布流程

1. 登录微信公众平台
2. 进入「版本管理」
3. 提交审核
4. 审核通过后发布

## 9. 核心API与依赖

### 9.1 微信API

- `wx.getLocation()`: 获取用户位置
- `wx.request()`: 发起网络请求
- `wx.navigateTo()`: 页面跳转
- `wx.switchTab()`: 切换Tab页
- `wx.openLocation()`: 打开地图选择位置
- `wx.showToast()`: 显示提示信息

### 9.2 后端API

- `https://charger.philfan.cn/api/providers`: 获取充电桩服务商列表
- `https://charger.philfan.cn/api/status`: 获取充电桩状态数据

## 10. 未来计划

### 10.1 功能优化

- [ ] 实现充电桩预约功能
- [ ] 添加用户评价系统
- [ ] 支持离线地图
- [ ] 开发Android/iOS原生应用

### 10.2 性能优化

- [ ] 优化数据加载速度
- [ ] 减少内存占用
- [ ] 优化地图渲染性能

### 10.3 代码优化

- [ ] 引入状态管理库
- [ ] 优化组件结构
- [ ] 增加单元测试

## 11. 联系方式

- 项目地址：https://github.com/philfan/zjuchargerWx
- 作者：Phil Fan
- 邮箱：philfan@zju.edu.cn

## 12. 许可证

本项目采用 MIT 许可证

---

**感谢您对ZJU Charger项目的贡献！**
