// 导入模型变换工具函数
import { GenModelTransform } from './AddBusInMapFunction/ModelTransformUtils.js';
import { createBusMesh, createBusMaterial } from './AddBusInMapFunction/mesh.js';
import { calculateDistanceInDirection, getPointsInTrafficData, calculateCoordinateFromDistance } from './AddBusInMapFunction/CoordinateUtils.js';
import { createUpdateBusButton } from './tools/support.js';
import { calculateCameraMatrix, setCubeOrientation } from './AddBusInMapFunction/TransformUtils.js';
import { filterCurrentBusData } from './AddBusInMapFunction/BusDataUtils.js';
import { AddMarkerData } from './tools/support.js';
import { createPathLine, drawBusPathAndEndpoint } from './AddBusInMapFunction/PathVisualizationUtils.js';
import { initializeBusEvents } from './AddBusInMapFunction/BusEventHandler.js';

// 添加路线工具函数
// 计算两点之间的距离（辅助函数）
function getDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    // 简单的二维平面距离，未考量地球曲率
    return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
}

/**
 * 在所有座標中，找出與指定點距離最近的索引
 * @param {Array} coordinates - 座標點陣列，每個元素為 [經度, 緯度]
 * @param {Array} targetPoint - 目標點座標 [經度, 緯度]
 * @returns {number} 最近點的索引值
 * @description 遍歷所有座標點，計算與目標點的距離，返回距離最短的座標點索引
 */
function findClosestIndex(coordinates, targetPoint) {
    let minDist = Infinity; // 初始化最小距離為無限大
    let closestIndex = -1;  // 初始化最近點索引為-1
  
    coordinates.forEach((coord, index) => {
        const dist = getDistance(coord, targetPoint); // 計算當前座標點與目標點的距離
        if (dist < minDist) { // 如果找到更近的點
            minDist = dist; // 更新最小距離
            closestIndex = index; // 更新最近點索引
        }
    });
    return closestIndex; // 返回最近點的索引
}

function findClosestPoint(coordinates, targetPoint) {
    let minDist = Infinity;
    let closestPoint = null;

    // 遍歷路線的每個線段
    for(let i = 0; i < coordinates.length - 1; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[i + 1];
        
        // 計算目標點到當前線段的投影點
        const A = targetPoint[1] - p1[1]; // y差
        const B = targetPoint[0] - p1[0]; // x差
        const C = p2[1] - p1[1]; // 線段y差
        const D = p2[0] - p1[0]; // 線段x差
        
        // 計算投影點位置比例
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if(lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let projPoint;
        if(param < 0) {
            projPoint = p1;
        } else if(param > 1) {
            projPoint = p2;
        } else {
            projPoint = [
                p1[0] + param * D,
                p1[1] + param * C
            ];
        }
        
        // 計算投影點到目標點的距離
        const dist = getDistance(projPoint, targetPoint);
        
        if(dist < minDist) {
            minDist = dist;
            closestPoint = projPoint;
        }
    }
    
    return closestPoint;
}

// 计算路线总长度
function calculateRouteLength(coordinates) {
    if (!coordinates || coordinates.length < 2) {
        return 0;
    }
    
    let totalLength = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
        totalLength += getDistance(coordinates[i], coordinates[i+1]);
    }
    
    return totalLength;
}

// function base 巴士 初始化每个巴士的位置等数据 set position -> 根据busInfo 和 longitude, latitude 出巴士初始位置
function initializeCubeData(cube, busInfo, longitude, latitude, dir, map) { // 由cube 和 busInfo 初始化巴士位置
    //用新巴士經緯 和 地圖中心經緯 計算巴士初始位置position
    const initialPosition = calculateDistanceInDirection(parseFloat(busInfo.longitude), parseFloat(busInfo.latitude), longitude, latitude); // 計算巴士初始位置
    cube.userData = { // 設置巴士的userData
        // 记录当前巴士的"原始经纬度"
        sourceLngLat: [parseFloat(busInfo.longitude), parseFloat(busInfo.latitude)],
        currentLngLat: [parseFloat(busInfo.longitude), parseFloat(busInfo.latitude)], // 添加currentLngLat
        initialPosition: initialPosition, // 当前位置（Three.js 坐标系）
        targetPosition: initialPosition.slice(),  // 目标位置（可能不断被更新） // 初始化为相同引用的拷贝
        // 记录巴士车牌、方向等
        busPlate: busInfo.busPlate,
        busDir: dir,
        busSpeed: busInfo.speed,
        // 以下是动画控制相关数据
        deltaPosition: [], // 多段路程的"位移增量"队列，每一段为数组[[deltaY,deltaX], [deltaY2,deltaX2], ...]
        animationNumber: [], // 对应每一段的帧数 [ 500, 500, ...]
        currentStep: 0, // 初始化为0 巴士当前步骤  // 当前正在执行第几段
        map: map,  // 添加地圖引用
        // 新增：目的地队列（当API在5秒内连续返回多个目的地时使用）
        // pendingDestinations: [], //初始化时增加队列属性 //未用
    };
    cube.position.set(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0); // 設置巴士位置去到userData的initialPosition
}

