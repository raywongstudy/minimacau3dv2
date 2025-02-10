// 此檔負責模型與相機變換的相關函式

// 產生模型的變換參數 (位置、旋轉、縮放)
export function GenModelTransform(longitude = 113.54884000, latitude = 22.16185000, rotateX = 0, rotateY = 0, rotateZ = 0) {
    const modelOrigin = [longitude, latitude]; 
    const modelAltitude = 0;
    // 由經緯度轉換成墨卡托投影座標
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);
    
    // 封裝模型的變換資料
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

// 根據傳入的 matrix 及 modelTransform 計算相機矩陣
export function calculateCameraMatrix(matrix, modelTransform) {
    const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), modelTransform.rotateX);
    const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), modelTransform.rotateY);
    const rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), modelTransform.rotateZ);

    const m = new THREE.Matrix4().fromArray(matrix);
    const l = new THREE.Matrix4()
        .makeTranslation(modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ)
        .scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

    return m.multiply(l);
}
