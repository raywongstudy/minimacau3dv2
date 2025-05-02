// 全局变量，使用唯一命名空间避免冲突
let mapPointSelectedRouteId = null;
let mapPointSelectedRoute = null;
let mapPointMarkersArray = [];
let mapPointPopup = null;
let mapPointRouteSource = null;
let mapPointInitialized = false; // 追踪初始化状态
let mapPointFunctionEnabled = true; // 控制是否启用此功能
let mapPointRouteLayer = null; // 记录添加的路线图层ID

// 导入路线工具函数
// 在HTML中需要在AddMapPoint.js之前引入routeUtils.js
if (typeof window !== 'undefined' && !window.routeUtils) {
    console.warn('routeUtils 未定义，地图点标记功能可能无法正常工作');
}

// 将标记数组设置为window属性，供routeUtils.js使用
if (typeof window !== 'undefined') {
    window.mapPointMarkersArray = mapPointMarkersArray;
}

// 显示地图点标记按钮
window.showMapPointButton = function(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = 'flex';
    }
};

// 设置功能启用状态
window.enableMapPointFeature = function(enabled) {
    mapPointFunctionEnabled = enabled;
    console.log("地图点标记功能状态设置为:", enabled ? "启用" : "禁用");
};

// 自动初始化函数，将在页面加载后自动运行
function autoInitMapPointFeature() {
    console.log("正在自動初始化地圖點標記功能...");
    
    // 確保百分比滑塊的值和顯示是同步的
    const percentageSlider = document.getElementById('map-percentage');
    const percentageValue = document.getElementById('percentage-value');
    
    if (percentageSlider && percentageValue) {
        percentageValue.textContent = percentageSlider.value + '%';
    }
    
    // 等待地图和数据加载完成
    const checkAndInit = () => {
        // 检查是否应该启用此功能
        if (!mapPointFunctionEnabled) {
            console.log("地图点标记功能已禁用，跳过初始化");
            return;
        }
        
        // 检查trafficIds是否已经初始化（表示AddRouteToMap已经运行）
        if (!window.trafficIds || !Array.isArray(window.trafficIds) || window.trafficIds.length === 0) {
            console.log("等待路线加载完成...");
            setTimeout(checkAndInit, 500);
            return;
        }
        
        if (window.map && window.traffic_data) {
            try {
                window.initMapPointFeature(window.map, window.traffic_data);
                // 显示地图点标记按钮
                window.showMapPointButton('add-map-point-button');
                // console.log("地图点标记功能已自动初始化");
            } catch (error) {
                console.error("自动初始化地图点标记功能时出错:", error);
                // 确保按钮显示，即使功能初始化失败
                setTimeout(() => {
                    const mapPointButton = document.getElementById('add-map-point-button');
                    if (mapPointButton && mapPointButton.style.display !== 'flex') {
                        mapPointButton.style.display = 'flex';
                        console.log("强制显示地图点标记按钮");
                    }
                }, 500);
            }
        } else {
            console.log("等待地图和交通数据加载...");
            setTimeout(checkAndInit, 500);
        }
    };
    
    // 等待一段时间后开始检查
    setTimeout(checkAndInit, 1500);
}

