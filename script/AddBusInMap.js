// 1. 基底 生成模型的变换对象，用于描述模型在地图上的位置和旋转角度 
function GenModelTransform(longitude = 113.54884000, latitude = 22.16185000, rotateX = 0, rotateY = 0, rotateZ = 0) {
    const modelOrigin = [longitude, latitude]; // 定义地图中心点
    const modelAltitude = 0;
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
    );
    // 构建模型的变换矩阵，包括位置（X,Y,Z坐标）和旋转角度
    const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: rotateX,
        rotateY: rotateY,
        rotateZ: rotateZ,
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };
    return modelTransform;
}

// 1. 基底 创建巴士的几何体和材质
function createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material) {
    // 创建一个三维立方体作为巴士的模型
    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const busMesh = new THREE.Mesh(geometry, material);
    busMesh.scale.set(scaleSize, scaleSize, scaleSize);
    busMesh.frustumCulled = false; // 禁用视锥体剔除
    return busMesh;
}


// 1. 基底 创建輸出dir 0 1巴士的材质
function createBusMaterial(dir, color) {
    let material = [];
    if (dir == 0) {
        material = [
            new THREE.MeshBasicMaterial({ color: color[0] }),
            new THREE.MeshBasicMaterial({ color: color[0] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[2] }),
            new THREE.MeshBasicMaterial({ color: color[2] })
        ];
    } else {
        material = [
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[0] }),
            new THREE.MeshBasicMaterial({ color: color[0] })
        ];
    }
    return material;
}
// 设置立方体的朝向，使其朝向目标方向
function setCubeOrientation(cube, fromPosition, toPosition) {
    // 计算方向向量
    const dx = toPosition.x - fromPosition.x;
    const dy = toPosition.y - fromPosition.y;

    // 检查是否有移动，避免除以零
    if (dx === 0 && dy === 0) {
        // 没有移动，不更新旋转
        return;
    }

    // 计算朝向角度（弧度）
    const angle = Math.atan2(dy, dx);

    // 设置立方体的旋转（仅在 Z 轴旋转）
    cube.rotation.z = angle;

    // 存储最终的旋转角度
    cube.userData.finalRotation = angle;
}


// 2. 巴士 初始化每个巴士的位置等数据 set position
function initializeCubeData(cube, busInfo, longitude, latitude, dir) {
    const initialPosition = calculateDistanceInDirection(parseFloat(busInfo.longitude), parseFloat(busInfo.latitude), longitude, latitude);
    cube.userData = {
        source_position: [parseFloat(busInfo.longitude), parseFloat(busInfo.latitude)],
        initialPosition: initialPosition,
        targetPosition: initialPosition.slice(), // 初始化为 initialPosition 的副本
        busPlate: busInfo.busPlate,
        busDir: dir,
        busSpeed: busInfo.speed,
        deltaPosition: [], // 初始化为空数组
        animation_number: [], // 初始化为空数组
        currentStep: 0
    };
    console.log("cube.userData:",cube.userData)
    cube.position.set(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0);
}

// 2. 巴士 更新巴士的位置函数：更新立方体位置
function updateCubePosition(cube) {
    // 提取位置增量和动画帧数
    const deltaPositions = cube.userData.deltaPosition;  
    const animationNumbers = cube.userData.animation_number;

    // 检查是否需要更新位置
    if (!deltaPositions || deltaPositions.length === 0) {
        // 没有位置增量，表示位置未变化，不更新位置和旋转
        return;
    }

    // 获取当前步骤
    let currentStep = cube.userData.currentStep || 0;

    // 检查是否已完成所有路段的动画
    if (currentStep >= deltaPositions.length) {
        // 动画结束，确保位置和朝向已更新到目标值
        if (cube.userData.targetPosition) {
            cube.position.y = cube.userData.targetPosition[0];
            cube.position.x = -cube.userData.targetPosition[1];
            // 设置朝向为最后一次计算的角度
            cube.rotation.z = cube.userData.finalRotation || cube.rotation.z;
        } else {
            console.error("cube.userData.targetPosition is null or undefined.");
        }
        return;
    }

    // 如果当前路段还有动画帧需要执行
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

            // 更新 previousPosition
            cube.userData.previousPosition = newPosition;

            // 减少当前步骤的帧数
            animationNumbers[currentStep] -= 1;
        } else {
            console.error("delta is null or undefined.");
        }
    } else {
        // 当前路段完成，进入下一路段
        cube.userData.currentStep += 1;
    }
}





