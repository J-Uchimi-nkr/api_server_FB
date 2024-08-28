const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");
const session = require("express-session");
const jwt = require("jsonwebtoken"); // jsonwebtokenを追加
const FIXED_TOKEN = "1958jgbsh27jg83nsgeh73js82nf48jgo8t"

// .env読み込み
require("dotenv").config();
const config = require(path.join(process.cwd(), "config.json"));
const getKintoneRecord = require(path.join(
  process.cwd(),
  config["path"]["getKintoneRecord"]
));
const getKintoneRecordFB = require(path.join(
  process.cwd(),
  config["path"]["getKintoneRecordFB"]
));
const getAppInfo = require(path.join(
  process.cwd(),
  config["path"]["getInfoFromURL"]
));
const SERVER_PORT = config["server"]["port"];
const BINDING_PORT = config["server"]["binding_port"];
const DataUploader = require(path.join(
  process.cwd(),
  config["path"]["dataUploader"]
));
const data_uploader = new DataUploader();
const DataUploaderFB = require(path.join(
  process.cwd(),
  config["path"]["dataUploaderFB"]
));
const data_uploaderFB = new DataUploaderFB();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET; // JWT_SECRETを.envから読み込む
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const APP = express();
APP.use(cors()); // CORSミドルウェアを使用してクロスオリジンリクエストを許可
APP.use(bodyParser.json()); // JSONを解析するためのミドルウェアを追加

APP.use(
  session({
    secret: "ofnkrdevdev", // セッションを暗号化するためのシークレット
    resave: false,
    saveUninitialized: true,
    cookie: { secure: REDIRECT_URI.startsWith("https://") }, // HTTPSを使用していない場合はfalseに設定
  })
);

// トークン認証用のミドルウェア
function authenticateToken(req, res, next) {
  // Authorization: `Bearer ${token}`, /
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token || token == "undefined")
    return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
}

APP.post("/sync", authenticateToken, async (req, res) => {
  try {
    const jsonData = req.body;
    if (jsonData["record_url"] == undefined)
      throw new Error("record_url is necessary in the post data");

    const app_info = getAppInfo(jsonData["record_url"]);
    if (
      !app_info ||
      app_info.app_id == undefined ||
      app_info.record_id == undefined
    )
      throw new Error("internal server error: incorrect app_info.");

    const record = await getKintoneRecord(app_info.app_id, app_info.record_id);
    if (record == [])
      throw new Error(
        "internal server error: failed to get record from kintone server."
      );

    const sync_result = await data_uploader.sync(record);
    if (sync_result.is_successed == false)
      throw new Error(sync_result.error_message);

    res.status(200).json({
      message: JSON.stringify(record),
    });
  } catch (e) {
    res.status(500).json({
      message: JSON.stringify({ message: e.message }),
    });
  }
});

APP.post("/syncFB", async (req, res) => {
  console.log("Received request at /syncFB"); // リクエストが到達したか確認
  const token = req.header("Authorization")?.split(" ")[1];

  // 受け取ったトークンをログに出力
  console.log("Received Token:", token);
  console.log("Expected Token:", FIXED_TOKEN);

  if (token !== FIXED_TOKEN) {
      return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const jsonData = req.body;
    if (jsonData["record_url"] == undefined)
      throw new Error("record_url is necessary in the post data");

    const app_info = getAppInfo(jsonData["record_url"]);
    if (!app_info || app_info.app_id == undefined)
      throw new Error("internal server error: incorrect app_info.");

    const unique_key = jsonData["unique_key_value"]; // unique_key を jsonData から取得
    if (!unique_key)
      throw new Error("internal server error: unique_key is missing.");

    const record = await getKintoneRecordFB(app_info.app_id, unique_key);
    if (record == [])
      throw new Error(
        "internal server error: failed to get record from kintone server."
      );

    const sync_result = await data_uploaderFB.sync(record);
    if (sync_result.is_successed == false)
      throw new Error(sync_result.error_message);
    res.status(200).json({
      message: JSON.stringify(record),
    });
  } catch (e) {
    res.status(500).json({
      message: JSON.stringify({ message: e.message }),
    });
  }
});

APP.get("/login", async (req, res) => {
    const redirect_url = req.query.redirect_url;
    const authorization_url = client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      redirect_uri: REDIRECT_URI,
      state: redirect_url,
    });
    res.redirect(authorization_url);
  });

APP.get("/loginFB", async (req, res) => {
    res.json({ token: FIXED_TOKEN });
});
  

APP.get("/oauth2callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect("/login"); // 認証が失敗した場合は再度ログインページにリダイレクト
  }

  try {
    // トークンを取得
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // ユーザー情報を取得
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // allowed_domains に含まれているか確認
    const allowed_domains = config["oauth"]["allowed_domains"];
    if (!allowed_domains.includes(payload.hd)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("domain:", payload.hd);
    console.log("allowed");

    // JWTトークンを生成
    const userPayload = { ...payload }; // ペイロードをコピー
    delete userPayload.exp; // expプロパティを削除
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "1h" });

    // stateパラメータから元のリダイレクトURLをデコード
    const redirect_url = decodeURIComponent(state);

    // すでにredirect_urlにtokenがある場合は、tokenを一回削除
    const redirect_url_without_token = redirect_url.split("?token=")[0];
    res.redirect(`${redirect_url_without_token}?token=${token}`); // 元のページにトークンを付けてリダイレクト
  } catch (e) {
    console.error(e);
    res.status(500).send("Authentication failed.");
  }
});

//logout
APP.get("/logout", (req, res) => {
  const redirect_url = req.query.redirect_url;
  req.session.destroy();
  console.log("logout redirect_url:", redirect_url);
  res.redirect(redirect_url);
});

// 404エラーが発生した際に呼び出されるハンドラ
APP.use((req, res) => {
  if (req.method === "GET") {
    const notfound = path.join(process.cwd(), config["path"]["404"]);
    const internal_server_error = path.join(
      process.cwd(),
      config["path"]["500"]
    );
    try {
      res.status(404).sendFile(notfound);
    } catch (e) {
      console.error(e.stack);
      res.status(500).sendFile(internal_server_error);
    }
  } else {
    res.status(404).json({ error: "404 Not Found" });
  }
});

// サーバーをHTTPの指定のポートで起動;
APP.listen(SERVER_PORT, BINDING_PORT, async () => {
  console.log(`Server is running on http://localhost:${SERVER_PORT}`);
});