// 在地图初始化时调用此函数
function initMapPointFeature(map, traffic_data) {
    // console.log("开始初始化地图点标记功能...");
    
    // 检查功能是否启用
    if (!mapPointFunctionEnabled) {
        // console.log("地图点标记功能已禁用，跳过初始化");
        return;
    }
    
    // 防止重复初始化
    if (mapPointInitialized) {
        // console.log("地图点标记功能已经初始化，跳过");
        return;
    }
    
    // 检查必要的元素是否存在
    if (!map) {
        console.error("初始化失败：地图对象不存在");
        return;
    }
    
    if (!traffic_data || !Array.isArray(traffic_data)) {
        console.error("初始化失败：交通数据不存在或格式不正确");
        return;
    }
    
    // 检查交通数据中是否有足够的信息
    const validRoutes = traffic_data.filter(route => 
        route && 
        route.routeCode && 
        route.direction !== undefined && 
        route.coordinate && 
        Array.isArray(route.coordinate) && 
        route.coordinate.length > 1
    );
    
    if (validRoutes.length === 0) {
        console.error("初始化失败：交通数据中没有有效的路线");
        return;
    }
    
    console.log(`找到 ${validRoutes.length} 条有效路线`);
    
    // 检查trafficIds是否已正确初始化
    if (!window.trafficIds || !Array.isArray(window.trafficIds) || window.trafficIds.length === 0) {
        console.warn("trafficIds未初始化或为空，路线高亮功能可能不可用");
    } else {
        console.log(`trafficIds已初始化，包含 ${window.trafficIds.length} 条路线`);
    }
    
    // 初始化popup
    mapPointPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });
    
    // 设置地图点标记按钮的点击事件
    const mapPointButton = document.getElementById('add-map-point-button');
    const mapPointModal = document.getElementById('map-point-modal');
    const mapPointClose = document.getElementById('map-point-close');
    
    if (!mapPointButton || !mapPointModal) {
        console.error("初始化失败：找不到地图点标记按钮或模态框");
        return;
    }
    
    mapPointButton.addEventListener('click', function() {
        // 显示模态框
        mapPointModal.style.display = 'block';
        // 加载路线数据到选择器
        loadRouteSelector(map, validRoutes); // 使用过滤后的有效路线
        
        // 高亮已选中的路线
        if (mapPointSelectedRouteId) {
            const selectedCard = document.querySelector(`.route-card[data-id="${mapPointSelectedRouteId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
        }
    });
    
    if (mapPointClose) {
        mapPointClose.addEventListener('click', function() {
            mapPointModal.style.display = 'none';
        });
    }
    
    // 关闭模态框的点击事件（点击模态框外部区域关闭）
    window.addEventListener('click', function(event) {
        if (event.target === mapPointModal) {
            mapPointModal.style.display = 'none';
        }
    });
    
    // 添加百分比滑块监听事件
    const percentageSlider = document.getElementById('map-percentage');
    const percentageValue = document.getElementById('percentage-value');
    
    if (percentageSlider && percentageValue) {
        // 初始化時同步顯示值與滑塊值
        percentageValue.textContent = percentageSlider.value + '%';
        
        percentageSlider.addEventListener('input', function() {
            percentageValue.textContent = this.value + '%';
        });
    }
    
    // 添加标记按钮事件
    const addMarkerBtn = document.getElementById('add-marker-btn');
    if (addMarkerBtn) {
        addMarkerBtn.addEventListener('click', function() {
            if (!mapPointSelectedRoute) {
                alert('请先选择一条路线');
                return;
            }
            
            const percentage = parseInt(percentageSlider.value);
            addPercentageMarker(map, percentage);
        });
    }
    
    // 清除标记按钮事件
    const clearMarkersBtn = document.getElementById('clear-markers-btn');
    if (clearMarkersBtn) {
        clearMarkersBtn.addEventListener('click', function() {
            clearAllMarkers(map);
        });
    }
    
    // 显示完整路线按钮事件
    const showAllCoordinatesBtn = document.getElementById('show-all-coords-btn');
    if (showAllCoordinatesBtn) {
        showAllCoordinatesBtn.addEventListener('click', function() {
            if (!mapPointSelectedRoute) {
                alert('請先選擇一條路線');
                return;
            }
            
            showAllRoutePoints(map);
        });
    }
    
    // 添加起始百分比到結束百分比範圍的輸入和按鈕
    const startPercentageInput = document.getElementById('map-start-percentage');
    const endPercentageInput = document.getElementById('map-end-percentage');
    const getPercentageRangeBtn = document.getElementById('get-percentage-range-btn');
    
    if (startPercentageInput && endPercentageInput && getPercentageRangeBtn) {
        getPercentageRangeBtn.addEventListener('click', function() {
            if (!mapPointSelectedRoute) {
                alert('請先選擇一條路線');
                return;
            }
            
            const startPercentage = parseFloat(startPercentageInput.value);
            const endPercentage = parseFloat(endPercentageInput.value);
            
            if (isNaN(startPercentage) || isNaN(endPercentage) || 
                startPercentage < 0 || startPercentage > 100 || 
                endPercentage < 0 || endPercentage > 100 || 
                startPercentage >= endPercentage) {
                alert('請輸入有效的百分比範圍');
                return;
            }
            
            window.routeUtils.showPercentageRangePoints(map, startPercentage, endPercentage);
        });
    }
    
    // 添加百分比增量按钮
    const incrementInput = document.getElementById('map-increment');
    const getIncrementBtn = document.getElementById('get-increment-btn');
    
    if (incrementInput && getIncrementBtn) {
        getIncrementBtn.addEventListener('click', function() {
            if (!mapPointSelectedRoute) {
                alert('請先選擇一條路線');
                return;
            }
            
            const increment = parseFloat(incrementInput.value);
            
            if (isNaN(increment) || increment <= 0 || increment > 50) {
                alert('請輸入有效的百分比增量 (1-50)');
                return;
            }
            
            window.routeUtils.showIncrementPoints(map, increment);
        });
    }
    
    // 初始化GeoJSON数据源
    if (map.loaded()) {
        initializeMapSources(map);
    } else {
        map.on('load', function() {
            initializeMapSources(map);
        });
    }
    
    // 标记为已初始化
    mapPointInitialized = true;
    // console.log("地图点标记功能初始化完成");
}

// 初始化地图数据源和图层
function initializeMapSources(map) {
    try {
        // 检查并添加路线点数据源
        if (!map.getSource('route-points-source')) {
            map.addSource('route-points-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
            
            // console.log("路线点数据源已创建");
            mapPointRouteSource = map.getSource('route-points-source');
        } else {
            mapPointRouteSource = map.getSource('route-points-source');
            console.log("路线点数据源已存在，重复使用");
        }
        
        // 检查并添加独立的路线图层数据源
        if (!map.getSource('mappoint-route-source')) {
            map.addSource('mappoint-route-source', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });
            
            // console.log("地图点标记路线数据源已创建");
        }
    } catch (error) {
        console.error("初始化地图数据源和图层时出错:", error);
    }
}

// 加载路线选择器
function loadRouteSelector(map, traffic_data) {
    const routeSelector = document.getElementById('route-selector');
    if (!routeSelector) {
        console.error("找不到路线选择器元素");
        return;
    }
    
    // 清空现有内容
    routeSelector.innerHTML = '';
    
    if (!traffic_data || traffic_data.length === 0) {
        routeSelector.innerHTML = '<div style="color: white; padding: 10px;">没有可用的路线数据</div>';
        return;
    }
    
    // 为每条路线创建选择卡片
    traffic_data.forEach((route) => {
        try {
            const routeCard = document.createElement('div');
            routeCard.className = 'route-card';
            const routeId = route.routeCode + route.direction;
            routeCard.dataset.id = routeId;
            
            // 检查是否是已选中的路线
            if (mapPointSelectedRouteId === routeId) {
                routeCard.classList.add('selected');
            }
            
            // 获取巴士号码（去掉前导零）
            const busNumber = route.routeCode.replace(/^0+/, '');
            const direction = route.direction === 0 ? "去程" : "回程";
            
            routeCard.innerHTML = `
                <strong>${busNumber}</strong>
                <div>${direction}</div>
            `;
            
            // 添加点击事件
            routeCard.addEventListener('click', function() {
                selectRoute(map, route, this.dataset.id);
            });
            
            routeSelector.appendChild(routeCard);
        } catch (error) {
            console.error("创建路线卡片时出错:", error, route);
        }
    });
    
    console.log(`已加载 ${traffic_data.length} 条路线到选择器`);
}

// 选择路线
function selectRoute(map, route, routeId) {
    if (!route || !routeId) {
        console.error("選擇路線失敗：路線數據或ID不存在");
        return;
    }
    
    console.log(`選擇路線: ${routeId}`, route);
    
    // 更新選中狀態
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.id === routeId) {
            card.classList.add('selected');
        }
    });
    
    // 保存選中的路線
    mapPointSelectedRouteId = routeId;
    mapPointSelectedRoute = route;
    
    // 將選中的路線設置為全局變量，以便routeUtils.js能夠訪問
    window.mapPointSelectedRoute = route;
    
    // 清除所有標記（包括起點和終點標記）
    clearAllMarkersIncludingEndpoints(map);
    
    // 清除之前的路線圖層
    clearRouteLayer(map);
    
    // 檢查路線是否有有效的坐標
    if (!route.coordinate || !Array.isArray(route.coordinate) || route.coordinate.length < 2) {
        console.error("所選路線沒有有效的坐標數據");
        alert("所選路線沒有有效的坐標數據，無法顯示路線。");
        return;
    }
    
    // 在地圖上顯示路線
    displayRouteOnMap(map);
}

// 在地图上显示路线
function displayRouteOnMap(map) {
    if (!mapPointSelectedRoute) {
        console.error("顯示路線失敗：未選擇路線");
        return;
    }
    
    try {
        // 路線坐標
        const coordinates = mapPointSelectedRoute.coordinate;
        
        if (!coordinates || !coordinates.length) {
            console.error("路線沒有坐標點數據");
            return;
        }
        
        console.log(`顯示路線: ${mapPointSelectedRouteId}, 共 ${coordinates.length} 個點`);
        
        // 清除所有標記（包括起點和終點），因為我們將重新創建起點和終點標記
        clearAllMarkersIncludingEndpoints(map);
        
        // 解析坐標點
        const parsedCoordinates = coordinates.map(coord => window.routeUtils.parseCoordinate(coord));
        
        // 記錄第一個和最後一個解析後的坐標點
        console.log("第一個坐標點:", coordinates[0], "=>", parsedCoordinates[0]);
        console.log("最後一個坐標點:", coordinates[coordinates.length-1], "=>", parsedCoordinates[parsedCoordinates.length-1]);
        
        // 驗證坐標點有效性
        if (!window.routeUtils.isValidCoordinate(parsedCoordinates[0]) || !window.routeUtils.isValidCoordinate(parsedCoordinates[parsedCoordinates.length - 1])) {
            console.error("坐標點無效", parsedCoordinates[0], parsedCoordinates[parsedCoordinates.length - 1]);
            return;
        }
        
        // 使用獨立圖層添加路線顯示（避免與AddRouteToMap衝突）
        addRouteLayerToMap(map, parsedCoordinates, mapPointSelectedRoute.line_color || '#ffaa00');
        
        // 添加起點和終點標記
        const startPoint = parsedCoordinates[0];
        const endPoint = parsedCoordinates[parsedCoordinates.length - 1];
        
        // 添加起點標記
        const startMarkerEl = document.createElement('div');
        startMarkerEl.className = 'custom-marker start-marker';
        startMarkerEl.style.width = '15px';
        startMarkerEl.style.height = '15px';
        startMarkerEl.style.borderRadius = '50%';
        startMarkerEl.style.backgroundColor = '#00ff00';
        startMarkerEl.style.border = '2px solid white';
        
        const startMarker = new mapboxgl.Marker(startMarkerEl)
            .setLngLat(startPoint)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>起點 (0%)</strong>'))
            .addTo(map);
        
        // 添加終點標記
        const endMarkerEl = document.createElement('div');
        endMarkerEl.className = 'custom-marker end-marker';
        endMarkerEl.style.width = '15px';
        endMarkerEl.style.height = '15px';
        endMarkerEl.style.borderRadius = '50%';
        endMarkerEl.style.backgroundColor = '#ff0000';
        endMarkerEl.style.border = '2px solid white';
        
        const endMarker = new mapboxgl.Marker(endMarkerEl)
            .setLngLat(endPoint)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>終點 (100%)</strong>'))
            .addTo(map);
        
        // 將標記添加到數組中
        mapPointMarkersArray.push(startMarker, endMarker);
        
        // 同步更新window對象上的數組
        window.mapPointMarkersArray = mapPointMarkersArray;
        
        // 設置地圖視圖以顯示整個路線
        const bounds = new mapboxgl.LngLatBounds();
        parsedCoordinates.forEach(coord => {
            if (window.routeUtils.isValidCoordinate(coord)) {
                bounds.extend(coord);
            }
        });
        
        map.fitBounds(bounds, {
            padding: 50
        });
        
        // 顯示默認位置標記
        const percentageSlider = document.getElementById('map-percentage');
        if (percentageSlider) {
            const defaultPercentage = parseInt(percentageSlider.value);
            addPercentageMarker(map, defaultPercentage);
        }
    } catch (error) {
        console.error("顯示路線時出錯:", error);
    }
}

// 添加路线图层到地图（使用独立图层）
function addRouteLayerToMap(map, coordinates, color) {
    try {
        // 移除現有的路線圖層（如果存在）
        if (mapPointRouteLayer && map.getLayer(mapPointRouteLayer)) {
            map.removeLayer(mapPointRouteLayer);
        }
        
        // 檢查mappoint-route-source是否存在，如果不存在則創建
        if (!map.getSource('mappoint-route-source')) {
            map.addSource('mappoint-route-source', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });
            console.log("已創建mappoint-route-source數據源");
        }
        
        // 更新路線數據源
        map.getSource('mappoint-route-source').setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        });
        
        // 生成唯一的圖層ID
        const layerId = 'mappoint-route-layer-' + Date.now();
        
        // 添加新圖層
        map.addLayer({
            id: layerId,
            type: 'line',
            source: 'mappoint-route-source',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': color,
                'line-width': 8,
                'line-opacity': 1
            }
        });
        
        // 保存圖層ID
        mapPointRouteLayer = layerId;
        console.log(`已添加路線圖層: ${layerId}`);
        
        return layerId;
    } catch (error) {
        console.error("添加路線圖層時出錯:", error);
        return null;
    }
}

// 添加百分比位置标记
function addPercentageMarker(map, percentage) {
    if (!mapPointSelectedRoute) {
        console.error("添加標記失敗：未選擇路線");
        return;
    }
    
    try {
        // 路線坐標
        const coordinates = mapPointSelectedRoute.coordinate;
        
        if (!coordinates || !coordinates.length) {
            console.error("路線沒有坐標點數據");
            return;
        }
        
        console.log(`在 ${percentage}% 位置添加標記`);
        
        // 計算百分比位置的點
        const point = window.routeUtils.getPointAtPercentage(coordinates, percentage);
        
        // 驗證點的有效性
        if (!window.routeUtils.isValidCoordinate(point)) {
            console.error("計算的百分比位置點無效", point);
            return;
        }
        
        console.log(`計算的百分比位置點: ${percentage}% => [${point[0]}, ${point[1]}]`);
        
        // 創建標記元素
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker percentage-marker';
        markerEl.style.width = '14px';
        markerEl.style.height = '14px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#ff0022';
        markerEl.style.border = '2px solid white';
        
        // 創建Mapbox標記
        const marker = new mapboxgl.Marker(markerEl)
            .setLngLat(point)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <strong>${percentage}% 位置</strong><br>
                坐標: [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]
            `))
            .addTo(map);
        
        // 將標記添加到數組中
        mapPointMarkersArray.push(marker);
        
        // 同步更新window對象上的數組
        window.mapPointMarkersArray = mapPointMarkersArray;
        
        // 移動地圖到標記位置
        map.flyTo({
            center: point,
            zoom: 16
        });
        
        // 顯示標記的彈窗
        setTimeout(() => {
            marker.togglePopup();
        }, 500);
        
        return marker;
    } catch (error) {
        console.error("添加百分比標記時出錯:", error);
        return null;
    }
}

