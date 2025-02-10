// 設定立方體朝向
export function setCubeOrientation(cube, fromPosition, toPosition) {
    // 計算方向向量差異
    const dx = toPosition.x - fromPosition.x;
    const dy = toPosition.y - fromPosition.y;

    // 若 dx,dy =0，表示沒有移動，不更新
    if (dx === 0 && dy === 0) {
        return;
    }

    // 計算旋轉角度 (Z 軸)
    const angle = Math.atan2(dy, dx);

    // 設定立方體的 Z 軸旋轉
    cube.rotation.z = angle;
    cube.userData.finalRotation = angle;
}