// 2. 巴士 处理巴士位置的更新
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

    // layer.renderer.render(layer.scene, layer.camera);
    // layer.map.triggerRepaint(); // 通知 Mapbox 需要觸發下一幀的重繪
}

// 2. 巴士 更新图层中的巴士立方体
async function updateLayerCubes(layer, currentBusData) {
    // 创建当前层中的立方体列表的副本，用于进一步操作，避免直接修改原始数据
    const custom_cube_list = layer.cube_list.slice();  
    console.log("打印当前层中的立方体列表:", custom_cube_list);  // 打印当前层中的立方体列表
    console.log("打印当前从API获得的巴士数据:", currentBusData, currentBusData[0].busInfoList.length);  // 打印当前从API获得的巴士数据
    custom_cube_check_list = custom_cube_list.slice()
    
    // 遍历API返回的每一个巴士数据
    for (const busData of currentBusData) {  // 遍历最新API的数据
        const busInfoList = busData.busInfoList;  // 提取API数据中的巴士信息列表
        const cube_item_dir = busData.dir;  // 提取API中的方向信息（如巴士的行驶方向）
        
        // 遍历API中每个巴士的信息
        for (const newBusInfo of busInfoList) {  // 遍历每个巴士信息
            // 使用更新或添加立方体的函数，更新或添加相应的巴士立方体
            newBusInfo.color = [busData.color[0],busData.color[1]]
            const updatedCube = updateOrAddCube(layer, newBusInfo, cube_item_dir); 
            if (updatedCube) {
                // 如果車子更新成功(即還在路上)，则筛选出 custom_cube_list 中需要排除的還在路上巴士立方体
                custom_cube_check_list = custom_cube_check_list.filter(item => item.userData.busPlate !== updatedCube.userData.busPlate);
            }
        }
        // 移除不在新API数据中的巴士立方体
        console.log("打印筛选后的立方体列表:", custom_cube_check_list);  // 打印筛选后的立方体列表
        removeAbsentCubes(layer, custom_cube_check_list, cube_item_dir);  // 调用移除函数删除不存在的立方体
    }
    
}

// 2. 巴士 更新或添加巴士立方体
function updateOrAddCube(layer, busInfo, dir) {
    // 查找当前层中是否有与巴士牌号和方向相匹配的立方体
    const existingCube = layer.cube_list.find(cube => cube.userData.busPlate === busInfo.busPlate && cube.userData.busDir === dir);
    // 如果找到了现有的立方体，更新其信息
    if (existingCube) {
        updateExistingCube(existingCube, busInfo, layer.longitude, layer.latitude);
        return existingCube; // 返回更新后的立方体
    } else {
        // 如果没有找到现有的立方体，则添加一个新的立方体到层中
        console.log("addNewCubeToLayer")
        addNewCubeToLayer(layer, busInfo, dir, layer.sizeX, layer.sizeY, layer.sizeZ, layer.scaleSize, layer.longitude, layer.latitude);
        return null; // 返回null表示没有更新，而是添加了新的立方体
    }
}