// 清除所有标记（包括起点和终点标记）
function clearAllMarkersIncludingEndpoints(map) {
    console.log("清除所有標記（包括起點和終點標記）");
    
    // 移除所有標記
    mapPointMarkersArray.forEach(marker => {
        try {
            marker.remove();
        } catch (error) {
            console.error("移除標記時出錯:", error);
        }
    });
    
    // 清空標記數組
    mapPointMarkersArray = [];
    
    // 同步更新window對象上的數組
    window.mapPointMarkersArray = mapPointMarkersArray;
    
    // 清除路線點圖層和相關事件
    if (map && map.getLayer('route-points-layer')) {
        try {
            // 移除事件監聽器
            map.off('click', 'route-points-layer');
            map.off('mouseenter', 'route-points-layer');
            map.off('mouseleave', 'route-points-layer');
            
            // 移除圖層
            map.removeLayer('route-points-layer');
            console.log("已移除路線點圖層和相關事件");
        } catch (error) {
            console.error("移除路線點圖層時出錯:", error);
        }
    }
    
    // 清除路線點數據源
    if (map && mapPointRouteSource) {
        try {
            mapPointRouteSource.setData({
                type: 'FeatureCollection',
                features: []
            });
        } catch (error) {
            console.error("清除路線點圖層時出錯:", error);
        }
    }
}

