// 此檔用於定義巴士模型的材質

export function createBusMaterial(dir, color) {
    // 根據行駛方向 dir 以及給定的 color 陣列來設定材質顏色
    let material = [];
    if (dir == 0) {
        // dir = 0 時的材質配置
        material = [
            new THREE.MeshBasicMaterial({ color: color[0] }),
            new THREE.MeshBasicMaterial({ color: color[0] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[1] }),
            new THREE.MeshBasicMaterial({ color: color[2] }),
            new THREE.MeshBasicMaterial({ color: color[2] })
        ];
    } else {
        // dir != 0 時的材質配置
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
