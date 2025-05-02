// routeBus.js - 在 Mapbox 地圖上顯示單一巴士的功能
// 簡化自 AddBusInMap.js

// 全局變數，存儲當前活動的巴士圖層
window.activeBusLayers = window.activeBusLayers || []; // 確保全局訪問
let busVisible = true; // 記錄巴士的可見性狀態

/**
 * 創建巴士材質
 * @param {number} direction - 方向代碼 (0 或 1)
 * @param {Array} colors - 顏色陣列 [主色, 輔色, 輔色2]
 * @returns {Array} 材質陣列
 */
function createBusMaterial(direction, colors = [0xFFFFFF, 0xA7C7E7, 0xA7C7E7]) {
    // 使用更明顯的顏色
    const frontColor = 0xFF0000; // 紅色
    
    // 創建單一材質，不再使用材質陣列
    return new THREE.MeshBasicMaterial({ 
        color: frontColor, 
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
    });
}

/**
 * 創建巴士網格
 * @param {number} sizeX - X方向尺寸
 * @param {number} sizeY - Y方向尺寸
 * @param {number} sizeZ - Z方向尺寸
 * @param {number} scaleSize - 縮放比例
 * @param {Array} material - 材質陣列
 * @param {string} routeId - 路線ID（可選）
 * @param {number} direction - 方向（可選）
 * @returns {THREE.Mesh} 巴士網格
 */
function createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material, routeId = '', direction = 0) {
    // 創建一個非常簡單的幾何體 - 使用較少的面
    const geometry = new THREE.BoxGeometry(3, 2, 2);
    
    // 使用簡單的材質
    const simpleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000, 
        transparent: true,
        opacity: 0.8
    });
    
    // 創建網格
    const mesh = new THREE.Mesh(geometry, simpleMaterial);
    
    // 增加縮放
    const largerScale = 1;
    mesh.scale.set(largerScale, largerScale, largerScale);
    
    // 添加名稱屬性
    mesh.name = `bus_${routeId}_${direction}`;
    console.log(`創建巴士網格 - 名稱: ${mesh.name}, 縮放: ${largerScale}`);
    
    return mesh;
}

/**
 * 生成模型轉換矩陣 - 優化版本
 * @param {number} lng - 經度
 * @param {number} lat - 緯度
 * @param {number} height - 高度（米）
 * @param {number} rotateX - X軸旋轉角度
 * @param {number} rotateY - Y軸旋轉角度
 * @param {number} rotateZ - Z軸旋轉角度
 * @returns {Object} 轉換矩陣對象
 */
function GenModelTransform(lng, lat, height = 0, rotateX = 0, rotateY = 0, rotateZ = 0) {
    console.log(`生成模型轉換 - 經度: ${lng}, 緯度: ${lat}, 高度: ${height}米`);
    
    // 確保輸入的經緯度是有效的數值
    if (isNaN(lng) || isNaN(lat)) {
        console.error('無效的經緯度:', lng, lat);
        lng = lng || 0;
        lat = lat || 0;
    }
    
    try {
        // 重要：將高度設為0或非常低的值，確保巴士貼地
        const actualHeight = 0; // 強制設為0，讓巴士貼在地面上
        
        // 使用Mapbox的MercatorCoordinate轉換經緯度到墨卡托投影坐標
        const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
            [lng, lat], 
            actualHeight
        );
        
        // 計算模型縮放比例 - 使用墨卡托坐標單位轉換為實際米數
        // 使用適當的縮放以確保模型可見
        const modelScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 60; 
        
        console.log(`墨卡托坐標 - X: ${modelAsMercatorCoordinate.x.toFixed(8)}, Y: ${modelAsMercatorCoordinate.y.toFixed(8)}, Z: ${modelAsMercatorCoordinate.z.toFixed(8)}, 縮放: ${modelScale.toFixed(8)}`);
        
        // 組合轉換矩陣
        return {
            translateX: modelAsMercatorCoordinate.x,
            translateY: modelAsMercatorCoordinate.y,
            translateZ: modelAsMercatorCoordinate.z,
            rotateX: rotateX,
            rotateY: rotateY, 
            rotateZ: rotateZ,
            scale: modelScale,
            // 記錄原始經緯度，方便後續使用
            originalLngLat: [lng, lat],
            height: actualHeight
        };
    } catch (error) {
        console.error('生成模型轉換時出錯:', error);
        // 返回默認轉換
        return {
            translateX: 0,
            translateY: 0,
            translateZ: 0,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            scale: 1,
            originalLngLat: [lng, lat],
            height: 0
        };
    }
}

/**
 * 計算相機矩陣 - 優化版本
 * @param {Array} matrix - 投影矩陣
 * @param {Object} modelTransform - 模型轉換參數
 * @returns {THREE.Matrix4} 相機投影矩陣
 */
function calculateCameraMatrix(matrix, modelTransform) {
    try {
        // 創建基本矩陣
        const m = new THREE.Matrix4().fromArray(matrix);
        
        // 創建平移矩陣
        const l = new THREE.Matrix4().makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ
        );
        
        // 創建縮放矩陣 - 注意Y軸反向
        const s = new THREE.Matrix4().makeScale(
            modelTransform.scale,
            -modelTransform.scale, // Y軸反向
            modelTransform.scale
        );
        
        // 創建X軸旋轉矩陣
        const rx = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
        );
        
        // 創建Y軸旋轉矩陣
        const ry = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
        );
        
        // 創建Z軸旋轉矩陣
        const rz = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
        );
        
        // 組合旋轉矩陣
        const rotationMatrix = new THREE.Matrix4()
            .multiplyMatrices(rx, ry)
            .multiply(rz);
        
        // 組合最終變換矩陣: 平移 * 旋轉 * 縮放
        const transformMatrix = new THREE.Matrix4()
            .multiplyMatrices(l, rotationMatrix)
            .multiply(s);
        
        // 組合最終相機投影矩陣
        return new THREE.Matrix4().multiplyMatrices(m, transformMatrix);
    } catch (error) {
        console.error('計算相機矩陣時出錯:', error);
        return new THREE.Matrix4().identity(); // 返回單位矩陣作為回退
    }
}

/**
 * 設置巴士朝向
 * @param {THREE.Mesh} cube - 巴士網格
 * @param {Object} prevPosition - 前一個位置 {x, y}
 * @param {Object} newPosition - 新位置 {x, y}
 */