// 新增函數：清除路線圖層（當確實需要清除路線時使用）
function clearRouteLayer(map) {
    // 移除路線圖層
    if (map && mapPointRouteLayer && map.getLayer(mapPointRouteLayer)) {
        try {
            map.removeLayer(mapPointRouteLayer);
            mapPointRouteLayer = null;
            console.log("已移除路線圖層");
        } catch (error) {
            console.error("移除路線圖層時出錯:", error);
        }
    }
}

// 顯示路線的所有點
function showAllRoutePoints(map) {
    if (!mapPointSelectedRoute || !mapPointRouteSource) {
        console.error("顯示所有點失敗：未選擇路線或數據源不存在");
        return;
    }
    
    try {
        const coordinates = mapPointSelectedRoute.coordinate;
        
        if (!coordinates || !coordinates.length) {
            console.error("路線沒有坐標點數據");
            return;
        }
        
        console.log(`顯示路線 ${mapPointSelectedRouteId} 的所有 ${coordinates.length} 個點`);
        
        // 只清除標記，保留路線
        clearAllMarkers(map);
        
        // 解析所有坐标点
        const parsedCoordinates = coordinates.map(coord => window.routeUtils.parseCoordinate(coord));
        
        // 创建GeoJSON特征集合
        const features = parsedCoordinates.map((coord, index) => {
            // 跳过无效的坐标点
            if (!window.routeUtils.isValidCoordinate(coord)) {
                console.warn(`跳过无效的坐标点 ${index}:`, coord);
                return null;
            }
            
            return {
                type: 'Feature',
                properties: {
                    index: index,
                    description: `点 ${index + 1}`,
                    position: `${(index / (coordinates.length - 1) * 100).toFixed(1)}%`
                },
                geometry: {
                    type: 'Point',
                    coordinates: coord
                }
            };
        }).filter(feature => feature !== null); // 过滤掉null值
        
        // 更新数据源
        mapPointRouteSource.setData({
            type: 'FeatureCollection',
            features: features
        });
        
        // 移除现有图层
        if (map.getLayer('route-points-layer')) {
            map.removeLayer('route-points-layer');
        }
        
        // 添加新的点图层，增强样式
        map.addLayer({
            id: 'route-points-layer',
            type: 'circle',
            source: 'route-points-source',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 3,  // 缩小时点变小
                    16, 6  // 放大时点变大
                ],
                'circle-color': '#ffa500',  // 橙色
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
            }
        });
        
        // 添加点击事件
        map.on('click', 'route-points-layer', function(e) {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const coordinates = feature.geometry.coordinates.slice();
                const description = `
                    <strong>坐标点 #${feature.properties.index + 1}</strong><br>
                    位置: ${feature.properties.position}<br>
                    坐标: [${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}]
                `;
                
                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map);
            }
        });
        
        // 添加鼠标悬停效果
        map.on('mouseenter', 'route-points-layer', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'route-points-layer', function() {
            map.getCanvas().style.cursor = '';
        });
        
        // 设置地图视图以显示所有点
        const bounds = new mapboxgl.LngLatBounds();
        parsedCoordinates.forEach(coord => {
            if (window.routeUtils.isValidCoordinate(coord)) {
                bounds.extend(coord);
            }
        });
        
        map.fitBounds(bounds, {
            padding: 50
        });
        
        // 延迟添加效果，确保首先捕获用户注意力
        setTimeout(() => {
            // 添加动画效果
            if (map.getLayer('route-points-layer')) {
                map.setPaintProperty('route-points-layer', 'circle-opacity', 0.9);
            }
        }, 300);
        
        console.log("已显示所有路线点");
    } catch (error) {
        console.error("显示所有路线点时出错:", error);
    }
}

