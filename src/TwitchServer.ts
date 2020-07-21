import * as express from 'express';
import { Request, Response } from 'express';
import Twitch from './Twitch';
import * as fetch from 'node-fetch';
import * as fs from 'fs';

export default class TwitchServer {
  private readonly _app: express.Express = express();
  private static _twitch: Twitch;

  constructor(twitch: Twitch) {
    TwitchServer._twitch = twitch;
    this._app.get('/', this.loginRequest);
    this._app.get('/login', this.loginResponse);
    this._app.listen(4271);
  }

  private loginRequest(req: Request, res: Response): void {
    res.redirect(
      `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_ID}&redirect_uri=http://localhost:4271/login&response_type=code&scope=channel:read:redemptions`
    );
  }

  private loginResponse(req: Request, res: Response): void {
    res.send('Your account was successfully connected');
    fetch
      .default(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_ID}&client_secret=${process.env.TWITCH_SECRET}&code=${req.query.code}&grant_type=authorization_code&redirect_uri=http://localhost:4271/login`,
        { method: 'POST' }
      )
      .then(TwitchServer.responseToJson)
      .then(TwitchServer.accessTokenCallback);
  }
  
  static responseToJson(res: fetch.Response): Promise<any> {
    return res.json();
  }

  private static accessTokenCallback(body: {
          access_token: string;
          expires_in: number;
          refresh_token: string;
          scope: string[];
          token_type: 'bearer';
        }): void {
    process.env.REFRESH_TOKEN = body.refresh_token;
    fs.appendFile(
      '.env',
      `\nREFRESH_TOKEN=${body.refresh_token}`,
      'utf8',
      (err: NodeJS.ErrnoException) => {
        if (err) throw err;
      }
    );
    TwitchServer._twitch._accessToken = body.access_token;
    TwitchServer._twitch.startWebSocketServer();
  }
}