/**
 * update - 更新巴士立方体的位置和方向
 * @param {Object} cube - 巴士的3D模型对象
 * @description 根据deltaPosition和animation_number更新巴士位置，并计算正确的朝向
 */
// 4. 巴士位置动画更新
function renderUpdateCubePosition(cube, longitude, latitude) {
    // 检查巴士是否已经完成100%的路线
    if (cube.userData.currentRoutePercentage >= 100) {
        // 如果巴士已完成100%路线，将其从场景中移除
        if (cube.parent) {
            // 直接从父场景中移除巴士
            cube.parent.remove(cube);
            
            // 标记巴士已被移除，这样在渲染时可以将其从cube_list中过滤掉
            cube.userData.removed = true;
            
            console.log("巴士已到达终点(100%)，已从场景中移除");
        }
        return;
    }
    
    // 使用calculateSourceFromDistance将Three.js坐标转换回经纬度
    if (cube) {
        const [currentLng, currentLat] = calculateCoordinateFromDistance(
            cube.position.y,  
            -cube.position.x, // 经度方向距离（注意不需要取负）
            longitude,  // 地图中心经度
            latitude   // 地图中心纬度
        );
        cube.userData.currentLngLat = [currentLng, currentLat];
    }
    // 現時所有巴士的currentStep，動劃點
    let currentStep = cube.userData.currentStep || 0; //如果有userData.currentStep 就用userData.currentStep ，沒有就用0
    // 提取位置增量和动画帧数
    const deltaPositions = cube.userData.deltaPosition;  // 位置增量 ，例現時用[[deltaY, deltaX],[deltaY, deltaX]] 或 []
    const animationNumbers = cube.userData.animationNumber; // 動畫幀數 ，例現時用[500,200,300] 或 []
    // 检查是否需要更新位置 -- 如果沒有位置增量，表示位置未变化，不更新位置和旋转
    if (!deltaPositions || deltaPositions.length === 0) return; // 因為一開始就init了cube.position.set

    // console.log("deltaPositions:",deltaPositions);
    // console.log("animationNumbers:",animationNumbers);

    // 若当前已超过最后一个路段，说明已全部跑完
    if (currentStep > deltaPositions.length){
        console.log("出了問題： deltaPositions 和 animationNumbers 長度不一樣");
        return;     //出現這問題，是因為deltaPositions 和 animationNumbers 長度不一樣
    }
    // 检查是否已完成所有路段的动画 
    let allAnimationNumbersStatus = animationNumbers.every(num => num == 0); // 如果所有動畫幀數都是0，表示動畫完成
    if (allAnimationNumbersStatus) {
        // 动画结束，确保位置和朝向已更新到目标值
        if (cube.userData.targetPosition) {
            // console.log("動畫完成");
            // console.log("動畫完成 cube.userData: ", cube.userData);

            cube.position.x = -cube.userData.targetPosition[1];
            cube.position.y = cube.userData.targetPosition[0];
            // 设置朝向为最后一次计算的角度
            // cube.rotation.z = cube.userData.finalRotation || cube.rotation.z;
            // 標記已到達終點
            // cube.userData.reachedDestination = true;
            cube.userData.animationNumber = [];
            cube.userData.deltaPosition = [];
            cube.userData.currentStep = 0;
        } else {
            console.error("cube.userData.targetPosition is null or undefined.");
        }
        return;
    }

    // 如果当前路段还有动画帧需要执行 //最小都是 animationNumbers[currentStep] = 1
    if (animationNumbers[currentStep] > 0) {
        const delta = deltaPositions[currentStep];

        if (delta) {
            // 保存上一帧的位置
            const prevPosition = { x: cube.position.x, y: cube.position.y };
            
            // 更新位置
            cube.position.y += delta[0];
            cube.position.x -= delta[1];

            // 计算新的位置
            const newPosition = { x: cube.position.x, y: cube.position.y };

            // 设置朝向
            setCubeOrientation(cube, prevPosition, newPosition);

            // 更新 previousPosition 用在popup 視窗
            cube.userData.previousPosition = newPosition;

            // 减少当前步骤的帧数
            animationNumbers[currentStep] -= 1; // 減少動畫幀數 // 最小是0
        } else {
            console.error("delta is null or undefined.");
        }
    } 
    else {
        // 当前路段完成，进入下一路段
        // console.log("currentStep:",cube.userData.currentStep,"號路段的動畫完成～");
        
        cube.userData.currentStep += 1;
    }
}