// 清除除了起点和终点以外的所有标记
function clearAllMarkers(map) {
    console.log("清除除了起點和終點以外的所有標記");
    
    // 移除除了起點和終點以外的所有標記
    mapPointMarkersArray = mapPointMarkersArray.filter(marker => {
        const el = marker.getElement();
        if (!el.classList.contains('start-marker') && !el.classList.contains('end-marker')) {
            try {
                marker.remove();
                return false;
            } catch (error) {
                console.error("移除標記時出錯:", error);
                return true;
            }
        }
        return true;
    });
    
    // 同步更新window對象上的數組
    window.mapPointMarkersArray = mapPointMarkersArray;
    
    // 清除路線點圖層和相關事件
    if (map && map.getLayer('route-points-layer')) {
        try {
            // 移除事件監聽器
            map.off('click', 'route-points-layer');
            map.off('mouseenter', 'route-points-layer');
            map.off('mouseleave', 'route-points-layer');
            
            // 移除圖層
            map.removeLayer('route-points-layer');
            console.log("已移除路線點圖層和相關事件");
        } catch (error) {
            console.error("移除路線點圖層時出錯:", error);
        }
    }
    
    // 清除路線點數據源
    if (map && mapPointRouteSource) {
        try {
            mapPointRouteSource.setData({
                type: 'FeatureCollection',
                features: []
            });
        } catch (error) {
            console.error("清除路線點圖層時出錯:", error);
        }
    }
}