// 2. 巴士 更新已存在的立方体
function updateExistingCube(cube, newBusInfo, longitude, latitude) {
    console.log("需要移动的巴士：", newBusInfo);

    // 获取当前立方体的位置（注意坐标转换）
    const currentPosition = [cube.position.y, -cube.position.x];

    // 计算新的目标位置（转换为 Three.js 坐标系）
    const targetPosition = calculateDistanceInDirection(
        parseFloat(newBusInfo.longitude),
        parseFloat(newBusInfo.latitude),
        longitude,
        latitude
    );

    // 检查新旧位置是否相同
    const positionUnchanged = 
        Math.abs(targetPosition[0] - currentPosition[0]) < 0.0001 &&
        Math.abs(targetPosition[1] - currentPosition[1]) < 0.0001;

    if (positionUnchanged) {
        // 如果位置没有变化，不更新动画参数
        console.log("位置未变化，保持原状");
        return;
    }

    const animation_number = 500;  // 定义动画的总帧数180

    // 计算每一帧的位置增量
    const deltaY = (targetPosition[0] - currentPosition[0]) / animation_number;
    const deltaX = (targetPosition[1] - currentPosition[1]) / animation_number;

    // 设置用户数据，用于在 updateCubePosition 中使用
    cube.userData.deltaPosition = [[deltaY, deltaX]];  // 存储位置增量
    cube.userData.animation_number = [animation_number];  // 存储对应的动画帧数
    cube.userData.currentStep = 0;  // 重置当前步骤

    // 更新其他用户数据
    cube.userData.initialPosition = currentPosition;
    cube.userData.targetPosition = targetPosition;
    cube.userData.source_position = [parseFloat(newBusInfo.longitude), parseFloat(newBusInfo.latitude)];
    cube.userData.busSpeed = newBusInfo.speed;
    cube.userData.calcPointsRangeNum = 0;

    // 初始化 previousPosition
    cube.userData.previousPosition = { x: -currentPosition[1], y: currentPosition[0] };

    console.log("updateExistingCube:", cube.userData);
}



// 2. 巴士 添加新的立方体到图层
function addNewCubeToLayer(layer, newBusInfo, dir, sizeX, sizeY, sizeZ, scaleSize, longitude, latitude) {
    console.log("需要新增的巴士：", newBusInfo);
    const material = createBusMaterial(dir, [0xFFFFFF, newBusInfo.color[0], newBusInfo.color[1]]);
    const newCube = createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material);
    initializeCubeData(newCube, newBusInfo, longitude, latitude, dir);
    layer.scene.add(newCube);
    layer.cube_list.push(newCube);
    layer.renderer.render(layer.scene, layer.camera);
    layer.map.triggerRepaint();
}

// 2. 巴士 移除不存在的立方体
function removeAbsentCubes(layer, cubeList, dir) {
    if (cubeList.length > 0 && cubeList[0].userData.busDir == dir) {
        for (const cube of cubeList) {
            console.log("需要删除的巴士：", cube.userData);
            layer.scene.remove(cube);
            layer.cube_list = layer.cube_list.filter(item => item.userData.busPlate !== cube.userData.busPlate);
        }
    }
}

// 3. mapbox layer 生成自定义图层，添加到地图中
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

    // 調用 GenModelTransform 函數生成模型的變換矩陣（位置與旋轉）
    const modelTransform = GenModelTransform(longitude, latitude, rotateX, rotateY + Math.PI, rotateZ + Math.PI); //加入了Z, Y軸反轉180度

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


            // 調用 createBusMaterial 函數，根據巴士方向和顏色創建材質
            const material = createBusMaterial(route_elements.dir, color);

            // 初始化一個空的巴士模型列表
            this.cube_list = [];

            // 遍歷每個巴士信息，創建對應的巴士模型（3D Box）並初始化
            for (const bus of busInfoList) {
                // 調用 createBusMesh 創建巴士的立方體網格
                const cube = createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material);

                // 初始化每個巴士的數據（位置、狀態等）
                initializeCubeData(cube, bus, longitude, latitude, route_elements.dir);

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
            this.renderer.autoClear = false;  // 禁止自動清除畫布，以防影響 Mapbox 的渲染
            
        },

        // render 方法會在每次地圖重繪時調用，用於渲染 3D 場景
        render: function (gl, matrix) {

            // 更新相机的投影矩阵
            this.camera.projectionMatrix = calculateCameraMatrix(matrix, modelTransform);
        
            // 渲染场景
            this.renderer.render(this.scene, this.camera);
        
            // 重置 Three.js 的内部状态
            this.renderer.state.reset();

            // 更新巴士的位置
            this.cube_list.forEach(cube => updateCubePosition(cube));
        
            // 请求下一帧的渲染
            this.map.triggerRepaint();
        },
        // updateBusPositions 方法，用於更新巴士的位置信息
        updateBusPositions: async function (response_bus_data) {
            // 調用 handleBusPositionUpdates 函數來處理巴士位置的更新
            await handleBusPositionUpdates(this, response_bus_data);
        }
    };

    // 返回定義好的自定義圖層對象
    return customLayer;
}


