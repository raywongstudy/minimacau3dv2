// 定義產生 Mapbox 自訂圖層的函式
import { GenModelTransform, calculateCameraMatrix } from './transforms.js';
import { createBusMaterial } from './materials.js';
import { createBusMesh, initializeCubeData } from './mesh.js';
import { updateCubePosition, handleBusPositionUpdates } from './busManagement.js';

export function GenAllCustomLayer(map, route_elements, options = {}) {
    // 從 options 中解構參數並設置預設值
    const {
        sizeX = 3, sizeY = 2, sizeZ = 2,
        color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6],
        scaleSize = 1.4,
        longitude = 113.54884000,
        latitude = 22.16185000,
        rotateX = 0, rotateY = 0, rotateZ = 0
    } = options;

    const busInfoList = route_elements.busInfoList;
    const bus_name = `${route_elements.bus_name}_${route_elements.dir}`;
    const modelTransform = GenModelTransform(longitude, latitude, rotateX, rotateY + Math.PI, rotateZ + Math.PI);

    const customLayer = {
        id: `bus_${bus_name}`,
        type: 'custom',
        renderingMode: '3d',
        sizeX: sizeX,
        sizeY: sizeY,
        sizeZ: sizeZ,
        scaleSize: scaleSize,
        longitude: longitude,
        latitude: latitude,

        onAdd: function (map, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();
            const material = createBusMaterial(route_elements.dir, color);
            this.cube_list = [];

            // 建立此路線中所有巴士的立方體模型
            for (const bus of busInfoList) {
                const cube = createBusMesh(sizeX, sizeY, sizeZ, scaleSize, material);
                initializeCubeData(cube, bus, longitude, latitude, route_elements.dir);
                this.cube_list.push(cube);
            }
            this.cube_list.forEach(cube => this.scene.add(cube));
            this.map = map;

            // 使用 Mapbox 提供的canvas和context產生 Three.js Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true
            });
            this.renderer.autoClear = false;
        },

        render: function (gl, matrix) {
            // 計算並更新相機的投影矩陣
            this.camera.projectionMatrix = calculateCameraMatrix(matrix, modelTransform);
            // 渲染場景
            this.renderer.render(this.scene, this.camera);
            this.renderer.state.reset();

            // 更新每個巴士立方體的位置
            this.cube_list.forEach(cube => updateCubePosition(cube));

            // 要求 Mapbox 進行下次重繪
            this.map.triggerRepaint();
        },

        // 更新巴士位置資訊的函式
        updateBusPositions: async function (response_bus_data) {
            await handleBusPositionUpdates(this, response_bus_data);
        }
    };

    return customLayer;
}