function setCubeOrientation(cube, prevPosition, newPosition) {
    // 計算方向向量
    const dx = newPosition.x - prevPosition.x;
    const dy = newPosition.y - prevPosition.y;
    
    // 如果移動距離太小，不改變朝向
    if (Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001) {
        return;
    }
    
    // 計算朝向角度（弧度）
    const angle = Math.atan2(dy, dx);
    
    // 設置巴士的旋轉（繞Z軸）
    cube.rotation.z = angle;
}

/**
 * 創建單一巴士圖層
 * @param {Object} map - Mapbox地圖實例
 * @param {number} longitude - 經度
 * @param {number} latitude - 緯度
 * @param {Object} options - 配置選項
 * @returns {Object} 自定義圖層
 */
function CreateSingleBusLayer(map, longitude, latitude, options = {}) {
    // 解構配置選項，設置默認值
    const {
        sizeX = 6,
        sizeY = 4,
        sizeZ = 4,
        color = [0xFFFFFF, 0xA7C7E7, 0xA7C7E7],
        scaleSize = 5,
        direction = 0,
        routeId = 'demo',
        height = 0, // 設置默認高度為0，確保巴士貼地
        initialRotation = 0,
        rotateX = 0,
        rotateY = Math.PI,
        rotateZ = Math.PI
    } = options;

    console.log(`創建巴士圖層 - 經度: ${longitude}, 緯度: ${latitude}, 高度: ${height}, 初始旋轉: ${initialRotation}, 方向: ${direction}`);

    // 生成模型轉換矩陣
    const modelTransform = GenModelTransform(longitude, latitude, height, rotateX, rotateY, rotateZ);

    // 生成唯一ID，避免衝突
    const layerId = `single_bus_layer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 定義自定義圖層
    const customLayer = {
        id: layerId,
        type: 'custom',
        renderingMode: '3d',
        visible: busVisible, 
        longitude: longitude,
        latitude: latitude,
        height: height,
        // 存儲模型轉換矩陣供後續使用
        modelTransform: modelTransform,
        onAdd: function(map, gl) {
            console.log(`巴士圖層 onAdd 被調用 - 經度: ${this.longitude}, 緯度: ${this.latitude}`);
            
            // 初始化相機
            this.camera = new THREE.Camera();
            
            // 初始化場景
            this.scene = new THREE.Scene();
            
            try {
                // 創建一個簡潔的巴士標記
                // 1. 基本容器 - 使用Group管理所有物體
                const busGroup = new THREE.Group();
                busGroup.name = `bus_group_${routeId}`;
                this.scene.add(busGroup);
                
                // 2. 主體 - 簡潔的巴士形狀（長方體）
                const bodyGeometry = new THREE.BoxGeometry(8, 4, 4); // 增加高度到2.5
                const bodyMaterial = new THREE.MeshBasicMaterial({
                    color: color[0] || 0xFF0000,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
                const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
                bodyMesh.name = `bus_body_${routeId}`;
                // 調整位置使底部接觸地面，同時讓更多部分可見
                bodyMesh.position.z = 0; // 不下移，讓整個巴士可見
                busGroup.add(bodyMesh);
                
                // 設置旋轉 - 應用initialRotation
                busGroup.rotation.z = initialRotation;
                
                // 根據方向設置額外的旋轉
                if (direction === 1) {
                    // 如果是回程方向，旋轉180度
                    busGroup.rotation.y = Math.PI;
                }
                
                // 應用適合的縮放值，確保巴士能看到但不過大
                const baseScale = 0.015; // 稍微增加縮放值
                busGroup.scale.set(baseScale, baseScale, baseScale);
                
                // 不再使用position.z調整高度，而是依賴MercatorCoordinate設置的高度
                
                // 保存基本縮放值到userData中，供後續使用
                busGroup.userData = {
                    baseScale: baseScale,
                    routeId: routeId,
                    direction: direction,
                    fixedScale: true
                };
                
                // 儲存參考
                this.busGroup = busGroup;
                this.cube = bodyMesh; // 兼容現有代碼
                
                console.log(`創建了簡潔巴士標記 - ID: ${busGroup.name}, 旋轉: ${initialRotation}, 方向: ${direction}, 固定縮放: ${baseScale}`);
                
                // 存儲地圖引用
                this.map = map;
                
                // 初始化渲染器 - 使用基本設置但配置合適的參數
                this.renderer = new THREE.WebGLRenderer({
                    canvas: map.getCanvas(),
                    context: gl,
                    antialias: true, // 開啟抗鋸齒
                    alpha: true, // 啟用透明度
                    preserveDrawingBuffer: true // 保留繪圖緩衝區，可能對某些瀏覽器有幫助
                });
                this.renderer.autoClear = false;
                
                // 初始化彈出窗口
                this.popup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });
                
                // 添加標準mapbox標記作為備份
                this.standardMarker = new mapboxgl.Marker({
                    color: "#FF0000",
                    scale: 0.05  // 進一步縮小標準標記大小
                })
                .setLngLat([longitude, latitude])
                .addTo(map);
                
                // 使用比例尺監聽器來處理zoom事件
                map.on('zoom', this.updateVisibility.bind(this));
                this.updateVisibility();
                
                // 初始化渲染控制屬性
                this.lastRenderComplete = false;
                this.forceUpdate = true;
            } catch (error) {
                console.error('創建巴士標記時出錯:', error);
                // 出錯時創建一個簡單的備用標記
                try {
                    this.standardMarker = new mapboxgl.Marker({
                        color: "#FF0000"
                    })
                    .setLngLat([longitude, latitude])
                    .addTo(map);
                } catch (backupError) {
                    console.error('創建備用標記也失敗:', backupError);
                }
            }
        },
        
        // 更新標記在不同zoom級別的可見性
        updateVisibility: function() {
            if (!this.map) return;
            
            const currentZoom = this.map.getZoom();
            
            // 巴士保持固定大小，不再根據縮放級別調整
            if (this.busGroup && this.busGroup.userData.fixedScale) {
                // 確保巴士保持其固定縮放值
                const baseScale = this.busGroup.userData.baseScale || 0.015;
                
                // 維持固定大小
                this.busGroup.scale.set(baseScale, baseScale, baseScale);
                
                // 標記需要更新一次 - 但不是動畫
                this.forceUpdate = true;
                
                // 調整標準標記的大小為更小的固定值
                if (this.standardMarker) {
                    const markerElement = this.standardMarker.getElement();
                    if (markerElement) {
                        markerElement.style.transform = 'scale(0.15)'; // 保持標記大小
                    }
                }
            }
            
            // 只在非常低的縮放級別時隱藏巴士
            const shouldShowBus = currentZoom > 8;
            if (this.busGroup) {
                this.busGroup.visible = shouldShowBus && this.visible;
            }
            
            // 同步標準標記的可見性
            if (this.standardMarker) {
                const markerElement = this.standardMarker.getElement();
                if (markerElement) {
                    markerElement.style.display = (shouldShowBus && this.visible) ? 'block' : 'none';
                }
            }
        },
        
        render: function(gl, matrix) {
            try {
                if (!this.visible) {
                    // 如果不可見，隱藏所有標記並退出
                    if (this.standardMarker) {
                        this.standardMarker.getElement().style.display = 'none';
                    }
                    return;
                }
                
                // 獲取當前相機的位置和視口資訊
                const currentZoom = this.map.getZoom();
                const currentCenter = this.map.getCenter();
                
                // 計算動態縮放因子 - 遠距離縮小，近距離放大
                const zoomFactor = Math.pow(2, 16 - currentZoom); // 基於縮放級別的指數計算
                
                // 使用存儲的模型轉換矩陣計算投影矩陣
                const cameraMatrix = calculateCameraMatrix(matrix, this.modelTransform);
                this.camera.projectionMatrix.copy(cameraMatrix);
                
                // 重置渲染器狀態
                this.renderer.resetState();
                this.renderer.clear(false, true, false); // 不清除顏色緩衝區，清除深度緩衝區，不清除模板緩衝區
                
                // 渲染場景 - 只渲染一次，不再使用動畫循環
                this.renderer.render(this.scene, this.camera);
                
                // 應用固定大小和位置 (只在需要時調整)
                if (this.busGroup && (!this.lastRenderComplete || this.forceUpdate)) {
                    // 獲取基本縮放值
                    const baseScale = this.busGroup.userData.baseScale || 0.015;
                    
                    // 應用固定大小，不添加任何動畫效果
                    this.busGroup.scale.set(baseScale, baseScale, baseScale);
                    
                    // 標記已完成渲染
                    this.lastRenderComplete = true;
                    this.forceUpdate = false;
                }
            } catch (error) {
                console.error('渲染巴士標記時出錯:', error);
                
                // 確保標準標記可見
                if (this.standardMarker) {
                    this.standardMarker.getElement().style.display = 'block';
                }
            }
        },
        
        // 移除時清理資源
        onRemove: function() {
            if (this.standardMarker) {
                this.standardMarker.remove();
            }
            
            // 移除事件監聽
            if (this.map) {
                this.map.off('zoom', this.updateVisibility);
            }
            
            // 清理THREE資源
            if (this.scene) {
                this.scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
            
            if (this.renderer) {
                this.renderer.dispose();
            }
            
            console.log('巴士標記資源已清理');
        }
    };

    return customLayer;
}

/**
 * 在地圖上添加單一巴士
 * @param {Object} map - Mapbox地圖實例
 * @param {number} longitude - 經度
 * @param {number} latitude - 緯度
 * @param {Object} options - 配置選項
 * @returns {Object} 創建的巴士圖層對象
 */
function AddSingleBus(map, longitude, latitude, options = {}) {
    console.log(`添加巴士 - 經度: ${longitude}, 緯度: ${latitude}`);
    
    // 創建新的巴士圖層
    const busLayer = CreateSingleBusLayer(map, longitude, latitude, options);
    
    // 保持可見性狀態一致
    busLayer.visible = busVisible;
    
    try {
        // 添加圖層到地圖
        map.addLayer(busLayer);
        console.log('巴士圖層成功添加到地圖');
        
        // 確保圖層在所有其他圖層上面
        if (map.getStyle() && map.getStyle().layers) {
            const topLayers = map.getStyle().layers
                .filter(layer => layer.type !== 'custom')
                .map(layer => layer.id);
                
            if (topLayers.length > 0) {
                // 移動圖層到頂部
                map.moveLayer(busLayer.id, topLayers[topLayers.length - 1]);
                console.log('巴士圖層已移動到頂部');
            }
        }
    } catch (error) {
        console.error('添加巴士圖層時出錯:', error);
        return null;
    }
    
    // 更新全局變數 - 將新的巴士圖層添加到陣列中
    window.activeBusLayers.push(busLayer);
    
    return busLayer;
}

/**
 * 在標記點位置添加巴士
 * @param {Object} map - Mapbox地圖實例
 * @param {Array|Object} location - 位置坐標，可以是[lng, lat]數組或{lng, lat}對象
 * @param {Object|string} options - 配置選項或路線ID
 * @returns {Object} 巴士圖層對象
 */
function AddBusAtMarker(map, location, options = {}) {
    try {
        // 支持舊的API格式，即(LatLng, routeID)
        let lng, lat, routeID, configOptions = {};
        
        // 判斷傳入的參數類型並相應地處理
        if (typeof map === 'object' && map.getCanvas) {
            // 新API: (map, location, options)
            if (Array.isArray(location)) {
                // 處理[lng, lat]數組格式
                lng = location[0];
                lat = location[1];
            } else if (location && typeof location.lng !== 'undefined' && typeof location.lat !== 'undefined') {
                // 處理{lng, lat}對象格式
                lng = location.lng;
                lat = location.lat;
            } else {
                console.error('添加巴士標記錯誤: 無效的經緯度坐標格式', location);
                return false;
            }
            
            // 處理選項，可以是字符串(routeID)或對象(完整選項)
            if (typeof options === 'string') {
                routeID = options;
            } else if (typeof options === 'object') {
                routeID = options.routeId || 'unknown';
                configOptions = options;
            }
        } else {
            // 舊API: (LatLng, routeID)
            const LatLng = map;
            if (!LatLng || typeof LatLng.lng === 'undefined' || typeof LatLng.lat === 'undefined') {
                console.error('添加巴士標記錯誤: 無效的經緯度坐標');
                return false;
            }
            lng = LatLng.lng;
            lat = LatLng.lat;
            routeID = location;
            map = window.map; // 使用全局map變量
        }
        
        // 檢查經緯度是否有效
        if (typeof lng === 'undefined' || typeof lat === 'undefined' || isNaN(parseFloat(lng)) || isNaN(parseFloat(lat))) {
            console.error('添加巴士標記錯誤: 無效的經緯度坐標值', lng, lat);
            return false;
        }
        
        // 確保經緯度是數字格式
        lng = parseFloat(lng);
        lat = parseFloat(lat);
        
        // 檢查經緯度範圍是否合理
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            console.warn('經緯度範圍可能有誤，將被調整到有效範圍', lng, lat);
            lng = Math.max(-180, Math.min(180, lng));
            lat = Math.max(-90, Math.min(90, lat));
        }
        
        // 設置巴士標記的高度
        const height = configOptions.height || 0; // 默認高度設為0，確保巴士貼地
        
        console.log(`添加巴士標記: 經度=${lng}, 緯度=${lat}, 高度=${height}米, 路線=${routeID || '未指定'}`);
        
        // 合併默認選項和用戶提供的選項
        const busLayerOptions = {
            routeId: routeID || 'unknown',
            height: height,
            scaleSize: configOptions.scaleSize || 10,
            color: configOptions.color || [0xFF0000, 0x00FF00, 0x0000FF],
            initialRotation: configOptions.initialRotation || 0,
            direction: configOptions.direction || 0
        };
        
        // 添加單個巴士 - 不再移除舊的巴士圖層
        const busLayer = AddSingleBus(map, lng, lat, busLayerOptions);
        
        // 確保返回的是有效的圖層對象
        if (!busLayer) {
            console.error('創建巴士圖層失敗，返回了空值');
            return false;
        }
        
        console.log(`已成功創建巴士圖層，ID: ${busLayer.id}`);
        
        // 確保地圖重繪以顯示新標記
        if (map) {
            map.triggerRepaint();
            console.log('已觸發地圖重繪');
        }
        
        // 返回圖層對象
        return busLayer;
    } catch (error) {
        console.error('添加巴士標記時出現錯誤:', error);
        // 發生錯誤返回false
        return false;
    }
}

/**
 * 切換巴士圖層的可見性
 * @returns {boolean} 切換後的可見性狀態
 */
function toggleBusVisibility() {
    console.log('切換巴士可見性，當前圖層數量:', window.activeBusLayers.length);
    
    if (window.activeBusLayers.length === 0) {
        console.warn('沒有活動的巴士圖層');
        return busVisible;
    }
    
    // 切換可見性狀態
    busVisible = !busVisible;
    
    // 更新所有巴士圖層的可見性
    window.activeBusLayers.forEach(layer => {
        if (layer) {
            layer.visible = busVisible;
            
            // 直接設置場景中所有物體的可見性
            if (layer.scene) {
                layer.scene.traverse(function(object) {
                    if (object.isMesh) {
                        object.visible = busVisible;
                        console.log(`設置網格 ${object.name} 可見性為 ${busVisible}`);
                    }
                });
            }
            
            // 更新標準Mapbox標記的可見性
            if (layer.standardMarker) {
                const markerElement = layer.standardMarker.getElement();
                if (markerElement) {
                    markerElement.style.display = busVisible ? 'block' : 'none';
                }
            }
            
            // 觸發地圖重繪
            if (layer.map) {
                layer.map.triggerRepaint();
            }
        }
    });
    
    console.log(`所有巴士可見性已切換為: ${busVisible ? '顯示' : '隱藏'}`);
    
    return busVisible;
}

/**
 * 移除所有巴士圖層
 * @param {Object} map - Mapbox地圖實例
 */
function removeAllBusLayers(map) {
    if (!map || window.activeBusLayers.length === 0) {
        return;
    }
    
    console.log(`移除所有巴士圖層，數量: ${window.activeBusLayers.length}`);
    
    // 移除所有巴士圖層
    window.activeBusLayers.forEach(layer => {
        if (layer && map.getLayer(layer.id)) {
            try {
                // 先清理資源
                if (typeof layer.onRemove === 'function') {
                    layer.onRemove();
                }
                
                // 再移除圖層
                map.removeLayer(layer.id);
                console.log(`已移除巴士圖層: ${layer.id}`);
                
                // 移除相關資源
                if (map.getSource(layer.id)) {
                    map.removeSource(layer.id);
                }
            } catch (error) {
                console.warn(`移除巴士圖層 ${layer.id} 時出錯:`, error);
            }
        }
    });
    
    // 清空陣列
    window.activeBusLayers = [];
    
    // 觸發地圖重繪
    map.triggerRepaint();
    console.log('已移除所有巴士圖層並觸發地圖重繪');
}

// 導出公共函數
window.AddSingleBus = AddSingleBus;
window.AddBusAtMarker = AddBusAtMarker;
window.toggleBusVisibility = toggleBusVisibility; // 導出切換可見性的函數
window.removeAllBusLayers = removeAllBusLayers; // 導出移除所有巴士圖層的函數 

/**
 * 計算從距離反推經緯度坐標
 * @param {number} yDistance - Y方向距離
 * @param {number} xDistance - X方向距離
 * @param {number} centerLng - 中心點經度
 * @param {number} centerLat - 中心點緯度
 * @returns {Array} [lng, lat] 計算得出的經緯度坐標
 */
function calculateCoordinateFromDistance(yDistance, xDistance, centerLng, centerLat) {
    // 地球半徑 (米)
    const R = 6371000;
    
    // 計算緯度變化 (北正南負)
    const latChange = (yDistance / R) * (180 / Math.PI);
    
    // 計算經度變化 (東正西負) - 需要根據緯度調整
    const lngChange = (xDistance / (R * Math.cos(centerLat * Math.PI / 180))) * (180 / Math.PI);
    
    // 計算新的經緯度
    const newLat = centerLat + latChange;
    const newLng = centerLng + lngChange;
    
    return [newLng, newLat];
}

/**
 * 計算經緯度相對於中心點的距離
 * @param {number} lng - 經度
 * @param {number} lat - 緯度
 * @param {number} centerLng - 中心點經度
 * @param {number} centerLat - 中心點緯度
 * @returns {Array} [y距離, x距離]
 */
function calculateDistanceInDirection(lng, lat, centerLng, centerLat) {
    try {
        // 確保參數是數字
        lng = parseFloat(lng);
        lat = parseFloat(lat);
        centerLng = parseFloat(centerLng);
        centerLat = parseFloat(centerLat);
        
        if (isNaN(lng) || isNaN(lat) || isNaN(centerLng) || isNaN(centerLat)) {
            console.error('經緯度計算錯誤: 參數不是有效數字');
            return [0, 0];
        }
        
        // 完全模仿 AddBusInMap.js 中的實現
        // 地球半徑（米）
        const R = 6371000; // 地球半徑，單位米
        
        // 將角度轉換為弧度
        const lat1 = centerLat * Math.PI / 180;
        const lat2 = lat * Math.PI / 180;
        const lon1 = centerLng * Math.PI / 180;
        const lon2 = lng * Math.PI / 180;
        
        // 計算緯度和經度差
        const dlat = lat2 - lat1;
        const dlon = lon2 - lon1;
        
        // 使用 Haversine 公式計算距離
        const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dlon/2) * Math.sin(dlon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // 以米為單位的距離
        
        // 計算方位角
        const y = Math.sin(dlon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon);
        const bearing = Math.atan2(y, x);
        
        // 計算北向和東向的距離分量
        const northDistance = distance * Math.cos(bearing); // 北向距離，單位米
        const eastDistance = distance * Math.sin(bearing);  // 東向距離，單位米
        
        // 與 AddBusInMap.js 保持完全一致的轉換
        // 返回 [y距離, x距離]，表示相對於中心點的位置
        // 注意：這裡不乘以任何縮放因子，保持原始單位
        const yDistance = northDistance / 50; // 調整為適合Three.js的比例
        const xDistance = eastDistance / 50;  // 調整為適合Three.js的比例
        
        // 輸出詳細計算過程
        console.log(`原始經緯度差 - latDiff: ${(lat - centerLat).toFixed(8)}, lngDiff: ${(lng - centerLng).toFixed(8)}`);
        console.log(`使用Haversine計算的距離 - northDistance: ${northDistance.toFixed(2)}m, eastDistance: ${eastDistance.toFixed(2)}m`);
        console.log(`計算後的Three.js相對位置 [${yDistance.toFixed(8)}, ${xDistance.toFixed(8)}]`);
        
        return [yDistance, xDistance];
    } catch (error) {
        console.error('計算距離時出錯:', error);
        return [0, 0];
    }
}

/**
 * 創建巴士動畫渲染函數
 * @param {Object} busLayer - 巴士圖層對象
 * @returns {Function} 渲染函數
 */
function createBusAnimationRenderer(busLayer) {
    // 保存對原始渲染函數的引用
    const originalRender = busLayer.originalRender;
    
    // 返回新的渲染函數
    return function(gl, matrix) {
        try {
            // 首先調用原始渲染函數
            if (typeof originalRender === 'function') {
                originalRender.call(this, gl, matrix);
            }
            
            const busGroup = this.busGroup;
            if (!busGroup || !busGroup.userData) {
                return;
            }
            
            // 處理增量動畫，類似 AddBusInMap.js 中的 renderUpdateCubePosition
            const currentStep = busGroup.userData.currentStep || 0;
            const deltaPositions = busGroup.userData.deltaPosition || [];
            const animationNumbers = busGroup.userData.animationNumber || [];
            
            // 檢查是否需要更新位置
            if (!deltaPositions || deltaPositions.length === 0) {
                return;
            }
            
            // 檢查是否完成所有路段的動畫
            const allAnimationNumbersComplete = animationNumbers.every(num => num === 0);
            if (allAnimationNumbersComplete) {
                // 動畫結束，確保位置已設置到目標值
                if (busGroup.userData.targetPosition) {
                    // 設置最終位置 - 注意，在 AddBusInMap.js 中，X 軸是取負值的
                    busGroup.position.x = -busGroup.userData.targetPosition[1]; // X 軸取負值
                    busGroup.position.y = busGroup.userData.targetPosition[0];
                    
                    // 強制更新模型矩陣 - 確保位置變更反映在場景中
                    busGroup.updateMatrix();
                    busGroup.updateMatrixWorld(true);
                    
                    // 清理動畫數據
                    busGroup.userData.animationNumber = [];
                    busGroup.userData.deltaPosition = [];
                    busGroup.userData.currentStep = 0;
                    
                    // 標記移動完成
                    if (this.moveInfo) {
                        this.moveInfo.isMoving = false;
                        console.log(`巴士移動完成 - 最終位置: [${this.longitude}, ${this.latitude}], Three.js 位置: (${busGroup.position.x}, ${busGroup.position.y})`);
                        
                        // 確保標準標記位置為最終位置
                        if (this.standardMarker) {
                            this.standardMarker.setLngLat(this.moveInfo.targetLngLat);
                        }
                        
                        // 清除 moveInfo 以防重複觸發
                        this.moveInfo = null;
                    }
                    
                    // 強制更新渲染器和場景
                    this.renderer.render(this.scene, this.camera);
                    this.map.triggerRepaint();
                }
                return;
            }
            
            // 如果當前路段還有動畫幀需要執行
            if (currentStep < deltaPositions.length && animationNumbers[currentStep] > 0) {
                const delta = deltaPositions[currentStep];
                
                if (delta) {
                    // 保存上一幀的位置
                    const prevPosition = { x: busGroup.position.x, y: busGroup.position.y };
                    
                    // 更新位置 - 與 AddBusInMap.js 中的 renderUpdateCubePosition 完全一致
                    busGroup.position.y += delta[0];
                    busGroup.position.x -= delta[1]; // X 軸取負值
                    
                    // 強制更新模型矩陣 - 確保位置變更反映在場景中
                    busGroup.updateMatrix();
                    busGroup.updateMatrixWorld(true);
                    
                    // 計算新的位置
                    const newPosition = { x: busGroup.position.x, y: busGroup.position.y };
                    
                    // 設置朝向 - 確保與 AddBusInMap.js 中的 setCubeOrientation 一致
                    // 當移動距離足夠大時才設置朝向
                    const dx = newPosition.x - prevPosition.x;
                    const dy = newPosition.y - prevPosition.y;
                    if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) {
                        // 計算朝向角度
                        const angle = Math.atan2(dy, dx);
                        busGroup.rotation.z = angle;
                        
                        // 強制更新旋轉矩陣
                        busGroup.updateMatrix();
                        busGroup.updateMatrixWorld(true);
                    }
                    
                    // 減少當前步驟的幀數
                    animationNumbers[currentStep] -= 1;
                    
                    // 更新標準標記的位置
                    if (this.moveInfo && this.standardMarker) {
                        try {
                            // 計算當前的進度百分比
                            const totalAnimationFrames = this.moveInfo.totalSteps;
                            const remainingFrames = animationNumbers[currentStep];
                            const progressPercent = 1 - (remainingFrames / totalAnimationFrames);
                            
                            // 使用插值計算當前經緯度
                            const startLng = this.moveInfo.startLngLat[0];
                            const startLat = this.moveInfo.startLngLat[1];
                            const endLng = this.moveInfo.targetLngLat[0];
                            const endLat = this.moveInfo.targetLngLat[1];
                            
                            const currentLng = startLng + (endLng - startLng) * progressPercent;
                            const currentLat = startLat + (endLat - startLat) * progressPercent;
                            
                            // 更新標記位置
                            this.standardMarker.setLngLat([currentLng, currentLat]);
                        } catch (e) {
                            console.error('更新標記位置時出錯:', e);
                        }
                    }
                    
                    // 輸出一些調試信息 - 幫助診斷問題
                    if (animationNumbers[currentStep] % 10 === 0 || animationNumbers[currentStep] <= 5) {
                        console.log(`動畫進度: ${this.moveInfo.totalSteps - animationNumbers[currentStep]}/${this.moveInfo.totalSteps}, 位置: (${busGroup.position.x.toFixed(6)}, ${busGroup.position.y.toFixed(6)})`);
                    }
                    
                    // 檢查動畫是否已超時
                    if (this.moveInfo) {
                        const currentTime = Date.now();
                        const elapsedTime = currentTime - this.moveInfo.startTime;
                        const maxAnimationTime = 5000; // 最長5秒
                        
                        if (elapsedTime > maxAnimationTime) {
                            console.warn(`動畫超時(${elapsedTime}ms)，強制完成`);
                            
                            // 強制完成動畫
                            animationNumbers[currentStep] = 0;
                            busGroup.userData.animationNumber = animationNumbers;
                        }
                    }
                    
                    // 強制渲染器更新場景
                    this.renderer.render(this.scene, this.camera);
                }
            } else if (currentStep < deltaPositions.length) {
                // 當前路段完成，進入下一路段
                busGroup.userData.currentStep += 1;
            }
            
            // 強制觸發下一幀重繪
            if (this.map) {
                this.map.triggerRepaint();
            }
        } catch (error) {
            console.error('渲染巴士動畫時出錯:', error);
            // 出錯時嘗試恢復
            if (this.moveInfo) {
                this.moveInfo.isMoving = false;
                // 清除 moveInfo 以防重複觸發
                this.moveInfo = null;
            }
            
            if (busLayer.busGroup && busLayer.busGroup.userData) {
                busLayer.busGroup.userData.animationNumber = [];
                busLayer.busGroup.userData.deltaPosition = [];
            }
            
            // 嘗試觸發重繪
            if (this.map) {
                this.map.triggerRepaint();
            }
        }
    };
}

/**
 * 將巴士移動到新位置
 * @param {Object} busLayer - 巴士圖層對象
 * @param {Array} newLocation - 新位置坐標 [lng, lat]
 * @param {Object} options - 配置選項
 * @returns {boolean} 是否成功移動
 */
function MoveBusToLocation(busLayer, newLocation, options = {}) {
    try {
        if (!busLayer || !busLayer.scene) {
            console.error('移動巴士錯誤: 無效的巴士圖層');
            return false;
        }

        // 檢查巴士對象是否存在
        const busGroup = busLayer.busGroup; // 獲取巴士組

        if (!busGroup) {
            console.error('移動巴士錯誤: 未找到巴士對象');
            return false;
        }

        // 解析新位置
        const lng = parseFloat(newLocation[0]);
        const lat = parseFloat(newLocation[1]);
        
        if (isNaN(lng) || isNaN(lat)) {
            console.error('移動巴士錯誤: 無效的經緯度坐標值', lng, lat);
            return false;
        }

        // 保存舊位置信息
        const oldLongitude = busLayer.longitude || 0;
        const oldLatitude = busLayer.latitude || 0;
        
        // 檢查是否是相同位置 - 精確比較經緯度
        if (Math.abs(lng - oldLongitude) < 0.0000001 && Math.abs(lat - oldLatitude) < 0.0000001) {
            console.log('目標位置與當前位置相同，不需要移動');
            return true;
        }
        
        console.log(`移動巴士 - 從 [${oldLongitude}, ${oldLatitude}] 到 [${lng}, ${lat}]`);

        // 取消任何進行中的動畫
        if (busLayer.moveInfo && busLayer.moveInfo.isMoving) {
            console.log('發現進行中的移動，清除已有的動畫');
            busLayer.moveInfo.isMoving = false;
            
            // 清除任何現有的增量動畫數據
            if (busGroup.userData) {
                busGroup.userData.deltaPosition = [];
                busGroup.userData.animationNumber = [];
                busGroup.userData.currentStep = 0;
            }
        }

        // 如果busGroup沒有userData，進行初始化
        if (!busGroup.userData) {
            busGroup.userData = {
                sourceLngLat: [oldLongitude, oldLatitude],
                currentLngLat: [oldLongitude, oldLatitude],
                initialPosition: [0, 0],
                targetPosition: [0, 0],
                deltaPosition: [],
                animationNumber: [],
                currentStep: 0,
                map: busLayer.map
            };
        }

        // 使用與 AddBusInMap.js 完全相同的方式計算當前位置和目標位置
        // 參考 updateExistingCube 函數
        
        // 取得地圖中心點經緯度 - 使用圖層的初始經緯度
        const mapCenterLng = busLayer.initialLongitude || busLayer.longitude || 113.55;
        const mapCenterLat = busLayer.initialLatitude || busLayer.latitude || 22.17;
        
        console.log(`使用地圖中心點: [${mapCenterLng}, ${mapCenterLat}]`);
        
        // 將當前經緯度更新到 userData
        busGroup.userData.sourceLngLat = [oldLongitude, oldLatitude];
        busGroup.userData.currentLngLat = [oldLongitude, oldLatitude];
        
        // 使用與 AddBusInMap.js 中 calculateDistanceInDirection 相同的邏輯計算初始位置
        let currentPosition = calculateDistanceInDirection(
            oldLongitude,
            oldLatitude,
            mapCenterLng,
            mapCenterLat
        );
        
        // 計算目標位置
        let targetPosition = calculateDistanceInDirection(
            lng,
            lat,
            mapCenterLng,
            mapCenterLat
        );
        
        // 檢查busGroup的當前位置，如果已經有位置，則使用它
        if (busGroup.position && (busGroup.position.x !== 0 || busGroup.position.y !== 0)) {
            console.log(`使用巴士當前位置作為起點: (${busGroup.position.x}, ${busGroup.position.y})`);
            
            // 根據 AddBusInMap.js 中的實現，三維坐標 (x,y,z) 與我們的坐標關係是:
            // x = -position[1]  // 即 x = -eastDistance
            // y = position[0]   // 即 y = northDistance
            currentPosition = [busGroup.position.y, -busGroup.position.x];
        }
        
        console.log(`初始位置(相對距離): [${currentPosition[0].toFixed(6)}, ${currentPosition[1].toFixed(6)}]`);
        console.log(`目標位置(相對距離): [${targetPosition[0].toFixed(6)}, ${targetPosition[1].toFixed(6)}]`);
        
        // 檢查位置是否變化
        const positionUnchanged = 
            Math.abs(targetPosition[0] - currentPosition[0]) < 0.00001 &&
            Math.abs(targetPosition[1] - currentPosition[1]) < 0.00001;
            
        if (positionUnchanged) {
            console.log("相對位置未變化，不需要移動");
            busLayer.longitude = lng;
            busLayer.latitude = lat;
            if (busLayer.standardMarker) {
                busLayer.standardMarker.setLngLat([lng, lat]);
            }
            return true;
        }
        
        // 計算距離 - 使用與 AddBusInMap.js 相同的計算方式
        const distanceY = Math.abs(targetPosition[0] - currentPosition[0]);
        const distanceX = Math.abs(targetPosition[1] - currentPosition[1]);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        console.log(`總移動距離: ${totalDistance.toFixed(8)}`);
        
        // 精確設置適當的動畫步數 - 使用與 AddBusInMap.js 一致的參數
        // 在 AddBusInMap.js 中，動畫步數通常設為 500 或者根據距離計算
        let animationSteps;
        if (options.steps) {
            animationSteps = options.steps;
        } else {
            // 使與 AddBusInMap.js 中的邏輯一致
            // 500是常見的值，但我們將根據距離進行適當縮放
            animationSteps = Math.min(500, Math.max(60, Math.floor(totalDistance * 1000)));
        }
        
        console.log(`動畫步數: ${animationSteps}`);
        
        // 計算每步的增量 - 使用與 AddBusInMap.js 相同的邏輯
        const deltaY = (targetPosition[0] - currentPosition[0]) / animationSteps;
        const deltaX = (targetPosition[1] - currentPosition[1]) / animationSteps;
        
        console.log(`位移增量 - deltaY: ${deltaY.toFixed(8)}, deltaX: ${deltaX.toFixed(8)}`);
        
        // 注意: 在 AddBusInMap.js 中，deltaPosition 是 [deltaY, deltaX] 的形式
        const deltaPosition = [[deltaY, deltaX]];
        const animationNumber = [animationSteps];
        
        // 更新 busGroup 的 userData
        busGroup.userData.initialPosition = currentPosition;
        busGroup.userData.targetPosition = targetPosition;
        busGroup.userData.deltaPosition = deltaPosition;
        busGroup.userData.animationNumber = animationNumber;
        busGroup.userData.currentStep = 0;
        
        // 立即更新圖層的經緯度記錄
        busLayer.longitude = lng;
        busLayer.latitude = lat;
        
        // 更新標準標記位置
        if (busLayer.standardMarker) {
            // 初始位置保持不變，動畫過程中逐漸更新
            busLayer.standardMarker.setLngLat([oldLongitude, oldLatitude]);
        }
        
        // 設定動畫狀態
        busLayer.moveInfo = {
            isMoving: true,
            startTime: Date.now(),
            totalSteps: animationSteps,
            currentStep: 0,
            startLngLat: [oldLongitude, oldLatitude],
            targetLngLat: [lng, lat],
            currentPosition: currentPosition,
            targetPosition: targetPosition
        };
        
        // 替換或設置渲染函數
        if (!busLayer.originalRender) {
            busLayer.originalRender = busLayer.render;
            busLayer.render = createBusAnimationRenderer(busLayer);
        }
        
        // 在初始化移動後，強制更新一次位置，確保模型在正確的起始位置
        busGroup.position.set(-currentPosition[1], currentPosition[0], busGroup.position.z);
        busGroup.updateMatrix();
        busGroup.updateMatrixWorld(true);
        
        // 觸發重繪開始動畫
        busLayer.renderer.render(busLayer.scene, busLayer.camera);
        busLayer.map.triggerRepaint();
        
        console.log(`巴士開始移動動畫 - 從 [${oldLongitude}, ${oldLatitude}] 到 [${lng}, ${lat}]`);
        return true;
    } catch (error) {
        console.error('移動巴士時出現錯誤:', error, error.stack);
        return false;
    }
}

/**
 * 創建巴士控制UI
 * @param {Object} map - Mapbox地圖實例
 * @param {Array} routeCoordinates - 路線坐標數組 [[lng, lat], [lng, lat], ...]
 * @param {Object} options - 配置選項
 * @returns {Object} 控制面板對象
 */
function createBusControlUI(map, routeCoordinates = [], options = {}) {
    // 如果沒有提供路線坐標，可以嘗試從地圖上的已有元素獲取
    if (!routeCoordinates || routeCoordinates.length < 2) {
        console.log('沒有提供路線坐標，將使用預設值或根據巴士位置生成簡單路線');
        // 使用預設的澳門簡單路線作為示例 (僅供參考)
        routeCoordinates = [
            [113.54884, 22.16185], // 友誼大橋
            [113.55124, 22.17735], // 氹仔
            [113.56874, 22.19385], // 路氹連貫公路
            [113.58374, 22.20135]  // 澳門半島
        ];
    }
    
    // 獲取傳入的 RouteUtils 對象，如果沒有則使用默認方法
    const routeUtils = options.routeUtils || null;
    const busNumber = options.busNumber || '未知';

    // 創建控制面板容器
    const controlContainer = document.createElement('div');
    controlContainer.className = 'mapboxgl-ctrl mapboxgl-ctrl-group bus-control-panel';
    controlContainer.style.position = 'absolute';
    controlContainer.style.top = '10px';
    controlContainer.style.right = '10px';
    controlContainer.style.backgroundColor = '#fff';
    controlContainer.style.padding = '10px';
    controlContainer.style.borderRadius = '4px';
    controlContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    controlContainer.style.zIndex = '1';
    controlContainer.style.width = '250px';
    
    // 創建標題
    const titleElement = document.createElement('h3');
    titleElement.innerText = `巴士控制面板 - ${busNumber}`;
    titleElement.style.margin = '0 0 10px 0';
    titleElement.style.fontSize = '14px';
    titleElement.style.textAlign = 'center';
    
    // 創建選擇巴士的下拉選單
    const busSelector = document.createElement('select');
    busSelector.id = 'bus-selector';
    busSelector.style.marginRight = '5px';
    busSelector.style.padding = '5px';
    busSelector.style.width = '150px';
    
    // 添加默認選項
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = '選擇巴士';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    busSelector.appendChild(defaultOption);
    
    // 百分比輸入框
    const percentLabel = document.createElement('label');
    percentLabel.htmlFor = 'position-percent';
    percentLabel.innerText = '位置百分比:';
    percentLabel.style.display = 'block';
    percentLabel.style.marginTop = '10px';
    percentLabel.style.marginBottom = '5px';
    
    const percentInput = document.createElement('input');
    percentInput.type = 'range';
    percentInput.id = 'position-percent';
    percentInput.min = '0';
    percentInput.max = '100';
    percentInput.value = '50';
    percentInput.style.width = '100%';
    percentInput.style.marginBottom = '5px';
    
    // 顯示百分比值的元素
    const percentDisplay = document.createElement('div');
    percentDisplay.id = 'percent-display';
    percentDisplay.innerText = '50%';
    percentDisplay.style.textAlign = 'center';
    percentDisplay.style.marginBottom = '10px';
    
    // 創建移動按鈕
    const moveButton = document.createElement('button');
    moveButton.innerText = '移動巴士';
    moveButton.style.padding = '5px 10px';
    moveButton.style.backgroundColor = '#4CAF50';
    moveButton.style.color = 'white';
    moveButton.style.border = 'none';
    moveButton.style.borderRadius = '4px';
    moveButton.style.cursor = 'pointer';
    moveButton.style.width = '100%';
    
    // 顯示目前位置的標記
    let currentMarker = null;
    
    // 計算百分比位置的函數
    function calculatePositionAt(percentage) {
        if (routeUtils && typeof routeUtils.getPointAtPercentage === 'function') {
            // 使用 RouteUtils 計算位置
            return routeUtils.getPointAtPercentage(routeCoordinates, percentage);
        } else {
            // 簡易版本，直接線性插值
            if (percentage === 0) {
                return routeCoordinates[0];
            } else if (percentage === 100) {
                return routeCoordinates[routeCoordinates.length - 1];
            } else {
                // 計算在哪個路段
                const totalSegments = routeCoordinates.length - 1;
                const targetSegmentIndex = Math.floor((percentage / 100) * totalSegments);
                
                // 獲取目標路段的起點和終點
                const segmentStart = routeCoordinates[targetSegmentIndex];
                const segmentEnd = routeCoordinates[targetSegmentIndex + 1];
                
                // 計算段內百分比
                const segmentPercentage = (percentage / 100 * totalSegments) - targetSegmentIndex;
                
                // 在段內插值計算位置
                return [
                    segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * segmentPercentage,
                    segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * segmentPercentage
                ];
            }
        }
    }
    
    // 更新百分比顯示
    percentInput.addEventListener('input', function() {
        const percentage = parseInt(percentInput.value, 10);
        percentDisplay.innerText = `${percentage}%`;
        
        // 如果已選擇巴士，預覽新位置
        const selectedBusIndex = busSelector.value;
        if (selectedBusIndex !== '') {
            previewNewPosition(percentage);
        }
    });
    
    // 預覽新位置函數
    function previewNewPosition(percentage) {
        // 刪除之前的標記
        if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
        }
        
        // 計算新位置
        if (routeCoordinates && routeCoordinates.length >= 2) {
            // 根據百分比在路線上計算位置
            const previewLocation = calculatePositionAt(percentage);
            
            // 在地圖上顯示標記
            currentMarker = new mapboxgl.Marker({
                color: '#4CAF50',
                draggable: false
            })
            .setLngLat(previewLocation)
            .addTo(map);
        }
    }
    
    // 更新巴士選擇器
    function updateBusSelector() {
        // 清空當前選項
        while (busSelector.options.length > 1) {
            busSelector.remove(1);
        }
        
        // 添加當前活動的巴士圖層到選擇器
        if (window.activeBusLayers && window.activeBusLayers.length > 0) {
            window.activeBusLayers.forEach((layer, index) => {
                if (layer && layer.id) {
                    const option = document.createElement('option');
                    option.value = index.toString();
                    option.text = `巴士 ${layer.id}`;
                    busSelector.appendChild(option);
                }
            });
            
            // 如果有巴士，啟用移動按鈕
            moveButton.disabled = false;
        } else {
            // 如果沒有巴士，禁用移動按鈕
            moveButton.disabled = true;
        }
    }
    
    // 當選擇巴士時，顯示當前位置的標記
    busSelector.addEventListener('change', function() {
        const percentage = parseInt(percentInput.value, 10);
        if (busSelector.value !== '') {
            previewNewPosition(percentage);
        } else if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
        }
    });
    
    // 當點擊移動按鈕時，移動選中的巴士到指定百分比位置
    moveButton.addEventListener('click', function() {
        const selectedBusIndex = busSelector.value;
        const percentage = parseInt(percentInput.value, 10);
        
        if (selectedBusIndex === '' || isNaN(percentage)) {
            alert('請選擇巴士並輸入有效的百分比值');
            return;
        }
        
        const selectedBus = window.activeBusLayers[parseInt(selectedBusIndex, 10)];
        
        if (!selectedBus) {
            alert('無法找到選中的巴士');
            return;
        }
        
        // 計算新位置
        const newLocation = calculatePositionAt(percentage);
        
        // 移動巴士到新位置
        MoveBusToLocation(selectedBus, newLocation, { steps: 60 }); // 1秒完成移動
        
        // 移除預覽標記
        if (currentMarker) {
            currentMarker.remove();
            currentMarker = null;
        }
    });
    
    // 添加元素到控制面板
    controlContainer.appendChild(titleElement);
    controlContainer.appendChild(busSelector);
    controlContainer.appendChild(percentLabel);
    controlContainer.appendChild(percentInput);
    controlContainer.appendChild(percentDisplay);
    controlContainer.appendChild(moveButton);
    
    // 添加控制面板到地圖
    map.getContainer().appendChild(controlContainer);
    
    // 初始更新巴士選擇器
    updateBusSelector();
    
    // 監聽巴士添加事件
    const originalAddBusAtMarker = window.AddBusAtMarker;
    window.AddBusAtMarker = function(...args) {
        const result = originalAddBusAtMarker.apply(this, args);
        if (result) {
            // 延遲更新選擇器，確保圖層已添加
            setTimeout(updateBusSelector, 100);
        }
        return result;
    };
    
    return {
        container: controlContainer,
        updateSelector: updateBusSelector
    };
}

// 導出新增的公共函數
window.MoveBusToLocation = MoveBusToLocation;
window.createBusControlUI = createBusControlUI;
window.calculateCoordinateFromDistance = calculateCoordinateFromDistance; 