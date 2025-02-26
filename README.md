# minimacau3d

澳門3D巴士實時追蹤系統

## 功能特點

- 3D 巴士即時位置追蹤
- 實時交通攝像頭畫面
- 巴士站點信息顯示
- 路線規劃功能
- 歷史數據回放

## 快速開始

1. 克隆倉庫:
```bash
git clone https://github.com/raywongstudy/minimacau3dv2.git
```

```
minimacau3d/
├── data/ # 數據文件
│ ├── bus_coordinates.js
│ ├── station_coordinates.js
│ └── route_info_data.js
├── script/ # JavaScript 文件
│ ├── AddBusInMap.js # 巴士追蹤核心邏輯
│ ├── AddCameraData.js
│ └── AddStationInfo.js
├── style.css # 樣式文件
└── index.html # 主頁面
```

## API 文檔

### 巴士數據 API
- 實時數據: `https://api.minimacau3d.com/bus_location_coordinates.json`
- 測試數據: `https://api.minimacau3d.com/bus_location_coordinates_test.json`

### 主要函數

`AddBusInMap(map, filter_bus_lists, api_url)`
- map: Mapbox 地圖實例
- filter_bus_lists: 需要顯示的巴士路線列表
- api_url: 巴士數據 API 地址

# FAQ
1. `<script type="module">` 問題

在 index.html 的 `<script type="module">` 中:
- 我们将 map 设置为全局变量 (`window.map`)
- 但在同一个模块作用域内,我们仍然可以直接使用 map 变量,因为它在当前作用域中是可见的

在其他文件(如 AddCameraData.js、AddStationInfo.js 等)中:
- map 是作为函数参数传入的
- 这些函数接收的是对同一个地图实例的引用
- 不需要通过 window.map 来访问

## 貢獻指南

歡迎提交 Pull Requests 和 Issues。請確保:
1. 代碼符合項目規範
2. 添加適當的測試
3. 更新相關文檔

## 聯繫方式

如有問題請通過 Issues 聯繫我們

# FAQ
1. `<script type="module">` 問題

在 index.html 的 `<script type="module">` 中:
- 我们将 map 设置为全局变量 (`window.map`)
- 但在同一个模块作用域内,我们仍然可以直接使用 map 变量,因为它在当前作用域中是可见的

在其他文件(如 AddCameraData.js、AddStationInfo.js 等)中:
- map 是作为函数参数传入的
- 这些函数接收的是对同一个地图实例的引用
- 不需要通过 window.map 来访问



AddBusInMap.js 文件
1. 主程序入口 (AddBusInMap)
   - 获取巴士API数据
   - 根据 filter_bus_lists 过滤巴士数据
   - 循环创建每条路线的自定义图层
   - 设置定时器每5秒更新巴士位置

2. 创建自定义图层 (GenAllCustomLayer)
   - 设置图层基本参数（大小、颜色等）
   - 生成模型变换矩阵
   - 创建自定义图层对象，包含：
     * onAdd: 初始化3D场景和渲染器
     * render: 渲染3D场景
     * updateBusPositions: 更新巴士位置的方法

3. 巴士位置更新流程
   3.1 handleBusPositionUpdates
       - 解析图层ID获取路线和方向信息
       - 过滤当前图层相关的巴士数据
       - 调用 updateLayerCubes 更新巴士

   3.2 updateLayerCubes
       - 验证巴士数据有效性
       - 准备需要更新的巴士列表
       - 调用 updateBusesInLayer 处理更新

   3.3 updateBusesInLayer
       - 遍历每个巴士数据
       - 对每组巴士调用 updateBusGroup
       - 最后清理不再活跃的巴士

   3.4 updateBusGroup
       - 遍历每个巴士信息
       - 调用 updateOrAddCube 更新或添加巴士

4. 巴士位置动画更新 (renderUpdateCubePosition)
   - 检查是否需要更新位置
   - 根据动画步骤更新位置
   - 计算并更新巴士朝向
   - 处理动画完成后的状态

5. 辅助功能
   - TransformUtils: 3D变换相关工具
     * calculateCameraMatrix: 计算相机投影矩阵
     * setCubeOrientation: 设置巴士朝向
   - calculateDistanceInDirection: 计算坐标转换
   - filterCurrentBusData: 过滤巴士数据