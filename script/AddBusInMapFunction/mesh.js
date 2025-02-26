/**
 * 此文件包含创建3D巴士模型的相关函数
 * - createBusMesh: 创建巴士的3D网格模型,包括几何体和缩放
 * - createBusMaterial: 根据巴士行驶方向创建不同颜色的材质
 * - createWheels: 创建巴士的轮子
 * - createWindows: 创建巴士的窗户
 */

// import * as THREE from 'three';

// 创建巴士的几何体和材质
export function createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material, busNumber, direction) {
    // console.log("createBusMesh:",sizeX, sizeY, sizeZ, scaleSize, material, busNumber, direction)
    // 创建一个组来容纳所有的部件
    const busGroup = new THREE.Group();
    // 添加组的名称，格式为：bus_[巴士号]_[方向]_busGroup
    busGroup.name = `bus_${busNumber}_${direction}_busGroup`; 

    // 创建巴士主体 - 使用圆角矩形
    const bodyGeometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ * 0.8); // 车身高度稍低
    const bodyMesh = new THREE.Mesh(bodyGeometry, material);
    bodyMesh.name = `bus_${busNumber}_${direction}_bodyMesh`;
    bodyMesh.position.set(0, 0, -sizeZ * 0.1); // 车身稍微下移
    
    // 为车身添加边框线
    const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
    const bodyLine = new THREE.LineSegments(
        bodyEdges,
        new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 5 }) // 黑色边框
    );
    bodyMesh.add(bodyLine);
    
    busGroup.add(bodyMesh);
    
    // 创建车顶 - 稍微小一点的矩形
    const roofGeometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ * 0.1);
    // const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // 深灰色车顶
    const roofMaterial = material; // 使用與車身相同的材質车顶
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.name = `bus_${busNumber}_${direction}_roofMesh`;
    roofMesh.position.set(0, 0, -sizeZ * 0.5); // 放在车身下方
    
    busGroup.add(roofMesh);

    // 添加巴士号码到车顶
    const busNumberSize = sizeX * 0.4; // 增加巴士号码大小
    const busNumberCanvas = document.createElement('canvas');
    const busNumberContext = busNumberCanvas.getContext('2d');
    busNumberCanvas.width = 350; // 增加画布宽度
    busNumberCanvas.height = 150;
    busNumberContext.clearRect(0, 0, 350, 150); // 清除背景，使其透明
    busNumberContext.font = 'bold 150px Arial'; // 增加字体大小
    busNumberContext.textAlign = 'center';
    busNumberContext.textBaseline = 'middle';
    busNumberContext.fillStyle = '#ffffff'; // 黑色文字
    busNumberContext.fillText(busNumber.toString(), 150, 64); // 巴士号码大小
    
    const busNumberTexture = new THREE.CanvasTexture(busNumberCanvas);
    const busNumberMaterial = new THREE.MeshBasicMaterial({ 
        map: busNumberTexture,
        transparent: true // 保持透明
    });
    const busNumberGeometry = new THREE.PlaneGeometry(busNumberSize, busNumberSize * 0.5); // 调整几何体比例
    const busNumberMesh = new THREE.Mesh(busNumberGeometry, busNumberMaterial);
    busNumberMesh.name = `bus_${busNumber}_${direction}_numberMesh`;
    busNumberMesh.rotation.y = -Math.PI;
    busNumberMesh.position.set(0, 0, -sizeZ * 0.6);
    busGroup.add(busNumberMesh);
    
    // 添加轮子 - 更真实的轮子
    const wheelRadius = sizeZ * 0.18; // 轮子半径稍小
    const wheelThickness = sizeY * 0.06; // 轮子厚度
    // 负数表示车身内侧，正数表示车身外侧
    const wheelPositions = [
        [sizeX * 0.35, -sizeY/2 - wheelThickness/2, sizeZ * 0.25],   // 左前
        [-sizeX * 0.35, -sizeY/2 - wheelThickness/2, sizeZ * 0.25],  // 左后
        [sizeX * 0.35, sizeY/2 + wheelThickness/2, sizeZ * 0.25],    // 右前
        [-sizeX * 0.35, sizeY/2 + wheelThickness/2, sizeZ * 0.25]    // 右后
    ];
    wheelPositions.forEach((position, index) => {
        const wheel = createWheel(wheelRadius, wheelThickness);
        wheel.name = `bus_${busNumber}_${direction}_wheel_${index}`;
        wheel.position.set(...position);
        busGroup.add(wheel);
    });

    // 添加前窗（挡风玻璃）
    const frontWindowWidth = sizeX * 0.3;  // 前窗宽度
    const frontWindowHeight = sizeZ * 0.5; // 前窗高度
    const frontWindowDepth = sizeY * 0.02;  // 前窗深度
    const frontWindow = createFrontWindow(frontWindowWidth, frontWindowHeight, frontWindowDepth);
    frontWindow.name = `bus_${busNumber}_${direction}_frontWindow`;
    frontWindow.position.set(sizeX/2 + frontWindowDepth/2, 0, -sizeZ * 0.2); // 位于车头上部
    busGroup.add(frontWindow);

    // 添加侧窗 - 更多的窗户，排列更整齐
    const sideWindowWidth = sizeX * 0.15;   // 窗户宽度
    const sideWindowHeight = sizeZ * 0.4;   // 窗户高度
    const sideWindowDepth = sizeY * 0.03;   // 窗户厚度
    const sideWindowSpacing = sizeX * 0.22; // 窗户间距
    const windowStartPos = -sizeX * 0.3;    // 第一个窗户的起始位置

    // 左侧窗
    for (let i = 0; i < 3; i++) {
        const windowMesh = createSideWindow(sideWindowWidth, sideWindowHeight, sideWindowDepth);
        windowMesh.name = `bus_${busNumber}_${direction}_sideWindow_left_${i}`;
        windowMesh.position.set(windowStartPos + i * sideWindowSpacing, -sizeY/2 - sideWindowDepth/2, -sizeZ * 0.2); // 左侧窗 厚度在y軸
        busGroup.add(windowMesh);
    }

    // 右侧窗
    for (let i = 0; i < 3; i++) {
        const windowMesh = createSideWindow(sideWindowWidth, sideWindowHeight, sideWindowDepth);
        windowMesh.name = `bus_${busNumber}_${direction}_sideWindow_right_${i}`;
        windowMesh.position.set(windowStartPos + i * sideWindowSpacing, sizeY/2 + sideWindowDepth/2, -sizeZ * 0.2);
        busGroup.add(windowMesh);
    }

    // 添加前车灯
    const headlightRadius = sizeZ * 0.1;
    const headlightGeometry = new THREE.SphereGeometry(headlightRadius, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc }); // 淡黄色灯光
    
    // 左前灯
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.name = `bus_${busNumber}_${direction}_leftHeadlight`;
    leftHeadlight.position.set(sizeX/2, -sizeY/4, sizeZ * 0.1);
    leftHeadlight.rotation.y = Math.PI / 2;
    busGroup.add(leftHeadlight);
    
    // 右前灯
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.name = `bus_${busNumber}_${direction}_rightHeadlight`;
    rightHeadlight.position.set(sizeX/2, sizeY/4, sizeZ * 0.1);
    rightHeadlight.rotation.y = Math.PI / 2;
    busGroup.add(rightHeadlight);

    // 添加车牌
    const licensePlateWidth = sizeY * 0.4;
    const licensePlateHeight = sizeZ * 0.15;
    const licensePlateDepth = 0.01;
    const licensePlateGeometry = new THREE.BoxGeometry(licensePlateDepth, licensePlateWidth, licensePlateHeight);
    const licensePlateMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 白色车牌
    
    // 前车牌
    const frontLicensePlate = new THREE.Mesh(licensePlateGeometry, licensePlateMaterial);
    frontLicensePlate.name = `bus_${busNumber}_${direction}_frontLicensePlate`;
    frontLicensePlate.position.set(sizeX/2 + 0.01, 0, 0);
        
    busGroup.add(frontLicensePlate);
    
    // 后车牌
    const rearLicensePlate = new THREE.Mesh(licensePlateGeometry, licensePlateMaterial);
    rearLicensePlate.name = `bus_${busNumber}_${direction}_rearLicensePlate`;
    rearLicensePlate.position.set(-sizeX/2 - 0.01, 0, 0);
    rearLicensePlate.rotation.y = Math.PI;

    busGroup.add(rearLicensePlate);

    // 设置整体缩放
    busGroup.scale.set(scaleSize, scaleSize, scaleSize);

    return busGroup;
}

