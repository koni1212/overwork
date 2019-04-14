// 祝日設定のCSVファイル
var holidayCSV;

// ログイン情報
var AuthUI = {
	uid: "",
	userName: "",
	email: ""
};

// SlackのWebhookURL
var slackWebhookURL;

// アプリの初期処理
var appInit = function() {
	return new Promise((resolve, reject) => {
		console.log("アプリの初期処理開始");

		// SlackのWebhookURLを取得
		firebase.database().ref("init/slack").once("value")
		.then(function(snapshot) {
			slackWebhookURL = decodeURIComponent(snapshot.val());
		});

		$("#apply").click(function() {
			let fullName = $("#name").val();
			if (fullName == null || fullName.length == 0) {
				alert("この機能はお名前を入力すると利用できます");
			} else {
				let message = window.prompt("新しい常駐先を登録できます\nあなたの所属と常駐先を教えてください\n不具合や要望もこちらから");
				if (message == null || message.length == 0) {
					alert("キャンセルしました");
				} else {
					// 内容送信
					var JSONData = {
							"text": message + "（" + fullName + ":" + AuthUI.email + "）",
							"username": "残業報告の登録申請",
							"icon_emoji": ":raising_hand:"
					};
					$.ajax({
						type : "post",
						url : "https://hooks.slack.com/services/" + slackWebhookURL,
						data: {
							"payload": JSON.stringify(JSONData)
						},
						scriptCharset: "utf-8",
					})
					.then(
							// 正常時の処理
							function(data) {
								alert("常駐先を登録しておきますので、明日またお越しください");
							},
							// 異常時の処理
							function() {
								alert("何かしらの問題により送信に失敗しました");
							}
					);
				}
			}
		});
		resolve();
	});
};

// Firebaseの初期処理
var firebaseInit = function() {
	return new Promise((resolve, reject) => {
		console.log("firebase初期処理開始");
		fetch('/__/firebase/init.json').then(function(response) {
			console.log("init.jsonのfetch完了");
			resolve();
		})
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