/** ------------------------------------------------------------------------------------------------
 * 处理图层中所有巴士的位置更新
 * @param {Object} layer - 地图图层对象
 * @param {Array} response_bus_data - API返回的巴士数据
 */
//3.1 巴士位置更新流程- Filter 析图层ID获取路线和方向信息 -> 開始更新巴士位置，用updateLayerCubes 更新巴士位置
async function handleBusPositionUpdates(layer, response_bus_data) {
    const customLayerIdData = layer.id.split("_");
    const customLayerDir = customLayerIdData[customLayerIdData.length - 1];
    const customLayerNum = customLayerIdData[customLayerIdData.length - 2];
    console.log(`\n=============== 更新巴士位置 ${customLayerNum}號車 - 方向：${customLayerDir} ==============`);

    // 过滤出当前图层的巴士数据
    const currentBusData = filterCurrentBusData(response_bus_data, customLayerNum, customLayerDir);

    // 更新巴士的位置和状态
    console.log(`${customLayerNum}号车场景中巴士数量:`, layer.scene.children.length);
    await updateLayerCubes(layer, currentBusData);

}

// 3.2 update - 巴士 更新图层中的巴士立方体
async function updateLayerCubes(layer, currentBusData) {
    if (!isValidBusData(currentBusData)) { // 如果沒有巴士數據，就return
        return;
    }

    const cubesForUpdate = prepareCubesForUpdate(layer); // 準備需要更新的巴士列表, 用slice 複製一份 分開
    
    // 遍历并更新巴士数据
    await updateBusesInLayer(layer, currentBusData, cubesForUpdate); // currentBusData 是所有 filter 過的巴士data, cubesForUpdate 是所有巴士立方體列表, 
}

/**
 * 验证巴士数据的有效性
 * @param {Array} currentBusData - 当前巴士数据
 */
// 3.2.1 update - 巴士 验证巴士数据的有效性-是否有巴士數據，沒有就return
function isValidBusData(currentBusData) {
    if (!currentBusData || currentBusData.length === 0) {
        console.log("没有找到相关巴士数据");
        return false;
    }
    return true;
}

// 3.2.2 update - 巴士 准备需要更新的巴士列表
function prepareCubesForUpdate(layer) {
    const custom_cube_list = layer.cube_list.slice();//複製一份用slice()
    console.log("当前层中的立方体列表:", custom_cube_list);
    return {
        allCubes: custom_cube_list, // 所有立方体列表 - 保持不變，作為參考列表
        remainingCubes: custom_cube_list.slice() // 複製所有立方体列表 - 會在更新過程中被修改，用於追踪需要清理的巴士 ： 在更新過程中，當某個巴士被更新後，會從這個列表中移除
    };
}

// 3.3 update - 更新图层中的巴士
async function updateBusesInLayer(layer, busDataList, cubesForUpdate) {
    for (const busData of busDataList) {
        if (!isValidBusInfo(busData)) { // 如果巴士數據格式不正確，就continue
            continue; // 跳過不處理
        }
        await updateBusGroup(layer, busData, cubesForUpdate); // 一條巴士數據更新巴士組
    }

    // 清理不再存在的巴士
    removeInactiveBuses(layer, cubesForUpdate.remainingCubes); // 由updateBusGroup中 清理不再存在的巴士用remainingCubes filter
}

// 检查单个巴士信息是否有效
function isValidBusInfo(busData) {
    if (!busData || !busData.busInfoList) {
        console.log("巴士数据格式不正确:", busData);
        return false;
    }
    return true;
}

// remove - 移除不活跃的巴士
function removeInactiveBuses(layer, remainingCubes) {
    if (remainingCubes.length > 0) {
        console.log("需要清理的立方体列表:", remainingCubes);
        for (const cube of remainingCubes) {
            console.log("需要删除的巴士：", cube.userData);
            layer.scene.remove(cube);
            layer.cube_list = layer.cube_list
                .filter(item => item.userData.busPlate !== cube.userData.busPlate);
        }
    }
}

