// 时钟功能 --------------------------------------------------------------
window.startClock = function() {
	const now = new Date();
	const h = padWithZeroes(now.getHours(), 2);
	const m = padWithZeroes(now.getMinutes(), 2);
	const s = padWithZeroes(now.getSeconds(), 2);
	document.getElementById("current-time").innerHTML = `${h}:${m}:${s}`;
	setTimeout(startClock, 500);
};

const padWithZeroes = (input, length) => {
	let padded = input;
	if (typeof input !== "string") padded = input.toString();
	return padded.padStart(length, "0");
};

function getCurrentDate(myDate) {
	if(myDate != 0){
		var myDate = new Date(myDate);
	}else{
		var myDate = new Date();
	}
	var year = myDate.getFullYear(); //年
	var month = myDate.getMonth() + 1; //月
	var day = myDate.getDate(); //日
	var days = myDate.getDay();
	switch(days) {
		  case 1:
				days = '週一';
				break;
		  case 2:
				days = '週二';
				break;
		  case 3:
				days = '週三';
				break;
		  case 4:
				days = '週四';
				break;
		  case 5:
				days = '週五';
				break;
		  case 6:
				days = '週六';
				break;
		  case 0:
				days = '週日';
				break;
	}
	var str = year + "年" + month + "月" + day + "日 " + days;
	return str;
}
document.getElementById("current-date").innerText = getCurrentDate(0);


function simulateTimeFlow(start, end, totalDuration) {
	document.getElementById("current-date").innerText = getCurrentDate(start);
    let startDate = new Date(start);
    let endDate = new Date(end);

    // 計算兩個日期之間的總毫秒數差異
    let totalMillis = endDate - startDate;
    
    // 計算模擬的總持續時間（毫秒）
    let totalSimulationMillis = totalDuration * 1000;

    // 計算每次更新的毫秒數以及時間的遞增量
    // 假設我們每50毫秒更新一次
    let updateIntervalMillis = 50;
    let incrementPerUpdate = totalMillis / (totalSimulationMillis / updateIntervalMillis);
    
    function update() {
        // 遞增時間
        startDate = new Date(startDate.getTime() + incrementPerUpdate);
        let h = padWithZeroes(startDate.getHours(), 2);
        let m = padWithZeroes(startDate.getMinutes(), 2);
        let s = padWithZeroes(startDate.getSeconds(), 2);

        // 更新頁面上的時間
        document.getElementById("current-time").innerHTML = `${h}:${m}:${s}`;

        // 如果還沒有到達結束日期，則繼續更新
        if (startDate < endDate) {
            setTimeout(update, updateIntervalMillis);
        }else{
			document.getElementById("current-date").innerText = getCurrentDate(0);
		}
    }

    update();
}
// 調用函數模擬時間流逝


// 功能按钮 --------------------------------------------------------------
// 等待DOM加载完成后再执行
document.addEventListener('DOMContentLoaded', function() {
	// 初始化时隐藏所有按钮
	const buttons = {
		'toggle-station-button': false,  // 站点按钮
		'toggle-route-button': false,    // 路线按钮
		'demo-data-button': false        // 演示数据按钮
	};

	// 隐藏所有按钮
	Object.keys(buttons).forEach(buttonId => {
		const button = document.getElementById(buttonId);
		if (button) {
			button.style.display = 'none';
		}
	});

	// 搜索框相关代码
	const search_btn = document.querySelector('.mapboxgl-ctrl-geocoder.mapboxgl-ctrl');
	if (search_btn) {
		search_btn.addEventListener('click', function(event) {
			search_btn.classList.add("mapboxgl-ctrl-geocoder-search-box");
		});
	}

	// 搜索功能相关代码
	const searchModal = document.getElementById('search-modal');
	const searchButton = document.getElementById('search-route-button');
	const confirmButton = document.getElementById('search-confirm');
	const cancelButton = document.getElementById('search-cancel');
	const routeSelect = document.getElementById('route-select');
	const directionSelect = document.getElementById('direction-select');

	// 打開搜索模態框
	searchButton.addEventListener('click', function() {
		searchModal.style.display = 'block';
		if (routeSelect.children.length <= 1) {
			initializeRouteOptions();
		}
	});

	// 初始化路線選項
	function initializeRouteOptions() {
		// 從 traffic_data 中獲取唯一的路線編號
		const uniqueRoutes = [...new Set(traffic_data.map(route => route.routeCode))];
		
		// 排序並添加到選擇框
		uniqueRoutes.sort().forEach(routeCode => {
			const option = document.createElement('option');
			option.value = routeCode;
			option.textContent = routeCode.replace(/^0+/, ''); // 移除前導零
			routeSelect.appendChild(option);
		});
	}

	// 當路線選擇改變時更新方向選項
	routeSelect.addEventListener('change', function() {
		directionSelect.innerHTML = '<option value="">請選擇方向...</option>';
		if (this.value) {
			const selectedRoute = this.value;
			const directions = traffic_data
				.filter(route => route.routeCode === selectedRoute)
				.map(route => route.direction)
				.filter((value, index, self) => self.indexOf(value) === index);

			directions.forEach(direction => {
				const option = document.createElement('option');
				option.value = direction;
				option.textContent = direction;
				directionSelect.appendChild(option);
			});
			directionSelect.disabled = false;
		} else {
			directionSelect.disabled = true;
		}
	});

	// 確認搜索
	confirmButton.addEventListener('click', function() {
		const selectedRoute = routeSelect.value;
		const selectedDirection = directionSelect.value;
		if (selectedRoute && selectedDirection) {
			// 重置所有路線的透明度
			window.trafficIds.forEach(id => {
				window.map.setPaintProperty(id, 'line-opacity', 0);
			});

			// 高亮顯示選中的路線和方向
			const routeIds = window.trafficIds.filter(id => 
				id.includes(selectedRoute) && id.includes(selectedDirection)
			);
			routeIds.forEach(id => {
				window.map.setPaintProperty(id, 'line-opacity', 1);
			});
		}
		searchModal.style.display = 'none';
	});

	// 取消搜索
	cancelButton.addEventListener('click', function() {
		searchModal.style.display = 'none';
		// 重置所有路線的透明度
		window.trafficIds.forEach(id => {
			window.map.setPaintProperty(id, 'line-opacity', 0.4);
		});
	});

	// 點擊模態框外部關閉
	searchModal.addEventListener('click', function(e) {
		if (e.target === searchModal) {
			searchModal.style.display = 'none';
			// 重置所有路線的透明度
			window.trafficIds.forEach(id => {
				window.map.setPaintProperty(id, 'line-opacity', 0.4);
			});
		}
	});
});

