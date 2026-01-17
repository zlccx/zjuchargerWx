# ZJU Charger

ZJU Charger 是一个专为浙江大学师生设计的充电桩查询微信小程序，帮助用户快速找到附近可用的充电桩。

## 功能特点

### 🔍 智能充电桩查询
- **实时定位**：自动获取用户当前位置
- **多维度排序**：支持智能排序、按距离排序、按空位排序
- **地图标记**：在地图上直观显示充电桩位置
- **距离计算**：准确计算用户与充电桩的距离

### 📱 用户友好界面
- **简洁美观**：现代化的界面设计
- **响应式布局**：适配不同屏幕尺寸
- **直观操作**：一键切换排序方式

### 🚀 技术特色
- **异步数据处理**：使用 Promise 优化数据加载
- **坐标转换**：支持百度坐标（BD09）到国测局坐标（GCJ02）的转换
- **智能算法**：基于距离和空闲状态的综合排序

## 技术栈

- **前端**：微信小程序原生框架
- **后端**：RESTful API（https://charger.philfan.cn/api）
- **地图**：微信小程序地图组件
- **数据处理**：JavaScript

## 项目结构

```
zjucharger/
├── imgs/                # 图片资源
│   ├── home_page.png
│   ├── home_page_selected.png
│   ├── personal_page.png
│   └── personal_page_selected.png
├── pages/               # 页面文件
│   ├── index/           # 主页
│   │   ├── index.js     # 主页逻辑
│   │   ├── index.json   # 主页配置
│   │   ├── index.wxml   # 主页布局
│   │   └── index.wxss   # 主页样式
│   ├── logs/            # 日志页面
│   │   ├── logs.js
│   │   └── logs.wxml
│   └── user/            # 用户页面
│       ├── user.js
│       ├── user.json
│       ├── user.wxml
│       └── user.wxss
├── utils/               # 工具类
│   └── util.js
├── .gitignore           # Git忽略文件
├── app.js               # 小程序入口
├── app.json             # 小程序配置
├── app.wxss             # 全局样式
├── readme.md            # 项目说明
└── sitemap.json         # 站点地图
```

## 核心功能实现

### 1. 位置获取

通过微信小程序的 `wx.getLocation` API 获取用户当前位置，用于计算与充电桩的距离。

### 2. 数据获取

从后端 API 获取充电桩服务商列表和充电桩状态数据：
- **充电桩服务商**：`https://charger.philfan.cn/api/providers`
- **充电桩状态**：`https://charger.philfan.cn/api/status`

### 3. 智能排序

实现了三种排序方式：
- **智能排序**：按距离分组，每组内按空闲充电桩数量排序
- **按距离排序**：从近到远排序
- **按空位排序**：按空闲充电桩数量从多到少排序

### 4. 坐标转换

由于后端返回的是百度坐标（BD09），而微信小程序使用的是国测局坐标（GCJ02），因此实现了坐标转换功能。

### 5. 距离计算

使用 Haversine 公式计算两个经纬度之间的距离，确保距离计算的准确性。

## 安装与使用

### 前置条件

- 安装微信开发者工具
- 拥有微信小程序开发账号

### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/yourusername/zjucharger.git
   ```

2. **打开项目**

   - 打开微信开发者工具
   - 选择「导入项目」
   - 选择项目目录
   - 填写 AppID（如果没有，可以使用测试号）

3. **运行项目**

   - 点击「编译」按钮
   - 使用微信扫码预览

## 如何上传到 GitHub

### 1. 初始化 Git 仓库（如果尚未初始化）

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
```

### 2. 在 GitHub 上创建新仓库

- 登录 GitHub
- 点击右上角的「+」按钮，选择「New repository」
- 填写仓库名称（例如：zjucharger）
- 选择公开或私有
- 点击「Create repository」

### 3. 关联本地仓库与 GitHub 仓库

```bash
# 替换为你的 GitHub 仓库地址
git remote add origin https://github.com/yourusername/zjucharger.git
```

### 4. 推送代码到 GitHub

```bash
git push -u origin master
```

### 5. 后续更新

每次修改代码后，执行以下命令推送更新：

```bash
git add .
git commit -m "更新说明"
git push
```

## 注意事项

- 本项目需要用户授权位置权限
- 充电桩数据来源于后端 API，需要网络连接
- 坐标转换和距离计算可能存在一定误差

## 未来计划

- [ ] 增加充电桩详情页面
- [ ] 实现充电桩预约功能
- [ ] 添加用户评价系统
- [ ] 支持离线地图
- [ ] 开发 Android/iOS 原生应用

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 LICENSE 文件

## 联系方式

- 项目地址：https://github.com/yourusername/zjucharger
- 作者：Your Name
- 邮箱：your.email@example.com

---

**如果这个项目对你有帮助，请给它一个 ⭐ 吧！**