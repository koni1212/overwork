$(function(){
	Promise.resolve()
	.then((result) => appInit())
	.then((result) => firebaseInit())
	.then((result) => downloadCsv())
	.then((result) => login())
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
				firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "userName").set(AuthUI.userName);
				firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "email").set(AuthUI.email);

				// お名前をFirebaseと接続する
				firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "fullName").once("value")
				.then(function(snapshot) {
					let name = snapshot.val();
					$("#name").val(name);
				});
				$("#name").on("blur", function() {
					firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "fullName").set($(this).val());
				});

				// 常駐先をFirebaseと接続する
				firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "client").once("value")
				.then(function(snapshot) {
					let client = snapshot.val();
					$("#client").val(client);
				});
				$("#client").on("change", function() {
					firebase.database().ref("users" + "/" + AuthUI.uid + "/" + "client").set($(this).val());
				});

				// 入力表の作成
				createTable();

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
				resolve();
			}
		});
	});
};

// 1か月分の入力枠を作成する
var createTable = function() {
	console.log("1か月分テーブル作成開始");
	let systemDate = new Date();
	let year = systemDate.getFullYear();
	let month = systemDate.getMonth()+1;
	let getsumatsu = formatDate(new Date(year, month, 0), "DD");

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

		firebase.database().ref("time" + "/" + formatDate(date, "YYYYMM") + "/" + AuthUI.uid + "/" + formatDate(date, "DD")).once("value")
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
					"<td class='client'><input type='tel' name='workStart' value='" + workStart + "' maxlength='4' size='4' data-date='" + formatDate(date, "DD") + "'></td>" +
					"<td class='client'><input type='tel' name='workEnd' value='" + workEnd + "' maxlength='4' size='4' data-date='" + formatDate(date, "DD") + "'></td>" +
					"<td class='home'><input type='tel' name='honshaStart' value='" + honshaStart + "' maxlength='4' size='4' data-date='" + formatDate(date, "DD") + "'></td>" +
					"<td class='home'><input type='tel' name='honshaEnd' value='" + honshaEnd + "' maxlength='4' size='4' data-date='" + formatDate(date, "DD") + "'></td>" +
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

			$("#inputTable input[type='tel']").filter(function(index) {
				return $(this).data("date") == formatDate(date, "DD");
			})
			.on("blur", function() {
				// 数値以外を除去してゼロパディングする
				let val = $(this).val();
				let afterVal = "";
				for (let j=0; j<val.length; j++) {
					let oneChar = val.substr(j, 1);
					if (oneChar >=0 && oneChar <= 9) {
						afterVal += oneChar;
					}
				}
				if (afterVal.length > 0) {
					afterVal = ("0000" + afterVal).slice(-4);
				}
				$(this).val(afterVal);
				firebase.database().ref("time" + "/" +  formatDate(date, "YYYYMM") + "/" + AuthUI.uid + "/" + formatDate(date, "DD") + "/" + $(this).attr("name")).set($(this).val());
			});
		});
	}
};