// 4. 功能 计算相机矩阵
function calculateCameraMatrix(matrix, modelTransform) {

    const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
    );
    const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
    );
    const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
    );

    const m = new THREE.Matrix4().fromArray(matrix);
    const l = new THREE.Matrix4()
        .makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ
        )
        .scale(
            new THREE.Vector3(
                modelTransform.scale,
                -modelTransform.scale,
                modelTransform.scale
            )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

    return m.multiply(l);
}

// 4. 功能 计算每个阶段的位置增量 暫不用
function calculateDeltaPositions(pointsRange, animation_number, longitude, latitude) {
    const deltaPositions = [];
    if (pointsRange.length > 0) {
        for (let i = 0; i < pointsRange.length - 1; i++) {
            const start = calculateDistanceInDirection(parseFloat(pointsRange[i][0]), parseFloat(pointsRange[i][1]), longitude, latitude);
            const end = calculateDistanceInDirection(parseFloat(pointsRange[i + 1][0]), parseFloat(pointsRange[i + 1][1]), longitude, latitude);
            const delta = [
                (end[0] - start[0]) / animation_number,
                (end[1] - start[1]) / animation_number
            ];
            deltaPositions.push(delta);
        }
    }
    return deltaPositions;
}

//4. 功能 辅助函数：计算两点之间Three坐標系x,y的距离（经纬度转换为平面坐标）
function calculateDistanceInDirection(lon1, lat1, lon2, lat2) {
    const dLat = lat2 - lat1; // 纬度差
    const dLon = lon2 - lon1; // 经度差
    const distanceLat = dLat * 111194; // 纬度方向上的实际移动距离（米）
    const avgLat = (lat1 + lat2) / 2; // 平均纬度
    //每一度經度在赤道附近的距離為 40030 / 360 = 111.194公里。 這是一個非常精確的值，但在許多場合為了簡化計算，我們使用了稍大一點的值 111.320公里作為近似值。
    const distanceLon = dLon * 111194 * Math.cos(avgLat * Math.PI / 180); // 經度方向上的實際移動距離（公里）
    return [distanceLat, distanceLon];// 返回以米为单位的结果
}

// 4. 功能 获取范围内的点（根据实际情况实现） 暫不用
function getPointsBetweenRange(pointA, pointB, route_traffic_data_use) {
    pointA = [parseFloat(pointA[0]).toFixed(8), parseFloat(pointA[1]).toFixed(8)];
    pointB = [parseFloat(pointB[0]).toFixed(8), parseFloat(pointB[1]).toFixed(8)];

    const coordinateTuples = route_traffic_data_use.coordinate.map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
    const indexA = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) === pointA[0] && parseFloat(coord[1]).toFixed(8) === pointA[1]);
    const indexB = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) === pointB[0] && parseFloat(coord[1]).toFixed(8) === pointB[1]);

    if (indexA === -1 || indexB === -1 || isNaN(indexA) || isNaN(indexB)) {
        console.error("Error: Points not found in route data. Using direct points.");
        return [pointA, pointB];
    }

    if (indexA === indexB) {
        return [];
    } else {
        return route_traffic_data_use.coordinate.slice(Math.min(indexA, indexB), Math.max(indexA, indexB) + 1);
    }
}

// 5. 數據 过滤当前图层的巴士数据
function filterCurrentBusData(response_bus_data, routeNum, dir) {
    return response_bus_data.filter(item => item.bus_name === routeNum && item.dir.toString() === dir);
}

// 0. 主程式 添加巴士到地图上----------------------------------------------------------------------
async function AddBusInMap(map, filter_bus_lists = [], bus_api_link) {
    const bus_api_data = await fetch(bus_api_link).then(response => response.json());

    const customLayers = [];
    
    //如果不為空，則會過濾掉那些不在array中bus
    const filteredBusListsData = filter_bus_lists.length > 0
        ? bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name))
        : bus_api_data;
    console.log("1. filteredBusListsData:",filteredBusListsData)
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
    console.log("1. customLayers all:",customLayers)

    // 第一次更新一次巴士位置
    const response_bus_data = await fetch(bus_api_link).then(response => response.json());
    customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
    // 每隔5秒更新一次巴士位置
    setInterval(async () => {
        const response_bus_data = await fetch(bus_api_link).then(response => response.json());
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
    }, 5000);
}


