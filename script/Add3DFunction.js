// Add 3D buildings and remove label layers to enhance the map
function Add3DFunction(map) {

    // const layers = map.getStyle().layers;
    // for (const layer of layers) {
    //     if (layer.type === 'symbol' && layer.layout['text-field']) {
    //         // remove text labels
    //         map.removeLayer(layer.id);
    //     }
    // }

    map.addLayer({
        'id': '3d-buildings', // 图层ID，用于标识3D建筑物图层
        'source': 'composite', // 数据源，使用复合数据源
        'source-layer': 'building', // 数据源中的图层名称，用于指定建筑物图层
        'filter': ['==', 'extrude', 'true'], // 过滤条件，只显示具有3D效果的建筑物
        'type': 'fill-extrusion', // 图层类型，用于显示3D建筑物
        //注意：為了保持平滑過渡效果，我們通常會將第二個值設置為 minzoom + 0.05（例如：14 和 14.05）。這樣可以確保建築物的高度變化是漸進的。
        'minzoom': 13, // 最小缩放级别，低于此级别不显示3D效果 
        'paint': {
            'fill-extrusion-color': '#aaa', // 填充颜色，用于设置3D建筑物的颜色

            // 使用'interpolate'表达式添加平滑的过渡效果，当用户缩放时，建筑物会逐渐显示出来
            // 当用户缩放时，建筑物会逐渐显示出来
            'fill-extrusion-height': [ // 填充高度，用于设置3D建筑物的填充高度
                'interpolate', // 插值类型，用于在不同缩放级别之间进行平滑过渡
                ['linear'], // 线性插值，用于在不同缩放级别之间进行平滑过渡
                ['zoom'], // 缩放级别，用于在不同缩放级别之间进行平滑过渡
                13, // 最小缩放级别，低于此级别不显示3D效果
                0, // 最小缩放级别，低于此级别不显示3D效果
                13.05, // 最大缩放级别，高于此级别不显示3D效果
                ['get', 'height'] // 获取建筑物的高度
            ],
            'fill-extrusion-base': [ // 填充基础，用于设置3D建筑物的填充基础
                'interpolate', // 插值类型，用于在不同缩放级别之间进行平滑过渡
                ['linear'], // 线性插值，用于在不同缩放级别之间进行平滑过渡
                ['zoom'], // 缩放级别，用于在不同缩放级别之间进行平滑过渡
                13, // 最小缩放级别，低于此级别不显示3D效果
                0, // 最小缩放级别，低于此级别不显示3D效果
                13.05, // 最大缩放级别，高于此级别不显示3D效果
                ['get', 'min_height'] // 获取建筑物的高度
            ],
            'fill-extrusion-opacity': 0.4 // 填充透明度，用于设置3D建筑物的透明度
        }
    });

}

