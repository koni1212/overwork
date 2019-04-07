// 祝日設定のCSVファイル
var holidayCSV;

// ログイン情報
var AuthUI = {
	uid: "",
	userName: "",
	email: ""
};

$(function(){
	Promise.resolve()
	.then((result) => firebaseInit())
	.then((result) => downloadCsv())
	.then((result) => login())
	.catch(function(error) {});
});

// Firebaseの初期処理
var firebaseInit = function() {
	return new Promise((resolve, reject) => {
		console.log("app初期処理開始");
		fetch('/__/firebase/init.json').then(function(response) {
			console.log("init.jsonのfetch完了");
			resolve();
		})
	});
};

// ログイン処理
var login = function() {
	return new Promise((resolve, reject) => {
		console.log("ログイン処理開始");
		firebase.auth().onAuthStateChanged(function(user) {
			if (user) {
				console.log("認証済み");
				// ログイン済みの処理
				AuthUI.uid = user.uid;
				AuthUI.userName = user.displayName;
				AuthUI.email = user.email;
				firebase.database().ref(AuthUI.uid + "/" + "userName").set(AuthUI.userName);
				firebase.database().ref(AuthUI.uid + "/" + "email").set(AuthUI.email);

				// お名前をFirebaseと接続する
				firebase.database().ref(AuthUI.uid + "/" + "fullName").once("value")
				.then(function(snapshot) {
					let name = snapshot.val();
					$("#name").val(name);
				});
				$("#name").on("blur", function() {
					firebase.database().ref(AuthUI.uid + "/" + "fullName").set($(this).val());
				});
				createTable();
				resolve();
			} else {
				console.log("ログイン処理開始");
				// ログイン処理
				let provider = new firebase.auth.GoogleAuthProvider();

				firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
				.then(function() {
					return firebase.auth().signInWithRedirect(provider);
				})
				.catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;
				});
				resolve();
			}
		});
	});
};

// 祝日設定を取得する
var downloadCsv = function() {
	return new Promise((resolve, reject) => {
		console.log("祝日設定取得開始");
		// http://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csvからダウンロード済み
		let req = new XMLHttpRequest();
		req.open('get', 'syukujitsu.csv', true);
		req.send(null);
		req.onload = function() {
			holidayCSV = req.responseText;
			console.log("祝日設定取得完了");
			resolve();
		};
	});
};

// 15日分の入力枠を作成する
var createTable = function() {
	console.log("15日テーブル作成開始");
	let systemDate = new Date();
	let year = systemDate.getFullYear();
	let month = systemDate.getMonth()+1;

	for (let i=0; i<15; i++) {
		let date = new Date(year, month-1, i+1);
		let dayOfWeek = date.getDay();
		let dayOfWeekStr = [ "日", "月", "火", "水", "木", "金", "土" ][dayOfWeek];
		let holiday = isHoliday(formatDate(date, "YYYY/M/D"));
		let holidayClass = "";
		if (holiday) {
			holidayClass = "holiday";
		} else if (dayOfWeek == 0) {
			holidayClass = "sunday";
		} else if (dayOfWeek == 6) {
			holidayClass = "saturday";
		}

		firebase.database().ref(AuthUI.uid + "/" + formatDate(date, "YYYYMM/DD")).once("value")
		.then(function(snapshot) {
			let workStart = snapshot.child("workStart").val();
			let workEnd = snapshot.child("workEnd").val();
			let honshaStart = snapshot.child("honshaStart").val();
			let honshaEnd = snapshot.child("honshaEnd").val();
			workStart = workStart == null ? "" : workStart;
			workEnd = workEnd == null ? "" : workEnd;
			honshaStart = honshaStart == null ? "" : honshaStart;
			honshaEnd = honshaEnd == null ? "" : honshaEnd;

			$("#inputTable").append(
					"<tr class='" + holidayClass + "'>" +
					"<td>" + formatDate(date, "YYYY/MM/DD") + "(" + dayOfWeekStr + ")</td>" +
					"<td><input type='tel' name='workStart' value='" + workStart + "' maxlength='4' size='4' data-date='" + formatDate(date, "YYYYMM/DD") + "'></td>" +
					"<td><input type='tel' name='workEnd' value='" + workEnd + "' maxlength='4' size='4' data-date='" + formatDate(date, "YYYYMM/DD") + "'></td>" +
					"<td><input type='tel' name='honshaStart' value='" + honshaStart + "' maxlength='4' size='4' data-date='" + formatDate(date, "YYYYMM/DD") + "'></td>" +
					"<td><input type='tel' name='honshaEnd' value='" + honshaEnd + "' maxlength='4' size='4' data-date='" + formatDate(date, "YYYYMM/DD") + "'></td>" +
					"</tr>");

			$("#inputTable input[type='tel']").filter(function(index) {
				return $(this).data("date") == formatDate(date, "YYYYMM/DD");
			})
			.on("blur", function() {
				firebase.database().ref(AuthUI.uid + "/" + $(this).data("date") + "/" + $(this).attr("name")).set($(this).val());
			});
		});
	}
};

// 日付をフォーマットする
var formatDate = function (date, format) {
	if (!format) format = 'YYYY-MM-DD hh:mm:ss.SSS';
	format = format.replace(/YYYY/g, date.getFullYear());
	format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
	format = format.replace(/M/g, (date.getMonth() + 1));
	format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
	format = format.replace(/D/g, (date.getDate()));
	format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
	format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
	format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
	if (format.match(/S/g)) {
		var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
		var length = format.match(/S/g).length;
		for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
	}
	return format;
};

// 祝日判定
var isHoliday = function(date) {
	var data = [];
	var addZero = function(n) {
		return ('0' + n).slice(-2);
	}
	var dataArr = [];
	var isHoliday = false;
	var tmp = holidayCSV.split('\n');
	for (var i=0; i< tmp.length; i++) {
		dataArr = tmp[i].split(',');
		if (dataArr[0] == date) {
			isHoliday = true;
			break;
		}
	};
	return isHoliday;
};