// 3.4 update - 正常開始更新单个巴士组 這個方法會解決巴士位置跳變過大
async function updateBusGroup(layer, busData, cubesForUpdate) {  //layer 當前層this, busData 自訂巴士數據, cubesForUpdate 需要更新的巴士列表(allCubes, remainingCubes 兩個參數一致)
    const busInfoList = busData.busInfoList;//巴士數據列表
    const direction = busData.dir;//巴士方向

    for (const newBusInfo of busInfoList) { // 遍歷巴士數據列表，子項叫newBusInfo
        newBusInfo.color = [busData.color[0], busData.color[1]]; // 更新巴士顏色
        
        // initializeCubeData時設定userData 和 api返回的巴士數據對比，得出要更新的 existingCube
        const existingCube = layer.cube_list.find(cube => cube.userData.busPlate === newBusInfo.busPlate && cube.userData.busDir === direction); 

        if (existingCube) { // 如果存在，則更新
            await updateExistingCube(existingCube, newBusInfo, layer); // existingCube: 需要更新的巴士立方體, newBusInfo: 巴士數據, layer: 當前層
            
            // 检查是否需要重新生成
            if (existingCube.userData.needsRespawn) { // 如果需要重新生成 ，因為巴士位置跳變過大，需要重新生成
                // 从场景和列表中移除旧的巴士
                layer.scene.remove(existingCube);
                layer.cube_list = layer.cube_list.filter(cube => cube !== existingCube); // 用filter移除舊的巴士 ，因為layer.cube_list.push(newCube); 會重新添加
                
                // 直接使用InsertNewCube来添加新巴士，避免重复添加
                InsertNewCube(layer, newBusInfo, direction, existingCube);
                
            }
        } else {
            // 如果不存在，则添加新的巴士
            const updatedCube = InsertNewCube(layer, newBusInfo, direction, existingCube);
        }
        
        // 从待检查列表中移除已更新的巴士
        if (existingCube) {
            cubesForUpdate.remainingCubes = cubesForUpdate.remainingCubes
                .filter(item => item.userData.busPlate !== existingCube.userData.busPlate);
        }
    }
}

// insert - 添加巴士立方体
function InsertNewCube(layer, busInfo, dir, existingCube) {
    // 添加一个新的立方体到层中
    addNewCubeToLayer(existingCube, layer, busInfo, dir, layer.sizeX, layer.sizeY, layer.sizeZ, layer.scaleSize, layer.longitude, layer.latitude);
}


// add - 巴士 添加新的立方体到图层
// 現有巴士 , layer , 新巴士 , 方向 , 巴士大小 X-Z , 巴士縮放SIZE , 地圖中心經度 , 地圖中心緯度
function addNewCubeToLayer(existingCube, layer, newBusInfo, dir, sizeX, sizeY, sizeZ, scaleSize, longitude, latitude) { 
    console.log("需要新增的巴士：(新經緯度)", newBusInfo);
    
    let newCubePosition = calculateDistanceInDirection(parseFloat(newBusInfo.longitude), parseFloat(newBusInfo.latitude), longitude, latitude); // 計算巴士新位置

    const material = createBusMaterial(dir, [0xFFFFFF, newBusInfo.color[0], newBusInfo.color[0]]); // 生成巴士材質 - 创建輸出dir 0 1巴士的材质
    const newCube = createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material, layer.id.split("_")[1],dir); // 创建巴士的3D网格模型，使用指定的尺寸、缩放和材质
    initializeCubeData(newCube, newBusInfo, longitude, latitude, dir, layer.map); // 初始化巴士的位置、方向等数据
    
    // 使用巴士的行驶方向来设置初始朝向
    

    if (existingCube && existingCube.position) {
        let existingPosition = { x: existingCube.position.x, y: existingCube.position.y };
        const targetPosition = { x: -newCubePosition[1], y: newCubePosition[0] }; // 將巴士初始位置轉換為經緯度-要反轉XY，-X
        // 设置朝向
        setCubeOrientation(newCube, existingPosition, targetPosition);
    }

    // 添加到场景
    layer.scene.add(newCube); // 将新创建的巴士模型添加到场景中
    layer.cube_list.push(newCube); // 将新巴士添加到图层的巴士列表中
    layer.renderer.render(layer.scene, layer.camera); // 重新渲染场景
    layer.map.triggerRepaint(); // 触发地图重绘，确保新添加的巴士能够正确显示
}