// 显示按钮的函数
window.showMapButton = function(buttonId) {
	const button = document.getElementById(buttonId);
	if (button) {
		button.style.display = 'flex';  // 使用flex以保持原有的布局
	}
};

// 隐藏按钮的函数
window.hideMapButton = function(buttonId) {
	const button = document.getElementById(buttonId);
	if (button) {
		button.style.display = 'none';
	}
};

// for the stations button in map panel 
var stationVisibility = true;

// 獲取按鈕元素
var toggle_station_button = document.getElementById('toggle-station-button');

// 為按鈕添加點擊事件監聽器
toggle_station_button.addEventListener('click', function () {
	// 確保map已經加載完成
	if (!window.map) return;
	
	// 切換站點的可見性
	stationVisibility = !stationVisibility;
	// 根據站點的可見性設置地圖的層
	window.map.setLayoutProperty('bus_station', 'visibility', stationVisibility ? 'visible' : 'none');
	// 切換按鈕顏色
	if (stationVisibility) {
		// 如果站點可見，設置按鈕為原色
		toggle_station_button.style.backgroundColor = "";
	} else {
		// 如果站點不可見，設置按鈕為灰色
		toggle_station_button.style.backgroundColor = "gray";
	}
});




// for the route button in map panel 
var routeVisibility = true;

// 獲取按鈕元素
var toggle_route_button = document.getElementById('toggle-route-button');

// 為按鈕添加點擊事件監聽器
toggle_route_button.addEventListener('click', function () {
	// 確保map和trafficIds已經加載完成
	if (!window.map || !window.trafficIds) return;
	
	// 切換站點的可見性
	routeVisibility = !routeVisibility;
	// 根據站點的可見性設置地圖的層
	window.trafficIds.forEach(trafficId => {
		window.map.setLayoutProperty(trafficId, 'visibility', routeVisibility ? 'visible' : 'none');	
	});
	
	// 切換按鈕顏色
	if (routeVisibility) {
		// 如果站點可見，設置按鈕為原色
		toggle_route_button.style.backgroundColor = "";
	} else {
		// 如果站點不可見，設置按鈕為灰色
		toggle_route_button.style.backgroundColor = "gray";
	}
});



// for the route button in map panel 
// var demoBtnVisibility = true;

// 獲取按鈕元素
// var toggle_demo_button = document.getElementById('demo-data-button');

// 為按鈕添加點擊事件監聽器
// toggle_demo_button.addEventListener('click', function () {
// 	// 切換站點的可見性
// 	demoBtnVisibility = !demoBtnVisibility;
// 	// 切換按鈕顏色
// 	if (demoBtnVisibility) {
// 		// 如果站點可見，設置按鈕為原色
// 		toggle_demo_button.style.backgroundColor = "";
// 	} else {
// 		// 如果站點不可見，設置按鈕為灰色
// 		toggle_demo_button.style.backgroundColor = "gray";
// 	}
// });

// 全屏控制--------------------------------
var fullscreenButton = document.getElementById('fullscreen-button');
var isFullScreen = false;

fullscreenButton.addEventListener('click', function() {
    if (!isFullScreen) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        fullscreenButton.querySelector('i').classList.remove('fa-expand');
        fullscreenButton.querySelector('i').classList.add('fa-compress');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreenButton.querySelector('i').classList.remove('fa-compress');
        fullscreenButton.querySelector('i').classList.add('fa-expand');
    }
    isFullScreen = !isFullScreen;
});

// 監聽全屏狀態變化
document.addEventListener('fullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('mozfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('MSFullscreenChange', updateFullscreenButtonIcon);

function updateFullscreenButtonIcon() {
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) {
        fullscreenButton.querySelector('i').classList.remove('fa-expand');
        fullscreenButton.querySelector('i').classList.add('fa-compress');
        isFullScreen = true;
    } else {
        fullscreenButton.querySelector('i').classList.remove('fa-compress');
        fullscreenButton.querySelector('i').classList.add('fa-expand');
        isFullScreen = false;
    }
}