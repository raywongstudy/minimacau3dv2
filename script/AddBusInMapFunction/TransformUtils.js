/**
 * 此文件包含3D变换相关的工具函数
 * - calculateCameraMatrix: 计算相机投影矩阵
 * - setCubeOrientation: 设置物体朝向
 */

/**
 * 计算相机投影矩阵
 * @param {Array} matrix - Mapbox提供的投影矩阵
 * @param {Object} modelTransform - 模型变换参数
 * @returns {THREE.Matrix4} 计算后的相机矩阵
 */
export function calculateCameraMatrix(matrix, modelTransform) {
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

/**
 * 设置立方体的朝向
 * @param {THREE.Mesh} cube - 需要设置朝向的立方体
 * @param {Object} fromPosition - 起始位置
 * @param {Object} toPosition - 目标位置
 */
export function setCubeOrientation(cube, fromPosition, toPosition) {
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

