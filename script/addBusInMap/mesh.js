// 此檔案用於建立巴士的 3D 模型 (Box) 和初始化其資料
import { calculateDistanceInDirection } from './utils.js';

export function createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material) {
    // 使用 BoxGeometry 建立立方體作為巴士模型
    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const busMesh = new THREE.Mesh(geometry, material);
    busMesh.scale.set(scaleSize, scaleSize, scaleSize);
    busMesh.frustumCulled = false; // 禁用視錐剔除，確保物件永遠被渲染
    return busMesh;
}

export function initializeCubeData(cube, busInfo, longitude, latitude, dir) {
    // 計算初始位置 (Three.js 座標)
    const initialPosition = calculateDistanceInDirection(
        parseFloat(busInfo.longitude),
        parseFloat(busInfo.latitude),
        longitude,
        latitude
    );

    // 將巴士資訊存入 cube 的 userData 中
    cube.userData = {
        source_position: [parseFloat(busInfo.longitude), parseFloat(busInfo.latitude)],
        initialPosition: initialPosition,
        targetPosition: initialPosition.slice(),
        busPlate: busInfo.busPlate,
        busDir: dir,
        busSpeed: busInfo.speed,
        deltaPosition: [],
        animation_number: [],
        currentStep: 0
    };
    console.log("cube.userData:", cube.userData)

    // 將 cube 放到對應座標位置 (y = lat方向, x = lon方向)
    cube.position.set(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0);
}
