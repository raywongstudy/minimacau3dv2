# minimacau3d



# FAQ
1. `<script type="module">` 問題

在 index.html 的 `<script type="module">` 中:
- 我们将 map 设置为全局变量 (`window.map`)
- 但在同一个模块作用域内,我们仍然可以直接使用 map 变量,因为它在当前作用域中是可见的

在其他文件(如 AddCameraData.js、AddStationInfo.js 等)中:
- map 是作为函数参数传入的
- 这些函数接收的是对同一个地图实例的引用
- 不需要通过 window.map 来访问