// 等待DOM加载完成后再执行
document.addEventListener('DOMContentLoaded', function() {
	// 搜索框相关代码
	const search_btn = document.querySelector('.mapboxgl-ctrl-geocoder.mapboxgl-ctrl');
	if (search_btn) {
		search_btn.addEventListener('click', function(event) {
			search_btn.classList.add("mapboxgl-ctrl-geocoder-search-box");
		});
	}
});

// 时钟功能
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