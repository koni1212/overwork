// 最初の状態の入力表
var origTable = $("#inputTable").html();

$(function(){
	Promise.resolve()
	.then((result) => appInit())
	.then((result) => firebaseInit())
	.then((result) => downloadCsv())
	.then((result) => login())
	.then((result) => check())
	.catch(function(error) {});
});

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

				// 同じチームの名前の一覧を取得する
				dispTeam();

				// ロード表示を終え表を表示する
				$("#loading").fadeOut();
				$("#container").fadeIn();

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
			}
		});
	});
};

// 1か月分の入力枠を作成する
var createTable = function(uid) {
	console.log("1か月テーブル作成開始");
	let systemDate = new Date();
	let year = systemDate.getFullYear();
	let month = systemDate.getMonth()+1;
	let getsumatsu = formatDate(new Date(year, month, 0), "DD");

	$("#inputTable").html(origTable);

	for (let i=0; i<getsumatsu; i++) {
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

		firebase.database().ref("time" + "/" + formatDate(date, "YYYYMM") + "/" + uid + "/" + formatDate(date, "DD")).once("value")
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
					"<td>" + formatDate(date, "MM/DD") + "(" + dayOfWeekStr + ")</td>" +
					"<td class='client'><input type='tel' name='workStart' value='" + workStart + "' size='4' disabled></td>" +
					"<td class='client'><input type='tel' name='workEnd' value='" + workEnd + "' size='4' disabled></td>" +
					"<td class='home'><input type='tel' name='honshaStart' value='" + honshaStart + "' size='4' disabled></td>" +
					"<td class='home'><input type='tel' name='honshaEnd' value='" + honshaEnd + "' size='4' disabled></td>" +
					"</tr>");
			if(i+1 == 15) {
				$("#inputTable").append(
						"<tr>" +
						"<td class='center' colspan='5'><input type='button' id='overworkHalf' value='ここまでを残業計算' onclick='calcOverworkHalf();'></td>" +
						"</tr>");
			}
			if(i+1 == getsumatsu) {
				$("#inputTable").append(
						"<tr>" +
						"<td class='center' colspan='5'><input type='button' id='overworkFull' value='ここまでを残業計算' onclick='calcOverworkFull();'></td>" +
						"</tr>");
			}
		});
	}
};

// 同じチームメンバの名前を表示する
var dispTeam = function() {
	console.log("チームメンバ取得開始");

	let myClient;
	// 自分の常駐先を取得
	firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "client").once("value")
	.then(function(snapshot) {
		myClient = snapshot.val();
	});

	firebase.database().ref("users").once("value")
	.then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			let client = childSnapshot.child("client").val();
			if (myClient != null && myClient == client) {
				$("#checkName").append($("<option>").val(childSnapshot.key).text(childSnapshot.child("fullName").val()));
			}
		});
		console.log("チームメンバ取得終了");
	});
};

// チームメンバを確認する
var check = function() {
	return new Promise((resolve, reject) => {
		$("#checkName").change(function() {
			// 入力表の作成
			createTable($(this).val());
		});
		resolve();
	});
};