// update - 更新已存在的立方体
// * 如果巴士还在移动，则将API新目的地加入队列；否则按原逻辑更新目标位置
function updateExistingCube(cube, newBusInfo, layer) {
    console.log("需要移动的巴士：", newBusInfo);
    
    // 获取当前位置和目标位置的经纬度
    const currentLngLat = cube.userData.sourceLngLat; // 当前位置
    const targetLngLat = [parseFloat(newBusInfo.longitude), parseFloat(newBusInfo.latitude)]; // 目标位置
    console.log("1. currentLngLat:", currentLngLat);
    console.log("1. targetLngLat:", targetLngLat);
    // 1. 根据巴士路线预设移动百分比
    // 获取路线数据
    let route_traffic_data_use = window.traffic_data; // 获取巴士路线数据
    const bus_name = cube.name.split("_")[1].toString().padStart(5, '0'); // 获取巴士路线数据
    const bus_dir = cube.name.split("_")[2]; // 获取巴士路线数据

    let routeCoordinates = route_traffic_data_use.find(e => e.routeCode == bus_name && e.direction == bus_dir); // 获取巴士路线数据
    
    if (!routeCoordinates || !routeCoordinates.coordinate) {
        console.error(`找不到路线数据: 巴士号=${bus_name}, 方向=${bus_dir}`);
        // 标记这个巴士需要重新生成
        cube.userData.needsRespawn = true;
        return;
    }
    // 2. 计算真实移动百分比
    // 获取当前路线
    let currentRoutePercentage = 0;
    let targetRoutePercentage = 0;

    // 当前位置在路线中的百分比 - 优先使用已有的百分比
    if (cube.userData.currentRoutePercentage !== undefined) {
        currentRoutePercentage = cube.userData.currentRoutePercentage;
    } else {
        // 首次计算，查找**实际当前位置**在路线中的百分比
        const currentIndex = findClosestIndex(routeCoordinates.coordinate, currentLngLat); // 使用 currentLngLat
        // 计算从起点到当前位置的距离占总路线的百分比
        const routeTotalLength = calculateRouteLength(routeCoordinates.coordinate); // 计算路线总长度
        const currentLength = calculateRouteLength(routeCoordinates.coordinate.slice(0, currentIndex + 1)); // 计算当前位置到起点的距离

        currentRoutePercentage = (currentLength / routeTotalLength) * 100; // 计算当前位置在路线中的百分比
    }
    console.log("currentRoutePercentage:", currentRoutePercentage);



    // 目标位置在路线中的百分比 (基于API数据)
    const targetIndex = findClosestIndex(routeCoordinates.coordinate, targetLngLat); // 计算目标位置在路线中的百分比
    // 计算从起点到目标位置的距离占总路线的百分比
    const routeTotalLength = calculateRouteLength(routeCoordinates.coordinate); // 计算路线总长度
    const targetLength = calculateRouteLength(routeCoordinates.coordinate.slice(0, targetIndex + 1)); // 计算当前位置到起点的距离
    targetRoutePercentage = (targetLength / routeTotalLength) * 100; // 计算目标位置在路线中的百分比
    console.log("targetRoutePercentage:", targetRoutePercentage);
    
    // 计算移动百分比差值
    let percentageDiff = targetRoutePercentage - currentRoutePercentage; // 计算目标位置和当前位置的百分比差值 可大可小 range -100% ~ 100%
    console.log("!! targetRoutePercentage 和currentRoutePercentage 的percentageDiff差值%:", percentageDiff);
    
    // 修改：确保目标位置百分比始终大于当前位置百分比

    // 3. 设置默认移动速度（每5秒移动路线的1%）
    const defaultMovePercentage = 0.3; // 设置默认移动速度
    let nextPercentage = 0
    // 修改：确保目标位置百分比始终大于当前位置百分比
    if (percentageDiff <= 0) {
        // 设置一个默认增量，确保即使GPS位置在后面，巴士也会继续向前移动
        targetRoutePercentage = currentRoutePercentage + defaultMovePercentage; // 現時% ＋ 0.1%
        console.log("!! 新的的 targetRoutePercentage:", targetRoutePercentage);
        nextPercentage = targetRoutePercentage;

    }else{

        // 动态调整移动速度
        let movePercentage = defaultMovePercentage;

        // -------- 简化：确保巴士始终向前移动 --------
        // 确保 movePercentage 是正值，但根据 percentageDiff 动态调整
        // 如果 percentageDiff 大，说明需要加速，如果小，说明需要减速，但始终保持最小前进速度
        movePercentage = Math.max(0.1, Math.min(2.2, percentageDiff)); // 保证最小前进速度0.01%，最大前进速度2.2% range 0.01% ~ 2.2%
        console.log("!! 最後移動百分比 movePercentage( 0.1% ~ 2.2%):", movePercentage); // 0.1% ~ 2.2%
        // -------------------------------------------------

        // 4. 计算下一个中间点
        // 确保 nextPercentage = 現時% + 移動%
        nextPercentage = currentRoutePercentage + movePercentage;

    }
    
    console.log("!! 下一個目的地百分比 nextPercentage:", nextPercentage);
    // 使用routeUtils中的getPointAtPercentage函数 作用：计算路线中指定百分比位置的坐标
    let nextPoint;
    if (window.routeUtils && window.routeUtils.getPointAtPercentage) {
        // 确保 nextPercentage 不超过 100, 用Math.min(nextPercentage, 100) 限制百分比在0-100之间
        nextPoint = window.routeUtils.getPointAtPercentage(routeCoordinates.coordinate, Math.min(nextPercentage, 100)); // 計算路線中指定百分比位置的坐标
    } else {
        // 如果window.routeUtils不存在，使用简化版的百分比计算
        const index = Math.floor((routeCoordinates.coordinate.length - 1) * (Math.min(nextPercentage, 100) / 100));
        nextPoint = routeCoordinates.coordinate[Math.min(index, routeCoordinates.coordinate.length - 1)];
    }

    // 5. 使用计算出的下一个点作为临时目标
    const tempTargetLngLat = nextPoint;

    // 6. 保存路线百分比信息
    cube.userData.currentRoutePercentage = nextPercentage;
    cube.userData.targetRoutePercentage = targetRoutePercentage; // 仍然保存API目标百分比，供参考(可用在未來一直不停加/cut speed)

    // 计算动画参数
    // deltaPosition 是巴士的移動位置，animationNumber 是巴士的移動時間
    // -------- 修改：使用 currentLngLat 作为起点 --------
    const [deltaPosition, animationNumber] = getPointsInTrafficData(
        layer,
        newBusInfo,
        cube.name.split("_")[1],
        cube.name.split("_")[2],
        currentLngLat, // 使用当前实际位置作为起点
        tempTargetLngLat // 使用计算出的下一个点作为临时目标
    );
    // -------------------------------------------------------

    // 获取巴士颜色
    let busColor = '#FFFFFF'; // 默认颜色
    if (cube.material && Array.isArray(cube.material)) {
        busColor = `#${cube.material[0].color.getHexString()}`;
    } else if (cube.material && cube.material.color) {
        busColor = `#${cube.material.color.getHexString()}`;
    }

    // -------------------------- 檢查巴士是否移動過遠 --------------------------
    const initialPosition = cube.userData.initialPosition;
    const targetPosition = calculateDistanceInDirection(
        parseFloat(tempTargetLngLat[0]),
        parseFloat(tempTargetLngLat[1]),
        layer.longitude,
        layer.latitude
    );

    // 計算兩點之間的距離
    const distanceX = Math.abs(targetPosition[0] - initialPosition[0]);//公式
    const distanceY = Math.abs(targetPosition[1] - initialPosition[1]);//公式
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY); // 計算兩點之間的距離公式

    // 设置距离阈值（单位：米），超过这个距离就认为是异常跳变
    const MAX_DISTANCE_THRESHOLD = 1500; // 可以根据实际情况调整这个值

    if (totalDistance > MAX_DISTANCE_THRESHOLD) {
        console.log(`检测到巴士 ${cube.userData.busPlate} 位置跳变过大，距离: ${totalDistance}米，将重新生成巴士`);
        // 标记这个巴士需要重新生成
        cube.userData.needsRespawn = true;
        return;
    }
    console.log("巴士位置變化正常，保持原來方式");
    // ------------------------------------------------------------

    // 更新动画参数
    cube.userData.deltaPosition.push(...deltaPosition);
    cube.userData.animationNumber.push(...animationNumber);
    if(cube.userData.deltaPosition.length === 1){
        cube.userData.currentStep = 0;  // 重置当前步骤
    }
    
    console.log(`巴士 ${cube.userData.busPlate} 动画列表:`);
    console.log(`- 当前步骤 currentStep: ${cube.userData.currentStep}`);
    console.log(`- 剩余动画帧列表:`, cube.userData.animationNumber.slice(cube.userData.currentStep));
    console.log(`- 下一动画增量:`, cube.userData.deltaPosition[cube.userData.currentStep]);

    // 更新其他用户数据
    // -------- 修改：initialPosition 应为当前实际位置, sourceLngLat 应为新的临时目标 --------
    cube.userData.initialPosition = targetPosition; // 更新 initialPosition 为本次动画的目标位置
    cube.userData.targetPosition = targetPosition; // 目标位置 (本次动画的目标)
    console.log("targetPosition (temp):", targetPosition);
    cube.userData.sourceLngLat = tempTargetLngLat; // 更新 sourceLngLat 为本次动画的目标经纬度，作为下次计算的起点参考
    cube.userData.busSpeed = newBusInfo.speed; // 巴士速度
    // -----------------------------------------------------------------------------------

    // 初始化 previousPosition 
    cube.userData.previousPosition = { x: -initialPosition[1], y: initialPosition[0] };

    console.log("持续移动更新，（下一個目的地）巴士当前位置百分比:", nextPercentage, "（真實GPS）目标位置百分比:", targetRoutePercentage);
}