// 确保函数在全局作用域可用
if (typeof window !== 'undefined') {
    window.initMapPointFeature = initMapPointFeature;
    window.showMapPointButton = window.showMapPointButton || function(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = 'flex';
        }
    };
    
    // 导出clearAllMarkers和clearAllMarkersIncludingEndpoints函数以供routeUtils.js使用
    window.clearAllMarkers = clearAllMarkers;
    window.clearAllMarkersIncludingEndpoints = clearAllMarkersIncludingEndpoints;
    
    // 当文档加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 初始化滑塊顯示值
            const percentageSlider = document.getElementById('map-percentage');
            const percentageValue = document.getElementById('percentage-value');
            
            if (percentageSlider && percentageValue) {
                percentageValue.textContent = percentageSlider.value + '%';
            }
            
            // 自動初始化地圖點標記功能
            autoInitMapPointFeature();
        });
    } else {
        // 如果文档已加载完成，立即执行初始化
        setTimeout(function() {
            // 初始化滑塊顯示值
            const percentageSlider = document.getElementById('map-percentage');
            const percentageValue = document.getElementById('percentage-value');
            
            if (percentageSlider && percentageValue) {
                percentageValue.textContent = percentageSlider.value + '%';
            }
            
            // 自動初始化地圖點標記功能
            autoInitMapPointFeature();
        }, 0);
    }
    
    // 添加一个检测函数，用于判断是否应该运行MapPoint功能
    // 这个函数会检查AddRouteToMap是否已经执行，通过检查window.trafficIds是否存在
    window.checkAndEnableMapPointFeature = function() {
        // 检查trafficIds是否已经初始化（表示AddRouteToMap已经运行）
        const isRouteMapInitialized = window.trafficIds && Array.isArray(window.trafficIds) && window.trafficIds.length > 0;
        
        // 自动设置功能启用状态
        window.enableMapPointFeature(isRouteMapInitialized);
        
        return isRouteMapInitialized;
    };
    
    // 在页面加载后延迟检查
    setTimeout(() => {
        window.checkAndEnableMapPointFeature();
    }, 2000);
    
    console.log("地图点标记功能已加载，等待自动初始化...");
} 