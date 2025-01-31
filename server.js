import express from "express";

const app = express();
import cors from "cors";
import axios from "axios";

import querystring from "query-string";
import randomstring from "randomstring";
import request from "request";
import {Buffer} from "buffer";

app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json());
let port = process.env.PORT || 8888;
app.listen(port, () => console.log(`Running on Port ${port}`));
const change = [];
app.locals.data = {};
import 'dotenv/config';
import {neon} from '@neondatabase/serverless';

const {PGHOST, PGDATABASE, PGUSER, PGPASSWORD} = process.env;

const sql = neon(`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`);

async function getPgVersion() {
    const result = await sql`SELECT version()`;
    console.log(result[0]);
}

getPgVersion();

app.get("/", (req, res) => {
    res.send("<h1>API</h1>");
});
app.post("/band", (req, res) => {
    if (req.body.band && req.body.yearOf) {
        const formatBand = req.body.band;
        const yearOf = req.body.yearOf;
        console.log(process.env.key);
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
                console.log(resp.data.setlist);
                res.send(resp.data.setlist);
            })
            .catch(async (error) => {
                console.log(error);
                await logError(error, error.stack)
                res.send({error: error.response.statusText});
            });
    } else {
        res.send({error: "error"});
    }
});

let redirect_uri =
    process.env.REDIRECT_URI || "http://localhost:8888/callback/";

app.get("/login", (req, res) => {
    console.log(redirect_uri);
    var state = randomstring.generate(16);
    const scopes = [

        "playlist-read-private",
        "playlist-modify-public",
        "playlist-modify-private",


    ].join(" ");

    res.redirect(
        "https://accounts.spotify.com/authorize?" +
        querystring.stringify({
            response_type: "code",
            client_id: process.env.client_id,
            scope: scopes,
            redirect_uri: redirect_uri,
            state: state,
        })
    );
});

app.get("/callback", async function (req, res) {
    let code = req.query.code || null;

    let state = req.query.state || null;
    if (state === null) {
        res.redirect(
            "/#" +
            querystring.stringify({
                error: "state_mismatch",
            })
        );
        await logError(error, error.stack)
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

        request.post(authOptions, async function (error, response, body) {
            let uri = "https://setlist-playlist.vercel.app/";

            await logError(error, error.stack)


            const access_token = body.access_token;
            res.redirect(uri + "?access_token=" + access_token);
        });
    }
});

async function logError(message, stack) {
    try {
        await sql`INSERT INTO errors (message, stack) VALUES (${message}, ${stack})`;
        console.log('Error logged successfully.');
    } catch (dbError) {
        console.error('Failed to log error:', dbError);
    }
}

app.post("/error", async (req, res) => {
  try {
    const { msg } = req.body;

    if (!msg) {
      return res.status(400).json({ error: "Message is required" });
    }

    await logError(msg, "frontend");

    res.status(200).json({ success: true, message: "Error logged successfully" });
  } catch (error) {
    console.error("Error in /error route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});