/**
 * 巴士图层管理模块
 * 主要功能：创建和管理3D巴士图层
 */

/**
 * 生成自定義3D巴士圖層（每一層巴士號）
 * @param {Object} map - Mapbox地图实例
 * @param {Object} route_elements - 路线元素数据
 * @param {Object} options - 配置选项（大小、颜色等）
 * @returns {Object} 自定义图层对象
  ------------------------------------------------------------------------------------------------ */ 

// 2. 创建自定义图层 (GenAllCustomLayer)
function GenAllCustomLayer(map, route_elements, options = {}) {  
    // 解構賦值從 options 對象中提取參數，並設置默認值
    const {
        sizeX = 3, sizeY = 2, sizeZ = 2,  // 巴士模型的長寬高（默認分別為 3、2、2）
        color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6],  // 巴士的顏色（默認是淡藍色調的三種顏色）
        scaleSize = 1.4,  // 巴士模型的縮放比例（默認是 1.4）
        longitude = 113.54884000,  // 巴士起始經度（默認為特定經度）
        latitude = 22.16185000,  // 巴士起始緯度（默認為特定緯度）
        rotateX = 0, rotateY = 0, rotateZ = 0  // 巴士的旋轉角度（默認沒有旋轉）
    } = options; // 如果 `options` 中有這些值，它們會被解構賦值並用於覆蓋默認值

    // 從 route_elements 中提取巴士信息列表
    const busInfoList = route_elements.busInfoList;

    // 使用路線名稱和方向生成一個唯一的 ID，用於標識圖層
    const bus_name = `${route_elements.bus_name}_${route_elements.dir}`; // e.g., "route_1_0"

    // 調用 GenModelTransform 函數生成模型的變換矩陣（位置與旋轉） **确保巴士模型在地图上的初始方向是正确的。 兩個負 
    const modelTransform = GenModelTransform(longitude, latitude, rotateX, rotateY + Math.PI, rotateZ + Math.PI); //加入了Z, Y軸反轉180度 因為：Three.js 的 Y 軸是向下，而 Mapbox 的 Y 軸是向上

    // 定義自定義圖層對象，將巴士添加到 Mapbox 地圖中
    const customLayer = {
        // 定義圖層的唯一 ID，以巴士名稱和方向組成
        id: `bus_${bus_name}`,  // 不同路線和方向會有不同的 ID
        type: 'custom',  // 自定義圖層類型
        renderingMode: '3d',  // 指定渲染模式為 3D
        sizeX: sizeX,  // 傳遞巴士模型的 X 尺寸
        sizeY: sizeY,  // 傳遞巴士模型的 Y 尺寸
        sizeZ: sizeZ,  // 傳遞巴士模型的 Z 尺寸
        scaleSize: scaleSize,  // 傳遞巴士模型的縮放比例
        longitude: longitude,  // 傳遞巴士的經度位置
        latitude: latitude,  // 傳遞巴士的緯度位置

        // onAdd 方法會在圖層添加到地圖時調用，用於初始化 3D 場景和渲染器
        onAdd: function (map, gl) {
            // 初始化一個 Three.js 的相機對象
            this.camera = new THREE.Camera();

            // 初始化一個 Three.js 的場景對象，用於存儲 3D 對象（如巴士模型）
            this.scene = new THREE.Scene();

            // 初始化 popup
            if (!this.popup) {
                this.popup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });
            }

            // 調用 createBusMaterial 函數，根據巴士方向和顏色創建材質
            const material = createBusMaterial(route_elements.dir, color); // 生成巴士材質 - 创建輸出dir 0 1巴士的材质

            // 初始化一個空的巴士模型列表
            this.cube_list = [];

            // 遍歷每個巴士信息，創建對應的巴士模型（3D Box）並初始化
            for (const bus of busInfoList) {
                // 調用 createBusMesh 創建巴士的立方體網格
                const cube = createBusMesh(
                    sizeX, 
                    sizeY, 
                    sizeZ, 
                    scaleSize, 
                    material,
                    route_elements.bus_name,  // 添加巴士号
                    route_elements.dir        // 添加方向
                );

                // 初始化每個巴士的數據（位置、狀態等）
                initializeCubeData(cube, bus, longitude, latitude, route_elements.dir, map);

                // 將每個巴士模型添加到 cube_list 中
                this.cube_list.push(cube);
            }
            // 將所有巴士模型添加到 Three.js 場景中
            this.cube_list.forEach(cube => this.scene.add(cube));

            // 存儲 Mapbox 地圖對象，用於後續更新位置或觸發重繪
            this.map = map;

            // 使用 Mapbox 提供的 canvas，初始化 Three.js 的 WebGL 渲染器
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),  // 使用 Mapbox 的 canvas
                context: gl,  // 繼承 Mapbox 的 WebGL 上下文
                antialias: true  // 開啟抗鋸齒功能
            });
            this.renderer.autoClear = false;  // !!禁止自動清除畫布，以防影響 Mapbox 的渲染
            
            // 初始化事件處理
            this.route_elements = route_elements; // 保存路線信息
            initializeBusEvents(map, this, this.popup);
        },

        // render 方法會在每次地圖重繪時調用，用於渲染 3D 場景
        render: function (gl, matrix) {
            // 更新相机的投影矩阵
            this.camera.projectionMatrix = calculateCameraMatrix(matrix, modelTransform);
            
            // 始終渲染場景，確保巴士可見
            this.renderer.render(this.scene, this.camera);
        
            // 重置 Three.js 的内部状态
            this.renderer.state.reset();

            // 过滤掉已被移除的巴士
            this.cube_list = this.cube_list.filter(cube => !cube.userData.removed);

            // 更新巴士的位置
            this.cube_list.forEach(cube => renderUpdateCubePosition(cube, longitude, latitude));
        
            // 请求下一帧的渲染
            this.map.triggerRepaint();
        },
        // updateBusPositions 方法，用於更新巴士的位置信息
        updateBusPositions: async function (response_bus_data) {
            // 調用函數來處理巴士位置的更新
            await handleBusPositionUpdates(this, response_bus_data);
        }
    };

    // 返回定義好的自定義圖層對象
    return customLayer;
}


