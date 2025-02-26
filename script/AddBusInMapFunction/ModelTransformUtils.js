/**
 * 此文件包含用于生成3D模型变换矩阵的工具函数
 * - GenModelTransform: 生成模型的变换对象,包括:
 *   - 位置: 通过经纬度转换为墨卡托坐标
 *   - 旋转: X、Y、Z轴的旋转角度
 *   - 缩放: 根据墨卡托投影的缩放比例
 */

// 生成模型的变换对象，用于描述模型在地图上的位置和旋转角度 
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

// 导出函数以供其他文件使用
export { GenModelTransform }; 