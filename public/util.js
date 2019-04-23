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

// 半月分の残業時間を計算
var calcOverworkHalf = function() {
	let count = 15;
	let overworkTime = 0;
	$("#inputTable tr").each(function(index, tr) {
		let kaishi1 = $(tr).find("td.client:eq(0) input").val();
		let shuryo1 = $(tr).find("td.client:eq(1) input").val();
		let kaishi2 = $(tr).find("td.home:eq(0) input").val();
		let shuryo2 = $(tr).find("td.home:eq(1) input").val();
		let off = false;
		if ($(tr).hasClass("holiday") || $(tr).hasClass("sunday") || $(tr).hasClass("saturday")) {
			off = true;
		}
		if (kaishi1 != undefined) {
			if (count-- > 0) {
				overworkTime += calcOverworkDay(kaishi1, shuryo1, kaishi2, shuryo2, off);
			}
		}
	});
	// 残業時間を表示
	alert("15日時点の残業時間は" + overworkTime + "hです。\nこれは昼休憩1hのみ計算した概算値です。");
};

// 1か月分の残業時間を計算
var calcOverworkFull = function() {
	let overworkTime = 0;
	$("#inputTable tr").each(function(index, tr) {
		let kaishi1 = $(tr).find("[name='workStart']").val();
		let shuryo1 = $(tr).find("[name='workEnd']").val();
		let kaishi2 = $(tr).find("[name='honshaStart']").val();
		let shuryo2 = $(tr).find("[name='honshaEnd']").val();
		let off = false;
		if ($(tr).hasClass("holiday") || $(tr).hasClass("sunday") || $(tr).hasClass("saturday")) {
			off = true;
		}
		if (kaishi1 != undefined) {
			overworkTime += calcOverworkDay(kaishi1, shuryo1, kaishi2, shuryo2, off);
		}
	});
	// 残業時間を表示
	alert("1か月の残業時間は" + overworkTime + "hです。\nこれは昼休憩1hのみ計算した概算値です。");
};

// 1日分の残業時間を計算
var calcOverworkDay = function(kaishi1, shuryo1, kaishi2, shuryo2, off) {
	let ms1 = calcMs(kaishi1, shuryo1);
	let ms2 = calcMs(kaishi2, shuryo2);
	let ms = ms1 + ms2;
	let hourMs = 1000 * 60 * 60;

	// 8.5h以上ある場合は、昼休憩の1hを引く
	if (ms > 7.5 * hourMs) {
		ms -= hourMs;
	}

	// 休日のときはそのまま残業時間に、平日のときは7.5hを引く
	if (!off) {
		ms -= 7.5 * hourMs;
	}

	// 平日の有給休暇などマイナスとなる場合は残業なしとする
	if (ms < 0) {
		ms = 0;
	}

	// 時間表示で返却する
	return ms/hourMs;
};

// 開始時間、終了時間から作業時間のミリ秒を返す
var calcMs = function(kaishi, shuryo) {

	let kaishiDate = new Date();
	let shuryoDate = new Date();

	kaishiDate.setHours(kaishi.substr(0, 2));
	kaishiDate.setMinutes(kaishi.substr(2, 2));
	shuryoDate.setHours(shuryo.substr(0, 2));
	shuryoDate.setMinutes(shuryo.substr(2, 2));

	let ms = shuryoDate.getTime() - kaishiDate.getTime();
	return ms;
};