//  主程序入口
//  0. Filter Bus Lists 過濾巴士列表
//  1. 定義好所有巴士自定義圖層 customLayers all（每一層巴士號)
//  2. 第一次更新一次巴士位置
//  3. 每隔5秒更新一次巴士位置 -> updateBusPositions
export async function AddBusInMap(map, filter_bus_lists = [], bus_api_link) { // Mapbox地图实例，需要显示的巴士路线列表，巴士API地址，交通数据
    // 如果有历史数据功能，显示演示数据按钮
    if (typeof RunHistoryData !== 'undefined') {
        window.showMapButton('demo-data-button');
    }
    const bus_api_data = await fetch(bus_api_link).then(response => response.json()); // API獲取巴士數據

    const customLayers = [];
    
    //如果不為空，則會過濾掉那些不在array中bus
    const filteredBusListsData = filter_bus_lists.length > 0
        ? bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name))
        : bus_api_data;
    console.log("0. filteredBusListsData:使用所有的巴士數量",filteredBusListsData)
    // AddMarkerData(map, filteredBusListsData)
    for (const route_elements of filteredBusListsData) {
        //for loop生成所有的customLayer
        const customLayer = GenAllCustomLayer(map, route_elements, {
            sizeX: 6, sizeY: 4, sizeZ: 4,
            color: [0xFFFFFF, route_elements.color[0], route_elements.color[0]],
            scaleSize: 5 //車大小
        });
        map.addLayer(customLayer, 'waterway-label'); //將生成的自定義圖層添加到Mapbox地圖中。
        map.moveLayer(customLayer.id); //確保自定義圖層的渲染順序 到最上。
        customLayers.push(customLayer); //將每個自定義圖層存儲到customLayers列表中，方便後續更新巴士的位置。
    }
    console.log("1. 定義好所有巴士自定義圖層 customLayers all（每一層巴士號）:",customLayers)

    // 第一次更新一次巴士位置
    const response_bus_data = await fetch(bus_api_link).then(response => response.json()); // API獲取巴士數據
    customLayers.forEach(layer => layer.updateBusPositions(response_bus_data)); // for loop 所有巴士號圖層更新巴士位置
    // 每隔5秒更新一次巴士位置
    setInterval(async () => {
        console.log("每5秒更新一次巴士位置");
        const response_bus_data = await fetch(bus_api_link).then(response => response.json());
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
    }, 5000);

    // 創建並添加更新按鈕  和每隔5秒更新一次巴士位置 只能有一個
    // const updateButton = createUpdateBusButton(customLayers, bus_api_link);
    // map.getContainer().appendChild(updateButton);
}