// 创建轮子
function createWheel(radius, thickness) { 
    const wheelGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 24);
    const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 }); // 深黑色轮胎
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    
    // 添加轮毂
    const hubRadius = radius * 0.6;
    const hubGeometry = new THREE.CylinderGeometry(hubRadius, hubRadius, thickness + 0.01, 8);
    const hubMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 }); // 灰色轮毂
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    wheel.add(hub);
    
    // 旋转轮子使其平放
    wheel.rotation.x = Math.PI ;
    
    return wheel;
}

// 创建前窗
function createFrontWindow(width, height, depth) {
    const windowGeometry = new THREE.BoxGeometry(depth, width, height);
    const windowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x88aaff, 
        transparent: true, 
        opacity: 0.7 
    }); // 半透明蓝色玻璃
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        
    return windowMesh;
}

// 创建侧窗（车身左右）
function createSideWindow(width, height, depth) {
    const windowGeometry = new THREE.BoxGeometry(width, depth, height);
    const windowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x88aaff, 
        transparent: true, 
        opacity: 0.7 
    }); // 半透明蓝色玻璃
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    
    
    return windowMesh;
}

// 创建輸出dir 0 1巴士的材质
export function createBusMaterial(dir, color) {
    let material = [];
    if (dir == 0) {
        material = [
            new THREE.MeshBasicMaterial({ color: color[0] }), // 车头
            new THREE.MeshBasicMaterial({ color: color[0] }), // 车头
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[2] }), // 车身
            new THREE.MeshBasicMaterial({ color: color[2] })  // 车身
        ];
    } else {
        material = [
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[1] }), // 车尾
            new THREE.MeshBasicMaterial({ color: color[0] }), // 车头
            new THREE.MeshBasicMaterial({ color: color[0] })  // 车头
        ];
    }
    return material;
}
