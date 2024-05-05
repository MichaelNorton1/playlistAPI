import express from "express";

const app = express();
import cors from "cors";
import axios from "axios";

import querystring from "query-string";
import randomstring from "randomstring";
import request from "request";
import { Buffer } from "buffer";

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
let port = process.env.PORT || 8888;
app.listen(port);
const change = [];
app.locals.data = {};
app.get("/", (req, res) => {
  res.send("");
});
app.post("/band", (req, res) => {
  console.log(req);
  if (req.body.band && req.body.yearOf) {
    const formatBand = req.body.band;
    const yearOf = req.body.yearOf;
    axios
      .get(
        `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${formatBand}&year=${yearOf}`,
        {
          headers: {
            "x-api-key": process.env.key,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )
      .then((resp) => {
        res.send(resp.data.setlist);
      })
      .catch((error) => res.send({ error: error.response.statusText }));
  } else {
    res.send({ error: "error" });
  }
});

let redirect_uri =
  process.env.REDIRECT_URI || "http://localhost:8888/callback/";

app.get("/login", (req, res) => {
  var state = randomstring.generate(16);
  var scope = "user-read-private user-read-email playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: process.env.client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, res) {
  let code = req.query.code || null;

  let state = req.query.state || null;
  if (state === null) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    let authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(
            process.env.client_id + ":" + process.env.client_secret
          ).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      let uri = process.env.FRONTEND_URI || "http://localhost:3000/";
      const access_token = body.access_token;
      res.redirect(uri + "?access_token=" + access_token);
    });
  }
});
