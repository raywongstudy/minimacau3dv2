import { setCubeOrientation } from './orientation.js';
import { calculateDistanceInDirection, filterCurrentBusData } from './utils.js';
import { createBusMesh, initializeCubeData } from './mesh.js';
import { createBusMaterial } from './materials.js';

// 更新單一 cube(巴士) 的位置
export function updateCubePosition(cube) {
    const deltaPositions = cube.userData.deltaPosition;  
    const animationNumbers = cube.userData.animation_number;

    // 沒有增量就不需要更新
    if (!deltaPositions || deltaPositions.length === 0) {
        return;
    }

    let currentStep = cube.userData.currentStep || 0;

    // 若已達最後一個 step，將位置設為目標位置並結束
    if (currentStep >= deltaPositions.length) {
        if (cube.userData.targetPosition) {
            cube.position.y = cube.userData.targetPosition[0];
            cube.position.x = -cube.userData.targetPosition[1];
            cube.rotation.z = cube.userData.finalRotation || cube.rotation.z;
        } else {
            console.error("cube.userData.targetPosition is null or undefined.");
        }
        return;
    }

    // 還有動畫幀數要執行
    if (animationNumbers[currentStep] > 0) {
        const delta = deltaPositions[currentStep];
        if (delta) {
            const prevPosition = { x: cube.position.x, y: cube.position.y };
            // 更新位置
            cube.position.y += delta[0];
            cube.position.x -= delta[1];

            const newPosition = { x: cube.position.x, y: cube.position.y };
            // 設定朝向
            setCubeOrientation(cube, prevPosition, newPosition);

            // 更新此 step 剩餘幀數
            animationNumbers[currentStep] -= 1;
        } else {
            console.error("delta is null or undefined.");
        }
    } else {
        // 此 step 完成，進入下一個 step
        cube.userData.currentStep += 1;
    }
}

// 處理巴士位置的更新
export async function handleBusPositionUpdates(layer, response_bus_data) {
    const customLayerIdData = layer.id.split("_");
    const customLayerDir = customLayerIdData[customLayerIdData.length - 1];
    const customLayerNum = customLayerIdData[customLayerIdData.length - 2];
    console.log(`\n=============== 更新巴士位置 ${customLayerNum}號車 - 方向：${customLayerDir} ==============`);

    // 過濾出當前圖層對應的巴士資料
    const currentBusData = filterCurrentBusData(response_bus_data, customLayerNum, customLayerDir);

    console.log(`${customLayerNum}号车场景中巴士数量:`, layer.scene.children.length);
    await updateLayerCubes(layer, currentBusData);
}

// 更新圖層中所有巴士立方體位置
export async function updateLayerCubes(layer, currentBusData) {
    const custom_cube_list = layer.cube_list.slice();  
    console.log("打印当前层中的立方体列表:", custom_cube_list);
    console.log("打印当前从API获得的巴士数据:", currentBusData, currentBusData[0].busInfoList.length);
    let custom_cube_check_list = custom_cube_list.slice();

    // 遍歷 API 回傳的巴士資料
    for (const busData of currentBusData) {
        const busInfoList = busData.busInfoList;  
        const cube_item_dir = busData.dir;  
        
        for (const newBusInfo of busInfoList) {
            // 新巴士顏色
            newBusInfo.color = [busData.color[0],busData.color[1]]
            const updatedCube = updateOrAddCube(layer, newBusInfo, cube_item_dir); 
            if (updatedCube) {
                // 若找到已有的巴士並更新成功，則從待刪除清單中移除
                custom_cube_check_list = custom_cube_check_list.filter(item => item.userData.busPlate !== updatedCube.userData.busPlate);
            }
        }

        console.log("打印筛选后的立方体列表:", custom_cube_check_list);
        removeAbsentCubes(layer, custom_cube_check_list, cube_item_dir);
    }
}

// 嘗試更新現有的巴士立方體，若不存在則新增
export function updateOrAddCube(layer, busInfo, dir) {
    const existingCube = layer.cube_list.find(cube => cube.userData.busPlate === busInfo.busPlate && cube.userData.busDir === dir);
    if (existingCube) {
        updateExistingCube(existingCube, busInfo, layer.longitude, layer.latitude);
        return existingCube;
    } else {
        addNewCubeToLayer(layer, busInfo, dir, layer.sizeX, layer.sizeY, layer.sizeZ, layer.scaleSize, layer.longitude, layer.latitude);
        return null;
    }
}

// 更新已存在的巴士立方體位置
export function updateExistingCube(cube, newBusInfo, longitude, latitude) {
    // console.log("需要移动的巴士：", newBusInfo);

    // 取得目前位置
    const currentPosition = [cube.position.y, -cube.position.x];
    // 計算目標位置
    const targetPosition = calculateDistanceInDirection(
        parseFloat(newBusInfo.longitude),
        parseFloat(newBusInfo.latitude),
        longitude,
        latitude
    );

    // 如果目標位置與現在位置相同，則不執行動畫
    const positionUnchanged = 
        Math.abs(targetPosition[0] - currentPosition[0]) < 0.0001 &&
        Math.abs(targetPosition[1] - currentPosition[1]) < 0.0001;

    if (positionUnchanged) {
        console.log("位置未变化，保持原状");
        return;
    }

    // 定義動畫幀數
    const animation_number = 500;
    const deltaY = (targetPosition[0] - currentPosition[0]) / animation_number;
    const deltaX = (targetPosition[1] - currentPosition[1]) / animation_number;

    cube.userData.deltaPosition = [[deltaY, deltaX]];
    cube.userData.animation_number = [animation_number];
    cube.userData.currentStep = 0; 
    cube.userData.initialPosition = currentPosition;
    cube.userData.targetPosition = targetPosition;
    cube.userData.source_position = [parseFloat(newBusInfo.longitude), parseFloat(newBusInfo.latitude)];
    cube.userData.busSpeed = newBusInfo.speed;
    cube.userData.calcPointsRangeNum = 0;
    cube.userData.previousPosition = { x: -currentPosition[1], y: currentPosition[0] };

    console.log("updateExistingCube:", cube.userData);
}

// 新增一個新的巴士立方體到圖層中
export function addNewCubeToLayer(layer, newBusInfo, dir, sizeX, sizeY, sizeZ, scaleSize, longitude, latitude) {
    console.log("需要新增的巴士：", newBusInfo);
    const material = createBusMaterial(dir, [0xFFFFFF, newBusInfo.color[0], newBusInfo.color[1]]);
    const newCube = createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material);
    initializeCubeData(newCube, newBusInfo, longitude, latitude, dir);
    layer.scene.add(newCube);
    layer.cube_list.push(newCube);
    layer.renderer.render(layer.scene, layer.camera);
    layer.map.triggerRepaint();
}

// 移除在新資料中不存在的巴士立方體
export function removeAbsentCubes(layer, cubeList, dir) {
    if (cubeList.length > 0 && cubeList[0].userData.busDir == dir) {
        for (const cube of cubeList) {
            console.log("需要删除的巴士：", cube.userData);
            layer.scene.remove(cube);
            layer.cube_list = layer.cube_list.filter(item => item.userData.busPlate !== cube.userData.busPlate);
        }
    }
}
